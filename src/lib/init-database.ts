import { connectToDatabase } from '@/lib/mongodb';
import {
  createOptimalIndexes,
  getOptimizedConnectionOptions,
} from '@/lib/database-optimization';

/**
 * Database initialization script for the Activities Module
 * Ensures all necessary indexes and optimizations are in place
 */

let isInitialized = false;

/**
 * Initialize database with optimal settings and indexes
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('Initializing database for Activities Module...');

    // Connect to database with optimized settings
    await connectToDatabase();

    // Create all necessary indexes
    await createOptimalIndexes();

    isInitialized = true;
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Ensure database is initialized before API operations
 * This should be called in API routes that need database access
 */
export async function ensureDatabaseReady(): Promise<void> {
  if (!isInitialized) {
    await initializeDatabase();
  }
}

/**
 * Health check for database performance
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'warning' | 'error';
  details: any;
}> {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    // Check connection status
    if (mongoose.connection.readyState !== 1) {
      return {
        status: 'error',
        details: { message: 'Database not connected' },
      };
    }

    // Test query performance
    const startTime = Date.now();
    await db.collection('activities').findOne({});
    const queryTime = Date.now() - startTime;

    // Check index usage
    const indexStats = await db
      .collection('activities')
      .aggregate([{ $indexStats: {} }])
      .toArray();

    const status = queryTime > 1000 ? 'warning' : 'healthy';

    return {
      status,
      details: {
        queryTime,
        indexCount: indexStats.length,
        connectionState: mongoose.connection.readyState,
        message:
          status === 'warning'
            ? 'Slow query performance detected'
            : 'Database is healthy',
      },
    };
  } catch (error) {
    return {
      status: 'error',
      details: {
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
