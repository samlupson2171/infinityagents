import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { QuoteDataConsistencyValidator } from '@/lib/validation/quote-server-validation';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';

    switch (action) {
      case 'check':
        // Check for data consistency issues
        const issues = await QuoteDataConsistencyValidator.findOrphanedQuotes();
        
        return NextResponse.json({
          success: true,
          data: {
            orphanedQuotes: issues.orphanedQuotes.length,
            inconsistentRelationships: issues.inconsistentRelationships.length,
            details: {
              orphanedQuotes: issues.orphanedQuotes.map(quote => ({
                id: quote._id,
                leadName: quote.leadName,
                createdAt: quote.createdAt,
                issue: 'No associated enquiry found'
              })),
              inconsistentRelationships: issues.inconsistentRelationships
            }
          }
        });

      case 'cleanup':
        // Fix data consistency issues
        const cleanupResult = await QuoteDataConsistencyValidator.cleanupOrphanedData();
        
        return NextResponse.json({
          success: true,
          data: {
            deletedQuotes: cleanupResult.deletedQuotes,
            fixedRelationships: cleanupResult.fixedRelationships,
            errors: cleanupResult.errors
          }
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action. Use "check" or "cleanup"',
            },
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Data consistency check error:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check data consistency',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Parse request body
    const { quoteId } = await request.json();

    if (!quoteId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quote ID is required',
          },
        },
        { status: 400 }
      );
    }

    // Validate specific quote-enquiry relationship
    const validationResult = await QuoteDataConsistencyValidator.validateQuoteEnquiryRelationship(quoteId);

    return NextResponse.json({
      success: true,
      data: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      }
    });

  } catch (error: any) {
    console.error('Quote relationship validation error:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate quote relationship',
        },
      },
      { status: 500 }
    );
  }
}