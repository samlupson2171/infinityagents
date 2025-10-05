import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { getToken } from 'next-auth/jwt';

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query for active offers only
    let query: any = { isActive: true };

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { inclusions: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    // Check if simple format is requested (for new offers page)
    const simple = searchParams.get('simple') === 'true';

    if (simple) {
      // Return all offers without pagination for the new offers page
      const offers = await Offer.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });

      return NextResponse.json(offers);
    }

    // Get offers with pagination
    const offers = await Offer.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalOffers = await Offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    return NextResponse.json({
      success: true,
      data: {
        offers,
        pagination: {
          currentPage: page,
          totalPages,
          totalOffers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching offers:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch offers',
        },
      },
      { status: 500 }
    );
  }
}
