import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DestinationForm } from '../DestinationForm';

// Mock the hooks with simple implementations
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
  useDebounce: vi.fn((value) => value),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    back: vi.fn(),
    push: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('DestinationForm - Basic Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isUnique: true }),
    });
  });

  it('renders create form with all required fields', () => {
    render(
      <DestinationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check main heading
    expect(screen.getByText('Create New Destination')).toBeInTheDocument();
    
    // Check all form fields are present
    expect(screen.getByLabelText(/Destination Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Region/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL Slug/)).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByRole('button', { name: /Create Destination/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('renders edit form with existing data', () => {
    const mockDestination = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Benidorm',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A vibrant coastal resort town',
      slug: 'benidorm',
    };

    render(
      <DestinationForm
        destination={mockDestination}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isEditing={true}
      />
    );

    expect(screen.getByText('Edit Destination')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Benidorm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spain')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Costa Blanca')).toBeInTheDocument();
    expect(screen.getByDisplayValue('benidorm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Destination/ })).toBeInTheDocument();
  });

  it('allows user to fill in form fields', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText(/Destination Name/);
    const countryInput = screen.getByLabelText(/Country/);
    const regionInput = screen.getByLabelText(/Region/);
    const descriptionInput = screen.getByLabelText(/Description/);

    await user.type(nameInput, 'Test Destination');
    await user.type(countryInput, 'Test Country');
    await user.type(regionInput, 'Test Region');
    await user.type(descriptionInput, 'A test destination description that is long enough to meet requirements');

    expect(nameInput).toHaveValue('Test Destination');
    expect(countryInput).toHaveValue('Test Country');
    expect(regionInput).toHaveValue('Test Region');
    expect(descriptionInput).toHaveValue('A test destination description that is long enough to meet requirements');
  });

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

  it('generates slug from destination name', async () => {
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

    // The slug should be auto-generated
    expect(slugInput).toHaveValue('costa-del-sol');
  });

  it('shows helper text for form fields', () => {
    render(
      <DestinationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('The display name for the destination')).toBeInTheDocument();
    expect(screen.getByText(/This will be used for search results and previews/)).toBeInTheDocument();
    expect(screen.getByText(/URL-friendly identifier/)).toBeInTheDocument();
  });

  it('shows required field indicators', () => {
    render(
      <DestinationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check for required asterisks (*)
    const requiredFields = screen.getAllByText('*');
    expect(requiredFields).toHaveLength(4); // name, country, region, description
  });

  it('has proper form structure and accessibility', () => {
    render(
      <DestinationForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check form element exists (using querySelector since role="form" isn't automatically added)
    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();

    // Check all inputs have proper labels
    expect(screen.getByLabelText(/Destination Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Region/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL Slug/)).toBeInTheDocument();
  });
});