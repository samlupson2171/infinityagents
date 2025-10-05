import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get all pending users
    const pendingUsers = await User.find({ isApproved: false })
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: pendingUsers,
    });
  } catch (error: any) {
    console.error('Error fetching pending users:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pending users',
        },
      },
      { status: 500 }
    );
  }
}
