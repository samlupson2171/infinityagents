import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/mongodb';
import TrainingMaterial from '@/models/TrainingMaterial';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and approved
    const token = await getToken({ req: request });

    if (!token) {
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

    if (!token.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PENDING_APPROVAL',
            message: 'Account pending approval',
          },
        },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const type = searchParams.get('type'); // 'video', 'blog', 'download', or 'all'
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query for active materials only
    let query: any = { isActive: true };

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get training materials with pagination
    const materials = await TrainingMaterial.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalMaterials = await TrainingMaterial.countDocuments(query);
    const totalPages = Math.ceil(totalMaterials / limit);

    return NextResponse.json({
      success: true,
      data: {
        materials,
        pagination: {
          currentPage: page,
          totalPages,
          totalMaterials,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching training materials:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch training materials',
        },
      },
      { status: 500 }
    );
  }
}
