import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserManagement from '../UserManagement';

// Mock fetch
global.fetch = jest.fn();

const mockUsers = [
  {
    _id: 'user1',
    name: 'John Doe',
    companyName: 'Test Company',
    contactEmail: 'john@test.com',
    abtaPtsNumber: 'ABTA1234',
    websiteAddress: 'https://test.com',
    isApproved: true,
    role: 'agent',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    approvedAt: new Date('2024-01-01'),
    approvedBy: {
      _id: 'admin1',
      name: 'Admin User',
      contactEmail: 'admin@infinity.com',
    },
  },
  {
    _id: 'user2',
    name: 'Jane Smith',
    companyName: 'Another Company',
    contactEmail: 'jane@another.com',
    abtaPtsNumber: 'PTS5678',
    websiteAddress: 'https://another.com',
    isApproved: false,
    role: 'agent',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalUsers: 2,
  hasNextPage: false,
  hasPrevPage: false,
};

describe('UserManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<UserManagement />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('renders users successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers,
          pagination: mockPagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@another.com')).toBeInTheDocument();
    expect(screen.getByText('Another Company')).toBeInTheDocument();
  });

  it('renders empty state when no users', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: [],
          pagination: { ...mockPagination, totalUsers: 0 },
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No users have registered yet.')
    ).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Failed to fetch users' },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
  });

  it('filters users by status', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers.filter((u) => u.isApproved),
          pagination: mockPagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All Users');
    fireEvent.change(statusFilter, { target: { value: 'approved' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/users?page=1&limit=10&status=approved'
      );
    });
  });

  it('opens user details modal when View Details is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers,
          pagination: mockPagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText('ABTA1234')).toBeInTheDocument();
    expect(screen.getByText('https://test.com')).toBeInTheDocument();
    expect(
      screen.getByText('Admin User (admin@infinity.com)')
    ).toBeInTheDocument();
  });

  it('deactivates user successfully', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: mockUsers,
            pagination: mockPagination,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockUsers[0], isApproved: false },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: mockUsers,
            pagination: mockPagination,
          },
        }),
      });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to deactivate this user? They will lose access to the platform.'
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users/user1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved: false }),
      });
    });
  });

  it('reactivates user successfully', async () => {
    const pendingUser = { ...mockUsers[1] };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: [pendingUser],
            pagination: mockPagination,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...pendingUser, isApproved: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: [pendingUser],
            pagination: mockPagination,
          },
        }),
      });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users/user2', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved: true }),
      });
    });
  });

  it('handles pagination correctly', async () => {
    const multiPagePagination = {
      currentPage: 1,
      totalPages: 3,
      totalUsers: 25,
      hasNextPage: true,
      hasPrevPage: false,
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers,
          pagination: multiPagePagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Showing page 1 of 3 (25 total users)')
    ).toBeInTheDocument();

    // Test next page button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users?page=2&limit=10');
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers,
          pagination: mockPagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('handles deactivation error gracefully', async () => {
    window.confirm = jest.fn(() => true);

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            users: mockUsers,
            pagination: mockPagination,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Deactivation failed' },
        }),
      });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(screen.getByText('Deactivation failed')).toBeInTheDocument();
    });
  });

  it('cancels deactivation when user declines confirmation', async () => {
    window.confirm = jest.fn(() => false);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          users: mockUsers,
          pagination: mockPagination,
        },
      }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    expect(window.confirm).toHaveBeenCalled();

    // Should not make the deactivation API call
    expect(fetch).toHaveBeenCalledTimes(1); // Only the initial fetch
  });
});
