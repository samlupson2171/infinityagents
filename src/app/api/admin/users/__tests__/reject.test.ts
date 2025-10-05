import { NextRequest } from 'next/server';
import { POST } from '../reject/route';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendRejectionNotificationEmail } from '@/lib/email';
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
const mockUserFindByIdAndDelete = User.findByIdAndDelete as jest.MockedFunction<
  typeof User.findByIdAndDelete
>;
const mockSendRejectionEmail =
  sendRejectionNotificationEmail as jest.MockedFunction<
    typeof sendRejectionNotificationEmail
  >;

describe('/api/admin/users/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockSendRejectionEmail.mockResolvedValue(undefined as any);
    mockUserFindByIdAndDelete.mockResolvedValue({} as any);
  });

  describe('POST', () => {
    it('should reject a pending user successfully', async () => {
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
      };
      mockUserFindById.mockResolvedValue(mockUser as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/reject',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-id',
            reason: 'Invalid ABTA number',
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-id');
      expect(mockSendRejectionEmail).toHaveBeenCalledWith({
        userName: 'John Doe',
        userEmail: 'john@test.com',
        companyName: 'Test Company',
        reason: 'Invalid ABTA number',
      });
      expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith('user-id');
    });

    it('should reject user without reason', async () => {
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
      };
      mockUserFindById.mockResolvedValue(mockUser as any);

      const request = new NextRequest(
        'http://localhost/api/admin/users/reject',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSendRejectionEmail).toHaveBeenCalledWith({
        userName: 'John Doe',
        userEmail: 'john@test.com',
        companyName: 'Test Company',
        reason: undefined,
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
        'http://localhost/api/admin/users/reject',
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
        'http://localhost/api/admin/users/reject',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CANNOT_REJECT_APPROVED');
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const request = new NextRequest(
        'http://localhost/api/admin/users/reject',
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

    it('should still reject user even if email fails', async () => {
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
      };
      mockUserFindById.mockResolvedValue(mockUser as any);
      mockSendRejectionEmail.mockRejectedValue(new Error('Email service down'));

      const request = new NextRequest(
        'http://localhost/api/admin/users/reject',
        {
          method: 'POST',
          body: JSON.stringify({ userId: 'user-id' }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith('user-id');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost/api/admin/users/reject',
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
        'http://localhost/api/admin/users/reject',
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
