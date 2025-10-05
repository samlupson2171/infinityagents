'use client';

import React, { useState } from 'react';
import MediaManager from './MediaManager';
import { OptimizedImage } from '@/lib/media-optimizer';

/**
 * Demo component showing MediaManager integration with destination forms
 */
export default function MediaManagerDemo() {
  const [heroImage, setHeroImage] = useState<OptimizedImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<OptimizedImage[]>([]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Media Management System Demo
        </h1>
        
        <div className="space-y-8">
          {/* Hero Image Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Hero Image
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a single hero image for the destination page header.
            </p>
            <MediaManager
              selectedImages={heroImage}
              onImagesChange={setHeroImage}
              maxImages={1}
              allowMultiple={false}
              className="border border-gray-200 rounded-lg p-4"
            />
          </div>

          {/* Gallery Images Section */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Gallery Images
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload multiple images for the destination gallery (max 8 images).
            </p>
            <MediaManager
              selectedImages={galleryImages}
              onImagesChange={setGalleryImages}
              maxImages={8}
              allowMultiple={true}
              className="border border-gray-200 rounded-lg p-4"
            />
          </div>

          {/* Summary Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Hero Image: {heroImage.length > 0 ? heroImage[0].originalName : 'None selected'}</p>
              <p>Gallery Images: {galleryImages.length} selected</p>
              <p>Total Images: {heroImage.length + galleryImages.length}</p>
            </div>
          </div>

          {/* Features Demonstrated */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Features Demonstrated</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Drag and drop file upload</li>
              <li>✅ Multiple image size generation</li>
              <li>✅ Progress indicators during upload</li>
              <li>✅ Alt text management for accessibility</li>
              <li>✅ Image cropping and editing interface</li>
              <li>✅ Automatic image optimization</li>
              <li>✅ Single vs multiple image modes</li>
              <li>✅ File validation and error handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}