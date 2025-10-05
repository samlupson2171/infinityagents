import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import { z } from 'zod';
import { 
  quoteFormValidationSchema, 
  QuoteFormData 
} from '@/lib/validation/quote-validation';

// Use the enhanced validation schema
const createQuoteSchema = quoteFormValidationSchema;

async function postHandler(request: NextRequest) {
  try {
    // Simple authentication check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const quoteData = quoteFormValidationSchema.parse(body);

    // Connect to database
    await connectDB();

    // Validate enquiry exists
    const enquiry = await Enquiry.findById(quoteData.enquiryId);
    if (!enquiry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Enquiry not found',
          },
        },
        { status: 404 }
      );
    }

    // Create the quote
    const quote = new Quote({
      ...quoteData,
      arrivalDate: new Date(quoteData.arrivalDate),
      createdBy: token.sub,
      status: 'draft',
    });

    await quote.save();

    // Update the enquiry
    if (!enquiry.quotes) {
      enquiry.quotes = [];
    }
    enquiry.quotes.push(quote._id);
    enquiry.hasQuotes = true;
    enquiry.latestQuoteDate = new Date();
    enquiry.quotesCount = enquiry.quotes.length;
    await enquiry.save();

    // Populate the quote with related data
    await quote.populate([
      { path: 'enquiryId', select: 'leadName agentEmail resort' },
      { path: 'createdBy', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      data: quote,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating quote:', error);

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
          message: 'Failed to create quote',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

async function getHandler(request: NextRequest) {
  try {
    // Simple authentication check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (token.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const enquiryId = searchParams.get('enquiryId');

    // Build query
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { leadName: { $regex: search, $options: 'i' } },
        { hotelName: { $regex: search, $options: 'i' } },
        { internalNotes: { $regex: search, $options: 'i' } }
      ];
    }

    if (enquiryId) {
      query.enquiryId = enquiryId;
    }

    // Get quotes with pagination
    const skip = (page - 1) * limit;
    const [quotes, totalQuotes] = await Promise.all([
      Quote.find(query)
        .populate('enquiryId', 'leadName agentEmail resort')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Quote.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalQuotes / limit);

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('Error fetching quotes:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quotes',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

// Export handlers
export const POST = postHandler;
export const GET = getHandler;