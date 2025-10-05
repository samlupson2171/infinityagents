import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// GET /api/destinations - Get published destinations for public site
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Build query for published destinations only
    const query: any = { status: 'published' };

    // Add region filter if specified
    if (region && region !== 'all') {
      query.region = { $regex: region, $options: 'i' };
    }

    // Add search filter if specified
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { region: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'sections.overview.content': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch destinations with pagination
    const destinations = await Destination.find(query)
      .select('name slug country region description heroImage gradientColors quickFacts status publishedAt')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Destination.countDocuments(query);

    // Transform data for public consumption
    const transformedDestinations = destinations.map(dest => ({
      id: dest.slug,
      _id: dest._id,
      name: dest.name,
      slug: dest.slug,
      country: dest.country,
      region: dest.region,
      description: dest.description,
      image: dest.heroImage,
      gradientColors: dest.gradientColors,
      highlights: dest.quickFacts ? [
        dest.quickFacts.climate && `${dest.quickFacts.climate} climate`,
        dest.quickFacts.bestTime && `Best time: ${dest.quickFacts.bestTime}`,
        dest.quickFacts.flightTime && `${dest.quickFacts.flightTime} flight time`,
        dest.quickFacts.language && `Language: ${dest.quickFacts.language}`,
        dest.quickFacts.airport && `Airport: ${dest.quickFacts.airport}`
      ].filter(Boolean) : [],
      climate: dest.quickFacts?.climate || 'Mediterranean',
      bestTime: dest.quickFacts?.bestTime || 'Year-round',
      flightTime: dest.quickFacts?.flightTime || 'Varies',
      publishedAt: dest.publishedAt
    }));

    return NextResponse.json({
      destinations: transformedDestinations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching destinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    );
  }
}