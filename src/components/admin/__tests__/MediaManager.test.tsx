import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MediaManager from '../MediaManager';
import { MediaOptimizer } from '@/lib/media-optimizer';

// Mock the MediaOptimizer
vi.mock('@/lib/media-optimizer', () => ({
  MediaOptimizer: {
    validateImage: vi.fn(),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    updateImageAltText: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

const mockImage = {
  id: 'test-image-1',
  originalName: 'test.jpg',
  sizes: {
    thumbnail: { url: '/test-thumb.webp', width: 150, height: 150, size: 5000 },
    small: { url: '/test-small.webp', width: 400, height: 300, size: 15000 },
    medium: { url: '/test-medium.webp', width: 800, height: 600, size: 45000 },
    large: { url: '/test-large.webp', width: 1200, height: 900, size: 85000 },
    hero: { url: '/test-hero.webp', width: 1920, height: 1080, size: 150000 }
  },
  altText: 'Test image',
  metadata: {
    format: 'image/jpeg',
    originalSize: 200000,
    uploadedAt: new Date(),
    dimensions: { width: 1920, height: 1080 }
  }
};

describe('MediaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders upload area correctly', () => {
    render(<MediaManager />);
    
    expect(screen.getByText('Drop images here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Supports JPEG, PNG, WebP up to 10MB')).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
  });

  it('displays selected images', () => {
    render(<MediaManager selectedImages={[mockImage]} />);
    
    expect(screen.getByText('Selected Images (1/10)')).toBeInTheDocument();
    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    const mockOnImagesChange = vi.fn();
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    vi.mocked(MediaOptimizer.uploadImage).mockResolvedValue(mockImage);

    render(<MediaManager onImagesChange={mockOnImagesChange} />);
    
    const fileInput = screen.getByRole('button', { name: 'Choose Files' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(MediaOptimizer.uploadImage).toHaveBeenCalledWith(
        mockFile,
        '',
        expect.any(Function)
      );
    });
  });

  it('handles drag and drop', async () => {
    const mockOnImagesChange = vi.fn();
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    vi.mocked(MediaOptimizer.uploadImage).mockResolvedValue(mockImage);

    render(<MediaManager onImagesChange={mockOnImagesChange} />);
    
    const dropZone = screen.getByText('Drop images here or click to browse').closest('div');
    
    // Simulate drag enter
    fireEvent.dragEnter(dropZone!, {
      dataTransfer: {
        files: [mockFile]
      }
    });
    
    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile]
      }
    });
    
    await waitFor(() => {
      expect(MediaOptimizer.uploadImage).toHaveBeenCalledWith(
        mockFile,
        '',
        expect.any(Function)
      );
    });
  });

  it('shows upload progress', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    let progressCallback: ((progress: number) => void) | undefined;
    
    vi.mocked(MediaOptimizer.uploadImage).mockImplementation(async (file, altText, onProgress) => {
      progressCallback = onProgress;
      // Simulate progress updates
      setTimeout(() => progressCallback?.(25), 10);
      setTimeout(() => progressCallback?.(50), 20);
      setTimeout(() => progressCallback?.(75), 30);
      setTimeout(() => progressCallback?.(100), 40);
      return mockImage;
    });

    render(<MediaManager />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    // Check that uploading text appears
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('handles upload errors', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const errorMessage = 'Upload failed';
    
    vi.mocked(MediaOptimizer.uploadImage).mockRejectedValue(new Error(errorMessage));

    render(<MediaManager />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles image removal', async () => {
    const mockOnImagesChange = vi.fn();
    vi.mocked(MediaOptimizer.deleteImage).mockResolvedValue();

    render(
      <MediaManager 
        selectedImages={[mockImage]} 
        onImagesChange={mockOnImagesChange}
      />
    );
    
    // Hover over image to show controls
    const imageContainer = screen.getByAltText('Test image').closest('.group');
    fireEvent.mouseEnter(imageContainer!);
    
    // Click remove button
    const removeButton = screen.getByTitle('Remove image');
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(MediaOptimizer.deleteImage).toHaveBeenCalledWith('test-image-1');
      expect(mockOnImagesChange).toHaveBeenCalledWith([]);
    });
  });

  it('handles alt text editing', async () => {
    const mockOnImagesChange = vi.fn();
    vi.mocked(MediaOptimizer.updateImageAltText).mockResolvedValue();

    render(
      <MediaManager 
        selectedImages={[mockImage]} 
        onImagesChange={mockOnImagesChange}
      />
    );
    
    // Click edit button
    const editButton = screen.getByTitle('Edit alt text');
    fireEvent.click(editButton);
    
    // Modal should appear
    expect(screen.getByText('Edit Alt Text')).toBeInTheDocument();
    
    // Update alt text
    const textarea = screen.getByPlaceholderText('Describe this image for screen readers...');
    fireEvent.change(textarea, { target: { value: 'Updated alt text' } });
    
    // Save changes
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(MediaOptimizer.updateImageAltText).toHaveBeenCalledWith(
        'test-image-1',
        'Updated alt text'
      );
    });
  });

  it('respects maxImages limit', async () => {
    const mockFile1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const mockFile2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<MediaManager maxImages={1} selectedImages={[mockImage]} />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile1, mockFile2],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    expect(alertSpy).toHaveBeenCalledWith('Maximum 1 images allowed');
    expect(MediaOptimizer.uploadImage).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('handles single image mode', async () => {
    const mockFile1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const mockFile2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<MediaManager allowMultiple={false} />);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [mockFile1, mockFile2],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    expect(alertSpy).toHaveBeenCalledWith('Only one image is allowed');
    expect(MediaOptimizer.uploadImage).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('shows alt text status indicators', () => {
    const imageWithoutAlt = {
      ...mockImage,
      altText: ''
    };

    render(<MediaManager selectedImages={[mockImage, imageWithoutAlt]} />);
    
    expect(screen.getByText('Test image')).toBeInTheDocument();
    expect(screen.getByText('No alt text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<MediaManager className="custom-class" />);
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});