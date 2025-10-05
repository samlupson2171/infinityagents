import mongoose from 'mongoose';
import Activity from '@/models/Activity';
import ActivityPackage from '@/models/ActivityPackage';

/**
 * Database optimization utilities for the Activities Module
 * Ensures proper indexing and query performance
 */

export interface IndexInfo {
  collection: string;
  name: string;
  key: Record<string, any>;
  background?: boolean;
  unique?: boolean;
}

/**
 * Comprehensive index definitions for optimal query performance
 */
export const ACTIVITY_INDEXES: IndexInfo[] = [
  // Text search index for name and description
  {
    collection: 'activities',
    name: 'text_search_idx',
    key: { name: 'text', description: 'text' },
    background: true,
  },

  // Compound index for filtering (location, category, isActive)
  {
    collection: 'activities',
    name: 'location_category_active_idx',
    key: { location: 1, category: 1, isActive: 1 },
    background: true,
  },

  // Date range queries for availability
  {
    collection: 'activities',
    name: 'availability_dates_idx',
    key: { availableFrom: 1, availableTo: 1 },
    background: true,
  },

  // Price filtering
  {
    collection: 'activities',
    name: 'price_idx',
    key: { pricePerPerson: 1 },
    background: true,
  },

  // Admin listing (active status + creation date)
  {
    collection: 'activities',
    name: 'admin_listing_idx',
    key: { isActive: 1, createdAt: -1 },
    background: true,
  },

  // Creator queries
  {
    collection: 'activities',
    name: 'creator_idx',
    key: { createdBy: 1 },
    background: true,
  },

  // Unique constraint for duplicate detection
  {
    collection: 'activities',
    name: 'unique_name_location_idx',
    key: { name: 1, location: 1 },
    unique: true,
    background: true,
  },

  // Compound index for complex search queries
  {
    collection: 'activities',
    name: 'search_filter_idx',
    key: {
      isActive: 1,
      category: 1,
      pricePerPerson: 1,
      availableFrom: 1,
      availableTo: 1,
    },
    background: true,
  },
];

export const PACKAGE_INDEXES: IndexInfo[] = [
  // User packages by status
  {
    collection: 'activitypackages',
    name: 'user_status_idx',
    key: { createdBy: 1, status: 1 },
    background: true,
  },

  // User packages by creation date
  {
    collection: 'activitypackages',
    name: 'user_date_idx',
    key: { createdBy: 1, createdAt: -1 },
    background: true,
  },

  // All packages by status and date (admin queries)
  {
    collection: 'activitypackages',
    name: 'status_date_idx',
    key: { status: 1, createdAt: -1 },
    background: true,
  },

  // Activity references for cleanup operations
  {
    collection: 'activitypackages',
    name: 'activity_refs_idx',
    key: { 'activities.activityId': 1 },
    background: true,
  },
];

/**
 * Creates all necessary database indexes for optimal performance
 */
export async function createOptimalIndexes(): Promise<void> {
  try {
    console.log('Creating database indexes for optimal performance...');

    // Ensure models are loaded
    const activityModel = Activity;
    const packageModel = ActivityPackage;

    // Create Activity indexes
    for (const indexDef of ACTIVITY_INDEXES) {
      try {
        await activityModel.collection.createIndex(indexDef.key, {
          name: indexDef.name,
          background: indexDef.background || true,
          unique: indexDef.unique || false,
        });
        console.log(
          `✓ Created index: ${indexDef.name} on activities collection`
        );
      } catch (error: any) {
        // Index might already exist
        if (error.code !== 85) {
          // Index already exists error code
          console.warn(
            `Warning creating index ${indexDef.name}:`,
            error.message
          );
        }
      }
    }

    // Create Package indexes
    for (const indexDef of PACKAGE_INDEXES) {
      try {
        await packageModel.collection.createIndex(indexDef.key, {
          name: indexDef.name,
          background: indexDef.background || true,
          unique: indexDef.unique || false,
        });
        console.log(`✓ Created index: ${indexDef.name} on packages collection`);
      } catch (error: any) {
        // Index might already exist
        if (error.code !== 85) {
          // Index already exists error code
          console.warn(
            `Warning creating index ${indexDef.name}:`,
            error.message
          );
        }
      }
    }

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Analyzes query performance and suggests optimizations
 */
export async function analyzeQueryPerformance(): Promise<any> {
  try {
    const db = mongoose.connection.db;

    // Get collection stats
    const activityStats = await db.collection('activities').stats();
    const packageStats = await db.collection('activitypackages').stats();

    // Get index usage stats
    const activityIndexStats = await db
      .collection('activities')
      .aggregate([{ $indexStats: {} }])
      .toArray();

    const packageIndexStats = await db
      .collection('activitypackages')
      .aggregate([{ $indexStats: {} }])
      .toArray();

    return {
      collections: {
        activities: {
          count: activityStats.count,
          avgObjSize: activityStats.avgObjSize,
          totalIndexSize: activityStats.totalIndexSize,
          indexes: activityIndexStats,
        },
        packages: {
          count: packageStats.count,
          avgObjSize: packageStats.avgObjSize,
          totalIndexSize: packageStats.totalIndexSize,
          indexes: packageIndexStats,
        },
      },
      recommendations: generatePerformanceRecommendations(
        activityStats,
        packageStats
      ),
    };
  } catch (error) {
    console.error('Error analyzing query performance:', error);
    throw error;
  }
}

/**
 * Generates performance recommendations based on collection stats
 */
function generatePerformanceRecommendations(
  activityStats: any,
  packageStats: any
): string[] {
  const recommendations: string[] = [];

  // Check collection sizes
  if (activityStats.count > 10000) {
    recommendations.push(
      'Consider implementing data archiving for old activities'
    );
  }

  if (packageStats.count > 50000) {
    recommendations.push(
      'Consider implementing package cleanup for old draft packages'
    );
  }

  // Check index efficiency
  const indexRatio = activityStats.totalIndexSize / activityStats.size;
  if (indexRatio > 0.5) {
    recommendations.push(
      'Index size is large relative to data size - review index usage'
    );
  }

  return recommendations;
}

/**
 * Optimizes database connection settings for performance
 */
export function getOptimizedConnectionOptions(): mongoose.ConnectOptions {
  return {
    // Connection pool settings
    maxPoolSize: 10, // Maximum number of connections
    minPoolSize: 2, // Minimum number of connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

    // Performance settings
    bufferCommands: false, // Disable mongoose buffering

    // Timeout settings
    serverSelectionTimeoutMS: 5000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long a send or receive on a socket can take
    connectTimeoutMS: 10000, // How long to wait for initial connection

    // SSL/TLS settings for MongoDB Atlas
    ssl: true,
    sslValidate: true,
    
    // Write concern for performance
    writeConcern: {
      w: 'majority',
      j: true, // Wait for journal acknowledgment
      wtimeout: 5000,
    },

    // Read preference for performance
    readPreference: 'primary',
  };
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Optimizes activity search queries
   */
  static optimizeActivitySearch(params: any) {
    const pipeline: any[] = [];

    // Match stage with compound conditions
    const matchConditions: any = { isActive: true };

    // Text search
    if (params.search) {
      matchConditions.$text = { $search: params.search };
    }

    // Location filter (case-insensitive)
    if (params.location) {
      matchConditions.location = { $regex: new RegExp(params.location, 'i') };
    }

    // Category filter
    if (params.category) {
      matchConditions.category = params.category;
    }

    // Price range filter
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      matchConditions.pricePerPerson = {};
      if (params.priceMin !== undefined) {
        matchConditions.pricePerPerson.$gte = params.priceMin;
      }
      if (params.priceMax !== undefined) {
        matchConditions.pricePerPerson.$lte = params.priceMax;
      }
    }

    // Date range filter
    if (params.dateFrom || params.dateTo) {
      if (params.dateFrom) {
        matchConditions.availableTo = { $gte: params.dateFrom };
      }
      if (params.dateTo) {
        matchConditions.availableFrom = { $lte: params.dateTo };
      }
    }

    pipeline.push({ $match: matchConditions });

    // Add text score for sorting if text search is used
    if (params.search) {
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' },
        },
      });
    }

    // Sort stage
    const sortStage: any = {};
    if (params.search) {
      sortStage.score = { $meta: 'textScore' };
    }
    sortStage.createdAt = -1;
    pipeline.push({ $sort: sortStage });

    // Pagination
    if (params.skip) {
      pipeline.push({ $skip: params.skip });
    }
    if (params.limit) {
      pipeline.push({ $limit: params.limit });
    }

    // Project to exclude unnecessary fields
    pipeline.push({
      $project: {
        __v: 0,
        ...(params.search ? {} : { score: 0 }),
      },
    });

    return pipeline;
  }

  /**
   * Optimizes package queries with activity population
   */
  static optimizePackageQuery(userId: string, params: any) {
    const pipeline: any[] = [];

    // Match user packages
    const matchConditions: any = {
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    if (params.status) {
      matchConditions.status = params.status;
    }

    pipeline.push({ $match: matchConditions });

    // Lookup activity details efficiently
    pipeline.push({
      $lookup: {
        from: 'activities',
        localField: 'activities.activityId',
        foreignField: '_id',
        as: 'activityDetails',
        pipeline: [
          {
            $project: {
              name: 1,
              category: 1,
              location: 1,
              pricePerPerson: 1,
              duration: 1,
              description: 1,
              isActive: 1,
            },
          },
        ],
      },
    });

    // Sort by creation date
    pipeline.push({ $sort: { createdAt: -1 } });

    // Pagination
    if (params.skip) {
      pipeline.push({ $skip: params.skip });
    }
    if (params.limit) {
      pipeline.push({ $limit: params.limit });
    }

    return pipeline;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map();

  /**
   * Records query execution time
   */
  static recordQueryTime(queryName: string, executionTime: number): void {
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }

    const times = this.queryTimes.get(queryName)!;
    times.push(executionTime);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Gets performance statistics for a query
   */
  static getQueryStats(queryName: string): any {
    const times = this.queryTimes.get(queryName);
    if (!times || times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;

    return {
      count: times.length,
      average: Math.round(avg),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  /**
   * Gets all query performance statistics
   */
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [queryName] of this.queryTimes) {
      stats[queryName] = this.getQueryStats(queryName);
    }

    return stats;
  }
}

/**
 * Wrapper function to measure query performance
 */
export async function measureQueryPerformance<T>(
  queryName: string,
  queryFunction: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await queryFunction();
    const executionTime = Date.now() - startTime;

    PerformanceMonitor.recordQueryTime(queryName, executionTime);

    // Log slow queries (> 1 second)
    if (executionTime > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
    }

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`Query failed: ${queryName} after ${executionTime}ms`, error);
    throw error;
  }
}
