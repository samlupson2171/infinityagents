import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// POST /api/admin/destinations/bulk - Bulk operations on destinations
export async function POST(request: NextRequest) {
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

    await connectToDatabase();

    const body = await request.json();
    const { action, destinationIds } = body;

    // Validate input
    if (!action || !Array.isArray(destinationIds) || destinationIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Action and destinationIds are required.' },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = ['publish', 'unpublish', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: publish, unpublish, delete' },
        { status: 400 }
      );
    }

    // Validate destination IDs
    const validIds = destinationIds.filter(id => Types.ObjectId.isValid(id));
    if (validIds.length !== destinationIds.length) {
      return NextResponse.json(
        { error: 'Invalid destination IDs provided' },
        { status: 400 }
      );
    }

    const objectIds = validIds.map(id => new Types.ObjectId(id));
    let result;
    let count = 0;

    switch (action) {
      case 'publish':
        result = await Destination.updateMany(
          { _id: { $in: objectIds } },
          { 
            status: 'published',
            publishedAt: new Date(),
            lastModifiedBy: new Types.ObjectId(session.user.id)
          }
        );
        count = result.modifiedCount;
        break;

      case 'unpublish':
        result = await Destination.updateMany(
          { _id: { $in: objectIds } },
          { 
            status: 'draft',
            publishedAt: null,
            lastModifiedBy: new Types.ObjectId(session.user.id)
          }
        );
        count = result.modifiedCount;
        break;

      case 'delete':
        // First check if any destinations are currently published
        const publishedDestinations = await Destination.find({
          _id: { $in: objectIds },
          status: 'published'
        }).select('name');

        if (publishedDestinations.length > 0) {
          return NextResponse.json(
            { 
              error: 'Cannot delete published destinations. Please unpublish them first.',
              publishedDestinations: publishedDestinations.map(d => d.name)
            },
            { status: 400 }
          );
        }

        result = await Destination.deleteMany({
          _id: { $in: objectIds }
        });
        count = result.deletedCount;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log the bulk operation for audit purposes
    console.log(`Bulk ${action} operation performed by ${session.user.email} on ${count} destinations`);

    // Format the action for the message
    const actionPastTense = action === 'delete' ? 'deleted' : `${action}ed`;
    
    return NextResponse.json({
      message: `Successfully ${actionPastTense} ${count} destination(s)`,
      count,
      action
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}