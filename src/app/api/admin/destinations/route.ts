import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination, { IDestination } from '@/models/Destination';
import { Types } from 'mongoose';

// GET /api/admin/destinations - List destinations with filtering, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filter parameters
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    const region = searchParams.get('region');
    const search = searchParams.get('search');
    const aiGenerated = searchParams.get('aiGenerated');
    const createdBy = searchParams.get('createdBy');

    // Sort parameters (updated to match component expectations)
    const sortField = searchParams.get('sortField') || 'lastModified';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const sortOrder = sortDirection === 'asc' ? 1 : -1;
    
    // Map frontend field names to database field names
    const fieldMapping: { [key: string]: string } = {
      'lastModified': 'updatedAt',
      'name': 'name',
      'country': 'country',
      'status': 'status'
    };
    
    const sortBy = fieldMapping[sortField] || 'updatedAt';

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (country) {
      query.country = new RegExp(country, 'i');
    }

    if (region) {
      query.region = new RegExp(region, 'i');
    }

    if (aiGenerated !== null && aiGenerated !== undefined) {
      query.aiGenerated = aiGenerated === 'true';
    }

    if (createdBy && Types.ObjectId.isValid(createdBy)) {
      query.createdBy = new Types.ObjectId(createdBy);
    }

    // Handle search query
    let destinations;
    let total;

    if (search) {
      // Use text search
      // For search, use name and description fields instead of text index
      const searchQuery = {
        ...query,
        $or: [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      };
      
      destinations = await Destination.find(searchQuery)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

      total = await Destination.countDocuments(searchQuery);


    } else {
      // Regular query
      destinations = await Destination.find(query)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

      total = await Destination.countDocuments(query);
    }

    // Get filter options for dropdowns
    const [countries, regions] = await Promise.all([
      Destination.distinct('country'),
      Destination.distinct('region')
    ]);

    // Format destinations to match component expectations
    const formattedDestinations = destinations.map((dest: any) => ({
      _id: dest._id.toString(),
      name: dest.name,
      country: dest.country,
      region: dest.region,
      status: dest.status,
      publishedAt: dest.publishedAt?.toISOString(),
      lastModified: dest.updatedAt.toISOString(),
      createdBy: {
        name: dest.createdBy?.name || 'Unknown',
        email: dest.createdBy?.email || 'unknown@example.com'
      },
      aiGenerated: dest.aiGenerated || false
    }));

    return NextResponse.json({
      destinations: formattedDestinations,
      total,
      filterOptions: {
        countries: (countries || []).sort(),
        regions: (regions || []).sort()
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

// POST /api/admin/destinations - Create new destination
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'country', 'region', 'description'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }

    // Create default sections if not provided
    const defaultSection = {
      title: '',
      content: 'Content coming soon...',
      images: [],
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    };

    const destinationData = {
      ...body,
      createdBy: new Types.ObjectId(session.user.id),
      lastModifiedBy: new Types.ObjectId(session.user.id),
      sections: {
        overview: body.sections?.overview || { ...defaultSection, title: 'Overview' },
        accommodation: body.sections?.accommodation || { ...defaultSection, title: 'Accommodation' },
        attractions: body.sections?.attractions || { ...defaultSection, title: 'Attractions' },
        beaches: body.sections?.beaches || { ...defaultSection, title: 'Beaches' },
        nightlife: body.sections?.nightlife || { ...defaultSection, title: 'Nightlife' },
        dining: body.sections?.dining || { ...defaultSection, title: 'Dining' },
        practical: body.sections?.practical || { ...defaultSection, title: 'Practical Information' }
      },
      quickFacts: body.quickFacts || {},
      status: body.status || 'draft',
      aiGenerated: body.aiGenerated || false
    };

    // Check for duplicate slug
    if (destinationData.slug) {
      const existingDestination = await Destination.findOne({ slug: destinationData.slug });
      if (existingDestination) {
        return NextResponse.json(
          { error: 'A destination with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const destination = new Destination(destinationData);
    await destination.save();

    // Populate creator information for response
    await destination.populate('createdBy', 'name email');
    await destination.populate('lastModifiedBy', 'name email');

    return NextResponse.json(
      { 
        message: 'Destination created successfully',
        destination 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating destination:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          validationErrors 
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `A destination with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create destination' },
      { status: 500 }
    );
  }
}