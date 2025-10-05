import { NextRequest } from 'next/server';
import { PUT, GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockUserFindById = User.findById as jest.MockedFunction<
  typeof User.findById
>;

describe('/api/admin/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('PUT', () => {
    it('should update user successfully', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock user
      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        companyName: 'Test Company',
        contactEmail: 'john@test.com',
        isApproved: false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockUpdatedUser = {
        ...mockUser,
        isApproved: true,
        approvedBy: 'admin-id',
        approvedAt: expect.any(Date),
      };

      mockUserFindById
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({
          ...mockUpdatedUser,
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue(mockUpdatedUser),
        } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: true }),
        }
      );

      const response = await PUT(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.isApproved).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should update user name and company', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        companyName: 'Test Company',
        contactEmail: 'john@test.com',
        isApproved: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserFindById
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({
          ...mockUser,
          name: 'John Smith',
          companyName: 'New Company',
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue({
            ...mockUser,
            name: 'John Smith',
            companyName: 'New Company',
          }),
        } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            name: 'John Smith',
            companyName: 'New Company',
          }),
        }
      );

      const response = await PUT(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.name).toBe('John Smith');
      expect(mockUser.companyName).toBe('New Company');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should handle approval status changes correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Test approving a user
      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        isApproved: false,
        approvedBy: undefined,
        approvedAt: undefined,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserFindById
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({
          ...mockUser,
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue(mockUser),
        } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: true }),
        }
      );

      await PUT(request, { params: { id: 'user-id' } });

      expect(mockUser.isApproved).toBe(true);
      expect(mockUser.approvedBy).toBe('admin-id');
      expect(mockUser.approvedAt).toBeInstanceOf(Date);
    });

    it('should handle disapproval correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Test disapproving a user
      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        isApproved: true,
        approvedBy: 'admin-id',
        approvedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserFindById
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({
          ...mockUser,
          select: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue(mockUser),
        } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: false }),
        }
      );

      await PUT(request, { params: { id: 'user-id' } });

      expect(mockUser.isApproved).toBe(false);
      expect(mockUser.approvedBy).toBeUndefined();
      expect(mockUser.approvedAt).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockUserFindById.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/non-existent',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: true }),
        }
      );

      const response = await PUT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({
            contactEmail: 'invalid-email',
            role: 'invalid-role',
          }),
        }
      );

      const response = await PUT(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: true }),
        }
      );

      const response = await PUT(request, { params: { id: 'user-id' } });
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
        'http://localhost/api/admin/users/user-id',
        {
          method: 'PUT',
          body: JSON.stringify({ isApproved: true }),
        }
      );

      const response = await PUT(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET', () => {
    it('should fetch user successfully', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        companyName: 'Test Company',
        contactEmail: 'john@test.com',
        isApproved: true,
      };

      mockUserFindById.mockResolvedValue({
        ...mockUser,
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id'
      );
      const response = await GET(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUser);
    });

    it('should return 404 for non-existent user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockUserFindById.mockResolvedValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/non-existent'
      );
      const response = await GET(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/user-id'
      );
      const response = await GET(request, { params: { id: 'user-id' } });
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
        'http://localhost/api/admin/users/user-id'
      );
      const response = await GET(request, { params: { id: 'user-id' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
