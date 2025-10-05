'use client';

import { useState, useEffect } from 'react';
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
  isAvailable?: boolean;
  daysUntilStart?: number;
  daysUntilEnd?: number;
}

interface ActivityDetailsProps {
  activityId: string;
  onAddToPackage?: (activity: Activity, quantity: number) => void;
  onClose?: () => void;
  className?: string;
}

const categoryInfo = {
  [ActivityCategory.EXCURSION]: {
    label: 'Excursions',
    icon: '🏖️',
    color: 'bg-blue-100 text-blue-800',
  },
  [ActivityCategory.SHOW]: {
    label: 'Shows & Entertainment',
    icon: '🎭',
    color: 'bg-purple-100 text-purple-800',
  },
  [ActivityCategory.TRANSPORT]: {
    label: 'Transportation',
    icon: '🚗',
    color: 'bg-gray-100 text-gray-800',
  },
  [ActivityCategory.DINING]: {
    label: 'Dining & Food',
    icon: '🍽️',
    color: 'bg-yellow-100 text-yellow-800',
  },
  [ActivityCategory.ADVENTURE]: {
    label: 'Adventure Sports',
    icon: '🏔️',
    color: 'bg-green-100 text-green-800',
  },
  [ActivityCategory.CULTURAL]: {
    label: 'Cultural Experiences',
    icon: '🏛️',
    color: 'bg-indigo-100 text-indigo-800',
  },
  [ActivityCategory.NIGHTLIFE]: {
    label: 'Nightlife & Bars',
    icon: '🍸',
    color: 'bg-pink-100 text-pink-800',
  },
  [ActivityCategory.SHOPPING]: {
    label: 'Shopping & Markets',
    icon: '🛍️',
    color: 'bg-red-100 text-red-800',
  },
};

export default function ActivityDetails({
  activityId,
  onAddToPackage,
  onClose,
  className = '',
}: ActivityDetailsProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedPersons, setSelectedPersons] = useState(2);

  useEffect(() => {
    if (activityId) {
      fetchActivityDetails();
    }
  }, [activityId]);

  const fetchActivityDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activities/${activityId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setActivity(data.data);
        setSelectedPersons(Math.max(data.data.minPersons, 2));
      } else {
        setError(data.error?.message || 'Failed to load activity details');
      }
    } catch (error) {
      setError('Network error occurred while loading activity details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryInfo = (category: ActivityCategory) => {
    return (
      categoryInfo[category] || {
        label: category,
        icon: '📍',
        color: 'bg-gray-100 text-gray-800',
      }
    );
  };

  const calculateTotalCost = () => {
    if (!activity) return 0;
    return activity.pricePerPerson * quantity * selectedPersons;
  };

  const handleAddToPackage = () => {
    if (activity && onAddToPackage) {
      onAddToPackage(activity, quantity);
    }
  };

  const getAvailabilityStatus = () => {
    if (!activity) return null;

    if (activity.isAvailable) {
      return {
        status: 'available',
        text: 'Available Now',
        color: 'bg-green-100 text-green-800',
        icon: '✅',
      };
    } else if (activity.daysUntilStart && activity.daysUntilStart > 0) {
      return {
        status: 'upcoming',
        text: `Available in ${activity.daysUntilStart} days`,
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏳',
      };
    } else {
      return {
        status: 'unavailable',
        text: 'No longer available',
        color: 'bg-red-100 text-red-800',
        icon: '❌',
      };
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-white shadow-lg rounded-lg border border-gray-200 ${className}`}
      >
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-2 text-gray-600">
            Loading activity details...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white shadow-lg rounded-lg border border-gray-200 ${className}`}
      >
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Activity
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchActivityDetails}
                  className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return null;
  }

  const categoryData = getCategoryInfo(activity.category);
  const availabilityStatus = getAvailabilityStatus();

  return (
    <div
      className={`bg-white shadow-lg rounded-lg border border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${categoryData.color}`}
              >
                <span className="mr-1">{categoryData.icon}</span>
                {categoryData.label}
              </span>
              {availabilityStatus && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availabilityStatus.color}`}
                >
                  <span className="mr-1">{availabilityStatus.icon}</span>
                  {availabilityStatus.text}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activity.name}
            </h1>
            <div className="flex items-center text-gray-600 space-x-4">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 mr-1"
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
                  className="h-5 w-5 mr-1"
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
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Description
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {activity.description}
              </p>
            </div>

            {/* Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Activity Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
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
                    <span className="font-medium text-gray-900">
                      Group Size
                    </span>
                  </div>
                  <p className="text-gray-700">
                    {activity.minPersons} - {activity.maxPersons} persons
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                    <span className="font-medium text-gray-900">
                      Price per Person
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(activity.pricePerPerson)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-4-6V3"
                      />
                    </svg>
                    <span className="font-medium text-gray-900">
                      Available From
                    </span>
                  </div>
                  <p className="text-gray-700">
                    {formatDate(activity.availableFrom)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="h-5 w-5 text-gray-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-4-6V3"
                      />
                    </svg>
                    <span className="font-medium text-gray-900">
                      Available Until
                    </span>
                  </div>
                  <p className="text-gray-700">
                    {formatDate(activity.availableTo)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            {activity.createdBy && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Additional Information
                </h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    This activity was added by {activity.createdBy.name} on{' '}
                    {formatDate(activity.createdAt)}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking Widget */}
          {onAddToPackage && (
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Add to Package
                </h3>

                {/* Quantity Selection */}
                <div className="mb-4">
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Quantity
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Persons Selection */}
                <div className="mb-4">
                  <label
                    htmlFor="persons"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Number of Persons
                  </label>
                  <select
                    id="persons"
                    value={selectedPersons}
                    onChange={(e) =>
                      setSelectedPersons(parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {Array.from(
                      { length: activity.maxPersons - activity.minPersons + 1 },
                      (_, i) => activity.minPersons + i
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num} persons
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cost Calculation */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Price per person:</span>
                      <span>{formatPrice(activity.pricePerPerson)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Persons:</span>
                      <span>{selectedPersons}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span className="text-green-600">
                        {formatPrice(calculateTotalCost())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add to Package Button */}
                <button
                  onClick={handleAddToPackage}
                  disabled={!activity.isAvailable}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {activity.isAvailable ? 'Add to Package' : 'Not Available'}
                </button>

                {!activity.isAvailable && availabilityStatus && (
                  <p className="mt-2 text-sm text-gray-600 text-center">
                    {availabilityStatus.text}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
