import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find all versions of this quote (by enquiryId)
    const currentQuote = await Quote.findById(params.id).select('enquiryId');
    
    if (!currentQuote) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTE_NOT_FOUND',
            message: 'Quote not found',
          },
        },
        { status: 404 }
      );
    }

    // Get all quotes for this enquiry (version history)
    const versionHistory = await Quote.find({ 
      enquiryId: currentQuote.enquiryId 
    })
      .populate('createdBy', 'name email')
      .sort({ version: -1, createdAt: -1 })
      .select('-__v');

    // Calculate changes between versions
    const versionsWithChanges = versionHistory.map((quote, index) => {
      const nextVersion = versionHistory[index + 1];
      let changes: string[] = [];

      if (nextVersion) {
        // Compare key fields to identify changes
        if (quote.totalPrice !== nextVersion.totalPrice) {
          changes.push(`Price changed from ${nextVersion.formattedPrice} to ${quote.formattedPrice}`);
        }
        if (quote.hotelName !== nextVersion.hotelName) {
          changes.push(`Hotel changed from "${nextVersion.hotelName}" to "${quote.hotelName}"`);
        }
        if (quote.numberOfPeople !== nextVersion.numberOfPeople) {
          changes.push(`Number of people changed from ${nextVersion.numberOfPeople} to ${quote.numberOfPeople}`);
        }
        if (quote.numberOfRooms !== nextVersion.numberOfRooms) {
          changes.push(`Number of rooms changed from ${nextVersion.numberOfRooms} to ${quote.numberOfRooms}`);
        }
        if (quote.numberOfNights !== nextVersion.numberOfNights) {
          changes.push(`Number of nights changed from ${nextVersion.numberOfNights} to ${quote.numberOfNights}`);
        }
        if (new Date(quote.arrivalDate).getTime() !== new Date(nextVersion.arrivalDate).getTime()) {
          changes.push(`Arrival date changed from ${new Date(nextVersion.arrivalDate).toLocaleDateString()} to ${new Date(quote.arrivalDate).toLocaleDateString()}`);
        }
        if (quote.whatsIncluded !== nextVersion.whatsIncluded) {
          changes.push('Package inclusions updated');
        }
        if (quote.transferIncluded !== nextVersion.transferIncluded) {
          changes.push(`Transfer ${quote.transferIncluded ? 'added' : 'removed'}`);
        }
        if (quote.isSuperPackage !== nextVersion.isSuperPackage) {
          changes.push(`${quote.isSuperPackage ? 'Upgraded to' : 'Downgraded from'} Super Package`);
        }
      }

      return {
        ...quote.toObject(),
        changes: changes.length > 0 ? changes : (index === versionHistory.length - 1 ? ['Initial quote created'] : ['Minor updates']),
        isCurrentVersion: quote._id.toString() === params.id,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        currentQuoteId: params.id,
        enquiryId: currentQuote.enquiryId,
        totalVersions: versionHistory.length,
        versions: versionsWithChanges,
      },
    });

  } catch (error: any) {
    console.error('Error fetching quote version history:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quote version history',
        },
      },
      { status: 500 }
    );
  }
}