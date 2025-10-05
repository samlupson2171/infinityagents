import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Get current admin user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin session required',
          },
        },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get request body
    const body = await request.json();
    const { reason } = body;

    // Validate reason is provided
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rejection reason is required',
          },
        },
        { status: 400 }
      );
    }

    // Find the agency user
    const agency = await User.findById(params.id);
    if (!agency) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify it's an agency user
    if (agency.role !== 'agent') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_USER_TYPE',
            message: 'User is not an agency',
          },
        },
        { status: 400 }
      );
    }

    // Check if already rejected
    if (agency.registrationStatus === 'rejected') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_REJECTED',
            message: 'Agency is already rejected',
          },
        },
        { status: 400 }
      );
    }

    // Reject the agency
    agency.registrationStatus = 'rejected';
    agency.isApproved = false;
    agency.rejectionReason = reason.trim();
    
    // Clear approval data
    agency.approvedBy = undefined;
    agency.approvedAt = undefined;
    agency.contractSignedAt = undefined;
    agency.contractVersion = undefined;

    await agency.save();

    // TODO: Send rejection email notification (will be implemented in task 6)
    // This would trigger the email notification system

    return NextResponse.json({
      success: true,
      data: {
        agency: {
          _id: agency._id,
          name: agency.name,
          company: agency.company,
          contactEmail: agency.contactEmail,
          registrationStatus: agency.registrationStatus,
          rejectionReason: agency.rejectionReason,
        },
        message: 'Agency rejected successfully',
      },
    });
  } catch (error: any) {
    console.error('Error rejecting agency:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject agency',
        },
      },
      { status: 500 }
    );
  }
}