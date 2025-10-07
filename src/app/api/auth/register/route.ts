import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';
import {
  sendAdminNotificationEmail,
  sendRegistrationConfirmationEmail,
} from '@/lib/resend-email';
import { enhancedRegistrationSchema } from '@/lib/validation/user-schemas';
import { 
  withErrorHandling, 
  Logger, 
  ValidationError, 
  ConflictError, 
  DatabaseError,
  EmailDeliveryError,
  EmailRetryManager,
  RateLimiter,
  type ApiResponse 
} from '@/lib/server-error-handling';

async function handleRegistration(request: NextRequest): Promise<NextResponse> {
  // Get client IP for rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  // Check rate limiting
  const rateLimitResult = RateLimiter.checkRateLimit(
    `registration:${clientIp}`, 
    5, // 5 attempts
    15 * 60 * 1000 // 15 minutes
  );

  if (!rateLimitResult.allowed) {
    Logger.warn('Registration rate limit exceeded', { 
      clientIp, 
      resetTime: new Date(rateLimitResult.resetTime).toISOString() 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_ERROR',
          message: 'Too many registration attempts. Please try again later.',
          details: {
            resetTime: rateLimitResult.resetTime,
            remainingAttempts: rateLimitResult.remainingAttempts
          }
        }
      },
      { status: 429 }
    );
  }

  // Parse and validate request body
  let body: any;
  try {
    body = await request.json();
  } catch (parseError) {
    Logger.warn('Invalid JSON in registration request', { clientIp });
    throw new ValidationError('Invalid JSON format in request body');
  }

  // Validate input data
  const validatedData = enhancedRegistrationSchema.parse(body);
  
  Logger.registrationAttempt(validatedData.contactEmail, validatedData.company);

  // Handle backward compatibility for company field
  const companyName = validatedData.company || validatedData.companyName;
  if (!companyName) {
    throw new ValidationError('Company name is required', [{
      field: 'company',
      message: 'Company name is required'
    }]);
  }

  // Connect to database with error handling
  try {
    await connectDB();
  } catch (dbError) {
    Logger.error('Database connection failed during registration', dbError, {
      email: validatedData.contactEmail,
      company: companyName
    });
    throw new DatabaseError('Unable to connect to database');
  }

  // Check for existing users with comprehensive validation
  const [existingUserByEmail, existingUserByAbta] = await Promise.all([
    User.findOne({ contactEmail: validatedData.contactEmail }).lean(),
    User.findOne({ abtaPtsNumber: validatedData.abtaPtsNumber }).lean()
  ]);

  if (existingUserByEmail) {
    Logger.warn('Registration attempt with existing email', {
      email: validatedData.contactEmail,
      existingUserId: existingUserByEmail._id,
      clientIp
    });
    throw new ConflictError('An account with this email address already exists', {
      field: 'contactEmail',
      value: validatedData.contactEmail
    });
  }

  if (existingUserByAbta) {
    Logger.warn('Registration attempt with existing ABTA/PTS number', {
      abtaPtsNumber: validatedData.abtaPtsNumber,
      existingUserId: existingUserByAbta._id,
      clientIp
    });
    throw new ConflictError('An account with this ABTA/PTS number already exists', {
      field: 'abtaPtsNumber',
      value: validatedData.abtaPtsNumber
    });
  }

  // Create new user with enhanced data
  let savedUser;
  try {
    const newUser = new User({
      ...validatedData,
      company: companyName,
      companyName: companyName, // Maintain backward compatibility
      consortia: validatedData.consortia || undefined,
      isApproved: false,
      role: 'agent',
      registrationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    savedUser = await newUser.save();
    Logger.registrationSuccess(savedUser._id.toString(), savedUser.contactEmail, companyName);
  } catch (saveError) {
    Logger.error('Failed to save user during registration', saveError, {
      email: validatedData.contactEmail,
      company: companyName
    });
    throw new DatabaseError('Failed to create user account');
  }

  // Send emails with retry mechanism
  const emailPromises = [];

  // Admin notification email with retry
  emailPromises.push(
    EmailRetryManager.sendWithRetry(
      () => sendAdminNotificationEmail({
        userName: savedUser.name,
        companyName: savedUser.company || savedUser.companyName,
        contactEmail: savedUser.contactEmail,
        abtaPtsNumber: savedUser.abtaPtsNumber,
        websiteAddress: savedUser.websiteAddress,
        consortia: savedUser.consortia,
        userId: savedUser._id.toString(),
      }),
      'admin',
      'admin-notification'
    ).catch(error => {
      Logger.error('Admin notification email failed after retries', error, {
        userId: savedUser._id.toString(),
        userEmail: savedUser.contactEmail
      });
      // Don't throw - registration should succeed even if admin email fails
      return null;
    })
  );

  // User confirmation email with retry
  emailPromises.push(
    EmailRetryManager.sendWithRetry(
      () => sendRegistrationConfirmationEmail({
        userName: savedUser.name,
        userEmail: savedUser.contactEmail,
        companyName: savedUser.company || savedUser.companyName,
      }),
      savedUser.contactEmail,
      'registration-confirmation'
    ).catch(error => {
      Logger.error('Registration confirmation email failed after retries', error, {
        userId: savedUser._id.toString(),
        userEmail: savedUser.contactEmail
      });
      // Don't throw - registration should succeed even if confirmation email fails
      return null;
    })
  );

  // Wait for email attempts (but don't fail registration if they fail)
  await Promise.allSettled(emailPromises);

  // Reset rate limit on successful registration
  RateLimiter.resetRateLimit(`registration:${clientIp}`);

  // Return success response (without sensitive data)
  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Registration successful. Your account is pending approval.',
      user: {
        id: savedUser._id,
        name: savedUser.name,
        companyName: savedUser.companyName,
        contactEmail: savedUser.contactEmail,
        abtaPtsNumber: savedUser.abtaPtsNumber,
        websiteAddress: savedUser.websiteAddress,
        isApproved: savedUser.isApproved,
        role: savedUser.role,
        company: savedUser.company,
        consortia: savedUser.consortia,
        registrationStatus: savedUser.registrationStatus,
        createdAt: savedUser.createdAt,
      },
    },
  };

  return NextResponse.json(response, { status: 201 });
}

export const POST = withErrorHandling(handleRegistration);
