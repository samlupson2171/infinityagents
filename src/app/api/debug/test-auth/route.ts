import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTH TEST: Starting ===');
    
    const user = await requireAdmin(request);
    console.log('Auth successful. User:', {
      id: user.id,
      sub: user.sub,
      email: user.email,
      role: user.role
    });

    return NextResponse.json({
      success: true,
      message: 'Auth test successful',
      user: {
        id: user.id,
        sub: user.sub,
        email: user.email,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('=== AUTH TEST: Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        details: error
      }
    }, { status: 500 });
  }
}