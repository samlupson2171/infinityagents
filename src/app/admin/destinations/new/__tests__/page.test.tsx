import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRouter } from 'next/navigation';
import NewDestinationPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the ProtectedRoute component
vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the DestinationForm component
vi.mock('@/components/admin/DestinationForm', () => ({
  DestinationForm: ({ onSubmit, onCancel }: { onSubmit: Function; onCancel: Function }) => (
    <div data-testid="destination-form">
      <button 
        onClick={() => onSubmit({
          name: 'Test Destination',
          country: 'Spain',
          region: 'Costa Blanca',
          description: 'A beautiful test destination for our comprehensive testing suite.',
          slug: 'test-destination'
        })}
        data-testid="form-submit"
      >
        Submit Form
      </button>
      <button onClick={onCancel} data-testid="form-cancel">
        Cancel Form
      </button>
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();
global.alert = vi.fn();
global.confirm = vi.fn();

describe('NewDestinationPage', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(global.confirm).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Rendering', () => {
    it('renders the page with correct title and breadcrumbs', () => {
      render(<NewDestinationPage />);

      expect(screen.getByText('Create New Destination')).toBeInTheDocument();
      expect(screen.getByText('Add a new destination to your travel guide')).toBeInTheDocument();
      
      // Check breadcrumbs
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Destinations')).toBeInTheDocument();
      expect(screen.getByText('New Destination')).toBeInTheDocument();
    });

    it('renders the destination form component', () => {
      render(<NewDestinationPage />);

      expect(screen.getByTestId('destination-form')).toBeInTheDocument();
    });

    it('renders header buttons', () => {
      render(<NewDestinationPage />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Destination/ })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('successfully creates a destination and redirects', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          destination: {
            _id: '507f1f77bcf86cd799439012',
            name: 'Test Destination',
            slug: 'test-destination'
          }
        }),
      } as Response);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/destinations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Destination',
            country: 'Spain',
            region: 'Costa Blanca',
            description: 'A beautiful test destination for our comprehensive testing suite.',
            slug: 'test-destination'
          }),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/destinations');
      });
    });

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock API error response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Validation failed',
          validationErrors: [
            { field: 'name', message: 'Name is required' }
          ]
        }),
      } as Response);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to create destination: Validation failed');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles network errors', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to create destination: Network error');
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      let resolvePromise: Function;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(global.fetch).mockReturnValueOnce(slowPromise as any);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      // Check that the button shows loading state
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Creating.../ });
        expect(createButton).toBeInTheDocument();
        expect(createButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          destination: { _id: '123', name: 'Test' }
        }),
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('navigates back to destinations list when header cancel is clicked', async () => {
      const user = userEvent.setup();

      render(<NewDestinationPage />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to cancel? Any unsaved changes will be lost.'
      );
      expect(mockPush).toHaveBeenCalledWith('/admin/destinations');
    });

    it('does not navigate when cancel confirmation is rejected', async () => {
      const user = userEvent.setup();
      vi.mocked(global.confirm).mockReturnValue(false);

      render(<NewDestinationPage />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles form cancel callback', async () => {
      const user = userEvent.setup();

      render(<NewDestinationPage />);

      const formCancelButton = screen.getByTestId('form-cancel');
      await user.click(formCancelButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to cancel? Any unsaved changes will be lost.'
      );
      expect(mockPush).toHaveBeenCalledWith('/admin/destinations');
    });
  });

  describe('Button States', () => {
    it('disables buttons during saving', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      let resolvePromise: Function;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(global.fetch).mockReturnValueOnce(slowPromise as any);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      // Check that buttons are disabled during saving
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        const createButton = screen.getByRole('button', { name: /Creating.../ });
        
        expect(cancelButton).toBeDisabled();
        expect(createButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({
          destination: { _id: '123', name: 'Test' }
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('handles malformed API response', async () => {
      const user = userEvent.setup();
      
      // Mock malformed response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}), // No error field
      } as Response);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to create destination: Failed to create destination');
      });
    });

    it('handles JSON parsing errors', async () => {
      const user = userEvent.setup();
      
      // Mock response with invalid JSON
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      render(<NewDestinationPage />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to create destination: Invalid JSON');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<NewDestinationPage />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Create New Destination');
    });

    it('has proper navigation structure', () => {
      render(<NewDestinationPage />);

      const breadcrumbNav = screen.getByRole('navigation');
      expect(breadcrumbNav).toBeInTheDocument();
    });

    it('has proper button roles and labels', () => {
      render(<NewDestinationPage />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const createButton = screen.getByRole('button', { name: /Create Destination/ });

      expect(cancelButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('passes correct props to DestinationForm', () => {
      render(<NewDestinationPage />);

      const form = screen.getByTestId('destination-form');
      expect(form).toBeInTheDocument();
      
      // The form should have submit and cancel buttons from our mock
      expect(screen.getByTestId('form-submit')).toBeInTheDocument();
      expect(screen.getByTestId('form-cancel')).toBeInTheDocument();
    });
  });
});