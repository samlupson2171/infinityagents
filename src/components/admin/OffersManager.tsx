'use client';

import React, { useState, useEffect } from 'react';
import { IOffer } from '@/models/Offer';
import StandardizedOfferCreator from './StandardizedOfferCreator';

interface OfferWithId extends Omit<IOffer, '_id'> {
  _id: string;
  createdBy?: {
    _id: string;
    name: string;
    contactEmail: string;
  };
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalOffers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface OffersManagerProps {
  className?: string;
}

export default function OffersManager({ className = '' }: OffersManagerProps) {
  const [offers, setOffers] = useState<OfferWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  useEffect(() => {
    fetchOffers();
  }, [statusFilter, searchTerm, currentPage]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/offers?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch offers');
      }

      setOffers(data.data.offers);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async (offerData: any) => {
    try {
      console.log('Creating offer with data:', offerData);
      
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: offerData.resortName,
          description: offerData.description,
          inclusions: offerData.inclusions,
          isActive: true,
          // Clean up destination to match enum
          destination: offerData.destination?.toLowerCase().includes('albufeira') ? 'Albufeira' : 
                      offerData.destination?.toLowerCase().includes('benidorm') ? 'Benidorm' : 'Albufeira',
          currency: offerData.currency,
          flexiblePricing: offerData.pricing?.map(p => ({
            month: p.month,
            accommodationType: p.accommodationType || 'Apartment',
            nights: p.nights || 3,
            pax: p.pax || 8,
            price: p.price,
            currency: offerData.currency || 'EUR',
            isAvailable: true,
            specialPeriod: p.specialPeriod
          })) || [],
          // Add required metadata
          metadata: {
            currency: offerData.currency || 'EUR',
            season: '2026',
            lastUpdated: new Date(),
            importSource: 'Excel Upload',
            version: 1
          }
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: Failed to create offer`);
      }

      setShowCreateModal(false);
      fetchOffers();
    } catch (err) {
      console.error('Create offer error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      // Re-throw the error so the UnifiedOfferCreator can also handle it
      throw err;
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = (offer: OfferWithId) => {
    // TODO: Implement edit functionality
    console.log('Edit offer:', offer);
  };

  const openPreviewModal = (offer: OfferWithId) => {
    // TODO: Implement preview functionality
    console.log('Preview offer:', offer);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading offers...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Show unified creator when creating */}
      {showCreateModal ? (
        <StandardizedOfferCreator
          onSave={handleCreateOffer}
          onCancel={() => setShowCreateModal(false)}
        />
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Offers Management
              </h3>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Offer
              </button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(
                      e.target.value as 'all' | 'active' | 'inactive'
                    );
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Offers</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={fetchOffers}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
              </div>

              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search offers..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Offers Table */}
            {offers.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No offers found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? `No offers found matching "${searchTerm}".`
                    : statusFilter === 'all'
                      ? 'Get started by creating your first offer.'
                      : `No ${statusFilter} offers found.`}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Offer Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {offers.map((offer) => (
                      <tr key={offer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {offer.title}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {offer.description.length > 100
                                ? `${offer.description.substring(0, 100)}...`
                                : offer.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {offer.inclusions.length} inclusion
                              {offer.inclusions.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              offer.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {offer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {new Date(offer.createdAt).toLocaleDateString()}
                          </div>
                          {offer.createdBy && (
                            <div className="text-xs text-gray-400">
                              by {offer.createdBy.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openPreviewModal(offer)}
                              className="text-blue-600 hover:text-blue-900 px-2 py-1 text-sm"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => openEditModal(offer)}
                              className="text-indigo-600 hover:text-indigo-900 px-2 py-1 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
