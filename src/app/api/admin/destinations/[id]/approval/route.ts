import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// POST /api/admin/destinations/[id]/approval - Request approval for content
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

    // Request approval
    const updatedDestination = await destination.requestApproval(
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
      message: 'Approval requested successfully',
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error requesting approval:', error);
    return NextResponse.json(
      { error: 'Failed to request approval' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/destinations/[id]/approval - Approve or reject content
export async function PUT(
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

    // Check if user has admin role (only admins can approve/reject)
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required to approve/reject content' },
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

    if (destination.approvalWorkflow.status !== 'pending') {
      return NextResponse.json(
        { error: 'No pending approval request found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, comment } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    let updatedDestination;
    if (action === 'approve') {
      updatedDestination = await destination.approveContent(
        new Types.ObjectId(session.user.id),
        comment
      );
    } else {
      updatedDestination = await destination.rejectContent(
        new Types.ObjectId(session.user.id),
        comment
      );
    }

    // Populate the response
    await updatedDestination.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' },
      { path: 'publishingHistory.performedBy', select: 'name email' },
      { path: 'approvalWorkflow.requestedBy', select: 'name email' },
      { path: 'approvalWorkflow.reviewedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      message: `Content ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}