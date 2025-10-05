import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { getServerSession } from 'next-auth';
import Destination from '@/models/Destination';
import { connectToDatabase } from '@/lib/mongodb';
import { Types } from 'mongoose';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/models/Destination');
vi.mock('@/lib/mongodb');

const mockGetServerSession = vi.mocked(getServerSession);
const mockDestination = vi.mocked(Destination);
const mockConnectToDatabase = vi.mocked(connectToDatabase);

describe('/api/admin/destinations/[id]/auto-save', () => {
  const validObjectId = new Types.ObjectId().toString();
  const mockDestinationData = {
    _id: validObjectId,
    name: 'Benidorm',
    country: 'Spain',
    region: 'Costa Blanca',
    description: 'A vibrant coastal resort town',
    slug: 'benidorm',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/destinations/123/auto-save', {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: '123' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', role: 'user' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/123/auto-save', {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: '123' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 for invalid destination ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/invalid-id/auto-save', {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: 'invalid-id' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid destination ID');
    });

    it('should return 404 if destination not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Destination not found');
    });

    it('should successfully auto-save destination changes', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      
      const updatedDestination = {
        ...mockDestinationData,
        name: 'Updated Benidorm',
        updatedAt: new Date(),
      };
      mockDestination.findByIdAndUpdate.mockResolvedValue(updatedDestination);

      const updateData = {
        name: 'Updated Benidorm',
        country: 'Spain',
        region: 'Costa Blanca',
        description: 'An updated description of this vibrant coastal resort town',
        slug: 'updated-benidorm',
      };

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Auto-save successful');
      expect(data.destination).toEqual(updatedDestination);
      expect(data.savedAt).toBeDefined();

      expect(mockDestination.findByIdAndUpdate).toHaveBeenCalledWith(
        validObjectId,
        {
          name: 'Updated Benidorm',
          country: 'Spain',
          region: 'Costa Blanca',
          description: 'An updated description of this vibrant coastal resort town',
          slug: 'updated-benidorm',
          lastModifiedBy: new Types.ObjectId(adminId),
        },
        {
          new: true,
          runValidators: true,
        }
      );
    });

    it('should return 409 if slug conflicts with existing destination', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      
      // Mock conflicting destination
      mockDestination.findOne.mockResolvedValue({ _id: 'other-id', slug: 'conflicting-slug' });

      const updateData = {
        ...mockDestinationData,
        slug: 'conflicting-slug',
      };

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('A destination with this slug already exists');

      expect(mockDestination.findOne).toHaveBeenCalledWith({
        slug: 'conflicting-slug',
        _id: { $ne: validObjectId }
      });
    });

    it('should allow same slug for same destination', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      mockDestination.findOne.mockResolvedValue(null); // No conflict
      
      const updatedDestination = { ...mockDestinationData, updatedAt: new Date() };
      mockDestination.findByIdAndUpdate.mockResolvedValue(updatedDestination);

      const updateData = {
        ...mockDestinationData,
        slug: 'benidorm', // Same slug as existing
      };

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Auto-save successful');
    });

    it('should handle validation errors', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      mockDestination.findOne.mockResolvedValue(null);

      // Mock validation error
      const validationError = {
        name: 'ValidationError',
        errors: {
          name: { path: 'name', message: 'Name is required' }
        }
      };
      mockDestination.findByIdAndUpdate.mockRejectedValue(validationError);

      const updateData = {
        name: '', // Invalid empty name
        country: 'Spain',
        region: 'Costa Blanca',
        description: 'A description',
        slug: 'test-slug',
      };

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.validationErrors).toEqual([
        { field: 'name', message: 'Name is required' }
      ]);
    });

    it('should handle database errors', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      mockDestination.findOne.mockResolvedValue(null);
      mockDestination.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Auto-save failed');
    });

    it('should only update basic fields in auto-save', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      mockDestination.findOne.mockResolvedValue(null);
      mockDestination.findByIdAndUpdate.mockResolvedValue(mockDestinationData);

      const updateData = {
        name: 'Updated Name',
        country: 'Updated Country',
        region: 'Updated Region',
        description: 'Updated description',
        slug: 'updated-slug',
        // These should be ignored in auto-save
        status: 'published',
        publishedAt: new Date(),
        sections: { overview: { title: 'Test' } },
      };

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(200);

      // Verify only basic fields are updated
      expect(mockDestination.findByIdAndUpdate).toHaveBeenCalledWith(
        validObjectId,
        {
          name: 'Updated Name',
          country: 'Updated Country',
          region: 'Updated Region',
          description: 'Updated description',
          slug: 'updated-slug',
          lastModifiedBy: new Types.ObjectId(adminId),
        },
        {
          new: true,
          runValidators: true,
        }
      );
    });

    it('should return only selected fields in response', async () => {
      const adminId = new Types.ObjectId().toString();
      mockGetServerSession.mockResolvedValue({
        user: { id: adminId, role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findById.mockResolvedValue(mockDestinationData);
      mockDestination.findOne.mockResolvedValue(null);

      const mockSelect = vi.fn().mockResolvedValue(mockDestinationData);
      mockDestination.findByIdAndUpdate.mockReturnValue({ select: mockSelect } as any);

      const request = new NextRequest(`http://localhost/api/admin/destinations/${validObjectId}/auto-save`, {
        method: 'PATCH',
        body: JSON.stringify(mockDestinationData),
      });

      const response = await PATCH(request, { params: { id: validObjectId } });

      expect(response.status).toBe(200);
      expect(mockSelect).toHaveBeenCalledWith('name country region description slug updatedAt');
    });
  });
});