'use client';

import { useMemo, useCallback } from 'react';
import {
  useVirtualScroll,
  useInfiniteScroll,
} from '@/lib/hooks/useVirtualScroll';
import { LazyImage } from '@/components/shared/LazyImage';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
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

interface VirtualActivityListProps {
  activities: Activity[];
  onActivitySelect?: (activity: Activity) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  itemHeight?: number;
  containerHeight?: number;
  layout?: 'grid' | 'list';
}

const ITEM_HEIGHT = 280; // Height of each activity card
const CONTAINER_HEIGHT = 600; // Height of the scrollable container

/**
 * Virtualized activity list component for handling large datasets efficiently
 * Only renders visible items to maintain performance
 */
export default function VirtualActivityList({
  activities,
  onActivitySelect,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
  itemHeight = ITEM_HEIGHT,
  containerHeight = CONTAINER_HEIGHT,
  layout = 'grid',
}: VirtualActivityListProps) {
  const {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollElementProps,
    getItemProps,
  } = useVirtualScroll(activities, {
    itemHeight,
    containerHeight,
    overscan: 3,
  });

  const { handleScroll: handleInfiniteScroll, isFetching } = useInfiniteScroll(
    hasNextPage,
    isLoading,
    onLoadMore || (() => {}),
    100
  );

  // Combine scroll handlers
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      scrollElementProps.onScroll(e);
      if (onLoadMore) {
        handleInfiniteScroll(e);
      }
    },
    [scrollElementProps.onScroll, handleInfiniteScroll, onLoadMore]
  );

  // Get visible activities
  const visibleActivities = useMemo(() => {
    return activities.slice(startIndex, endIndex + 1);
  }, [activities, startIndex, endIndex]);

  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    const icons: Record<string, string> = {
      excursion: '🚌',
      show: '🎭',
      transport: '🚗',
      dining: '🍽️',
      adventure: '🏔️',
      cultural: '🏛️',
      nightlife: '🌙',
      shopping: '🛍️',
    };
    return icons[category] || '📍';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      excursion: 'Excursion',
      show: 'Show',
      transport: 'Transport',
      dining: 'Dining',
      adventure: 'Adventure',
      cultural: 'Cultural',
      nightlife: 'Nightlife',
      shopping: 'Shopping',
    };
    return labels[category] || category;
  }, []);

  if (activities.length === 0 && !isLoading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Activities Found
        </h3>
        <p className="text-gray-500">Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Virtual scroll container */}
      <div
        {...scrollElementProps}
        onScroll={handleScroll}
        className="relative border border-gray-200 rounded-lg"
        style={{
          ...scrollElementProps.style,
          height: containerHeight,
        }}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items container */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {layout === 'grid' ? (
              // Grid layout
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {visibleActivities.map((activity, index) => (
                  <ActivityCard
                    key={activity._id}
                    activity={activity}
                    onSelect={onActivitySelect}
                    formatPrice={formatPrice}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    style={getItemProps(index).style}
                  />
                ))}
              </div>
            ) : (
              // List layout
              <div className="space-y-4 p-4">
                {visibleActivities.map((activity, index) => (
                  <ActivityListItem
                    key={activity._id}
                    activity={activity}
                    onSelect={onActivitySelect}
                    formatPrice={formatPrice}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    style={getItemProps(index).style}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading indicator for infinite scroll */}
        {(isLoading || isFetching) && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600">
                Loading more activities...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {startIndex + 1}-{Math.min(endIndex + 1, activities.length)} of{' '}
        {activities.length} activities
        {hasNextPage && <span className="ml-2">• More available</span>}
      </div>
    </div>
  );
}

/**
 * Activity card component for grid layout
 */
function ActivityCard({
  activity,
  onSelect,
  formatPrice,
  getCategoryIcon,
  getCategoryLabel,
  style,
}: {
  activity: Activity;
  onSelect?: (activity: Activity) => void;
  formatPrice: (price: number) => string;
  getCategoryIcon: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <span className="mr-1">{getCategoryIcon(activity.category)}</span>
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
          {activity.minPersons} - {activity.maxPersons} persons
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {activity.description}
        </p>

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Available: {new Date(activity.availableFrom).toLocaleDateString()} -{' '}
            {new Date(activity.availableTo).toLocaleDateString()}
          </div>
          {onSelect && (
            <button
              onClick={() => onSelect(activity)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Add to Package
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Activity list item component for list layout
 */
function ActivityListItem({
  activity,
  onSelect,
  formatPrice,
  getCategoryIcon,
  getCategoryLabel,
  style,
}: {
  activity: Activity;
  onSelect?: (activity: Activity) => void;
  formatPrice: (price: number) => string;
  getCategoryIcon: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 mr-4">
              <span className="mr-1">{getCategoryIcon(activity.category)}</span>
              {getCategoryLabel(activity.category)}
            </span>
            <span className="text-lg font-bold text-green-600">
              {formatPrice(activity.pricePerPerson)}
            </span>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mb-2">
            {activity.name}
          </h4>

          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
            <div className="flex items-center">
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

            <div className="flex items-center">
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

            <div className="flex items-center">
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
              {activity.minPersons} - {activity.maxPersons} persons
            </div>
          </div>

          <p className="text-gray-600 mb-3 line-clamp-2">
            {activity.description}
          </p>

          <div className="text-xs text-gray-500">
            Available: {new Date(activity.availableFrom).toLocaleDateString()} -{' '}
            {new Date(activity.availableTo).toLocaleDateString()}
          </div>
        </div>

        {onSelect && (
          <button
            onClick={() => onSelect(activity)}
            className="ml-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Add to Package
          </button>
        )}
      </div>
    </div>
  );
}
