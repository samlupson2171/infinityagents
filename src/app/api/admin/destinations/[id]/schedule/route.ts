import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// POST /api/admin/destinations/[id]/schedule - Schedule destination for publishing
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
    const { scheduledDate, comment } = body;

    if (!scheduledDate) {
      return NextResponse.json(
        { error: 'Scheduled date is required' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledDate);
    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Check if approval is required and approved
    if (destination.approvalWorkflow.isRequired && destination.approvalWorkflow.status !== 'approved') {
      return NextResponse.json(
        { error: 'Content must be approved before scheduling' },
        { status: 403 }
      );
    }

    // Schedule the destination
    const updatedDestination = await destination.schedulePublish(
      scheduleDate,
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
      message: 'Destination scheduled for publishing successfully',
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error scheduling destination:', error);
    return NextResponse.json(
      { error: 'Failed to schedule destination' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/destinations/[id]/schedule - Cancel scheduled publishing
export async function DELETE(
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

    if (!destination.scheduledPublishAt) {
      return NextResponse.json(
        { error: 'Destination is not scheduled for publishing' },
        { status: 400 }
      );
    }

    // Cancel scheduled publishing
    destination.scheduledPublishAt = undefined;
    const updatedDestination = await destination.save();

    // Populate the response
    await updatedDestination.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' },
      { path: 'publishingHistory.performedBy', select: 'name email' },
      { path: 'approvalWorkflow.requestedBy', select: 'name email' },
      { path: 'approvalWorkflow.reviewedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      message: 'Scheduled publishing cancelled successfully',
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error cancelling scheduled publishing:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled publishing' },
      { status: 500 }
    );
  }
}