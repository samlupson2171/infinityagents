import { NextRequest } from 'next/server';
import { GET } from '../route';
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

describe('/api/offers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('should return active offers for approved users', async () => {
      // Mock approved user token
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
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
          createdBy: { name: 'Admin User' },
        },
        {
          _id: 'offer2',
          title: 'Winter Package',
          description: 'Great winter offers',
          inclusions: ['Accommodation', 'Dinner'],
          isActive: true,
          createdAt: new Date(),
          createdBy: { name: 'Admin User' },
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

      const request = new NextRequest('http://localhost/api/offers');
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
      expect(mockOfferFind).toHaveBeenCalledWith({ isActive: true });
    });

    it('should handle pagination correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
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
        'http://localhost/api/offers?page=3&limit=5'
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

    it('should handle search functionality', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
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
        'http://localhost/api/offers?search=summer'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockOfferFind).toHaveBeenCalledWith({
        isActive: true,
        $or: [
          { title: { $regex: 'summer', $options: 'i' } },
          { description: { $regex: 'summer', $options: 'i' } },
          { inclusions: { $elemMatch: { $regex: 'summer', $options: 'i' } } },
        ],
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for unapproved user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: false,
      });

      const request = new NextRequest('http://localhost/api/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PENDING_APPROVAL');
    });

    it('should handle database errors', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      mockOfferFind.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should use default pagination values', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockOfferFind.mockReturnValue(mockQuery as any);
      mockOfferCountDocuments.mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/offers');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });
});
