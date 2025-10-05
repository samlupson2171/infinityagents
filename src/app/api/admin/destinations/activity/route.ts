import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/admin/destinations/activity - Get recent destination activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    await connectToDatabase();

    // Get recent destinations with user information
    const recentDestinations = await Destination.find({})
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Transform to activity format
    const activities = recentDestinations.map(dest => {
      const isNewlyCreated = new Date(dest.createdAt).getTime() > (Date.now() - 24 * 60 * 60 * 1000);
      const isPublished = dest.status === 'published';
      const isArchived = dest.status === 'archived';
      
      let activityType = 'updated';
      if (isNewlyCreated) {
        activityType = 'created';
      } else if (isPublished && dest.publishedAt && new Date(dest.publishedAt).getTime() > (Date.now() - 24 * 60 * 60 * 1000)) {
        activityType = 'published';
      } else if (isArchived) {
        activityType = 'archived';
      }

      return {
        id: dest._id.toString(),
        type: activityType,
        destinationName: dest.name,
        destinationSlug: dest.slug,
        userName: dest.lastModifiedBy?.name || dest.createdBy?.name || 'Unknown User',
        timestamp: dest.updatedAt
      };
    });

    return NextResponse.json({
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching destination activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination activity' },
      { status: 500 }
    );
  }
}