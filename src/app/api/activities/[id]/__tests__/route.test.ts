import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import Activity, { ActivityCategory } from '@/models/Activity';
import mongoose from 'mongoose';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Activity');
vi.mock('mongoose');

const mockGetServerSession = getServerSession as Mock;
const mockActivity = Activity as any;
const mockMongoose = mongoose as any;

describe('/api/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id' },
    });

    // Mock mongoose ObjectId validation
    mockMongoose.Types = {
      ObjectId: {
        isValid: vi.fn().mockReturnValue(true),
      },
    };

    // Mock Activity model methods
    mockActivity.findOne = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });
  });

  describe('GET /api/activities/[id]', () => {
    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/activities/123');
      const response = await GET(request, { params: { id: '123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should validate activity ID format', async () => {
      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

      const request = new NextRequest(
        'http://localhost/api/activities/invalid-id'
      );
      const response = await GET(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent activity', async () => {
      mockActivity.findOne().lean.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/activities/507f1f77bcf86cd799439011'
      );
      const response = await GET(request, {
        params: { id: '507f1f77bcf86cd799439011' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return activity details with computed fields', async () => {
      const mockActivity = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Beach Tour',
        category: ActivityCategory.EXCURSION,
        location: 'Benidorm',
        pricePerPerson: 25,
        minPersons: 2,
        maxPersons: 20,
        availableFrom: new Date('2025-06-01'),
        availableTo: new Date('2025-09-30'),
        duration: '4 hours',
        description: 'Beach tour activity',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          _id: 'user-id',
          name: 'Test User',
        },
      };

      mockActivity.findOne().lean.mockResolvedValue(mockActivity);

      const request = new NextRequest(
        'http://localhost/api/activities/507f1f77bcf86cd799439011'
      );
      const response = await GET(request, {
        params: { id: '507f1f77bcf86cd799439011' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        _id: '507f1f77bcf86cd799439011',
        name: 'Beach Tour',
        category: ActivityCategory.EXCURSION,
        location: 'Benidorm',
        pricePerPerson: 25,
      });
      expect(data.data).toHaveProperty('isAvailable');
      expect(data.data).toHaveProperty('daysUntilStart');
      expect(data.data).toHaveProperty('daysUntilEnd');
    });

    it('should query for active activities only', async () => {
      const activityId = '507f1f77bcf86cd799439011';

      const request = new NextRequest(
        `http://localhost/api/activities/${activityId}`
      );
      await GET(request, { params: { id: activityId } });

      expect(mockActivity.findOne).toHaveBeenCalledWith({
        _id: activityId,
        isActive: true,
      });
    });

    it('should populate creator information', async () => {
      const activityId = '507f1f77bcf86cd799439011';

      const request = new NextRequest(
        `http://localhost/api/activities/${activityId}`
      );
      await GET(request, { params: { id: activityId } });

      const findChain = mockActivity.findOne();
      expect(findChain.populate).toHaveBeenCalledWith('createdBy', 'name');
    });

    it('should handle database errors', async () => {
      mockActivity
        .findOne()
        .lean.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost/api/activities/507f1f77bcf86cd799439011'
      );
      const response = await GET(request, {
        params: { id: '507f1f77bcf86cd799439011' },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should calculate availability correctly for current activity', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const mockActivity = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Beach Tour',
        availableFrom: pastDate,
        availableTo: futureDate,
        isActive: true,
      };

      mockActivity.findOne().lean.mockResolvedValue(mockActivity);

      const request = new NextRequest(
        'http://localhost/api/activities/507f1f77bcf86cd799439011'
      );
      const response = await GET(request, {
        params: { id: '507f1f77bcf86cd799439011' },
      });
      const data = await response.json();

      expect(data.data.isAvailable).toBe(true);
      expect(data.data.daysUntilStart).toBe(0); // Already started
      expect(data.data.daysUntilEnd).toBeGreaterThan(0); // Still available
    });

    it('should calculate availability correctly for future activity', async () => {
      const now = new Date();
      const futureStart = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const futureEnd = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000); // 40 days from now

      const mockActivity = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Beach Tour',
        availableFrom: futureStart,
        availableTo: futureEnd,
        isActive: true,
      };

      mockActivity.findOne().lean.mockResolvedValue(mockActivity);

      const request = new NextRequest(
        'http://localhost/api/activities/507f1f77bcf86cd799439011'
      );
      const response = await GET(request, {
        params: { id: '507f1f77bcf86cd799439011' },
      });
      const data = await response.json();

      expect(data.data.isAvailable).toBe(false);
      expect(data.data.daysUntilStart).toBeGreaterThan(0);
      expect(data.data.daysUntilEnd).toBeGreaterThan(0);
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
