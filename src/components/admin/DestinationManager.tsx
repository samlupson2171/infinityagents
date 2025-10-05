'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useToast } from '@/components/shared/Toast';

interface DestinationListItem {
  _id: string;
  name: string;
  country: string;
  region: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  lastModified: string;
  createdBy: {
    name: string;
    email: string;
  };
  aiGenerated: boolean;
}

interface DestinationManagerProps {
  className?: string;
}

interface FilterState {
  status: string;
  country: string;
  region: string;
  search: string;
}

interface SortState {
  field: 'name' | 'country' | 'status' | 'lastModified' | 'publishedAt';
  direction: 'asc' | 'desc';
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export default function DestinationManager({ className = '' }: DestinationManagerProps) {
  const [destinations, setDestinations] = useState<DestinationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    country: '',
    region: '',
    search: ''
  });

  // Sort state
  const [sort, setSort] = useState<SortState>({
    field: 'lastModified',
    direction: 'desc'
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0
  });

  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    countries: [] as string[],
    regions: [] as string[]
  });

  // Fetch destinations
  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortField: sort.field,
        sortDirection: sort.direction,
        ...(filters.status && { status: filters.status }),
        ...(filters.country && { country: filters.country }),
        ...(filters.region && { region: filters.region }),
        ...(debouncedSearch && { search: debouncedSearch })
      });

      const response = await fetch(`/api/admin/destinations?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch destinations');
      }

      const data = await response.json();
      setDestinations(data.destinations);
      setPagination(prev => ({ ...prev, total: data.total }));
      
      // Update filter options if not already set
      if (filterOptions.countries.length === 0) {
        setFilterOptions({
          countries: data.filterOptions?.countries || [],
          regions: data.filterOptions?.regions || []
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters, debouncedSearch, filterOptions.countries.length]);

  // Effect to fetch destinations when dependencies change
  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle sort changes
  const handleSort = (field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Handle selection
  const handleSelectDestination = (id: string) => {
    setSelectedDestinations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDestinations.size === destinations.length) {
      setSelectedDestinations(new Set());
    } else {
      setSelectedDestinations(new Set(destinations.map(d => d._id)));
    }
  };

  // Bulk operations
  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedDestinations.size === 0) return;

    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedDestinations.size} destination(s)? This action cannot be undone.`
      : `Are you sure you want to ${action} ${selectedDestinations.size} destination(s)?`;

    if (!confirm(confirmMessage)) return;

    try {
      setBulkActionLoading(true);
      
      const response = await fetch('/api/admin/destinations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          destinationIds: Array.from(selectedDestinations)
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} destinations`);
      }

      const result = await response.json();
      
      setToast({
        message: `Successfully ${action}ed ${result.count} destination(s)`,
        type: 'success'
      });

      // Refresh the list
      await fetchDestinations();
      setSelectedDestinations(new Set());
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : `Failed to ${action} destinations`,
        type: 'error'
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge classes
  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'published':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'draft':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'archived':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destination Management</h1>
          <p className="text-gray-600">Manage and organize destination content</p>
        </div>
        <button
          onClick={() => window.location.href = '/admin/destinations/new'}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add New Destination
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search destinations..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Regions</option>
              {filterOptions.regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDestinations.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedDestinations.size} destination(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('publish')}
                disabled={bulkActionLoading}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('unpublish')}
                disabled={bulkActionLoading}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Unpublish
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDestinations}
              className="text-blue-600 hover:text-blue-800"
            >
              Try Again
            </button>
          </div>
        ) : !destinations || destinations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No destinations found</p>
            <button
              onClick={() => window.location.href = '/admin/destinations/new'}
              className="text-blue-600 hover:text-blue-800"
            >
              Create your first destination
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDestinations.size === destinations.length && destinations.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Name {sort.field === 'name' && (sort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('country')}
                  >
                    Country {sort.field === 'country' && (sort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Status {sort.field === 'status' && (sort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastModified')}
                  >
                    Last Modified {sort.field === 'lastModified' && (sort.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {destinations.map((destination) => (
                  <tr key={destination._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDestinations.has(destination._id)}
                        onChange={() => handleSelectDestination(destination._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {destination.name}
                          </div>
                          {destination.aiGenerated && (
                            <div className="text-xs text-purple-600 flex items-center mt-1">
                              <span className="mr-1">🤖</span>
                              AI Generated
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {destination.country}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {destination.region}
                    </td>
                    <td className="px-4 py-4">
                      <span className={getStatusBadge(destination.status)}>
                        {destination.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatDate(destination.lastModified)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{destination.createdBy.name}</div>
                        <div className="text-gray-500">{destination.createdBy.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.location.href = `/admin/destinations/${destination._id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => window.location.href = `/destinations/${destination.name.toLowerCase().replace(/\s+/g, '-')}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => window.location.href = `/admin/destinations/${destination._id}/duplicate`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{startItem}</span> to{' '}
                      <span className="font-medium">{endItem}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, pagination.page - 2)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === pagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}