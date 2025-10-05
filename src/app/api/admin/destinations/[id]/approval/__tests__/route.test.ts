import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, PUT } from '../route';
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

describe('/api/admin/destinations/[id]/approval', () => {
  const mockAdminSession = {
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'admin@test.com',
      role: 'admin'
    }
  };

  const mockUserSession = {
    user: {
      id: '507f1f77bcf86cd799439013',
      email: 'user@test.com',
      role: 'user'
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
    requestApproval: vi.fn(),
    approveContent: vi.fn(),
    rejectContent: vi.fn(),
    populate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/destinations/[id]/approval', () => {
    it('should request approval successfully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      
      const updatedDestination = { 
        ...mockDestinationData, 
        approvalWorkflow: {
          isRequired: true,
          status: 'pending',
          requestedBy: mockUserSession.user.id,
          requestedAt: new Date()
        }
      };
      mockDestinationData.requestApproval.mockResolvedValue(updatedDestination);
      mockDestinationData.populate.mockResolvedValue(updatedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'POST',
        body: JSON.stringify({ comment: 'Please review the new content' })
      });

      // Act
      const response = await POST(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Approval requested successfully');
      expect(mockDestinationData.requestApproval).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        'Please review the new content'
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
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

    it('should return 404 for non-existent destination', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockDestination.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
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

  describe('PUT /api/admin/destinations/[id]/approval', () => {
    it('should approve content successfully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const pendingDestination = {
        ...mockDestinationData,
        approvalWorkflow: {
          isRequired: true,
          status: 'pending',
          requestedBy: mockUserSession.user.id,
          requestedAt: new Date()
        }
      };
      mockDestination.findById.mockResolvedValue(pendingDestination);
      
      const approvedDestination = { 
        ...pendingDestination, 
        approvalWorkflow: {
          ...pendingDestination.approvalWorkflow,
          status: 'approved',
          reviewedBy: mockAdminSession.user.id,
          reviewedAt: new Date()
        }
      };
      pendingDestination.approveContent = vi.fn().mockResolvedValue(approvedDestination);
      pendingDestination.populate = vi.fn().mockResolvedValue(approvedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'PUT',
        body: JSON.stringify({ 
          action: 'approve',
          comment: 'Content looks good, approved for publishing' 
        })
      });

      // Act
      const response = await PUT(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Content approved successfully');
      expect(pendingDestination.approveContent).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        'Content looks good, approved for publishing'
      );
    });

    it('should reject content successfully', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const pendingDestination = {
        ...mockDestinationData,
        approvalWorkflow: {
          isRequired: true,
          status: 'pending',
          requestedBy: mockUserSession.user.id,
          requestedAt: new Date()
        }
      };
      mockDestination.findById.mockResolvedValue(pendingDestination);
      
      const rejectedDestination = { 
        ...pendingDestination, 
        approvalWorkflow: {
          ...pendingDestination.approvalWorkflow,
          status: 'rejected',
          reviewedBy: mockAdminSession.user.id,
          reviewedAt: new Date()
        }
      };
      pendingDestination.rejectContent = vi.fn().mockResolvedValue(rejectedDestination);
      pendingDestination.populate = vi.fn().mockResolvedValue(rejectedDestination);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'PUT',
        body: JSON.stringify({ 
          action: 'reject',
          comment: 'Please update the accommodation section with more details' 
        })
      });

      // Act
      const response = await PUT(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Content rejected successfully');
      expect(pendingDestination.rejectContent).toHaveBeenCalledWith(
        expect.any(Object), // ObjectId
        'Please update the accommodation section with more details'
      );
    });

    it('should return 403 for non-admin users trying to approve/reject', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'PUT',
        body: JSON.stringify({ action: 'approve' })
      });

      // Act
      const response = await PUT(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(result.error).toBe('Admin access required to approve/reject content');
    });

    it('should return 400 for invalid action', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockDestination.findById.mockResolvedValue({
        ...mockDestinationData,
        approvalWorkflow: { status: 'pending' }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'PUT',
        body: JSON.stringify({ action: 'invalid' })
      });

      // Act
      const response = await PUT(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toBe('Action must be either "approve" or "reject"');
    });

    it('should return 400 when no pending approval exists', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockDestination.findById.mockResolvedValue({
        ...mockDestinationData,
        approvalWorkflow: { status: 'not_required' }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/507f1f77bcf86cd799439012/approval', {
        method: 'PUT',
        body: JSON.stringify({ action: 'approve' })
      });

      // Act
      const response = await PUT(request, { params: { id: '507f1f77bcf86cd799439012' } });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toBe('No pending approval request found');
    });
  });
});