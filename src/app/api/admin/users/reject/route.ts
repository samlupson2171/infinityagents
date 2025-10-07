import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendRejectionNotificationEmail } from '@/lib/resend-email';
import { z } from 'zod';

const rejectUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const { userId, reason } = rejectUserSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the user to reject
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if user is already approved (can't reject approved users)
    if (user.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_REJECT_APPROVED',
            message: 'Cannot reject an already approved user',
          },
        },
        { status: 400 }
      );
    }

    // Send rejection notification email before deleting
    try {
      await sendRejectionNotificationEmail({
        userName: user.name,
        userEmail: user.contactEmail,
        companyName: user.companyName,
        reason,
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails, but log it
    }

    // Remove the user from the database (rejection means deletion)
    await User.findByIdAndDelete(userId);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        message: 'User rejected and removed successfully',
      },
    });
  } catch (error: any) {
    console.error('Error rejecting user:', error);

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
          message: 'Failed to reject user',
        },
      },
      { status: 500 }
    );
  }
}
