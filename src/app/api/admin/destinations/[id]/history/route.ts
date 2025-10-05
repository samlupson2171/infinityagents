import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// GET /api/admin/destinations/[id]/history - Get publishing history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid destination ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const destination = await Destination.findById(id)
      .populate('publishingHistory.performedBy', 'name email')
      .select('name slug publishingHistory');

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Sort history by timestamp (newest first)
    const sortedHistory = (destination.publishingHistory || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      destination: {
        id: destination._id,
        name: destination.name,
        slug: destination.slug
      },
      history: sortedHistory
    });

  } catch (error) {
    console.error('Error fetching publishing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishing history' },
      { status: 500 }
    );
  }
}