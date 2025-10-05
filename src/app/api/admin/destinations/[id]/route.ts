import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// GET /api/admin/destinations/[id] - Get single destination
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

    // Simplified query without problematic populates to avoid 500 errors
    const destination = await Destination.findById(id);

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ destination });

  } catch (error) {
    console.error('Error fetching destination:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/destinations/[id] - Update destination
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

    const body = await request.json();

    // Find the existing destination
    const existingDestination = await Destination.findById(id);
    if (!existingDestination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Check for slug conflicts if slug is being changed
    if (body.slug && body.slug !== existingDestination.slug) {
      const conflictingDestination = await Destination.findOne({ 
        slug: body.slug,
        _id: { $ne: id }
      });
      
      if (conflictingDestination) {
        return NextResponse.json(
          { error: 'A destination with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update lastModifiedBy
    body.lastModifiedBy = new Types.ObjectId(session.user.id);

    // Handle status changes
    if (body.status && body.status !== existingDestination.status) {
      switch (body.status) {
        case 'published':
          if (existingDestination.status !== 'published') {
            body.publishedAt = new Date();
            body.scheduledPublishAt = undefined;
          }
          break;
        case 'draft':
          if (existingDestination.status === 'published') {
            body.publishedAt = undefined;
          }
          body.scheduledPublishAt = undefined;
          break;
        case 'archived':
          body.publishedAt = undefined;
          body.scheduledPublishAt = undefined;
          break;
      }
    }

    // Handle scheduled publishing
    if (body.scheduledPublishAt) {
      const scheduledDate = new Date(body.scheduledPublishAt);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled publish date must be in the future' },
          { status: 400 }
        );
      }
      body.status = 'draft';
      body.publishedAt = undefined;
    }

    // Update sections lastModified timestamp if sections are being updated
    if (body.sections) {
      const now = new Date();
      Object.keys(body.sections).forEach(sectionKey => {
        if (body.sections[sectionKey]) {
          body.sections[sectionKey].lastModified = now;
        }
      });
    }

    // Simplified update without problematic populates
    const updatedDestination = await Destination.findByIdAndUpdate(
      id,
      body,
      { 
        new: true, 
        runValidators: true 
      }
    );

    return NextResponse.json({
      message: 'Destination updated successfully',
      destination: updatedDestination
    });

  } catch (error) {
    console.error('Error updating destination:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          validationErrors 
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `A destination with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update destination' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/destinations/[id] - Delete destination
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

    // Check if destination exists
    const destination = await Destination.findById(id);
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Check if destination is published (optional safety check)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    if (destination.status === 'published' && !force) {
      return NextResponse.json(
        { 
          error: 'Cannot delete published destination. Unpublish first or use force=true parameter.',
          destination: {
            id: destination._id,
            name: destination.name,
            status: destination.status
          }
        },
        { status: 409 }
      );
    }

    // Store destination info for response before deletion
    const deletedDestinationInfo = {
      id: destination._id,
      name: destination.name,
      slug: destination.slug,
      status: destination.status
    };

    await Destination.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Destination deleted successfully',
      deletedDestination: deletedDestinationInfo
    });

  } catch (error) {
    console.error('Error deleting destination:', error);
    return NextResponse.json(
      { error: 'Failed to delete destination' },
      { status: 500 }
    );
  }
}