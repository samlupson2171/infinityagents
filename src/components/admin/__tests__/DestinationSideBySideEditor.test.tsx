import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DestinationSideBySideEditor from '../DestinationSideBySideEditor';
import { IDestination } from '@/models/Destination';

// Mock the child components
vi.mock('../DestinationPreview', () => ({
  default: ({ destination, mode, isEditing }: any) => (
    <div data-testid="destination-preview">
      <div>Preview Mode: {mode}</div>
      <div>Is Editing: {isEditing ? 'true' : 'false'}</div>
      <div>Destination: {destination.name}</div>
    </div>
  )
}));

vi.mock('../DestinationContentEditor', () => ({
  default: ({ sections, onSectionUpdate }: any) => (
    <div data-testid="destination-content-editor">
      <button 
        onClick={() => onSectionUpdate('overview', { 
          ...sections.overview, 
          content: 'Updated content' 
        })}
      >
        Update Content
      </button>
      <div>Sections: {Object.keys(sections).length}</div>
    </div>
  )
}));


const mockDestination: IDestination = {
  _id: 'test-id',
  name: 'Test Destination',
  slug: 'test-destination',
  country: 'Test Country',
  region: 'Test Region',
  description: 'A test destination',
  gradientColors: 'from-blue-600 to-orange-500',
  sections: {
    overview: {
      title: 'Overview',
      content: '<p>Overview content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: '<p>Accommodation content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: '<p>Attractions content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: '<p>Beaches content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: '<p>Nightlife content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: '<p>Dining content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: '<p>Practical content</p>',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  status: 'draft',
  aiGenerated: false,
  createdBy: 'user-id',
  lastModifiedBy: 'user-id',
  createdAt: new Date(),
  updatedAt: new Date()
} as IDestination;

describe('DestinationSideBySideEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the editor with destination name in header', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Destination: Test Destination')).toBeInTheDocument();
    });

    it('renders both editor and preview panels', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByTestId('destination-content-editor')).toBeInTheDocument();
      expect(screen.getByTestId('destination-preview')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('passes correct props to preview component', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Preview Mode: side-by-side')).toBeInTheDocument();
      expect(screen.getByText('Is Editing: true')).toBeInTheDocument();
      expect(screen.getByText('Destination: Test Destination')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('initially shows no unsaved changes', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });

    it('shows unsaved changes indicator when content is modified', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Simulate content update
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).not.toBeDisabled();
    });

    it('updates preview when content changes', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Initially shows original destination
      expect(screen.getByText('Destination: Test Destination')).toBeInTheDocument();

      // Simulate content update - this should trigger the preview update
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // The preview should still show the destination name (structure doesn't change)
      expect(screen.getByText('Destination: Test Destination')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave with updated destination when save button is clicked', async () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            _id: 'test-id',
            name: 'Test Destination',
            sections: expect.objectContaining({
              overview: expect.objectContaining({
                content: 'Updated content'
              })
            })
          })
        );
      });
    });

    it('shows saving state during save operation', async () => {
      // Mock a slow save operation
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Start save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Should show saving state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });

    it('clears unsaved changes indicator after successful save', async () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      const saveError = new Error('Save failed');
      mockOnSave.mockRejectedValue(saveError);

      // Mock alert
      window.alert = vi.fn();

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Try to save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'Failed to save destination. Please try again.'
        );
      });

      // Should still show unsaved changes
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked with no changes', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows confirmation dialog when canceling with unsaved changes', () => {
      // Mock confirm
      window.confirm = vi.fn().mockReturnValue(true);

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Try to cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(window.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not cancel when user declines confirmation', () => {
      // Mock confirm to return false
      window.confirm = vi.fn().mockReturnValue(false);

      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Make a change
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Try to cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes for layout', () => {
      const { container } = render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check for flex layout
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('h-full', 'flex', 'flex-col');

      // Check for split panels
      const editorPanel = container.querySelector('.w-1\\/2');
      expect(editorPanel).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Integration', () => {
    it('passes correct sections to content editor', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Check that all 7 sections are passed
      expect(screen.getByText('Sections: 7')).toBeInTheDocument();
    });

    it('handles section updates from content editor', () => {
      render(
        <DestinationSideBySideEditor
          destination={mockDestination}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      // Simulate section update
      const updateButton = screen.getByText('Update Content');
      fireEvent.click(updateButton);

      // Should show unsaved changes
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });
});