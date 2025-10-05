'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import RelatedContent from '@/components/destinations/RelatedContent';
import DestinationFiles from '@/components/destinations/DestinationFiles';

interface DestinationSection {
  title: string;
  content: string;
  highlights?: string[];
  tips?: string[];
  images?: string[];
}

interface DestinationFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'excel' | 'image' | 'document';
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
  description?: string;
  isPublic: boolean;
}

interface Destination {
  id: string;
  _id: string;
  name: string;
  slug: string;
  country: string;
  region: string;
  description: string;
  heroImage?: string;
  galleryImages?: string[];
  gradientColors?: string;
  files?: DestinationFile[];
  sections: {
    overview: DestinationSection;
    accommodation: DestinationSection;
    attractions: DestinationSection;
    beaches: DestinationSection;
    nightlife: DestinationSection;
    dining: DestinationSection;
    practical: DestinationSection;
  };
  quickFacts?: {
    population?: string;
    language?: string;
    currency?: string;
    timeZone?: string;
    airport?: string;
    flightTime?: string;
    climate?: string;
    bestTime?: string;
  };
  breadcrumb: Array<{ name: string; href: string }>;
}

export default function DestinationPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', name: 'Overview', icon: '🏖️' },
    { id: 'accommodation', name: 'Hotels & Resorts', icon: '🏨' },
    { id: 'attractions', name: 'Attractions', icon: '🎢' },
    { id: 'beaches', name: 'Beaches', icon: '🏄‍♂️' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌙' },
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'practical', name: 'Practical Info', icon: 'ℹ️' },
    ...(destination?.files && destination.files.filter(f => f.isPublic).length > 0 
      ? [{ id: 'files', name: 'Downloads', icon: '📁' }] 
      : []
    ),
  ];

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/destinations/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Destination not found');
          } else {
            setError('Failed to load destination');
          }
          return;
        }

        const data: Destination = await response.json();
        setDestination(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching destination:', err);
        setError('Failed to load destination. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchDestination();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading destination...</p>
        </div>
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.175-5.5-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {error === 'Destination not found' ? 'Destination Not Found' : 'Error Loading Destination'}
          </h3>
          <p className="mt-2 text-gray-500">
            {error === 'Destination not found' 
              ? 'The destination you are looking for does not exist or is not published yet.'
              : error
            }
          </p>
          <div className="mt-6 space-x-4">
            <Link
              href="/destinations"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              View All Destinations
            </Link>
            {error !== 'Destination not found' && (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className={`relative h-96 ${destination.gradientColors ? `bg-gradient-to-r ${destination.gradientColors}` : 'bg-gradient-to-r from-blue-600 to-orange-500'}`}>
        {destination.heroImage && (
          <img
            src={destination.heroImage}
            alt={destination.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <nav className="mb-4">
              <Link href="/destinations" className="text-blue-200 hover:text-white">
                Destinations
              </Link>
              <span className="mx-2">/</span>
              <span>{destination.name}</span>
            </nav>
            <h1 className="text-5xl font-bold mb-4">{destination.name}</h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              {destination.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                📍 {destination.region}, {destination.country}
              </div>
              {destination.quickFacts?.flightTime && (
                <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  ✈️ {destination.quickFacts.flightTime}
                </div>
              )}
              {destination.quickFacts?.climate && (
                <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                  ☀️ {destination.quickFacts.climate}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Explore {destination.name}</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                      activeSection === section.id
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-700 hover:bg-orange-50'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <SectionContent 
                destination={destination} 
                activeSection={activeSection} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Related Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <RelatedContent 
          destinationId={destination._id}
          destinationName={destination.name}
        />
      </div>
    </div>
  );
}

function SectionContent({ destination, activeSection }: { destination: Destination; activeSection: string }) {
  // Handle files section separately
  if (activeSection === 'files') {
    if (!destination.files || destination.files.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No files available for this destination.</p>
        </div>
      );
    }
    
    return <DestinationFiles files={destination.files} />;
  }

  const section = destination.sections[activeSection as keyof typeof destination.sections];
  
  if (!section) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Content for this section is not available yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {section.title || `${destination.name} ${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`}
      </h2>
      
      <div className="prose max-w-none">
        {/* Main Content */}
        <div 
          className="text-gray-700 leading-relaxed mb-6"
          dangerouslySetInnerHTML={{ __html: section.content }}
        />

        {/* Quick Facts for Overview Section */}
        {activeSection === 'overview' && destination.quickFacts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Facts</h3>
              <div className="space-y-3">
                {destination.quickFacts.population && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Population:</span>
                    <span className="font-medium">{destination.quickFacts.population}</span>
                  </div>
                )}
                {destination.quickFacts.language && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">{destination.quickFacts.language}</span>
                  </div>
                )}
                {destination.quickFacts.currency && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span className="font-medium">{destination.quickFacts.currency}</span>
                  </div>
                )}
                {destination.quickFacts.timeZone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Zone:</span>
                    <span className="font-medium">{destination.quickFacts.timeZone}</span>
                  </div>
                )}
                {destination.quickFacts.airport && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Airport:</span>
                    <span className="font-medium">{destination.quickFacts.airport}</span>
                  </div>
                )}
              </div>
            </div>
            
            {destination.quickFacts.bestTime && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Travel Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Best Time to Visit:</span>
                    <span className="font-medium">{destination.quickFacts.bestTime}</span>
                  </div>
                  {destination.quickFacts.climate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Climate:</span>
                      <span className="font-medium">{destination.quickFacts.climate}</span>
                    </div>
                  )}
                  {destination.quickFacts.flightTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flight Time:</span>
                      <span className="font-medium">{destination.quickFacts.flightTime}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Highlights */}
        {section.highlights && section.highlights.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Highlights</h4>
            <ul className="space-y-2">
              {section.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tips */}
        {section.tips && section.tips.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Tips</h4>
            <ul className="space-y-1">
              {section.tips.map((tip, index) => (
                <li key={index} className="text-blue-800 text-sm">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Images */}
        {section.images && section.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {section.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${section.title} ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ))}
          </div>
        )}

        {/* Destination Gallery - Show on overview section */}
        {activeSection === 'overview' && destination.galleryImages && destination.galleryImages.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Photo Gallery</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {destination.galleryImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${destination.name} gallery ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onClick={() => {
                    // Simple lightbox - open in new tab for now
                    window.open(image, '_blank');
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}