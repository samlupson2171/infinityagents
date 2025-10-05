import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import QuoteMonitoring from '@/lib/quote-monitoring';
import OptimizedQuoteQueries from '@/lib/optimized-quote-queries';

/**
 * GET /api/admin/quotes/monitoring
 * Get quote system monitoring data and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const hours = parseInt(searchParams.get('hours') || '24');
    const days = parseInt(searchParams.get('days') || '7');

    let data: any = {};

    switch (type) {
      case 'overview':
        data = await QuoteMonitoring.measureOperation(
          'get_monitoring_overview',
          async () => {
            const [
              systemHealth,
              performanceAnalytics,
              cacheStats
            ] = await Promise.all([
              QuoteMonitoring.getSystemHealthMetrics(),
              QuoteMonitoring.getPerformanceAnalytics(hours),
              OptimizedQuoteQueries.getCacheStats()
            ]);

            return {
              systemHealth,
              performanceAnalytics,
              cacheStats,
              timestamp: new Date().toISOString()
            };
          }
        );
        break;

      case 'performance':
        data = await QuoteMonitoring.measureOperation(
          'get_performance_analytics',
          async () => QuoteMonitoring.getPerformanceAnalytics(hours)
        );
        break;

      case 'email-delivery':
        data = await QuoteMonitoring.measureOperation(
          'get_email_delivery_tracking',
          async () => QuoteMonitoring.getEmailDeliveryTracking(days)
        );
        break;

      case 'error-monitoring':
        data = QuoteMonitoring.getErrorRateMonitoring(hours);
        break;

      case 'system-health':
        data = await QuoteMonitoring.measureOperation(
          'get_system_health',
          async () => QuoteMonitoring.getSystemHealthMetrics()
        );
        break;

      case 'conversion-analytics':
        data = await QuoteMonitoring.measureOperation(
          'get_conversion_analytics',
          async () => OptimizedQuoteQueries.getQuoteConversionAnalytics()
        );
        break;

      case 'alerts':
        data = {
          configs: QuoteMonitoring.getAlertConfigs(),
          recentAlerts: [] // Would come from alert history in real implementation
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid monitoring type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      type,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    
    QuoteMonitoring.recordMetric(
      'get_monitoring_data',
      0,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/quotes/monitoring
 * Update monitoring configuration or trigger actions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    let result: any = {};

    switch (action) {
      case 'update-alert-config':
        const { type, config } = data;
        QuoteMonitoring.updateAlertConfig(type, config);
        result = { message: 'Alert configuration updated successfully' };
        break;

      case 'clear-cache':
        OptimizedQuoteQueries.clearCache();
        result = { message: 'Query cache cleared successfully' };
        break;

      case 'clear-metrics':
        QuoteMonitoring.clearMetricsHistory();
        result = { message: 'Performance metrics history cleared successfully' };
        break;

      case 'export-metrics':
        const format = data.format || 'json';
        const metrics = QuoteMonitoring.exportMetrics(format);
        result = { 
          message: 'Metrics exported successfully',
          data: metrics,
          format
        };
        break;

      case 'trigger-health-check':
        result = await QuoteMonitoring.measureOperation(
          'manual_health_check',
          async () => QuoteMonitoring.getSystemHealthMetrics()
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing monitoring action:', error);
    
    QuoteMonitoring.recordMetric(
      'monitoring_action',
      0,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process monitoring action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}