'use client';

import { Offer } from '@/models/Offer';

interface OfferWithId extends Omit<Offer, '_id'> {
  _id: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}

interface OfferCardProps {
  offer: OfferWithId;
  className?: string;
  onViewDetails?: (offer: OfferWithId) => void;
}

export default function OfferCard({
  offer,
  className = '',
  onViewDetails,
}: OfferCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 className="text-xl font-semibold text-white mb-1">{offer.title}</h3>
        <p className="text-blue-100 text-sm">
          Added {formatDate(offer.createdAt)}
          {offer.createdBy && ` by ${offer.createdBy.name}`}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Description */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">
            {offer.description.length > 150
              ? `${offer.description.substring(0, 150)}...`
              : offer.description}
          </p>
        </div>

        {/* Inclusions */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
            What's Included
          </h4>
          <div className="space-y-2">
            {offer.inclusions.slice(0, 4).map((inclusion, index) => (
              <div
                key={index}
                className="flex items-center text-sm text-gray-600"
              >
                <svg
                  className="h-4 w-4 text-green-500 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{inclusion}</span>
              </div>
            ))}
            {offer.inclusions.length > 4 && (
              <div className="text-sm text-gray-500 italic">
                +{offer.inclusions.length - 4} more inclusion
                {offer.inclusions.length - 4 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
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
            <span>Updated {formatDate(offer.updatedAt)}</span>
          </div>

          {onViewDetails && (
            <button
              onClick={() => onViewDetails(offer)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              View Details
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
              <circle cx={4} cy={4} r={3} />
            </svg>
            Active Offer
          </span>

          <div className="text-xs text-gray-400">
            {offer.inclusions.length} inclusion
            {offer.inclusions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
