import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivitySearch from '../ActivitySearch';
import { ActivityCategory } from '@/models/Activity';

// Mock the useDebounce hook
vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value, // Return value immediately for testing
}));

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

const mockActivities = [
  {
    _id: '1',
    name: 'Beach Tour',
    category: ActivityCategory.EXCURSION,
    location: 'Benidorm',
    pricePerPerson: 25,
    minPersons: 2,
    maxPersons: 20,
    availableFrom: '2025-06-01T00:00:00.000Z',
    availableTo: '2025-09-30T00:00:00.000Z',
    duration: '4 hours',
    description: 'A wonderful beach excursion with guided tour',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    name: 'Mountain Hike',
    category: ActivityCategory.ADVENTURE,
    location: 'Albufeira',
    pricePerPerson: 35,
    minPersons: 4,
    maxPersons: 15,
    availableFrom: '2025-05-01T00:00:00.000Z',
    availableTo: '2025-10-31T00:00:00.000Z',
    duration: '6 hours',
    description: 'Challenging mountain hike with scenic views',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

const mockLocations = ['Benidorm', 'Albufeira'];
const mockCategories = [
  { value: 'excursion', label: 'Excursions', icon: '🏖️' },
  { value: 'adventure', label: 'Adventure Sports', icon: '🏔️' },
];

describe('ActivitySearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/activities/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockLocations }),
        });
      }
      if (url.includes('/api/activities/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockCategories }),
        });
      }
      if (url.includes('/api/activities')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                activities: mockActivities,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 2,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false,
                },
                filters: {
                  totalCount: 2,
                  appliedFilters: {},
                },
              },
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render search interface correctly', async () => {
    render(<ActivitySearch />);

    expect(screen.getByText('Search Activities')).toBeInTheDocument();
    expect(
      screen.getByText('Find the perfect activities for your clients')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search by name or description...')
    ).toBeInTheDocument();
    expect(screen.getByText('All Locations')).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('should load and display locations and categories', async () => {
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('Benidorm')).toBeInTheDocument();
      expect(screen.getByText('Albufeira')).toBeInTheDocument();
      expect(screen.getByText('🏖️ Excursions')).toBeInTheDocument();
      expect(screen.getByText('🏔️ Adventure Sports')).toBeInTheDocument();
    });
  });

  it('should display search results', async () => {
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('2 Activities Found')).toBeInTheDocument();
      expect(screen.getByText('Beach Tour')).toBeInTheDocument();
      expect(screen.getByText('Mountain Hike')).toBeInTheDocument();
    });
  });

  it('should handle search input', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    const searchInput = screen.getByPlaceholderText(
      'Search by name or description...'
    );
    await user.type(searchInput, 'beach');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=beach')
      );
    });
  });

  it('should handle location filter', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('Benidorm')).toBeInTheDocument();
    });

    const locationSelect = screen.getByDisplayValue('All Locations');
    await user.selectOptions(locationSelect, 'Benidorm');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('location=Benidorm')
      );
    });
  });

  it('should handle category filter', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('🏖️ Excursions')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue('All Categories');
    await user.selectOptions(categorySelect, 'excursion');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=excursion')
      );
    });
  });

  it('should handle price range filters', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    const minPriceInput = screen.getByPlaceholderText('Min');
    const maxPriceInput = screen.getByPlaceholderText('Max');

    await user.type(minPriceInput, '20');
    await user.type(maxPriceInput, '50');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('priceMin=20')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('priceMax=50')
      );
    });
  });

  it('should handle date range filters', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    const dateFromInput = screen.getByLabelText('Available From');
    const dateToInput = screen.getByLabelText('Available To');

    await user.type(dateFromInput, '2025-06-01');
    await user.type(dateToInput, '2025-09-30');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateFrom=2025-06-01')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dateTo=2025-09-30')
      );
    });
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    render(<ActivitySearch />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText(
      'Search by name or description...'
    );
    await user.type(searchInput, 'beach');

    await waitFor(() => {
      expect(screen.getByDisplayValue('beach')).toBeInTheDocument();
    });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('should call onActivitySelect when Add to Package is clicked', async () => {
    const mockOnActivitySelect = vi.fn();
    const user = userEvent.setup();

    render(<ActivitySearch onActivitySelect={mockOnActivitySelect} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText('Add to Package');
    await user.click(addButtons[0]);

    expect(mockOnActivitySelect).toHaveBeenCalledWith(mockActivities[0]);
  });

  it('should display loading state', async () => {
    // Mock a delayed response
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    success: true,
                    data: {
                      activities: [],
                      pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false,
                      },
                    },
                  }),
              }),
            100
          )
        )
    );

    render(<ActivitySearch />);

    expect(screen.getByText('Searching activities...')).toBeInTheDocument();
  });

  it('should display error state', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes('/api/activities/locations') ||
        url.includes('/api/activities/categories')
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error' },
          }),
      });
    });

    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('should display no results message', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes('/api/activities/locations') ||
        url.includes('/api/activities/categories')
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              activities: [],
              pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            },
          }),
      });
    });

    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('No Activities Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Try adjusting your search criteria or clearing filters.'
        )
      ).toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    const user = userEvent.setup();

    // Mock response with pagination
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes('/api/activities/locations') ||
        url.includes('/api/activities/categories')
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              activities: mockActivities,
              pagination: {
                page: 1,
                limit: 20,
                total: 50,
                totalPages: 3,
                hasNext: true,
                hasPrev: false,
              },
            },
          }),
      });
    });

    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('50 total activities')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();

    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('should format prices correctly', async () => {
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('€25.00')).toBeInTheDocument();
      expect(screen.getByText('€35.00')).toBeInTheDocument();
    });
  });

  it('should display activity details correctly', async () => {
    render(<ActivitySearch />);

    await waitFor(() => {
      expect(screen.getByText('Beach Tour')).toBeInTheDocument();
      expect(screen.getByText('Benidorm')).toBeInTheDocument();
      expect(screen.getByText('4 hours')).toBeInTheDocument();
      expect(screen.getByText('2 - 20 persons')).toBeInTheDocument();
      expect(
        screen.getByText('A wonderful beach excursion with guided tour')
      ).toBeInTheDocument();
    });
  });
});
