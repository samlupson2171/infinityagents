import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// POST /api/admin/destinations/[id]/rollback - Rollback to a specific version
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

    const body = await request.json();
    const { version } = body;

    if (!version || typeof version !== 'number') {
      return NextResponse.json(
        { error: 'Version number is required' },
        { status: 400 }
      );
    }

    // Check if version exists
    const targetVersion = destination.previousVersions?.find(v => v.version === version);
    if (!targetVersion) {
      return NextResponse.json(
        { error: `Version ${version} not found` },
        { status: 404 }
      );
    }

    // Rollback to the specified version
    const updatedDestination = await destination.rollbackToVersion(
      version,
      new Types.ObjectId(session.user.id)
    );

    // Populate the response
    await updatedDestination.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' },
      { path: 'publishingHistory.performedBy', select: 'name email' },
      { path: 'approvalWorkflow.requestedBy', select: 'name email' },
      { path: 'approvalWorkflow.reviewedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      message: `Successfully rolled back to version ${version}`,
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error rolling back version:', error);
    return NextResponse.json(
      { error: 'Failed to rollback version' },
      { status: 500 }
    );
  }
}