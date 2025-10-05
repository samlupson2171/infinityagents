/**
 * Image upload handler for WYSIWYG editor
 */

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class ImageUploadHandler {
  /**
   * Upload image file and return URL for embedding in rich content
   */
  static async uploadImage(file: File): Promise<string> {
    try {
      // Validate image file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to file upload endpoint
      const response = await fetch('/api/admin/training/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Return URL for the uploaded image
      // This will be used by TinyMCE to insert the image
      return `/api/training/files/${result.file.id}/download`;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Validate image file before upload
   */
  private static validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, GIF, and WebP images are allowed',
      };
    }

    // Check file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Image size cannot exceed 5MB',
      };
    }

    // Check minimum size
    if (file.size < 100) {
      return {
        isValid: false,
        error: 'Image file is too small',
      };
    }

    return { isValid: true };
  }

  /**
   * Handle image paste from clipboard
   */
  static async handleImagePaste(clipboardData: DataTransfer): Promise<string | null> {
    const items = Array.from(clipboardData.items);
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          try {
            return await this.uploadImage(file);
          } catch (error) {
            console.error('Paste image upload error:', error);
            throw error;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Process image for optimization (basic client-side processing)
   */
  static async processImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(processedFile);
              } else {
                reject(new Error('Image processing failed'));
              }
            },
            file.type,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Invalid image file'));
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * Create image upload handler for TinyMCE
 */
export function createTinyMCEImageHandler() {
  return async (file: File): Promise<string> => {
    try {
      // Optionally process/optimize image before upload
      const processedFile = await ImageUploadHandler.processImage(file);
      
      // Upload the processed image
      return await ImageUploadHandler.uploadImage(processedFile);
    } catch (error) {
      console.error('TinyMCE image upload error:', error);
      throw error;
    }
  };
}