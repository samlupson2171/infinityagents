import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the database connection and model
vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn()
}));

vi.mock('@/models/Destination', () => ({
  default: {
    findOne: vi.fn()
  }
}));

const mockDestination = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Benidorm',
  slug: 'benidorm',
  country: 'Spain',
  region: 'Costa Blanca',
  description: 'Beautiful beach destination on the Costa Blanca',
  heroImage: '/images/benidorm.jpg',
  gradientColors: 'from-blue-500 to-orange-400',
  sections: {
    overview: {
      title: 'Overview',
      content: '<p>Benidorm is a vibrant resort town...</p>',
      highlights: ['Beautiful beaches', 'Great nightlife'],
      tips: ['Book early', 'Bring sunscreen'],
      images: ['/images/benidorm-beach.jpg'],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Hotels & Accommodation',
      content: '<p>Wide range of accommodation options...</p>',
      highlights: ['Luxury resorts', 'Budget hotels'],
      tips: ['Check location', 'Read reviews'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: '<p>Many exciting attractions...</p>',
      highlights: ['Theme parks', 'Water sports'],
      tips: ['Buy tickets online', 'Check opening hours'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: '<p>Stunning beaches with golden sand...</p>',
      highlights: ['Levante Beach', 'Poniente Beach'],
      tips: ['Arrive early', 'Bring water'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: '<p>World-famous nightlife scene...</p>',
      highlights: ['Beach bars', 'Nightclubs'],
      tips: ['Dress code', 'Stay safe'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: '<p>Excellent dining options...</p>',
      highlights: ['Seafood', 'International cuisine'],
      tips: ['Try local dishes', 'Make reservations'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: '<p>Everything you need to know...</p>',
      highlights: ['Easy transport', 'English spoken'],
      tips: ['Keep documents safe', 'Learn basic Spanish'],
      images: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  quickFacts: {
    population: '70,000',
    language: 'Spanish, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'CET (GMT+1)',
    airport: 'Alicante (ALC) - 60km',
    flightTime: '2.5 hours from UK',
    climate: 'Mediterranean with 300+ days of sunshine',
    bestTime: 'April to October'
  },
  status: 'published',
  publishedAt: new Date('2024-01-01')
};

describe('/api/destinations/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return destination by slug', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Benidorm');
      expect(data.slug).toBe('benidorm');
      expect(data.id).toBe('benidorm');
      expect(data.sections).toBeDefined();
      expect(data.quickFacts).toBeDefined();
      expect(data.breadcrumb).toEqual([
        { name: 'Destinations', href: '/destinations' },
        { name: 'Benidorm', href: '/destinations/benidorm' }
      ]);
    });

    it('should query for published destination only', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      await GET(request, { params: { slug: 'benidorm' } });

      expect(Destination.default.findOne).toHaveBeenCalledWith({
        slug: 'benidorm',
        status: 'published'
      });
    });

    it('should return 404 for non-existent destination', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(null)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/nonexistent');
      const response = await GET(request, { params: { slug: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });

    it('should return 404 for unpublished destination', async () => {
      const unpublishedDestination = {
        ...mockDestination,
        status: 'draft'
      };

      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(null) // Won't find it because status filter
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });

    it('should transform destination data correctly', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(data.id).toBe(mockDestination.slug);
      expect(data._id).toBe(mockDestination._id);
      expect(data.name).toBe(mockDestination.name);
      expect(data.slug).toBe(mockDestination.slug);
      expect(data.country).toBe(mockDestination.country);
      expect(data.region).toBe(mockDestination.region);
      expect(data.description).toBe(mockDestination.description);
      expect(data.heroImage).toBe(mockDestination.heroImage);
      expect(data.gradientColors).toBe(mockDestination.gradientColors);
      expect(data.sections).toBeDefined();
      expect(data.quickFacts).toEqual(mockDestination.quickFacts);
      expect(data.publishedAt).toBeDefined();
    });

    it('should include all sections in response', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(data.sections.overview).toBeDefined();
      expect(data.sections.accommodation).toBeDefined();
      expect(data.sections.attractions).toBeDefined();
      expect(data.sections.beaches).toBeDefined();
      expect(data.sections.nightlife).toBeDefined();
      expect(data.sections.dining).toBeDefined();
      expect(data.sections.practical).toBeDefined();

      // Check section structure
      expect(data.sections.overview.title).toBe('Overview');
      expect(data.sections.overview.content).toContain('Benidorm is a vibrant resort town');
      expect(data.sections.overview.highlights).toContain('Beautiful beaches');
      expect(data.sections.overview.tips).toContain('Book early');
    });

    it('should handle database errors', async () => {
      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch destination');
    });

    it('should handle special characters in slug', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/ayia-napa');
      await GET(request, { params: { slug: 'ayia-napa' } });

      expect(Destination.default.findOne).toHaveBeenCalledWith({
        slug: 'ayia-napa',
        status: 'published'
      });
    });

    it('should generate correct breadcrumb', async () => {
      const mockFindOne = {
        lean: vi.fn().mockResolvedValue(mockDestination)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.findOne = vi.fn().mockReturnValue(mockFindOne);

      const request = new NextRequest('http://localhost:3000/api/destinations/benidorm');
      const response = await GET(request, { params: { slug: 'benidorm' } });
      const data = await response.json();

      expect(data.breadcrumb).toEqual([
        { name: 'Destinations', href: '/destinations' },
        { name: 'Benidorm', href: '/destinations/benidorm' }
      ]);
    });
  });
});