import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const destination = await Destination.findById(params.id);
    if (!destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    const fileIndex = destination.files.findIndex(f => f.id === params.fileId);
    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = destination.files[fileIndex];

    // Delete physical file
    try {
      const filePath = join(process.cwd(), 'public', file.url);
      await unlink(filePath);
    } catch (error) {
      console.warn('Could not delete physical file:', error);
    }

    // Remove file from destination
    destination.files.splice(fileIndex, 1);
    destination.lastModifiedBy = session.user.id;
    await destination.save();

    return NextResponse.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const destination = await Destination.findById(params.id);
    if (!destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    const fileIndex = destination.files.findIndex(f => f.id === params.fileId);
    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { description, isPublic } = await request.json();

    // Update file metadata
    if (description !== undefined) {
      destination.files[fileIndex].description = description;
    }
    if (isPublic !== undefined) {
      destination.files[fileIndex].isPublic = isPublic;
    }

    destination.lastModifiedBy = session.user.id;
    await destination.save();

    return NextResponse.json({
      message: 'File updated successfully',
      file: destination.files[fileIndex]
    });

  } catch (error) {
    console.error('Update file error:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}