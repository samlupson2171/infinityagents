import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUniqueLocations } from '@/lib/activity-utils';
import { connectToDatabase } from '@/lib/mongodb';

interface LocationsResponse {
  success: boolean;
  data?: string[];
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<LocationsResponse>> {
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

    // Connect to database
    await connectToDatabase();

    // Get unique locations
    const locations = await getUniqueLocations();

    return NextResponse.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch locations',
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
