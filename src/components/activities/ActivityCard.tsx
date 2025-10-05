'use client';

// Define interfaces locally to avoid importing mongoose models on client
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

interface IActivity {
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
  updatedAt: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}
import { AvailabilityStatus } from './AvailabilityIndicator';
import { checkActivityAvailability } from '@/lib/availability-utils';

interface ActivityCardProps {
  activity: IActivity;
  onAddToPackage?: (activity: IActivity) => void;
  onViewDetails?: (activity: IActivity) => void;
  className?: string;
}

const categoryInfo = {
  [ActivityCategory.EXCURSION]: { label: 'Excursions', icon: '🏖️' },
  [ActivityCategory.SHOW]: { label: 'Shows & Entertainment', icon: '🎭' },
  [ActivityCategory.TRANSPORT]: { label: 'Transportation', icon: '🚗' },
  [ActivityCategory.DINING]: { label: 'Dining & Food', icon: '🍽️' },
  [ActivityCategory.ADVENTURE]: { label: 'Adventure Sports', icon: '🏔️' },
  [ActivityCategory.CULTURAL]: { label: 'Cultural Experiences', icon: '🏛️' },
  [ActivityCategory.NIGHTLIFE]: { label: 'Nightlife & Bars', icon: '🍸' },
  [ActivityCategory.SHOPPING]: { label: 'Shopping & Markets', icon: '🛍️' },
};

export default function ActivityCard({
  activity,
  onAddToPackage,
  onViewDetails,
  className = '',
}: ActivityCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getCategoryInfo = (category: ActivityCategory) => {
    return categoryInfo[category] || { label: category, icon: '📍' };
  };

  const categoryData = getCategoryInfo(activity.category);
  const availabilityCheck = checkActivityAvailability(activity);
  const available = availabilityCheck.isAvailable;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="p-6">
        {/* Header with category and price */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
            <span className="mr-1">{categoryData.icon}</span>
            {categoryData.label}
          </span>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {formatPrice(activity.pricePerPerson)}
            </div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
        </div>

        {/* Activity name */}
        <h4 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
          {activity.name}
        </h4>

        {/* Activity details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-2 flex-shrink-0"
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

          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-2 flex-shrink-0"
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

          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="h-4 w-4 mr-2 flex-shrink-0"
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

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {activity.description}
        </p>

        {/* Availability status */}
        <div className="mb-4">
          <AvailabilityStatus activity={activity} />
        </div>

        {/* Availability dates */}
        <div className="text-xs text-gray-500 mb-4">
          Available: {activity.availableFrom.toLocaleDateString()} -{' '}
          {activity.availableTo.toLocaleDateString()}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center space-x-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(activity)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              View Details
            </button>
          )}
          {onAddToPackage && (
            <button
              onClick={() => onAddToPackage(activity)}
              disabled={!available}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {available ? 'Add to Package' : 'Not Available'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
