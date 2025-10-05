import mongoose from 'mongoose';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';

/**
 * Quote system monitoring and analytics
 * Provides performance monitoring, error tracking, and system health metrics
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface SystemHealthMetrics {
  database: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    activeConnections: number;
  };
  cache: {
    hitRate: number;
    totalEntries: number;
    memoryUsage: number;
  };
  email: {
    deliveryRate: number;
    failureRate: number;
    avgDeliveryTime: number;
  };
  quotes: {
    totalCount: number;
    recentActivity: number;
    conversionRate: number;
  };
}

export interface AlertConfig {
  type: 'email_failure_rate' | 'database_slow_query' | 'cache_miss_rate' | 'error_rate';
  threshold: number;
  enabled: boolean;
  recipients: string[];
}

export class QuoteMonitoring {
  private static performanceMetrics: PerformanceMetric[] = [];
  private static maxMetricsHistory = 1000;
  private static alertConfigs: AlertConfig[] = [
    {
      type: 'email_failure_rate',
      threshold: 10, // 10% failure rate
      enabled: true,
      recipients: ['admin@infinityweekends.com']
    },
    {
      type: 'database_slow_query',
      threshold: 5000, // 5 seconds
      enabled: true,
      recipients: ['admin@infinityweekends.com']
    },
    {
      type: 'cache_miss_rate',
      threshold: 80, // 80% miss rate
      enabled: true,
      recipients: ['admin@infinityweekends.com']
    },
    {
      type: 'error_rate',
      threshold: 5, // 5% error rate
      enabled: true,
      recipients: ['admin@infinityweekends.com']
    }
  ];

  /**
   * Record a performance metric
   */
  static recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    metadata?: any
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      success,
      error,
      metadata
    };

    this.performanceMetrics.push(metric);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
    }

    // Check for alerts
    this.checkAlerts(metric);
  }

  /**
   * Measure and record operation performance
   */
  static async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, success, error, metadata);
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const [
      databaseHealth,
      cacheHealth,
      emailHealth,
      quoteHealth
    ] = await Promise.all([
      this.getDatabaseHealth(),
      this.getCacheHealth(),
      this.getEmailHealth(),
      this.getQuoteHealth()
    ]);

    return {
      database: databaseHealth,
      cache: cacheHealth,
      email: emailHealth,
      quotes: quoteHealth
    };
  }

  /**
   * Get database health metrics
   */
  private static async getDatabaseHealth(): Promise<SystemHealthMetrics['database']> {
    const startTime = Date.now();
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let activeConnections = 0;

    try {
      // Test database connection with a simple query
      await Quote.findOne().limit(1);
      connectionStatus = 'connected';
      
      // Get connection info if available
      if (mongoose.connection.db) {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        activeConnections = serverStatus.connections?.current || 0;
      }
    } catch (error) {
      connectionStatus = 'error';
    }

    const responseTime = Date.now() - startTime;

    return {
      connectionStatus,
      responseTime,
      activeConnections
    };
  }

  /**
   * Get cache health metrics
   */
  private static getCacheHealth(): Promise<SystemHealthMetrics['cache']> {
    // This would integrate with your caching system
    // For now, returning mock data
    return Promise.resolve({
      hitRate: 75.5,
      totalEntries: 150,
      memoryUsage: 1024 * 1024 * 50 // 50MB
    });
  }

  /**
   * Get email delivery health metrics
   */
  private static async getEmailHealth(): Promise<SystemHealthMetrics['email']> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const emailStats = await Quote.aggregate([
      {
        $match: {
          emailSent: true,
          emailSentAt: { $gte: oneDayAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$emailDeliveryStatus', 'delivered'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$emailDeliveryStatus', 'failed'] }, 1, 0] }
          },
          avgDeliveryTime: {
            $avg: {
              $subtract: ['$emailSentAt', '$createdAt']
            }
          }
        }
      }
    ]);

    const stats = emailStats[0] || { total: 0, delivered: 0, failed: 0, avgDeliveryTime: 0 };
    
    return {
      deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 100,
      failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
      avgDeliveryTime: stats.avgDeliveryTime || 0
    };
  }

  /**
   * Get quote system health metrics
   */
  private static async getQuoteHealth(): Promise<SystemHealthMetrics['quotes']> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalCount, recentActivity, conversionStats] = await Promise.all([
      Quote.countDocuments(),
      Quote.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Quote.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withBookingInterest: {
              $sum: { $cond: ['$bookingInterest.expressed', 1, 0] }
            }
          }
        }
      ])
    ]);

    const conversion = conversionStats[0] || { total: 0, withBookingInterest: 0 };
    const conversionRate = conversion.total > 0 ? 
      (conversion.withBookingInterest / conversion.total) * 100 : 0;

    return {
      totalCount,
      recentActivity,
      conversionRate
    };
  }

  /**
   * Get performance analytics
   */
  static getPerformanceAnalytics(hours: number = 24): any {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp >= cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        avgDuration: 0,
        successRate: 100,
        errorRate: 0,
        slowQueries: 0,
        operationBreakdown: {}
      };
    }

    const totalOperations = recentMetrics.length;
    const successfulOperations = recentMetrics.filter(m => m.success).length;
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const slowQueries = recentMetrics.filter(m => m.duration > 1000).length;

    // Group by operation type
    const operationBreakdown = recentMetrics.reduce((acc: any, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = {
          count: 0,
          avgDuration: 0,
          successRate: 0,
          errors: []
        };
      }
      
      acc[metric.operation].count++;
      acc[metric.operation].avgDuration = 
        (acc[metric.operation].avgDuration + metric.duration) / 2;
      
      if (!metric.success && metric.error) {
        acc[metric.operation].errors.push(metric.error);
      }
      
      return acc;
    }, {});

    // Calculate success rates for each operation
    Object.keys(operationBreakdown).forEach(op => {
      const opMetrics = recentMetrics.filter(m => m.operation === op);
      const opSuccessful = opMetrics.filter(m => m.success).length;
      operationBreakdown[op].successRate = (opSuccessful / opMetrics.length) * 100;
    });

    return {
      totalOperations,
      avgDuration: Math.round(avgDuration),
      successRate: (successfulOperations / totalOperations) * 100,
      errorRate: ((totalOperations - successfulOperations) / totalOperations) * 100,
      slowQueries,
      operationBreakdown
    };
  }

  /**
   * Get email delivery success rate tracking
   */
  static async getEmailDeliveryTracking(days: number = 7): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const pipeline = [
      {
        $match: {
          emailSent: true,
          emailSentAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$emailSentAt'
              }
            }
          },
          total: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$emailDeliveryStatus', 'delivered'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$emailDeliveryStatus', 'failed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$emailDeliveryStatus', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$delivered', '$total'] },
              100
            ]
          },
          failureRate: {
            $multiply: [
              { $divide: ['$failed', '$total'] },
              100
            ]
          }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ];

    return Quote.aggregate(pipeline);
  }

  /**
   * Get error rate monitoring
   */
  static getErrorRateMonitoring(hours: number = 24): any {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(
      metric => metric.timestamp >= cutoffTime
    );

    const totalOperations = recentMetrics.length;
    const errorOperations = recentMetrics.filter(m => !m.success);
    const errorRate = totalOperations > 0 ? (errorOperations.length / totalOperations) * 100 : 0;

    // Group errors by type
    const errorBreakdown = errorOperations.reduce((acc: any, metric) => {
      const errorType = metric.error || 'Unknown Error';
      if (!acc[errorType]) {
        acc[errorType] = {
          count: 0,
          operations: [],
          lastOccurrence: metric.timestamp
        };
      }
      acc[errorType].count++;
      acc[errorType].operations.push(metric.operation);
      if (metric.timestamp > acc[errorType].lastOccurrence) {
        acc[errorType].lastOccurrence = metric.timestamp;
      }
      return acc;
    }, {});

    return {
      totalOperations,
      errorOperations: errorOperations.length,
      errorRate,
      errorBreakdown,
      recentErrors: errorOperations.slice(-10) // Last 10 errors
    };
  }

  /**
   * Check for alerts based on metrics
   */
  private static async checkAlerts(metric: PerformanceMetric): Promise<void> {
    // Check for slow query alert
    const slowQueryConfig = this.alertConfigs.find(c => c.type === 'database_slow_query');
    if (slowQueryConfig?.enabled && metric.duration > slowQueryConfig.threshold) {
      await this.sendAlert('database_slow_query', {
        operation: metric.operation,
        duration: metric.duration,
        threshold: slowQueryConfig.threshold
      });
    }

    // Check error rate periodically (every 100 operations)
    if (this.performanceMetrics.length % 100 === 0) {
      await this.checkErrorRateAlert();
      await this.checkEmailFailureRateAlert();
    }
  }

  /**
   * Check error rate alert
   */
  private static async checkErrorRateAlert(): Promise<void> {
    const config = this.alertConfigs.find(c => c.type === 'error_rate');
    if (!config?.enabled) return;

    const recentMetrics = this.performanceMetrics.slice(-100); // Last 100 operations
    const errorRate = (recentMetrics.filter(m => !m.success).length / recentMetrics.length) * 100;

    if (errorRate > config.threshold) {
      await this.sendAlert('error_rate', {
        currentRate: errorRate,
        threshold: config.threshold,
        sampleSize: recentMetrics.length
      });
    }
  }

  /**
   * Check email failure rate alert
   */
  private static async checkEmailFailureRateAlert(): Promise<void> {
    const config = this.alertConfigs.find(c => c.type === 'email_failure_rate');
    if (!config?.enabled) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEmails = await Quote.find({
      emailSent: true,
      emailSentAt: { $gte: oneHourAgo }
    });

    if (recentEmails.length === 0) return;

    const failedEmails = recentEmails.filter(q => q.emailDeliveryStatus === 'failed');
    const failureRate = (failedEmails.length / recentEmails.length) * 100;

    if (failureRate > config.threshold) {
      await this.sendAlert('email_failure_rate', {
        currentRate: failureRate,
        threshold: config.threshold,
        failedCount: failedEmails.length,
        totalCount: recentEmails.length
      });
    }
  }

  /**
   * Send alert (placeholder - would integrate with actual alerting system)
   */
  private static async sendAlert(type: string, data: any): Promise<void> {
    console.warn(`🚨 ALERT [${type}]:`, data);
    
    // In a real implementation, this would:
    // 1. Send email notifications
    // 2. Post to Slack/Teams
    // 3. Create tickets in monitoring system
    // 4. Log to external monitoring service
  }

  /**
   * Get alert configurations
   */
  static getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }

  /**
   * Update alert configuration
   */
  static updateAlertConfig(type: AlertConfig['type'], updates: Partial<AlertConfig>): void {
    const configIndex = this.alertConfigs.findIndex(c => c.type === type);
    if (configIndex >= 0) {
      this.alertConfigs[configIndex] = { ...this.alertConfigs[configIndex], ...updates };
    }
  }

  /**
   * Clear performance metrics history
   */
  static clearMetricsHistory(): void {
    this.performanceMetrics = [];
  }

  /**
   * Export metrics for external monitoring systems
   */
  static exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,operation,duration,success,error\n';
      const rows = this.performanceMetrics.map(m => 
        `${m.timestamp.toISOString()},${m.operation},${m.duration},${m.success},${m.error || ''}`
      ).join('\n');
      return headers + rows;
    }
    
    return JSON.stringify(this.performanceMetrics, null, 2);
  }
}

export default QuoteMonitoring;