'use client';

import { Offer } from '@/models/Offer';

interface OfferWithId extends Omit<Offer, '_id'> {
  _id: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}

interface OfferDetailsProps {
  offer: OfferWithId;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfferDetails({
  offer,
  isOpen,
  onClose,
}: OfferDetailsProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {offer.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Added {formatDate(offer.createdAt)}
                {offer.createdBy && ` by ${offer.createdBy.name}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 8 8"
              >
                <circle cx={4} cy={4} r={3} />
              </svg>
              Active Offer
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Description
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {offer.description}
              </p>
            </div>
          </div>

          {/* Inclusions */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              What's Included
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offer.inclusions.map((inclusion, index) => (
                  <div key={index} className="flex items-center text-gray-700">
                    <svg
                      className="h-5 w-5 text-green-500 mr-3 flex-shrink-0"
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
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Offer Information
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(offer.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(offer.updatedAt)}
                  </p>
                </div>
                {offer.createdBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created By
                    </label>
                    <p className="text-sm text-gray-900">
                      {offer.createdBy.name}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Inclusions
                  </label>
                  <p className="text-sm text-gray-900">
                    {offer.inclusions.length} item
                    {offer.inclusions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Copy offer details to clipboard
                const offerText = `${offer.title}\n\n${offer.description}\n\nInclusions:\n${offer.inclusions.map((inc) => `• ${inc}`).join('\n')}`;
                navigator.clipboard.writeText(offerText);
              }}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Copy Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
