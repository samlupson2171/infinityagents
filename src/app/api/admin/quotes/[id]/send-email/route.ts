import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteAdmin } from '@/lib/middleware/quote-auth-middleware';
import { QuoteAuditLogger } from '@/lib/audit/quote-audit-logger';
import { SecureEmailRenderer } from '@/lib/security/secure-email-renderer';
import { SecureEmailTracker } from '@/lib/security/secure-email-tracking';
import { QuoteDataSanitizer } from '@/lib/security/quote-data-sanitizer';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import User from '@/models/User';
import { sendQuoteEmail, sendQuoteUpdateEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auditContext;
  
  try {
    // Verify admin authorization with quote permissions
    const { user, auditContext: audit } = await requireQuoteAdmin(request);
    auditContext = audit;

    // Connect to database
    await connectDB();

    // Find the quote with populated data
    const quote = await Quote.findById(params.id)
      .populate([
        { 
          path: 'enquiryId', 
          select: 'leadName agentEmail submittedBy',
          populate: {
            path: 'submittedBy',
            select: 'name companyName contactEmail'
          }
        },
        { path: 'createdBy', select: 'name email' }
      ]);

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if quote is in draft status
    if (quote.status !== 'draft' && quote.status !== 'updated') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUOTE_STATUS',
            message: 'Quote must be in draft or updated status to send email',
          },
        },
        { status: 400 }
      );
    }

    // Validate and sanitize recipient email
    const recipientEmail = QuoteDataSanitizer.sanitizeText(quote.enquiryId.agentEmail);
    const emailValidation = QuoteDataSanitizer.sanitizeEmail(recipientEmail);
    
    if (!emailValidation.isValid) {
      await QuoteAuditLogger.logQuoteEmailSent(
        auditContext,
        params.id,
        recipientEmail,
        false,
        'Invalid recipient email address'
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid recipient email address',
          },
        },
        { status: 400 }
      );
    }

    // Create secure email context
    const emailContext = {
      quote,
      enquiry: quote.enquiryId,
      companyInfo: {
        name: 'Infinity Weekends',
        email: process.env.COMPANY_EMAIL || 'info@infinityweekends.com',
        phone: process.env.COMPANY_PHONE || '+44 123 456 7890',
        website: process.env.NEXT_PUBLIC_BASE_URL || 'https://infinityweekends.com',
      },
    };

    // Generate secure email HTML
    const secureEmailHTML = SecureEmailRenderer.generateSecureQuoteEmail(emailContext);
    
    // Validate email template
    const templateValidation = SecureEmailRenderer.validateEmailTemplate(secureEmailHTML);
    if (!templateValidation.isValid) {
      await QuoteAuditLogger.logQuoteEmailSent(
        auditContext,
        params.id,
        emailValidation.email,
        false,
        `Email template validation failed: ${templateValidation.errors.join(', ')}`
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_TEMPLATE_ERROR',
            message: 'Email template validation failed',
            details: templateValidation.errors,
          },
        },
        { status: 500 }
      );
    }

    // Create secure tracking record
    const trackingId = await SecureEmailTracker.createTrackingRecord(
      params.id,
      emailValidation.email
    );

    // Prepare secure email data
    const emailData = {
      quoteId: quote._id.toString(),
      leadName: SecureEmailRenderer.sanitizeText(quote.leadName),
      agentEmail: emailValidation.email,
      subject: SecureEmailRenderer.generateSecureSubject(quote.leadName, 'Infinity Weekends'),
      html: secureEmailHTML,
      trackingId,
    };

    const wasUpdated = quote.status === 'updated';

    try {
      // Send secure email using the new system
      const emailResult = await sendQuoteEmail(emailData);

      // Update quote status and email tracking
      quote.status = 'sent';
      quote.emailSent = true;
      quote.emailSentAt = new Date();
      quote.emailDeliveryStatus = 'delivered';
      quote.emailMessageId = emailResult.messageId;
      
      await quote.save();

      // Log successful email sending
      await QuoteAuditLogger.logQuoteEmailSent(
        auditContext,
        params.id,
        emailValidation.email,
        true
      );

      return NextResponse.json({
        success: true,
        data: {
          quote: {
            id: quote._id,
            status: quote.status,
            emailSent: quote.emailSent,
            emailSentAt: quote.emailSentAt,
            emailMessageId: quote.emailMessageId,
          },
          email: {
            messageId: emailResult.messageId,
            recipient: emailData.agentEmail,
            type: wasUpdated ? 'update' : 'initial',
            trackingId,
          },
          security: {
            templateValidated: true,
            emailSanitized: true,
            trackingSecure: true,
            warnings: templateValidation.warnings,
          },
        },
      });

    } catch (emailError) {
      console.error('Email sending failed:', emailError);

      // Update quote with failed email status
      quote.emailDeliveryStatus = 'failed';
      await quote.save();

      // Log failed email sending
      await QuoteAuditLogger.logQuoteEmailSent(
        auditContext,
        params.id,
        emailValidation.email,
        false,
        (emailError as Error).message
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_DELIVERY_FAILED',
            message: 'Failed to send quote email',
            details: (emailError as Error).message,
          },
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error sending quote email:', error);

    // Log failed email sending if we have audit context
    if (auditContext) {
      await QuoteAuditLogger.logQuoteEmailSent(
        auditContext,
        params.id,
        'unknown',
        false,
        error.message
      );
    }

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process email sending request',
        },
      },
      { status: 500 }
    );
  }
}