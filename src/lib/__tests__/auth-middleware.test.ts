import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  withAuth,
  requireAuth,
  requireAdmin,
  requireApprovedUser,
} from '../auth-middleware';

// Mock getToken from next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

import { getToken } from 'next-auth/jwt';

describe('Authentication Middleware', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/test');
  });

  describe('withAuth', () => {
    it('should return unauthorized error when no token', async () => {
      (getToken as any).mockResolvedValue(null);

      const result = await withAuth(mockRequest);

      expect(result).toBeTruthy();
      expect(result!.status).toBe(401);
      const body = await result!.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return pending approval error when user not approved', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: false,
      });

      const result = await withAuth(mockRequest);

      expect(result).toBeTruthy();
      expect(result!.status).toBe(403);
      const body = await result!.json();
      expect(body.error.code).toBe('PENDING_APPROVAL');
    });

    it('should return insufficient permissions error when role required but not met', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: true,
      });

      const result = await withAuth(mockRequest, 'admin');

      expect(result).toBeTruthy();
      expect(result!.status).toBe(403);
      const body = await result!.json();
      expect(body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return null when user is authenticated and approved', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: true,
      });

      const result = await withAuth(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when user is admin (admin can access any role)', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'admin',
        isApproved: true,
      });

      const result = await withAuth(mockRequest, 'agent');

      expect(result).toBeNull();
    });

    it('should return null when required role matches user role', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'admin',
        isApproved: true,
      });

      const result = await withAuth(mockRequest, 'admin');

      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should throw error when authentication fails', async () => {
      (getToken as any).mockResolvedValue(null);

      await expect(requireAuth(mockRequest)).rejects.toBeTruthy();
    });

    it('should return token when authentication succeeds', async () => {
      const mockToken = {
        sub: '123',
        role: 'agent',
        isApproved: true,
      };
      (getToken as any).mockResolvedValue(mockToken);

      const result = await requireAuth(mockRequest);

      expect(result).toEqual(mockToken);
    });

    it('should throw error when role requirement not met', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: true,
      });

      await expect(requireAuth(mockRequest, 'admin')).rejects.toBeTruthy();
    });
  });

  describe('requireAdmin', () => {
    it('should throw error when user is not admin', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: true,
      });

      await expect(requireAdmin(mockRequest)).rejects.toBeTruthy();
    });

    it('should return token when user is admin', async () => {
      const mockToken = {
        sub: '123',
        role: 'admin',
        isApproved: true,
      };
      (getToken as any).mockResolvedValue(mockToken);

      const result = await requireAdmin(mockRequest);

      expect(result).toEqual(mockToken);
    });
  });

  describe('requireApprovedUser', () => {
    it('should throw error when user is not approved', async () => {
      (getToken as any).mockResolvedValue({
        sub: '123',
        role: 'agent',
        isApproved: false,
      });

      await expect(requireApprovedUser(mockRequest)).rejects.toBeTruthy();
    });

    it('should return token when user is approved', async () => {
      const mockToken = {
        sub: '123',
        role: 'agent',
        isApproved: true,
      };
      (getToken as any).mockResolvedValue(mockToken);

      const result = await requireApprovedUser(mockRequest);

      expect(result).toEqual(mockToken);
    });
  });
});
