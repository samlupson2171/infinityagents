import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET, PUT, DELETE } from '../route';
import { connectToDatabase } from '@/lib/mongodb';
import ActivityPackage from '@/models/ActivityPackage';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn(),
}));
vi.mock('@/models/ActivityPackage', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));
vi.mock('@/models/Activity', () => ({
  default: {
    find: vi.fn(),
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockConnectToDatabase = vi.mocked(connectToDatabase);
const mockActivityPackage = vi.mocked(ActivityPackage);
const mockActivity = vi.mocked(Activity);

// Mock data
const mockUserId = '507f1f77bcf86cd799439011';
const mockActivityId = '507f1f77bcf86cd799439012';
const mockPackageId = '507f1f77bcf86cd799439013';

const mockSession = {
  user: {
    id: mockUserId,
    email: 'test@example.com',
    role: 'agent',
  },
};

const mockActivityData = {
  _id: mockActivityId,
  name: 'Beach Excursion',
  category: 'excursion',
  location: 'Benidorm',
  pricePerPerson: 25.0,
  duration: '4 hours',
  description: 'Beach activity',
  isActive: true,
};

const mockPackage = {
  _id: mockPackageId,
  name: 'Test Package',
  activities: [
    {
      activityId: { _id: mockActivityId, ...mockActivityData },
      quantity: 2,
      subtotal: 50.0,
    },
  ],
  numberOfPersons: 3,
  totalCost: 150.0,
  createdBy: mockUserId,
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
  toObject: () => ({
    _id: mockPackageId,
    name: 'Test Package',
    activities: [
      {
        activityId: { _id: mockActivityId, ...mockActivityData },
        quantity: 2,
        subtotal: 50.0,
      },
    ],
    numberOfPersons: 3,
    totalCost: 150.0,
    createdBy: mockUserId,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  populate: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
};

describe('/api/packages/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/packages/[id]', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`
      );
      const response = await GET(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid package ID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        'http://localhost:3000/api/packages/invalid-id'
      );
      const response = await GET(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if package not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockFindOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });
      mockActivityPackage.findOne = mockFindOne;

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`
      );
      const response = await GET(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return package successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockFindOne = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockPackage),
      });
      mockActivityPackage.findOne = mockFindOne;

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`
      );
      const response = await GET(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Package');
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`
      );
      const response = await GET(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/packages/[id]', () => {
    const updateData = {
      name: 'Updated Package',
      numberOfPersons: 4,
      clientName: 'Jane Doe',
    };

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid package ID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        'http://localhost:3000/api/packages/invalid-id',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      const response = await PUT(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if package not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should validate package name', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);

      const invalidData = { name: 'ab' }; // Too short

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'Package name must be at least 3 characters long'
      );
    });

    it('should validate activities array', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);

      const invalidData = { activities: 'not an array' };

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Activities must be an array');
    });

    it('should validate number of persons', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);

      const invalidData = { numberOfPersons: 0 };

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'Number of persons must be at least 1'
      );
    });

    it('should validate status', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);

      const invalidData = { status: 'invalid_status' };

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'Status must be either draft or finalized'
      );
    });

    it('should update package successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPackage.save).toHaveBeenCalled();
      expect(mockPackage.populate).toHaveBeenCalled();
    });

    it('should validate activities when updating', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOne = vi.fn().mockResolvedValue(mockPackage);
      mockActivity.find = vi.fn().mockResolvedValue([]); // No activities found

      const updateWithActivities = {
        activities: [
          {
            activityId: mockActivityId,
            quantity: 1,
          },
        ],
      };

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateWithActivities),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'One or more activities are invalid or inactive'
      );
    });

    it('should handle database errors during update', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      const mockPackageWithError = {
        ...mockPackage,
        save: vi.fn().mockRejectedValue(new Error('Database error')),
      };
      mockActivityPackage.findOne = vi
        .fn()
        .mockResolvedValue(mockPackageWithError);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );
      const response = await PUT(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('DELETE /api/packages/[id]', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for invalid package ID', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        'http://localhost:3000/api/packages/invalid-id',
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if package not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOneAndDelete = vi.fn().mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should delete package successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOneAndDelete = vi
        .fn()
        .mockResolvedValue(mockPackage);

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Package deleted successfully');
      expect(mockActivityPackage.findOneAndDelete).toHaveBeenCalledWith({
        _id: expect.any(mongoose.Types.ObjectId),
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should handle database errors during deletion', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.findOneAndDelete = vi
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        `http://localhost:3000/api/packages/${mockPackageId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: mockPackageId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
