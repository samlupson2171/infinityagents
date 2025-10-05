import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { z } from 'zod';

const updateEnquirySchema = z.object({
  status: z.enum(['new', 'in-progress', 'completed']).optional(),
  notes: z.string().optional(),
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
    const updateData = updateEnquirySchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the enquiry to update
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

    // Update enquiry fields
    if (updateData.status !== undefined) {
      enquiry.status = updateData.status;
    }

    if (updateData.notes !== undefined) {
      enquiry.notes = updateData.notes;
    }

    enquiry.updatedAt = new Date();
    await enquiry.save();

    // Return updated enquiry with populated fields
    await enquiry.populate([
      { path: 'submittedBy', select: 'name companyName contactEmail' },
      {
        path: 'quotes',
        select: 'status totalPrice currency createdAt version leadName hotelName',
        populate: {
          path: 'createdBy',
          select: 'name email'
        },
        options: { sort: { createdAt: -1 } }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: enquiry,
    });
  } catch (error: any) {
    console.error('Error updating enquiry:', error);

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
          message: 'Failed to update enquiry',
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

    // Find the enquiry
    const enquiry = await Enquiry.findById(params.id)
      .populate('submittedBy', 'name companyName contactEmail')
      .populate({
        path: 'quotes',
        select: 'status totalPrice currency createdAt version leadName hotelName',
        populate: {
          path: 'createdBy',
          select: 'name email'
        },
        options: { sort: { createdAt: -1 } }
      });

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

    return NextResponse.json({
      success: true,
      data: enquiry,
    });
  } catch (error: any) {
    console.error('Error fetching enquiry:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch enquiry',
        },
      },
      { status: 500 }
    );
  }
}
