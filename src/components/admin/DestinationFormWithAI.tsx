'use client';

import React, { useState } from 'react';
import { DestinationForm } from './DestinationForm';
import { AIContentGenerator } from './AIContentGenerator';
import { IDestination } from '@/models/Destination';

interface DestinationFormWithAIProps {
  destination?: Partial<IDestination>;
  onSave: (destination: Partial<IDestination>) => void;
  onCancel: () => void;
  className?: string;
}

export function DestinationFormWithAI({
  destination,
  onSave,
  onCancel,
  className = ''
}: DestinationFormWithAIProps) {
  const [currentDestination, setCurrentDestination] = useState<Partial<IDestination>>(
    destination || {}
  );
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const handleDestinationUpdate = (updatedDestination: Partial<IDestination>) => {
    setCurrentDestination(updatedDestination);
  };

  const handleAIContentGenerated = (aiContent: Partial<IDestination>) => {
    // Merge AI-generated content with existing destination data
    const mergedDestination = {
      ...currentDestination,
      ...aiContent,
      sections: {
        ...currentDestination.sections,
        ...aiContent.sections
      }
    };
    
    setCurrentDestination(mergedDestination);
    setShowAIGenerator(false);
  };

  const canUseAI = currentDestination.name && currentDestination.country && currentDestination.region;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Destination Form */}
      <DestinationForm
        destination={currentDestination}
        onSave={onSave}
        onCancel={onCancel}
        onChange={handleDestinationUpdate}
      />

      {/* AI Content Generation Section */}
      {canUseAI && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">AI Content Assistant</h3>
              <p className="text-sm text-gray-500">
                Generate comprehensive content for your destination using AI
              </p>
            </div>
            <button
              onClick={() => setShowAIGenerator(!showAIGenerator)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {showAIGenerator ? 'Hide AI Generator' : 'Use AI Generator'}
            </button>
          </div>

          {showAIGenerator && (
            <AIContentGenerator
              destination={currentDestination}
              onContentGenerated={handleAIContentGenerated}
              onError={(error) => {
                console.error('AI Content Generation Error:', error);
                // You could show a toast notification here
              }}
            />
          )}
        </div>
      )}

      {!canUseAI && (
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">AI Content Generation Available</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Fill in the destination name, country, and region to unlock AI-powered content generation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}