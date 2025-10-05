import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteAdmin } from '@/lib/middleware/quote-auth-middleware';
import { QuoteAuditLogger } from '@/lib/audit/quote-audit-logger';
import { QuoteDataSanitizer } from '@/lib/security/quote-data-sanitizer';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(request: NextRequest) {
  let auditContext;
  
  try {
    // Verify admin authorization with export permissions
    const { user, auditContext: audit } = await requireQuoteAdmin(request);
    auditContext = audit;

    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // Sanitize search parameters
    const sanitizedParams = QuoteDataSanitizer.sanitizeSearchParams({
      q: searchParams.get('q'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      emailStatus: searchParams.get('emailStatus'),
      bookingInterest: searchParams.get('bookingInterest'),
      isSuperPackage: searchParams.get('isSuperPackage'),
      createdBy: searchParams.get('createdBy'),
      format: searchParams.get('format'),
    });

    const query = sanitizedParams.q || '';
    const status = sanitizedParams.status || '';
    const dateFrom = sanitizedParams.dateFrom;
    const dateTo = sanitizedParams.dateTo;
    const minPrice = sanitizedParams.minPrice;
    const maxPrice = sanitizedParams.maxPrice;
    const emailStatus = sanitizedParams.emailStatus || '';
    const bookingInterest = sanitizedParams.bookingInterest;
    const isSuperPackage = sanitizedParams.isSuperPackage;
    const createdBy = sanitizedParams.createdBy || '';
    const format = ['csv', 'json'].includes(sanitizedParams.format || '') ? sanitizedParams.format : 'csv';

    // Build the same MongoDB query as search
    const mongoQuery: any = {};

    if (query) {
      mongoQuery.$or = [
        { leadName: { $regex: query, $options: 'i' } },
        { hotelName: { $regex: query, $options: 'i' } },
        { whatsIncluded: { $regex: query, $options: 'i' } },
        { activitiesIncluded: { $regex: query, $options: 'i' } },
        { internalNotes: { $regex: query, $options: 'i' } }
      ];
    }

    if (status) mongoQuery.status = status;
    
    if (dateFrom || dateTo) {
      mongoQuery.createdAt = {};
      if (dateFrom) mongoQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) mongoQuery.createdAt.$lte = new Date(dateTo);
    }

    if (minPrice || maxPrice) {
      mongoQuery.totalPrice = {};
      if (minPrice) mongoQuery.totalPrice.$gte = minPrice;
      if (maxPrice) mongoQuery.totalPrice.$lte = maxPrice;
    }

    if (emailStatus) {
      if (emailStatus === 'not_sent') {
        mongoQuery.emailSent = false;
      } else {
        mongoQuery.emailSent = true;
        mongoQuery.emailDeliveryStatus = emailStatus;
      }
    }

    if (bookingInterest !== null && bookingInterest !== undefined) {
      mongoQuery['bookingInterest.expressed'] = bookingInterest;
    }

    if (isSuperPackage !== null && isSuperPackage !== undefined) {
      mongoQuery.isSuperPackage = isSuperPackage;
    }

    if (createdBy) mongoQuery.createdBy = createdBy;

    // Limit export size for security (max 10,000 records)
    const maxExportLimit = 10000;
    
    // Fetch all matching quotes (no pagination for export, but with limit)
    const quotes = await Quote.find(mongoQuery)
      .populate('enquiryId', 'customerName customerEmail destination')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(maxExportLimit)
      .lean();

    // Log the export operation
    await QuoteAuditLogger.logQuoteExport(
      auditContext,
      { query, status, dateFrom, dateTo, minPrice, maxPrice, emailStatus, bookingInterest, isSuperPackage, createdBy, format },
      quotes.length,
      true
    );

    if (format === 'json') {
      // Return JSON format
      const jsonData = quotes.map(quote => ({
        quoteReference: `Q${(quote._id as any).toString().slice(-8).toUpperCase()}`,
        leadName: quote.leadName,
        hotelName: quote.hotelName,
        customerName: quote.enquiryId?.customerName || 'Unknown',
        customerEmail: quote.enquiryId?.customerEmail || '',
        destination: quote.enquiryId?.destination || 'Unknown',
        numberOfPeople: quote.numberOfPeople,
        numberOfRooms: quote.numberOfRooms,
        numberOfNights: quote.numberOfNights,
        arrivalDate: quote.arrivalDate?.toISOString().split('T')[0],
        totalPrice: quote.totalPrice,
        currency: quote.currency,
        status: quote.status,
        isSuperPackage: quote.isSuperPackage,
        transferIncluded: quote.transferIncluded,
        emailSent: quote.emailSent,
        emailSentAt: quote.emailSentAt?.toISOString(),
        emailDeliveryStatus: quote.emailDeliveryStatus,
        bookingInterest: quote.bookingInterest?.expressed || false,
        bookingInterestDate: quote.bookingInterest?.expressedAt?.toISOString(),
        createdAt: quote.createdAt?.toISOString(),
        createdBy: quote.createdBy?.name || 'Unknown Admin',
        version: quote.version,
        whatsIncluded: quote.whatsIncluded,
        activitiesIncluded: quote.activitiesIncluded,
        internalNotes: quote.internalNotes
      }));

      return NextResponse.json({
        success: true,
        data: jsonData,
        exportInfo: {
          totalRecords: quotes.length,
          exportedAt: new Date().toISOString(),
          maxRecordsReached: quotes.length >= maxExportLimit,
          filters: { query, status, dateFrom, dateTo, minPrice, maxPrice, emailStatus, bookingInterest, isSuperPackage, createdBy },
          security: {
            dataSanitized: true,
            auditLogged: true,
          }
        }
      });
    }

    // Generate CSV format
    const csvHeaders = [
      'Quote Reference',
      'Lead Name',
      'Hotel Name',
      'Customer Name',
      'Customer Email',
      'Destination',
      'People',
      'Rooms',
      'Nights',
      'Arrival Date',
      'Total Price',
      'Currency',
      'Status',
      'Super Package',
      'Transfer Included',
      'Email Sent',
      'Email Status',
      'Booking Interest',
      'Created Date',
      'Created By',
      'Version',
      'What\'s Included',
      'Activities Included',
      'Internal Notes'
    ];

    const csvRows = quotes.map(quote => [
      `Q${(quote._id as any).toString().slice(-8).toUpperCase()}`,
      quote.leadName || '',
      quote.hotelName || '',
      quote.enquiryId?.customerName || 'Unknown',
      quote.enquiryId?.customerEmail || '',
      quote.enquiryId?.destination || 'Unknown',
      quote.numberOfPeople || '',
      quote.numberOfRooms || '',
      quote.numberOfNights || '',
      quote.arrivalDate?.toISOString().split('T')[0] || '',
      quote.totalPrice || '',
      quote.currency || '',
      quote.status || '',
      quote.isSuperPackage ? 'Yes' : 'No',
      quote.transferIncluded ? 'Yes' : 'No',
      quote.emailSent ? 'Yes' : 'No',
      quote.emailDeliveryStatus || 'Not Sent',
      quote.bookingInterest?.expressed ? 'Yes' : 'No',
      quote.createdAt?.toISOString().split('T')[0] || '',
      quote.createdBy?.name || 'Unknown Admin',
      quote.version || '',
      (quote.whatsIncluded || '').replace(/"/g, '""'), // Escape quotes for CSV
      (quote.activitiesIncluded || '').replace(/"/g, '""'),
      (quote.internalNotes || '').replace(/"/g, '""')
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field}"`
            : field
        ).join(',')
      )
    ].join('\n');

    // Return CSV response with security headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="quotes-export-${new Date().toISOString().split('T')[0]}.csv"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Quote export error:', error);

    // Log failed export if we have audit context
    if (auditContext) {
      await QuoteAuditLogger.logQuoteExport(
        auditContext,
        {},
        0,
        false,
        (error as Error).message
      );
    }

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export quotes'
        }
      },
      { status: 500 }
    );
  }
}