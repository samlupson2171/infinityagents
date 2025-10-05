import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  withErrorHandling, 
  Logger, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  EmailDeliveryError,
  EmailRetryManager,
  type ApiResponse 
} from '@/lib/server-error-handling';
import { z } from 'zod';

// Validation schema for approval request
const approvalSchema = z.object({
  comments: z.string().max(500, 'Comments cannot exceed 500 characters').optional()
});

async function handleAgencyApproval(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const agencyId = params.id;

  // Validate agency ID format
  if (!agencyId || agencyId.length !== 24) {
    throw new ValidationError('Invalid agency ID format');
  }

  // Verify admin authorization with enhanced error handling
  try {
    await requireAdmin(request);
  } catch (authError) {
    if (authError instanceof NextResponse) {
      // Extract error information from the response
      const errorData = await authError.json();
      if (errorData.error?.code === 'UNAUTHORIZED') {
        throw new AuthenticationError('Admin authentication required');
      } else if (errorData.error?.code === 'FORBIDDEN') {
        throw new AuthorizationError('Admin privileges required');
      }
    }
    throw new AuthorizationError('Admin access required');
  }

  // Get current admin user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    Logger.warn('Admin approval attempt without valid session', { agencyId });
    throw new AuthenticationError('Admin session required');
  }

  const adminId = session.user.id;
  Logger.adminActionAttempt(adminId, 'approve', agencyId);

  // Parse and validate request body
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    Logger.warn('Invalid JSON in agency approval request', { adminId, agencyId });
    throw new ValidationError('Invalid JSON format in request body');
  }

  const validatedData = approvalSchema.parse(body);
  const { comments } = validatedData;

  // Connect to database
  try {
    await connectDB();
  } catch (dbError) {
    Logger.error('Database connection failed during agency approval', dbError, {
      adminId,
      agencyId
    });
    throw new DatabaseError('Unable to connect to database');
  }

  // Find the agency user with comprehensive error handling
  let agency;
  try {
    agency = await User.findById(agencyId);
  } catch (dbError) {
    Logger.error('Failed to fetch agency during approval', dbError, { adminId, agencyId });
    throw new DatabaseError('Failed to retrieve agency information');
  }

  if (!agency) {
    Logger.warn('Agency not found during approval attempt', { adminId, agencyId });
    throw new NotFoundError('Agency not found');
  }

  // Verify it's an agency user
  if (agency.role !== 'agent') {
    Logger.warn('Non-agency user approval attempt', { 
      adminId, 
      agencyId, 
      userRole: agency.role 
    });
    throw new ValidationError('User is not an agency');
  }

  // Check current status
  if (agency.registrationStatus === 'approved' || agency.registrationStatus === 'contracted') {
    Logger.warn('Already approved agency approval attempt', { 
      adminId, 
      agencyId, 
      currentStatus: agency.registrationStatus,
      previouslyApprovedAt: agency.approvedAt,
      previouslyApprovedBy: agency.approvedBy
    });
    throw new ConflictError('Agency is already approved', {
      currentStatus: agency.registrationStatus,
      approvedAt: agency.approvedAt,
      approvedBy: agency.approvedBy
    });
  }

  // Update agency status
  try {
    agency.registrationStatus = 'approved';
    agency.isApproved = true;
    agency.approvedBy = adminId;
    agency.approvedAt = new Date();
    agency.updatedAt = new Date();
    
    // Clear any previous rejection reason
    agency.rejectionReason = undefined;

    // Add approval comments if provided
    if (comments) {
      agency.approvalComments = comments;
    }

    await agency.save();
  } catch (saveError) {
    Logger.error('Failed to save agency approval', saveError, { adminId, agencyId });
    throw new DatabaseError('Failed to update agency status');
  }

  // Send approval email with retry mechanism
  let emailSent = false;
  try {
    const { sendApprovalNotificationEmail } = await import('@/lib/email');
    
    await EmailRetryManager.sendWithRetry(
      () => sendApprovalNotificationEmail({
        userName: agency.name,
        userEmail: agency.contactEmail,
        companyName: agency.company,
        consortia: agency.consortia,
        userId: agency._id.toString(),
      }),
      agency.contactEmail,
      'approval-notification'
    );
    
    emailSent = true;
    Logger.info('Approval email sent successfully', { 
      adminId, 
      agencyId, 
      agencyEmail: agency.contactEmail 
    });
  } catch (emailError) {
    Logger.error('Failed to send approval email after retries', emailError, {
      adminId,
      agencyId,
      agencyEmail: agency.contactEmail
    });
    // Don't fail the approval if email fails - approval should still succeed
    emailSent = false;
  }

  Logger.adminActionSuccess(adminId, 'approve', agencyId);
  Logger.info('Agency approved successfully', {
    adminId,
    agencyId,
    agencyName: agency.name,
    agencyEmail: agency.contactEmail,
    company: agency.company,
    approvedAt: agency.approvedAt,
    emailSent,
    comments: comments || null
  });

  const response: ApiResponse = {
    success: true,
    data: {
      agency: {
        _id: agency._id,
        name: agency.name,
        company: agency.company,
        contactEmail: agency.contactEmail,
        registrationStatus: agency.registrationStatus,
        approvedAt: agency.approvedAt,
        approvedBy: adminId,
        emailSent
      },
      message: emailSent 
        ? 'Agency approved successfully and notification email sent'
        : 'Agency approved successfully (email delivery pending)'
    }
  };

  return NextResponse.json(response, { status: 200 });
}

export const POST = withErrorHandling(handleAgencyApproval);