import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { Types } from 'mongoose';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Destination');

const mockGetServerSession = vi.mocked(getServerSession);
const mockConnectToDatabase = vi.mocked(connectToDatabase);
const mockDestination = vi.mocked(Destination, true);

describe('/api/admin/destinations/bulk', () => {
  const mockSession = {
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'admin@example.com',
      role: 'admin'
    }
  };

  const mockDestinationIds = [
    '507f1f77bcf86cd799439012',
    '507f1f77bcf86cd799439013'
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  describe('Authentication and Authorization', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('returns 400 when action is missing', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request. Action and destinationIds are required.');
    });

    it('returns 400 when destinationIds is missing', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request. Action and destinationIds are required.');
    });

    it('returns 400 when destinationIds is empty array', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: []
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request. Action and destinationIds are required.');
    });

    it('returns 400 when action is invalid', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid-action',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action. Must be one of: publish, unpublish, delete');
    });

    it('returns 400 when destinationIds contains invalid ObjectIds', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: ['invalid-id', mockDestinationIds[0]]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid destination IDs provided');
    });
  });

  describe('Publish Operation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('successfully publishes destinations', async () => {
      mockDestination.updateMany.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2,
        acknowledged: true,
        upsertedCount: 0,
        upsertedId: null
      });

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Successfully published 2 destination(s)');
      expect(data.count).toBe(2);
      expect(data.action).toBe('publish');

      expect(mockDestination.updateMany).toHaveBeenCalledWith(
        { _id: { $in: expect.any(Array) } },
        {
          status: 'published',
          publishedAt: expect.any(Date),
          lastModifiedBy: new Types.ObjectId(mockSession.user.id)
        }
      );
    });
  });

  describe('Unpublish Operation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('successfully unpublishes destinations', async () => {
      mockDestination.updateMany.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2,
        acknowledged: true,
        upsertedCount: 0,
        upsertedId: null
      });

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'unpublish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Successfully unpublished 2 destination(s)');
      expect(data.count).toBe(2);
      expect(data.action).toBe('unpublish');

      expect(mockDestination.updateMany).toHaveBeenCalledWith(
        { _id: { $in: expect.any(Array) } },
        {
          status: 'draft',
          publishedAt: null,
          lastModifiedBy: new Types.ObjectId(mockSession.user.id)
        }
      );
    });
  });

  describe('Delete Operation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('successfully deletes draft destinations', async () => {
      // Mock no published destinations found
      const mockQuery = {
        select: vi.fn().mockResolvedValue([])
      };
      mockDestination.find.mockReturnValue(mockQuery);
      
      mockDestination.deleteMany.mockResolvedValue({
        deletedCount: 2,
        acknowledged: true
      });

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Successfully deleted 2 destination(s)');
      expect(data.count).toBe(2);
      expect(data.action).toBe('delete');

      expect(mockDestination.find).toHaveBeenCalledWith({
        _id: { $in: expect.any(Array) },
        status: 'published'
      });

      expect(mockDestination.deleteMany).toHaveBeenCalledWith({
        _id: { $in: expect.any(Array) }
      });
    });

    it('prevents deletion of published destinations', async () => {
      // Mock published destinations found
      const mockQuery = {
        select: vi.fn().mockResolvedValue([
          { name: 'Benidorm' },
          { name: 'Albufeira' }
        ])
      };
      mockDestination.find.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete published destinations. Please unpublish them first.');
      expect(data.publishedDestinations).toEqual(['Benidorm', 'Albufeira']);

      expect(mockDestination.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('handles database connection errors', async () => {
      mockConnectToDatabase.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform bulk operation');
    });

    it('handles database operation errors', async () => {
      mockDestination.updateMany.mockRejectedValue(new Error('Database operation failed'));

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform bulk operation');
    });

    it('handles malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform bulk operation');
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      // Mock console.log to verify audit logging
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs bulk operations for audit purposes', async () => {
      mockDestination.updateMany.mockResolvedValue({
        modifiedCount: 2,
        matchedCount: 2,
        acknowledged: true,
        upsertedCount: 0,
        upsertedId: null
      });

      const request = new NextRequest('http://localhost/api/admin/destinations/bulk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'publish',
          destinationIds: mockDestinationIds
        })
      });

      await POST(request);

      expect(console.log).toHaveBeenCalledWith(
        'Bulk publish operation performed by admin@example.com on 2 destinations'
      );
    });
  });
});