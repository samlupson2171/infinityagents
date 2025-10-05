import { NextRequest, NextResponse } from 'next/server';
import QuoteMonitoring from '@/lib/quote-monitoring';

/**
 * Middleware to automatically track performance metrics for quote-related API endpoints
 */

export interface MonitoringConfig {
  trackPerformance: boolean;
  trackErrors: boolean;
  slowQueryThreshold: number; // milliseconds
  enableDetailedLogging: boolean;
}

const defaultConfig: MonitoringConfig = {
  trackPerformance: true,
  trackErrors: true,
  slowQueryThreshold: 1000, // 1 second
  enableDetailedLogging: process.env.NODE_ENV === 'development'
};

/**
 * Monitoring middleware wrapper for API routes
 */
export function withQuoteMonitoring(
  handler: (request: NextRequest) => Promise<NextResponse>,
  operationName: string,
  config: Partial<MonitoringConfig> = {}
) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;
    let success = true;
    let error: string | undefined;
    let statusCode = 200;

    try {
      // Extract request metadata
      const metadata = {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        contentLength: request.headers.get('content-length'),
        timestamp: new Date().toISOString()
      };

      if (finalConfig.enableDetailedLogging) {
        console.log(`🔍 [${operationName}] Starting operation:`, {
          method: request.method,
          url: request.url,
          timestamp: metadata.timestamp
        });
      }

      // Execute the handler
      response = await handler(request);
      statusCode = response.status;

      // Check if response indicates an error
      if (statusCode >= 400) {
        success = false;
        error = `HTTP ${statusCode}`;
        
        // Try to extract error details from response
        try {
          const responseClone = response.clone();
          const responseData = await responseClone.json();
          if (responseData.error) {
            error = `${error}: ${responseData.error}`;
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }

      return response;

    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      statusCode = 500;

      if (finalConfig.enableDetailedLogging) {
        console.error(`❌ [${operationName}] Operation failed:`, err);
      }

      // Return error response
      response = NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          operationId: operationName
        },
        { status: 500 }
      );

      return response;

    } finally {
      const duration = Date.now() - startTime;

      // Record performance metrics if enabled
      if (finalConfig.trackPerformance) {
        QuoteMonitoring.recordMetric(
          operationName,
          duration,
          success,
          error,
          {
            method: request.method,
            statusCode,
            url: request.url,
            isSlowQuery: duration > finalConfig.slowQueryThreshold
          }
        );
      }

      // Log slow queries
      if (duration > finalConfig.slowQueryThreshold) {
        console.warn(`🐌 [${operationName}] Slow operation detected:`, {
          duration: `${duration}ms`,
          threshold: `${finalConfig.slowQueryThreshold}ms`,
          method: request.method,
          url: request.url
        });
      }

      // Log completion
      if (finalConfig.enableDetailedLogging) {
        const logLevel = success ? 'log' : 'error';
        const emoji = success ? '✅' : '❌';
        
        console[logLevel](`${emoji} [${operationName}] Operation completed:`, {
          duration: `${duration}ms`,
          success,
          statusCode,
          error: error || 'none'
        });
      }
    }
  };
}

/**
 * Monitoring middleware for database operations
 */
export async function withDatabaseMonitoring<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  return QuoteMonitoring.measureOperation(
    `db_${operation}`,
    fn,
    metadata
  );
}

/**
 * Monitoring middleware for external service calls
 */
export async function withExternalServiceMonitoring<T>(
  serviceName: string,
  operation: string,
  fn: () => Promise<T>,
  metadata?: any
): Promise<T> {
  return QuoteMonitoring.measureOperation(
    `external_${serviceName}_${operation}`,
    fn,
    metadata
  );
}

/**
 * Monitoring middleware for cache operations
 */
export async function withCacheMonitoring<T>(
  operation: string,
  fn: () => Promise<T>,
  cacheKey?: string
): Promise<T> {
  return QuoteMonitoring.measureOperation(
    `cache_${operation}`,
    fn,
    { cacheKey }
  );
}

/**
 * Monitoring middleware for email operations
 */
export async function withEmailMonitoring<T>(
  operation: string,
  fn: () => Promise<T>,
  emailMetadata?: {
    recipient?: string;
    template?: string;
    quoteId?: string;
  }
): Promise<T> {
  return QuoteMonitoring.measureOperation(
    `email_${operation}`,
    fn,
    emailMetadata
  );
}

/**
 * Create monitoring wrapper for specific quote operations
 */
export const createQuoteOperationMonitoring = (operationName: string) => {
  return {
    /**
     * Monitor database operations for this quote operation
     */
    database: <T>(fn: () => Promise<T>, metadata?: any) =>
      withDatabaseMonitoring(`${operationName}_db`, fn, metadata),

    /**
     * Monitor cache operations for this quote operation
     */
    cache: <T>(fn: () => Promise<T>, cacheKey?: string) =>
      withCacheMonitoring(`${operationName}_cache`, fn, cacheKey),

    /**
     * Monitor email operations for this quote operation
     */
    email: <T>(fn: () => Promise<T>, emailMetadata?: any) =>
      withEmailMonitoring(`${operationName}_email`, fn, emailMetadata),

    /**
     * Monitor external service calls for this quote operation
     */
    external: <T>(serviceName: string, fn: () => Promise<T>, metadata?: any) =>
      withExternalServiceMonitoring(serviceName, `${operationName}`, fn, metadata),

    /**
     * Monitor general operations
     */
    operation: <T>(fn: () => Promise<T>, metadata?: any) =>
      QuoteMonitoring.measureOperation(operationName, fn, metadata)
  };
};

/**
 * Pre-configured monitoring for common quote operations
 */
export const QuoteOperationMonitoring = {
  create: createQuoteOperationMonitoring('quote_create'),
  update: createQuoteOperationMonitoring('quote_update'),
  delete: createQuoteOperationMonitoring('quote_delete'),
  fetch: createQuoteOperationMonitoring('quote_fetch'),
  search: createQuoteOperationMonitoring('quote_search'),
  emailSend: createQuoteOperationMonitoring('quote_email_send'),
  emailTrack: createQuoteOperationMonitoring('quote_email_track'),
  analytics: createQuoteOperationMonitoring('quote_analytics'),
  export: createQuoteOperationMonitoring('quote_export')
};

export default {
  withQuoteMonitoring,
  withDatabaseMonitoring,
  withExternalServiceMonitoring,
  withCacheMonitoring,
  withEmailMonitoring,
  createQuoteOperationMonitoring,
  QuoteOperationMonitoring
};