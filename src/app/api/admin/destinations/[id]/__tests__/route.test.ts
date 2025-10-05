import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Destination');

const mockSession = {
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin'
  }
};

const mockDestination = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Test Destination',
  slug: 'test-destination',
  country: 'Spain',
  region: 'Costa Blanca',
  description: 'A beautiful test destination for our comprehensive testing suite.',
  status: 'draft',
  sections: {
    overview: {
      title: 'Overview',
      content: 'Test overview content',
      highlights: ['Test highlight'],
      tips: ['Test tip'],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: 'Test accommodation content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: 'Test attractions content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: 'Test beaches content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: 'Test nightlife content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: 'Test dining content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: 'Test practical content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  quickFacts: {
    population: '100,000',
    language: 'Spanish',
    currency: 'EUR'
  },
  createdBy: mockSession.user.id,
  lastModifiedBy: mockSession.user.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  populate: vi.fn().mockReturnThis()
};

const validDestinationId = '507f1f77bcf86cd799439012';
const invalidDestinationId = 'invalid-id';

describe('/api/admin/destinations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/destinations/[id]', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await GET(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await GET(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 for invalid destination ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${invalidDestinationId}`);
      const response = await GET(request, { params: { id: invalidDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid destination ID');
    });

    it('should return 404 when destination is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockPopulateChain = {
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(null)
          })
        })
      };
      
      const mockFindById = vi.fn().mockReturnValue(mockPopulateChain);
      vi.mocked(Destination.findById).mockImplementation(mockFindById);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await GET(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });

    it('should return destination successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockPopulateChain = {
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockDestination)
          })
        })
      };
      
      const mockFindById = vi.fn().mockReturnValue(mockPopulateChain);
      vi.mocked(Destination.findById).mockImplementation(mockFindById);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await GET(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destination).toEqual(mockDestination);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await GET(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch destination');
    });
  });

  describe('PUT /api/admin/destinations/[id]', () => {
    const updateData = {
      name: 'Updated Destination',
      description: 'Updated description for our comprehensive testing suite.'
    };

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 for invalid destination ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${invalidDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: invalidDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid destination ID');
    });

    it('should return 404 when destination is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });

    it('should update destination successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findOne).mockResolvedValue(null); // No slug conflict
      
      const updatedDestination = { ...mockDestination, ...updateData };
      const mockPopulateChain = {
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(updatedDestination)
          })
        })
      };
      
      const mockFindByIdAndUpdate = vi.fn().mockReturnValue(mockPopulateChain);
      vi.mocked(Destination.findByIdAndUpdate).mockImplementation(mockFindByIdAndUpdate);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Destination updated successfully');
      expect(data.destination.name).toBe(updateData.name);
    });

    it('should return 409 when slug conflicts with another destination', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      
      const conflictingDestination = { ...mockDestination, _id: 'different-id' };
      vi.mocked(Destination.findOne).mockResolvedValue(conflictingDestination);

      const dataWithSlug = { ...updateData, slug: 'conflicting-slug' };
      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(dataWithSlug)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('A destination with this slug already exists');
    });

    it('should handle status change to published', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findOne).mockResolvedValue(null);
      
      let capturedUpdateData: any;
      const mockFindByIdAndUpdate = vi.fn().mockImplementation((id, data) => {
        capturedUpdateData = data;
        const mockPopulateChain = {
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockResolvedValue({ ...mockDestination, status: 'published' })
            })
          })
        };
        return mockPopulateChain;
      });
      
      vi.mocked(Destination.findByIdAndUpdate).mockImplementation(mockFindByIdAndUpdate);

      const statusUpdate = { status: 'published' };
      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(statusUpdate)
      });
      await PUT(request, { params: { id: validDestinationId } });

      expect(capturedUpdateData.publishedAt).toBeInstanceOf(Date);
      expect(capturedUpdateData.scheduledPublishAt).toBeUndefined();
    });

    it('should handle scheduled publishing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findOne).mockResolvedValue(null);
      
      let capturedUpdateData: any;
      const mockFindByIdAndUpdate = vi.fn().mockImplementation((id, data) => {
        capturedUpdateData = data;
        const mockPopulateChain = {
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              populate: vi.fn().mockResolvedValue(mockDestination)
            })
          })
        };
        return mockPopulateChain;
      });
      
      vi.mocked(Destination.findByIdAndUpdate).mockImplementation(mockFindByIdAndUpdate);

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const scheduleUpdate = { scheduledPublishAt: futureDate.toISOString() };
      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(scheduleUpdate)
      });
      await PUT(request, { params: { id: validDestinationId } });

      expect(capturedUpdateData.status).toBe('draft');
      expect(capturedUpdateData.publishedAt).toBeUndefined();
    });

    it('should return 400 for past scheduled publish date', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const scheduleUpdate = { scheduledPublishAt: pastDate.toISOString() };
      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(scheduleUpdate)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Scheduled publish date must be in the future');
    });

    it('should handle validation errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findOne).mockResolvedValue(null);
      
      const validationError = {
        name: 'ValidationError',
        errors: {
          name: { path: 'name', message: 'Name is too short' }
        }
      };
      
      const mockPopulateChain = {
        populate: vi.fn().mockRejectedValue(validationError)
      };
      const mockFindByIdAndUpdate = vi.fn().mockReturnValue(mockPopulateChain);
      vi.mocked(Destination.findByIdAndUpdate).mockImplementation(mockFindByIdAndUpdate);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      const response = await PUT(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.validationErrors).toHaveLength(1);
    });
  });

  describe('DELETE /api/admin/destinations/[id]', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 for invalid destination ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${invalidDestinationId}`);
      const response = await DELETE(request, { params: { id: invalidDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid destination ID');
    });

    it('should return 404 when destination is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });

    it('should return 409 when trying to delete published destination without force', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const publishedDestination = { ...mockDestination, status: 'published' };
      vi.mocked(Destination.findById).mockResolvedValue(publishedDestination);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Cannot delete published destination');
    });

    it('should delete published destination with force parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      const publishedDestination = { ...mockDestination, status: 'published' };
      vi.mocked(Destination.findById).mockResolvedValue(publishedDestination);
      vi.mocked(Destination.findByIdAndDelete).mockResolvedValue(publishedDestination);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}?force=true`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Destination deleted successfully');
      expect(data.deletedDestination.name).toBe(publishedDestination.name);
    });

    it('should delete draft destination successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findByIdAndDelete).mockResolvedValue(mockDestination);

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Destination deleted successfully');
      expect(data.deletedDestination.name).toBe(mockDestination.name);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findById).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3000/api/admin/destinations/${validDestinationId}`);
      const response = await DELETE(request, { params: { id: validDestinationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete destination');
    });
  });
});