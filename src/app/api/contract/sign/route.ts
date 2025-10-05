import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { verifyContractAccessToken } from '@/lib/contract-tokens';
import User from '@/models/User';
import ContractTemplate from '@/models/ContractTemplate';
import ContractSignature from '@/models/ContractSignature';
import { 
  withErrorHandling, 
  Logger, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ContractError,
  DatabaseError,
  RateLimiter,
  type ApiResponse 
} from '@/lib/server-error-handling';
import { z } from 'zod';

// Validation schema for contract signing
const contractSigningSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  contractVersion: z.string().min(1, 'Contract version is required'),
  hasReadContract: z.boolean().optional(),
  digitalSignatureConsent: z.boolean().optional(),
  token: z.string().optional()
});

async function handleContractSigning(request: NextRequest): Promise<NextResponse> {
  // Get client information for audit trail and rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Get user session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    Logger.warn('Unauthorized contract signing attempt', { clientIP, userAgent });
    throw new AuthenticationError('Authentication required to sign contract');
  }

  const userId = session.user.id;

  // Rate limiting for contract signing attempts
  const rateLimitResult = RateLimiter.checkRateLimit(
    `contract-signing:${userId}`,
    3, // 3 attempts
    5 * 60 * 1000 // 5 minutes
  );

  if (!rateLimitResult.allowed) {
    Logger.warn('Contract signing rate limit exceeded', { 
      userId, 
      clientIP,
      resetTime: new Date(rateLimitResult.resetTime).toISOString() 
    });
    throw new ContractError('Too many signing attempts. Please try again later.');
  }

  // Parse and validate request body
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    Logger.warn('Invalid JSON in contract signing request', { userId, clientIP });
    throw new ValidationError('Invalid JSON format in request body');
  }

  const validatedData = contractSigningSchema.parse(body);
  const { contractId, contractVersion, hasReadContract, digitalSignatureConsent, token } = validatedData;

  Logger.contractSigningAttempt(userId, contractId, userAgent);

  // Connect to database
  try {
    await connectDB();
  } catch (dbError) {
    Logger.error('Database connection failed during contract signing', dbError, {
      userId,
      contractId
    });
    throw new DatabaseError('Unable to connect to database');
  }

  // If token is provided, verify it (for token-based access)
  if (token) {
    let tokenData;
    try {
      tokenData = verifyContractAccessToken(token);
    } catch (tokenError) {
      Logger.warn('Invalid contract access token', { userId, contractId, clientIP });
      throw new AuthenticationError('Invalid or expired contract access token');
    }

    if (!tokenData) {
      Logger.warn('Contract access token verification failed', { userId, contractId, clientIP });
      throw new AuthenticationError('Invalid or expired contract access token');
    }

    // Verify token is for the current user
    if (tokenData.userId !== userId || tokenData.email !== session.user.email) {
      Logger.warn('Contract token mismatch', { 
        userId, 
        tokenUserId: tokenData.userId,
        userEmail: session.user.email,
        tokenEmail: tokenData.email,
        contractId 
      });
      throw new AuthorizationError('Contract token does not match current user');
    }
  }

  // Get the user with error handling
  let user;
  try {
    user = await User.findById(userId);
  } catch (dbError) {
    Logger.error('Failed to fetch user during contract signing', dbError, { userId, contractId });
    throw new DatabaseError('Failed to retrieve user information');
  }

  if (!user) {
    Logger.warn('User not found during contract signing', { userId, contractId });
    throw new NotFoundError('User account not found');
  }

  // Verify user is approved
  if (user.registrationStatus !== 'approved') {
    Logger.warn('Unapproved user attempted contract signing', { 
      userId, 
      userStatus: user.registrationStatus,
      contractId 
    });
    throw new AuthorizationError('User must be approved before signing contract');
  }

  // Verify the contract exists and is active
  let contract;
  try {
    contract = await ContractTemplate.findById(contractId);
  } catch (dbError) {
    Logger.error('Failed to fetch contract during signing', dbError, { userId, contractId });
    throw new DatabaseError('Failed to retrieve contract information');
  }

  if (!contract) {
    Logger.warn('Contract not found during signing attempt', { userId, contractId });
    throw new NotFoundError('Contract not found');
  }

  if (!contract.isActive) {
    Logger.warn('Inactive contract signing attempt', { userId, contractId, contractVersion });
    throw new ContractError('Contract is no longer active');
  }

  // Verify contract version matches
  if (contract.version !== contractVersion) {
    Logger.warn('Contract version mismatch during signing', { 
      userId, 
      contractId, 
      requestedVersion: contractVersion,
      actualVersion: contract.version 
    });
    throw new ContractError('Contract version mismatch. Please refresh and try again.');
  }

  // Check if user has already signed this contract
  let existingSignature;
  try {
    existingSignature = await ContractSignature.findOne({
      userId: user._id,
      contractTemplateId: contract._id,
    });
  } catch (dbError) {
    Logger.error('Failed to check existing signature', dbError, { userId, contractId });
    throw new DatabaseError('Failed to verify signature status');
  }

  if (existingSignature) {
    Logger.warn('Duplicate contract signing attempt', { 
      userId, 
      contractId, 
      existingSignatureId: existingSignature._id,
      existingSignedAt: existingSignature.signedAt 
    });
    throw new ConflictError('Contract has already been signed', {
      signedAt: existingSignature.signedAt,
      signatureId: existingSignature._id
    });
  }

  // Validate client-side requirements (if provided)
  if (hasReadContract === false) {
    Logger.warn('Contract signing attempted without reading contract', { userId, contractId });
    throw new ContractError('Contract must be read completely before signing');
  }

  if (digitalSignatureConsent === false) {
    Logger.warn('Contract signing attempted without digital signature consent', { userId, contractId });
    throw new ContractError('Digital signature consent is required');
  }

  // Create contract signature record with comprehensive audit trail
  let signature;
  try {
    signature = new ContractSignature({
      userId: user._id,
      contractTemplateId: contract._id,
      signedAt: new Date(),
      signature: 'accepted', // Checkbox acceptance signature
      signatureType: 'checkbox',
      ipAddress: clientIP,
      userAgent: userAgent,
      metadata: {
        hasReadContract: hasReadContract !== false,
        digitalSignatureConsent: digitalSignatureConsent !== false,
        sessionId: session.user.id,
        contractVersion: contract.version
      }
    });

    await signature.save();
  } catch (saveError) {
    Logger.error('Failed to save contract signature', saveError, { userId, contractId });
    throw new DatabaseError('Failed to record contract signature');
  }

  // Update user status
  try {
    user.registrationStatus = 'contracted';
    user.contractSignedAt = signature.signedAt;
    user.contractVersion = contract.version;
    user.updatedAt = new Date();
    await user.save();
  } catch (updateError) {
    Logger.error('Failed to update user status after contract signing', updateError, { 
      userId, 
      contractId,
      signatureId: signature._id 
    });
    // Don't throw here - signature was saved successfully
    Logger.warn('Contract signed but user status update failed', { userId, contractId });
  }

  // Reset rate limit on successful signing
  RateLimiter.resetRateLimit(`contract-signing:${userId}`);

  // Log successful contract signing with comprehensive audit trail
  Logger.contractSigningSuccess(userId, contractId);
  Logger.info('Contract signed with full audit trail', {
    userId: user._id,
    userEmail: user.contactEmail,
    userName: user.name,
    company: user.company,
    contractId: contract._id,
    contractVersion: contract.version,
    signatureId: signature._id,
    signedAt: signature.signedAt,
    ipAddress: clientIP,
    userAgent: userAgent,
    signatureType: signature.signatureType,
    hasReadContract: hasReadContract !== false,
    digitalSignatureConsent: digitalSignatureConsent !== false
  });

  const response: ApiResponse = {
    success: true,
    data: {
      signatureId: signature._id,
      contractVersion: contract.version,
      signedAt: signature.signedAt,
      userStatus: user.registrationStatus,
      auditTrail: {
        signatureId: signature._id,
        signedAt: signature.signedAt,
        ipAddress: clientIP,
        userAgent: userAgent,
        contractVersion: contract.version
      }
    }
  };

  return NextResponse.json(response, { status: 200 });
}

export const POST = withErrorHandling(handleContractSigning);
