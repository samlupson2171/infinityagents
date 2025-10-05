'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Quote {
  id: string;
  quoteReference: string;
  leadName: string;
  hotelName: string;
  customerName: string;
  customerEmail: string;
  destination: string;
  numberOfPeople: number;
  numberOfRooms: number;
  numberOfNights: number;
  arrivalDate: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  status: string;
  isSuperPackage: boolean;
  transferIncluded: boolean;
  emailSent: boolean;
  emailSentAt?: string;
  emailDeliveryStatus?: string;
  bookingInterest: boolean;
  bookingInterestDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  version: number;
  whatsIncluded: string;
  activitiesIncluded: string;
  internalNotes?: string;
}

interface SearchFilters {
  q: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
  emailStatus: string;
  bookingInterest: string;
  isSuperPackage: string;
  createdBy: string;
}

interface SearchResponse {
  quotes: Quote[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
  filters: SearchFilters;
  sort: {
    sortBy: string;
    sortOrder: string;
  };
}

export default function QuoteSearchAndFilter() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    q: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minPrice: '',
    maxPrice: '',
    emailStatus: '',
    bookingInterest: '',
    isSuperPackage: '',
    createdBy: ''
  });

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(filters.q, 500);

  // Perform search
  const performSearch = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/quotes/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to search quotes');
      }

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
        setCurrentPage(page);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  // Effect to trigger search when filters change
  useEffect(() => {
    performSearch(1);
  }, [debouncedQuery, filters.status, filters.dateFrom, filters.dateTo, 
      filters.minPrice, filters.maxPrice, filters.emailStatus, 
      filters.bookingInterest, filters.isSuperPackage, filters.createdBy, 
      sortBy, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      q: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minPrice: '',
      maxPrice: '',
      emailStatus: '',
      bookingInterest: '',
      isSuperPackage: '',
      createdBy: ''
    });
    setCurrentPage(1);
  };

  // Export quotes
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      setExporting(true);

      const searchParams = new URLSearchParams({
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/quotes/export?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to export quotes');
      }

      if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotes-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotes-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-orange-100 text-orange-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmailStatusColor = (status?: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Quote Search & Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Search, filter, and export quotes with advanced criteria
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div className="relative">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search quotes by lead name, hotel, inclusions, activities, or notes..."
            value={filters.q}
            onChange={(e) => handleFilterChange('q', e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="updated">Updated</option>
                </select>
              </div>

              {/* Email Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Status</label>
                <select
                  value={filters.emailStatus}
                  onChange={(e) => handleFilterChange('emailStatus', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Email Statuses</option>
                  <option value="not_sent">Not Sent</option>
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Booking Interest Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Interest</label>
                <select
                  value={filters.bookingInterest}
                  onChange={(e) => handleFilterChange('bookingInterest', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All</option>
                  <option value="true">Interested</option>
                  <option value="false">Not Interested</option>
                </select>
              </div>

              {/* Super Package Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Type</label>
                <select
                  value={filters.isSuperPackage}
                  onChange={(e) => handleFilterChange('isSuperPackage', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Packages</option>
                  <option value="true">Super Packages</option>
                  <option value="false">Regular Packages</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Min Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Max Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear all filters
              </button>
              <div className="text-sm text-gray-600">
                {searchResults && (
                  <>Showing {searchResults.quotes.length} of {searchResults.pagination.totalCount} quotes</>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700">Error: {error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Searching quotes...</span>
          </div>
        </div>
      )}

      {searchResults && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Results Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Search Results ({searchResults.pagination.totalCount})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Page {searchResults.pagination.currentPage} of {searchResults.pagination.totalPages}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="updatedAt">Updated Date</option>
                  <option value="totalPrice">Price</option>
                  <option value="leadName">Lead Name</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-sm text-gray-600 hover:text-gray-800 p-1"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quote.quoteReference}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quote.leadName}
                        </div>
                        {quote.isSuperPackage && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                            Super Package
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quote.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quote.destination}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {quote.numberOfPeople} people, {quote.numberOfRooms} rooms
                      </div>
                      <div className="text-sm text-gray-500">
                        {quote.numberOfNights} nights • {quote.hotelName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {quote.formattedPrice}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {quote.emailSent ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEmailStatusColor(quote.emailDeliveryStatus)}`}>
                          {quote.emailDeliveryStatus || 'sent'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          not sent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {quote.bookingInterest ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Interested
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quote.createdBy.name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {searchResults.pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((searchResults.pagination.currentPage - 1) * searchResults.pagination.limit) + 1} to{' '}
                  {Math.min(searchResults.pagination.currentPage * searchResults.pagination.limit, searchResults.pagination.totalCount)} of{' '}
                  {searchResults.pagination.totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => performSearch(currentPage - 1)}
                    disabled={!searchResults.pagination.hasPrevPage}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {searchResults.pagination.currentPage} of {searchResults.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => performSearch(currentPage + 1)}
                    disabled={!searchResults.pagination.hasNextPage}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.quotes.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or clearing some filters.
              </p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}