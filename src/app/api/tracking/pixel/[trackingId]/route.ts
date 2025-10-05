import { NextRequest, NextResponse } from 'next/server';
import { SecureEmailTracker } from '@/lib/security/secure-email-tracking';

// 1x1 transparent pixel image data
const PIXEL_DATA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    // Validate tracking ID format
    if (!SecureEmailTracker.validateTrackingId(trackingId)) {
      // Return pixel anyway to avoid revealing tracking failures
      return new NextResponse(PIXEL_DATA, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': PIXEL_DATA.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Extract client information
    const ipAddress = request.ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Track the email open (async, don't wait for result)
    SecureEmailTracker.trackEmailOpen(trackingId, ipAddress, userAgent)
      .catch(error => {
        console.error('Error tracking email open:', error);
      });

    // Return tracking pixel
    return new NextResponse(PIXEL_DATA, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': PIXEL_DATA.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in tracking pixel endpoint:', error);
    
    // Always return pixel to avoid revealing errors
    return new NextResponse(PIXEL_DATA, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': PIXEL_DATA.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}