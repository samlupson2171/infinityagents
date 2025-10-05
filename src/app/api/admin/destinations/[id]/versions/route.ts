import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// GET /api/admin/destinations/[id]/versions - Get version history
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
      .populate('previousVersions.savedBy', 'name email')
      .select('name slug version previousVersions');

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      currentVersion: destination.version,
      versions: destination.previousVersions || []
    });

  } catch (error) {
    console.error('Error fetching version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}

// POST /api/admin/destinations/[id]/versions - Save current version
export async function POST(
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

    const destination = await Destination.findById(id);
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Save current version
    const updatedDestination = await destination.saveVersion(
      new Types.ObjectId(session.user.id)
    );

    return NextResponse.json({
      message: 'Version saved successfully',
      currentVersion: updatedDestination.version,
      totalVersions: (updatedDestination.previousVersions || []).length
    });

  } catch (error) {
    console.error('Error saving version:', error);
    return NextResponse.json(
      { error: 'Failed to save version' },
      { status: 500 }
    );
  }
}