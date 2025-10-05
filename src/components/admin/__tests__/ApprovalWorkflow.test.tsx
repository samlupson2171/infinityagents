import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalWorkflow from '../ApprovalWorkflow';
import { IDestination } from '@/models/Destination';

// Mock fetch
global.fetch = vi.fn();

describe('ApprovalWorkflow', () => {
  const mockOnApprovalChange = vi.fn();

  const mockDestination: Partial<IDestination> = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Destination',
    slug: 'test-destination',
    status: 'draft',
    approvalWorkflow: {
      isRequired: false,
      status: 'not_required',
      approvalLevel: 'admin'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should render approval workflow status correctly', () => {
    render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('Approval Workflow')).toBeInTheDocument();
    expect(screen.getByText('No approval required')).toBeInTheDocument();
  });

  it('should show request approval button when approval can be requested', () => {
    render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    expect(screen.getByText('Request Approval')).toBeInTheDocument();
  });

  it('should show approve/reject buttons for admin when approval is pending', () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Requested by: John Doe')).toBeInTheDocument();
  });

  it('should not show approve/reject buttons for non-admin users', () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('should open request modal when request approval is clicked', async () => {
    render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Provide context or specific areas you\'d like reviewed...')).toBeInTheDocument();
    });
  });

  it('should open review modal when approve is clicked', async () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approve Content')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add any final comments or suggestions...')).toBeInTheDocument();
    });
  });

  it('should open review modal when reject is clicked', async () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

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
      expect(screen.getByPlaceholderText('Please explain what needs to be changed before approval...')).toBeInTheDocument();
    });
  });

  it('should call API when approval is requested', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...mockDestination,
          approvalWorkflow: {
            isRequired: true,
            status: 'pending'
          }
        }
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    // Open modal
    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });

    // Add comment
    const commentInput = screen.getByPlaceholderText('Provide context or specific areas you\'d like reviewed...');
    fireEvent.change(commentInput, { target: { value: 'Please review the new content sections' } });

    // Submit request
    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/approval`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: 'Please review the new content sections' })
        })
      );
      expect(mockOnApprovalChange).toHaveBeenCalled();
    });
  });

  it('should call API when content is approved', async () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        destination: {
          ...pendingDestination,
          approvalWorkflow: {
            ...pendingDestination.approvalWorkflow,
            status: 'approved'
          }
        }
      })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    // Open approve modal
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(screen.getByText('Approve Content')).toBeInTheDocument();
    });

    // Add comment
    const commentInput = screen.getByPlaceholderText('Add any final comments or suggestions...');
    fireEvent.change(commentInput, { target: { value: 'Content looks great!' } });

    // Submit approval
    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/admin/destinations/${mockDestination._id}/approval`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'approve',
            comment: 'Content looks great!' 
          })
        })
      );
      expect(mockOnApprovalChange).toHaveBeenCalled();
    });
  });

  it('should require comment when rejecting content', async () => {
    const pendingDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'pending' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date(),
        approvalLevel: 'admin' as const
      }
    };

    render(
      <ApprovalWorkflow
        destination={pendingDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    // Open reject modal
    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => {
      expect(screen.getByText('Reject Content')).toBeInTheDocument();
    });

    // Try to submit without comment
    const rejectButton = screen.getByText('Reject');
    expect(rejectButton).toBeDisabled();

    // Add comment
    const commentInput = screen.getByPlaceholderText('Please explain what needs to be changed before approval...');
    fireEvent.change(commentInput, { target: { value: 'Please update the accommodation section' } });

    // Now button should be enabled
    expect(rejectButton).not.toBeDisabled();
  });

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      json: () => Promise.resolve({ error: 'Approval request failed' })
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ApprovalWorkflow
        destination={mockDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="user"
      />
    );

    // Open modal and submit
    fireEvent.click(screen.getByText('Request Approval'));
    
    await waitFor(() => {
      expect(screen.getByText('Request Approval')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Request Approval'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to request approval: Approval request failed');
    });

    alertSpy.mockRestore();
  });

  it('should display approval workflow details when available', () => {
    const approvedDestination = {
      ...mockDestination,
      approvalWorkflow: {
        isRequired: true,
        status: 'approved' as const,
        requestedBy: {
          _id: '507f1f77bcf86cd799439013',
          name: 'John Doe',
          email: 'john@test.com'
        },
        requestedAt: new Date('2024-01-15T10:00:00Z'),
        reviewedBy: {
          _id: '507f1f77bcf86cd799439011',
          name: 'Admin User',
          email: 'admin@test.com'
        },
        reviewedAt: new Date('2024-01-15T11:00:00Z'),
        comments: 'Content approved after review',
        approvalLevel: 'admin' as const
      }
    };

    render(
      <ApprovalWorkflow
        destination={approvedDestination as IDestination}
        onApprovalChange={mockOnApprovalChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Requested by: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by: Admin User')).toBeInTheDocument();
    expect(screen.getByText('Content approved after review')).toBeInTheDocument();
  });
});