import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DestinationPreview from '../DestinationPreview';
import { IDestination } from '@/models/Destination';

// Mock fetch
global.fetch = vi.fn();

const mockDestination: IDestination = {
  _id: 'test-id',
  name: 'Test Destination',
  slug: 'test-destination',
  country: 'Test Country',
  region: 'Test Region',
  description: 'A beautiful test destination with amazing views.',
  heroImage: 'https://example.com/hero.jpg',
  gradientColors: 'from-blue-600 to-orange-500',
  sections: {
    overview: {
      title: 'Overview',
      content: '<p>This is the overview section.</p>',
      highlights: ['Beautiful beaches', 'Great weather'],
      tips: ['Bring sunscreen', 'Book early'],
      images: ['https://example.com/overview1.jpg'],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: '<p>Great hotels available.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: true
    },
    attractions: {
      title: 'Attractions',
      content: '<p>Many attractions to visit.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: '<p>Pristine beaches.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: '<p>Vibrant nightlife scene.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: '<p>Excellent restaurants.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: '<p>Useful travel information.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  quickFacts: {
    population: '100,000',
    language: 'English',
    currency: 'USD',
    timeZone: 'UTC+0',
    airport: 'TEST',
    flightTime: '8 hours',
    climate: 'Tropical',
    bestTime: 'Year-round'
  },
  status: 'draft',
  aiGenerated: false,
  createdBy: 'user-id',
  lastModifiedBy: 'user-id',
  createdAt: new Date(),
  updatedAt: new Date()
} as IDestination;

describe('DestinationPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders destination preview with basic information', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      expect(screen.getByText('Test Destination')).toBeInTheDocument();
      expect(screen.getByText('Test Country, Test Region')).toBeInTheDocument();
      expect(screen.getByText('A beautiful test destination with amazing views.')).toBeInTheDocument();
    });

    it('renders all content sections', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Accommodation')).toBeInTheDocument();
      expect(screen.getByText('Attractions')).toBeInTheDocument();
      expect(screen.getByText('Beaches')).toBeInTheDocument();
      expect(screen.getByText('Nightlife')).toBeInTheDocument();
      expect(screen.getByText('Dining')).toBeInTheDocument();
      expect(screen.getByText('Practical Information')).toBeInTheDocument();
    });

    it('renders quick facts when available', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      expect(screen.getByText('Quick Facts')).toBeInTheDocument();
      expect(screen.getByText('100,000')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    it('renders highlights and tips when available', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      expect(screen.getByText('Beautiful beaches')).toBeInTheDocument();
      expect(screen.getByText('Great weather')).toBeInTheDocument();
      expect(screen.getByText('Bring sunscreen')).toBeInTheDocument();
      expect(screen.getByText('Book early')).toBeInTheDocument();
    });
  });

  describe('Responsive Preview Modes', () => {
    it('renders desktop mode by default', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const desktopButton = screen.getByText('Desktop');
      expect(desktopButton).toHaveClass('bg-white');
    });

    it('switches between device modes', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const tabletButton = screen.getByText('Tablet');
      const mobileButton = screen.getByText('Mobile');
      
      fireEvent.click(tabletButton);
      expect(tabletButton).toHaveClass('bg-white');
      
      fireEvent.click(mobileButton);
      expect(mobileButton).toHaveClass('bg-white');
    });

    it('applies correct CSS classes for different device modes', () => {
      const { container } = render(<DestinationPreview destination={mockDestination} />);
      
      // Test tablet mode
      fireEvent.click(screen.getByText('Tablet'));
      const tabletFrame = container.querySelector('.w-\\[768px\\]');
      expect(tabletFrame).toBeInTheDocument();
      
      // Test mobile mode
      fireEvent.click(screen.getByText('Mobile'));
      const mobileFrame = container.querySelector('.w-\\[375px\\]');
      expect(mobileFrame).toBeInTheDocument();
    });
  });

  describe('Side-by-Side Mode', () => {
    it('renders in side-by-side mode with different styling', () => {
      render(
        <DestinationPreview 
          destination={mockDestination} 
          mode="side-by-side"
          isEditing={true}
        />
      );
      
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('shows real-time indicator when editing', () => {
      render(
        <DestinationPreview 
          destination={mockDestination} 
          mode="side-by-side"
          isEditing={true}
        />
      );
      
      const liveIndicator = screen.getByText('Live');
      expect(liveIndicator).toBeInTheDocument();
      expect(liveIndicator.previousElementSibling).toHaveClass('animate-pulse');
    });

    it('does not show share button in side-by-side mode', () => {
      render(
        <DestinationPreview 
          destination={mockDestination} 
          mode="side-by-side"
        />
      );
      
      expect(screen.queryByText('Share Preview')).not.toBeInTheDocument();
    });

    it('applies scaled content in side-by-side mode', () => {
      const { container } = render(
        <DestinationPreview 
          destination={mockDestination} 
          mode="side-by-side"
        />
      );
      
      const scaledContent = container.querySelector('[style*="scale(0.8)"]');
      expect(scaledContent).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('updates preview when destination changes', async () => {
      const onDestinationChange = vi.fn();
      const { rerender } = render(
        <DestinationPreview 
          destination={mockDestination} 
          isEditing={true}
          onDestinationChange={onDestinationChange}
        />
      );
      
      const updatedDestination = {
        ...mockDestination,
        name: 'Updated Destination Name'
      };
      
      rerender(
        <DestinationPreview 
          destination={updatedDestination} 
          isEditing={true}
          onDestinationChange={onDestinationChange}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Updated Destination Name')).toBeInTheDocument();
      });
    });

    it('shows last update time when editing', () => {
      render(
        <DestinationPreview 
          destination={mockDestination} 
          isEditing={true}
        />
      );
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('Share Preview Functionality', () => {
    it('generates shareable link when share button is clicked', async () => {
      const mockResponse = {
        previewUrl: 'https://example.com/preview/abc123'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      render(<DestinationPreview destination={mockDestination} />);
      
      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/admin/destinations/${mockDestination._id}/preview`,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: 24 })
          })
        );
      });
      
      expect(screen.getByText('Share Preview Link')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com/preview/abc123')).toBeInTheDocument();
    });

    it('handles share link generation errors', async () => {
      const mockError = { error: 'Failed to generate link' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError)
      });
      
      // Mock alert
      window.alert = vi.fn();
      
      render(<DestinationPreview destination={mockDestination} />);
      
      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Failed to generate preview link: Failed to generate link'
        );
      });
    });

    it('copies preview URL to clipboard', async () => {
      const mockResponse = {
        previewUrl: 'https://example.com/preview/abc123'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });
      
      window.alert = vi.fn();
      
      render(<DestinationPreview destination={mockDestination} />);
      
      // Generate share link first
      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Share Preview Link')).toBeInTheDocument();
      });
      
      // Copy to clipboard
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://example.com/preview/abc123'
        );
        expect(window.alert).toHaveBeenCalledWith('Preview link copied to clipboard!');
      });
    });

    it('closes share modal when close button is clicked', async () => {
      const mockResponse = {
        previewUrl: 'https://example.com/preview/abc123'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      render(<DestinationPreview destination={mockDestination} />);
      
      // Open share modal
      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByText('Share Preview Link')).toBeInTheDocument();
      });
      
      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Share Preview Link')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing hero image gracefully', () => {
      const destinationWithoutImage = {
        ...mockDestination,
        heroImage: undefined
      };
      
      render(<DestinationPreview destination={destinationWithoutImage} />);
      
      expect(screen.getByText('Test Destination')).toBeInTheDocument();
    });

    it('handles missing quick facts gracefully', () => {
      const destinationWithoutQuickFacts = {
        ...mockDestination,
        quickFacts: undefined
      };
      
      render(<DestinationPreview destination={destinationWithoutQuickFacts} />);
      
      expect(screen.queryByText('Quick Facts')).not.toBeInTheDocument();
    });

    it('handles image load errors with fallback', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const heroImage = screen.getByAltText('Test Destination');
      
      // Simulate image load error
      fireEvent.error(heroImage);
      
      expect(heroImage).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    });
  });

  describe('Accessibility', () => {
    it('provides proper alt text for images', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const heroImage = screen.getByAltText('Test Destination');
      expect(heroImage).toBeInTheDocument();
    });

    it('uses semantic HTML structure', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('provides keyboard navigation for interactive elements', () => {
      render(<DestinationPreview destination={mockDestination} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Buttons should be focusable by default
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('Performance', () => {
    it('debounces updates when editing', async () => {
      const onDestinationChange = vi.fn();
      const { rerender } = render(
        <DestinationPreview 
          destination={mockDestination} 
          isEditing={true}
          onDestinationChange={onDestinationChange}
        />
      );
      
      // Simulate rapid updates
      for (let i = 0; i < 5; i++) {
        const updatedDestination = {
          ...mockDestination,
          name: `Updated ${i}`
        };
        
        rerender(
          <DestinationPreview 
            destination={updatedDestination} 
            isEditing={true}
            onDestinationChange={onDestinationChange}
          />
        );
      }
      
      // Wait for debounce
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });
      
      expect(screen.getByText('Updated 4')).toBeInTheDocument();
    });
  });
});