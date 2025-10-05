import { NextRequest } from 'next/server';
import { GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockUserFind = User.find as jest.MockedFunction<typeof User.find>;
const mockUserCountDocuments = User.countDocuments as jest.MockedFunction<
  typeof User.countDocuments
>;

describe('/api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('should return all users with pagination', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock users
      const mockUsers = [
        {
          _id: 'user1',
          name: 'John Doe',
          companyName: 'Test Company',
          contactEmail: 'john@test.com',
          isApproved: true,
          createdAt: new Date(),
        },
        {
          _id: 'user2',
          name: 'Jane Smith',
          companyName: 'Another Company',
          contactEmail: 'jane@another.com',
          isApproved: false,
          createdAt: new Date(),
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserFind.mockReturnValue(mockQuery as any);
      mockUserCountDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/admin/users?page=1&limit=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toEqual(mockUsers);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 3,
        totalUsers: 25,
        hasNextPage: true,
        hasPrevPage: false,
      });
      expect(mockQuery.select).toHaveBeenCalledWith('-password');
      expect(mockQuery.populate).toHaveBeenCalledWith(
        'approvedBy',
        'name contactEmail'
      );
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should filter approved users only', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockUsers = [
        {
          _id: 'user1',
          name: 'John Doe',
          isApproved: true,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserFind.mockReturnValue(mockQuery as any);
      mockUserCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/users?status=approved'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserFind).toHaveBeenCalledWith({ isApproved: true });
      expect(mockUserCountDocuments).toHaveBeenCalledWith({ isApproved: true });
    });

    it('should filter pending users only', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockUsers = [
        {
          _id: 'user2',
          name: 'Jane Smith',
          isApproved: false,
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };
      mockUserFind.mockReturnValue(mockQuery as any);
      mockUserCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/users?status=pending'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserFind).toHaveBeenCalledWith({ isApproved: false });
      expect(mockUserCountDocuments).toHaveBeenCalledWith({
        isApproved: false,
      });
    });

    it('should handle pagination correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockUserFind.mockReturnValue(mockQuery as any);
      mockUserCountDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/admin/users?page=3&limit=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 3,
        totalPages: 5,
        totalUsers: 25,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should use default pagination values', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockUserFind.mockReturnValue(mockQuery as any);
      mockUserCountDocuments.mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/users');
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

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle database errors', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockUserFind.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
