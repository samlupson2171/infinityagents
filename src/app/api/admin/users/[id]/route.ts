import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  websiteAddress: z.string().url().optional(),
  abtaPtsNumber: z.string().min(1).optional(),
  isApproved: z.boolean().optional(),
  role: z.enum(['agent', 'admin']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const updateData = updateUserSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the user to update
    const user = await User.findById(params.id);
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

    // Update user fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        (user as any)[key] = updateData[key as keyof typeof updateData];
      }
    });

    // If approving/disapproving, update approval fields
    if (updateData.isApproved !== undefined) {
      if (updateData.isApproved && !user.isApproved) {
        // Approving user
        user.approvedBy = adminToken.sub;
        user.approvedAt = new Date();
      } else if (!updateData.isApproved && user.isApproved) {
        // Disapproving user
        user.approvedBy = undefined;
        user.approvedAt = undefined;
      }
    }

    user.updatedAt = new Date();
    await user.save();

    // Return updated user (without password)
    const updatedUser = await User.findById(params.id)
      .select('-password')
      .populate('approvedBy', 'name contactEmail');

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);

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
          message: 'Failed to update user',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find the user
    const user = await User.findById(params.id)
      .select('-password')
      .populate('approvedBy', 'name contactEmail');

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

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch user',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find the user to delete
    const user = await User.findById(params.id);
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

    // Prevent deletion of admin users (safety measure)
    if (user.role === 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_ADMIN',
            message: 'Cannot delete admin users',
          },
        },
        { status: 403 }
      );
    }

    // Delete the user
    await User.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user',
        },
      },
      { status: 500 }
    );
  }
}
