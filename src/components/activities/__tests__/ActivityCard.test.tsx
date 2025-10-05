import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityCard from '../ActivityCard';
import { ActivityCategory } from '@/models/Activity';

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
    'Premium beach excursion with guided tour, lunch, and water sports activities. Experience the best of the Costa Blanca coastline.',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  createdBy: {
    _id: 'user-1',
    name: 'Test User',
  },
};

describe('ActivityCard Component', () => {
  it('should render activity information correctly', () => {
    render(<ActivityCard activity={mockActivity} />);

    expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
    expect(screen.getByText('🏖️')).toBeInTheDocument();
    expect(screen.getByText('Excursions')).toBeInTheDocument();
    expect(screen.getByText('€45.50')).toBeInTheDocument();
    expect(screen.getByText('per person')).toBeInTheDocument();
    expect(screen.getByText('Benidorm')).toBeInTheDocument();
    expect(screen.getByText('6 hours')).toBeInTheDocument();
    expect(screen.getByText('2 - 25 persons')).toBeInTheDocument();
    expect(
      screen.getByText(/Premium beach excursion with guided tour/)
    ).toBeInTheDocument();
  });

  it('should show availability status for current activity', () => {
    // Mock current date to be within the activity's availability range
    const mockDate = new Date('2025-07-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(<ActivityCard activity={mockActivity} />);

    expect(screen.getByText('Available Now')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should show upcoming availability status', () => {
    // Mock current date to be before the activity's availability range
    const mockDate = new Date('2025-05-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(<ActivityCard activity={mockActivity} />);

    expect(screen.getByText(/Available in \d+ days/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should show unavailable status for past activity', () => {
    // Mock current date to be after the activity's availability range
    const mockDate = new Date('2025-11-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(<ActivityCard activity={mockActivity} />);

    expect(screen.getByText('No longer available')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should call onAddToPackage when Add to Package button is clicked', async () => {
    const mockOnAddToPackage = vi.fn();
    const user = userEvent.setup();

    // Mock current date to be within availability range
    const mockDate = new Date('2025-07-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(
      <ActivityCard
        activity={mockActivity}
        onAddToPackage={mockOnAddToPackage}
      />
    );

    const addButton = screen.getByText('Add to Package');
    await user.click(addButton);

    expect(mockOnAddToPackage).toHaveBeenCalledWith(mockActivity);

    vi.useRealTimers();
  });

  it('should call onViewDetails when View Details button is clicked', async () => {
    const mockOnViewDetails = vi.fn();
    const user = userEvent.setup();

    render(
      <ActivityCard activity={mockActivity} onViewDetails={mockOnViewDetails} />
    );

    const viewButton = screen.getByText('View Details');
    await user.click(viewButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockActivity);
  });

  it('should disable Add to Package button when activity is not available', () => {
    // Mock current date to be after the activity's availability range
    const mockDate = new Date('2025-11-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(<ActivityCard activity={mockActivity} onAddToPackage={vi.fn()} />);

    const addButton = screen.getByText('Not Available');
    expect(addButton).toBeDisabled();

    vi.useRealTimers();
  });

  it('should display correct category information for different categories', () => {
    const adventureActivity = {
      ...mockActivity,
      category: ActivityCategory.ADVENTURE,
    };

    render(<ActivityCard activity={adventureActivity} />);

    expect(screen.getByText('🏔️')).toBeInTheDocument();
    expect(screen.getByText('Adventure Sports')).toBeInTheDocument();
  });

  it('should format availability dates correctly', () => {
    render(<ActivityCard activity={mockActivity} />);

    expect(
      screen.getByText(/Available: .*6\/1\/2025.* - .*9\/30\/2025/)
    ).toBeInTheDocument();
  });

  it('should truncate long descriptions', () => {
    const longDescriptionActivity = {
      ...mockActivity,
      description:
        'This is a very long description that should be truncated when displayed in the card component. It contains a lot of text that would make the card too tall if displayed in full. The component should handle this gracefully by showing only a portion of the text.',
    };

    render(<ActivityCard activity={longDescriptionActivity} />);

    // The description should be present but truncated (line-clamp-3 class)
    expect(
      screen.getByText(/This is a very long description/)
    ).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ActivityCard activity={mockActivity} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle missing createdBy information', () => {
    const activityWithoutCreator = {
      ...mockActivity,
      createdBy: undefined,
    };

    render(<ActivityCard activity={activityWithoutCreator} />);

    // Should still render without errors
    expect(screen.getByText('Beach Tour Premium')).toBeInTheDocument();
  });

  it('should show both action buttons when both callbacks are provided', () => {
    const mockDate = new Date('2025-07-15T00:00:00.000Z');
    vi.setSystemTime(mockDate);

    render(
      <ActivityCard
        activity={mockActivity}
        onAddToPackage={vi.fn()}
        onViewDetails={vi.fn()}
      />
    );

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Add to Package')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should show no action buttons when no callbacks are provided', () => {
    render(<ActivityCard activity={mockActivity} />);

    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to Package')).not.toBeInTheDocument();
  });
});
