import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PackageManager from '../PackageManager';
import { PackageState } from '../PackageBuilder';

// Mock fetch
global.fetch = vi.fn();

const mockFetch = vi.mocked(fetch);

// Mock data
const mockPackages = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Beach Package',
    activities: [
      {
        activityId: '507f1f77bcf86cd799439012',
        activity: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Beach Excursion',
          category: 'excursion',
          location: 'Benidorm',
          pricePerPerson: 25.0,
          duration: '4 hours',
          description: 'Beach activity',
          isActive: true,
        },
        quantity: 2,
        subtotal: 50.0,
      },
    ],
    numberOfPersons: 3,
    totalCost: 150.0,
    createdBy: '507f1f77bcf86cd799439013',
    status: 'draft',
    clientName: 'John Doe',
    notes: 'Test notes',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    _id: '507f1f77bcf86cd799439014',
    name: 'City Tour Package',
    activities: [
      {
        activityId: '507f1f77bcf86cd799439015',
        activity: {
          _id: '507f1f77bcf86cd799439015',
          name: 'City Tour',
          category: 'cultural',
          location: 'Benidorm',
          pricePerPerson: 35.0,
          duration: '3 hours',
          description: 'City tour activity',
          isActive: true,
        },
        quantity: 1,
        subtotal: 35.0,
      },
    ],
    numberOfPersons: 2,
    totalCost: 70.0,
    createdBy: '507f1f77bcf86cd799439013',
    status: 'finalized',
    clientName: 'Jane Smith',
    notes: '',
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
  },
];

const mockApiResponse = {
  success: true,
  data: {
    packages: mockPackages,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      pages: 1,
    },
  },
};

describe('PackageManager Component', () => {
  const mockOnLoadPackage = vi.fn();
  const mockOnEditPackage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as Response);
  });

  it('renders with default state', async () => {
    render(<PackageManager />);

    expect(screen.getByText('Package Manager')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Packages')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });
  });

  it('fetches packages on mount', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/packages?page=1&limit=10');
    });

    expect(screen.getByText('Beach Package')).toBeInTheDocument();
    expect(screen.getByText('City Tour Package')).toBeInTheDocument();
  });

  it('displays package information correctly', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    // Check package details
    expect(screen.getByText('Client: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Client: Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('€150.00')).toBeInTheDocument();
    expect(screen.getByText('€70.00')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('finalized')).toBeInTheDocument();
  });

  it('filters packages by status', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    // Change filter to draft
    const statusSelect = screen.getByDisplayValue('All Packages');
    fireEvent.change(statusSelect, { target: { value: 'draft' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/packages?page=1&limit=10&status=draft'
      );
    });
  });

  it('handles refresh button click', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('calls onLoadPackage when load button is clicked', async () => {
    render(<PackageManager onLoadPackage={mockOnLoadPackage} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const loadButtons = screen.getAllByText('Load');
    fireEvent.click(loadButtons[0]);

    expect(mockOnLoadPackage).toHaveBeenCalledWith({
      name: 'Beach Package',
      activities: mockPackages[0].activities,
      numberOfPersons: 3,
      totalCost: 150.0,
      clientName: 'John Doe',
      notes: 'Test notes',
    });
  });

  it('calls onEditPackage when edit button is clicked', async () => {
    render(<PackageManager onEditPackage={mockOnEditPackage} />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnEditPackage).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      name: 'Beach Package',
      activities: mockPackages[0].activities,
      numberOfPersons: 3,
      totalCost: 150.0,
      clientName: 'John Doe',
      notes: 'Test notes',
    });
  });

  it('handles package selection', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const packageCheckbox = checkboxes[1]; // First is select all

    fireEvent.click(packageCheckbox);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Clear selection')).toBeInTheDocument();
  });

  it('handles select all functionality', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('toggles package status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response);

    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const finalizeButtons = screen.getAllByText('Finalize');
    fireEvent.click(finalizeButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/packages/507f1f77bcf86cd799439011',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'finalized' }),
        }
      );
    });
  });

  it('shows delete confirmation modal', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to delete this package? This action cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('deletes package when confirmed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { message: 'Package deleted successfully' },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      } as Response);

    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    // Open delete confirmation
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/packages/507f1f77bcf86cd799439011',
        { method: 'DELETE' }
      );
    });
  });

  it('cancels delete when cancel is clicked', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    // Open delete confirmation
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // Cancel deletion
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          success: false,
          error: { message: 'Failed to fetch packages' },
        }),
    } as Response);

    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch packages')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<PackageManager />);

    expect(screen.getByText('Loading packages...')).toBeInTheDocument();
  });

  it('displays empty state when no packages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            packages: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              pages: 0,
            },
          },
        }),
    } as Response);

    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('No packages found')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    const paginatedResponse = {
      success: true,
      data: {
        packages: mockPackages,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
        },
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResponse),
    } as Response);

    render(<PackageManager />);

    await waitFor(() => {
      expect(
        screen.getByText('Showing 1 to 10 of 25 packages')
      ).toBeInTheDocument();
    });

    // Check pagination buttons
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('formats currency correctly', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('€150.00')).toBeInTheDocument();
      expect(screen.getByText('€70.00')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('01/01/2024, 11:00')).toBeInTheDocument();
      expect(screen.getByText('02/01/2024, 11:00')).toBeInTheDocument();
    });
  });

  it('does not show load/edit buttons when callbacks not provided', async () => {
    render(<PackageManager />);

    await waitFor(() => {
      expect(screen.getByText('Beach Package')).toBeInTheDocument();
    });

    expect(screen.queryByText('Load')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
