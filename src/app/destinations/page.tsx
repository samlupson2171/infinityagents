'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Destination {
  id: string;
  _id: string;
  name: string;
  slug: string;
  country: string;
  region: string;
  description: string;
  image?: string;
  gradientColors?: string;
  highlights: string[];
  climate: string;
  bestTime: string;
  flightTime: string;
  publishedAt?: string;
}

interface DestinationsResponse {
  destinations: Destination[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function DestinationsPage() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch destinations from API
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedRegion !== 'all') {
          params.append('region', selectedRegion);
        }
        
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const response = await fetch(`/api/destinations?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch destinations');
        }

        const data: DestinationsResponse = await response.json();
        setDestinations(data.destinations);
        setError(null);
      } catch (err) {
        console.error('Error fetching destinations:', err);
        setError('Failed to load destinations. Please try again.');
        
        // Fallback to hardcoded destinations if API fails
        const fallbackDestinations = [
          {
            id: 'benidorm',
            _id: 'fallback-benidorm',
            name: 'Benidorm',
            slug: 'benidorm',
            country: 'Spain',
            region: 'Costa Blanca',
            description: "The vibrant resort town on Spain's Costa Blanca, famous for its stunning beaches, exciting nightlife, and year-round sunshine.",
            image: '/destinations/benidorm-hero.jpg',
            gradientColors: 'from-blue-500 to-orange-400',
            highlights: ['Levante Beach', 'Poniente Beach', 'Terra Mítica Theme Park'],
            climate: 'Mediterranean with 300+ days of sunshine',
            bestTime: 'April to October',
            flightTime: '2.5 hours from UK'
          }
        ];
        setDestinations(fallbackDestinations);
      } finally {
        setLoading(false);
      }
    };

    fetchDestinations();
  }, [selectedRegion, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
              Discover Amazing Destinations
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Explore our handpicked selection of premium resort destinations,
              each offering unique experiences for your clients
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
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
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
            <button
              onClick={() => setSelectedRegion('all')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              All Destinations
            </button>
            <button
              onClick={() => setSelectedRegion('costa blanca')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'costa blanca'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              Costa Blanca
            </button>
            <button
              onClick={() => setSelectedRegion('algarve')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'algarve'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              Algarve
            </button>
            <button
              onClick={() => setSelectedRegion('balearic')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'balearic'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              Balearic Islands
            </button>
            <button
              onClick={() => setSelectedRegion('cyprus')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'cyprus'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              Cyprus
            </button>
            <button
              onClick={() => setSelectedRegion('greek')}
              className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-colors text-sm sm:text-base ${
                selectedRegion === 'greek'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-300'
              }`}
            >
              Greek Islands
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading destinations...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Destinations</h3>
              <p className="mt-2 text-gray-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && searchQuery && (
          <div className="mb-6 text-center">
            <p className="text-gray-600">
              {destinations.length === 0
                ? `No destinations found for "${searchQuery}"`
                : `Found ${destinations.length} destination${destinations.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Destinations Grid */}
        {!loading && !error && destinations.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No destinations found
              </h3>
              <p className="mt-2 text-gray-500">
                {searchQuery
                  ? `Try adjusting your search terms or clearing the search to see all destinations.`
                  : `No destinations match the selected region filter.`}
              </p>
              {(searchQuery || selectedRegion !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRegion('all');
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Hero Image */}
                <div className={`h-64 relative ${destination.gradientColors ? `bg-gradient-to-r ${destination.gradientColors}` : 'bg-gradient-to-r from-blue-400 to-orange-400'}`}>
                  {destination.image && (
                    <img
                      src={destination.image}
                      alt={destination.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-2xl font-bold">{destination.name}</h3>
                    <p className="text-blue-100">
                      {destination.region}, {destination.country}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {destination.description}
                  </p>

                  {/* Quick Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-sm">
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                        Climate
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm">
                        {destination.climate}
                      </div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                        Best Time
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm">
                        {destination.bestTime}
                      </div>
                    </div>
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                        Flight Time
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm">
                        {destination.flightTime}
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                      Top Highlights
                    </h4>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {destination.highlights
                        .slice(0, 3)
                        .map((highlight, index) => (
                          <span
                            key={index}
                            className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm rounded-full"
                          >
                            {highlight}
                          </span>
                        ))}
                      {destination.highlights.length > 3 && (
                        <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded-full">
                          +{destination.highlights.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/destinations/${destination.slug}`}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-center block text-sm sm:text-base"
                  >
                    Explore {destination.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 sm:mt-16 text-center bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Need Help Planning?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            Our destination experts are here to help you create the perfect
            itinerary for your clients
          </p>
          <Link
            href="/enquiries"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 sm:px-8 rounded-lg transition-colors text-sm sm:text-base"
          >
            Submit an Enquiry
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 ml-2"
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
          </Link>
        </div>
      </div>
    </div>
  );
}
