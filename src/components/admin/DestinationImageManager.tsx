'use client';

import React, { useState, useCallback } from 'react';
import { useToast } from '@/components/shared/Toast';

interface DestinationImageManagerProps {
  destinationId: string;
  heroImage?: string;
  galleryImages?: string[];
  onHeroImageChange: (url: string | undefined) => void;
  onGalleryImagesChange: (urls: string[]) => void;
  readOnly?: boolean;
}

export default function DestinationImageManager({
  destinationId,
  heroImage,
  galleryImages = [],
  onHeroImageChange,
  onGalleryImagesChange,
  readOnly = false
}: DestinationImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleImageUpload = useCallback(async (files: FileList, isHero: boolean = false) => {
    if (!files.length || readOnly) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`);
        }

        // Validate file size (5MB limit for images)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB.`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('isPublic', 'true');
        formData.append('description', isHero ? 'Hero image' : 'Gallery image');

        const response = await fetch(`/api/admin/destinations/${destinationId}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        return result.file.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      if (isHero && uploadedUrls.length > 0) {
        onHeroImageChange(uploadedUrls[0]);
        showSuccess('Hero image uploaded successfully');
      } else {
        const newGalleryImages = [...galleryImages, ...uploadedUrls];
        onGalleryImagesChange(newGalleryImages);
        showSuccess(`${uploadedUrls.length} image(s) added to gallery`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUploading(false);
    }
  }, [destinationId, heroImage, galleryImages, onHeroImageChange, onGalleryImagesChange, readOnly, showSuccess, showError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, isHero: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files, isHero);
    }
  }, [handleImageUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, isHero: boolean = false) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files, isHero);
    }
    // Reset input
    e.target.value = '';
  }, [handleImageUpload]);

  const removeHeroImage = () => {
    if (!readOnly) {
      onHeroImageChange(undefined);
      showSuccess('Hero image removed');
    }
  };

  const removeGalleryImage = (index: number) => {
    if (!readOnly) {
      const newGalleryImages = galleryImages.filter((_, i) => i !== index);
      onGalleryImagesChange(newGalleryImages);
      showSuccess('Image removed from gallery');
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Image Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Featured Image</h3>
        <p className="text-sm text-gray-600 mb-4">
          This image will be displayed as the main hero image for the destination.
        </p>
        
        {heroImage ? (
          <div className="relative group">
            <img
              src={heroImage}
              alt="Hero image"
              className="w-full h-64 object-cover rounded-lg border border-gray-300"
            />
            {!readOnly && (
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <button
                  onClick={removeHeroImage}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
        ) : !readOnly ? (
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
              ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, true)}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileInput(e, true)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-2">
              <div className="text-4xl">🖼️</div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isUploading ? 'Uploading...' : 'Upload hero image'}
                </p>
                <p className="text-sm text-gray-500">
                  Drop an image here or click to browse (Max 5MB)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🖼️</div>
            <p>No hero image set</p>
          </div>
        )}
      </div>

      {/* Gallery Images Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Image Gallery</h3>
            <p className="text-sm text-gray-600">
              Additional images that will be displayed in the destination gallery.
            </p>
          </div>
          <span className="text-sm text-gray-500">{galleryImages.length} image(s)</span>
        </div>

        {/* Gallery Grid */}
        {galleryImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {galleryImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                />
                {!readOnly && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => removeGalleryImage(index)}
                      className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Area for Gallery */}
        {!readOnly && (
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
              ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, false)}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileInput(e, false)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="space-y-2">
              <div className="text-3xl">📸</div>
              <div>
                <p className="text-base font-medium text-gray-900">
                  {isUploading ? 'Uploading...' : 'Add images to gallery'}
                </p>
                <p className="text-sm text-gray-500">
                  Drop images here or click to browse (Max 5MB each)
                </p>
              </div>
            </div>
          </div>
        )}

        {galleryImages.length === 0 && readOnly && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📸</div>
            <p>No gallery images</p>
          </div>
        )}
      </div>
    </div>
  );
}