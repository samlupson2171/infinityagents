import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DestinationManager from '../DestinationManager';

// Mock the hooks
vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

// Mock the shared components
vi.mock('@/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}));

vi.mock('@/components/shared/Toast', () => ({
  Toast: ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
    <div data-testid="toast" data-type={type}>
      {message}
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock confirm
global.confirm = vi.fn();

const mockDestinations = [
  {
    _id: '1',
    name: 'Benidorm',
    country: 'Spain',
    region: 'Costa Blanca',
    status: 'published' as const,
    publishedAt: '2024-01-15T10:00:00Z',
    lastModified: '2024-01-20T14:30:00Z',
    createdBy: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    aiGenerated: true
  },
  {
    _id: '2',
    name: 'Albufeira',
    country: 'Portugal',
    region: 'Algarve',
    status: 'draft' as const,
    lastModified: '2024-01-18T09:15:00Z',
    createdBy: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    },
    aiGenerated: false
  }
];

const mockApiResponse = {
  destinations: mockDestinations,
  total: 2,
  filterOptions: {
    countries: ['Spain', 'Portugal'],
    regions: ['Costa Blanca', 'Algarve']
  }
};

describe('DestinationManager', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocation.href = '';
    vi.mocked(global.confirm).mockClear();
  });

  describe('Initial Render and Data Loading', () => {
    it('renders loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<DestinationManager />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('renders destinations list after successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
        expect(screen.getByText('Albufeira')).toBeInTheDocument();
      });

      expect(screen.getByText('Spain')).toBeInTheDocument();
      expect(screen.getByText('Portugal')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
    });

    it('renders error state when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders empty state when no destinations found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ destinations: [], total: 0, filterOptions: { countries: [], regions: [] } })
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('No destinations found')).toBeInTheDocument();
      });

      expect(screen.getByText('Create your first destination')).toBeInTheDocument();
    });
  });

  describe('Filtering Functionality', () => {
    it('filters by search term', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const searchInput = screen.getByPlaceholderText('Search destinations...');

      await user.type(searchInput, 'Benidorm');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Benidorm')
        );
      });
    });

    it('filters by status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const statusSelect = screen.getByDisplayValue('All Statuses');

      await user.selectOptions(statusSelect, 'published');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=published')
        );
      });
    });
  });

  describe('Sorting Functionality', () => {
    it('sorts by name when name header is clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const nameHeader = screen.getByText(/Name/);

      await user.click(nameHeader);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sortField=name&sortDirection=asc')
        );
      });
    });
  });

  describe('Navigation Actions', () => {
    it('navigates to add new destination page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const addButton = screen.getByText('Add New Destination');

      await user.click(addButton);

      expect(mockLocation.href).toBe('/admin/destinations/new');
    });
  });

  describe('Component State Management', () => {
    it('manages filter state correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      // Check that filter controls are rendered
      expect(screen.getByPlaceholderText('Search destinations...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Countries')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Regions')).toBeInTheDocument();
    });

    it('displays destination information correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      // Check destination details are displayed
      expect(screen.getByText('Spain')).toBeInTheDocument();
      expect(screen.getByText('Costa Blanca')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('shows AI generated indicator correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      });

      render(<DestinationManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      // Check AI indicator is shown for AI-generated destination
      expect(screen.getByText('🤖')).toBeInTheDocument();
      expect(screen.getByText('AI Generated')).toBeInTheDocument();
    });
  });
});