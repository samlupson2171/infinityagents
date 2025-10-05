import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DownloadTracker } from '@/lib/download-tracker';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        const analytics = DownloadTracker.getDownloadAnalytics();
        return NextResponse.json({
          success: true,
          data: analytics,
        });

      case 'file':
        const fileId = searchParams.get('fileId');
        if (!fileId) {
          return NextResponse.json(
            { error: 'File ID is required' },
            { status: 400 }
          );
        }
        const fileStats = DownloadTracker.getFileDownloadStats(fileId);
        return NextResponse.json({
          success: true,
          data: fileStats,
        });

      case 'user':
        const userId = searchParams.get('userId');
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID is required' },
            { status: 400 }
          );
        }
        const userStats = DownloadTracker.getUserDownloadStats(userId);
        return NextResponse.json({
          success: true,
          data: userStats,
        });

      case 'recent':
        const limit = parseInt(searchParams.get('limit') || '50');
        const recentDownloads = DownloadTracker.getRecentDownloads(limit);
        return NextResponse.json({
          success: true,
          data: recentDownloads,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Download analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}