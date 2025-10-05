import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || '30'; // Default to last 30 days

    // Build date filter
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to last N days
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      dateFilter.createdAt = { $gte: daysAgo };
    }

    // Aggregate booking conversion statistics
    const conversionStats = await Quote.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          quotesWithBookingInterest: { 
            $sum: { 
              $cond: ['$bookingInterest.expressed', 1, 0] 
            } 
          },
          emailsSent: { $sum: { $cond: ['$emailSent', 1, 0] } },
          totalQuoteValue: { $sum: '$totalPrice' },
          interestedQuoteValue: { 
            $sum: { 
              $cond: ['$bookingInterest.expressed', '$totalPrice', 0] 
            } 
          },
        },
      },
    ]);

    // Get booking urgency breakdown
    const urgencyBreakdown = await Quote.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          'bookingInterest.expressed': true 
        } 
      },
      {
        $group: {
          _id: '$bookingInterest.bookingUrgency',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get conversion trends by day
    const dailyConversions = await Quote.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          quotesCreated: { $sum: 1 },
          bookingInterests: { 
            $sum: { 
              $cond: ['$bookingInterest.expressed', 1, 0] 
            } 
          },
          totalValue: { $sum: '$totalPrice' },
          interestedValue: { 
            $sum: { 
              $cond: ['$bookingInterest.expressed', '$totalPrice', 0] 
            } 
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Get recent booking interests
    const recentBookingInterests = await Quote.find({
      ...dateFilter,
      'bookingInterest.expressed': true,
    })
      .select('_id quoteReference leadName totalPrice currency bookingInterest createdAt')
      .populate('enquiryId', 'agentEmail')
      .sort({ 'bookingInterest.expressedAt': -1 })
      .limit(10);

    // Get quote status breakdown for quotes with booking interest
    const statusBreakdown = await Quote.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          'bookingInterest.expressed': true 
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' },
        },
      },
    ]);

    // Get conversion by price range
    const priceRangeConversion = await Quote.aggregate([
      { $match: dateFilter },
      {
        $bucket: {
          groupBy: '$totalPrice',
          boundaries: [0, 500, 1000, 2000, 5000, 10000, Infinity],
          default: 'Other',
          output: {
            totalQuotes: { $sum: 1 },
            bookingInterests: { 
              $sum: { 
                $cond: ['$bookingInterest.expressed', 1, 0] 
              } 
            },
            averagePrice: { $avg: '$totalPrice' },
          },
        },
      },
    ]);

    // Calculate conversion metrics
    const stats = conversionStats[0] || {
      totalQuotes: 0,
      quotesWithBookingInterest: 0,
      emailsSent: 0,
      totalQuoteValue: 0,
      interestedQuoteValue: 0,
    };

    const conversionRate = stats.totalQuotes > 0 
      ? ((stats.quotesWithBookingInterest / stats.totalQuotes) * 100).toFixed(2)
      : '0.00';

    const emailConversionRate = stats.emailsSent > 0 
      ? ((stats.quotesWithBookingInterest / stats.emailsSent) * 100).toFixed(2)
      : '0.00';

    const averageQuoteValue = stats.totalQuotes > 0 
      ? (stats.totalQuoteValue / stats.totalQuotes).toFixed(2)
      : '0.00';

    const averageInterestedQuoteValue = stats.quotesWithBookingInterest > 0 
      ? (stats.interestedQuoteValue / stats.quotesWithBookingInterest).toFixed(2)
      : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...stats,
          conversionRate: parseFloat(conversionRate),
          emailConversionRate: parseFloat(emailConversionRate),
          averageQuoteValue: parseFloat(averageQuoteValue),
          averageInterestedQuoteValue: parseFloat(averageInterestedQuoteValue),
          potentialRevenue: stats.interestedQuoteValue,
        },
        breakdowns: {
          urgency: urgencyBreakdown,
          status: statusBreakdown,
          priceRange: priceRangeConversion,
        },
        trends: {
          daily: dailyConversions,
        },
        recentBookingInterests,
        period: {
          startDate: startDate || new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString(),
          days: parseInt(period),
        },
      },
    });

  } catch (error: any) {
    console.error('Error fetching booking analytics:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch booking analytics',
        },
      },
      { status: 500 }
    );
  }
}