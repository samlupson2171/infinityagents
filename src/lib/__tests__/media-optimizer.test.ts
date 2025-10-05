import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaOptimizer } from '../media-optimizer';

// Mock DOM APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  })),
  toBlob: vi.fn()
};

const mockImage = {
  naturalWidth: 1920,
  naturalHeight: 1080,
  onload: null as any,
  onerror: null as any,
  src: ''
};

// Mock document.createElement
global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  if (tagName === 'img') {
    return mockImage as any;
  }
  return {} as any;
});

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch
global.fetch = vi.fn();

describe('MediaOptimizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateImage', () => {
    it('validates supported image formats', () => {
      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File(['test'], 'test.png', { type: 'image/png' });
      const webpFile = new File(['test'], 'test.webp', { type: 'image/webp' });

      expect(MediaOptimizer.validateImage(jpegFile)).toEqual({ valid: true });
      expect(MediaOptimizer.validateImage(pngFile)).toEqual({ valid: true });
      expect(MediaOptimizer.validateImage(webpFile)).toEqual({ valid: true });
    });

    it('rejects unsupported formats', () => {
      const gifFile = new File(['test'], 'test.gif', { type: 'image/gif' });
      const result = MediaOptimizer.validateImage(gifFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });

    it('rejects files that are too large', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      const result = MediaOptimizer.validateImage(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('accepts files within size limit', () => {
      const normalFile = new File(['test'], 'normal.jpg', { type: 'image/jpeg' });
      const result = MediaOptimizer.validateImage(normalFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('getImageDimensions', () => {
    it('returns image dimensions', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock successful image load
      const dimensionsPromise = MediaOptimizer.getImageDimensions(file);
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const dimensions = await dimensionsPromise;
      
      expect(dimensions).toEqual({
        width: 1920,
        height: 1080
      });
    });

    it('rejects on image load error', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const dimensionsPromise = MediaOptimizer.getImageDimensions(file);
      
      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror();
        }
      }, 0);

      await expect(dimensionsPromise).rejects.toThrow('Failed to load image');
    });
  });

  describe('createResizedCanvas', () => {
    it('creates canvas with correct dimensions', () => {
      const sourceCanvas = {
        width: 1920,
        height: 1080,
        getContext: vi.fn(() => mockCanvas.getContext())
      } as any;

      const result = MediaOptimizer.createResizedCanvas(sourceCanvas, 800, 600);

      expect(result).toBe(mockCanvas);
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);
    });

    it('throws error when canvas context is not available', () => {
      // Mock createElement to return a canvas with null context
      const mockCanvasWithNullContext = {
        ...mockCanvas,
        getContext: vi.fn(() => null)
      };
      
      vi.mocked(document.createElement).mockReturnValueOnce(mockCanvasWithNullContext as any);

      const sourceCanvas = {
        width: 1920,
        height: 1080
      } as any;

      expect(() => {
        MediaOptimizer.createResizedCanvas(sourceCanvas, 800, 600);
      }).toThrow('Failed to get canvas context');
    });
  });

  describe('fileToCanvas', () => {
    it('converts file to canvas', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const canvasPromise = MediaOptimizer.fileToCanvas(file);
      
      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload();
        }
      }, 0);

      const canvas = await canvasPromise;
      
      expect(canvas).toBe(mockCanvas);
      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);
    });
  });

  describe('canvasToBlob', () => {
    it('converts canvas to blob', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/webp' });
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(mockBlob);
      });

      const blob = await MediaOptimizer.canvasToBlob(mockCanvas as any);
      
      expect(blob).toBe(mockBlob);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/webp',
        0.9
      );
    });

    it('rejects when blob creation fails', async () => {
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(null);
      });

      await expect(MediaOptimizer.canvasToBlob(mockCanvas as any))
        .rejects.toThrow('Failed to convert canvas to blob');
    });
  });

  describe('uploadImage', () => {
    it('uploads image successfully', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        id: 'test-id',
        originalName: 'test.jpg',
        sizes: {},
        altText: 'test alt',
        metadata: {}
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any);

      // Mock canvas toBlob to resolve immediately
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/webp' }));
      });

      // Start upload and immediately trigger image load
      const uploadPromise = MediaOptimizer.uploadImage(file, 'test alt');
      
      // Trigger image load synchronously
      if (mockImage.onload) {
        mockImage.onload();
      }

      const result = await uploadPromise;
      
      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith('/api/admin/media/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
    }, 10000);

    it('handles upload errors', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      } as any);

      // Mock canvas toBlob to resolve immediately
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/webp' }));
      });

      const uploadPromise = MediaOptimizer.uploadImage(file, 'test alt');
      
      // Trigger image load synchronously
      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(uploadPromise).rejects.toThrow('Upload failed: Server Error');
    }, 10000);

    it('calls progress callback', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const progressCallback = vi.fn();

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      } as any);

      // Mock canvas toBlob to resolve immediately
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/webp' }));
      });

      const uploadPromise = MediaOptimizer.uploadImage(file, 'test alt', progressCallback);
      
      // Trigger image load synchronously
      if (mockImage.onload) {
        mockImage.onload();
      }

      await uploadPromise;
      
      expect(progressCallback).toHaveBeenCalledWith(10);
      expect(progressCallback).toHaveBeenCalledWith(20);
      expect(progressCallback).toHaveBeenCalledWith(60);
      expect(progressCallback).toHaveBeenCalledWith(80);
      expect(progressCallback).toHaveBeenCalledWith(100);
    }, 10000);
  });

  describe('deleteImage', () => {
    it('deletes image successfully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true
      } as any);

      await MediaOptimizer.deleteImage('test-id');
      
      expect(fetch).toHaveBeenCalledWith('/api/admin/media/test-id', {
        method: 'DELETE'
      });
    });

    it('handles delete errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      } as any);

      await expect(MediaOptimizer.deleteImage('test-id'))
        .rejects.toThrow('Delete failed: Not Found');
    });
  });

  describe('updateImageAltText', () => {
    it('updates alt text successfully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true
      } as any);

      await MediaOptimizer.updateImageAltText('test-id', 'new alt text');
      
      expect(fetch).toHaveBeenCalledWith('/api/admin/media/test-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ altText: 'new alt text' })
      });
    });

    it('handles update errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Server Error'
      } as any);

      await expect(MediaOptimizer.updateImageAltText('test-id', 'new alt text'))
        .rejects.toThrow('Update failed: Server Error');
    });
  });
});