import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { z } from 'zod';

const updateOfferSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description too long')
    .optional(),
  inclusions: z
    .array(z.string().min(1))
    .min(1, 'At least one inclusion is required')
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const updateData = updateOfferSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the offer to update
    const offer = await Offer.findById(params.id);
    if (!offer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found',
          },
        },
        { status: 404 }
      );
    }

    // Update offer fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] !== undefined) {
        (offer as any)[key] = updateData[key as keyof typeof updateData];
      }
    });

    offer.updatedAt = new Date();
    await offer.save();

    // Return updated offer with creator info
    await offer.populate('createdBy', 'name contactEmail');

    return NextResponse.json({
      success: true,
      data: offer,
    });
  } catch (error: any) {
    console.error('Error updating offer:', error);

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
          message: 'Failed to update offer',
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
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find and delete the offer
    const offer = await Offer.findByIdAndDelete(params.id);
    if (!offer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        offerId: params.id,
        message: 'Offer deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('Error deleting offer:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete offer',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find the offer
    const offer = await Offer.findById(params.id).populate(
      'createdBy',
      'name contactEmail'
    );

    if (!offer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OFFER_NOT_FOUND',
            message: 'Offer not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: offer,
    });
  } catch (error: any) {
    console.error('Error fetching offer:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch offer',
        },
      },
      { status: 500 }
    );
  }
}
