import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublishingControls from '../PublishingControls';
import { IDestination } from '@/models/Destination';

// Mock fetch
global.fetch = vi.fn();

describe('PublishingControls', () => {
  const mockOnStatusChange = vi.fn();

  const mockDestination: Partial<IDestination> = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Destination',
    slug: 'test-destination',
    status: 'draft',
    approvalWorkflow: {
      isRequired: false,
      status: 'not_required',
      approvalLevel: 'admin'
    },
    publishingHistory: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should render publishing status correctly', () => {
    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Publishing Status')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should show publish and schedule buttons for draft status', () => {
    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Publish Now')).toBeInTheDocument();
    expect(screen.getByText('Schedule Publish')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('should show unpublish button for published status', () => {
    const publishedDestination = {
      ...mockDestination,
      status: 'published' as const,
      publishedAt: new Date()
    };

    render(
      <PublishingControls
        destination={publishedDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Unpublish')).toBeInTheDocument();
    expect(screen.queryByText('Publish Now')).not.toBeInTheDocument();
  });

  it('should disable publish button when approval is required but not approved', () => {
    const destinationWithApproval = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        approvalLevel: 'admin' as const
      }
    };

    render(
      <PublishingControls
        destination={destinationWithApproval as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    const publishButton = screen.getByText('Publish Now');
    expect(publishButton).toBeDisabled();
  });

  it('should enable publish button when approval is approved', () => {
    const approvedDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'approved' as const,
        approvalLevel: 'admin' as const
      }
    };

    render(
      <PublishingControls
        destination={approvedDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    const publishButton = screen.getByText('Publish Now');
    expect(publishButton).not.toBeDisabled();
  });

  it('should open comment modal when publish button is clicked', async () => {
    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    fireEvent.click(screen.getByText('Publish Now'));

    await waitFor(() => {
      expect(screen.getByText('Publish Destination')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add a comment about this action...')).toBeInTheDocument();
    });
  });

  it('should open schedule modal when schedule button is clicked', async () => {
    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    fireEvent.click(screen.getByText('Schedule Publish'));

    await waitFor(() => {
      expect(screen.getByText('Schedule Publishing')).toBeInTheDocument();
      expect(screen.getByLabelText('Publish Date & Time')).toBeInTheDocument();
    });
  });

  it('should call API and onStatusChange when publish is confirmed', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: { ...mockDestination, status: 'published' }
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Open modal
    fireEvent.click(screen.getByText('Publish Now'));

    await waitFor(() => {
      expect(screen.getByText('Publish Destination')).toBeInTheDocument();
    });

    // Add comment
    const commentInput = screen.getByPlaceholderText('Add a comment about this action...');
    fireEvent.change(commentInput, { target: { value: 'Ready for launch' } });

    // Confirm publish
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/publish`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: 'Ready for launch' })
        })
      );
      expect(mockOnStatusChange).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: 'Publishing failed' })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Open modal and confirm
    fireEvent.click(screen.getByText('Publish Now'));
    
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to publish destination: Publishing failed');
    });

    alertSpy.mockRestore();
  });

  it('should show scheduled publish date when destination is scheduled', () => {
    const scheduledDate = new Date('2024-12-25T10:00:00Z');
    const scheduledDestination = {
      ...mockDestination,
      scheduledPublishAt: scheduledDate
    };

    render(
      <PublishingControls
        destination={scheduledDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/Scheduled:/)).toBeInTheDocument();
    expect(screen.getByText('Cancel Schedule')).toBeInTheDocument();
  });

  it('should show approval workflow status when required', () => {
    const destinationWithApproval = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        approvalLevel: 'admin' as const
      }
    };

    render(
      <PublishingControls
        destination={destinationWithApproval as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Approval Workflow')).toBeInTheDocument();
    expect(screen.getByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('Requested by: John Doe')).toBeInTheDocument();
  });

  it('should validate scheduled date is in the future', async () => {
    render(
      <PublishingControls
        destination={mockDestination as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Open schedule modal
    fireEvent.click(screen.getByText('Schedule Publish'));

    await waitFor(() => {
      expect(screen.getByText('Schedule Publishing')).toBeInTheDocument();
    });

    // Try to schedule for past date (should be prevented by input min attribute)
    const dateInput = screen.getByLabelText('Publish Date & Time');
    expect(dateInput).toHaveAttribute('min');
    
    // The Schedule button should be disabled when no date is selected
    const scheduleButton = screen.getByText('Schedule');
    expect(scheduleButton).toBeDisabled();
  });
});