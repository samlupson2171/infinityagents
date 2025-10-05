import { NextRequest } from 'next/server';
import { POST } from '../approve/route';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendApprovalNotificationEmail } from '@/lib/email';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('@/lib/email');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockUserFindById = User.findById as jest.MockedFunction<
  typeof User.findById
>;
const mockSendApprovalEmail =
  sendApprovalNotificationEmail as jest.MockedFunction<
    typeof sendApprovalNotificationEmail
  >;

describe('/api/admin/users/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockSendApprovalEmail.mockResolvedValue(undefined as any);
  });

  describe('POST', () => {
    it('should approve a pending user successfully', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock pending user
      const mockUser = {
        _id: 'user-id',
        name: 'John Doe',
        companyName: 'Test Company',
        contactEmail: 'john@test.com',
        isApproved: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserFindById.mockResolvedValue(mockUser as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-id');
      expect(mockUser.isApproved).toBe(true);
      expect(mockUser.approvedBy).toBe('admin-id');
      expect(mockUser.approvedAt).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockSendApprovalEmail).toHaveBeenCalledWith({
        userName: 'John Doe',
        userEmail: 'john@test.com',
        companyName: 'Test Company',
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockUserFindById.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'non-existent-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for already approved user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockUser = {
        _id: 'user-id',
        isApproved: true,
      };
      mockUserFindById.mockResolvedValue(mockUser as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ALREADY_APPROVED');
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ invalidField: 'value' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should still approve user even if email fails', async () => {
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
        isApproved: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserFindById.mockResolvedValue(mockUser as any);
      mockSendApprovalEmail.mockRejectedValue(new Error('Email service down'));

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

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

      const request = new NextRequest(
        'http://localhost/api/admin/users/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
