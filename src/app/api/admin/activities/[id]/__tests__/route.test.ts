import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
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
  toObject: () => ({
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
  }),
};

describe('/api/admin/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockRequireAdmin.mockResolvedValue(undefined);
    mockGetServerSession.mockResolvedValue(mockSession);

    // Mock Activity model methods
    mockActivity.findById = vi.fn();
    mockActivity.findByIdAndUpdate = vi.fn();
    mockActivity.findByIdAndDelete = vi.fn();
  });

  describe('GET /api/admin/activities/[id]', () => {
    it('should require admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate activity ID format', async () => {
      const invalidId = 'invalid-id';
      const request = new NextRequest(
        `http://localhost/api/admin/activities/${invalidId}`
      );
      const response = await GET(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ID');
    });

    it('should return activity details successfully', async () => {
      mockActivity.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockActivityData.toObject()),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data._id).toBe(mockActivityId);
      expect(data.data.name).toBe('Beach Excursion');
      expect(mockActivity.findById).toHaveBeenCalledWith(mockActivityId);
    });

    it('should populate creator information', async () => {
      const mockPopulate = vi.fn().mockReturnThis();
      const mockLean = vi.fn().mockResolvedValue(mockActivityData.toObject());

      mockActivity.findById.mockReturnValue({
        populate: mockPopulate,
        lean: mockLean,
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      await GET(request, { params: { id: mockActivityId } });

      expect(mockPopulate).toHaveBeenCalledWith('createdBy', 'name email');
    });

    it('should return 404 for non-existent activity', async () => {
      mockActivity.findById.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockActivity.findById.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PUT /api/admin/activities/[id]', () => {
    const validUpdateData = {
      name: 'Updated Beach Excursion',
      category: 'excursion',
      location: 'Updated Benidorm',
      pricePerPerson: 30.0,
      minPersons: 3,
      maxPersons: 25,
      availableFrom: '2025-07-01',
      availableTo: '2025-10-31',
      duration: '5 hours',
      description: 'An updated wonderful beach excursion with guided tour',
      isActive: false,
    };

    it('should require admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validUpdateData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate activity ID format', async () => {
      const invalidId = 'invalid-id';
      const request = new NextRequest(
        `http://localhost/api/admin/activities/${invalidId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validUpdateData),
        }
      );
      const response = await PUT(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ID');
    });

    it('should validate required fields', async () => {
      const invalidData = { name: 'ab' }; // Too short

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate name length constraints', async () => {
      const invalidData = {
        ...validUpdateData,
        name: 'A'.repeat(201), // Too long
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('name');
    });

    it('should validate category enum values', async () => {
      const invalidData = {
        ...validUpdateData,
        category: 'invalid_category',
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('category');
    });

    it('should validate price constraints', async () => {
      const invalidData = {
        ...validUpdateData,
        pricePerPerson: -10, // Negative price
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('price');
    });

    it('should validate person count constraints', async () => {
      const invalidData = {
        ...validUpdateData,
        minPersons: 10,
        maxPersons: 5, // Max less than min
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('persons');
    });

    it('should validate date constraints', async () => {
      const invalidData = {
        ...validUpdateData,
        availableFrom: '2025-10-01',
        availableTo: '2025-07-01', // End before start
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('date');
    });

    it('should validate description length', async () => {
      const invalidData = {
        ...validUpdateData,
        description: 'Short', // Too short
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('description');
    });

    it('should update activity successfully', async () => {
      const updatedActivity = {
        ...mockActivityData.toObject(),
        ...validUpdateData,
        availableFrom: new Date(validUpdateData.availableFrom),
        availableTo: new Date(validUpdateData.availableTo),
        updatedAt: new Date(),
      };

      mockActivity.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(updatedActivity),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validUpdateData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(validUpdateData.name);
      expect(data.data.pricePerPerson).toBe(validUpdateData.pricePerPerson);
      expect(mockActivity.findByIdAndUpdate).toHaveBeenCalledWith(
        mockActivityId,
        expect.objectContaining({
          ...validUpdateData,
          availableFrom: new Date(validUpdateData.availableFrom),
          availableTo: new Date(validUpdateData.availableTo),
          updatedAt: expect.any(Date),
        }),
        { new: true, runValidators: true }
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        name: 'Partially Updated Activity',
        pricePerPerson: 35.0,
      };

      const updatedActivity = {
        ...mockActivityData.toObject(),
        ...partialUpdate,
        updatedAt: new Date(),
      };

      mockActivity.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(updatedActivity),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(partialUpdate),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(partialUpdate.name);
      expect(data.data.pricePerPerson).toBe(partialUpdate.pricePerPerson);
    });

    it('should return 404 for non-existent activity', async () => {
      mockActivity.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validUpdateData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockActivity.findByIdAndUpdate.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validUpdateData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: 'invalid json',
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should validate date format', async () => {
      const invalidData = {
        ...validUpdateData,
        availableFrom: 'invalid-date-format',
      };

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('date');
    });
  });

  describe('DELETE /api/admin/activities/[id]', () => {
    it('should require admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, {
        params: { id: mockActivityId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate activity ID format', async () => {
      const invalidId = 'invalid-id';
      const request = new NextRequest(
        `http://localhost/api/admin/activities/${invalidId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, { params: { id: invalidId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ID');
    });

    it('should delete activity successfully', async () => {
      mockActivity.findByIdAndDelete.mockResolvedValue(
        mockActivityData.toObject()
      );

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, {
        params: { id: mockActivityId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted successfully');
      expect(mockActivity.findByIdAndDelete).toHaveBeenCalledWith(
        mockActivityId
      );
    });

    it('should return 404 for non-existent activity', async () => {
      mockActivity.findByIdAndDelete.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, {
        params: { id: mockActivityId },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockActivity.findByIdAndDelete.mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'DELETE',
        }
      );
      const response = await DELETE(request, {
        params: { id: mockActivityId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle missing session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle non-admin users', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Insufficient permissions'));

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`
      );
      const response = await GET(request, { params: { id: mockActivityId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long activity names', async () => {
      const longName = 'A'.repeat(200); // Maximum allowed length
      const validData = {
        name: longName,
        category: 'excursion',
        location: 'Test Location',
        pricePerPerson: 25.0,
        minPersons: 1,
        maxPersons: 10,
        availableFrom: '2025-06-01',
        availableTo: '2025-09-30',
        duration: '4 hours',
        description:
          'A valid description that is long enough to pass validation requirements',
      };

      const updatedActivity = {
        ...mockActivityData.toObject(),
        ...validData,
        availableFrom: new Date(validData.availableFrom),
        availableTo: new Date(validData.availableTo),
      };

      mockActivity.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(updatedActivity),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });

      expect(response.status).toBe(200);
    });

    it('should handle maximum price values', async () => {
      const validData = {
        name: 'Expensive Activity',
        category: 'excursion',
        location: 'Luxury Location',
        pricePerPerson: 9999.99,
        minPersons: 1,
        maxPersons: 2,
        availableFrom: '2025-06-01',
        availableTo: '2025-09-30',
        duration: '8 hours',
        description: 'A very expensive luxury activity with premium services',
      };

      const updatedActivity = {
        ...mockActivityData.toObject(),
        ...validData,
        availableFrom: new Date(validData.availableFrom),
        availableTo: new Date(validData.availableTo),
      };

      mockActivity.findByIdAndUpdate.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(updatedActivity),
      });

      const request = new NextRequest(
        `http://localhost/api/admin/activities/${mockActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(validData),
        }
      );
      const response = await PUT(request, { params: { id: mockActivityId } });

      expect(response.status).toBe(200);
    });

    it('should handle all activity categories', async () => {
      const categories = Object.values(ActivityCategory);

      for (const category of categories) {
        const validData = {
          name: `${category} Activity`,
          category,
          location: 'Test Location',
          pricePerPerson: 25.0,
          minPersons: 1,
          maxPersons: 10,
          availableFrom: '2025-06-01',
          availableTo: '2025-09-30',
          duration: '4 hours',
          description: `A ${category} activity for testing purposes`,
        };

        const updatedActivity = {
          ...mockActivityData.toObject(),
          ...validData,
          availableFrom: new Date(validData.availableFrom),
          availableTo: new Date(validData.availableTo),
        };

        mockActivity.findByIdAndUpdate.mockReturnValue({
          populate: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue(updatedActivity),
        });

        const request = new NextRequest(
          `http://localhost/api/admin/activities/${mockActivityId}`,
          {
            method: 'PUT',
            body: JSON.stringify(validData),
          }
        );
        const response = await PUT(request, { params: { id: mockActivityId } });

        expect(response.status).toBe(200);
      }
    });
  });
});
