import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DestinationPreview from '../DestinationPreview';
import DestinationSideBySideEditor from '../DestinationSideBySideEditor';
import { IDestination } from '@/models/Destination';

// Mock the DestinationContentEditor for the SideBySideEditor test
vi.mock('../DestinationContentEditor', () => ({
  default: ({ sections, onSectionUpdate }: any) => (
    <div data-testid="destination-content-editor">
      <button 
        onClick={() => onSectionUpdate('overview', { 
          ...sections.overview, 
          content: '<p>Updated overview content</p>' 
        })}
      >
        Update Overview
      </button>
      <input
        data-testid="name-input"
        defaultValue={sections.overview?.title || ''}
        onChange={(e) => {
          // Simulate updating the destination name through sections
          onSectionUpdate('overview', {
            ...sections.overview,
            title: e.target.value
          });
        }}
      />
    </div>
  )
}));

const mockDestination: IDestination = {
  _id: 'test-destination-id',
  name: 'Beautiful Beach Resort',
  slug: 'beautiful-beach-resort',
  country: 'Spain',
  region: 'Costa del Sol',
  description: 'A stunning beachfront destination with crystal clear waters and golden sand beaches.',
  heroImage: 'https://example.com/hero-beach.jpg',
  gradientColors: 'from-blue-500 to-teal-400',
  sections: {
    overview: {
      title: 'Overview',
      content: '<p>Welcome to our beautiful beach resort destination.</p>',
      highlights: ['Pristine beaches', 'Crystal clear water', 'Water sports'],
      tips: ['Best visited in summer', 'Book accommodation early'],
      images: ['https://example.com/beach1.jpg'],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: '<p>Luxury hotels and beachfront resorts.</p>',
      highlights: ['5-star hotels', 'Beachfront locations'],
      tips: ['Book with sea view'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: '<p>Historic sites and natural wonders.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: '<p>Miles of pristine coastline.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: '<p>Vibrant bars and clubs.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: '<p>Fresh seafood and local cuisine.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: '<p>Travel tips and essential information.</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  quickFacts: {
    population: '50,000',
    language: 'Spanish',
    currency: 'EUR',
    timeZone: 'CET',
    airport: 'MAL',
    flightTime: '2.5 hours from London',
    climate: 'Mediterranean',
    bestTime: 'May to September'
  },
  status: 'draft',
  aiGenerated: false,
  createdBy: 'admin-user-id',
  lastModifiedBy: 'admin-user-id',
  createdAt: new Date(),
  updatedAt: new Date()
} as IDestination;

describe('DestinationPreview Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Standalone Preview Mode', () => {
    it('renders complete destination preview with all sections', () => {
      render(<DestinationPreview destination={mockDestination} />);

      // Check hero section
      expect(screen.getByText('Beautiful Beach Resort')).toBeInTheDocument();
      expect(screen.getByText('Spain, Costa del Sol')).toBeInTheDocument();

      // Check description
      expect(screen.getByText(/stunning beachfront destination/)).toBeInTheDocument();

      // Check quick facts
      expect(screen.getByText('Quick Facts')).toBeInTheDocument();
      expect(screen.getByText('50,000')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();

      // Check all content sections
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Accommodation')).toBeInTheDocument();
      expect(screen.getByText('Attractions')).toBeInTheDocument();
      expect(screen.getByText('Beaches')).toBeInTheDocument();
      expect(screen.getByText('Nightlife')).toBeInTheDocument();
      expect(screen.getByText('Dining')).toBeInTheDocument();
      expect(screen.getByText('Practical Information')).toBeInTheDocument();

      // Check highlights and tips
      expect(screen.getByText('Pristine beaches')).toBeInTheDocument();
      expect(screen.getByText('Best visited in summer')).toBeInTheDocument();
    });

    it('handles responsive preview modes correctly', () => {
      const { container } = render(<DestinationPreview destination={mockDestination} />);

      // Test desktop mode (default)
      expect(screen.getByText('Desktop')).toHaveClass('bg-white');

      // Switch to tablet mode
      fireEvent.click(screen.getByText('Tablet'));
      expect(screen.getByText('Tablet')).toHaveClass('bg-white');
      
      // Check for tablet-specific styling
      const tabletFrame = container.querySelector('.w-\\[768px\\]');
      expect(tabletFrame).toBeInTheDocument();

      // Switch to mobile mode
      fireEvent.click(screen.getByText('Mobile'));
      expect(screen.getByText('Mobile')).toHaveClass('bg-white');
      
      // Check for mobile-specific styling
      const mobileFrame = container.querySelector('.w-\\[375px\\]');
      expect(mobileFrame).toBeInTheDocument();
    });

    it('generates and displays shareable preview links', async () => {
      const mockPreviewResponse = {
        previewUrl: 'https://example.com/destinations/beautiful-beach-resort/preview?token=abc123',
        token: 'abc123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        expiresIn: '24 hours'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreviewResponse)
      });

      render(<DestinationPreview destination={mockDestination} />);

      // Click share button
      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);

      // Wait for API call and modal to appear
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

      // Check modal content
      expect(screen.getByText('Share Preview Link')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockPreviewResponse.previewUrl)).toBeInTheDocument();
      expect(screen.getByText(/expires in 24 hours/)).toBeInTheDocument();
    });
  });

  describe('Side-by-Side Editor Integration', () => {
    it('renders editor and preview in side-by-side layout', () => {
      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check header
      expect(screen.getByText('Edit Destination: Beautiful Beach Resort')).toBeInTheDocument();

      // Check both panels are present
      expect(screen.getByTestId('destination-content-editor')).toBeInTheDocument();
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();

      // Check action buttons
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('shows real-time preview updates when content changes', async () => {
      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Initially no unsaved changes
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeDisabled();

      // Make a change in the editor
      const updateButton = screen.getByText('Update Overview');
      fireEvent.click(updateButton);

      // Should show unsaved changes indicator
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).not.toBeDisabled();

      // Should show live indicator
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('handles save workflow correctly', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const mockOnCancel = vi.fn();

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Overview');
      fireEvent.click(updateButton);

      // Save the changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      // Wait for save to complete
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            _id: 'test-destination-id',
            name: 'Beautiful Beach Resort',
            sections: expect.objectContaining({
              overview: expect.objectContaining({
                content: '<p>Updated overview content</p>'
              })
            })
          })
        );
      });

      // Should clear unsaved changes indicator
      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('handles cancel workflow with confirmation', () => {
      const mockOnSave = vi.fn();
      const mockOnCancel = vi.fn();
      
      // Mock confirm dialog
      window.confirm = vi.fn().mockReturnValue(true);

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Overview');
      fireEvent.click(updateButton);

      // Try to cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to cancel?'
      );

      // Should call onCancel
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles missing images gracefully', () => {
      const destinationWithoutImages = {
        ...mockDestination,
        heroImage: undefined,
        sections: {
          ...mockDestination.sections,
          overview: {
            ...mockDestination.sections.overview,
            images: []
          }
        }
      };

      render(<DestinationPreview destination={destinationWithoutImages} />);

      // Should still render without errors
      expect(screen.getByText('Beautiful Beach Resort')).toBeInTheDocument();
    });

    it('handles empty content sections gracefully', () => {
      const destinationWithEmptyContent = {
        ...mockDestination,
        sections: {
          ...mockDestination.sections,
          overview: {
            ...mockDestination.sections.overview,
            content: '',
            highlights: [],
            tips: []
          }
        }
      };

      render(<DestinationPreview destination={destinationWithEmptyContent} />);

      // Should still render section headers
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('handles API errors when generating preview links', async () => {
      const mockError = { error: 'Server error' };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockError)
      });

      window.alert = vi.fn();

      render(<DestinationPreview destination={mockDestination} />);

      const shareButton = screen.getByText('Share Preview');
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Failed to generate preview link: Server error'
        );
      });
    });
  });

  describe('Accessibility and Performance', () => {
    it('provides proper ARIA labels and semantic structure', () => {
      render(<DestinationPreview destination={mockDestination} />);

      // Check for proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabIndex', '-1');
      });
    });

    it('handles large content efficiently', () => {
      const largeContentDestination = {
        ...mockDestination,
        sections: {
          ...mockDestination.sections,
          overview: {
            ...mockDestination.sections.overview,
            content: '<p>' + 'Large content '.repeat(1000) + '</p>',
            highlights: Array(50).fill('Highlight item'),
            tips: Array(50).fill('Tip item')
          }
        }
      };

      const startTime = performance.now();
      render(<DestinationPreview destination={largeContentDestination} />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
      
      // Should still display content correctly
      expect(screen.getByText('Beautiful Beach Resort')).toBeInTheDocument();
    });
  });
});