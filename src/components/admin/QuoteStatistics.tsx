'use client';

import { useState, useEffect } from 'react';

interface QuoteStats {
  statusStats: {
    draft: number;
    sent: number;
    updated: number;
    total: number;
  };
  emailDeliveryStats: {
    pending: number;
    delivered: number;
    failed: number;
    total: number;
  };
  conversionStats: {
    totalQuotes: number;
    quotesWithInterest: number;
    conversionRate: number;
  };
  timeCounts: {
    thisMonth: number;
    thisWeek: number;
    last30Days: number;
  };
  quoteValues: {
    average: number;
    total: number;
    min: number;
    max: number;
  };
  packageDistribution: {
    superPackages: number;
    regularPackages: number;
    superPackageAvgValue: number;
    regularPackageAvgValue: number;
  };
  recentActivity: Array<{
    id: string;
    quoteReference: string;
    leadName: string;
    customerName: string;
    destination: string;
    totalPrice: number;
    currency: string;
    status: string;
    createdAt: string;
    createdBy: string;
    emailSent: boolean;
    bookingInterest: boolean;
  }>;
}

export default function QuoteStatistics() {
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/quotes/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch quote statistics');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    const symbols: { [key: string]: string } = {
      'GBP': '£',
      'EUR': '€',
      'USD': '$'
    };
    return `${symbols[currency] || currency}${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-orange-600 bg-orange-50';
      case 'sent': return 'text-green-600 bg-green-50';
      case 'updated': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'sent': return '✉️';
      case 'updated': return '🔄';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700">Error loading quote statistics: {error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quotes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.statusStats.total}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.timeCounts.thisMonth} this month
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.conversionStats.conversionRate}%</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.conversionStats.quotesWithInterest} of {stats.conversionStats.totalQuotes} quotes
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Value</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.quoteValues.average)}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Total: {formatCurrency(stats.quoteValues.total)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Email Success</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.emailDeliveryStats.total > 0 
                  ? Math.round((stats.emailDeliveryStats.delivered / stats.emailDeliveryStats.total) * 100)
                  : 0}%
              </p>
            </div>
            <div className="text-3xl">📧</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.emailDeliveryStats.delivered} delivered
          </div>
        </div>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats.statusStats).filter(([key]) => key !== 'total').map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getStatusIcon(status)}</span>
                  <span className="font-medium text-gray-700 capitalize">{status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {count}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({stats.statusStats.total > 0 ? Math.round((count / stats.statusStats.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Package Type Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Super Packages</div>
                <div className="text-sm text-gray-600">
                  Avg: {formatCurrency(Math.round(stats.packageDistribution.superPackageAvgValue))}
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.packageDistribution.superPackages}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Regular Packages</div>
                <div className="text-sm text-gray-600">
                  Avg: {formatCurrency(Math.round(stats.packageDistribution.regularPackageAvgValue))}
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.packageDistribution.regularPackages}
              </div>
            </div>
          </div>
        </div>

        {/* Email Delivery Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Delivery Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Delivered</span>
              <span className="text-green-600 font-semibold">{stats.emailDeliveryStats.delivered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Pending</span>
              <span className="text-orange-600 font-semibold">{stats.emailDeliveryStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Failed</span>
              <span className="text-red-600 font-semibold">{stats.emailDeliveryStats.failed}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-900">Total Sent</span>
                <span className="text-gray-900">{stats.emailDeliveryStats.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time-based Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">This Week</span>
              <span className="text-blue-600 font-semibold">{stats.timeCounts.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">This Month</span>
              <span className="text-green-600 font-semibold">{stats.timeCounts.thisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Last 30 Days</span>
              <span className="text-purple-600 font-semibold">{stats.timeCounts.last30Days}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quotes Activity Feed */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Quotes Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((quote) => (
              <div key={quote.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${
                        quote.status === 'sent' ? 'bg-green-500' :
                        quote.status === 'updated' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{quote.quoteReference}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-700">{quote.leadName}</span>
                        {quote.bookingInterest && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Interested
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quote.destination} • {formatCurrency(quote.totalPrice, quote.currency)} • 
                        Created by {quote.createdBy}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>No quotes created yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}