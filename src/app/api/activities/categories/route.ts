import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ActivityCategory } from '@/models/Activity';

interface CategoriesResponse {
  success: boolean;
  data?: Array<{
    value: string;
    label: string;
    icon: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

const categoryInfo = {
  [ActivityCategory.EXCURSION]: { label: 'Excursions', icon: '🏖️' },
  [ActivityCategory.SHOW]: { label: 'Shows & Entertainment', icon: '🎭' },
  [ActivityCategory.TRANSPORT]: { label: 'Transportation', icon: '🚗' },
  [ActivityCategory.DINING]: { label: 'Dining & Food', icon: '🍽️' },
  [ActivityCategory.ADVENTURE]: { label: 'Adventure Sports', icon: '🏔️' },
  [ActivityCategory.CULTURAL]: { label: 'Cultural Experiences', icon: '🏛️' },
  [ActivityCategory.NIGHTLIFE]: { label: 'Nightlife & Bars', icon: '🍸' },
  [ActivityCategory.SHOPPING]: { label: 'Shopping & Markets', icon: '🛍️' },
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<CategoriesResponse>> {
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

    // Build categories array with metadata
    const categories = Object.values(ActivityCategory).map((category) => ({
      value: category,
      label: categoryInfo[category].label,
      icon: categoryInfo[category].icon,
    }));

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch categories',
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
