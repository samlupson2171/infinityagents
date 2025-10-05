import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/auth-middleware';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

const mockGetServerSession = getServerSession as Mock;

// Mock session data
const mockUserSession = {
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
    name: 'Test User',
    role: 'agent',
  },
  expires: '2025-12-31T23:59:59.999Z',
};

const mockAdminSession = {
  user: {
    id: '507f1f77bcf86cd799439012',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin',
  },
  expires: '2025-12-31T23:59:59.999Z',
};

describe('Authentication and Authorization Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    it('should pass for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost/api/test');

      // Should not throw
      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should pass for authenticated admin', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost/api/test');

      // Should not throw
      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should throw for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Unauthorized');
    });

    it('should throw for session without user', async () => {
      mockGetServerSession.mockResolvedValue({
        expires: '2025-12-31T23:59:59.999Z',
      });

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Unauthorized');
    });

    it('should throw for expired session', async () => {
      const expiredSession = {
        ...mockUserSession,
        expires: '2020-01-01T00:00:00.000Z', // Expired
      };
      mockGetServerSession.mockResolvedValue(expiredSession);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Session expired');
    });

    it('should handle session without expires field', async () => {
      const sessionWithoutExpires = {
        user: mockUserSession.user,
        // No expires field
      };
      mockGetServerSession.mockResolvedValue(sessionWithoutExpires);

      const request = new NextRequest('http://localhost/api/test');

      // Should pass if user exists, even without expires
      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should handle getServerSession errors', async () => {
      mockGetServerSession.mockRejectedValue(
        new Error('Session service error')
      );

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow(
        'Session service error'
      );
    });
  });

  describe('requireAdmin middleware', () => {
    it('should pass for authenticated admin', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost/api/admin/test');

      // Should not throw
      await expect(requireAdmin(request)).resolves.toBeUndefined();
    });

    it('should throw for authenticated non-admin user', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost/api/admin/test');

      await expect(requireAdmin(request)).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    it('should throw for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/test');

      await expect(requireAdmin(request)).rejects.toThrow('Unauthorized');
    });

    it('should throw for user without role', async () => {
      const sessionWithoutRole = {
        user: {
          id: '507f1f77bcf86cd799439013',
          email: 'norole@example.com',
          name: 'No Role User',
          // No role field
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithoutRole);

      const request = new NextRequest('http://localhost/api/admin/test');

      await expect(requireAdmin(request)).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    it('should throw for user with invalid role', async () => {
      const sessionWithInvalidRole = {
        user: {
          id: '507f1f77bcf86cd799439014',
          email: 'invalid@example.com',
          name: 'Invalid Role User',
          role: 'invalid_role',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithInvalidRole);

      const request = new NextRequest('http://localhost/api/admin/test');

      await expect(requireAdmin(request)).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    it('should handle case-sensitive role checking', async () => {
      const sessionWithUppercaseRole = {
        user: {
          id: '507f1f77bcf86cd799439015',
          email: 'uppercase@example.com',
          name: 'Uppercase Role User',
          role: 'ADMIN', // Uppercase
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithUppercaseRole);

      const request = new NextRequest('http://localhost/api/admin/test');

      // Should fail because role checking is case-sensitive
      await expect(requireAdmin(request)).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('Role-based access patterns', () => {
    const testCases = [
      {
        description: 'agent role should access user endpoints',
        session: mockUserSession,
        endpoint: '/api/activities',
        shouldPassAuth: true,
        shouldPassAdmin: false,
      },
      {
        description: 'admin role should access both user and admin endpoints',
        session: mockAdminSession,
        endpoint: '/api/admin/activities',
        shouldPassAuth: true,
        shouldPassAdmin: true,
      },
      {
        description: 'no session should fail all protected endpoints',
        session: null,
        endpoint: '/api/activities',
        shouldPassAuth: false,
        shouldPassAdmin: false,
      },
    ];

    testCases.forEach(
      ({ description, session, endpoint, shouldPassAuth, shouldPassAdmin }) => {
        describe(description, () => {
          beforeEach(() => {
            mockGetServerSession.mockResolvedValue(session);
          });

          it(`should ${shouldPassAuth ? 'pass' : 'fail'} requireAuth`, async () => {
            const request = new NextRequest(`http://localhost${endpoint}`);

            if (shouldPassAuth) {
              await expect(requireAuth(request)).resolves.toBeUndefined();
            } else {
              await expect(requireAuth(request)).rejects.toThrow();
            }
          });

          it(`should ${shouldPassAdmin ? 'pass' : 'fail'} requireAdmin`, async () => {
            const request = new NextRequest(`http://localhost${endpoint}`);

            if (shouldPassAdmin) {
              await expect(requireAdmin(request)).resolves.toBeUndefined();
            } else {
              await expect(requireAdmin(request)).rejects.toThrow();
            }
          });
        });
      }
    );
  });

  describe('Session validation edge cases', () => {
    it('should handle malformed session data', async () => {
      const malformedSession = {
        user: 'not-an-object', // Should be an object
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(malformedSession);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Unauthorized');
    });

    it('should handle session with missing user ID', async () => {
      const sessionWithoutId = {
        user: {
          email: 'noid@example.com',
          name: 'No ID User',
          role: 'agent',
          // Missing id field
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithoutId);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Invalid session');
    });

    it('should handle session with empty user ID', async () => {
      const sessionWithEmptyId = {
        user: {
          id: '', // Empty ID
          email: 'empty@example.com',
          name: 'Empty ID User',
          role: 'agent',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithEmptyId);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Invalid session');
    });

    it('should handle session with null user', async () => {
      const sessionWithNullUser = {
        user: null,
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithNullUser);

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Unauthorized');
    });

    it('should handle invalid date format in expires', async () => {
      const sessionWithInvalidExpires = {
        user: mockUserSession.user,
        expires: 'invalid-date-format',
      };
      mockGetServerSession.mockResolvedValue(sessionWithInvalidExpires);

      const request = new NextRequest('http://localhost/api/test');

      // Should handle gracefully and not crash
      await expect(requireAuth(request)).resolves.toBeUndefined();
    });
  });

  describe('Request context handling', () => {
    it('should handle requests with different methods', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const request = new NextRequest('http://localhost/api/test', {
          method,
        });
        await expect(requireAuth(request)).resolves.toBeUndefined();
      }
    });

    it('should handle requests with query parameters', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest(
        'http://localhost/api/test?param1=value1&param2=value2'
      );

      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should handle requests with headers', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
          'X-Custom-Header': 'custom-value',
        },
      });

      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should handle requests with body', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await expect(requireAuth(request)).resolves.toBeUndefined();
    });
  });

  describe('Performance and reliability', () => {
    it('should handle concurrent authentication requests', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const requests = Array.from(
        { length: 10 },
        (_, i) => new NextRequest(`http://localhost/api/test${i}`)
      );

      const authPromises = requests.map((request) => requireAuth(request));

      // All should resolve successfully
      await expect(Promise.all(authPromises)).resolves.toEqual(
        Array(10).fill(undefined)
      );
    });

    it('should handle authentication with slow session service', async () => {
      // Simulate slow session service
      mockGetServerSession.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockUserSession), 100)
          )
      );

      const request = new NextRequest('http://localhost/api/test');

      const startTime = Date.now();
      await expect(requireAuth(request)).resolves.toBeUndefined();
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should handle session service timeout', async () => {
      // Simulate timeout
      mockGetServerSession.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 50)
          )
      );

      const request = new NextRequest('http://localhost/api/test');

      await expect(requireAuth(request)).rejects.toThrow('Timeout');
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive session data in errors', async () => {
      const sessionWithSensitiveData = {
        user: {
          id: '507f1f77bcf86cd799439016',
          email: 'sensitive@example.com',
          name: 'Sensitive User',
          role: 'agent',
          password: 'secret-password', // Sensitive data
          apiKey: 'secret-api-key',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(sessionWithSensitiveData);

      const request = new NextRequest('http://localhost/api/test');

      // Should pass authentication
      await expect(requireAuth(request)).resolves.toBeUndefined();

      // Verify that sensitive data doesn't leak in any error scenarios
      mockGetServerSession.mockResolvedValue(null);

      try {
        await requireAuth(request);
      } catch (error) {
        expect(error.message).not.toContain('secret-password');
        expect(error.message).not.toContain('secret-api-key');
      }
    });

    it('should handle injection attempts in session data', async () => {
      const maliciousSession = {
        user: {
          id: '507f1f77bcf86cd799439017',
          email: 'malicious@example.com',
          name: '<script>alert("xss")</script>',
          role: 'agent',
        },
        expires: '2025-12-31T23:59:59.999Z',
      };
      mockGetServerSession.mockResolvedValue(maliciousSession);

      const request = new NextRequest('http://localhost/api/test');

      // Should still pass authentication (data sanitization is handled elsewhere)
      await expect(requireAuth(request)).resolves.toBeUndefined();
    });

    it('should validate role values strictly', async () => {
      const roleVariations = [
        'admin ', // With trailing space
        ' admin', // With leading space
        'Admin', // Different case
        'ADMIN', // All caps
        'administrator', // Similar but different
        'root', // Different admin-like role
        'superuser', // Another admin-like role
      ];

      for (const role of roleVariations) {
        const sessionWithVariantRole = {
          user: {
            id: '507f1f77bcf86cd799439018',
            email: 'variant@example.com',
            name: 'Variant Role User',
            role,
          },
          expires: '2025-12-31T23:59:59.999Z',
        };
        mockGetServerSession.mockResolvedValue(sessionWithVariantRole);

        const request = new NextRequest('http://localhost/api/admin/test');

        // All should fail except exact 'admin' match
        await expect(requireAdmin(request)).rejects.toThrow(
          'Insufficient permissions'
        );
      }
    });
  });
});
