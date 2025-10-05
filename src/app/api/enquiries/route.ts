import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import {
  sendEnquiryNotificationEmail,
  sendEnquiryConfirmationEmail,
} from '@/lib/email';
import { z } from 'zod';

const createEnquirySchema = z.object({
  leadName: z
    .string()
    .min(1, 'Lead name is required')
    .max(100, 'Lead name too long'),
  tripType: z.enum(['stag', 'hen', 'other'], {
    required_error: 'Trip type is required',
  }),
  firstChoiceDestination: z
    .string()
    .min(1, 'First choice destination is required')
    .max(50, 'Destination name too long'),
  secondChoiceDestination: z
    .string()
    .max(50, 'Destination name too long')
    .optional(),
  thirdChoiceDestination: z
    .string()
    .max(50, 'Destination name too long')
    .optional(),
  resort: z.string().max(100, 'Resort name too long').optional(),
  travelDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, 'Travel date must be a valid future date'),
  departureAirport: z
    .string()
    .min(1, 'Departure airport is required')
    .max(100, 'Airport name too long'),
  numberOfNights: z
    .number()
    .int()
    .min(1, 'Number of nights must be at least 1')
    .max(30, 'Number of nights cannot exceed 30'),
  numberOfGuests: z
    .number()
    .int()
    .min(1, 'Number of guests must be at least 1')
    .max(50, 'Number of guests cannot exceed 50'),
  eventsRequested: z.array(z.string()).default([]),
  accommodationType: z.enum(['hotel', 'apartments'], {
    required_error: 'Accommodation type is required',
  }),
  boardType: z
    .string()
    .min(1, 'Board type is required')
    .max(50, 'Board type too long'),
  budgetPerPerson: z
    .number()
    .min(0, 'Budget must be a positive number')
    .max(10000, 'Budget per person cannot exceed £10,000'),
  additionalNotes: z
    .string()
    .max(1000, 'Additional notes cannot exceed 1000 characters')
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and approved
    const token = await getToken({ req: request });

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

    if (!token.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PENDING_APPROVAL',
            message: 'Account pending approval',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const enquiryData = createEnquirySchema.parse(body);

    // Connect to database
    await connectDB();

    // Create new enquiry
    const enquiry = new Enquiry({
      ...enquiryData,
      travelDate: new Date(enquiryData.travelDate),
      agentEmail: token.email,
      submittedBy: token.sub,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await enquiry.save();

    // Populate submitter info for email
    await enquiry.populate('submittedBy', 'name companyName contactEmail');

    // Send notification email to Infinity Weekends
    try {
      await sendEnquiryNotificationEmail({
        enquiryId: enquiry._id.toString(),
        leadName: enquiry.leadName,
        tripType: enquiry.tripType,
        firstChoiceDestination: enquiry.firstChoiceDestination,
        secondChoiceDestination: enquiry.secondChoiceDestination,
        thirdChoiceDestination: enquiry.thirdChoiceDestination,
        resort: enquiry.resort,
        travelDate: enquiry.travelDate,
        departureAirport: enquiry.departureAirport,
        numberOfNights: enquiry.numberOfNights,
        numberOfGuests: enquiry.numberOfGuests,
        eventsRequested: enquiry.eventsRequested,
        accommodationType: enquiry.accommodationType,
        boardType: enquiry.boardType,
        budgetPerPerson: enquiry.budgetPerPerson,
        additionalNotes: enquiry.additionalNotes,
        agentName: (enquiry.submittedBy as any)?.name || 'Unknown',
        agentCompany: (enquiry.submittedBy as any)?.companyName || 'Unknown',
        agentEmail: enquiry.agentEmail,
      });
    } catch (emailError) {
      console.error('Failed to send enquiry notification email:', emailError);
      // Don't fail the enquiry creation if email fails
    }

    // Send confirmation email to agent
    try {
      await sendEnquiryConfirmationEmail({
        enquiryId: enquiry._id.toString(),
        leadName: enquiry.leadName,
        tripType: enquiry.tripType,
        firstChoiceDestination: enquiry.firstChoiceDestination,
        secondChoiceDestination: enquiry.secondChoiceDestination,
        thirdChoiceDestination: enquiry.thirdChoiceDestination,
        resort: enquiry.resort,
        travelDate: enquiry.travelDate,
        agentName: (enquiry.submittedBy as any)?.name || 'Agent',
        agentEmail: enquiry.agentEmail,
      });
    } catch (emailError) {
      console.error('Failed to send enquiry confirmation email:', emailError);
      // Don't fail the enquiry creation if email fails
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          enquiryId: enquiry._id,
          message: 'Enquiry submitted successfully',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating enquiry:', error);

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
          message: 'Failed to submit enquiry',
        },
      },
      { status: 500 }
    );
  }
}
