import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const isPublic = formData.get('isPublic') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, Excel, Word documents, and images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const filename = `${fileId}.${fileExtension}`;

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'destinations', params.id);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Determine file type
    let fileType: 'pdf' | 'excel' | 'image' | 'document' = 'document';
    if (file.type === 'application/pdf') {
      fileType = 'pdf';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      fileType = 'excel';
    } else if (file.type.startsWith('image/')) {
      fileType = 'image';
    }

    // Create file record
    const fileRecord = {
      id: fileId,
      filename,
      originalName: file.name,
      fileType,
      mimeType: file.type,
      size: file.size,
      url: `/uploads/destinations/${params.id}/${filename}`,
      uploadedBy: session.user.id,
      uploadedAt: new Date(),
      description: description || undefined,
      isPublic
    };

    // Add file to destination
    destination.files.push(fileRecord);
    destination.lastModifiedBy = session.user.id;
    await destination.save();

    return NextResponse.json({
      message: 'File uploaded successfully',
      file: fileRecord
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const destination = await Destination.findById(params.id)
      .populate('files.uploadedBy', 'name email')
      .select('files');

    if (!destination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 });
    }

    return NextResponse.json({ files: destination.files });

  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}