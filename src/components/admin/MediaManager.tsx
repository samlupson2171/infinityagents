'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MediaOptimizer, OptimizedImage, ImageUploadProgress } from '@/lib/media-optimizer';

interface MediaManagerProps {
  selectedImages?: OptimizedImage[];
  onImagesChange?: (images: OptimizedImage[]) => void;
  maxImages?: number;
  allowMultiple?: boolean;
  className?: string;
}

interface ImageCropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function MediaManager({
  selectedImages = [],
  onImagesChange,
  maxImages = 10,
  allowMultiple = true,
  className = ''
}: MediaManagerProps) {
  const [uploads, setUploads] = useState<ImageUploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [editingImage, setEditingImage] = useState<OptimizedImage | null>(null);
  const [cropData, setCropData] = useState<ImageCropData | null>(null);
  const [altTextInput, setAltTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (!allowMultiple && fileArray.length > 1) {
      alert('Only one image is allowed');
      return;
    }

    if (selectedImages.length + fileArray.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Create upload progress entries
    const newUploads: ImageUploadProgress[] = fileArray.map(file => ({
      id: `upload_${Date.now()}_${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Process each file
    for (const upload of newUploads) {
      try {
        const result = await MediaOptimizer.uploadImage(
          upload.file,
          '', // Default empty alt text
          (progress) => {
            setUploads(prev => prev.map(u => 
              u.id === upload.id ? { ...u, progress } : u
            ));
          }
        );

        // Update upload status
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'completed', result }
            : u
        ));

        // Add to selected images
        if (onImagesChange) {
          onImagesChange([...selectedImages, result]);
        }

      } catch (error) {
        console.error('Upload failed:', error);
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
            : u
        ));
      }
    }

    // Clear completed uploads after delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.status !== 'completed'));
    }, 2000);
  }, [selectedImages, onImagesChange, maxImages, allowMultiple]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove image
  const handleRemoveImage = useCallback(async (image: OptimizedImage) => {
    try {
      await MediaOptimizer.deleteImage(image.id);
      if (onImagesChange) {
        onImagesChange(selectedImages.filter(img => img.id !== image.id));
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    }
  }, [selectedImages, onImagesChange]);

  // Edit image alt text
  const handleEditAltText = useCallback((image: OptimizedImage) => {
    setEditingImage(image);
    setAltTextInput(image.altText);
  }, []);

  // Save alt text
  const handleSaveAltText = useCallback(async () => {
    if (!editingImage) return;

    try {
      await MediaOptimizer.updateImageAltText(editingImage.id, altTextInput);
      
      // Update local state
      if (onImagesChange) {
        onImagesChange(selectedImages.map(img => 
          img.id === editingImage.id 
            ? { ...img, altText: altTextInput }
            : img
        ));
      }

      setEditingImage(null);
      setAltTextInput('');
    } catch (error) {
      console.error('Failed to update alt text:', error);
      alert('Failed to update alt text');
    }
  }, [editingImage, altTextInput, selectedImages, onImagesChange]);

  return (
    <div className={`media-manager ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">📷</div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Drop images here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports JPEG, PNG, WebP up to 10MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-gray-900">Uploading...</h3>
          {uploads.map(upload => (
            <div key={upload.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {upload.file.name}
                </span>
                <span className="text-sm text-gray-500">
                  {upload.status === 'error' ? 'Failed' : `${upload.progress}%`}
                </span>
              </div>
              
              {upload.status !== 'error' ? (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  {upload.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Images Grid */}
      {selectedImages.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Selected Images ({selectedImages.length}/{maxImages})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedImages.map(image => (
              <div key={image.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={image.sizes.medium.url}
                    alt={image.altText || 'Uploaded image'}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Image Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditAltText(image)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Edit alt text"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image)}
                    className="p-2 bg-white rounded-full text-red-600 hover:bg-gray-100 transition-colors"
                    title="Remove image"
                  >
                    🗑️
                  </button>
                </div>

                {/* Alt Text Indicator */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className={`
                    text-xs px-2 py-1 rounded text-white text-center truncate
                    ${image.altText ? 'bg-green-600' : 'bg-red-600'}
                  `}>
                    {image.altText || 'No alt text'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alt Text Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Alt Text
            </h3>
            
            <div className="mb-4">
              <img
                src={editingImage.sizes.medium.url}
                alt={editingImage.altText}
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text (for accessibility)
              </label>
              <textarea
                value={altTextInput}
                onChange={(e) => setAltTextInput(e.target.value)}
                placeholder="Describe this image for screen readers..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Good alt text describes the image content and context
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAltText}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}