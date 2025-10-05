import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test API: Starting simple test');
    
    // Test basic functionality
    const body = await request.json();
    console.log('Test API: Received body:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      receivedData: body,
    });
  } catch (error: any) {
    console.error('Test API: Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}