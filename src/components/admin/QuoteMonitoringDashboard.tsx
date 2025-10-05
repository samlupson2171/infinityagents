'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Mail, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';

interface SystemHealthMetrics {
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

interface PerformanceAnalytics {
  totalOperations: number;
  avgDuration: number;
  successRate: number;
  errorRate: number;
  slowQueries: number;
  operationBreakdown: Record<string, {
    count: number;
    avgDuration: number;
    successRate: number;
    errors: string[];
  }>;
}

interface MonitoringData {
  systemHealth: SystemHealthMetrics;
  performanceAnalytics: PerformanceAnalytics;
  cacheStats: {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    hitRate: number;
  };
  timestamp: string;
}

export default function QuoteMonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [emailDeliveryData, setEmailDeliveryData] = useState<any[]>([]);
  const [errorData, setErrorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setRefreshing(true);
      
      const [overviewResponse, emailResponse, errorResponse] = await Promise.all([
        fetch('/api/admin/quotes/monitoring?type=overview'),
        fetch('/api/admin/quotes/monitoring?type=email-delivery&days=7'),
        fetch('/api/admin/quotes/monitoring?type=error-monitoring&hours=24')
      ]);

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setMonitoringData(overviewData.data);
      }

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        setEmailDeliveryData(emailData.data);
      }

      if (errorResponse.ok) {
        const errorData = await errorResponse.json();
        setErrorData(errorData.data);
      }

    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/admin/quotes/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' })
      });

      if (response.ok) {
        await fetchMonitoringData();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'delivered':
        return 'text-green-600';
      case 'error':
      case 'failed':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quote System Monitoring</h2>
          <p className="text-gray-600">
            System health, performance metrics, and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMonitoringData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
          >
            <Settings className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="email">Email Delivery</TabsTrigger>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {monitoringData && (
            <>
              {/* System Health Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Database</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(monitoringData.systemHealth.database.connectionStatus)}
                      <span className={`text-sm font-medium ${getStatusColor(monitoringData.systemHealth.database.connectionStatus)}`}>
                        {monitoringData.systemHealth.database.connectionStatus}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Response: {monitoringData.systemHealth.database.responseTime}ms
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connections: {monitoringData.systemHealth.database.activeConnections}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cache</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monitoringData.systemHealth.cache.hitRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hit Rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {monitoringData.systemHealth.cache.totalEntries} entries
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(monitoringData.systemHealth.cache.memoryUsage)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Email Delivery</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monitoringData.systemHealth.email.deliveryRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Success Rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {Math.round(monitoringData.systemHealth.email.avgDeliveryTime / 1000)}s
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quotes</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monitoringData.systemHealth.quotes.totalCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total Quotes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recent: {monitoringData.systemHealth.quotes.recentActivity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Conversion: {monitoringData.systemHealth.quotes.conversionRate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {monitoringData.performanceAnalytics.totalOperations}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Operations</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {monitoringData.performanceAnalytics.avgDuration}ms
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Duration</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {monitoringData.performanceAnalytics.successRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {monitoringData.performanceAnalytics.slowQueries}
                      </div>
                      <p className="text-sm text-muted-foreground">Slow Queries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {monitoringData && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(monitoringData.performanceAnalytics.operationBreakdown).map(([operation, stats]) => (
                    <div key={operation} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{operation}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stats.count} operations
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {stats.avgDuration.toFixed(0)}ms avg
                        </div>
                        <Badge variant={stats.successRate > 95 ? 'default' : 'destructive'}>
                          {stats.successRate.toFixed(1)}% success
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery Tracking (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {emailDeliveryData.length > 0 ? (
                <div className="space-y-4">
                  {emailDeliveryData.map((day, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{day._id.date}</h4>
                        <p className="text-sm text-muted-foreground">
                          {day.total} emails sent
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex space-x-2">
                          <Badge variant="default">
                            {day.delivered} delivered
                          </Badge>
                          {day.failed > 0 && (
                            <Badge variant="destructive">
                              {day.failed} failed
                            </Badge>
                          )}
                          {day.pending > 0 && (
                            <Badge variant="secondary">
                              {day.pending} pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {day.successRate.toFixed(1)}% success rate
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No email delivery data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {errorData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {errorData.errorRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {errorData.errorOperations} of {errorData.totalOperations} operations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Types</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Object.keys(errorData.errorBreakdown).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unique error types
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {errorData.recentErrors.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last 10 errors
                    </p>
                  </CardContent>
                </Card>
              </div>

              {Object.keys(errorData.errorBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Error Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(errorData.errorBreakdown).map(([error, details]: [string, any]) => (
                        <div key={error} className="p-3 border rounded">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-red-600">{error}</h4>
                            <Badge variant="destructive">{details.count} occurrences</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Last occurred: {new Date(details.lastOccurrence).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Operations: {details.operations.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {monitoringData && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(monitoringData.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}