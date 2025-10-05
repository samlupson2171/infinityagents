'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useFilterCache, useSearchCache } from '@/lib/hooks/useCache';
import { useToast } from '@/components/shared/Toast';
import {
  LoadingSpinner,
  LoadingOverlay,
} from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorBoundary';
import { apiCall } from '@/lib/retry-utils';

// Define ActivityCategory locally to avoid importing mongoose models on client
enum ActivityCategory {
  EXCURSION = 'excursion',
  SHOW = 'show',
  TRANSPORT = 'transport',
  DINING = 'dining',
  ADVENTURE = 'adventure',
  CULTURAL = 'cultural',
  NIGHTLIFE = 'nightlife',
  SHOPPING = 'shopping'
}
import VirtualActivityList from './VirtualActivityList';

interface Activity {
  _id: string;
  name: string;
  category: ActivityCategory;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: string;
  availableTo: string;
  duration: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}

interface SearchFilters {
  search: string;
  location: string;
  category: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchResponse {
  success: boolean;
  data?: {
    activities: Activity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      totalCount: number;
      appliedFilters: any;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

interface ActivitySearchProps {
  onActivitySelect?: (activity: Activity) => void;
  className?: string;
  enableVirtualScroll?: boolean;
  enableInfiniteScroll?: boolean;
}

export default function ActivitySearch({
  onActivitySelect,
  className = '',
  enableVirtualScroll = true,
  enableInfiniteScroll = false,
}: ActivitySearchProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
  } = useErrorHandler();
  const { showError, showSuccess } = useToast();

  // Use cached filter options
  const {
    locations,
    categories: rawCategories,
    isLoading: filtersLoading,
    error: filtersError,
  } = useFilterCache();

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    location: '',
    category: '',
    priceMin: '',
    priceMax: '',
    dateFrom: '',
    dateTo: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 500);

  // Transform categories for display
  const categories = useMemo(() => {
    if (!rawCategories) return [];

    const categoryIcons: Record<string, string> = {
      excursion: '🚌',
      show: '🎭',
      transport: '🚗',
      dining: '🍽️',
      adventure: '🏔️',
      cultural: '🏛️',
      nightlife: '🌙',
      shopping: '🛍️',
    };

    const categoryLabels: Record<string, string> = {
      excursion: 'Excursion',
      show: 'Show',
      transport: 'Transport',
      dining: 'Dining',
      adventure: 'Adventure',
      cultural: 'Cultural',
      nightlife: 'Nightlife',
      shopping: 'Shopping',
    };

    return rawCategories.map((category: any) => ({
      value: typeof category === 'string' ? category : category.value,
      label:
        typeof category === 'string'
          ? categoryLabels[category] || category
          : category.label,
      icon:
        typeof category === 'string'
          ? categoryIcons[category] || '📍'
          : category.icon,
    }));
  }, [rawCategories]);

  // Create search query object for caching
  const searchQuery = useMemo(
    () => ({
      search: debouncedSearch,
      location: filters.location,
      category: filters.category,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: currentPage,
      limit: 20,
    }),
    [debouncedSearch, filters, currentPage]
  );

  // Use cached search results
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
    mutate: mutateSearch,
  } = useSearchCache(
    searchQuery,
    async (query) => {
      const params = new URLSearchParams();

      Object.entries(query).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/activities?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    {
      enabled: !filtersLoading && !filtersError,
    }
  );

  // Update activities when search results change
  useEffect(() => {
    if (searchResults?.data) {
      if (enableInfiniteScroll && currentPage > 1) {
        // Append to existing activities for infinite scroll
        setActivities((prev) => [...prev, ...searchResults.data.activities]);
      } else {
        // Replace activities for regular pagination
        setActivities(searchResults.data.activities || []);
      }
      setPagination(
        searchResults.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        }
      );
    }
  }, [searchResults, currentPage, enableInfiniteScroll]);

  // Reset page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      if (enableInfiniteScroll) {
        setActivities([]); // Clear activities for infinite scroll
      }
    }
  }, [
    debouncedSearch,
    filters.location,
    filters.category,
    filters.priceMin,
    filters.priceMax,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // Load more for infinite scroll
  const loadMore = useCallback(() => {
    if (pagination.hasNext && !searchLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [pagination.hasNext, searchLoading]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      location: '',
      category: '',
      priceMin: '',
      priceMax: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
    setActivities([]);
    clearError();
  }, [clearError]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find((c: any) => c.value === category);
    return categoryData?.icon || '📍';
  };

  const getCategoryLabel = (category: string) => {
    const categoryData = categories.find((c: any) => c.value === category);
    return categoryData?.label || category;
  };

  return (
    <div className={className}>
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        {/* Search Header */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Search Activities
              </h2>
              <p className="text-gray-600">
                Find the perfect activities for your clients
              </p>
            </div>
            {(filters.search ||
              filters.location ||
              filters.category ||
              filters.priceMin ||
              filters.priceMax ||
              filters.dateFrom ||
              filters.dateTo) && (
              <button
                onClick={clearFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search Activities
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Location Filter */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location
              </label>
              <select
                id="location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Locations</option>
                {locations.map((location: string) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {`${category.icon} ${category.label}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range (EUR)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.priceMin}
                  onChange={(e) =>
                    handleFilterChange('priceMin', e.target.value)
                  }
                  placeholder="Min"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) =>
                    handleFilterChange('priceMax', e.target.value)
                  }
                  placeholder="Max"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Available To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 py-6">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {searchLoading || filtersLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Searching...
                  </div>
                ) : (
                  `${pagination.total} Activities Found`
                )}
              </h3>
              {pagination.total > 0 && !searchLoading && !filtersLoading && (
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{' '}
                  of {pagination.total} results
                </p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {(error || searchError || filtersError) && (
            <div className="mb-6">
              <ErrorDisplay
                error={error || searchError || filtersError}
                onRetry={() => mutateSearch()}
                onDismiss={clearError}
              />
            </div>
          )}

          {/* Activities List */}
          <LoadingOverlay
            isLoading={searchLoading || filtersLoading}
            message="Searching activities..."
          >
            {enableVirtualScroll ? (
              <VirtualActivityList
                activities={activities}
                onActivitySelect={onActivitySelect}
                onLoadMore={enableInfiniteScroll ? loadMore : undefined}
                hasNextPage={pagination.hasNext}
                isLoading={searchLoading}
                containerHeight={600}
                layout="grid"
              />
            ) : (
              <>
                {/* No Results */}
                {!searchLoading &&
                  !filtersLoading &&
                  activities.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Activities Found
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Try adjusting your search criteria or clearing filters.
                      </p>
                    </div>
                  )}

                {/* Regular Activities Grid */}
                {activities.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {activities.map((activity) => (
                        <div
                          key={activity._id}
                          className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                                <span className="mr-1">
                                  {getCategoryIcon(activity.category)}
                                </span>
                                {getCategoryLabel(activity.category)}
                              </span>
                              <span className="text-lg font-bold text-green-600">
                                {formatPrice(activity.pricePerPerson)}
                              </span>
                            </div>

                            <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                              {activity.name}
                            </h4>

                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {activity.location}
                            </div>

                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {activity.duration}
                            </div>

                            <div className="flex items-center text-sm text-gray-600 mb-4">
                              <svg
                                className="h-4 w-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              {activity.minPersons} - {activity.maxPersons}{' '}
                              persons
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                              {activity.description}
                            </p>

                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                Available:{' '}
                                {new Date(
                                  activity.availableFrom
                                ).toLocaleDateString()}{' '}
                                -{' '}
                                {new Date(
                                  activity.availableTo
                                ).toLocaleDateString()}
                              </div>
                              {onActivitySelect && (
                                <button
                                  onClick={() => onActivitySelect(activity)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                                >
                                  Add to Package
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination - only show if not using infinite scroll */}
                    {!enableInfiniteScroll && pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={!pagination.hasPrev}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>

                          <span className="px-3 py-2 text-sm text-gray-700">
                            Page {pagination.page} of {pagination.totalPages}
                          </span>

                          <button
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                            disabled={!pagination.hasNext}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>

                        <div className="text-sm text-gray-500">
                          {pagination.total} total activities
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </LoadingOverlay>
        </div>
      </div>
    </div>
  );
}
