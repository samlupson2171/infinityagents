'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RelatedOffer {
  _id: string;
  name: string;
  description: string;
  price?: number;
  destination?: string;
  image?: string;
}

interface RelatedActivity {
  _id: string;
  name: string;
  description: string;
  price?: number;
  location?: string;
  category?: string;
  image?: string;
}

interface RelatedDestination {
  _id: string;
  name: string;
  slug: string;
  description: string;
  country: string;
  region: string;
  heroImage?: string;
  gradientColors?: string;
}

interface RelatedContentProps {
  destinationId: string;
  destinationName: string;
  className?: string;
}

export default function RelatedContent({
  destinationId,
  destinationName,
  className = ''
}: RelatedContentProps) {
  const [offers, setOffers] = useState<RelatedOffer[]>([]);
  const [activities, setActivities] = useState<RelatedActivity[]>([]);
  const [destinations, setDestinations] = useState<RelatedDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'offers' | 'activities' | 'destinations'>('offers');

  useEffect(() => {
    fetchRelatedContent();
  }, [destinationId]);

  const fetchRelatedContent = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/destinations/${destinationId}/related`);
      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
        setActivities(data.activities || []);
        setDestinations(data.destinations || []);
      }
    } catch (error) {
      console.error('Error fetching related content:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasContent = offers.length > 0 || activities.length > 0 || destinations.length > 0;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          Related to {destinationName}
        </h2>
        <p className="text-gray-600 mt-1">
          Discover more travel options and experiences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {offers.length > 0 && (
            <button
              onClick={() => setActiveTab('offers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'offers'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Offers ({offers.length})
            </button>
          )}
          {activities.length > 0 && (
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'activities'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activities ({activities.length})
            </button>
          )}
          {destinations.length > 0 && (
            <button
              onClick={() => setActiveTab('destinations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'destinations'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Destinations ({destinations.length})
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'offers' && offers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div key={offer._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-r from-orange-400 to-red-500 relative">
                  {offer.image && (
                    <img
                      src={offer.image}
                      alt={offer.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute bottom-2 left-2 text-white">
                    <h3 className="font-semibold text-sm">{offer.name}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {offer.description}
                  </p>
                  {offer.price && (
                    <div className="text-lg font-bold text-green-600 mb-2">
                      From £{offer.price}
                    </div>
                  )}
                  <Link
                    href={`/offers/${offer._id}`}
                    className="inline-block w-full text-center bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors text-sm"
                  >
                    View Offer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activities' && activities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <div key={activity._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 relative">
                  {activity.image && (
                    <img
                      src={activity.image}
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute bottom-2 left-2 text-white">
                    <h3 className="font-semibold text-sm">{activity.name}</h3>
                    {activity.category && (
                      <p className="text-xs opacity-90">{activity.category}</p>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {activity.description}
                  </p>
                  {activity.price && (
                    <div className="text-lg font-bold text-green-600 mb-2">
                      From £{activity.price}
                    </div>
                  )}
                  <Link
                    href={`/activities/${activity._id}`}
                    className="inline-block w-full text-center bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    View Activity
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'destinations' && destinations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((destination) => (
              <div key={destination._id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-32 relative ${destination.gradientColors ? `bg-gradient-to-r ${destination.gradientColors}` : 'bg-gradient-to-r from-blue-500 to-teal-400'}`}>
                  {destination.heroImage && (
                    <img
                      src={destination.heroImage}
                      alt={destination.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute bottom-2 left-2 text-white">
                    <h3 className="font-semibold text-sm">{destination.name}</h3>
                    <p className="text-xs opacity-90">{destination.region}, {destination.country}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {destination.description}
                  </p>
                  <Link
                    href={`/destinations/${destination.slug}`}
                    className="inline-block w-full text-center bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600 transition-colors text-sm"
                  >
                    Explore Destination
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Need help planning your trip to {destinationName}?
          </p>
          <Link
            href="/enquiries"
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
          >
            Get Expert Advice
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}