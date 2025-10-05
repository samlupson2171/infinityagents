import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';

export interface QuoteValidationMiddlewareOptions {
  validateRelationships?: boolean;
  autoFixRelationships?: boolean;
  logValidationErrors?: boolean;
}

/**
 * Middleware to ensure quote-enquiry relationship integrity
 */
export class QuoteValidationMiddleware {
  /**
   * Validate and optionally fix quote-enquiry relationships before operations
   */
  static async validateQuoteOperation(
    request: NextRequest,
    operation: 'create' | 'update' | 'delete',
    quoteData?: any,
    quoteId?: string,
    options: QuoteValidationMiddlewareOptions = {}
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fixedIssues?: string[];
  }> {
    const {
      validateRelationships = true,
      autoFixRelationships = false,
      logValidationErrors = true
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    const fixedIssues: string[] = [];

    try {
      await connectDB();

      switch (operation) {
        case 'create':
          if (quoteData && validateRelationships) {
            const createValidation = await this.validateQuoteCreation(
              quoteData,
              autoFixRelationships
            );
            errors.push(...createValidation.errors);
            warnings.push(...createValidation.warnings);
            fixedIssues.push(...createValidation.fixedIssues);
          }
          break;

        case 'update':
          if (quoteId && validateRelationships) {
            const updateValidation = await this.validateQuoteUpdate(
              quoteId,
              quoteData,
              autoFixRelationships
            );
            errors.push(...updateValidation.errors);
            warnings.push(...updateValidation.warnings);
            fixedIssues.push(...updateValidation.fixedIssues);
          }
          break;

        case 'delete':
          if (quoteId && validateRelationships) {
            const deleteValidation = await this.validateQuoteDeletion(
              quoteId,
              autoFixRelationships
            );
            errors.push(...deleteValidation.errors);
            warnings.push(...deleteValidation.warnings);
            fixedIssues.push(...deleteValidation.fixedIssues);
          }
          break;
      }

      if (logValidationErrors && errors.length > 0) {
        console.error(`Quote validation errors for ${operation}:`, errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedIssues
      };

    } catch (error) {
      const errorMessage = `Quote validation middleware failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (logValidationErrors) {
        console.error(errorMessage);
      }
      
      return {
        isValid: false,
        errors: [errorMessage],
        warnings,
        fixedIssues
      };
    }
  }

  /**
   * Validate quote creation relationships
   */
  private static async validateQuoteCreation(
    quoteData: any,
    autoFix: boolean
  ): Promise<{
    errors: string[];
    warnings: string[];
    fixedIssues: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixedIssues: string[] = [];

    // Validate enquiry exists
    const enquiry = await Enquiry.findById(quoteData.enquiryId);
    if (!enquiry) {
      errors.push('Referenced enquiry does not exist');
      return { errors, warnings, fixedIssues };
    }

    // Check enquiry status
    if (enquiry.status === 'archived') {
      errors.push('Cannot create quotes for archived enquiries');
    }

    // Check for excessive quotes on this enquiry
    const existingQuotesCount = await Quote.countDocuments({ enquiryId: quoteData.enquiryId });
    if (existingQuotesCount >= 5) {
      errors.push('Maximum number of quotes (5) reached for this enquiry');
    } else if (existingQuotesCount >= 3) {
      warnings.push('This enquiry already has multiple quotes');
    }

    // Validate data consistency with enquiry
    if (enquiry.numberOfPeople && quoteData.numberOfPeople !== enquiry.numberOfPeople) {
      warnings.push('Quote people count differs from enquiry');
    }

    if (enquiry.departureDate && quoteData.arrivalDate) {
      const enquiryDeparture = new Date(enquiry.departureDate);
      const quoteArrival = new Date(quoteData.arrivalDate);
      const quoteDeparture = new Date(quoteArrival);
      quoteDeparture.setDate(quoteDeparture.getDate() + quoteData.numberOfNights);

      const dateDiff = Math.abs(enquiryDeparture.getTime() - quoteDeparture.getTime()) / (1000 * 3600 * 24);
      if (dateDiff > 2) {
        warnings.push('Quote dates differ significantly from enquiry dates');
      }
    }

    return { errors, warnings, fixedIssues };
  }

  /**
   * Validate quote update relationships
   */
  private static async validateQuoteUpdate(
    quoteId: string,
    updateData: any,
    autoFix: boolean
  ): Promise<{
    errors: string[];
    warnings: string[];
    fixedIssues: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixedIssues: string[] = [];

    // Validate quote exists
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      errors.push('Quote not found');
      return { errors, warnings, fixedIssues };
    }

    // Validate enquiry still exists
    const enquiry = await Enquiry.findById(quote.enquiryId);
    if (!enquiry) {
      errors.push('Quote references non-existent enquiry');
      return { errors, warnings, fixedIssues };
    }

    // Check if enquiry references this quote
    if (!enquiry.quotes || !enquiry.quotes.includes(quote._id)) {
      if (autoFix) {
        // Fix the relationship
        if (!enquiry.quotes) {
          enquiry.quotes = [];
        }
        enquiry.quotes.push(quote._id);
        enquiry.hasQuotes = true;
        enquiry.latestQuoteDate = quote.createdAt;
        await enquiry.save();
        fixedIssues.push('Fixed missing quote reference in enquiry');
      } else {
        errors.push('Enquiry does not reference this quote');
      }
    }

    // Check for significant changes that might affect relationships
    if (updateData.totalPrice && quote.totalPrice) {
      const priceChangePercent = Math.abs(
        (updateData.totalPrice - quote.totalPrice) / quote.totalPrice * 100
      );
      if (priceChangePercent > 20) {
        warnings.push('Significant price change detected - consider notifying customer');
      }
    }

    return { errors, warnings, fixedIssues };
  }

  /**
   * Validate quote deletion relationships
   */
  private static async validateQuoteDeletion(
    quoteId: string,
    autoFix: boolean
  ): Promise<{
    errors: string[];
    warnings: string[];
    fixedIssues: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixedIssues: string[] = [];

    // Validate quote exists
    const quote = await Quote.findById(quoteId);
    if (!quote) {
      errors.push('Quote not found');
      return { errors, warnings, fixedIssues };
    }

    // Check if quote has been sent
    if (quote.emailSent && quote.status === 'sent') {
      warnings.push('Deleting a quote that has been sent to customer');
    }

    // Check if this is the only quote for the enquiry
    const enquiry = await Enquiry.findById(quote.enquiryId);
    if (enquiry) {
      const otherQuotes = await Quote.countDocuments({
        enquiryId: quote.enquiryId,
        _id: { $ne: quoteId }
      });

      if (otherQuotes === 0) {
        warnings.push('This is the last quote for the enquiry');
        
        if (autoFix) {
          // Update enquiry flags
          enquiry.hasQuotes = false;
          enquiry.latestQuoteDate = undefined;
          enquiry.quotesCount = 0;
          await enquiry.save();
          fixedIssues.push('Updated enquiry flags after last quote deletion');
        }
      }

      // Remove quote reference from enquiry
      if (enquiry.quotes && enquiry.quotes.includes(quote._id)) {
        if (autoFix) {
          enquiry.quotes = enquiry.quotes.filter(id => !id.equals(quote._id));
          enquiry.quotesCount = enquiry.quotes.length;
          if (enquiry.quotes.length === 0) {
            enquiry.hasQuotes = false;
            enquiry.latestQuoteDate = undefined;
          }
          await enquiry.save();
          fixedIssues.push('Removed quote reference from enquiry');
        }
      }
    }

    return { errors, warnings, fixedIssues };
  }

  /**
   * Post-operation cleanup to ensure data consistency
   */
  static async postOperationCleanup(
    operation: 'create' | 'update' | 'delete',
    quoteId?: string,
    enquiryId?: string
  ): Promise<void> {
    try {
      await connectDB();

      if (operation === 'create' && enquiryId) {
        // Ensure enquiry has correct quote count and flags
        const enquiry = await Enquiry.findById(enquiryId);
        if (enquiry) {
          const quoteCount = await Quote.countDocuments({ enquiryId });
          enquiry.quotesCount = quoteCount;
          enquiry.hasQuotes = quoteCount > 0;
          
          if (quoteCount > 0) {
            const latestQuote = await Quote.findOne({ enquiryId })
              .sort({ createdAt: -1 });
            if (latestQuote) {
              enquiry.latestQuoteDate = latestQuote.createdAt;
            }
          }
          
          await enquiry.save();
        }
      }

      if (operation === 'delete' && enquiryId) {
        // Clean up enquiry references after deletion
        const enquiry = await Enquiry.findById(enquiryId);
        if (enquiry && quoteId) {
          enquiry.quotes = enquiry.quotes?.filter(id => !id.equals(quoteId)) || [];
          enquiry.quotesCount = enquiry.quotes.length;
          enquiry.hasQuotes = enquiry.quotes.length > 0;
          
          if (enquiry.quotes.length === 0) {
            enquiry.latestQuoteDate = undefined;
          } else {
            const latestQuote = await Quote.findOne({ enquiryId })
              .sort({ createdAt: -1 });
            if (latestQuote) {
              enquiry.latestQuoteDate = latestQuote.createdAt;
            }
          }
          
          await enquiry.save();
        }
      }

    } catch (error) {
      console.error('Post-operation cleanup failed:', error);
    }
  }
}

/**
 * Express-style middleware wrapper for Next.js API routes
 */
export function withQuoteValidation(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: QuoteValidationMiddlewareOptions = {}
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Extract operation type from request method and path
      const method = req.method;
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      
      let operation: 'create' | 'update' | 'delete' | null = null;
      let quoteId: string | undefined;
      let quoteData: any;

      if (method === 'POST' && pathSegments.includes('quotes')) {
        operation = 'create';
        try {
          quoteData = await req.json();
        } catch {
          // Request body might not be JSON
        }
      } else if (method === 'PUT' && pathSegments.includes('quotes')) {
        operation = 'update';
        quoteId = pathSegments[pathSegments.length - 1];
        try {
          quoteData = await req.json();
        } catch {
          // Request body might not be JSON
        }
      } else if (method === 'DELETE' && pathSegments.includes('quotes')) {
        operation = 'delete';
        quoteId = pathSegments[pathSegments.length - 1];
      }

      // Run validation if operation is identified
      if (operation) {
        const validationResult = await QuoteValidationMiddleware.validateQuoteOperation(
          req,
          operation,
          quoteData,
          quoteId,
          options
        );

        if (!validationResult.isValid) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Quote validation failed',
                details: validationResult.errors,
              },
              warnings: validationResult.warnings,
            },
            { status: 400 }
          );
        }

        // Log any fixed issues
        if (validationResult.fixedIssues && validationResult.fixedIssues.length > 0) {
          console.log('Quote validation auto-fixes applied:', validationResult.fixedIssues);
        }
      }

      // Call the original handler
      const response = await handler(req, ...args);

      // Post-operation cleanup if needed
      if (operation && response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          const finalQuoteId = quoteId || responseData.data?._id;
          const finalEnquiryId = quoteData?.enquiryId || responseData.data?.enquiryId;
          
          await QuoteValidationMiddleware.postOperationCleanup(
            operation,
            finalQuoteId,
            finalEnquiryId
          );
        }
      }

      return response;

    } catch (error) {
      console.error('Quote validation middleware error:', error);
      return await handler(req, ...args); // Fall back to original handler
    }
  };
}