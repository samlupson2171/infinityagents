import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// POST /api/admin/destinations/[id]/archive - Archive destination
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
    const { comment } = body;

    // Archive the destination
    const updatedDestination = await destination.archive(
      new Types.ObjectId(session.user.id),
      comment
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
      message: 'Destination archived successfully',
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error archiving destination:', error);
    return NextResponse.json(
      { error: 'Failed to archive destination' },
      { status: 500 }
    );
  }
}