import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Activity, { ActivityCategory } from '@/models/Activity';
import { connectToDatabase } from '@/lib/mongodb';
import {
  handleAPIError,
  createSuccessResponse,
  ErrorCode,
  BusinessError,
  validateRequired,
} from '@/lib/error-handling';

interface SearchParams {
  search?: string;
  location?: string;
  category?: ActivityCategory;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

interface ActivitySearchResponse {
  success: boolean;
  data?: {
    activities: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      totalCount: number;
      appliedFilters: SearchParams;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActivitySearchResponse>> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      const errorResponse = handleAPIError(
        new BusinessError(ErrorCode.UNAUTHORIZED, 'Authentication required')
      );
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: SearchParams = {
      search: searchParams.get('search') || undefined,
      location: searchParams.get('location') || undefined,
      category: (searchParams.get('category') as ActivityCategory) || undefined,
      priceMin: searchParams.get('priceMin')
        ? parseFloat(searchParams.get('priceMin')!)
        : undefined,
      priceMax: searchParams.get('priceMax')
        ? parseFloat(searchParams.get('priceMax')!)
        : undefined,
      dateFrom: searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : undefined,
      dateTo: searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 20,
    };

    // Validate pagination parameters
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20)); // Max 100 items per page

    if (page < 1) {
      throw new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Page number must be greater than 0',
        { page },
        'page'
      );
    }

    if (limit < 1 || limit > 100) {
      throw new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Limit must be between 1 and 100',
        { limit },
        'limit'
      );
    }

    // Validate price range
    if (
      params.priceMin !== undefined &&
      params.priceMax !== undefined &&
      !isNaN(params.priceMin) &&
      !isNaN(params.priceMax) &&
      params.priceMin > params.priceMax
    ) {
      throw new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Minimum price cannot be greater than maximum price',
        { priceMin: params.priceMin, priceMax: params.priceMax }
      );
    }

    // Validate date range
    if (
      params.dateFrom &&
      params.dateTo &&
      !isNaN(params.dateFrom.getTime()) &&
      !isNaN(params.dateTo.getTime()) &&
      params.dateFrom > params.dateTo
    ) {
      throw new BusinessError(
        ErrorCode.INVALID_DATE_RANGE,
        'Start date cannot be after end date',
        { dateFrom: params.dateFrom, dateTo: params.dateTo }
      );
    }

    const skip = (page - 1) * limit;

    // Build MongoDB query
    const query: any = { isActive: true };

    // Text search
    if (params.search) {
      query.$text = { $search: params.search };
    }

    // Location filter
    if (params.location) {
      query.location = { $regex: new RegExp(params.location, 'i') };
    }

    // Category filter
    if (
      params.category &&
      Object.values(ActivityCategory).includes(params.category)
    ) {
      query.category = params.category;
    }

    // Price range filter
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      query.pricePerPerson = {};
      if (params.priceMin !== undefined && !isNaN(params.priceMin)) {
        query.pricePerPerson.$gte = params.priceMin;
      }
      if (params.priceMax !== undefined && !isNaN(params.priceMax)) {
        query.pricePerPerson.$lte = params.priceMax;
      }
    }

    // Date range filter (activity must be available during the specified period)
    if (params.dateFrom || params.dateTo) {
      if (params.dateFrom && !isNaN(params.dateFrom.getTime())) {
        query.availableTo = { $gte: params.dateFrom };
      }
      if (params.dateTo && !isNaN(params.dateTo.getTime())) {
        query.availableFrom = { $lte: params.dateTo };
      }
    }

    // Build sort criteria
    let sort: any = { createdAt: -1 }; // Default sort by newest first

    // If text search is used, sort by relevance score
    if (params.search) {
      sort = { score: { $meta: 'textScore' }, createdAt: -1 };
    }

    // Execute queries
    const [activities, totalCount] = await Promise.all([
      Activity.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .populate('createdBy', 'name')
        .lean(),
      Activity.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response = createSuccessResponse({
      activities,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: {
        totalCount,
        appliedFilters: {
          search: params.search,
          location: params.location,
          category: params.category,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    const errorResponse = handleAPIError(error);
    const statusCode =
      error.code === ErrorCode.UNAUTHORIZED
        ? 401
        : error.code === ErrorCode.INVALID_INPUT ||
            error.code === ErrorCode.INVALID_DATE_RANGE
          ? 400
          : 500;

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// Handle unsupported methods
export async function POST() {
  const errorResponse = handleAPIError(
    new BusinessError(
      ErrorCode.INVALID_INPUT,
      'POST method not supported for this endpoint'
    )
  );
  return NextResponse.json(errorResponse, { status: 405 });
}

export async function PUT() {
  const errorResponse = handleAPIError(
    new BusinessError(
      ErrorCode.INVALID_INPUT,
      'PUT method not supported for this endpoint'
    )
  );
  return NextResponse.json(errorResponse, { status: 405 });
}

export async function DELETE() {
  const errorResponse = handleAPIError(
    new BusinessError(
      ErrorCode.INVALID_INPUT,
      'DELETE method not supported for this endpoint'
    )
  );
  return NextResponse.json(errorResponse, { status: 405 });
}
