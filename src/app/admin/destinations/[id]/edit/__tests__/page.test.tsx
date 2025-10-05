import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRouter, useParams } from 'next/navigation';
import EditDestinationPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

// Mock the ProtectedRoute component
vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the DestinationForm component
vi.mock('@/components/admin/DestinationForm', () => ({
  DestinationForm: ({ destination, onSubmit, onCancel }: {
    destination: any;
    onSubmit: Function;
    onCancel: Function;
  }) => (
    <div data-testid="destination-form">
      <div data-testid="destination-name">{destination?.name}</div>
      <button onClick={() => onSubmit({
        name: 'Updated Destination',
        country: 'Spain',
        region: 'Costa Blanca',
        description: 'Updated description',
        slug: 'updated-destination'
      })} data-testid="form-submit">
        Update
      </button>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel
      </button>
    </div>
  ),
}));

// Mock shared components
vi.mock('@/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

vi.mock('@/components/shared/Toast', () => ({
  Toast: ({ type, message, onClose }: { type: string; message: string; onClose: Function }) => (
    <div data-testid="toast" data-type={type} onClick={onClose}>
      {message}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe('EditDestinationPage', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };

  const mockDestination = {
    _id: '68d697c22be6165fbe3d14f0',
    name: 'Test Destination',
    country: 'Spain',
    region: 'Costa Blanca',
    description: 'A test destination',
    slug: 'test-destination',
    status: 'draft',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(useParams).mockReturnValue({ id: '68d697c22be6165fbe3d14f0' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching destination', () => {
      // Mock pending fetch
      vi.mocked(global.fetch).mockReturnValue(
        new Promise(() => { }) as any
      );

      render(<EditDestinationPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading destination...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when destination fetch fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<EditDestinationPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Destination')).toBeInTheDocument();
        expect(screen.getByText('Failed to load destination. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows error message when destination is not found', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      render(<EditDestinationPage />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Destination')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ destination: mockDestination }),
      } as Response);
    });

    it('renders the page with destination data', async () => {
      render(<EditDestinationPage />);

      await waitFor(() => {
        expect(screen.getByText('Edit Destination')).toBeInTheDocument();
        expect(screen.getByText('Update the information for Test Destination')).toBeInTheDocument();
        expect(screen.getByTestId('destination-form')).toBeInTheDocument();
        expect(screen.getByTestId('destination-name')).toHaveTextContent('Test Destination');
      });
    });

    it('renders breadcrumb navigation', async () => {
      render(<EditDestinationPage />);

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Destinations')).toBeInTheDocument();
        expect(screen.getByText('Test Destination')).toBeInTheDocument();
      });
    });

    it('renders header buttons', async () => {
      render(<EditDestinationPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    beforeEach(() => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ destination: mockDestination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            destination: { ...mockDestination, name: 'Updated Destination' }
          }),
        } as Response);
    });

    it('handles form submission successfully', async () => {
      const user = userEvent.setup();

      render(<EditDestinationPage />);

      // Wait for destination to load
      await waitFor(() => {
        expect(screen.getByTestId('destination-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/destinations/68d697c22be6165fbe3d14f0',
          expect.objectContaining({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Updated Destination',
              country: 'Spain',
              region: 'Costa Blanca',
              description: 'Updated description',
              slug: 'updated-destination'
            }),
          })
        );
      });
    });

    it('handles form submission errors', async () => {
      const user = userEvent.setup();

      // Mock successful fetch for initial load, then error for update
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ destination: mockDestination }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Validation failed' }),
        } as Response);

      render(<EditDestinationPage />);

      // Wait for destination to load
      await waitFor(() => {
        expect(screen.getByTestId('destination-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast')).toBeInTheDocument();
        expect(screen.getByText(/Failed to update destination: Validation failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    beforeEach(() => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ destination: mockDestination }),
      } as Response);
    });

    it('navigates back to destinations list when cancel is clicked', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn().mockReturnValue(true);

      render(<EditDestinationPage />);

      // Wait for destination to load
      await waitFor(() => {
        expect(screen.getByTestId('destination-form')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to cancel? Any unsaved changes will be lost.'
      );
      expect(mockPush).toHaveBeenCalledWith('/admin/destinations');
    });

    it('does not navigate when cancel confirmation is rejected', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn().mockReturnValue(false);

      render(<EditDestinationPage />);

      // Wait for destination to load
      await waitFor(() => {
        expect(screen.getByTestId('destination-form')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});