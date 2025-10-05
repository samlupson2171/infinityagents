'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function BenidormPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', name: 'Overview', icon: '🏖️' },
    { id: 'accommodation', name: 'Hotels & Resorts', icon: '🏨' },
    { id: 'attractions', name: 'Attractions', icon: '🎢' },
    { id: 'beaches', name: 'Beaches', icon: '🏄‍♂️' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌙' },
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'practical', name: 'Practical Info', icon: 'ℹ️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-r from-blue-600 to-orange-500">
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <nav className="mb-4">
              <Link href="/destinations" className="text-blue-200 hover:text-white">
                Destinations
              </Link>
              <span className="mx-2">/</span>
              <span>Benidorm</span>
            </nav>
            <h1 className="text-5xl font-bold mb-4">Benidorm</h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              Spain's premier beach resort destination on the Costa Blanca
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                📍 Costa Blanca, Spain
              </div>
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                ✈️ 2.5 hours from UK
              </div>
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                ☀️ 300+ days of sunshine
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Explore Benidorm</h3>
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
              {activeSection === 'overview' && <OverviewSection />}
              {activeSection === 'accommodation' && <AccommodationSection />}
              {activeSection === 'attractions' && <AttractionsSection />}
              {activeSection === 'beaches' && <BeachesSection />}
              {activeSection === 'nightlife' && <NightlifeSection />}
              {activeSection === 'dining' && <DiningSection />}
              {activeSection === 'practical' && <PracticalSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Benidorm Overview</h2>
      
      <div className="prose max-w-none">
        <p className="text-lg text-gray-700 leading-relaxed mb-6">
          Benidorm is Spain's most popular beach resort, located on the stunning Costa Blanca. 
          This vibrant destination offers the perfect blend of beautiful beaches, exciting nightlife, 
          family-friendly attractions, and year-round sunshine, making it ideal for all types of travelers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Choose Benidorm?</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                Two award-winning Blue Flag beaches
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                World-class theme parks and attractions
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                Legendary nightlife and entertainment
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                Excellent value for money
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">✓</span>
                Easy accessibility from UK airports
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Facts</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Population:</span>
                <span className="font-medium">70,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Language:</span>
                <span className="font-medium">Spanish, English widely spoken</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium">Euro (EUR)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Zone:</span>
                <span className="font-medium">CET (GMT+1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Airport:</span>
                <span className="font-medium">Alicante (ALC) - 60km</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Agent Tip</h4>
          <p className="text-blue-800">
            Benidorm offers something for everyone - from families seeking theme park thrills 
            to groups looking for vibrant nightlife. The resort's compact size means everything 
            is within walking distance, making it perfect for first-time visitors to Spain.
          </p>
        </div>
      </div>
    </div>
  );
}