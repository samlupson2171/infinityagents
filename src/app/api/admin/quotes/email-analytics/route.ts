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

    // Aggregate email statistics
    const emailStats = await Quote.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          emailsSent: { $sum: { $cond: ['$emailSent', 1, 0] } },
          emailsDelivered: { 
            $sum: { 
              $cond: [{ $eq: ['$emailDeliveryStatus', 'delivered'] }, 1, 0] 
            } 
          },
          emailsFailed: { 
            $sum: { 
              $cond: [{ $eq: ['$emailDeliveryStatus', 'failed'] }, 1, 0] 
            } 
          },
          emailsPending: { 
            $sum: { 
              $cond: [{ $eq: ['$emailDeliveryStatus', 'pending'] }, 1, 0] 
            } 
          },
        },
      },
    ]);

    // Get email delivery status breakdown
    const deliveryStatusBreakdown = await Quote.aggregate([
      { $match: { ...dateFilter, emailSent: true } },
      {
        $group: {
          _id: '$emailDeliveryStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get quote status breakdown for emailed quotes
    const quoteStatusBreakdown = await Quote.aggregate([
      { $match: { ...dateFilter, emailSent: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get daily email sending trends
    const dailyTrends = await Quote.aggregate([
      { $match: { ...dateFilter, emailSent: true } },
      {
        $group: {
          _id: {
            year: { $year: '$emailSentAt' },
            month: { $month: '$emailSentAt' },
            day: { $dayOfMonth: '$emailSentAt' },
          },
          emailsSent: { $sum: 1 },
          delivered: { 
            $sum: { 
              $cond: [{ $eq: ['$emailDeliveryStatus', 'delivered'] }, 1, 0] 
            } 
          },
          failed: { 
            $sum: { 
              $cond: [{ $eq: ['$emailDeliveryStatus', 'failed'] }, 1, 0] 
            } 
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Get recent failed emails for monitoring
    const recentFailures = await Quote.find({
      ...dateFilter,
      emailDeliveryStatus: 'failed',
    })
      .select('_id quoteReference leadName emailSentAt emailMessageId')
      .populate('enquiryId', 'agentEmail')
      .sort({ emailSentAt: -1 })
      .limit(10);

    // Calculate success rate
    const stats = emailStats[0] || {
      totalQuotes: 0,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsFailed: 0,
      emailsPending: 0,
    };

    const successRate = stats.emailsSent > 0 
      ? ((stats.emailsDelivered / stats.emailsSent) * 100).toFixed(2)
      : '0.00';

    const failureRate = stats.emailsSent > 0 
      ? ((stats.emailsFailed / stats.emailsSent) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...stats,
          successRate: parseFloat(successRate),
          failureRate: parseFloat(failureRate),
          emailCoverage: stats.totalQuotes > 0 
            ? ((stats.emailsSent / stats.totalQuotes) * 100).toFixed(2)
            : '0.00',
        },
        breakdowns: {
          deliveryStatus: deliveryStatusBreakdown,
          quoteStatus: quoteStatusBreakdown,
        },
        trends: {
          daily: dailyTrends,
        },
        recentFailures,
        period: {
          startDate: startDate || daysAgo.toISOString(),
          endDate: endDate || new Date().toISOString(),
          days: parseInt(period),
        },
      },
    });

  } catch (error: any) {
    console.error('Error fetching email analytics:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email analytics',
        },
      },
      { status: 500 }
    );
  }
}