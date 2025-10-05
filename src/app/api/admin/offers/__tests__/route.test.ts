import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Offer');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockOfferFind = Offer.find as jest.MockedFunction<typeof Offer.find>;
const mockOfferCountDocuments = Offer.countDocuments as jest.MockedFunction<
  typeof Offer.countDocuments
>;

// Mock Offer constructor
const mockOfferSave = jest.fn();
const mockOfferPopulate = jest.fn();
const MockOffer = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockOfferSave,
  populate: mockOfferPopulate,
}));
(Offer as any) = MockOffer;

describe('/api/admin/offers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockOfferSave.mockResolvedValue(true);
    mockOfferPopulate.mockResolvedValue(true);
  });

  describe('POST', () => {
    it('should create offer successfully', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const offerData = {
        title: 'Summer Special',
        description: 'Amazing summer deals for travel agencies',
        inclusions: ['Accommodation', 'Breakfast', 'Airport Transfer'],
        isActive: true,
      };

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(offerData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(MockOffer).toHaveBeenCalledWith({
        ...offerData,
        createdBy: 'admin-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockOfferSave).toHaveBeenCalled();
      expect(mockOfferPopulate).toHaveBeenCalledWith(
        'createdBy',
        'name contactEmail'
      );
    });

    it('should create offer with default isActive true', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const offerData = {
        title: 'Winter Package',
        description: 'Great winter offers',
        inclusions: ['Accommodation', 'Dinner'],
        // isActive not specified, should default to true
      };

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(offerData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(MockOffer).toHaveBeenCalledWith({
        ...offerData,
        isActive: true,
        createdBy: 'admin-id',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const invalidData = {
        title: '', // Empty title
        description: 'Valid description',
        inclusions: [], // Empty inclusions array
      };

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const incompleteData = {
        title: 'Valid Title',
        // Missing description and inclusions
      };

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Offer',
          description: 'Test Description',
          inclusions: ['Test Inclusion'],
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost/api/admin/offers', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Offer',
          description: 'Test Description',
          inclusions: ['Test Inclusion'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET', () => {
    it('should return all offers for admin', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock offers
      const mockOffers = [
        {
          _id: 'offer1',
          title: 'Summer Special',
          description: 'Amazing summer deals',
          inclusions: ['Accommodation', 'Breakfast'],
          isActive: true,
          createdAt: new Date(),
          createdBy: { name: 'Admin User', contactEmail: 'admin@test.com' },
        },
        {
          _id: 'offer2',
          title: 'Winter Package',
          description: 'Great winter offers',
          inclusions: ['Accommodation', 'Dinner'],
          isActive: false,
          createdAt: new Date(),
          createdBy: { name: 'Admin User', contactEmail: 'admin@test.com' },
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(2);

      const request = new NextRequest('http://localhost/api/admin/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.offers).toEqual(mockOffers);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalOffers: 2,
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(mockOfferFind).toHaveBeenCalledWith({});
    });

    it('should filter offers by status', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/offers?status=active'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockOfferFind).toHaveBeenCalledWith({ isActive: true });
      expect(mockOfferCountDocuments).toHaveBeenCalledWith({ isActive: true });
    });

    it('should filter offers by inactive status', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/offers?status=inactive'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockOfferFind).toHaveBeenCalledWith({ isActive: false });
      expect(mockOfferCountDocuments).toHaveBeenCalledWith({ isActive: false });
    });

    it('should handle search functionality', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/offers?search=summer'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockOfferFind).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'summer', $options: 'i' } },
          { description: { $regex: 'summer', $options: 'i' } },
          { inclusions: { $elemMatch: { $regex: 'summer', $options: 'i' } } },
        ],
      });
    });

    it('should handle pagination correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/admin/offers?page=3&limit=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 3,
        totalPages: 5,
        totalOffers: 25,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/offers');
      const response = await GET(request);
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

      const request = new NextRequest('http://localhost/api/admin/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
