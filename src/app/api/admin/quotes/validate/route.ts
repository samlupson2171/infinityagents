import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { QuoteServerValidator } from '@/lib/validation/quote-server-validation';
import { quoteValidationHelpers } from '@/lib/validation/quote-validation';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const user = await requireAdmin(request);

    // Parse request body
    const { field, value, enquiryId } = await request.json();

    if (!field || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Field and value are required',
          },
        },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Field-specific validation
    switch (field) {
      case 'leadName':
        if (typeof value === 'string') {
          if (value.length < 2) {
            errors.push('Lead name must be at least 2 characters');
          }
          if (quoteValidationHelpers.containsHarmfulContent(value)) {
            errors.push('Lead name contains invalid characters');
          }
        }
        break;

      case 'arrivalDate':
        if (typeof value === 'string') {
          if (!quoteValidationHelpers.isValidArrivalDate(value)) {
            errors.push('Arrival date must be between 1 and 365 days from today');
          }
          
          const arrivalDate = new Date(value);
          const today = new Date();
          const daysDifference = Math.ceil((arrivalDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          if (daysDifference < 7 && daysDifference > 0) {
            warnings.push('Short notice booking - less than 7 days advance notice');
          } else if (daysDifference > 365) {
            warnings.push('Long advance booking - more than 1 year in advance');
          }
        }
        break;

      case 'totalPrice':
        if (typeof value === 'number') {
          if (value < 0) {
            errors.push('Total price cannot be negative');
          } else if (value === 0) {
            warnings.push('Total price is zero - please verify this is correct');
          } else if (value < 50) {
            warnings.push('Total price seems very low - please verify');
          } else if (value > 50000) {
            warnings.push('Total price seems very high - please verify');
          }
        }
        break;

      case 'enquiryId':
        if (typeof value === 'string') {
          await connectDB();
          const enquiry = await Enquiry.findById(value);
          if (!enquiry) {
            errors.push('Referenced enquiry not found');
          } else if (enquiry.status === 'archived') {
            errors.push('Cannot create quotes for archived enquiries');
          }
        }
        break;

      default:
        // Generic validation for other fields
        if (typeof value === 'string' && quoteValidationHelpers.containsHarmfulContent(value)) {
          errors.push('Field contains invalid content');
        }
    }

    return NextResponse.json({
      success: true,
      isValid: errors.length === 0,
      errors,
      warnings,
    });

  } catch (error: any) {
    console.error('Validation error:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation failed',
        },
      },
      { status: 500 }
    );
  }
}