import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get date ranges for filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Basic quote counts by status
    const statusCounts = await Quote.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = {
      draft: 0,
      sent: 0,
      updated: 0,
      total: 0
    };

    statusCounts.forEach(item => {
      statusStats[item._id as keyof typeof statusStats] = item.count;
      statusStats.total += item.count;
    });

    // Email delivery status counts
    const emailStats = await Quote.aggregate([
      {
        $match: { emailSent: true }
      },
      {
        $group: {
          _id: '$emailDeliveryStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const emailDeliveryStats = {
      pending: 0,
      delivered: 0,
      failed: 0,
      total: 0
    };

    emailStats.forEach(item => {
      emailDeliveryStats[item._id as keyof typeof emailDeliveryStats] = item.count;
      emailDeliveryStats.total += item.count;
    });

    // Booking interest conversion stats
    const conversionStats = await Quote.aggregate([
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          quotesWithInterest: {
            $sum: {
              $cond: [{ $eq: ['$bookingInterest.expressed', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const conversion = conversionStats[0] || { totalQuotes: 0, quotesWithInterest: 0 };
    const conversionRate = conversion.totalQuotes > 0 
      ? ((conversion.quotesWithInterest / conversion.totalQuotes) * 100).toFixed(1)
      : '0.0';

    // Recent quotes activity (last 10)
    const recentQuotes = await Quote.find()
      .populate('enquiryId', 'customerName customerEmail destination')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Time-based statistics
    const timeStats = await Quote.aggregate([
      {
        $facet: {
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $count: 'count' }
          ],
          thisWeek: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            { $count: 'count' }
          ],
          last30Days: [
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const timeCounts = {
      thisMonth: timeStats[0]?.thisMonth[0]?.count || 0,
      thisWeek: timeStats[0]?.thisWeek[0]?.count || 0,
      last30Days: timeStats[0]?.last30Days[0]?.count || 0
    };

    // Average quote value
    const valueStats = await Quote.aggregate([
      {
        $group: {
          _id: null,
          averageValue: { $avg: '$totalPrice' },
          totalValue: { $sum: '$totalPrice' },
          minValue: { $min: '$totalPrice' },
          maxValue: { $max: '$totalPrice' }
        }
      }
    ]);

    const quoteValues = valueStats[0] || {
      averageValue: 0,
      totalValue: 0,
      minValue: 0,
      maxValue: 0
    };

    // Quote distribution by super package
    const packageStats = await Quote.aggregate([
      {
        $group: {
          _id: '$isSuperPackage',
          count: { $sum: 1 },
          averageValue: { $avg: '$totalPrice' }
        }
      }
    ]);

    const packageDistribution = {
      superPackages: 0,
      regularPackages: 0,
      superPackageAvgValue: 0,
      regularPackageAvgValue: 0
    };

    packageStats.forEach(item => {
      if (item._id) {
        packageDistribution.superPackages = item.count;
        packageDistribution.superPackageAvgValue = item.averageValue;
      } else {
        packageDistribution.regularPackages = item.count;
        packageDistribution.regularPackageAvgValue = item.averageValue;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        statusStats,
        emailDeliveryStats,
        conversionStats: {
          totalQuotes: conversion.totalQuotes,
          quotesWithInterest: conversion.quotesWithInterest,
          conversionRate: parseFloat(conversionRate)
        },
        timeCounts,
        quoteValues: {
          average: Math.round(quoteValues.averageValue || 0),
          total: quoteValues.totalValue || 0,
          min: quoteValues.minValue || 0,
          max: quoteValues.maxValue || 0
        },
        packageDistribution,
        recentActivity: recentQuotes.map(quote => ({
          id: quote._id,
          quoteReference: `Q${quote._id.toString().slice(-8).toUpperCase()}`,
          leadName: quote.leadName,
          customerName: quote.enquiryId?.customerName || 'Unknown',
          destination: quote.enquiryId?.destination || 'Unknown',
          totalPrice: quote.totalPrice,
          currency: quote.currency,
          status: quote.status,
          createdAt: quote.createdAt,
          createdBy: quote.createdBy?.name || 'Unknown Admin',
          emailSent: quote.emailSent,
          bookingInterest: quote.bookingInterest?.expressed || false
        }))
      }
    });

  } catch (error) {
    console.error('Quote stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quote statistics' },
      { status: 500 }
    );
  }
}