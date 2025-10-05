'use client';

import React, { useState, useCallback } from 'react';
import { 
  processGeneratedContent
} from '@/lib/ai-content-generator';
import { IDestination } from '@/models/Destination';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AIContentGeneratorProps {
  destination: Partial<IDestination>;
  onContentGenerated: (content: Partial<IDestination>) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface GenerationOptions {
  sections: string[];
  targetAudience: 'families' | 'young-adults' | 'couples' | 'solo-travelers' | 'luxury' | 'budget';
  contentTone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  contentLength: 'short' | 'medium' | 'long';
  provider: string;
  customPrompt?: string;
}

interface GeneratedContentPreview {
  [sectionName: string]: {
    title: string;
    content: string;
    highlights: string[];
    tips: string[];
    accepted: boolean;
  };
}

const AVAILABLE_SECTIONS = [
  { id: 'overview', label: 'Overview', description: 'General destination introduction and highlights' },
  { id: 'accommodation', label: 'Accommodation', description: 'Hotels, resorts, and lodging options' },
  { id: 'attractions', label: 'Attractions', description: 'Tourist sites, landmarks, and activities' },
  { id: 'beaches', label: 'Beaches', description: 'Beach information and water activities' },
  { id: 'nightlife', label: 'Nightlife', description: 'Bars, clubs, and entertainment venues' },
  { id: 'dining', label: 'Dining', description: 'Restaurants, local cuisine, and food culture' },
  { id: 'practical', label: 'Practical Info', description: 'Travel tips, transportation, and logistics' }
];

// Simple Toast component for this specific use case
interface SimpleToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

function SimpleToast({ message, type, onClose }: SimpleToastProps) {
  const bgColor = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  return (
    <div className={`mb-4 p-4 border rounded-lg ${bgColor[type]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">{icon[type]}</span>
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-lg opacity-60 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function AIContentGenerator({ 
  destination, 
  onContentGenerated, 
  onError,
  className = '' 
}: AIContentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContentPreview | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [options, setOptions] = useState<GenerationOptions>({
    sections: ['overview'],
    targetAudience: 'families',
    contentTone: 'informative',
    contentLength: 'medium',
    provider: 'openai',
    customPrompt: ''
  });

  React.useEffect(() => {
    // Fetch available providers from the API
    fetch('/api/admin/destinations/generate-content')
      .then(response => response.json())
      .then(data => {
        if (data.availableProviders && data.availableProviders.length > 0) {
          setAvailableProviders(data.availableProviders);
          setOptions(prev => ({ ...prev, provider: data.availableProviders[0] }));
        } else {
          setToast({ message: 'AI service not available. Please check configuration.', type: 'error' });
        }
      })
      .catch(error => {
        console.error('Failed to check AI service availability:', error);
        setToast({ message: 'AI service not available. Please check configuration.', type: 'error' });
      });
  }, []);

  const handleGenerateContent = useCallback(async () => {
    if (!destination.name || !destination.country || !destination.region) {
      setToast({ message: 'Please fill in destination name, country, and region first.', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setToast(null);

    try {
      const requestBody = {
        destinationName: destination.name,
        country: destination.country,
        region: destination.region,
        sections: options.sections,
        targetAudience: options.targetAudience,
        contentTone: options.contentTone,
        contentLength: options.contentLength,
        provider: options.provider,
        customPrompt: options.customPrompt,
        batchMode: false
      };

      console.log('🚀 Sending AI generation request:', requestBody);

      const response = await fetch('/api/admin/destinations/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Content generation failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Content generation failed');
      }

      // Convert to preview format
      const preview: GeneratedContentPreview = {};
      Object.entries(data.content).forEach(([sectionName, sectionData]: [string, any]) => {
        preview[sectionName] = {
          ...sectionData,
          accepted: false
        };
      });

      setGeneratedContent(preview);
      setToast({ 
        message: `Successfully generated content for ${options.sections.length} section(s)`, 
        type: 'success' 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setToast({ message: errorMessage, type: 'error' });
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [destination, options, onError]);

  const handleBatchGenerate = useCallback(async () => {
    if (!destination.name || !destination.country || !destination.region) {
      setToast({ message: 'Please fill in destination name, country, and region first.', type: 'error' });
      return;
    }

    setIsGenerating(true);
    setToast(null);

    try {
      const requestBody = {
        destinationName: destination.name,
        country: destination.country,
        region: destination.region,
        sections: options.sections,
        targetAudience: options.targetAudience,
        contentTone: options.contentTone,
        contentLength: options.contentLength,
        provider: options.provider,
        customPrompt: options.customPrompt,
        batchMode: true
      };

      const response = await fetch('/api/admin/destinations/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch generation failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Batch generation failed');
      }

      // Convert to preview format
      const preview: GeneratedContentPreview = {};
      let successCount = 0;

      Object.entries(data.content).forEach(([sectionName, sectionData]: [string, any]) => {
        preview[sectionName] = {
          ...sectionData,
          accepted: false
        };
        successCount++;
      });

      if (successCount > 0) {
        setGeneratedContent(preview);
        const errorCount = options.sections.length - successCount;
        setToast({ 
          message: `Generated content for ${successCount} section(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 
          type: successCount > errorCount ? 'success' : 'info'
        });
      } else {
        throw new Error('Failed to generate content for any sections');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch generation failed';
      setToast({ message: errorMessage, type: 'error' });
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [destination, options, onError]);

  const handleAcceptSection = useCallback((sectionName: string) => {
    if (!generatedContent) return;

    setGeneratedContent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          accepted: true
        }
      };
    });
  }, [generatedContent]);

  const handleRejectSection = useCallback((sectionName: string) => {
    if (!generatedContent) return;

    setGeneratedContent(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      delete updated[sectionName];
      return updated;
    });
  }, []);

  const handleEditSection = useCallback((sectionName: string, field: string, value: string | string[]) => {
    if (!generatedContent) return;

    setGeneratedContent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [field]: value
        }
      };
    });
  }, []);

  const handleApplyContent = useCallback(() => {
    if (!generatedContent) return;

    try {
      // Filter only accepted content
      const acceptedContent: any = {};
      Object.entries(generatedContent).forEach(([sectionName, sectionData]) => {
        if (sectionData.accepted) {
          acceptedContent[sectionName] = {
            title: sectionData.title,
            content: sectionData.content,
            highlights: sectionData.highlights,
            tips: sectionData.tips
          };
        }
      });

      if (Object.keys(acceptedContent).length === 0) {
        setToast({ message: 'Please accept at least one section before applying.', type: 'error' });
        return;
      }

      // Create a mock response for processing
      const mockResponse = {
        success: true,
        content: acceptedContent,
        metadata: {
          model: options.provider,
          tokensUsed: 0,
          generationTime: 0,
          confidence: 0.85
        }
      };

      const processedContent = processGeneratedContent(mockResponse, destination);
      onContentGenerated(processedContent);
      
      setGeneratedContent(null);
      setShowOptions(false);
      setToast({ 
        message: `Applied content for ${Object.keys(acceptedContent).length} section(s)`, 
        type: 'success' 
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply content';
      setToast({ message: errorMessage, type: 'error' });
      onError?.(errorMessage);
    }
  }, [generatedContent, destination, options.provider, onContentGenerated, onError]);

  if (availableProviders.length === 0) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">AI Service Unavailable</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please configure AI service credentials (OPENAI_API_KEY or CLAUDE_API_KEY) to use content generation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Content Generator</h3>
            <p className="text-sm text-gray-500">
              Generate comprehensive destination content using AI
            </p>
          </div>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Options
          </button>
        </div>

        {showOptions && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            {/* Section Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sections to Generate
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SECTIONS.map(section => (
                  <label key={section.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.sections.includes(section.id)}
                      onChange={(e) => {
                        console.log(`🎯 Section ${section.id} ${e.target.checked ? 'checked' : 'unchecked'}`);
                        if (e.target.checked) {
                          setOptions(prev => {
                            const newSections = [...prev.sections, section.id];
                            console.log(`✅ Adding ${section.id}, new sections:`, newSections);
                            return {
                              ...prev,
                              sections: newSections
                            };
                          });
                        } else {
                          setOptions(prev => {
                            const newSections = prev.sections.filter(s => s !== section.id);
                            console.log(`❌ Removing ${section.id}, new sections:`, newSections);
                            return {
                              ...prev,
                              sections: newSections
                            };
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700" title={section.description}>
                      {section.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generation Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={options.targetAudience}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    targetAudience: e.target.value as any 
                  }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="families">Families</option>
                  <option value="young-adults">Young Adults</option>
                  <option value="couples">Couples</option>
                  <option value="solo-travelers">Solo Travelers</option>
                  <option value="luxury">Luxury Travelers</option>
                  <option value="budget">Budget Travelers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Tone
                </label>
                <select
                  value={options.contentTone}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    contentTone: e.target.value as any 
                  }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="informative">Informative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Length
                </label>
                <select
                  value={options.contentLength}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    contentLength: e.target.value as any 
                  }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Provider
                </label>
                <select
                  value={options.provider}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    provider: e.target.value 
                  }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {availableProviders.map(provider => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Instructions (Optional)
              </label>
              <textarea
                value={options.customPrompt}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  customPrompt: e.target.value 
                }))}
                placeholder="Add any specific instructions or requirements for content generation..."
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        )}

        {/* Generation Buttons */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={handleGenerateContent}
            disabled={isGenerating || options.sections.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Content
              </>
            )}
          </button>

          <button
            onClick={handleBatchGenerate}
            disabled={isGenerating || options.sections.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Batch Generate
          </button>
        </div>

        {/* Generated Content Preview */}
        {generatedContent && Object.keys(generatedContent).length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Generated Content</h4>
              <button
                onClick={handleApplyContent}
                disabled={!Object.values(generatedContent).some(section => section.accepted)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply Selected Content
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(generatedContent).map(([sectionName, sectionData]) => (
                <ContentPreviewSection
                  key={sectionName}
                  sectionName={sectionName}
                  sectionData={sectionData}
                  onAccept={() => handleAcceptSection(sectionName)}
                  onReject={() => handleRejectSection(sectionName)}
                  onEdit={handleEditSection}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContentPreviewSectionProps {
  sectionName: string;
  sectionData: {
    title: string;
    content: string;
    highlights: string[];
    tips: string[];
    accepted: boolean;
  };
  onAccept: () => void;
  onReject: () => void;
  onEdit: (sectionName: string, field: string, value: string | string[]) => void;
}

function ContentPreviewSection({ 
  sectionName, 
  sectionData, 
  onAccept, 
  onReject, 
  onEdit 
}: ContentPreviewSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`border rounded-lg p-4 ${sectionData.accepted ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-md font-medium text-gray-900 capitalize">
          {sectionName.replace(/([A-Z])/g, ' $1').trim()}
        </h5>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
          {!sectionData.accepted ? (
            <>
              <button
                onClick={onAccept}
                className="text-sm text-green-600 hover:text-green-800"
              >
                Accept
              </button>
              <button
                onClick={onReject}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Reject
              </button>
            </>
          ) : (
            <span className="text-sm text-green-600 font-medium">✓ Accepted</span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={sectionData.title}
              onChange={(e) => onEdit(sectionName, 'title', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={sectionData.content}
              onChange={(e) => onEdit(sectionName, 'content', e.target.value)}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h6 className="font-medium text-gray-900">{sectionData.title}</h6>
            <div 
              className="text-sm text-gray-700 mt-1"
              dangerouslySetInnerHTML={{ __html: sectionData.content }}
            />
          </div>
          
          {sectionData.highlights.length > 0 && (
            <div>
              <h6 className="font-medium text-gray-900 text-sm">Highlights:</h6>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                {sectionData.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            </div>
          )}
          
          {sectionData.tips.length > 0 && (
            <div>
              <h6 className="font-medium text-gray-900 text-sm">Tips:</h6>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                {sectionData.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}