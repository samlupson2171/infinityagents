import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import { sendQuoteEmail, sendQuoteUpdateEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    const adminUser = await requireAdmin(request);

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

    // Check if email delivery failed or if this is a retry scenario
    if (quote.emailDeliveryStatus !== 'failed' && quote.emailSent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_SENT',
            message: 'Email was already sent successfully. Use send-email endpoint for new emails.',
          },
        },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData = {
      quoteId: quote._id.toString(),
      quoteReference: quote.quoteReference,
      leadName: quote.leadName,
      agentEmail: quote.enquiryId.agentEmail,
      agentName: quote.enquiryId.submittedBy?.name,
      agentCompany: quote.enquiryId.submittedBy?.companyName,
      hotelName: quote.hotelName,
      numberOfPeople: quote.numberOfPeople,
      numberOfRooms: quote.numberOfRooms,
      numberOfNights: quote.numberOfNights,
      arrivalDate: quote.arrivalDate,
      isSuperPackage: quote.isSuperPackage,
      whatsIncluded: quote.whatsIncluded,
      transferIncluded: quote.transferIncluded,
      activitiesIncluded: quote.activitiesIncluded,
      totalPrice: quote.totalPrice,
      currency: quote.currency,
      formattedPrice: quote.formattedPrice,
      version: quote.version,
    };

    try {
      // Retry sending the email
      const emailResult = await sendQuoteEmail(emailData);

      // Update quote status and email tracking
      quote.emailSent = true;
      quote.emailSentAt = new Date();
      quote.emailDeliveryStatus = 'delivered';
      quote.emailMessageId = emailResult.messageId;
      
      // Update quote status if it was in draft
      if (quote.status === 'draft') {
        quote.status = 'sent';
      }
      
      await quote.save();

      return NextResponse.json({
        success: true,
        data: {
          message: 'Email retry successful',
          quote: {
            id: quote._id,
            status: quote.status,
            emailSent: quote.emailSent,
            emailSentAt: quote.emailSentAt,
            emailMessageId: quote.emailMessageId,
            deliveryStatus: quote.emailDeliveryStatus,
          },
          email: {
            messageId: emailResult.messageId,
            recipient: emailData.agentEmail,
            retryAttempt: true,
          },
        },
      });

    } catch (emailError) {
      console.error('Email retry failed:', emailError);

      // Update quote with failed email status
      quote.emailDeliveryStatus = 'failed';
      await quote.save();

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_RETRY_FAILED',
            message: 'Email retry failed',
            details: (emailError as Error).message,
          },
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error retrying email:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process email retry request',
        },
      },
      { status: 500 }
    );
  }
}