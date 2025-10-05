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

    // Get counts for each registration status
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      contractedCount,
      totalCount
    ] = await Promise.all([
      User.countDocuments({ role: 'agent', registrationStatus: 'pending' }),
      User.countDocuments({ role: 'agent', registrationStatus: 'approved' }),
      User.countDocuments({ role: 'agent', registrationStatus: 'rejected' }),
      User.countDocuments({ role: 'agent', registrationStatus: 'contracted' }),
      User.countDocuments({ role: 'agent' })
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await User.find({
      role: 'agent',
      $or: [
        { createdAt: { $gte: sevenDaysAgo } },
        { approvedAt: { $gte: sevenDaysAgo } },
        { contractSignedAt: { $gte: sevenDaysAgo } }
      ]
    })
    .select('name company registrationStatus createdAt approvedAt contractSignedAt')
    .sort({ createdAt: -1 })
    .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          contracted: contractedCount,
          total: totalCount
        },
        recentActivity
      },
    });
  } catch (error: any) {
    console.error('Error fetching agency stats:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch agency statistics',
        },
      },
      { status: 500 }
    );
  }
}