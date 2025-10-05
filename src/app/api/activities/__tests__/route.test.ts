import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import Activity, { ActivityCategory } from '@/models/Activity';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Activity');

const mockGetServerSession = getServerSession as Mock;
const mockActivity = Activity as any;

describe('/api/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    // Mock Activity model methods
    mockActivity.find = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
    mockActivity.countDocuments = vi.fn().mockResolvedValue(0);
  });

  describe('GET /api/activities', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return activities with default pagination', async () => {
      const mockActivities = [
        {
          _id: '1',
          name: 'Beach Tour',
          category: ActivityCategory.EXCURSION,
          location: 'Benidorm',
          pricePerPerson: 25,
          isActive: true,
        },
      ];

      mockActivity.find().lean.mockResolvedValue(mockActivities);
      mockActivity.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activities).toEqual(mockActivities);
      expect(data.data.pagination.page).toBe(1);
      expect(data.data.pagination.limit).toBe(20);
      expect(data.data.pagination.total).toBe(1);
    });

    it('should handle search parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?search=beach'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        $text: { $search: 'beach' },
      });
    });

    it('should handle location filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?location=Benidorm'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        location: { $regex: new RegExp('Benidorm', 'i') },
      });
    });

    it('should handle category filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?category=excursion'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        category: ActivityCategory.EXCURSION,
      });
    });

    it('should handle price range filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?priceMin=10&priceMax=50'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        pricePerPerson: { $gte: 10, $lte: 50 },
      });
    });

    it('should handle date range filter', async () => {
      const dateFrom = '2025-06-01';
      const dateTo = '2025-09-30';
      const request = new NextRequest(
        `http://localhost/api/activities?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        availableTo: { $gte: new Date(dateFrom) },
        availableFrom: { $lte: new Date(dateTo) },
      });
    });

    it('should handle pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?page=2&limit=10'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.skip).toHaveBeenCalledWith(10); // (page - 1) * limit
      expect(findChain.limit).toHaveBeenCalledWith(10);
    });

    it('should limit maximum page size', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?limit=200'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.limit).toHaveBeenCalledWith(100); // Max limit
    });

    it('should handle multiple filters combined', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?search=beach&location=Benidorm&category=excursion&priceMin=20&priceMax=40'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
        $text: { $search: 'beach' },
        location: { $regex: new RegExp('Benidorm', 'i') },
        category: ActivityCategory.EXCURSION,
        pricePerPerson: { $gte: 20, $lte: 40 },
      });
    });

    it('should calculate pagination correctly', async () => {
      mockActivity.countDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/activities?page=2&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle database errors', async () => {
      mockActivity.find().lean.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should ignore invalid category values', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?category=invalid'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
      });
    });

    it('should ignore invalid price values', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?priceMin=invalid&priceMax=notanumber'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: true,
      });
    });

    it('should use text search sorting when search is provided', async () => {
      const request = new NextRequest(
        'http://localhost/api/activities?search=beach'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.sort).toHaveBeenCalledWith({
        score: { $meta: 'textScore' },
        createdAt: -1,
      });
    });

    it('should use default sorting when no search is provided', async () => {
      const request = new NextRequest('http://localhost/api/activities');
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for POST requests', async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should return 405 for PUT requests', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
