import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublishingControls from '../PublishingControls';
import ApprovalWorkflow from '../ApprovalWorkflow';
import { IDestination } from '@/models/Destination';

// Mock fetch
global.fetch = vi.fn();

describe('Publishing Workflow Integration', () => {
  const mockOnStatusChange = vi.fn();
  const mockOnApprovalChange = vi.fn();

  const mockDestination: Partial<IDestination> = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Destination',
    slug: 'test-destination',
    status: 'draft',
    approvalWorkflow: {
      isRequired: true,
      status: 'not_required',
      approvalLevel: 'admin'
    },
    publishingHistory: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should complete full approval and publishing workflow', async () => {
    // Mock API responses
    const requestApprovalResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...mockDestination,
          approvalWorkflow: {
            isRequired: true,
            status: 'pending',
            requestedBy: { _id: '1', name: 'User', email: 'user@test.com' },
            requestedAt: new Date(),
            approvalLevel: 'admin'
          }
        }
      })
    };

    const approveResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...mockDestination,
          approvalWorkflow: {
            isRequired: true,
            status: 'approved',
            requestedBy: { _id: '1', name: 'User', email: 'user@test.com' },
            reviewedBy: { _id: '2', name: 'Admin', email: 'admin@test.com' },
            requestedAt: new Date(),
            reviewedAt: new Date(),
            approvalLevel: 'admin'
          }
        }
      })
    };

    const publishResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...mockDestination,
          status: 'published',
          publishedAt: new Date(),
          approvalWorkflow: {
            isRequired: true,
            status: 'approved',
            approvalLevel: 'admin'
          }
        }
      })
    };

    (global.fetch as any)
      .mockResolvedValueOnce(requestApprovalResponse)
      .mockResolvedValueOnce(approveResponse)
      .mockResolvedValueOnce(publishResponse);

    // Step 1: Request approval
    const { rerender } = render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    fireEvent.click(screen.getByText('Request Approval'));
    
    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/approval`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    // Step 2: Admin approves (simulate state change)
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: { _id: '1', name: 'User', email: 'user@test.com' },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    rerender(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    fireEvent.click(screen.getByText('Approve'));
    
    await waitFor(() => {
      expect(screen.getByText('Approve Content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/approval`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ action: 'approve', comment: '' })
        })
      );
    });

    // Step 3: Publish (simulate approved state)
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

    fireEvent.click(publishButton);
    
    await waitFor(() => {
      expect(screen.getByText('Publish Destination')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/publish`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('should prevent publishing when approval is required but not approved', () => {
    const destinationNeedingApproval = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        approvalLevel: 'admin' as const
      }
    };

    render(
      <PublishingControls
        destination={destinationNeedingApproval as IDestination}
        onStatusChange={mockOnStatusChange}
      />
    );

    const publishButton = screen.getByText('Publish Now');
    expect(publishButton).toBeDisabled();
  });

  it('should show rejection workflow', async () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: { _id: '1', name: 'User', email: 'user@test.com' },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    const rejectResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...pendingDestination,
          approvalWorkflow: {
            ...pendingDestination.approvalWorkflow,
            status: 'rejected',
            reviewedBy: { _id: '2', name: 'Admin', email: 'admin@test.com' },
            reviewedAt: new Date(),
            comments: 'Needs more details'
          }
        }
      })
    };

    (global.fetch as any).mockResolvedValue(rejectResponse);

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    fireEvent.click(screen.getByText('Reject'));
    
    await waitFor(() => {
      expect(screen.getByText('Reject Content')).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText('Please explain what needs to be changed before approval...');
    fireEvent.change(commentInput, { target: { value: 'Needs more details' } });

    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/approval`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ 
            action: 'reject',
            comment: 'Needs more details' 
          })
        })
      );
    });
  });
});