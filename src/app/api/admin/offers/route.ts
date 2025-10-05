import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { z } from 'zod';

const createOfferSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description too long'),
  inclusions: z
    .array(z.string().min(1))
    .min(1, 'At least one inclusion is required'),
  isActive: z.boolean().default(true),
  // Additional fields from UnifiedOfferCreator
  destination: z.string().optional(),
  currency: z.string().optional(),
  pricing: z.array(z.object({
    month: z.string(),
    accommodationType: z.string().optional(),
    nights: z.number().optional(),
    price: z.number(),
    pax: z.number().optional(),
    specialPeriod: z.string().optional()
  })).optional(),
  flexiblePricing: z.array(z.object({
    month: z.string(),
    accommodationType: z.string(),
    nights: z.number(),
    pax: z.number(),
    price: z.number(),
    currency: z.string(),
    isAvailable: z.boolean(),
    specialPeriod: z.string().optional()
  })).optional(),
  metadata: z.object({
    currency: z.string(),
    season: z.string(),
    lastUpdated: z.string().or(z.date()).transform((val) => new Date(val)),
    importSource: z.string().optional(),
    version: z.number().optional()
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE OFFER API START ===');
    
    // Verify admin authorization
    const adminToken = await requireAdmin(request);
    console.log('Admin token verified:', adminToken.sub);

    // Parse and validate request body
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const offerData = createOfferSchema.parse(body);
    console.log('Validated offer data:', JSON.stringify(offerData, null, 2));

    // Connect to database
    await connectDB();
    console.log('Database connected');

    // Create new offer with enhanced data
    const offerPayload = {
      ...offerData,
      createdBy: adminToken.sub,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Handle flexiblePricing data if provided directly
    if (offerData.flexiblePricing && offerData.flexiblePricing.length > 0) {
      console.log('Using provided flexible pricing:', offerData.flexiblePricing);
      offerPayload.flexiblePricing = offerData.flexiblePricing;
    }
    // Convert legacy pricing data to flexible pricing format if provided
    else if (offerData.pricing && offerData.pricing.length > 0) {
      console.log('Converting legacy pricing data:', offerData.pricing);
      offerPayload.flexiblePricing = offerData.pricing.map(p => ({
        month: p.month,
        accommodationType: p.accommodationType || 'Apartment',
        nights: p.nights || 3,
        pax: p.pax || 8,
        price: p.price,
        currency: offerData.currency || 'EUR',
        isAvailable: true,
        specialPeriod: p.specialPeriod
      }));
      console.log('Flexible pricing created:', offerPayload.flexiblePricing);
    }

    console.log('Final offer payload:', JSON.stringify(offerPayload, null, 2));

    const offer = new Offer(offerPayload);
    console.log('Offer model created, attempting to save...');

    await offer.save();
    console.log('Offer saved successfully with ID:', offer._id);

    // Populate creator info for response
    await offer.populate('createdBy', 'name contactEmail');

    return NextResponse.json(
      {
        success: true,
        data: offer,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('=== CREATE OFFER ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Handle MongoDB/Mongoose errors
    if (error.name === 'ValidationError') {
      console.error('Mongoose validation error:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_VALIDATION_ERROR',
            message: 'Database validation failed',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to create offer: ${error.message}`,
          details: error.toString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 'active', 'inactive', or 'all'
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    // 'all' or no status means no filter

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { inclusions: { $elemMatch: { $regex: search, $options: 'i' } } },
      ];
    }

    // Get offers with pagination
    const offers = await Offer.find(query)
      .populate('createdBy', 'name contactEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalOffers = await Offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    return NextResponse.json({
      success: true,
      data: {
        offers,
        pagination: {
          currentPage: page,
          totalPages,
          totalOffers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching offers:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch offers',
        },
      },
      { status: 500 }
    );
  }
}
