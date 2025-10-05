import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import { requireAdmin } from '@/lib/auth-middleware';
import { getServerSession } from 'next-auth';
import Activity, { ActivityCategory } from '@/models/Activity';
import mongoose from 'mongoose';

// Mock dependencies
vi.mock('@/lib/auth-middleware');
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Activity');

const mockRequireAdmin = requireAdmin as Mock;
const mockGetServerSession = getServerSession as Mock;
const mockActivity = Activity as any;

// Mock data
const mockUserId = '507f1f77bcf86cd799439011';
const mockActivityId = '507f1f77bcf86cd799439012';

const mockSession = {
  user: {
    id: mockUserId,
    email: 'admin@example.com',
    role: 'admin',
  },
};

const mockActivityData = {
  _id: mockActivityId,
  name: 'Beach Excursion',
  category: ActivityCategory.EXCURSION,
  location: 'Benidorm',
  pricePerPerson: 25.0,
  minPersons: 2,
  maxPersons: 20,
  availableFrom: new Date('2025-06-01'),
  availableTo: new Date('2025-09-30'),
  duration: '4 hours',
  description: 'A wonderful beach excursion with guided tour',
  isActive: true,
  createdBy: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('/api/admin/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockRequireAdmin.mockResolvedValue(undefined);
    mockGetServerSession.mockResolvedValue(mockSession);

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
    mockActivity.findById = vi.fn();
    mockActivity.findByIdAndUpdate = vi.fn();
    mockActivity.findByIdAndDelete = vi.fn();
    mockActivity.updateMany = vi.fn();
  });

  describe('GET /api/admin/activities', () => {
    it('should require admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/admin/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return all activities with pagination for admin', async () => {
      const mockActivities = [mockActivityData];
      mockActivity.find().lean.mockResolvedValue(mockActivities);
      mockActivity.countDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/admin/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activities).toEqual(mockActivities);
      expect(data.data.pagination.total).toBe(1);

      // Should not filter by isActive for admin
      expect(mockActivity.find).toHaveBeenCalledWith({});
    });

    it('should handle search parameter', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?search=beach'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        $text: { $search: 'beach' },
      });
    });

    it('should handle status filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?status=inactive'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        isActive: false,
      });
    });

    it('should handle location filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?location=Benidorm'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        location: { $regex: new RegExp('Benidorm', 'i') },
      });
    });

    it('should handle category filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?category=excursion'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        category: ActivityCategory.EXCURSION,
      });
    });

    it('should handle date range filter', async () => {
      const dateFrom = '2025-06-01';
      const dateTo = '2025-09-30';
      const request = new NextRequest(
        `http://localhost/api/admin/activities?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        availableTo: { $gte: new Date(dateFrom) },
        availableFrom: { $lte: new Date(dateTo) },
      });
    });

    it('should handle price range filter', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?priceMin=10&priceMax=50'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        pricePerPerson: { $gte: 10, $lte: 50 },
      });
    });

    it('should handle creator filter', async () => {
      const creatorId = '507f1f77bcf86cd799439013';
      const request = new NextRequest(
        `http://localhost/api/admin/activities?createdBy=${creatorId}`
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        createdBy: new mongoose.Types.ObjectId(creatorId),
      });
    });

    it('should handle multiple filters combined', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?search=beach&status=active&location=Benidorm&category=excursion'
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        $text: { $search: 'beach' },
        isActive: true,
        location: { $regex: new RegExp('Benidorm', 'i') },
        category: ActivityCategory.EXCURSION,
      });
    });

    it('should handle pagination parameters', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?page=2&limit=15'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.skip).toHaveBeenCalledWith(15); // (page - 1) * limit
      expect(findChain.limit).toHaveBeenCalledWith(15);
    });

    it('should populate creator information', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities');
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.populate).toHaveBeenCalledWith(
        'createdBy',
        'name email'
      );
    });

    it('should use text search sorting when search is provided', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?search=beach'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.sort).toHaveBeenCalledWith({
        score: { $meta: 'textScore' },
        createdAt: -1,
      });
    });

    it('should use default sorting when no search is provided', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities');
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should handle database errors', async () => {
      mockActivity.find().lean.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should calculate pagination correctly', async () => {
      mockActivity.countDocuments.mockResolvedValue(47);

      const request = new NextRequest(
        'http://localhost/api/admin/activities?page=3&limit=15'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        page: 3,
        limit: 15,
        total: 47,
        totalPages: 4,
        hasNext: true,
        hasPrev: true,
      });
    });
  });

  describe('POST /api/admin/activities (bulk operations)', () => {
    it('should require admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: [mockActivityId],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate required fields for bulk operations', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({}), // Missing action and activityIds
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate action parameter', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid_action',
          activityIds: [mockActivityId],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid action');
    });

    it('should validate activityIds array', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: 'not-an-array',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Activity IDs must be an array');
    });

    it('should validate ObjectId format in activityIds', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: ['invalid-id', 'another-invalid'],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid activity ID format');
    });

    it('should handle activate action successfully', async () => {
      mockActivity.updateMany.mockResolvedValue({
        matchedCount: 2,
        modifiedCount: 2,
      });

      const activityIds = [mockActivityId, '507f1f77bcf86cd799439013'];
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.modifiedCount).toBe(2);
      expect(mockActivity.updateMany).toHaveBeenCalledWith(
        {
          _id: {
            $in: activityIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        { isActive: true, updatedAt: expect.any(Date) }
      );
    });

    it('should handle deactivate action successfully', async () => {
      mockActivity.updateMany.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'deactivate',
          activityIds: [mockActivityId],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.modifiedCount).toBe(1);
      expect(mockActivity.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [new mongoose.Types.ObjectId(mockActivityId)] } },
        { isActive: false, updatedAt: expect.any(Date) }
      );
    });

    it('should handle delete action successfully', async () => {
      mockActivity.updateMany.mockResolvedValue({
        deletedCount: 1,
      });

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          activityIds: [mockActivityId],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(1);
    });

    it('should handle empty activityIds array', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: [],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'At least one activity ID is required'
      );
    });

    it('should handle database errors during bulk operations', async () => {
      mockActivity.updateMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: [mockActivityId],
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle no matching documents', async () => {
      mockActivity.updateMany.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
      });

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: ['507f1f77bcf86cd799439999'], // Non-existent ID
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });
  });

  describe('Unsupported HTTP methods', () => {
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

  describe('Authentication and Authorization', () => {
    it('should handle missing session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle non-admin users', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Insufficient permissions'));

      const request = new NextRequest('http://localhost/api/admin/activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large page numbers', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?page=999999&limit=20'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.skip).toHaveBeenCalledWith(19999980); // (999999 - 1) * 20
    });

    it('should handle maximum limit constraint', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?limit=500'
      );
      await GET(request);

      const findChain = mockActivity.find();
      expect(findChain.limit).toHaveBeenCalledWith(100); // Should be capped at 100
    });

    it('should handle special characters in search', async () => {
      const searchTerm = 'beach & sun + fun';
      const request = new NextRequest(
        `http://localhost/api/admin/activities?search=${encodeURIComponent(searchTerm)}`
      );
      await GET(request);

      expect(mockActivity.find).toHaveBeenCalledWith({
        $text: { $search: searchTerm },
      });
    });

    it('should handle invalid date formats gracefully', async () => {
      const request = new NextRequest(
        'http://localhost/api/admin/activities?dateFrom=invalid-date&dateTo=also-invalid'
      );
      await GET(request);

      // Should ignore invalid dates and not include them in query
      expect(mockActivity.find).toHaveBeenCalledWith({});
    });

    it('should handle bulk operations with maximum activity limit', async () => {
      const manyActivityIds = Array.from({ length: 1000 }, (_, i) =>
        new mongoose.Types.ObjectId().toString()
      );

      const request = new NextRequest('http://localhost/api/admin/activities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'activate',
          activityIds: manyActivityIds,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Too many activities');
    });
  });
});
