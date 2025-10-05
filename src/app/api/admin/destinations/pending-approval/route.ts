import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/admin/destinations/pending-approval - Get destinations pending approval
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get destinations pending approval
    const destinations = await Destination.find({
      'approvalWorkflow.status': 'pending'
    })
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email')
    .populate('approvalWorkflow.requestedBy', 'name email')
    .select('name slug country region status approvalWorkflow createdBy lastModifiedBy updatedAt')
    .sort({ 'approvalWorkflow.requestedAt': -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const totalCount = await Destination.countDocuments({
      'approvalWorkflow.status': 'pending'
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      destinations,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    );
  }
}