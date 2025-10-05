import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Destination from '@/models/Destination';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Check admin permissions
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get slug from query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const excludeId = searchParams.get('excludeId'); // For editing existing destinations

    if (!slug) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Slug parameter is required' } },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { 
          isUnique: false, 
          error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
        },
        { status: 200 }
      );
    }

    // Check for reserved slugs
    const reservedSlugs = ['admin', 'api', 'auth', 'dashboard', 'new', 'edit', 'create'];
    if (reservedSlugs.includes(slug)) {
      return NextResponse.json(
        { 
          isUnique: false, 
          error: 'This slug is reserved and cannot be used' 
        },
        { status: 200 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Build query to check uniqueness
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    // Check if slug exists
    const existingDestination = await Destination.findOne(query);
    const isUnique = !existingDestination;

    return NextResponse.json({
      isUnique,
      slug,
      ...(isUnique ? {} : { error: 'This slug is already taken' })
    });

  } catch (error) {
    console.error('Error validating slug:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to validate slug' 
        } 
      },
      { status: 500 }
    );
  }
}