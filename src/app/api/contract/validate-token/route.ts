import { NextRequest, NextResponse } from 'next/server';
import { verifyContractAccessToken } from '@/lib/contract-tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    // Verify the token
    const decoded = verifyContractAccessToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired token',
        },
        { status: 401 }
      );
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error) {
    console.error('Error validating contract token:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Token validation failed',
      },
      { status: 500 }
    );
  }
}
