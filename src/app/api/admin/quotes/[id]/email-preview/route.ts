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

    // Find the quote with populated data
    const quote = await Quote.findById(params.id)
      .populate([
        { 
          path: 'enquiryId', 
          select: 'leadName agentEmail submittedBy',
          populate: {
            path: 'submittedBy',
            select: 'name companyName contactEmail'
          }
        },
        { path: 'createdBy', select: 'name email' }
      ]);

    if (!quote) {
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

    // Generate email preview HTML (simplified version of the email template)
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const previewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Preview - ${quote.quoteReference}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; background-color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
          .quote-header { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; text-align: center; }
          .section { background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
          .price-section { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; text-align: center; }
          .cta-section { text-align: center; }
          .cta-button { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; }
          .footer { background-color: #343a40; color: white; padding: 25px; border-radius: 12px; text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px 0; }
          .preview-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="preview-notice">
            <strong>📧 Email Preview</strong> - This is how the quote email will appear to the recipient
          </div>
          
          <div class="header">
            <img src="${process.env.NEXTAUTH_URL || 'http://localhost:3004'}/infinity-weekends-logo.png" 
                 alt="Infinity Weekends Logo" 
                 style="max-width: 300px; height: auto; margin-bottom: 15px;" />
            <h1 style="color: #007bff; margin: 0; font-size: 36px;">Infinity Weekends</h1>
            <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 16px;">Your Perfect Weekend Getaway Awaits</p>
          </div>

          <div class="quote-header">
            <h2 style="margin: 0 0 10px 0; font-size: 28px;">Your Personalized Quote</h2>
            <p style="margin: 0; font-size: 18px;">Quote Reference: <strong>${quote.quoteReference}</strong></p>
            ${quote.version > 1 ? `<p style="margin: 10px 0 0 0; font-size: 14px;">Version ${quote.version} - Updated Quote</p>` : ''}
          </div>

          <div class="section">
            <h3 style="color: #333; margin-top: 0;">Dear ${quote.leadName},</h3>
            <p>Thank you for your interest in Infinity Weekends! We're excited to present you with a tailored quote for your upcoming getaway.</p>
          </div>

          <div class="section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #007bff; padding-bottom: 10px;">🏨 Your Trip Summary</h3>
            <table>
              <tr>
                <td style="font-weight: bold; width: 140px;">Hotel:</td>
                <td>${quote.hotelName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Arrival Date:</td>
                <td>${formatDate(quote.arrivalDate)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Duration:</td>
                <td>${quote.numberOfNights} night${quote.numberOfNights !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Group Size:</td>
                <td>${quote.numberOfPeople} people</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Rooms:</td>
                <td>${quote.numberOfRooms} room${quote.numberOfRooms !== 1 ? 's' : ''}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h3 style="color: #333; margin-top: 0; border-bottom: 2px solid #28a745; padding-bottom: 10px;">✅ What's Included</h3>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 0; white-space: pre-wrap;">${quote.whatsIncluded}</p>
            </div>
            
            <div style="margin-top: 15px;">
              ${quote.transferIncluded ? '<span style="background-color: #d4edda; color: #155724; padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-right: 10px;">🚐 Transfer Included</span>' : ''}
              ${quote.isSuperPackage ? '<span style="background-color: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; font-size: 14px;">⭐ Super Package</span>' : ''}
            </div>

            ${quote.activitiesIncluded ? `
            <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
              <h4 style="margin: 0 0 10px 0; color: #0056b3;">🎯 Activities & Experiences</h4>
              <p style="margin: 0;">${quote.activitiesIncluded}</p>
            </div>
            ` : ''}
          </div>

          <div class="price-section">
            <h3 style="margin: 0 0 15px 0; font-size: 24px;">💰 Total Package Price</h3>
            <div style="font-size: 48px; font-weight: bold; margin: 20px 0;">${quote.formattedPrice}</div>
            <div style="font-size: 18px; margin-bottom: 15px;">
              ${(quote.totalPrice / quote.numberOfPeople).toLocaleString('en-GB', {
                style: 'currency',
                currency: quote.currency
              })} per person
            </div>
            <p style="margin: 0; font-size: 14px;">
              Based on ${quote.numberOfPeople} people sharing ${quote.numberOfRooms} room${quote.numberOfRooms !== 1 ? 's' : ''}
            </p>
          </div>

          <div class="section cta-section">
            <h3 style="color: #333; margin-top: 0;">Ready to Book Your Adventure?</h3>
            <p>This quote is valid for 7 days. Don't miss out on this amazing opportunity!</p>
            <a href="#" class="cta-button">🎉 I'd Like to Book This!</a>
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6c757d;">
              Click the button above to express your interest and start the booking process
            </p>
          </div>

          <div class="section">
            <h3 style="color: #333; margin-top: 0;">📞 Contact Information</h3>
            <p><strong>📧 Email:</strong> info@infinityweekends.co.uk</p>
            ${quote.enquiryId.submittedBy?.name ? `<p><strong>Your Agent:</strong> ${quote.enquiryId.submittedBy.name}</p>` : ''}
            <p><strong>Agent Email:</strong> ${quote.enquiryId.agentEmail}</p>
          </div>

          <div class="footer">
            <h3 style="margin: 0 0 15px 0;">Thank You for Choosing Infinity Weekends!</h3>
            <p style="margin: 0; font-size: 14px;">We can't wait to help you create memories that will last a lifetime.</p>
            <div style="border-top: 1px solid #495057; padding-top: 15px; margin-top: 15px;">
              <p style="margin: 5px 0; font-size: 12px;">© ${new Date().getFullYear()} Infinity Weekends. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('Error generating email preview:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate email preview',
        },
      },
      { status: 500 }
    );
  }
}