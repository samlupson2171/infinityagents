import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Retrieve image metadata
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { db } = await connectToDatabase();
    
    const image = await db.collection('media').findOne({
      _id: new ObjectId(params.id)
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json(image);

  } catch (error) {
    console.error('Get image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update image metadata (alt text, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user is admin
    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { altText } = body;

    if (typeof altText !== 'string') {
      return NextResponse.json({ error: 'Invalid alt text' }, { status: 400 });
    }

    // Update image
    const result = await db.collection('media').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          altText,
          updatedAt: new Date(),
          lastModifiedBy: user._id
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove image and all files
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user is admin
    const user = await db.collection('users').findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get image data
    const image = await db.collection('media').findOne({
      _id: new ObjectId(params.id)
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check if image is being used in destinations
    const usageCount = await db.collection('destinations').countDocuments({
      $or: [
        { heroImage: params.id },
        { 'galleryImages': params.id },
        { 'sections.overview.images': params.id },
        { 'sections.accommodation.images': params.id },
        { 'sections.attractions.images': params.id },
        { 'sections.beaches.images': params.id },
        { 'sections.nightlife.images': params.id },
        { 'sections.dining.images': params.id },
        { 'sections.practical.images': params.id }
      ]
    });

    if (usageCount > 0) {
      return NextResponse.json({ 
        error: `Image is being used in ${usageCount} destination(s). Please remove it from destinations first.` 
      }, { status: 400 });
    }

    // Delete files from filesystem
    const imageDir = join(process.cwd(), 'public', 'uploads', 'images', params.id);
    
    if (existsSync(imageDir)) {
      try {
        // Delete all size files
        const sizeNames = ['thumbnail', 'small', 'medium', 'large', 'hero'];
        for (const sizeName of sizeNames) {
          const sizePath = join(imageDir, `${sizeName}.webp`);
          if (existsSync(sizePath)) {
            await unlink(sizePath);
          }
        }

        // Delete original file
        const originalFiles = ['original.jpg', 'original.png', 'original.webp'];
        for (const fileName of originalFiles) {
          const filePath = join(imageDir, fileName);
          if (existsSync(filePath)) {
            await unlink(filePath);
          }
        }

        // Remove directory
        await rmdir(imageDir);
      } catch (fileError) {
        console.error('Error deleting files:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await db.collection('media').deleteOne({
      _id: new ObjectId(params.id)
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}