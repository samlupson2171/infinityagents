import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { promises as fs } from 'fs';
import path from 'path';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { FileStorage } = await import('@/models');
    const file = await FileStorage.findOne({ id: params.id });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the file from disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath);
    
    try {
      const fileBuffer = await fs.readFile(fullPath);
      
      // Return the file with appropriate headers for viewing (not downloading)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': file.mimeType,
          'Content-Length': file.size.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json({ error: 'File not accessible' }, { status: 404 });
    }
  } catch (error) {
    console.error('File view error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}