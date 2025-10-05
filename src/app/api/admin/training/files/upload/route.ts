import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FileManager } from '@/lib/file-manager';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file using FileManager
    const result = await FileManager.uploadFile(
      buffer,
      file.name,
      file.type,
      new mongoose.Types.ObjectId(session.user.id)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return file information
    return NextResponse.json({
      success: true,
      file: {
        id: result.file!.id,
        originalName: result.file!.originalName,
        fileName: result.file!.fileName,
        filePath: result.file!.filePath,
        mimeType: result.file!.mimeType,
        size: result.file!.size,
        uploadedAt: result.file!.createdAt,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's uploaded files
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');

    let files;
    if (materialId) {
      // Get files for specific material
      const { FileStorage } = await import('@/models');
      files = await FileStorage.findByMaterial(new mongoose.Types.ObjectId(materialId));
    } else {
      // Get all files uploaded by user
      const { FileStorage } = await import('@/models');
      files = await FileStorage.findByUploader(new mongoose.Types.ObjectId(session.user.id));
    }

    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.createdAt,
        isOrphaned: file.isOrphaned,
        associatedMaterial: file.associatedMaterial,
      })),
    });
  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}