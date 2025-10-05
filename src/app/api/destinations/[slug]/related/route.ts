import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/destinations/[slug]/related - Get related content for a destination (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    await connectToDatabase();

    // Find destination by slug (public endpoint uses slug)
    const destination = await Destination.findOne({ slug, status: 'published' })
      .populate('relatedOffers', 'name description price destination image')
      .populate('relatedActivities', 'name description price location category image')
      .populate('relatedDestinations', 'name slug description country region heroImage gradientColors')
      .lean();

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Only return published content
    const relatedContent = {
      offers: destination.relatedOffers || [],
      activities: destination.relatedActivities || [],
      destinations: (destination.relatedDestinations || []).filter((dest: any) => dest.status === 'published')
    };

    return NextResponse.json(relatedContent);

  } catch (error) {
    console.error('Error fetching related content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related content' },
      { status: 500 }
    );
  }
}