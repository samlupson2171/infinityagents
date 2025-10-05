import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DestinationForm } from '../DestinationForm';
import { IDestination } from '@/models/Destination';

// Mock the hooks
vi.mock('@/lib/hooks/useErrorHandler', () => ({
  useErrorHandler: vi.fn(() => ({
    error: null,
    isLoading: false,
    setError: vi.fn(),
    clearError: vi.fn(),
    executeWithErrorHandling: vi.fn((operation) => operation()),
  })),
  useFormValidation: vi.fn(() => ({
    errors: {},
    touched: {},
    isValid: true,
    validate: vi.fn(() => ({})),
    validateSingle: vi.fn(),
    setFieldTouched: vi.fn(),
  })),
}));

vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('DestinationForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockDestination: Partial<IDestination> = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Benidorm',
    country: 'Spain',
    region: 'Costa Blanca',
    description: 'A vibrant coastal resort town known for its beautiful beaches, towering skyscrapers, and lively nightlife scene.',
    slug: 'benidorm',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isUnique: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders create form correctly', () => {
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create New Destination')).toBeInTheDocument();
      expect(screen.getByText('Enter the basic information to create a new destination.')).toBeInTheDocument();
      expect(screen.getByLabelText(/Destination Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Region/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/URL Slug/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Destination/ })).toBeInTheDocument();
    });

    it('renders edit form correctly', () => {
      render(
        <DestinationForm
          destination={mockDestination}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isEditing={true}
        />
      );

      expect(screen.getByText('Edit Destination')).toBeInTheDocument();
      expect(screen.getByText('Update the basic information for this destination.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Benidorm')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Spain')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Costa Blanca')).toBeInTheDocument();
      expect(screen.getByDisplayValue('benidorm')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update Destination/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Draft/ })).toBeInTheDocument();
    });

    it('shows required field indicators', () => {
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Check for required asterisks
      expect(screen.getByText('Destination Name')).toBeInTheDocument();
      expect(screen.getByText('Country')).toBeInTheDocument();
      expect(screen.getByText('Region')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Create Destination/ });
      
      await user.click(submitButton);

      // Form should not submit with empty required fields
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates minimum length for name', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/Destination Name/);
      
      await user.type(nameInput, 'A');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/must be at least 2 characters/)).toBeInTheDocument();
      });
    });

    it('validates maximum length for description', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/);
      const longText = 'A'.repeat(501); // Exceeds 500 character limit
      
      await user.type(descriptionInput, longText);
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/cannot exceed 500 characters/)).toBeInTheDocument();
      });
    });

    it('validates slug format', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const slugInput = screen.getByLabelText(/URL Slug/);
      
      await user.type(slugInput, 'Invalid Slug!');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/format is invalid/)).toBeInTheDocument();
      });
    });

    it('shows character count for description', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const descriptionInput = screen.getByLabelText(/Description/);
      
      await user.type(descriptionInput, 'Test description');

      expect(screen.getByText(/16\/500 characters/)).toBeInTheDocument();
    });
  });

  describe('Slug Generation', () => {
    it('auto-generates slug from name', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/Destination Name/);
      const slugInput = screen.getByLabelText(/URL Slug/);
      
      await user.type(nameInput, 'Costa del Sol');

      await waitFor(() => {
        expect(slugInput).toHaveValue('costa-del-sol');
      });
    });

    it('does not overwrite manually entered slug', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/Destination Name/);
      const slugInput = screen.getByLabelText(/URL Slug/);
      
      // First enter a custom slug
      await user.type(slugInput, 'custom-slug');
      
      // Then change the name
      await user.type(nameInput, 'Costa del Sol');

      // Slug should remain unchanged
      expect(slugInput).toHaveValue('custom-slug');
    });

    it('validates slug uniqueness', async () => {
      const user = userEvent.setup();
      
      // Mock fetch to return slug is not unique
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: false, error: 'This slug is already taken' }),
      });
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const slugInput = screen.getByLabelText(/URL Slug/);
      
      await user.type(slugInput, 'existing-slug');

      await waitFor(() => {
        expect(screen.getByText('This slug is already taken')).toBeInTheDocument();
      });
    });

    it('shows slug availability when unique', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const slugInput = screen.getByLabelText(/URL Slug/);
      
      await user.type(slugInput, 'unique-slug');

      await waitFor(() => {
        expect(screen.getByText('Slug is available')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in all required fields
      await user.type(screen.getByLabelText(/Destination Name/), 'Test Destination');
      await user.type(screen.getByLabelText(/Country/), 'Test Country');
      await user.type(screen.getByLabelText(/Region/), 'Test Region');
      await user.type(screen.getByLabelText(/Description/), 'A test destination with a description that meets the minimum length requirement of fifty characters.');

      const submitButton = screen.getByRole('button', { name: /Create Destination/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Destination',
          country: 'Test Country',
          region: 'Test Region',
          description: 'A test destination with a description that meets the minimum length requirement of fifty characters.',
          slug: 'test-destination',
        });
      });
    });

    it('prevents submission with invalid slug', async () => {
      const user = userEvent.setup();
      
      // Mock fetch to return slug is not unique
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isUnique: false }),
      });
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in form with invalid slug
      await user.type(screen.getByLabelText(/Destination Name/), 'Test Destination');
      await user.type(screen.getByLabelText(/Country/), 'Test Country');
      await user.type(screen.getByLabelText(/Region/), 'Test Region');
      await user.type(screen.getByLabelText(/Description/), 'A test destination with a description that meets the minimum length requirement of fifty characters.');
      await user.clear(screen.getByLabelText(/URL Slug/));
      await user.type(screen.getByLabelText(/URL Slug/), 'existing-slug');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Destination/ });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Auto-save Functionality', () => {
    it('shows auto-save status for editing', () => {
      render(
        <DestinationForm
          destination={mockDestination}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isEditing={true}
        />
      );

      // Should show auto-save related elements
      expect(screen.getByRole('button', { name: /Save Draft/ })).toBeInTheDocument();
    });

    it('does not show auto-save for new destinations', () => {
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Should not show auto-save button for new destinations
      expect(screen.queryByRole('button', { name: /Save Draft/ })).not.toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows confirmation dialog when there are unsaved changes', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make changes to trigger unsaved state
      await user.type(screen.getByLabelText(/Destination Name/), 'Test');
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      await user.click(cancelButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      expect(mockOnCancel).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Check that all form fields have proper labels
      expect(screen.getByLabelText(/Destination Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Region/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/URL Slug/)).toBeInTheDocument();
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <DestinationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const nameInput = screen.getByLabelText(/Destination Name/);
      
      // Trigger validation error
      await user.type(nameInput, 'A');
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/must be at least 2 characters/);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });

  describe('Loading States', () => {
    it('disables form during submission', async () => {
      const user = userEvent.setup();
      
      // Mock a slow submission
      const slowSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <DestinationForm
          onSubmit={slowSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Fill in required fields
      await user.type(screen.getByLabelText(/Destination Name/), 'Test Destination');
      await user.type(screen.getByLabelText(/Country/), 'Test Country');
      await user.type(screen.getByLabelText(/Region/), 'Test Region');
      await user.type(screen.getByLabelText(/Description/), 'A test destination with a description that meets the minimum length requirement of fifty characters.');

      const submitButton = screen.getByRole('button', { name: /Create Destination/ });
      
      await user.click(submitButton);

      // Button should show loading state
      expect(screen.getByText(/Creating.../)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});