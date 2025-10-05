import { NextRequest } from 'next/server';
import { PUT, DELETE, GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Offer');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockOfferFindById = Offer.findById as jest.MockedFunction<
  typeof Offer.findById
>;
const mockOfferFindByIdAndDelete =
  Offer.findByIdAndDelete as jest.MockedFunction<
    typeof Offer.findByIdAndDelete
  >;

describe('/api/admin/offers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('PUT', () => {
    it('should update offer successfully', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock offer
      const mockOffer = {
        _id: 'offer-id',
        title: 'Old Title',
        description: 'Old Description',
        inclusions: ['Old Inclusion'],
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      mockOfferFindById.mockResolvedValue(mockOffer as any);

      const updateData = {
        title: 'New Title',
        description: 'New Description',
        inclusions: ['New Inclusion 1', 'New Inclusion 2'],
        isActive: false,
      };

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockOffer.title).toBe('New Title');
      expect(mockOffer.description).toBe('New Description');
      expect(mockOffer.inclusions).toEqual([
        'New Inclusion 1',
        'New Inclusion 2',
      ]);
      expect(mockOffer.isActive).toBe(false);
      expect(mockOffer.updatedAt).toBeInstanceOf(Date);
      expect(mockOffer.save).toHaveBeenCalled();
      expect(mockOffer.populate).toHaveBeenCalledWith(
        'createdBy',
        'name contactEmail'
      );
    });

    it('should update only specified fields', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockOffer = {
        _id: 'offer-id',
        title: 'Original Title',
        description: 'Original Description',
        inclusions: ['Original Inclusion'],
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      mockOfferFindById.mockResolvedValue(mockOffer as any);

      const updateData = {
        title: 'Updated Title',
        // Only updating title, other fields should remain unchanged
      };

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockOffer.title).toBe('Updated Title');
      expect(mockOffer.description).toBe('Original Description'); // Unchanged
      expect(mockOffer.inclusions).toEqual(['Original Inclusion']); // Unchanged
      expect(mockOffer.isActive).toBe(true); // Unchanged
    });

    it('should return 404 for non-existent offer', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockOfferFindById.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/non-existent',
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'New Title' }),
        }
      );

      const response = await PUT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('OFFER_NOT_FOUND');
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            title: '', // Empty title
            inclusions: [], // Empty inclusions
          }),
        }
      );

      const response = await PUT(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'New Title' }),
        }
      );

      const response = await PUT(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for non-admin user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'PUT',
          body: JSON.stringify({ title: 'New Title' }),
        }
      );

      const response = await PUT(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('DELETE', () => {
    it('should delete offer successfully', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockOffer = {
        _id: 'offer-id',
        title: 'Test Offer',
      };

      mockOfferFindByIdAndDelete.mockResolvedValue(mockOffer as any);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.offerId).toBe('offer-id');
      expect(data.data.message).toBe('Offer deleted successfully');
      expect(mockOfferFindByIdAndDelete).toHaveBeenCalledWith('offer-id');
    });

    it('should return 404 for non-existent offer', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockOfferFindByIdAndDelete.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/non-existent',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, {
        params: { id: 'non-existent' },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('OFFER_NOT_FOUND');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for non-admin user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id',
        {
          method: 'DELETE',
        }
      );

      const response = await DELETE(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET', () => {
    it('should fetch offer successfully', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockOffer = {
        _id: 'offer-id',
        title: 'Test Offer',
        description: 'Test Description',
        inclusions: ['Test Inclusion'],
        isActive: true,
        createdBy: { name: 'Admin User', contactEmail: 'admin@test.com' },
      };

      mockOfferFindById.mockResolvedValue({
        ...mockOffer,
        populate: jest.fn().mockResolvedValue(mockOffer),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id'
      );
      const response = await GET(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockOffer);
    });

    it('should return 404 for non-existent offer', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockOfferFindById.mockResolvedValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/non-existent'
      );
      const response = await GET(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('OFFER_NOT_FOUND');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id'
      );
      const response = await GET(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for non-admin user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/offers/offer-id'
      );
      const response = await GET(request, { params: { id: 'offer-id' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
