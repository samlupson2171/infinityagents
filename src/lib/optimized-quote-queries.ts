import mongoose from 'mongoose';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import { QuoteDatabaseOptimizer } from './quote-database-optimization';

/**
 * Optimized query utilities for the quote system
 * Uses database optimization and caching for improved performance
 */

export interface QuoteQueryFilters {
  status?: string[];
  emailDeliveryStatus?: string[];
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  hasBookingInterest?: boolean;
  searchTerm?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class OptimizedQuoteQueries {
  /**
   * Get quotes with advanced filtering and pagination
   */
  static async getQuotes(
    filters: QuoteQueryFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<{
    quotes: any[];
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const query: any = {};
    
    // Build query filters
    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }
    
    if (filters.emailDeliveryStatus && filters.emailDeliveryStatus.length > 0) {
      query.emailDeliveryStatus = { $in: filters.emailDeliveryStatus };
    }
    
    if (filters.createdBy) {
      query.createdBy = new mongoose.Types.ObjectId(filters.createdBy);
    }
    
    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }
    
    if (filters.priceRange) {
      query.totalPrice = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max
      };
    }
    
    if (filters.hasBookingInterest !== undefined) {
      query['bookingInterest.expressed'] = filters.hasBookingInterest;
    }
    
    // Add text search if provided
    if (filters.searchTerm) {
      query.$text = { $search: filters.searchTerm };
    }

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.limit;
    
    // Build sort options
    const sortOptions: any = {};
    if (filters.searchTerm) {
      sortOptions.score = { $meta: 'textScore' };
    }
    
    const sortField = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortOrder;

    // Try to get from cache first
    const cacheKey = JSON.stringify({ query, skip, limit: pagination.limit, sort: sortOptions });
    const cached = QuoteDatabaseOptimizer.getCachedResult('quotes_paginated', { cacheKey }, {});
    
    if (cached) {
      return cached;
    }

    // Execute queries in parallel
    const [quotes, total] = await Promise.all([
      Quote.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pagination.limit)
        .populate('createdBy', 'name email')
        .populate('enquiryId', 'leadName agentEmail firstChoiceDestination')
        .lean(),
      Quote.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    const result = {
      quotes,
      total,
      page: pagination.page,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    };

    // Cache the result
    QuoteDatabaseOptimizer.setCachedResult(
      'quotes_paginated', 
      { cacheKey }, 
      {}, 
      result, 
      2 * 60 * 1000 // 2 minutes
    );

    return result;
  }

  /**
   * Get quote statistics with caching
   */
  static async getQuoteStatistics(): Promise<any> {
    return QuoteDatabaseOptimizer.getQuoteStatistics(true);
  }

  /**
   * Get quotes by enquiry with version history
   */
  static async getQuotesByEnquiry(enquiryId: string): Promise<any[]> {
    return QuoteDatabaseOptimizer.findQuotesByEnquiry(enquiryId, true);
  }

  /**
   * Get recent quotes with optimized query
   */
  static async getRecentQuotes(days: number = 7, limit: number = 10): Promise<any[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const query = { createdAt: { $gte: cutoffDate } };
    const options = { sort: { createdAt: -1 }, limit };

    const cached = QuoteDatabaseOptimizer.getCachedResult('recent_quotes', query, options);
    if (cached) return cached;

    const quotes = await Quote.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('enquiryId', 'leadName agentEmail')
      .lean();

    QuoteDatabaseOptimizer.setCachedResult(
      'recent_quotes', 
      query, 
      options, 
      quotes, 
      5 * 60 * 1000 // 5 minutes
    );

    return quotes;
  }

  /**
   * Get quotes requiring attention (failed emails, drafts, etc.)
   */
  static async getQuotesRequiringAttention(): Promise<{
    failedEmails: any[];
    oldDrafts: any[];
    pendingBookingInterest: any[];
  }> {
    const cached = QuoteDatabaseOptimizer.getCachedResult('attention_quotes', {}, {});
    if (cached) return cached;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [failedEmails, oldDrafts, pendingBookingInterest] = await Promise.all([
      // Quotes with failed email delivery
      Quote.find({ emailDeliveryStatus: 'failed' })
        .sort({ emailSentAt: -1 })
        .limit(10)
        .populate('createdBy', 'name email')
        .populate('enquiryId', 'leadName agentEmail')
        .lean(),
      
      // Draft quotes older than 7 days
      Quote.find({ 
        status: 'draft',
        createdAt: { $lt: sevenDaysAgo }
      })
        .sort({ createdAt: 1 })
        .limit(10)
        .populate('createdBy', 'name email')
        .populate('enquiryId', 'leadName agentEmail')
        .lean(),
      
      // Quotes with booking interest but no follow-up
      Quote.find({ 
        'bookingInterest.expressed': true,
        'bookingInterest.expressedAt': { $lt: sevenDaysAgo }
      })
        .sort({ 'bookingInterest.expressedAt': 1 })
        .limit(10)
        .populate('createdBy', 'name email')
        .populate('enquiryId', 'leadName agentEmail')
        .lean()
    ]);

    const result = {
      failedEmails,
      oldDrafts,
      pendingBookingInterest
    };

    QuoteDatabaseOptimizer.setCachedResult(
      'attention_quotes', 
      {}, 
      {}, 
      result, 
      10 * 60 * 1000 // 10 minutes
    );

    return result;
  }

  /**
   * Get enquiries with quote analytics
   */
  static async getEnquiriesWithQuoteAnalytics(
    filters: any = {},
    limit: number = 50
  ): Promise<any[]> {
    const query = { hasQuotes: true, ...filters };
    const options = { sort: { latestQuoteDate: -1 }, limit };

    return QuoteDatabaseOptimizer.findEnquiriesWithQuotes(query, true);
  }

  /**
   * Search quotes with full-text search
   */
  static async searchQuotes(
    searchTerm: string,
    filters: QuoteQueryFilters = {},
    limit: number = 20
  ): Promise<any[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    const queryFilters: any = {};
    
    if (filters.status && filters.status.length > 0) {
      queryFilters.status = { $in: filters.status };
    }
    
    if (filters.createdBy) {
      queryFilters.createdBy = new mongoose.Types.ObjectId(filters.createdBy);
    }

    return QuoteDatabaseOptimizer.searchQuotes(searchTerm, queryFilters, true);
  }

  /**
   * Get quote conversion analytics
   */
  static async getQuoteConversionAnalytics(): Promise<any> {
    const cached = QuoteDatabaseOptimizer.getCachedResult('conversion_analytics', {}, {});
    if (cached) return cached;

    const pipeline = [
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalQuotes: { $sum: 1 },
          sentQuotes: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          bookingInterest: {
            $sum: { $cond: ['$bookingInterest.expressed', 1, 0] }
          },
          avgPrice: { $avg: '$totalPrice' },
          totalValue: { $sum: '$totalPrice' }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $multiply: [
              { $divide: ['$bookingInterest', '$totalQuotes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ];

    const analytics = await Quote.aggregate(pipeline);

    QuoteDatabaseOptimizer.setCachedResult(
      'conversion_analytics', 
      {}, 
      {}, 
      analytics, 
      15 * 60 * 1000 // 15 minutes
    );

    return analytics;
  }

  /**
   * Get email delivery analytics
   */
  static async getEmailDeliveryAnalytics(): Promise<any> {
    const cached = QuoteDatabaseOptimizer.getCachedResult('email_analytics', {}, {});
    if (cached) return cached;

    const pipeline = [
      {
        $match: { emailSent: true }
      },
      {
        $group: {
          _id: {
            status: '$emailDeliveryStatus',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$emailSentAt'
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'delivered'] }, '$count', 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'failed'] }, '$count', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'pending'] }, '$count', 0]
            }
          },
          total: { $sum: '$count' }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$delivered', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: { '_id': -1 }
      },
      {
        $limit: 30
      }
    ];

    const analytics = await Quote.aggregate(pipeline);

    QuoteDatabaseOptimizer.setCachedResult(
      'email_analytics', 
      {}, 
      {}, 
      analytics, 
      10 * 60 * 1000 // 10 minutes
    );

    return analytics;
  }

  /**
   * Clear all query caches
   */
  static clearCache(): void {
    QuoteDatabaseOptimizer.clearCache();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): any {
    return QuoteDatabaseOptimizer.getCacheStats();
  }
}

export default OptimizedQuoteQueries;