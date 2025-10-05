import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/destinations/[slug] - Get individual destination by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    await connectToDatabase();

    // Find published destination by slug
    const destination = await Destination.findOne({ 
      slug, 
      status: 'published' 
    }).lean();

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Transform data for public consumption
    const transformedDestination = {
      id: destination.slug,
      _id: destination._id,
      name: destination.name,
      slug: destination.slug,
      country: destination.country,
      region: destination.region,
      description: destination.description,
      heroImage: destination.heroImage,
      galleryImages: destination.galleryImages || [],
      gradientColors: destination.gradientColors,
      files: destination.files || [],
      sections: destination.sections,
      quickFacts: destination.quickFacts,
      publishedAt: destination.publishedAt,
      // Generate breadcrumb data
      breadcrumb: [
        { name: 'Destinations', href: '/destinations' },
        { name: destination.name, href: `/destinations/${destination.slug}` }
      ]
    };

    return NextResponse.json(transformedDestination);

  } catch (error) {
    console.error('Error fetching destination:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination' },
      { status: 500 }
    );
  }
}