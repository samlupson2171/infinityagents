import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import { sendQuoteEmail } from '@/lib/email';
import { z } from 'zod';

const testEmailSchema = z.object({
  testEmail: z.string().email('Invalid email address'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    const adminUser = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const { testEmail } = testEmailSchema.parse(body);

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

    // Prepare email data for test email
    const emailData = {
      quoteId: quote._id.toString(),
      quoteReference: `${quote.quoteReference} (TEST)`,
      leadName: quote.leadName,
      agentEmail: testEmail, // Send to test email instead
      agentName: quote.enquiryId.submittedBy?.name || 'Test Agent',
      agentCompany: quote.enquiryId.submittedBy?.companyName || 'Test Company',
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
      // Send test email
      const emailResult = await sendQuoteEmail(emailData);

      return NextResponse.json({
        success: true,
        data: {
          message: 'Test email sent successfully',
          email: {
            messageId: emailResult.messageId,
            recipient: testEmail,
            quoteReference: emailData.quoteReference,
          },
        },
      });

    } catch (emailError) {
      console.error('Test email sending failed:', emailError);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_DELIVERY_FAILED',
            message: 'Failed to send test email',
            details: (emailError as Error).message,
          },
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error sending test email:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process test email request',
        },
      },
      { status: 500 }
    );
  }
}