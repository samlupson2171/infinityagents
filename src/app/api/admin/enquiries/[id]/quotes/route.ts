import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import { z } from 'zod';

const createQuoteFromEnquirySchema = z.object({
  leadName: z.string().min(1, 'Lead name is required').max(100).optional(),
  hotelName: z.string().min(1, 'Hotel name is required').max(200),
  numberOfPeople: z.number().min(1, 'Number of people must be at least 1').max(100).optional(),
  numberOfRooms: z.number().min(1, 'Number of rooms must be at least 1').max(50),
  numberOfNights: z.number().min(1, 'Number of nights must be at least 1').max(30).optional(),
  arrivalDate: z.string().refine((date) => {
    const arrivalDate = new Date(date);
    return arrivalDate > new Date();
  }, 'Arrival date must be in the future').optional(),
  isSuperPackage: z.boolean().default(false),
  whatsIncluded: z.string().min(1, 'What\'s included is required').max(2000),
  transferIncluded: z.boolean().default(false),
  activitiesIncluded: z.string().max(1000).optional(),
  totalPrice: z.number().min(0, 'Total price must be non-negative').max(1000000),
  currency: z.enum(['GBP', 'EUR', 'USD']).default('GBP'),
  internalNotes: z.string().max(1000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Verify the enquiry exists
    const enquiry = await Enquiry.findById(params.id);
    if (!enquiry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ENQUIRY_NOT_FOUND',
            message: 'Enquiry not found',
          },
        },
        { status: 404 }
      );
    }

    // Get query parameters for pagination and sorting
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;

    // Get quotes for this enquiry
    const quotes = await Quote.find({ enquiryId: params.id })
      .populate([
        { path: 'createdBy', select: 'name email' }
      ])
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalQuotes = await Quote.countDocuments({ enquiryId: params.id });
    const totalPages = Math.ceil(totalQuotes / limit);

    return NextResponse.json({
      success: true,
      data: {
        enquiry: {
          id: enquiry._id,
          leadName: enquiry.leadName,
          agentEmail: enquiry.agentEmail,
          resort: enquiry.resort,
          travelDate: enquiry.travelDate,
        },
        quotes,
        pagination: {
          currentPage: page,
          totalPages,
          totalQuotes,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching quotes for enquiry:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quotes for enquiry',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization and get user
    const user = await requireAdmin(request);
    console.log('User from requireAdmin:', user);

    // Parse and validate request body
    const body = await request.json();
    console.log('Request body:', body);
    const quoteData = createQuoteFromEnquirySchema.parse(body);

    // Connect to database
    await connectDB();

    // Verify the enquiry exists and get its data
    console.log('Looking for enquiry with ID:', params.id);
    const enquiry = await Enquiry.findById(params.id);
    console.log('Found enquiry:', enquiry ? 'Yes' : 'No');
    if (!enquiry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ENQUIRY_NOT_FOUND',
            message: 'Enquiry not found',
          },
        },
        { status: 404 }
      );
    }

    // Pre-populate quote data from enquiry where not provided
    const quotePayload = {
      enquiryId: params.id,
      leadName: quoteData.leadName || enquiry.leadName,
      hotelName: quoteData.hotelName,
      numberOfPeople: quoteData.numberOfPeople || enquiry.numberOfGuests,
      numberOfRooms: quoteData.numberOfRooms,
      numberOfNights: quoteData.numberOfNights || enquiry.numberOfNights,
      arrivalDate: quoteData.arrivalDate ? new Date(quoteData.arrivalDate) : enquiry.travelDate,
      isSuperPackage: quoteData.isSuperPackage,
      whatsIncluded: quoteData.whatsIncluded,
      transferIncluded: quoteData.transferIncluded,
      activitiesIncluded: quoteData.activitiesIncluded || '',
      totalPrice: quoteData.totalPrice,
      currency: quoteData.currency,
      internalNotes: quoteData.internalNotes || '',
      createdBy: user.sub || user.id,
      status: 'draft' as const,
    };

    // Create the quote
    const quote = new Quote(quotePayload);
    await quote.save();

    // Update the enquiry using the instance method
    await enquiry.addQuote(quote._id);

    // Populate the quote with related data
    await quote.populate([
      { path: 'enquiryId', select: 'leadName agentEmail resort travelDate' },
      { path: 'createdBy', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      data: quote,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quote from enquiry:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create quote from enquiry',
        },
      },
      { status: 500 }
    );
  }
}