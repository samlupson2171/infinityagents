import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Activity from '@/models/Activity';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface ActivityDetailResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ActivityDetailResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Validate activity ID
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid activity ID format',
          },
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find activity
    const activity = await Activity.findOne({
      _id: params.id,
      isActive: true,
    })
      .select('-__v')
      .populate('createdBy', 'name')
      .lean();

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found or inactive',
          },
        },
        { status: 404 }
      );
    }

    // Add computed fields
    const now = new Date();
    const activityWithStatus = {
      ...activity,
      isAvailable: activity.availableFrom <= now && activity.availableTo >= now,
      daysUntilStart: Math.max(
        0,
        Math.ceil(
          (activity.availableFrom.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ),
      daysUntilEnd: Math.max(
        0,
        Math.ceil(
          (activity.availableTo.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ),
    };

    return NextResponse.json({
      success: true,
      data: activityWithStatus,
    });
  } catch (error: any) {
    console.error('Error fetching activity details:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity details',
        },
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'PUT method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'DELETE method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}
