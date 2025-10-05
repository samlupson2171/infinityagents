import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface UploadedImageData {
  id: string;
  originalName: string;
  sizes: {
    [key: string]: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  altText: string;
  metadata: {
    format: string;
    originalSize: number;
    uploadedAt: Date;
    dimensions: {
      width: number;
      height: number;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' 
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the URL
    const url = `/uploads/${filename}`;
    
    return NextResponse.json({ 
      url,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSizeWidth(sizeName: string): number {
  const sizes: { [key: string]: number } = {
    thumbnail: 150,
    small: 400,
    medium: 800,
    large: 1200,
    hero: 1920
  };
  return sizes[sizeName] || 800;
}

function getSizeHeight(sizeName: string): number {
  const sizes: { [key: string]: number } = {
    thumbnail: 150,
    small: 300,
    medium: 600,
    large: 900,
    hero: 1080
  };
  return sizes[sizeName] || 600;
}