import mongoose from 'mongoose';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';

/**
 * Database optimization utilities for the quote system
 * Provides enhanced indexing, query optimization, and caching
 */

export interface QueryCacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class QuoteDatabaseOptimizer {
  private static queryCache = new Map<string, QueryCacheEntry>();
  private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Create optimized database indexes for quote queries
   */
  static async createOptimizedIndexes(): Promise<void> {
    try {
      const Quote = mongoose.model('Quote');
      const Enquiry = mongoose.model('Enquiry');

      // Enhanced Quote indexes for common query patterns
      await Quote.collection.createIndex(
        { enquiryId: 1, version: -1 },
        { name: 'enquiry_version_idx', background: true }
      );

      await Quote.collection.createIndex(
        { createdBy: 1, createdAt: -1 },
        { name: 'creator_date_idx', background: true }
      );

      await Quote.collection.createIndex(
        { status: 1, createdAt: -1 },
        { name: 'status_date_idx', background: true }
      );

      await Quote.collection.createIndex(
        { emailDeliveryStatus: 1, emailSentAt: -1 },
        { name: 'email_status_idx', background: true }
      );

      await Quote.collection.createIndex(
        { 'bookingInterest.expressed': 1, 'bookingInterest.expressedAt': -1 },
        { name: 'booking_interest_idx', background: true }
      );

      // Compound indexes for complex queries
      await Quote.collection.createIndex(
        { status: 1, emailDeliveryStatus: 1, createdAt: -1 },
        { name: 'status_email_date_idx', background: true }
      );

      await Quote.collection.createIndex(
        { createdBy: 1, status: 1, createdAt: -1 },
        { name: 'creator_status_date_idx', background: true }
      );

      // Text search index for quote content
      await Quote.collection.createIndex(
        { 
          leadName: 'text', 
          hotelName: 'text', 
          whatsIncluded: 'text',
          activitiesIncluded: 'text',
          internalNotes: 'text'
        },
        { 
          name: 'quote_text_search_idx',
          background: true,
          weights: {
            leadName: 10,
            hotelName: 8,
            whatsIncluded: 5,
            activitiesIncluded: 3,
            internalNotes: 1
          }
        }
      );

      // Enhanced Enquiry indexes for quote relationships
      await Enquiry.collection.createIndex(
        { hasQuotes: 1, latestQuoteDate: -1 },
        { name: 'quotes_status_idx', background: true }
      );

      await Enquiry.collection.createIndex(
        { quotesCount: 1, createdAt: -1 },
        { name: 'quotes_count_idx', background: true }
      );

      await Enquiry.collection.createIndex(
        { agentEmail: 1, hasQuotes: 1, latestQuoteDate: -1 },
        { name: 'agent_quotes_idx', background: true }
      );

      // Sparse index for enquiries with quotes
      await Enquiry.collection.createIndex(
        { latestQuoteDate: -1 },
        { name: 'latest_quote_sparse_idx', sparse: true, background: true }
      );

      console.log('✅ Quote database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating quote database indexes:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for query parameters
   */
  private static generateCacheKey(collection: string, query: any, options: any = {}): string {
    const queryStr = JSON.stringify(query);
    const optionsStr = JSON.stringify(options);
    return `${collection}:${Buffer.from(queryStr + optionsStr).toString('base64')}`;
  }

  /**
   * Check if cache entry is valid
   */
  private static isCacheValid(entry: QueryCacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached query result
   */
  static getCachedResult(collection: string, query: any, options: any = {}): any | null {
    const cacheKey = this.generateCacheKey(collection, query, options);
    const entry = this.queryCache.get(cacheKey);
    
    if (entry && this.isCacheValid(entry)) {
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      this.queryCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache query result
   */
  static setCachedResult(
    collection: string, 
    query: any, 
    options: any = {}, 
    data: any, 
    ttl: number = this.DEFAULT_CACHE_TTL
  ): void {
    const cacheKey = this.generateCacheKey(collection, query, options);
    this.queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache for specific collection or all cache
   */
  static clearCache(collection?: string): void {
    if (collection) {
      const keysToDelete = Array.from(this.queryCache.keys())
        .filter(key => key.startsWith(`${collection}:`));
      keysToDelete.forEach(key => this.queryCache.delete(key));
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Optimized quote queries with caching
   */
  static async findQuotesByEnquiry(
    enquiryId: string, 
    useCache: boolean = true
  ): Promise<any[]> {
    const query = { enquiryId: new mongoose.Types.ObjectId(enquiryId) };
    const options = { sort: { version: -1 } };
    
    if (useCache) {
      const cached = this.getCachedResult('quotes', query, options);
      if (cached) return cached;
    }

    const quotes = await Quote.find(query)
      .sort({ version: -1 })
      .populate('createdBy', 'name email')
      .lean();

    if (useCache) {
      this.setCachedResult('quotes', query, options, quotes, 2 * 60 * 1000); // 2 minutes
    }

    return quotes;
  }

  /**
   * Optimized enquiry-quote relationship queries
   */
  static async findEnquiriesWithQuotes(
    filters: any = {}, 
    useCache: boolean = true
  ): Promise<any[]> {
    const query = { hasQuotes: true, ...filters };
    const options = { sort: { latestQuoteDate: -1 }, limit: 50 };
    
    if (useCache) {
      const cached = this.getCachedResult('enquiries', query, options);
      if (cached) return cached;
    }

    const enquiries = await Enquiry.find(query)
      .sort({ latestQuoteDate: -1 })
      .limit(50)
      .populate('quotes', 'status totalPrice currency createdAt')
      .populate('submittedBy', 'name email')
      .lean();

    if (useCache) {
      this.setCachedResult('enquiries', query, options, enquiries, 3 * 60 * 1000); // 3 minutes
    }

    return enquiries;
  }

  /**
   * Optimized quote search with text search and filters
   */
  static async searchQuotes(
    searchTerm: string,
    filters: any = {},
    useCache: boolean = true
  ): Promise<any[]> {
    const query = {
      $text: { $search: searchTerm },
      ...filters
    };
    const options = { 
      sort: { score: { $meta: 'textScore' }, createdAt: -1 },
      limit: 20
    };
    
    if (useCache) {
      const cached = this.getCachedResult('quotes_search', query, options);
      if (cached) return cached;
    }

    const quotes = await Quote.find(query)
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'name email')
      .populate('enquiryId', 'leadName agentEmail')
      .lean();

    if (useCache) {
      this.setCachedResult('quotes_search', query, options, quotes, 1 * 60 * 1000); // 1 minute
    }

    return quotes;
  }

  /**
   * Optimized quote statistics queries
   */
  static async getQuoteStatistics(useCache: boolean = true): Promise<any> {
    const cacheKey = 'quote_statistics';
    
    if (useCache) {
      const cached = this.getCachedResult('stats', {}, {});
      if (cached) return cached;
    }

    const [
      totalQuotes,
      draftQuotes,
      sentQuotes,
      quotesWithBookingInterest,
      recentQuotes,
      emailDeliveryStats
    ] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ status: 'draft' }),
      Quote.countDocuments({ status: 'sent' }),
      Quote.countDocuments({ 'bookingInterest.expressed': true }),
      Quote.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }),
      Quote.aggregate([
        {
          $group: {
            _id: '$emailDeliveryStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      totalQuotes,
      draftQuotes,
      sentQuotes,
      quotesWithBookingInterest,
      recentQuotes,
      emailDeliveryStats: emailDeliveryStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      conversionRate: totalQuotes > 0 ? (quotesWithBookingInterest / totalQuotes * 100).toFixed(2) : 0
    };

    if (useCache) {
      this.setCachedResult('stats', {}, {}, stats, 5 * 60 * 1000); // 5 minutes
    }

    return stats;
  }

  /**
   * Batch update enquiry quote counts and status
   */
  static async updateEnquiryQuoteCounts(): Promise<void> {
    const pipeline = [
      {
        $lookup: {
          from: 'quotes',
          localField: '_id',
          foreignField: 'enquiryId',
          as: 'quoteData'
        }
      },
      {
        $addFields: {
          quotesCount: { $size: '$quoteData' },
          hasQuotes: { $gt: [{ $size: '$quoteData' }, 0] },
          latestQuoteDate: {
            $max: '$quoteData.createdAt'
          }
        }
      },
      {
        $project: {
          quotesCount: 1,
          hasQuotes: 1,
          latestQuoteDate: 1
        }
      }
    ];

    const updates = await Enquiry.aggregate(pipeline);
    
    const bulkOps = updates.map((update: any) => ({
      updateOne: {
        filter: { _id: update._id },
        update: {
          $set: {
            quotesCount: update.quotesCount,
            hasQuotes: update.hasQuotes,
            latestQuoteDate: update.latestQuoteDate
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Enquiry.bulkWrite(bulkOps);
    }
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.queryCache.forEach((entry, key) => {
      if (now - entry.timestamp >= entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.queryCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): any {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.queryCache.forEach((entry) => {
      if (now - entry.timestamp < entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.queryCache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }
}

/**
 * Initialize database optimization
 */
export async function initializeQuoteDatabaseOptimization(): Promise<void> {
  try {
    await QuoteDatabaseOptimizer.createOptimizedIndexes();
    
    // Set up periodic cache cleanup (every 10 minutes)
    setInterval(() => {
      QuoteDatabaseOptimizer.cleanupExpiredCache();
    }, 10 * 60 * 1000);
    
    console.log('✅ Quote database optimization initialized');
  } catch (error) {
    console.error('❌ Failed to initialize quote database optimization:', error);
    throw error;
  }
}

export default QuoteDatabaseOptimizer;