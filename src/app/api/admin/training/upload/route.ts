import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
          },
        },
        { status: 400 }
      );
    }

    // Validate file type based on material type
    const allowedTypes: { [key: string]: string[] } = {
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      download: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ],
      blog: ['image/jpeg', 'image/png', 'image/gif'], // For blog images
    };

    if (type && allowedTypes[type] && !allowedTypes[type].includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `Invalid file type for ${type}. Allowed types: ${allowedTypes[type].join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 50MB limit',
          },
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `training/${type || 'general'}/${timestamp}_${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        filename: blob.pathname,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload file',
        },
      },
      { status: 500 }
    );
  }
}
