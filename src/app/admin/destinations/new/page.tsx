'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DestinationForm } from '@/components/admin/DestinationForm';

interface DestinationFormData {
  name: string;
  country: string;
  region: string;
  description: string;
  slug?: string;
  heroImage?: string;
  galleryImages?: string[];
}

export default function NewDestinationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (destinationData: DestinationFormData) => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/admin/destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(destinationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create destination');
      }

      await response.json();
      
      // Redirect back to destinations list
      router.push('/admin/destinations');
      
    } catch (error) {
      console.error('Error creating destination:', error);
      alert(`Failed to create destination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      router.push('/admin/destinations');
    }
  };

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
                <span className="text-gray-900">New Destination</span>
              </nav>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Create New Destination</h1>
                  <p className="text-gray-600 mt-2">Add a new destination to your travel guide</p>
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
                    onClick={() => {
                      // This will be handled by the form component
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create Destination'}
                  </button>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-sm border">
              <DestinationForm
                onSubmit={handleSave}
                onCancel={handleCancel}
                isEditing={false}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}