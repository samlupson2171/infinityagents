import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET, POST } from '../route';
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
  default: vi.fn(),
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
      activityId: mockActivityId,
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
};

describe('/api/packages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/packages', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return user packages with pagination', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockFind = vi.fn().mockReturnThis();
      const mockPopulate = vi.fn().mockReturnThis();
      const mockSort = vi.fn().mockReturnThis();
      const mockSkip = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockLean = vi.fn().mockResolvedValue([mockPackage.toObject()]);

      mockActivityPackage.find = mockFind;
      mockFind.mockReturnValue({
        populate: mockPopulate,
      });
      mockPopulate.mockReturnValue({
        sort: mockSort,
      });
      mockSort.mockReturnValue({
        skip: mockSkip,
      });
      mockSkip.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        lean: mockLean,
      });

      mockActivityPackage.countDocuments = vi.fn().mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost:3000/api/packages?page=1&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.packages).toHaveLength(1);
      expect(data.data.pagination.total).toBe(1);
      expect(mockFind).toHaveBeenCalledWith({
        createdBy: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should filter packages by status', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const mockFind = vi.fn().mockReturnThis();
      const mockPopulate = vi.fn().mockReturnThis();
      const mockSort = vi.fn().mockReturnThis();
      const mockSkip = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockLean = vi.fn().mockResolvedValue([]);

      mockActivityPackage.find = mockFind;
      mockFind.mockReturnValue({
        populate: mockPopulate,
      });
      mockPopulate.mockReturnValue({
        sort: mockSort,
      });
      mockSort.mockReturnValue({
        skip: mockSkip,
      });
      mockSkip.mockReturnValue({
        limit: mockLimit,
      });
      mockLimit.mockReturnValue({
        lean: mockLean,
      });

      mockActivityPackage.countDocuments = vi.fn().mockResolvedValue(0);

      const request = new NextRequest(
        'http://localhost:3000/api/packages?status=draft'
      );
      const response = await GET(request);

      expect(mockFind).toHaveBeenCalledWith({
        createdBy: expect.any(mongoose.Types.ObjectId),
        status: 'draft',
      });
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivityPackage.find = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/packages');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/packages', () => {
    const validPackageData = {
      name: 'Test Package',
      activities: [
        {
          activityId: mockActivityId,
          quantity: 2,
        },
      ],
      numberOfPersons: 3,
      clientName: 'John Doe',
      notes: 'Test notes',
    };

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(validPackageData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = { name: 'ab' }; // Too short

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate activities array', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = {
        name: 'Test Package',
        activities: 'not an array',
        numberOfPersons: 1,
      };

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Activities must be an array');
    });

    it('should validate number of persons', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = {
        name: 'Test Package',
        activities: [],
        numberOfPersons: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'Number of persons must be at least 1'
      );
    });

    it('should validate activity existence', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivity.find = vi.fn().mockResolvedValue([]); // No activities found

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(validPackageData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'One or more activities are invalid or inactive'
      );
    });

    it('should create package successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivity.find = vi.fn().mockResolvedValue([mockActivityData]);

      const mockSave = vi.fn().mockResolvedValue(mockPackage);
      const mockPopulate = vi.fn().mockResolvedValue(mockPackage);
      const mockPackageInstance = {
        ...mockPackage,
        save: mockSave,
        populate: mockPopulate,
        toObject: () => mockPackage.toObject(),
      };

      mockActivityPackage.mockImplementation(() => mockPackageInstance);

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(validPackageData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Package');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle invalid status', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = {
        ...validPackageData,
        status: 'invalid_status',
      };

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain(
        'Status must be either draft or finalized'
      );
    });

    it('should handle database errors during creation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivity.find = vi.fn().mockResolvedValue([mockActivity]);

      const mockSave = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockPackageInstance = {
        save: mockSave,
      };

      mockActivityPackage.mockImplementation(() => mockPackageInstance);

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(validPackageData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should calculate subtotals correctly', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockActivity.find = vi.fn().mockResolvedValue([
        {
          ...mockActivityData,
          pricePerPerson: 30.0,
        },
      ]);

      const mockSave = vi.fn().mockResolvedValue(mockPackage);
      const mockPopulate = vi.fn().mockResolvedValue(mockPackage);
      let capturedPackageData: any;

      const mockPackageInstance = {
        save: mockSave,
        populate: mockPopulate,
        toObject: () => mockPackage.toObject(),
      };

      mockActivityPackage.mockImplementation((data) => {
        capturedPackageData = data;
        return mockPackageInstance;
      });

      const packageData = {
        name: 'Test Package',
        activities: [
          {
            activityId: mockActivityId,
            quantity: 3,
          },
        ],
        numberOfPersons: 2,
      };

      const request = new NextRequest('http://localhost:3000/api/packages', {
        method: 'POST',
        body: JSON.stringify(packageData),
      });
      await POST(request);

      expect(capturedPackageData.activities[0].subtotal).toBe(90.0); // 3 * 30.00
    });
  });
});
