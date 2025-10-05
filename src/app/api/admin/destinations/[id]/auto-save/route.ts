import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// PATCH /api/admin/destinations/[id]/auto-save - Auto-save destination changes
export async function PATCH(
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

    // For auto-save, update basic fields and sections
    const autoSaveData: any = {
      lastModifiedBy: new Types.ObjectId(session.user.id),
    };

    // Update basic fields if provided
    if (body.name) autoSaveData.name = body.name;
    if (body.country) autoSaveData.country = body.country;
    if (body.region) autoSaveData.region = body.region;
    if (body.description) autoSaveData.description = body.description;
    if (body.slug) autoSaveData.slug = body.slug;

    // Update sections if provided
    if (body.sections) {
      autoSaveData.sections = body.sections;
      
      // Update lastModified timestamp for sections
      const now = new Date();
      Object.keys(body.sections).forEach(sectionKey => {
        if (autoSaveData.sections[sectionKey]) {
          autoSaveData.sections[sectionKey].lastModified = now;
        }
      });
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

    const updatedDestination = await Destination.findByIdAndUpdate(
      id,
      autoSaveData,
      { 
        new: true, 
        runValidators: true 
      }
    ).select('name country region description slug sections updatedAt');

    return NextResponse.json({
      message: 'Auto-save successful',
      destination: updatedDestination,
      savedAt: new Date()
    });

  } catch (error) {
    console.error('Error auto-saving destination:', error);
    
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

    return NextResponse.json(
      { error: 'Auto-save failed' },
      { status: 500 }
    );
  }
}