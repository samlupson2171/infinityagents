import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find the quote
    const quote = await Quote.findById(params.id).select(
      'emailSent emailSentAt emailDeliveryStatus emailMessageId status version'
    );

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

    return NextResponse.json({
      success: true,
      data: {
        quoteId: quote._id,
        emailStatus: {
          sent: quote.emailSent,
          sentAt: quote.emailSentAt,
          deliveryStatus: quote.emailDeliveryStatus,
          messageId: quote.emailMessageId,
        },
        quoteStatus: quote.status,
        version: quote.version,
      },
    });

  } catch (error: any) {
    console.error('Error fetching email status:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email status',
        },
      },
      { status: 500 }
    );
  }
}