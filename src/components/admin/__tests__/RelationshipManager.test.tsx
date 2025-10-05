import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RelationshipManager from '../RelationshipManager';
import { IDestination } from '@/models/Destination';

// Mock fetch
global.fetch = vi.fn();

const mockDestination: IDestination = {
  _id: 'dest-123',
  name: 'Test Destination',
  slug: 'test-destination',
  country: 'Spain',
  region: 'Costa Blanca',
  description: 'A test destination',
  gradientColors: 'from-blue-500 to-orange-400',
  sections: {
    overview: {
      title: 'Overview',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: 'Test content',
      highlights: [],
      tips: [],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  status: 'draft',
  aiGenerated: false,
  createdBy: 'user-123',
  lastModifiedBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  relatedOffers: ['offer-1'],
  relatedActivities: ['activity-1'],
  relatedDestinations: ['dest-2']
} as IDestination;

const mockOffers = [
  {
    _id: 'offer-1',
    name: 'Beach Resort Package',
    description: 'All-inclusive beach resort',
    price: 599,
    destination: 'Costa Blanca, Spain'
  },
  {
    _id: 'offer-2',
    name: 'City Break Deal',
    description: 'Urban adventure package',
    price: 299,
    destination: 'Barcelona, Spain'
  }
];

const mockActivities = [
  {
    _id: 'activity-1',
    name: 'Scuba Diving',
    description: 'Underwater exploration',
    price: 89,
    location: 'Costa Blanca',
    category: 'Water Sports'
  },
  {
    _id: 'activity-2',
    name: 'Hiking Tour',
    description: 'Mountain hiking experience',
    price: 45,
    location: 'Valencia',
    category: 'Adventure'
  }
];

const mockDestinations = [
  {
    _id: 'dest-2',
    name: 'Valencia',
    description: 'Historic coastal city',
    country: 'Spain',
    region: 'Valencia',
    slug: 'valencia'
  },
  {
    _id: 'dest-3',
    name: 'Barcelona',
    description: 'Vibrant cultural hub',
    country: 'Spain',
    region: 'Catalonia',
    slug: 'barcelona'
  }
];

describe('RelationshipManager', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/admin/offers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ offers: mockOffers })
        });
      }
      if (url.includes('/api/admin/activities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ activities: mockActivities })
        });
      }
      if (url.includes('/api/admin/destinations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ destinations: mockDestinations })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Loading related content...')).toBeInTheDocument();
    });

    it('renders relationship manager after loading', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Content Relationships')).toBeInTheDocument();
        expect(screen.getByText('Related Offers')).toBeInTheDocument();
        expect(screen.getByText('Related Activities')).toBeInTheDocument();
        expect(screen.getByText('Related Destinations')).toBeInTheDocument();
      });
    });

    it('displays existing relationships as selected', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        // Check that pre-selected items are checked
        const offerCheckbox = screen.getByLabelText(/Beach Resort Package/);
        expect(offerCheckbox).toBeChecked();
        
        const activityCheckbox = screen.getByLabelText(/Scuba Diving/);
        expect(activityCheckbox).toBeChecked();
        
        const destinationCheckbox = screen.getByLabelText(/Valencia/);
        expect(destinationCheckbox).toBeChecked();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters offers based on search term', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Beach Resort Package')).toBeInTheDocument();
        expect(screen.getByText('City Break Deal')).toBeInTheDocument();
      });

      // Search for "beach"
      const offerSearch = screen.getByPlaceholderText('Search related offers...');
      fireEvent.change(offerSearch, { target: { value: 'beach' } });

      // Should only show beach-related offer
      expect(screen.getByText('Beach Resort Package')).toBeInTheDocument();
      expect(screen.queryByText('City Break Deal')).not.toBeInTheDocument();
    });

    it('filters activities based on search term', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Scuba Diving')).toBeInTheDocument();
        expect(screen.getByText('Hiking Tour')).toBeInTheDocument();
      });

      // Search for "diving"
      const activitySearch = screen.getByPlaceholderText('Search related activities...');
      fireEvent.change(activitySearch, { target: { value: 'diving' } });

      // Should only show diving activity
      expect(screen.getByText('Scuba Diving')).toBeInTheDocument();
      expect(screen.queryByText('Hiking Tour')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Beach Resort Package')).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const offerSearch = screen.getByPlaceholderText('Search related offers...');
      fireEvent.change(offerSearch, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No items match your search')).toBeInTheDocument();
    });
  });

  describe('Selection Management', () => {
    it('toggles offer selection', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        const cityBreakCheckbox = screen.getByLabelText(/City Break Deal/);
        expect(cityBreakCheckbox).not.toBeChecked();
        
        // Select the offer
        fireEvent.click(cityBreakCheckbox);
        expect(cityBreakCheckbox).toBeChecked();
        
        // Deselect the offer
        fireEvent.click(cityBreakCheckbox);
        expect(cityBreakCheckbox).not.toBeChecked();
      });
    });

    it('calls onUpdate when selections change', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        const cityBreakCheckbox = screen.getByLabelText(/City Break Deal/);
        fireEvent.click(cityBreakCheckbox);
      });

      // Should call onUpdate with new selection
      expect(mockOnUpdate).toHaveBeenCalledWith({
        relatedOffers: ['offer-1', 'offer-2'], // Added offer-2
        relatedActivities: ['activity-1'],
        relatedDestinations: ['dest-2']
      });
    });

    it('updates selection counts', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        // Initial counts
        expect(screen.getByText('1 related offers selected')).toBeInTheDocument();
        expect(screen.getByText('1 related activities selected')).toBeInTheDocument();
        expect(screen.getByText('1 related destinations selected')).toBeInTheDocument();
      });

      // Add another offer
      const cityBreakCheckbox = screen.getByLabelText(/City Break Deal/);
      fireEvent.click(cityBreakCheckbox);

      await waitFor(() => {
        expect(screen.getByText('2 related offers selected')).toBeInTheDocument();
      });
    });
  });

  describe('Summary Display', () => {
    it('shows relationship summary', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Relationship Summary')).toBeInTheDocument();
        
        // Check summary counts
        const summarySection = screen.getByText('Relationship Summary').closest('div');
        expect(summarySection).toHaveTextContent('Offers:1');
        expect(summarySection).toHaveTextContent('Activities:1');
        expect(summarySection).toHaveTextContent('Destinations:1');
      });
    });

    it('updates summary when selections change', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        const summarySection = screen.getByText('Relationship Summary').closest('div');
        expect(summarySection).toHaveTextContent('Offers:1');
      });

      // Add another offer
      const cityBreakCheckbox = screen.getByLabelText(/City Break Deal/);
      fireEvent.click(cityBreakCheckbox);

      await waitFor(() => {
        const summarySection = screen.getByText('Relationship Summary').closest('div');
        expect(summarySection).toHaveTextContent('Offers:2');
      });
    });
  });

  describe('API Integration', () => {
    it('fetches related content on mount', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/offers?limit=100');
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/activities?limit=100');
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/destinations?limit=100&exclude=dest-123');
      });
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles empty API responses', async () => {
      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ offers: [], activities: [], destinations: [] })
        });
      });

      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No offers available')).toBeInTheDocument();
        expect(screen.getByText('No activities available')).toBeInTheDocument();
        expect(screen.getByText('No other destinations available')).toBeInTheDocument();
      });
    });
  });

  describe('Content Display', () => {
    it('displays offer information correctly', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Beach Resort Package')).toBeInTheDocument();
        expect(screen.getByText('All-inclusive beach resort')).toBeInTheDocument();
        expect(screen.getByText('From £599')).toBeInTheDocument();
      });
    });

    it('displays activity information correctly', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Scuba Diving')).toBeInTheDocument();
        expect(screen.getByText('Underwater exploration')).toBeInTheDocument();
        expect(screen.getByText('From £89')).toBeInTheDocument();
      });
    });

    it('displays destination information correctly', async () => {
      render(
        <RelationshipManager
          destination={mockDestination}
          onUpdate={mockOnUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Valencia')).toBeInTheDocument();
        expect(screen.getByText('Historic coastal city')).toBeInTheDocument();
        expect(screen.getByText('Valencia, Spain')).toBeInTheDocument();
      });
    });
  });
});