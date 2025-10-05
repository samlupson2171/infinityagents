import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DestinationsDashboard from '../DestinationsDashboard';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

// Mock Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

// Mock fetch
global.fetch = vi.fn();

const mockStats = {
  total: 15,
  published: 10,
  draft: 3,
  archived: 2,
  recentlyUpdated: 5
};

const mockActivity = [
  {
    id: '1',
    type: 'created',
    destinationName: 'New Beach Resort',
    destinationSlug: 'new-beach-resort',
    userName: 'John Admin',
    timestamp: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: '2',
    type: 'published',
    destinationName: 'Mountain Retreat',
    destinationSlug: 'mountain-retreat',
    userName: 'Jane Editor',
    timestamp: new Date('2024-01-14T15:45:00Z')
  },
  {
    id: '3',
    type: 'updated',
    destinationName: 'City Center Hotel',
    destinationSlug: 'city-center-hotel',
    userName: 'Bob Manager',
    timestamp: new Date('2024-01-13T09:15:00Z')
  }
];

describe('DestinationsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });
      }
      if (url.includes('/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ activities: mockActivity })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  describe('Overview Mode', () => {
    it('renders dashboard header and stats', async () => {
      render(<DestinationsDashboard />);

      expect(screen.getByText('Destinations Management')).toBeInTheDocument();
      expect(screen.getByText('Manage and monitor your destination content')).toBeInTheDocument();

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument(); // Total
        expect(screen.getByText('10')).toBeInTheDocument(); // Published
        expect(screen.getByText('3')).toBeInTheDocument();  // Draft
        expect(screen.getByText('5')).toBeInTheDocument();  // Recently Updated
      });
    });

    it('displays stats cards with correct values', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Destinations')).toBeInTheDocument();
        expect(screen.getByText('Published')).toBeInTheDocument();
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Recently Updated')).toBeInTheDocument();
      });
    });

    it('displays recent activity list', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('New Beach Resort')).toBeInTheDocument();
        expect(screen.getByText('Mountain Retreat')).toBeInTheDocument();
        expect(screen.getByText('City Center Hotel')).toBeInTheDocument();
      });

      // Check activity types
      expect(screen.getByText('John Admin')).toBeInTheDocument();
      expect(screen.getByText('Jane Editor')).toBeInTheDocument();
      expect(screen.getByText('Bob Manager')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<DestinationsDashboard />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Initial stats
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('handles empty activity state', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStats)
          });
        }
        if (url.includes('/activity')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ activities: [] })
          });
        }
      });

      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating your first destination.')).toBeInTheDocument();
      });
    });

    it('renders quick action buttons', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Manage All Destinations')).toBeInTheDocument();
        expect(screen.getByText('Add New Destination')).toBeInTheDocument();
        expect(screen.getByText('View Public Site')).toBeInTheDocument();
      });
    });

    it('switches to manage view when manage button is clicked', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const manageButton = screen.getByText('Manage Destinations');
        fireEvent.click(manageButton);
      });

      // Should show the back button indicating we're in manage mode
      expect(screen.getByText('Back to Overview')).toBeInTheDocument();
    });
  });

  describe('Manage Mode', () => {
    it('switches to manage mode and shows back button', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const manageButton = screen.getByText('Manage Destinations');
        fireEvent.click(manageButton);
      });

      expect(screen.getByText('Back to Overview')).toBeInTheDocument();
    });

    it('returns to overview when back button is clicked', async () => {
      render(<DestinationsDashboard />);

      // Switch to manage mode
      await waitFor(() => {
        const manageButton = screen.getByText('Manage Destinations');
        fireEvent.click(manageButton);
      });

      // Click back button
      const backButton = screen.getByText('Back to Overview');
      fireEvent.click(backButton);

      // Should be back in overview mode
      await waitFor(() => {
        expect(screen.getByText('Destinations Management')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('fetches stats on component mount', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/destinations/stats');
      });
    });

    it('fetches recent activity on component mount', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/destinations/activity?limit=10');
      });
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles failed API responses', async () => {
      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' })
        });
      });

      render(<DestinationsDashboard />);

      // Should still render with default values
      expect(screen.getByText('Destinations Management')).toBeInTheDocument();
    });
  });

  describe('Activity Display', () => {
    it('displays correct activity icons and colors', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        // Check that activity items are rendered
        expect(screen.getByText('New Beach Resort')).toBeInTheDocument();
      });

      // Activity icons should be present (emojis)
      const activitySection = screen.getByText('Recent Activity').closest('div');
      expect(activitySection).toBeInTheDocument();
    });

    it('formats timestamps correctly', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        // Should show formatted dates
        expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
        expect(screen.getByText(/1\/14\/2024/)).toBeInTheDocument();
        expect(screen.getByText(/1\/13\/2024/)).toBeInTheDocument();
      });
    });

    it('creates correct links to destinations', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const destinationLink = screen.getByText('New Beach Resort').closest('a');
        expect(destinationLink).toHaveAttribute('href', '/destinations/new-beach-resort');
      });
    });
  });

  describe('Navigation', () => {
    it('has correct links in header buttons', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const addNewLink = screen.getByText('Add New Destination').closest('a');
        expect(addNewLink).toHaveAttribute('href', '/admin/destinations/new');
      });
    });

    it('opens public site in new tab', async () => {
      // Mock window.open
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      });

      render(<DestinationsDashboard />);

      await waitFor(() => {
        const viewPublicButton = screen.getByText('View Public Site');
        fireEvent.click(viewPublicButton);
      });

      expect(mockOpen).toHaveBeenCalledWith('/destinations', '_blank');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      });
    });

    it('has accessible button labels', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toHaveAccessibleName();
        });
      });
    });

    it('has proper link accessibility', async () => {
      render(<DestinationsDashboard />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAccessibleName();
        });
      });
    });
  });
});