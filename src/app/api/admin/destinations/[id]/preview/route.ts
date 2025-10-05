import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// GET /api/admin/destinations/[id]/preview - Get destination preview (including unpublished)
export async function GET(
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

    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid destination ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const destination = await Destination.findById(id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('relatedOffers', 'name description price')
      .populate('relatedActivities', 'name description price');

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to preview this destination
    const isAdmin = session.user.role === 'admin';
    const isCreator = destination.createdBy._id.toString() === session.user.id;
    const isEditor = destination.lastModifiedBy._id.toString() === session.user.id;

    if (!isAdmin && !isCreator && !isEditor) {
      return NextResponse.json(
        { error: 'Insufficient permissions to preview this destination' },
        { status: 403 }
      );
    }

    // Generate preview URL token (for sharing)
    const { searchParams } = new URL(request.url);
    const generateToken = searchParams.get('generateToken') === 'true';
    
    let previewToken = null;
    if (generateToken) {
      // Generate a simple preview token (in production, use JWT or similar)
      previewToken = Buffer.from(`${destination._id}:${Date.now()}`).toString('base64');
    }

    return NextResponse.json({
      destination,
      preview: {
        isPreview: true,
        status: destination.status,
        publishedAt: destination.publishedAt,
        scheduledPublishAt: destination.scheduledPublishAt,
        lastModified: destination.updatedAt,
        previewToken
      }
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

// POST /api/admin/destinations/[id]/preview - Generate shareable preview link
export async function POST(
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

    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid destination ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const destination = await Destination.findById(id);
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isAdmin = session.user.role === 'admin';
    const isCreator = destination.createdBy.toString() === session.user.id;
    const isEditor = destination.lastModifiedBy.toString() === session.user.id;

    if (!isAdmin && !isCreator && !isEditor) {
      return NextResponse.json(
        { error: 'Insufficient permissions to generate preview link' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { expiresIn = 24 } = body; // Default 24 hours

    // Generate preview token with expiration
    const expirationTime = Date.now() + (expiresIn * 60 * 60 * 1000); // Convert hours to milliseconds
    const previewToken = Buffer.from(`${destination._id}:${expirationTime}:${session.user.id}`).toString('base64');
    
    // Generate preview URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const previewUrl = `${baseUrl}/destinations/${destination.slug}/preview?token=${previewToken}`;

    return NextResponse.json({
      previewUrl,
      token: previewToken,
      expiresAt: new Date(expirationTime).toISOString(),
      expiresIn: `${expiresIn} hours`
    });

  } catch (error) {
    console.error('Error generating preview link:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview link' },
      { status: 500 }
    );
  }
}