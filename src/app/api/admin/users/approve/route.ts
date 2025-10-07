import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendApprovalNotificationEmail } from '@/lib/resend-email';
import { z } from 'zod';

const approveUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const { userId } = approveUserSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the user to approve
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

    // Check if user is already approved
    if (user.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_APPROVED',
            message: 'User is already approved',
          },
        },
        { status: 400 }
      );
    }

    // Approve the user
    user.isApproved = true;
    user.approvedBy = adminToken.sub;
    user.approvedAt = new Date();
    await user.save();

    // Send approval notification email
    try {
      await sendApprovalNotificationEmail({
        userName: user.name,
        userEmail: user.contactEmail,
        companyName: user.companyName,
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        message: 'User approved successfully',
      },
    });
  } catch (error: any) {
    console.error('Error approving user:', error);

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
          message: 'Failed to approve user',
        },
      },
      { status: 500 }
    );
  }
}
