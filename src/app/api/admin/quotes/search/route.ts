import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    
    // Search parameters
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const emailStatus = searchParams.get('emailStatus') || '';
    const bookingInterest = searchParams.get('bookingInterest');
    const isSuperPackage = searchParams.get('isSuperPackage');
    const createdBy = searchParams.get('createdBy') || '';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Sort
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build MongoDB query
    const mongoQuery: any = {};

    // Text search across multiple fields
    if (query) {
      mongoQuery.$or = [
        { leadName: { $regex: query, $options: 'i' } },
        { hotelName: { $regex: query, $options: 'i' } },
        { whatsIncluded: { $regex: query, $options: 'i' } },
        { activitiesIncluded: { $regex: query, $options: 'i' } },
        { internalNotes: { $regex: query, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      mongoQuery.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      mongoQuery.createdAt = {};
      if (dateFrom) {
        mongoQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        mongoQuery.createdAt.$lte = new Date(dateTo);
      }
    }

    // Price range filter
    if (minPrice || maxPrice) {
      mongoQuery.totalPrice = {};
      if (minPrice) {
        mongoQuery.totalPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        mongoQuery.totalPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Email status filter
    if (emailStatus) {
      if (emailStatus === 'not_sent') {
        mongoQuery.emailSent = false;
      } else {
        mongoQuery.emailSent = true;
        mongoQuery.emailDeliveryStatus = emailStatus;
      }
    }

    // Booking interest filter
    if (bookingInterest !== null && bookingInterest !== undefined) {
      mongoQuery['bookingInterest.expressed'] = bookingInterest === 'true';
    }

    // Super package filter
    if (isSuperPackage !== null && isSuperPackage !== undefined) {
      mongoQuery.isSuperPackage = isSuperPackage === 'true';
    }

    // Created by filter
    if (createdBy) {
      mongoQuery.createdBy = createdBy;
    }

    // Execute search query with population
    const [quotes, totalCount] = await Promise.all([
      Quote.find(mongoQuery)
        .populate('enquiryId', 'customerName customerEmail destination')
        .populate('createdBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Quote.countDocuments(mongoQuery)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format response data
    const formattedQuotes = quotes.map(quote => ({
      id: quote._id,
      quoteReference: `Q${quote._id.toString().slice(-8).toUpperCase()}`,
      leadName: quote.leadName,
      hotelName: quote.hotelName,
      customerName: quote.enquiryId?.customerName || 'Unknown',
      customerEmail: quote.enquiryId?.customerEmail || '',
      destination: quote.enquiryId?.destination || 'Unknown',
      numberOfPeople: quote.numberOfPeople,
      numberOfRooms: quote.numberOfRooms,
      numberOfNights: quote.numberOfNights,
      arrivalDate: quote.arrivalDate,
      totalPrice: quote.totalPrice,
      currency: quote.currency,
      formattedPrice: `${quote.currency === 'GBP' ? '£' : quote.currency === 'EUR' ? '€' : '$'}${quote.totalPrice.toLocaleString()}`,
      status: quote.status,
      isSuperPackage: quote.isSuperPackage,
      transferIncluded: quote.transferIncluded,
      emailSent: quote.emailSent,
      emailSentAt: quote.emailSentAt,
      emailDeliveryStatus: quote.emailDeliveryStatus,
      bookingInterest: quote.bookingInterest?.expressed || false,
      bookingInterestDate: quote.bookingInterest?.expressedAt,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      createdBy: {
        id: quote.createdBy?._id,
        name: quote.createdBy?.name || 'Unknown Admin',
        email: quote.createdBy?.email || ''
      },
      version: quote.version,
      whatsIncluded: quote.whatsIncluded,
      activitiesIncluded: quote.activitiesIncluded,
      internalNotes: quote.internalNotes
    }));

    return NextResponse.json({
      success: true,
      data: {
        quotes: formattedQuotes,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        filters: {
          query,
          status,
          dateFrom,
          dateTo,
          minPrice,
          maxPrice,
          emailStatus,
          bookingInterest,
          isSuperPackage,
          createdBy
        },
        sort: {
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc'
        }
      }
    });

  } catch (error) {
    console.error('Quote search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search quotes' },
      { status: 500 }
    );
  }
}