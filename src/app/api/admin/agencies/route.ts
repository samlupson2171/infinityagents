import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const registrationStatus = searchParams.get('registrationStatus'); // 'pending', 'approved', 'rejected', 'contracted', or 'all'
    const role = searchParams.get('role') || 'agent'; // Only fetch agency users (agents)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query based on status and role
    let query: any = { role }; // Only fetch agency users
    
    if (registrationStatus && registrationStatus !== 'all') {
      query.registrationStatus = registrationStatus;
    }

    // Get agencies with pagination
    const agencies = await User.find(query)
      .select('-password')
      .populate('approvedBy', 'name contactEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalAgencies = await User.countDocuments(query);
    const totalPages = Math.ceil(totalAgencies / limit);

    return NextResponse.json({
      success: true,
      data: {
        agencies,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: totalAgencies,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching agencies:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch agencies',
        },
      },
      { status: 500 }
    );
  }
}