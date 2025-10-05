import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalDashboard from '../ApprovalDashboard';

// Mock fetch
global.fetch = jest.fn();

const mockPendingUsers = [
  {
    _id: 'user1',
    name: 'John Doe',
    companyName: 'Test Company',
    contactEmail: 'john@test.com',
    abtaPtsNumber: 'ABTA1234',
    websiteAddress: 'https://test.com',
    isApproved: false,
    role: 'agent',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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

describe('ApprovalDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ApprovalDashboard />);

    expect(screen.getByText('Loading pending users...')).toBeInTheDocument();
  });

  it('renders pending users successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPendingUsers,
      }),
    });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pending User Approvals')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@another.com')).toBeInTheDocument();
    expect(screen.getByText('Another Company')).toBeInTheDocument();
  });

  it('renders empty state when no pending users', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No pending approvals')).toBeInTheDocument();
    });

    expect(
      screen.getByText('All user registrations have been processed.')
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

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
  });

  it('opens user details modal when View Details is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPendingUsers,
      }),
    });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.getByText('ABTA1234')).toBeInTheDocument();
    expect(screen.getByText('https://test.com')).toBeInTheDocument();
  });

  it('approves user successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPendingUsers,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: 'user1', message: 'User approved successfully' },
        }),
      });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const approveButton = screen.getAllByText('Approve')[0];
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'user1' }),
      });
    });

    // User should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('opens reject modal and rejects user with reason', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPendingUsers,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: 'user1', message: 'User rejected successfully' },
        }),
      });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const rejectButton = screen.getAllByText('Reject')[0];
    fireEvent.click(rejectButton);

    expect(screen.getByText('Reject User')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to reject/)
    ).toBeInTheDocument();

    const reasonTextarea = screen.getByPlaceholderText(
      'Enter reason for rejection...'
    );
    fireEvent.change(reasonTextarea, {
      target: { value: 'Invalid ABTA number' },
    });

    const confirmRejectButton = screen.getByText('Reject User');
    fireEvent.click(confirmRejectButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/users/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user1',
          reason: 'Invalid ABTA number',
        }),
      });
    });

    // User should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPendingUsers,
      }),
    });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('handles approval error gracefully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockPendingUsers,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Approval failed' },
        }),
      });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const approveButton = screen.getAllByText('Approve')[0];
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText('Approval failed')).toBeInTheDocument();
    });
  });

  it('closes modals when close button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPendingUsers,
      }),
    });

    render(<ApprovalDashboard />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open user details modal
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);

    expect(screen.getByText('User Details')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByText('User Details')).not.toBeInTheDocument();
  });
});
