import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MediaManager from '../MediaManager';

// Mock fetch globally
global.fetch = vi.fn();

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1920;
  naturalHeight = 1080;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
  
  set src(_: string) {
    // Trigger onload after setting src
  }
} as any;

// Mock canvas and context
const mockContext = {
  drawImage: vi.fn(),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high'
};

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockContext),
  toBlob: vi.fn((callback) => {
    callback(new Blob(['test'], { type: 'image/webp' }));
  })
};

global.document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas as any;
  }
  if (tagName === 'img') {
    return new Image() as any;
  }
  return {} as any;
});

describe('MediaManager Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles complete upload workflow', async () => {
    const mockOnImagesChange = vi.fn();
    const mockUploadResponse = {
      id: 'test-image-1',
      originalName: 'test.jpg',
      sizes: {
        thumbnail: { url: '/test-thumb.webp', width: 150, height: 150, size: 5000 },
        medium: { url: '/test-medium.webp', width: 800, height: 600, size: 45000 }
      },
      altText: '',
      metadata: {
        format: 'image/jpeg',
        originalSize: 200000,
        uploadedAt: new Date(),
        dimensions: { width: 1920, height: 1080 }
      }
    };

    // Mock successful upload
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUploadResponse)
    } as any);

    render(<MediaManager onImagesChange={mockOnImagesChange} />);
    
    // Create a test file
    const testFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
    
    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Wait for upload to complete
    await waitFor(() => {
      expect(mockOnImagesChange).toHaveBeenCalledWith([mockUploadResponse]);
    }, { timeout: 3000 });
    
    // Verify fetch was called with correct parameters
    expect(fetch).toHaveBeenCalledWith('/api/admin/media/upload', {
      method: 'POST',
      body: expect.any(FormData)
    });
  });

  it('handles upload progress updates', async () => {
    const mockUploadResponse = {
      id: 'test-image-1',
      originalName: 'test.jpg',
      sizes: {},
      altText: '',
      metadata: {}
    };

    // Mock upload with delay to see progress
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve(mockUploadResponse)
          } as any);
        }, 100);
      })
    );

    render(<MediaManager />);
    
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
    
    // Should show file name
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
  });

  it('handles upload errors gracefully', async () => {
    // Mock upload failure
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Server Error'
    } as any);

    render(<MediaManager />);
    
    const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [testFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('validates file types before upload', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<MediaManager />);
    
    // Try to upload unsupported file type
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should not call fetch for invalid file
    expect(fetch).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('handles drag and drop file upload', async () => {
    const mockOnImagesChange = vi.fn();
    const mockUploadResponse = {
      id: 'test-image-1',
      originalName: 'dropped.jpg',
      sizes: {},
      altText: '',
      metadata: {}
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUploadResponse)
    } as any);

    render(<MediaManager onImagesChange={mockOnImagesChange} />);
    
    const dropZone = screen.getByText('Drop images here or click to browse').closest('div');
    const testFile = new File(['test'], 'dropped.jpg', { type: 'image/jpeg' });
    
    // Simulate drag and drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [testFile]
      }
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});