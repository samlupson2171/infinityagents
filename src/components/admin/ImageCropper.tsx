'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio?: number; // width/height ratio, e.g., 16/9
  onCropComplete?: (cropData: CropArea, croppedImageBlob: Blob) => void;
  onCancel?: () => void;
  className?: string;
}

export default function ImageCropper({
  imageUrl,
  aspectRatio,
  onCropComplete,
  onCancel,
  className = ''
}: ImageCropperProps) {
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageDimensions.width > 0) {
      const initialSize = Math.min(imageDimensions.width, imageDimensions.height) * 0.5;
      const initialWidth = aspectRatio ? initialSize : initialSize;
      const initialHeight = aspectRatio ? initialSize / aspectRatio : initialSize;
      
      setCropArea({
        x: (imageDimensions.width - initialWidth) / 2,
        y: (imageDimensions.height - initialHeight) / 2,
        width: initialWidth,
        height: initialHeight
      });
    }
  }, [imageLoaded, imageDimensions, aspectRatio]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
      setImageLoaded(true);
    }
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | 'resize') => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragStart({ x, y });
    
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    if (isDragging) {
      setCropArea(prev => {
        const newX = Math.max(0, Math.min(prev.x + deltaX, imageDimensions.width - prev.width));
        const newY = Math.max(0, Math.min(prev.y + deltaY, imageDimensions.height - prev.height));
        
        return { ...prev, x: newX, y: newY };
      });
    } else if (isResizing) {
      setCropArea(prev => {
        let newWidth = Math.max(50, prev.width + deltaX);
        let newHeight = aspectRatio ? newWidth / aspectRatio : Math.max(50, prev.height + deltaY);
        
        // Constrain to image bounds
        newWidth = Math.min(newWidth, imageDimensions.width - prev.x);
        newHeight = Math.min(newHeight, imageDimensions.height - prev.y);
        
        // Maintain aspect ratio if specified
        if (aspectRatio) {
          const ratioWidth = newHeight * aspectRatio;
          const ratioHeight = newWidth / aspectRatio;
          
          if (ratioWidth <= imageDimensions.width - prev.x) {
            newWidth = ratioWidth;
          } else {
            newHeight = ratioHeight;
          }
        }
        
        return { ...prev, width: newWidth, height: newHeight };
      });
    }

    setDragStart({ x, y });
  }, [isDragging, isResizing, dragStart, imageDimensions, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Generate cropped image
  const generateCroppedImage = useCallback(async (): Promise<Blob | null> => {
    if (!imageRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to crop area
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    // Draw cropped portion
    ctx.drawImage(
      imageRef.current,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/webp', 0.9);
    });
  }, [cropArea]);

  // Handle crop completion
  const handleCrop = useCallback(async () => {
    const croppedBlob = await generateCroppedImage();
    if (croppedBlob && onCropComplete) {
      onCropComplete(cropArea, croppedBlob);
    }
  }, [cropArea, generateCroppedImage, onCropComplete]);

  // Calculate display scale
  const containerWidth = 600; // Fixed container width
  const displayScale = containerWidth / imageDimensions.width;

  return (
    <div className={`image-cropper ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Crop Image
        </h3>

        {/* Crop Area */}
        <div 
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden mx-auto"
          style={{ 
            width: containerWidth,
            height: imageDimensions.height * displayScale
          }}
        >
          {/* Background Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
            draggable={false}
          />

          {/* Crop Overlay */}
          {imageLoaded && (
            <>
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              
              {/* Crop area */}
              <div
                className="absolute border-2 border-white cursor-move"
                style={{
                  left: cropArea.x * displayScale,
                  top: cropArea.y * displayScale,
                  width: cropArea.width * displayScale,
                  height: cropArea.height * displayScale,
                  backgroundColor: 'transparent'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'drag')}
              >
                {/* Resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 bg-white border border-gray-400 cursor-se-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, 'resize');
                  }}
                />
                
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white border-opacity-30" />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Crop Info */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Crop Area: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} pixels
          {aspectRatio && (
            <span className="ml-2">
              (Ratio: {aspectRatio.toFixed(2)}:1)
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply Crop
          </button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  );
}