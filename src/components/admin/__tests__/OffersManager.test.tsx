import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OffersManager from '../OffersManager';

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
window.confirm = jest.fn();

const mockOffers = [
  {
    _id: 'offer1',
    title: 'Summer Special Package',
    description:
      'Amazing summer deals for travel agencies with exclusive benefits',
    inclusions: ['Accommodation', 'Breakfast', 'Airport Transfer'],
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    createdBy: {
      _id: 'admin1',
      name: 'Admin User',
      contactEmail: 'admin@test.com',
    },
  },
  {
    _id: 'offer2',
    title: 'Winter Package',
    description: 'Great winter offers for your clients',
    inclusions: ['Accommodation', 'Dinner'],
    isActive: false,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    createdBy: {
      _id: 'admin1',
      name: 'Admin User',
      contactEmail: 'admin@test.com',
    },
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalOffers: 2,
  hasNextPage: false,
  hasPrevPage: false,
};

describe('OffersManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<OffersManager />);

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

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Offers Management')).toBeInTheDocument();
    });

    expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    expect(screen.getByText('Winter Package')).toBeInTheDocument();
    expect(screen.getByText('Create Offer')).toBeInTheDocument();
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

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('No offers found')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Get started by creating your first offer.')
    ).toBeInTheDocument();
  });

  it('filters offers by status', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          offers: mockOffers.filter((o) => o.isActive),
          pagination: mockPagination,
        },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Offers Management')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Offers');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/offers?page=1&limit=10&status=active'
      );
    });
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

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Offers Management')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search offers...');
    fireEvent.change(searchInput, { target: { value: 'summer' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/offers?page=1&limit=10&search=summer'
      );
    });
  });

  it('opens create modal when Create Offer button is clicked', async () => {
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

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Offer')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Offer');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Offer')).toBeInTheDocument();
    expect(screen.getByLabelText('Title *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description *')).toBeInTheDocument();
  });

  it('creates new offer successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockOffers[0],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Offer')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByText('Create Offer');
    fireEvent.click(createButton);

    // Fill form
    const titleInput = screen.getByLabelText('Title *');
    const descriptionInput = screen.getByLabelText('Description *');
    const inclusionInput = screen.getByPlaceholderText('Inclusion 1');

    fireEvent.change(titleInput, { target: { value: 'Test Offer' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test Description' },
    });
    fireEvent.change(inclusionInput, { target: { value: 'Test Inclusion' } });

    // Submit form
    const submitButton = screen.getByText('Create Offer');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Offer',
          description: 'Test Description',
          inclusions: ['Test Inclusion'],
          isActive: true,
        }),
      });
    });
  });

  it('opens edit modal when Edit button is clicked', async () => {
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

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    expect(screen.getByText('Edit Offer')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Summer Special Package')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'Amazing summer deals for travel agencies with exclusive benefits'
      )
    ).toBeInTheDocument();
  });

  it('updates offer successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockOffers[0], title: 'Updated Title' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    // Open edit modal
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);

    // Update title
    const titleInput = screen.getByDisplayValue('Summer Special Package');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Submit form
    const updateButton = screen.getByText('Update Offer');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/offers/offer1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Updated Title',
          description:
            'Amazing summer deals for travel agencies with exclusive benefits',
          inclusions: ['Accommodation', 'Breakfast', 'Airport Transfer'],
          isActive: true,
        }),
      });
    });
  });

  it('toggles offer status successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockOffers[0], isActive: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/offers/offer1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: false,
        }),
      });
    });
  });

  it('deletes offer successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers, pagination: mockPagination },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offerId: 'offer1', message: 'Offer deleted successfully' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { offers: mockOffers.slice(1), pagination: mockPagination },
        }),
      });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this offer? This action cannot be undone.'
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/offers/offer1', {
        method: 'DELETE',
      });
    });
  });

  it('cancels delete when user declines confirmation', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { offers: mockOffers, pagination: mockPagination },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();

    // Should not make the delete API call
    expect(fetch).toHaveBeenCalledTimes(1); // Only the initial fetch
  });

  it('opens preview modal when Preview button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { offers: mockOffers, pagination: mockPagination },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    });

    const previewButton = screen.getAllByText('Preview')[0];
    fireEvent.click(previewButton);

    expect(screen.getByText('Offer Preview')).toBeInTheDocument();
    expect(screen.getByText("What's Included")).toBeInTheDocument();
  });

  it('adds and removes inclusions in form', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { offers: mockOffers, pagination: mockPagination },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Offer')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByText('Create Offer');
    fireEvent.click(createButton);

    // Add inclusion
    const addInclusionButton = screen.getByText('Add Inclusion');
    fireEvent.click(addInclusionButton);

    expect(screen.getByPlaceholderText('Inclusion 2')).toBeInTheDocument();

    // Remove inclusion (delete button should appear when there are multiple inclusions)
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector('svg path[d*="M19 7l-.867 12.142"]')
    );

    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
  });

  it('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Failed to fetch offers' },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch offers')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('dismisses error message when dismiss button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Test error' },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });

  it('validates form before submission', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { offers: mockOffers, pagination: mockPagination },
      }),
    });

    render(<OffersManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Offer')).toBeInTheDocument();
    });

    // Open create modal
    const createButton = screen.getByText('Create Offer');
    fireEvent.click(createButton);

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Create Offer');
    fireEvent.click(submitButton);

    // Form should not submit due to HTML5 validation
    expect(fetch).toHaveBeenCalledTimes(1); // Only the initial fetch
  });
});
