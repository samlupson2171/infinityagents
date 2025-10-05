'use client';

import { useState } from 'react';
import { DestinationHero, DestinationSidebar, DestinationSection } from '@/components/destinations';
import type { Section } from '@/components/destinations';

export default function BenidormPageRefactored() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections: Section[] = [
    { id: 'overview', name: 'Overview', icon: '🏖️' },
    { id: 'accommodation', name: 'Hotels & Resorts', icon: '🏨' },
    { id: 'attractions', name: 'Attractions', icon: '🎢' },
    { id: 'beaches', name: 'Beaches', icon: '🏄‍♂️' },
    { id: 'nightlife', name: 'Nightlife', icon: '🌙' },
    { id: 'dining', name: 'Dining', icon: '🍽️' },
    { id: 'practical', name: 'Practical Info', icon: 'ℹ️' },
  ];

  const destinationData = {
    name: 'Benidorm',
    description: "Spain's premier beach resort destination on the Costa Blanca",
    region: 'Costa Blanca',
    country: 'Spain',
    quickInfo: ['✈️ 2.5 hours from UK', '☀️ 300+ days of sunshine'],
    gradientColors: 'bg-gradient-to-r from-blue-600 to-orange-500'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DestinationHero {...destinationData} />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <DestinationSidebar
            destinationName={destinationData.name}
            sections={sections}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <div className="lg:w-3/4">
            {activeSection === 'overview' && (
              <DestinationSection title="Benidorm Overview">
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
              </DestinationSection>
            )}

            {activeSection === 'accommodation' && (
              <DestinationSection title="Hotels & Resorts">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Benidorm offers a wide range of accommodation options to suit every budget and preference.
                </p>
                {/* Add accommodation content here */}
              </DestinationSection>
            )}

            {activeSection === 'attractions' && (
              <DestinationSection title="Attractions">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  From world-class theme parks to cultural attractions, Benidorm has something for everyone.
                </p>
                {/* Add attractions content here */}
              </DestinationSection>
            )}

            {activeSection === 'beaches' && (
              <DestinationSection title="Beaches">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Benidorm boasts two stunning Blue Flag beaches with crystal clear waters and golden sand.
                </p>
                {/* Add beaches content here */}
              </DestinationSection>
            )}

            {activeSection === 'nightlife' && (
              <DestinationSection title="Nightlife">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Experience Benidorm's legendary nightlife scene with bars, clubs, and entertainment venues.
                </p>
                {/* Add nightlife content here */}
              </DestinationSection>
            )}

            {activeSection === 'dining' && (
              <DestinationSection title="Dining">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  From traditional Spanish cuisine to international favorites, Benidorm's dining scene is diverse.
                </p>
                {/* Add dining content here */}
              </DestinationSection>
            )}

            {activeSection === 'practical' && (
              <DestinationSection title="Practical Information">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Everything you need to know for planning the perfect trip to Benidorm.
                </p>
                {/* Add practical info content here */}
              </DestinationSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}