import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';

export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

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

    // Check if user is admin
    if (token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
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
    const status = searchParams.get('status'); // 'new', 'in-progress', 'completed', or 'all'
    const search = searchParams.get('search') || '';
    const hasQuotes = searchParams.get('hasQuotes'); // 'true', 'false', or null for all
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by quote status
    if (hasQuotes === 'true') {
      query.hasQuotes = true;
    } else if (hasQuotes === 'false') {
      query.hasQuotes = false;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { leadName: { $regex: search, $options: 'i' } },
        { resort: { $regex: search, $options: 'i' } },
        { agentEmail: { $regex: search, $options: 'i' } },
        { departureAirport: { $regex: search, $options: 'i' } },
      ];
    }

    // Get enquiries with pagination (simplified - no populate for now)
    const enquiries = await Enquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalEnquiries = await Enquiry.countDocuments(query);
    const totalPages = Math.ceil(totalEnquiries / limit);

    return NextResponse.json({
      success: true,
      data: {
        enquiries,
        pagination: {
          currentPage: page,
          totalPages,
          totalEnquiries,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching enquiries:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch enquiries',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

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

    // Check if user is admin
    if (token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    // Parse request body
    const body = await request.json();

    // Create enquiry data
    const enquiryData = {
      ...body,
      submittedBy: token.sub || token.id,
      status: 'new'
    };

    // Create and save enquiry
    const enquiry = new Enquiry(enquiryData);
    await enquiry.save();

    return NextResponse.json({
      success: true,
      message: 'Enquiry created successfully',
      data: enquiry,
    });

  } catch (error: any) {
    console.error('Error creating enquiry:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid enquiry data',
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
          message: 'Failed to create enquiry',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
