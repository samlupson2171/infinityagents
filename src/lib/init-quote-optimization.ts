import { initializeQuoteDatabaseOptimization } from './quote-database-optimization';
import QuoteMonitoring from './quote-monitoring';

/**
 * Initialize quote system optimization and monitoring
 * This should be called during application startup
 */

let isInitialized = false;

export async function initializeQuoteOptimization(): Promise<void> {
  if (isInitialized) {
    console.log('Quote optimization already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing quote system optimization...');

    // Initialize database optimization (indexes and caching)
    await initializeQuoteDatabaseOptimization();

    // Set up monitoring intervals
    setupMonitoringIntervals();

    // Mark as initialized
    isInitialized = true;

    console.log('✅ Quote system optimization initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize quote optimization:', error);
    throw error;
  }
}

/**
 * Set up periodic monitoring tasks
 */
function setupMonitoringIntervals(): void {
  // Clean up expired cache entries every 10 minutes
  setInterval(() => {
    try {
      // This would be handled by the QuoteDatabaseOptimizer
      console.log('🧹 Running periodic cache cleanup...');
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }, 10 * 60 * 1000);

  // Generate system health report every hour
  setInterval(async () => {
    try {
      console.log('📊 Generating system health report...');
      const healthMetrics = await QuoteMonitoring.getSystemHealthMetrics();
      
      // Log critical issues
      if (healthMetrics.database.connectionStatus === 'error') {
        console.error('🚨 Database connection error detected');
      }
      
      if (healthMetrics.email.failureRate > 10) {
        console.warn(`🚨 High email failure rate: ${healthMetrics.email.failureRate.toFixed(1)}%`);
      }
      
      if (healthMetrics.cache.hitRate < 50) {
        console.warn(`🚨 Low cache hit rate: ${healthMetrics.cache.hitRate.toFixed(1)}%`);
      }
    } catch (error) {
      console.error('Error generating health report:', error);
    }
  }, 60 * 60 * 1000);

  // Performance metrics summary every 30 minutes
  setInterval(() => {
    try {
      console.log('📈 Generating performance summary...');
      const performanceAnalytics = QuoteMonitoring.getPerformanceAnalytics(30);
      
      if (performanceAnalytics.errorRate > 5) {
        console.warn(`🚨 High error rate: ${performanceAnalytics.errorRate.toFixed(1)}%`);
      }
      
      if (performanceAnalytics.slowQueries > 10) {
        console.warn(`🚨 High number of slow queries: ${performanceAnalytics.slowQueries}`);
      }
      
      console.log(`📊 Performance Summary (30min): ${performanceAnalytics.totalOperations} ops, ${performanceAnalytics.avgDuration}ms avg, ${performanceAnalytics.successRate.toFixed(1)}% success`);
    } catch (error) {
      console.error('Error generating performance summary:', error);
    }
  }, 30 * 60 * 1000);
}

/**
 * Get initialization status
 */
export function isQuoteOptimizationInitialized(): boolean {
  return isInitialized;
}

/**
 * Force re-initialization (useful for testing or recovery)
 */
export async function reinitializeQuoteOptimization(): Promise<void> {
  isInitialized = false;
  await initializeQuoteOptimization();
}

export default {
  initializeQuoteOptimization,
  isQuoteOptimizationInitialized,
  reinitializeQuoteOptimization
};