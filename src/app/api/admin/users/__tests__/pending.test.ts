import { NextRequest } from 'next/server';
import { GET } from '../pending/route';
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

describe('/api/admin/users/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('should return pending users for admin', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock pending users
      const mockPendingUsers = [
        {
          _id: 'user1',
          name: 'John Doe',
          companyName: 'Test Company',
          contactEmail: 'john@test.com',
          abtaPtsNumber: 'ABTA1234',
          websiteAddress: 'https://test.com',
          isApproved: false,
          createdAt: new Date(),
        },
        {
          _id: 'user2',
          name: 'Jane Smith',
          companyName: 'Another Company',
          contactEmail: 'jane@another.com',
          abtaPtsNumber: 'PTS5678',
          websiteAddress: 'https://another.com',
          isApproved: false,
          createdAt: new Date(),
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockPendingUsers),
      };
      mockUserFind.mockReturnValue(mockQuery as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/pending'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPendingUsers);
      expect(mockUserFind).toHaveBeenCalledWith({ isApproved: false });
      expect(mockQuery.select).toHaveBeenCalledWith('-password');
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/pending'
      );
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

      const request = new NextRequest(
        'http://localhost/api/admin/users/pending'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 403 for unapproved admin', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: false,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/users/pending'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PENDING_APPROVAL');
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

      const request = new NextRequest(
        'http://localhost/api/admin/users/pending'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
