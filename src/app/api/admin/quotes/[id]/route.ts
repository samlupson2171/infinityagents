import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteAdmin } from '@/lib/middleware/quote-auth-middleware';
import { QuoteAuditLogger } from '@/lib/audit/quote-audit-logger';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import { z } from 'zod';
import { 
  quoteUpdateValidationSchema,
  QuoteUpdateData 
} from '@/lib/validation/quote-validation';
import { QuoteServerValidator } from '@/lib/validation/quote-server-validation';

// Use the enhanced validation schema
const updateQuoteSchema = quoteUpdateValidationSchema;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auditContext;
  
  try {
    // Verify admin authorization with quote permissions
    const { user, auditContext: audit } = await requireQuoteAdmin(request);
    auditContext = audit;

    // Connect to database
    await connectDB();

    // Find the quote
    const quote = await Quote.findById(params.id).populate([
      { path: 'enquiryId', select: 'leadName agentEmail resort departureDate' },
      { path: 'createdBy', select: 'name email' }
    ]);

    if (!quote) {
      await QuoteAuditLogger.logQuoteView(
        auditContext,
        params.id,
        false,
        'Quote not found'
      );

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

    // Log successful quote view
    await QuoteAuditLogger.logQuoteView(
      auditContext,
      params.id,
      true
    );

    return NextResponse.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    console.error('Error fetching quote:', error);

    // Log failed quote view if we have audit context
    if (auditContext) {
      await QuoteAuditLogger.logQuoteView(
        auditContext,
        params.id,
        false,
        error.message
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
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch quote',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auditContext;
  let originalQuoteData: any = {};
  
  try {
    // Verify admin authorization with quote permissions
    const { user, auditContext: audit } = await requireQuoteAdmin(request);
    auditContext = audit;

    // Parse and validate request body
    const body = await request.json();
    const updateData = updateQuoteSchema.parse(body);

    // Connect to database
    await connectDB();

    // Comprehensive server-side validation for updates
    const validationResult = await QuoteServerValidator.validateQuoteUpdate(
      params.id,
      updateData,
      user.id
    );

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quote update validation failed',
            details: validationResult.errors,
          },
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    const quote = validationResult.data?.existingQuote;

    // Store original data for audit logging
    originalQuoteData = {
      leadName: quote.leadName,
      hotelName: quote.hotelName,
      totalPrice: quote.totalPrice,
      status: quote.status,
      version: quote.version,
    };

    // Store original version for version history
    const originalVersion = quote.version;

    // Update quote fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        if (key === 'arrivalDate') {
          quote[key] = new Date(updateData[key] as string);
        } else {
          (quote as any)[key] = updateData[key as keyof typeof updateData];
        }
      }
    });

    // Increment version if this is a significant update
    const significantFields = ['totalPrice', 'whatsIncluded', 'hotelName', 'arrivalDate'];
    const hasSignificantChanges = significantFields.some(field => 
      updateData[field as keyof typeof updateData] !== undefined
    );

    if (hasSignificantChanges) {
      quote.version = originalVersion + 1;
      // Update status to 'updated' if it was previously 'sent'
      if (quote.status === 'sent') {
        quote.status = 'updated';
      }
    }

    quote.updatedAt = new Date();
    await quote.save();

    // Log successful quote update
    await QuoteAuditLogger.logQuoteUpdate(
      auditContext,
      params.id,
      {
        originalData: originalQuoteData,
        updatedFields: updateData,
        versionChanged: hasSignificantChanges,
        newVersion: quote.version,
      },
      true
    );

    // Return updated quote with populated fields
    await quote.populate([
      { path: 'enquiryId', select: 'leadName agentEmail resort departureDate' },
      { path: 'createdBy', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      data: quote,
    });
  } catch (error: any) {
    console.error('Error updating quote:', error);

    // Log failed quote update if we have audit context
    if (auditContext) {
      await QuoteAuditLogger.logQuoteUpdate(
        auditContext,
        params.id,
        {
          originalData: originalQuoteData,
          attemptedChanges: 'unknown',
        },
        false,
        error.message
      );
    }

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
          message: 'Failed to update quote',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let auditContext;
  
  try {
    // Verify admin authorization with quote permissions
    const { user, auditContext: audit } = await requireQuoteAdmin(request);
    auditContext = audit;

    // Connect to database
    await connectDB();

    // Find the quote to delete
    const quote = await Quote.findById(params.id);
    if (!quote) {
      await QuoteAuditLogger.logQuoteDeletion(
        auditContext,
        params.id,
        false,
        'Quote not found'
      );

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

    // Store quote info for audit log before deletion
    const quoteInfo = {
      leadName: quote.leadName,
      hotelName: quote.hotelName,
      enquiryId: quote.enquiryId.toString(),
    };

    // Soft delete by marking as deleted (you could also hard delete)
    await Quote.findByIdAndDelete(params.id);

    // TODO: Remove quote reference from enquiry
    // This would be handled in a more complete implementation

    // Log successful quote deletion
    await QuoteAuditLogger.logAction(auditContext, {
      action: 'DELETE_QUOTE',
      resource: 'quote',
      resourceId: params.id,
      details: {
        deletedQuote: quoteInfo,
        operation: 'delete',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting quote:', error);

    // Log failed quote deletion if we have audit context
    if (auditContext) {
      await QuoteAuditLogger.logQuoteDeletion(
        auditContext,
        params.id,
        false,
        error.message
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
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete quote',
        },
      },
      { status: 500 }
    );
  }
}