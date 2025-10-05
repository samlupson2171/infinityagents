/**
 * Media optimization utilities for image processing and management
 */

export interface ImageSizes {
  thumbnail: { width: 150, height: 150 };
  small: { width: 400, height: 300 };
  medium: { width: 800, height: 600 };
  large: { width: 1200, height: 900 };
  hero: { width: 1920, height: 1080 };
}

export interface OptimizedImage {
  id: string;
  originalName: string;
  sizes: {
    [K in keyof ImageSizes]: {
      url: string;
      width: number;
      height: number;
      size: number; // file size in bytes
    };
  };
  altText: string;
  metadata: {
    format: string;
    originalSize: number;
    uploadedAt: Date;
    dimensions: {
      width: number;
      height: number;
    };
  };
}

export interface ImageUploadProgress {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: OptimizedImage;
}

export class MediaOptimizer {
  private static readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly IMAGE_SIZES: ImageSizes = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 400, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 },
    hero: { width: 1920, height: 1080 }
  };

  /**
   * Validate image file before upload
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported format. Please use JPEG, PNG, or WebP images.`
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`
      };
    }

    return { valid: true };
  }

  /**
   * Get image dimensions from file
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Create canvas for image resizing
   */
  static createResizedCanvas(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
    quality: number = 0.9
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate aspect ratio and crop/fit logic
    const sourceAspect = sourceCanvas.width / sourceCanvas.height;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0, sy = 0, sw = sourceCanvas.width, sh = sourceCanvas.height;

    if (sourceAspect > targetAspect) {
      // Source is wider, crop width
      sw = sourceCanvas.height * targetAspect;
      sx = (sourceCanvas.width - sw) / 2;
    } else {
      // Source is taller, crop height
      sh = sourceCanvas.width / targetAspect;
      sy = (sourceCanvas.height - sh) / 2;
    }

    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

    return canvas;
  }

  /**
   * Convert file to canvas
   */
  static fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Convert canvas to blob
   */
  static canvasToBlob(canvas: HTMLCanvasElement, format: string = 'image/webp', quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, format, quality);
    });
  }

  /**
   * Generate multiple image sizes from source file
   */
  static async generateImageSizes(file: File): Promise<{ [K in keyof ImageSizes]: Blob }> {
    const sourceCanvas = await this.fileToCanvas(file);
    const results = {} as { [K in keyof ImageSizes]: Blob };

    for (const [sizeName, dimensions] of Object.entries(this.IMAGE_SIZES)) {
      const resizedCanvas = this.createResizedCanvas(
        sourceCanvas,
        dimensions.width,
        dimensions.height
      );

      const blob = await this.canvasToBlob(resizedCanvas, 'image/webp', 0.9);
      results[sizeName as keyof ImageSizes] = blob;
    }

    return results;
  }

  /**
   * Upload image with progress tracking
   */
  static async uploadImage(
    file: File,
    altText: string,
    onProgress?: (progress: number) => void
  ): Promise<OptimizedImage> {
    // Validate file
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(10);

    // Get original dimensions
    const dimensions = await this.getImageDimensions(file);
    onProgress?.(20);

    // Generate multiple sizes
    const imageSizes = await this.generateImageSizes(file);
    onProgress?.(60);

    // Create form data for upload
    const formData = new FormData();
    formData.append('originalFile', file);
    formData.append('altText', altText);

    // Add all generated sizes
    for (const [sizeName, blob] of Object.entries(imageSizes)) {
      formData.append(`size_${sizeName}`, blob, `${sizeName}.webp`);
    }

    onProgress?.(80);

    // Upload to server
    const response = await fetch('/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    onProgress?.(100);

    return result;
  }

  /**
   * Delete image and all its sizes
   */
  static async deleteImage(imageId: string): Promise<void> {
    const response = await fetch(`/api/admin/media/${imageId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  /**
   * Update image alt text
   */
  static async updateImageAltText(imageId: string, altText: string): Promise<void> {
    const response = await fetch(`/api/admin/media/${imageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ altText })
    });

    if (!response.ok) {
      throw new Error(`Update failed: ${response.statusText}`);
    }
  }
}