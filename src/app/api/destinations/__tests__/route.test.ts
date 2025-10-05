import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the database connection and model
vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn()
}));

vi.mock('@/models/Destination', () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn()
  }
}));

const mockDestinations = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Benidorm',
    slug: 'benidorm',
    country: 'Spain',
    region: 'Costa Blanca',
    description: 'Beautiful beach destination',
    heroImage: '/images/benidorm.jpg',
    gradientColors: 'from-blue-500 to-orange-400',
    quickFacts: {
      climate: 'Mediterranean',
      bestTime: 'April to October',
      flightTime: '2.5 hours from UK',
      language: 'Spanish',
      airport: 'Alicante'
    },
    status: 'published',
    publishedAt: new Date('2024-01-01')
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Albufeira',
    slug: 'albufeira',
    country: 'Portugal',
    region: 'Algarve',
    description: 'Premier beach destination',
    heroImage: '/images/albufeira.jpg',
    gradientColors: 'from-orange-400 to-red-500',
    quickFacts: {
      climate: 'Mediterranean',
      bestTime: 'May to September',
      flightTime: '2.5 hours from UK',
      language: 'Portuguese',
      airport: 'Faro'
    },
    status: 'published',
    publishedAt: new Date('2024-01-02')
  }
];

describe('/api/destinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return published destinations', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDestinations)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toHaveLength(2);
      expect(data.destinations[0].name).toBe('Benidorm');
      expect(data.destinations[0].slug).toBe('benidorm');
      expect(data.pagination.total).toBe(2);
    });

    it('should filter by region', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockDestinations[0]])
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/destinations?region=costa%20blanca');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toHaveLength(1);
      expect(data.destinations[0].region).toBe('Costa Blanca');
      
      // Verify the query was called with region filter
      expect(Destination.default.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          region: { $regex: 'costa blanca', $options: 'i' }
        })
      );
    });

    it('should filter by search query', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockDestinations[0]])
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/destinations?search=benidorm');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toHaveLength(1);
      
      // Verify the query was called with search filter
      expect(Destination.default.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          $or: expect.arrayContaining([
            { name: { $regex: 'benidorm', $options: 'i' } },
            { country: { $regex: 'benidorm', $options: 'i' } },
            { region: { $regex: 'benidorm', $options: 'i' } },
            { description: { $regex: 'benidorm', $options: 'i' } },
            { 'sections.overview.content': { $regex: 'benidorm', $options: 'i' } }
          ])
        })
      );
    });

    it('should handle pagination', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockDestinations[0]])
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(10);

      const request = new NextRequest('http://localhost:3000/api/destinations?page=2&limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.total).toBe(10);
      expect(data.pagination.pages).toBe(2);
      expect(data.pagination.hasNext).toBe(false);
      expect(data.pagination.hasPrev).toBe(true);
      
      // Verify pagination was applied
      expect(mockFind.skip).toHaveBeenCalledWith(5);
      expect(mockFind.limit).toHaveBeenCalledWith(5);
    });

    it('should transform destination data correctly', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([mockDestinations[0]])
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/destinations');
      const response = await GET(request);
      const data = await response.json();

      const destination = data.destinations[0];
      
      expect(destination.id).toBe('benidorm');
      expect(destination.name).toBe('Benidorm');
      expect(destination.image).toBe('/images/benidorm.jpg');
      expect(destination.highlights).toContain('Mediterranean climate');
      expect(destination.highlights).toContain('Best time: April to October');
      expect(destination.climate).toBe('Mediterranean');
      expect(destination.bestTime).toBe('April to October');
      expect(destination.flightTime).toBe('2.5 hours from UK');
    });

    it('should handle database errors', async () => {
      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost:3000/api/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch destinations');
    });

    it('should only return published destinations', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDestinations)
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/destinations');
      await GET(request);

      // Verify only published destinations are queried
      expect(Destination.default.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published'
        })
      );
    });

    it('should handle empty results', async () => {
      const mockFind = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
      };

      const Destination = await import('@/models/Destination');
      Destination.default.find = vi.fn().mockReturnValue(mockFind);
      Destination.default.countDocuments = vi.fn().mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/destinations?search=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
      expect(data.pagination.pages).toBe(0);
    });
  });
});