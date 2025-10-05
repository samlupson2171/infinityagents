import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DownloadTracker } from '@/lib/download-tracker';
import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  let downloadSuccess = false;
  let errorMessage: string | undefined;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { FileStorage } = await import('@/models');
    const file = await FileStorage.findOne({ id: params.id });

    if (!file) {
      errorMessage = 'File not found';
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    // Check download permissions
    const permissionCheck = await DownloadTracker.checkDownloadPermission(
      session.user.id,
      session.user.role || 'user',
      params.id
    );

    if (!permissionCheck.allowed) {
      errorMessage = permissionCheck.reason || 'Access denied';
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    // Check rate limiting
    const rateLimit = DownloadTracker.checkRateLimit(session.user.id);
    if (!rateLimit.allowed) {
      errorMessage = 'Rate limit exceeded';
      return NextResponse.json(
        { 
          error: errorMessage,
          retryAfter: rateLimit.resetTime.toISOString(),
          remaining: rateLimit.remaining
        }, 
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
          }
        }
      );
    }

    // Read file from disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath);
    
    try {
      const fileBuffer = await fs.readFile(fullPath);
      
      // Mark download as successful
      downloadSuccess = true;
      
      // Set appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', file.mimeType);
      headers.set('Content-Length', file.size.toString());
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
      
      // Security headers
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-Download-Options', 'noopen');
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // Rate limit headers
      headers.set('X-RateLimit-Remaining', (rateLimit.remaining - 1).toString());
      headers.set('X-RateLimit-Reset', rateLimit.resetTime.toISOString());
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      errorMessage = 'File not accessible';
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('File download error:', error);
    errorMessage = 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Log the download attempt
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await connectToDatabase();
        const { FileStorage } = await import('@/models');
        const file = await FileStorage.findOne({ id: params.id });
        
        if (file) {
          await DownloadTracker.logDownload({
            fileId: params.id,
            userId: session.user.id,
            userRole: session.user.role || 'user',
            downloadedAt: new Date(),
            ipAddress: DownloadTracker.getClientIp(request),
            userAgent: request.headers.get('user-agent') || undefined,
            fileSize: file.size,
            success: downloadSuccess,
            errorMessage,
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log download:', logError);
      // Don't fail the request if logging fails
    }
  }
}

// HEAD request for file metadata (useful for checking file existence without downloading)
export async function HEAD(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }

    await connectToDatabase();

    const { FileStorage } = await import('@/models');
    const file = await FileStorage.findOne({ id: params.id });

    if (!file || file.isOrphaned) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if user has access
    const isAdmin = session.user.role === 'admin';
    const isAgent = session.user.role === 'agent';

    if (!isAdmin && !isAgent) {
      return new NextResponse(null, { status: 403 });
    }

    // Check if file exists on disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath);
    
    try {
      await fs.access(fullPath);
      
      const headers = new Headers();
      headers.set('Content-Type', file.mimeType);
      headers.set('Content-Length', file.size.toString());
      headers.set('Last-Modified', file.updatedAt.toUTCString());
      
      return new NextResponse(null, {
        status: 200,
        headers,
      });
    } catch (fileError) {
      return new NextResponse(null, { status: 404 });
    }
  } catch (error) {
    console.error('File head error:', error);
    return new NextResponse(null, { status: 500 });
  }
}