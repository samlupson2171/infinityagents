import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OffersList from '../OffersList';

// Mock fetch
global.fetch = jest.fn();

const mockOffers = [
  {
    _id: 'offer1',
    title: 'Summer Special',
    description: 'Amazing summer deals',
    inclusions: ['Accommodation', 'Breakfast'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: { _id: 'admin1', name: 'Admin User' },
  },
  {
    _id: 'offer2',
    title: 'Winter Package',
    description: 'Great winter offers',
    inclusions: ['Accommodation', 'Dinner'],
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: { _id: 'admin1', name: 'Admin User' },
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalOffers: 2,
  hasNextPage: false,
  hasPrevPage: false,
};

describe('OffersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<OffersList />);

    expect(screen.getByText('Loading offers...')).toBeInTheDocument();
  });

  it('renders offers successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    expect(screen.getByText('Summer Special')).toBeInTheDocument();
    expect(screen.getByText('Winter Package')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Discover our latest deals and packages for your clients'
      )
    ).toBeInTheDocument();
  });

  it('renders empty state when no offers', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: [],
          pagination: { ...mockPagination, totalOffers: 0 },
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('No offers available')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'There are currently no active offers. Check back later for new deals.'
      )
    ).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Failed to fetch offers' },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Offers')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch offers')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search offers...');
    fireEvent.change(searchInput, { target: { value: 'summer' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/offers?page=1&limit=9&search=summer'
      );
    });
  });

  it('resets to first page when searching', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: { ...mockPagination, currentPage: 2 },
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search offers...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/offers?page=1&limit=9&search=test'
      );
    });
  });

  it('displays empty state with search term when no results', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            offers: mockOffers,
            pagination: mockPagination,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            offers: [],
            pagination: { ...mockPagination, totalOffers: 0 },
          },
        }),
      });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search offers...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No offers available')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'No offers found matching "nonexistent". Try a different search term.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Clear search')).toBeInTheDocument();
  });

  it('clears search when clear search button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: [],
          pagination: { ...mockPagination, totalOffers: 0 },
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search offers...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Clear search')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear search');
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('opens offer details modal when View Details is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special')).toBeInTheDocument();
    });

    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    // Check if modal is opened (OfferDetails component)
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    const multiPagePagination = {
      currentPage: 1,
      totalPages: 3,
      totalOffers: 25,
      hasNextPage: true,
      hasPrevPage: false,
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: multiPagePagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Showing page 1 of 3 (25 total offers)')
    ).toBeInTheDocument();

    // Test next page button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/offers?page=2&limit=9');
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Current Offers')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries fetch when try again button is clicked after error', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Network error' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            offers: mockOffers,
            pagination: mockPagination,
          },
        }),
      });

    render(<OffersList />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try again');
    fireEvent.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText('Summer Special')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<OffersList className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses correct API parameters', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers,
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersList />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/offers?page=1&limit=9');
    });
  });
});
