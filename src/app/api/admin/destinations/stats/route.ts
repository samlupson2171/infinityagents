import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/admin/destinations/stats - Get destination statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // Get counts by status
    const [total, published, draft, archived] = await Promise.all([
      Destination.countDocuments({}),
      Destination.countDocuments({ status: 'published' }),
      Destination.countDocuments({ status: 'draft' }),
      Destination.countDocuments({ status: 'archived' })
    ]);

    // Get recently updated count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentlyUpdated = await Destination.countDocuments({
      updatedAt: { $gte: sevenDaysAgo }
    });

    return NextResponse.json({
      total,
      published,
      draft,
      archived,
      recentlyUpdated
    });

  } catch (error) {
    console.error('Error fetching destination stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination statistics' },
      { status: 500 }
    );
  }
}