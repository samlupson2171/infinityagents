import { NextRequest, NextResponse } from 'next/server';
import { SecureEmailTracker } from '@/lib/security/secure-email-tracking';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get('t');

    if (!trackingId) {
      // Redirect to general enquiry page if no tracking ID
      return NextResponse.redirect(new URL('/enquiries', request.url));
    }

    // Validate tracking ID format
    if (!SecureEmailTracker.validateTrackingId(trackingId)) {
      // Redirect to general enquiry page for invalid tracking IDs
      return NextResponse.redirect(new URL('/enquiries', request.url));
    }

    // Extract client information
    const ipAddress = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Track the email click and get quote ID
    const clickResult = await SecureEmailTracker.trackEmailClick(
      trackingId,
      ipAddress,
      userAgent
    );

    if (!clickResult.success || !clickResult.quoteId) {
      // Redirect to general enquiry page if tracking fails
      return NextResponse.redirect(new URL('/enquiries', request.url));
    }

    // Get quote information for the booking interest page
    await connectDB();
    const quote = await Quote.findById(clickResult.quoteId)
      .populate('enquiryId', 'leadName agentEmail resort')
      .select('leadName hotelName totalPrice currency arrivalDate numberOfPeople numberOfNights');

    if (!quote) {
      // Redirect to general enquiry page if quote not found
      return NextResponse.redirect(new URL('/enquiries', request.url));
    }

    // Redirect to booking interest page with quote information
    const bookingUrl = new URL('/booking/interest', request.url);
    bookingUrl.searchParams.set('quote', clickResult.quoteId);
    bookingUrl.searchParams.set('tracking', trackingId);
    
    return NextResponse.redirect(bookingUrl);

  } catch (error) {
    console.error('Error in booking interest endpoint:', error);
    
    // Redirect to general enquiry page on error
    return NextResponse.redirect(new URL('/enquiries', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, quoteId, customerInfo, message } = body;

    // Validate required fields
    if (!trackingId || !quoteId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Tracking ID and Quote ID are required',
          },
        },
        { status: 400 }
      );
    }

    // Validate tracking ID
    if (!SecureEmailTracker.validateTrackingId(trackingId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TRACKING_ID',
            message: 'Invalid or expired tracking ID',
          },
        },
        { status: 400 }
      );
    }

    // Track booking conversion
    const conversionTracked = await SecureEmailTracker.trackBookingConversion(trackingId);

    // Connect to database and update quote
    await connectDB();
    const quote = await Quote.findById(quoteId);

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

    // Here you would typically:
    // 1. Create a booking record
    // 2. Send confirmation emails
    // 3. Notify admin of booking interest
    // 4. Update quote status

    // For now, we'll just log the booking interest
    console.log('Booking interest received:', {
      quoteId,
      trackingId,
      customerInfo,
      message,
      conversionTracked,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Booking interest recorded successfully',
        quoteId,
        trackingId,
        conversionTracked,
      },
    });

  } catch (error) {
    console.error('Error processing booking interest:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process booking interest',
        },
      },
      { status: 500 }
    );
  }
}