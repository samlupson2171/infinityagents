import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityDetails from '../ActivityDetails';
import { ActivityCategory } from '@/models/Activity';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

const mockActivity = {
  _id: '1',
  name: 'Beach Tour Premium',
  category: ActivityCategory.EXCURSION,
  location: 'Benidorm',
  pricePerPerson: 45.5,
  minPersons: 2,
  maxPersons: 25,
  availableFrom: '2025-06-01T00:00:00.000Z',
  availableTo: '2025-09-30T00:00:00.000Z',
  duration: '6 hours',
  description:
    'Premium beach excursion with guided tour, lunch, and water sports activities. Experience the best of the Costa Blanca coastline with professional guides.',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  createdBy: {
    _id: 'user-1',
    name: 'Test User',
  },
  isAvailable: true,
  daysUntilStart: 0,
  daysUntilEnd: 45,
};

describe('ActivityDetails Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockActivity,
        }),
    });
  });

  it('should render loading state initially', () => {
    render(<ActivityDetails activityId="1" />);

    expect(screen.getByText('Loading activity details...')).toBeInTheDocument();
  });

  it('should fetch and display activity details', async () => {
    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    expect(screen.getByText('🏖️')).toBeInTheDocument();
    expect(screen.getByText('Excursions')).toBeInTheDocument();
    expect(screen.getByText('Available Now')).toBeInTheDocument();
    expect(screen.getByText('Benidorm')).toBeInTheDocument();
    expect(screen.getByText('6 hours')).toBeInTheDocument();
    expect(
      screen.getByText(/Premium beach excursion with guided tour/)
    ).toBeInTheDocument();
    expect(screen.getByText('€45.50')).toBeInTheDocument();
    expect(screen.getByText('2 - 25 persons')).toBeInTheDocument();
  });

  it('should display error state when API fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          success: false,
          error: { message: 'Activity not found' },
        }),
    });

    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Activity')).toBeInTheDocument();
      expect(screen.getByText('Activity not found')).toBeInTheDocument();
    });
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Network error occurred while loading activity details'
        )
      ).toBeInTheDocument();
    });
  });

  it('should retry loading when Try Again is clicked', async () => {
    const user = userEvent.setup();

    // First call fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          success: false,
          error: { message: 'Server error' },
        }),
    });

    // Second call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockActivity,
        }),
    });

    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try Again');
    await user.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const mockOnClose = vi.fn();
    const user = userEvent.setup();

    render(<ActivityDetails activityId="1" onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display booking widget when onAddToPackage is provided', async () => {
    const mockOnAddToPackage = vi.fn();

    render(
      <ActivityDetails activityId="1" onAddToPackage={mockOnAddToPackage} />
    );

    await waitFor(() => {
      expect(screen.getByText('Add to Package')).toBeInTheDocument();
    });

    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Number of Persons')).toBeInTheDocument();
    expect(screen.getByText('Total Cost:')).toBeInTheDocument();
  });

  it('should calculate total cost correctly', async () => {
    const user = userEvent.setup();

    render(<ActivityDetails activityId="1" onAddToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    // Default: 1 quantity, 2 persons, €45.50 per person = €91.00
    expect(screen.getByText('€91.00')).toBeInTheDocument();

    // Change quantity to 2
    const quantitySelect = screen.getByDisplayValue('1');
    await user.selectOptions(quantitySelect, '2');

    // Now: 2 quantity, 2 persons, €45.50 per person = €182.00
    await waitFor(() => {
      expect(screen.getByText('€182.00')).toBeInTheDocument();
    });
  });

  it('should update persons selection within valid range', async () => {
    const user = userEvent.setup();

    render(<ActivityDetails activityId="1" onAddToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    const personsSelect = screen.getByDisplayValue('2 persons');
    await user.selectOptions(personsSelect, '5');

    expect(screen.getByDisplayValue('5 persons')).toBeInTheDocument();

    // Cost should update: 1 quantity, 5 persons, €45.50 per person = €227.50
    await waitFor(() => {
      expect(screen.getByText('€227.50')).toBeInTheDocument();
    });
  });

  it('should call onAddToPackage with correct parameters', async () => {
    const mockOnAddToPackage = vi.fn();
    const user = userEvent.setup();

    render(
      <ActivityDetails activityId="1" onAddToPackage={mockOnAddToPackage} />
    );

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    // Change quantity to 3
    const quantitySelect = screen.getByDisplayValue('1');
    await user.selectOptions(quantitySelect, '3');

    const addButton = screen.getByRole('button', { name: 'Add to Package' });
    await user.click(addButton);

    expect(mockOnAddToPackage).toHaveBeenCalledWith(mockActivity, 3);
  });

  it('should disable Add to Package button when activity is not available', async () => {
    const unavailableActivity = {
      ...mockActivity,
      isAvailable: false,
      daysUntilStart: 10,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: unavailableActivity,
        }),
    });

    render(<ActivityDetails activityId="1" onAddToPackage={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: 'Not Available' });
    expect(addButton).toBeDisabled();
    expect(screen.getByText('Available in 10 days')).toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    expect(screen.getByText('June 1, 2025')).toBeInTheDocument();
    expect(screen.getByText('September 30, 2025')).toBeInTheDocument();
  });

  it('should display creator information when available', async () => {
    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This activity was added by Test User/)
    ).toBeInTheDocument();
  });

  it('should handle activity without creator information', async () => {
    const activityWithoutCreator = {
      ...mockActivity,
      createdBy: undefined,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: activityWithoutCreator,
        }),
    });

    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/This activity was added by/)
    ).not.toBeInTheDocument();
  });

  it('should not display booking widget when onAddToPackage is not provided', async () => {
    render(<ActivityDetails activityId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add to Package')).not.toBeInTheDocument();
    expect(screen.queryByText('Quantity')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ActivityDetails activityId="1" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should make API call with correct activity ID', () => {
    render(<ActivityDetails activityId="test-activity-123" />);

    expect(mockFetch).toHaveBeenCalledWith('/api/activities/test-activity-123');
  });
});
