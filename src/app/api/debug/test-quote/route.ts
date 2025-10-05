import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG: Starting quote creation test ===');
    
    // Step 1: Test auth
    console.log('Step 1: Testing auth...');
    const user = await requireAdmin(request);
    console.log('Auth successful. User:', {
      id: user.id,
      sub: user.sub,
      email: user.email,
      role: user.role
    });

    // Step 2: Test database connection
    console.log('Step 2: Testing database connection...');
    await connectDB();
    console.log('Database connected successfully');

    // Step 3: Test request parsing
    console.log('Step 3: Testing request parsing...');
    const body = await request.json();
    console.log('Request body parsed:', body);

    // Step 4: Test enquiry lookup
    console.log('Step 4: Testing enquiry lookup...');
    const enquiryId = body.enquiryId;
    if (!enquiryId) {
      throw new Error('No enquiryId provided');
    }
    
    const enquiry = await Enquiry.findById(enquiryId);
    console.log('Enquiry found:', enquiry ? 'Yes' : 'No');
    if (!enquiry) {
      throw new Error('Enquiry not found');
    }

    // Step 5: Test quote creation
    console.log('Step 5: Testing quote creation...');
    const quoteData = {
      enquiryId: enquiryId,
      leadName: body.leadName || 'Test Lead',
      hotelName: body.hotelName || 'Test Hotel',
      numberOfPeople: body.numberOfPeople || 2,
      numberOfRooms: body.numberOfRooms || 1,
      numberOfNights: body.numberOfNights || 3,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isSuperPackage: body.isSuperPackage || false,
      whatsIncluded: body.whatsIncluded || 'Test package',
      transferIncluded: body.transferIncluded || false,
      activitiesIncluded: body.activitiesIncluded || '',
      totalPrice: body.totalPrice || 1000,
      currency: body.currency || 'GBP',
      internalNotes: body.internalNotes || '',
      createdBy: user.sub || user.id,
      status: 'draft' as const,
    };

    console.log('Quote data prepared:', quoteData);

    const quote = new Quote(quoteData);
    await quote.save();
    console.log('Quote saved successfully:', quote._id);

    // Step 6: Test enquiry update
    console.log('Step 6: Testing enquiry update...');
    await enquiry.addQuote(quote._id);
    console.log('Enquiry updated successfully');

    console.log('=== DEBUG: All steps completed successfully ===');

    return NextResponse.json({
      success: true,
      message: 'Debug test completed successfully',
      data: {
        quoteId: quote._id,
        enquiryId: enquiry._id,
        userId: user.sub || user.id
      }
    });

  } catch (error: any) {
    console.error('=== DEBUG: Error occurred ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);

    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        details: error
      }
    }, { status: 500 });
  }
}