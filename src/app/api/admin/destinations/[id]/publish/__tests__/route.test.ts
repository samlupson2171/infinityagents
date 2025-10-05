import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Destination');

const mockGetServerSession = vi.mocked(getServerSession);
const mockConnectToDatabase = vi.mocked(connectToDatabase);
const mockDestination = vi.mocked(Destination);

describe('/api/admin/destinations/[id]/publish', () => {
  const mockSession = {
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'admin@test.com',
      role: 'admin'
    }
  };

  const mockDestinationData = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Destination',
    slug: 'test-destination',
    status: 'draft',
    approvalWorkflow: {
      isRequired: false,
      status: 'not_required'
    },
    publish: vi.fn(),
    unpublish: vi.fn(),
    populate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/destinations/[id]/publish', () => {
    it('should publish a destination successfully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      
      const publishedDestination = { 
        ...mockDestinationData, 
        status: 'published',
        publishedAt: new Date()
      };
      mockDestinationData.publish.mockResolvedValue(publishedDestination);
      mockDestinationData.populate.mockResolvedValue(publishedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'POST',
        body: JSON.stringify({ comment: 'Publishing for launch' })
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Destination published successfully');
      expect(mockDestinationData.publish).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        'Publishing for launch'
      );
    });

    it('should reject publishing if approval is required but not approved', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockSession);
      const destinationWithApproval = {
        ...mockDestinationData,
        approvalWorkflow: {
          isRequired: true,
          status: 'pending'
        }
      };
      mockDestination.findById.mockResolvedValue(destinationWithApproval);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'POST',
        body: JSON.stringify({})
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBe('Content must be approved before publishing');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'POST',
        body: JSON.stringify({})
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    it('should return 403 for non-admin users', async () => {
      // Arrange
      const nonAdminSession = {
        user: {
          id: '507f1f77bcf86cd799439011',
          email: 'user@test.com',
          role: 'user'
        }
      };
      mockGetServerSession.mockResolvedValue(nonAdminSession);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'POST',
        body: JSON.stringify({})
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBe('Admin access required');
    });

    it('should return 404 for non-existent destination', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockSession);
      mockDestination.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'POST',
        body: JSON.stringify({})
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result.error).toBe('Destination not found');
    });
  });

  describe('DELETE /api/admin/destinations/[id]/publish', () => {
    it('should unpublish a destination successfully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockSession);
      const publishedDestination = {
        ...mockDestinationData,
        status: 'published',
        publishedAt: new Date()
      };
      mockDestination.findById.mockResolvedValue(publishedDestination);
      
      const unpublishedDestination = { 
        ...publishedDestination, 
        status: 'draft',
        publishedAt: undefined
      };
      publishedDestination.unpublish = vi.fn().mockResolvedValue(unpublishedDestination);
      publishedDestination.populate = vi.fn().mockResolvedValue(unpublishedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'DELETE',
        body: JSON.stringify({ comment: 'Unpublishing for updates' })
      });

      // Act
      const response = await DELETE(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Destination unpublished successfully');
      expect(publishedDestination.unpublish).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        'Unpublishing for updates'
      );
    });

    it('should handle unpublish errors gracefully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockSession);
      const publishedDestination = {
        ...mockDestinationData,
        status: 'published',
        unpublish: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      mockDestination.findById.mockResolvedValue(publishedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/publish', {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      // Act
      const response = await DELETE(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to unpublish destination');
    });
  });
});