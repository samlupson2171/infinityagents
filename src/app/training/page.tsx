'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ContentRenderer from '@/components/training/ContentRenderer';

interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface TrainingMaterial {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'blog' | 'download';
  contentUrl?: string;
  fileUrl?: string;
  richContent?: string;
  richContentImages?: string[];
  uploadedFiles?: UploadedFile[];
  isActive: boolean;
  createdAt: string;
}

export default function TrainingPage() {
  const { data: session } = useSession();
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<
    'all' | 'video' | 'blog' | 'download'
  >('all');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/training');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMaterials(result.data.materials);
        } else {
          setError(
            result.error?.message || 'Failed to load training materials'
          );
        }
      } else {
        const errorData = await response.json();
        setError(
          errorData.error?.message || 'Failed to load training materials'
        );
      }
    } catch (err) {
      setError('Error loading training materials');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(
    (material) => selectedType === 'all' || material.type === selectedType
  );



  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Training Materials
            </h1>
            <p className="mt-2 text-gray-600">
              Access our comprehensive library of training resources and
              educational content
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { key: 'all', label: 'All Materials' },
                { key: 'video', label: 'Videos' },
                { key: 'blog', label: 'Articles' },
                { key: 'download', label: 'Downloads' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedType(tab.key as any)}
                  className={`${
                    selectedType === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">
                Loading training materials...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-8 max-w-md mx-auto">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Training Materials
                </h3>
                <p className="text-gray-600">
                  {selectedType === 'all'
                    ? 'No training materials are currently available.'
                    : `No ${selectedType} materials are currently available.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <div
                  key={material._id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow h-fit"
                >
                  <div className="p-6">
                    <ContentRenderer 
                      material={material}
                      showMetadata={true}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
