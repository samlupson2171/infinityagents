'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IDestination } from '@/models/Destination';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface DestinationPreviewProps {
  destination: IDestination;
  className?: string;
  mode?: 'standalone' | 'side-by-side';
  onDestinationChange?: (destination: IDestination) => void;
  isEditing?: boolean;
}

export default function DestinationPreview({
  destination,
  className = '',
  mode = 'standalone',
  onDestinationChange,
  isEditing = false
}: DestinationPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [previewData, setPreviewData] = useState<IDestination>(destination);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Real-time preview updates
  useEffect(() => {
    if (isEditing && onDestinationChange) {
      setPreviewData(destination);
      setLastUpdateTime(new Date());
    }
  }, [destination, isEditing, onDestinationChange]);

  // Debounced update for performance
  const debouncedUpdate = useCallback(
    debounce((newDestination: IDestination) => {
      setPreviewData(newDestination);
      setLastUpdateTime(new Date());
    }, 300),
    []
  );

  useEffect(() => {
    if (isEditing) {
      debouncedUpdate(destination);
    }
  }, [destination, isEditing, debouncedUpdate]);

  const generateShareableLink = async () => {
    try {
      setIsGeneratingLink(true);
      const response = await fetch(`/api/admin/destinations/${destination._id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 24 }), // 24 hours
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate preview link');
      }

      const result = await response.json();
      setShareUrl(result.previewUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating preview link:', error);
      alert(`Failed to generate preview link: ${error.message}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Preview link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Preview link copied to clipboard!');
    }
  };

  const getPreviewFrameClasses = () => {
    const baseClasses = "border rounded-lg bg-white transition-all duration-300 shadow-sm";
    const sideMode = mode === 'side-by-side';
    
    switch (previewMode) {
      case 'desktop':
        return `${baseClasses} w-full ${sideMode ? 'h-[600px]' : 'h-[800px]'}`;
      case 'tablet':
        return `${baseClasses} ${sideMode ? 'w-[600px] h-[500px]' : 'w-[768px] h-[1024px]'} mx-auto`;
      case 'mobile':
        return `${baseClasses} ${sideMode ? 'w-[320px] h-[500px]' : 'w-[375px] h-[667px]'} mx-auto`;
      default:
        return `${baseClasses} w-full ${sideMode ? 'h-[600px]' : 'h-[800px]'}`;
    }
  };

  const getPreviewContainerClasses = () => {
    if (mode === 'side-by-side') {
      return "flex-1 min-h-0";
    }
    return "bg-white border rounded-lg";
  };

  const renderDestinationContent = () => {
    const scaleFactor = mode === 'side-by-side' ? 0.8 : 1;
    const contentPadding = mode === 'side-by-side' ? 'p-4' : 'p-6';
    
    return (
      <div className={`${contentPadding} max-w-4xl mx-auto`} style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top left' }}>
        {/* Hero Section */}
        <div className="relative mb-8">
          {previewData.heroImage && (
            <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={previewData.heroImage}
                alt={previewData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                }}
              />
            </div>
          )}
          <div className={`absolute inset-0 bg-gradient-to-r ${previewData.gradientColors} opacity-75 rounded-lg`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-2">{previewData.name}</h1>
              <p className="text-xl">{previewData.country}, {previewData.region}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            {previewData.description}
          </p>
        </div>

        {/* Quick Facts */}
        {previewData.quickFacts && (
          <div className="mb-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Quick Facts</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(previewData.quickFacts).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key} className="text-center">
                    <div className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-gray-600">{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Sections */}
        {previewData.sections && (
          <div className="space-y-8">
            {Object.entries(previewData.sections).map(([sectionKey, section]) => (
              <div key={sectionKey} className="border-b border-gray-200 pb-8 last:border-b-0">
                <h2 className="text-2xl font-bold mb-4 capitalize">
                  {section.title || sectionKey}
                </h2>
                
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />

                {section.highlights && section.highlights.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Highlights:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {section.highlights.map((highlight, index) => (
                        <li key={index} className="text-gray-700">{highlight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.tips && section.tips.length > 0 && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Tips:</h3>
                    <ul className="space-y-1">
                      {section.tips.map((tip, index) => (
                        <li key={index} className="text-blue-800 text-sm">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.images && section.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {section.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${section.title} ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Preview Notice */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                <strong>Preview Mode:</strong> This is a preview of how the destination will appear to visitors.
                Status: <span className="font-medium">{previewData.status}</span>
                {isEditing && (
                  <span className="ml-2 text-xs">
                    (Last updated: {lastUpdateTime.toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${getPreviewContainerClasses()} ${className}`}>
      {/* Preview Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'side-by-side' ? 'Live Preview' : 'Preview'}
          </h3>
          
          {/* Device Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['desktop', 'tablet', 'mobile'] as const).map((deviceMode) => (
              <button
                key={deviceMode}
                onClick={() => setPreviewMode(deviceMode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  previewMode === deviceMode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {deviceMode.charAt(0).toUpperCase() + deviceMode.slice(1)}
              </button>
            ))}
          </div>

          {/* Real-time indicator */}
          {isEditing && mode === 'side-by-side' && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {mode === 'standalone' && (
            <button
              onClick={generateShareableLink}
              disabled={isGeneratingLink}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isGeneratingLink ? 'Generating...' : 'Share Preview'}
            </button>
          )}
        </div>
      </div>

      {/* Preview Frame */}
      <div className={`${mode === 'side-by-side' ? 'p-2' : 'p-4'} bg-gray-100 ${mode === 'side-by-side' ? 'flex-1 min-h-0' : 'min-h-[600px]'}`}>
        <div className={getPreviewFrameClasses()}>
          <div className="w-full h-full overflow-auto">
            {renderDestinationContent()}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Share Preview Link</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview URL (expires in 24 hours)
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                This link allows anyone to preview the destination without logging in. 
                It will expire in 24 hours for security.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}