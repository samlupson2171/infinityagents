'use client';

import { useState, useEffect } from 'react';
import QuoteForm from './QuoteForm';
import SimpleQuoteForm from './SimpleQuoteForm';
import QuoteEmailPreview from './QuoteEmailPreview';
import QuoteVersionHistory from './QuoteVersionHistory';

interface Quote {
  _id: string;
  enquiryId: {
    _id: string;
    leadName: string;
    agentEmail: string;
    resort?: string;
    departureDate: string;
  };
  leadName: string;
  hotelName: string;
  numberOfPeople: number;
  numberOfRooms: number;
  numberOfNights: number;
  arrivalDate: string;
  isSuperPackage: boolean;
  whatsIncluded: string;
  transferIncluded: boolean;
  activitiesIncluded?: string;
  totalPrice: number;
  currency: string;
  version: number;
  status: 'draft' | 'sent' | 'updated';
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  emailSent: boolean;
  emailSentAt?: string;
  emailDeliveryStatus?: 'pending' | 'delivered' | 'failed';
  emailMessageId?: string;
  internalNotes?: string;
  formattedPrice: string;
  quoteReference: string;
  bookingInterest?: {
    expressed: boolean;
    expressedAt?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    bookingUrgency?: string;
    additionalRequests?: string;
  };
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalQuotes: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface QuoteManagerProps {
  className?: string;
  initialEnquiryId?: string | null;
}

export default function QuoteManager({ className = '', initialEnquiryId }: QuoteManagerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailAnalytics, setShowEmailAnalytics] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewQuoteId, setPreviewQuoteId] = useState<string | null>(null);
  const [versionHistoryQuoteId, setVersionHistoryQuoteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'updated'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emailAnalytics, setEmailAnalytics] = useState<any>(null);
  const [bookingAnalytics, setBookingAnalytics] = useState<any>(null);
  const [showBookingAnalytics, setShowBookingAnalytics] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, searchTerm, currentPage]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(initialEnquiryId && { enquiryId: initialEnquiryId }),
      });

      const response = await fetch(`/api/admin/quotes?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch quotes');
      }

      setQuotes(data.data.quotes);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (quoteData: any) => {
    try {
      const response = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create quote');
      }

      setShowCreateModal(false);
      fetchQuotes();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  const handleUpdateQuote = async (quoteData: any) => {
    if (!selectedQuote) return;

    try {
      const response = await fetch(`/api/admin/quotes/${selectedQuote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update quote');
      }

      setShowEditModal(false);
      setSelectedQuote(null);
      fetchQuotes();
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(quoteId);
      const response = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete quote');
      }

      fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async (quoteId: string) => {
    try {
      setActionLoading(quoteId);
      const response = await fetch(`/api/admin/quotes/${quoteId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send email');
      }

      fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreviewEmail = (quoteId: string) => {
    setPreviewQuoteId(quoteId);
    setShowEmailPreview(true);
  };

  const handleViewVersionHistory = (quoteId: string) => {
    setVersionHistoryQuoteId(quoteId);
    setShowVersionHistory(true);
  };

  const handleSendTestEmail = async (quoteId: string) => {
    const testEmail = prompt('Enter email address for test:');
    if (!testEmail) return;

    try {
      setActionLoading(quoteId);
      const response = await fetch(`/api/admin/quotes/${quoteId}/send-test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send test email');
      }

      alert(`Test email sent successfully to ${testEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryEmail = async (quoteId: string) => {
    if (!confirm('Are you sure you want to retry sending this email?')) return;

    try {
      setActionLoading(quoteId);
      const response = await fetch(`/api/admin/quotes/${quoteId}/retry-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to retry email');
      }

      fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchEmailAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/quotes/email-analytics');
      const data = await response.json();

      if (response.ok) {
        setEmailAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch email analytics:', err);
    }
  };

  const fetchBookingAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/quotes/booking-analytics');
      const data = await response.json();

      if (response.ok) {
        setBookingAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch booking analytics:', err);
    }
  };

  useEffect(() => {
    if (showEmailAnalytics) {
      fetchEmailAnalytics();
    }
  }, [showEmailAnalytics]);

  useEffect(() => {
    if (showBookingAnalytics) {
      fetchBookingAnalytics();
    }
  }, [showBookingAnalytics]);

  const openDetailsModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDetailsModal(true);
  };

  const openEditModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setSelectedQuote(null);
    setShowDetailsModal(false);
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowEmailPreview(false);
    setShowVersionHistory(false);
    setPreviewQuoteId(null);
    setVersionHistoryQuoteId(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'updated':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Sent';
      case 'updated':
        return 'Updated';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading quotes...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Quote Management
              </h3>
              {initialEnquiryId && (
                <p className="text-sm text-blue-600 mt-1">
                  Showing quotes for enquiry: {initialEnquiryId}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchQuotes}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowEmailAnalytics(!showEmailAnalytics)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Email Analytics
              </button>
              <button
                onClick={() => setShowBookingAnalytics(!showBookingAnalytics)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Booking Analytics
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Quote
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by lead name, hotel, or notes..."
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="updated">Updated</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Email Analytics Panel */}
          {showEmailAnalytics && emailAnalytics && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">📊 Email Analytics (Last 30 Days)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{emailAnalytics.summary.emailsSent}</div>
                  <div className="text-sm text-blue-800">Emails Sent</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{emailAnalytics.summary.successRate}%</div>
                  <div className="text-sm text-green-800">Success Rate</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{emailAnalytics.summary.emailsFailed}</div>
                  <div className="text-sm text-red-800">Failed Emails</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{emailAnalytics.summary.emailsPending}</div>
                  <div className="text-sm text-yellow-800">Pending Emails</div>
                </div>
              </div>

              {emailAnalytics.recentFailures.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-900 mb-2">Recent Email Failures</h5>
                  <div className="space-y-2">
                    {emailAnalytics.recentFailures.slice(0, 5).map((failure: any) => (
                      <div key={failure._id} className="text-sm text-red-800">
                        <span className="font-medium">{failure.quoteReference}</span> - {failure.leadName}
                        <span className="text-red-600 ml-2">
                          ({failure.emailSentAt ? new Date(failure.emailSentAt).toLocaleDateString() : 'Unknown date'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Analytics Panel */}
          {showBookingAnalytics && bookingAnalytics && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">📈 Booking Conversion Analytics (Last 30 Days)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{bookingAnalytics.summary.totalQuotes}</div>
                  <div className="text-sm text-blue-800">Total Quotes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{bookingAnalytics.summary.quotesWithBookingInterest}</div>
                  <div className="text-sm text-green-800">Booking Interests</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{bookingAnalytics.summary.conversionRate}%</div>
                  <div className="text-sm text-purple-800">Conversion Rate</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    £{bookingAnalytics.summary.potentialRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-yellow-800">Potential Revenue</div>
                </div>
              </div>

              {/* Urgency Breakdown */}
              {bookingAnalytics.breakdowns.urgency.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-3">Booking Urgency Breakdown</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {bookingAnalytics.breakdowns.urgency.map((item: any) => (
                      <div key={item._id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {item._id?.replace('-', ' ') || 'Not specified'}
                        </div>
                        <div className="text-lg font-bold text-gray-700">{item.count}</div>
                        <div className="text-xs text-gray-500">
                          £{item.totalValue.toLocaleString()} total value
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Booking Interests */}
              {bookingAnalytics.recentBookingInterests.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">Recent Booking Interests</h5>
                  <div className="space-y-2">
                    {bookingAnalytics.recentBookingInterests.slice(0, 5).map((interest: any) => (
                      <div key={interest._id} className="text-sm text-green-800">
                        <span className="font-medium">{interest.quoteReference}</span> - {interest.leadName}
                        <span className="text-green-600 ml-2">
                          (£{interest.totalPrice.toLocaleString()} - {interest.bookingInterest.bookingUrgency})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quotes Table */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enquiry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No quotes found
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote) => (
                    <tr key={quote._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {quote.quoteReference}
                          </div>
                          <div className="text-sm text-gray-500">
                            {quote.leadName} • {quote.hotelName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {quote.numberOfPeople} people • {quote.numberOfNights} nights
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {quote.enquiryId.leadName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quote.enquiryId.agentEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {quote.formattedPrice}
                        </div>
                        <div className="text-xs text-gray-500">
                          v{quote.version}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </span>
                        {quote.emailSent && (
                          <div className="text-xs mt-1">
                            {quote.emailDeliveryStatus === 'delivered' && (
                              <span className="text-green-600">✓ Email delivered</span>
                            )}
                            {quote.emailDeliveryStatus === 'failed' && (
                              <span className="text-red-600">✗ Email failed</span>
                            )}
                            {quote.emailDeliveryStatus === 'pending' && (
                              <span className="text-yellow-600">⏳ Email pending</span>
                            )}
                          </div>
                        )}
                        {quote.bookingInterest?.expressed && (
                          <div className="text-xs text-purple-600 mt-1">
                            🎯 Booking interest expressed
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{formatDate(quote.createdAt)}</div>
                        <div className="text-xs">{quote.createdBy.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openDetailsModal(quote)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(quote)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Quote"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handlePreviewEmail(quote._id)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Preview Email"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleViewVersionHistory(quote._id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Version History"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleSendTestEmail(quote._id)}
                            disabled={actionLoading === quote._id}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                            title="Send Test Email"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h2V3H9zm0 3v9h2V6H9z" />
                            </svg>
                          </button>
                          {(quote.status === 'draft' || quote.status === 'updated') && (
                            <button
                              onClick={() => handleSendEmail(quote._id)}
                              disabled={actionLoading === quote._id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Send Email"
                            >
                              {actionLoading === quote._id ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          )}
                          {quote.emailSent && quote.emailDeliveryStatus === 'failed' && (
                            <button
                              onClick={() => handleRetryEmail(quote._id)}
                              disabled={actionLoading === quote._id}
                              className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                              title="Retry Email"
                            >
                              {actionLoading === quote._id ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteQuote(quote._id)}
                            disabled={actionLoading === quote._id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Delete Quote"
                          >
                            {actionLoading === quote._id ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalQuotes} total quotes)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Quote</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SimpleQuoteForm
              onSubmit={handleCreateQuote}
              onCancel={closeModals}
              initialEnquiryId={initialEnquiryId}
            />
          </div>
        </div>
      )}

      {/* Edit Quote Modal */}
      {showEditModal && selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Quote</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <QuoteForm
              initialData={{
                enquiryId: selectedQuote.enquiryId._id,
                leadName: selectedQuote.leadName,
                hotelName: selectedQuote.hotelName,
                numberOfPeople: selectedQuote.numberOfPeople,
                numberOfRooms: selectedQuote.numberOfRooms,
                numberOfNights: selectedQuote.numberOfNights,
                arrivalDate: selectedQuote.arrivalDate.split('T')[0],
                isSuperPackage: selectedQuote.isSuperPackage,
                whatsIncluded: selectedQuote.whatsIncluded,
                transferIncluded: selectedQuote.transferIncluded,
                activitiesIncluded: selectedQuote.activitiesIncluded || '',
                totalPrice: selectedQuote.totalPrice,
                currency: selectedQuote.currency as 'GBP' | 'EUR' | 'USD',
                internalNotes: selectedQuote.internalNotes || '',
              }}
              onSubmit={handleUpdateQuote}
              onCancel={closeModals}
              isEditing={true}
            />
          </div>
        </div>
      )}

      {/* Quote Details Modal */}
      {showDetailsModal && selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Quote Details</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedQuote.quoteReference}</h4>
                    <p className="text-sm text-gray-600">Version {selectedQuote.version}</p>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedQuote.status)}`}>
                    {getStatusLabel(selectedQuote.status)}
                  </span>
                </div>
              </div>

              {/* Quote Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Lead Information</h5>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-700">Lead Name:</dt>
                      <dd className="text-gray-900">{selectedQuote.leadName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Hotel:</dt>
                      <dd className="text-gray-900">{selectedQuote.hotelName}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Trip Details</h5>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-700">People:</dt>
                      <dd className="text-gray-900">{selectedQuote.numberOfPeople}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Rooms:</dt>
                      <dd className="text-gray-900">{selectedQuote.numberOfRooms}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Nights:</dt>
                      <dd className="text-gray-900">{selectedQuote.numberOfNights}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">Arrival:</dt>
                      <dd className="text-gray-900">{formatDate(selectedQuote.arrivalDate)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Package Details */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Package Details</h5>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">What's Included:</span>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{selectedQuote.whatsIncluded}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {selectedQuote.isSuperPackage && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Super Package
                      </span>
                    )}
                    {selectedQuote.transferIncluded && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Transfer Included
                      </span>
                    )}
                  </div>

                  {selectedQuote.activitiesIncluded && (
                    <div className="mt-3">
                      <span className="text-sm font-medium text-gray-700">Activities:</span>
                      <p className="text-sm text-gray-900 mt-1">{selectedQuote.activitiesIncluded}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Pricing</h5>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{selectedQuote.formattedPrice}</div>
                  <div className="text-sm text-blue-700 mt-1">
                    {(selectedQuote.totalPrice / selectedQuote.numberOfPeople).toLocaleString('en-GB', {
                      style: 'currency',
                      currency: selectedQuote.currency
                    })} per person
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              {selectedQuote.internalNotes && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3">Internal Notes</h5>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedQuote.internalNotes}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-4">
                <h5 className="font-medium text-gray-900 mb-3">Quote Information</h5>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Created:</dt>
                    <dd className="text-gray-900">{formatDateTime(selectedQuote.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Created By:</dt>
                    <dd className="text-gray-900">{selectedQuote.createdBy.name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Last Updated:</dt>
                    <dd className="text-gray-900">{formatDateTime(selectedQuote.updatedAt)}</dd>
                  </div>
                  {selectedQuote.emailSent && selectedQuote.emailSentAt && (
                    <div>
                      <dt className="font-medium text-gray-700">Email Sent:</dt>
                      <dd className="text-gray-900">{formatDateTime(selectedQuote.emailSentAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && previewQuoteId && (
        <QuoteEmailPreview
          quoteId={previewQuoteId}
          onClose={() => {
            setShowEmailPreview(false);
            setPreviewQuoteId(null);
          }}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistory && versionHistoryQuoteId && (
        <QuoteVersionHistory
          quoteId={versionHistoryQuoteId}
          onClose={() => {
            setShowVersionHistory(false);
            setVersionHistoryQuoteId(null);
          }}
        />
      )}
    </div>
  );
}