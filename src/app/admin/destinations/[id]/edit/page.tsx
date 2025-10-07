'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DestinationForm } from '@/components/admin/DestinationForm';
import DestinationContentEditor from '@/components/admin/DestinationContentEditor';
import DestinationFileManager from '@/components/admin/DestinationFileManager';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';


interface DestinationFormData {
  name: string;
  country: string;
  region: string;
  description: string;
  slug?: string;
  heroImage?: string;
  galleryImages?: string[];
}

interface DestinationSection {
  title: string;
  content: string;
  images?: string[];
  highlights?: string[];
  tips?: string[];
  lastModified: Date;
  aiGenerated: boolean;
}

interface DestinationFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'excel' | 'image' | 'document';
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: {
    name: string;
    email: string;
  };
  uploadedAt: string;
  description?: string;
  isPublic: boolean;
}

interface Destination extends DestinationFormData {
  _id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  files: DestinationFile[];
  sections: {
    overview: DestinationSection;
    accommodation: DestinationSection;
    attractions: DestinationSection;
    beaches: DestinationSection;
    nightlife: DestinationSection;
    dining: DestinationSection;
    practical: DestinationSection;
  };
}

export default function EditDestinationPage() {
  const router = useRouter();
  const params = useParams();
  const destinationId = params.id as string;

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'files'>('basic');

  // Fetch destination data
  useEffect(() => {
    const fetchDestination = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/destinations/${destinationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch destination');
        }

        const data = await response.json();
        setDestination(data.destination);
      } catch (error) {
        console.error('Error fetching destination:', error);
        setError('Failed to load destination. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (destinationId) {
      fetchDestination();
    }
  }, [destinationId]);

  const handleSave = async (destinationData: DestinationFormData) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/admin/destinations/${destinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(destinationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update destination');
      }

      const result = await response.json();
      setDestination(result.destination);
      
      // Show success message or redirect
      // For now, we'll just stay on the page
      
    } catch (error) {
      console.error('Error updating destination:', error);
      setError(`Failed to update destination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionUpdate = async (sectionKey: string, section: DestinationSection) => {
    if (!destination) return;

    console.log(`🔄 Updating section ${sectionKey}:`, section);

    try {
      const updatedDestination = {
        ...destination,
        sections: {
          ...destination.sections,
          [sectionKey]: section
        }
      };

      console.log('📤 Sending update request with sections:', updatedDestination.sections);

      const response = await fetch(`/api/admin/destinations/${destinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sections: updatedDestination.sections }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Section update successful:', result);
        setDestination(updatedDestination);
      } else {
        const errorData = await response.json();
        console.error('❌ Section update failed:', errorData);
      }
    } catch (error) {
      console.error('❌ Error updating section:', error);
    }
  };

  const handleContentSave = async () => {
    // Content is auto-saved via handleSectionUpdate
    // This is just for manual save button
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/admin/destinations');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading destination...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error && !destination) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Destination</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin/destinations')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Destinations
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
                <a href="/admin/dashboard" className="hover:text-gray-700">Admin</a>
                <span>/</span>
                <a href="/admin/destinations" className="hover:text-gray-700">Destinations</a>
                <span>/</span>
                <span className="text-gray-900">{destination?.name || 'Edit Destination'}</span>
              </nav>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Edit Destination</h1>
                  <p className="text-gray-600 mt-2">
                    Update the information for {destination?.name}
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => window.open(`/destinations/${destination?.slug || destination?.name?.toLowerCase().replace(/\s+/g, '-')}`, '_blank')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="mt-6 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'basic'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Basic Information
                  </button>
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'content'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Content & Sections
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'files'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Files & Documents
                    {destination?.files && destination.files.length > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {destination.files.length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        onClick={() => setError(null)}
                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'basic' ? (
              <div className="bg-white rounded-lg shadow-sm border">
                {destination && (
                  <DestinationForm
                    destination={destination}
                    onSubmit={handleSave}
                    onCancel={handleCancel}
                    isEditing={true}
                  />
                )}
              </div>
            ) : activeTab === 'content' ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                {destination && destination.sections && (
                  <DestinationContentEditor
                    destinationId={destinationId}
                    destination={{
                      name: destination.name,
                      country: destination.country,
                      region: destination.region,
                      description: destination.description
                    }}
                    sections={destination.sections}
                    onSectionUpdate={handleSectionUpdate}
                    onSave={handleContentSave}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                {destination && (
                  <DestinationFileManager
                    destinationId={destinationId}
                    files={destination.files || []}
                    onFilesChange={(files) => setDestination(prev => prev ? { ...prev, files } : null)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}