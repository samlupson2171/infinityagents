import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authOptions } from '../auth';
import User from '@/models/User';
import mongoose from 'mongoose';

// Mock the MongoDB connection
vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

// Mock the MongoClient
vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
  })),
}));

// Mock NextAuth MongoDB adapter
vi.mock('@next-auth/mongodb-adapter', () => ({
  MongoDBAdapter: vi.fn().mockReturnValue({}),
}));

describe('NextAuth Configuration', () => {
  beforeEach(async () => {
    // Clear all users before each test
    await User.deleteMany({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Credentials Provider', () => {
    it('should have credentials provider configured', () => {
      expect(authOptions.providers).toHaveLength(1);
      expect(authOptions.providers[0].name).toBe('credentials');
    });

    it('should authorize valid user with correct credentials', async () => {
      // Create a test user
      const testUser = new User({
        name: 'Test User',
        companyName: 'Test Company',
        abtaPtsNumber: 'ABTA12345',
        contactEmail: 'test@example.com',
        websiteAddress: 'https://example.com',
        password: 'password123',
        isApproved: true,
        role: 'agent',
      });
      await testUser.save();

      const credentialsProvider = authOptions.providers[0] as any;
      const result = await credentialsProvider.authorize({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeTruthy();
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe('agent');
      expect(result.isApproved).toBe(true);
      expect(result.companyName).toBe('Test Company');
      expect(result.abtaPtsNumber).toBe('ABTA12345');
    });

    it('should reject user with incorrect password', async () => {
      // Create a test user
      const testUser = new User({
        name: 'Test User',
        companyName: 'Test Company',
        abtaPtsNumber: 'ABTA12345',
        contactEmail: 'test@example.com',
        websiteAddress: 'https://example.com',
        password: 'password123',
        isApproved: true,
        role: 'agent',
      });
      await testUser.save();

      const credentialsProvider = authOptions.providers[0] as any;

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      const credentialsProvider = authOptions.providers[0] as any;

      await expect(
        credentialsProvider.authorize({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject unapproved user', async () => {
      // Create an unapproved test user
      const testUser = new User({
        name: 'Test User',
        companyName: 'Test Company',
        abtaPtsNumber: 'ABTA12345',
        contactEmail: 'test@example.com',
        websiteAddress: 'https://example.com',
        password: 'password123',
        isApproved: false,
        role: 'agent',
      });
      await testUser.save();

      const credentialsProvider = authOptions.providers[0] as any;

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(
        'Your account is pending approval. Please wait for admin approval.'
      );
    });

    it('should reject request with missing credentials', async () => {
      const credentialsProvider = authOptions.providers[0] as any;

      await expect(
        credentialsProvider.authorize({
          email: 'test@example.com',
        })
      ).rejects.toThrow('Email and password are required');

      await expect(
        credentialsProvider.authorize({
          password: 'password123',
        })
      ).rejects.toThrow('Email and password are required');

      await expect(credentialsProvider.authorize({})).rejects.toThrow(
        'Email and password are required'
      );
    });
  });

  describe('JWT Callback', () => {
    it('should persist user data in JWT token', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'agent',
        isApproved: true,
        companyName: 'Test Company',
        abtaPtsNumber: 'ABTA12345',
      };

      const token = {};
      const result = await authOptions.callbacks!.jwt!({
        token,
        user: mockUser,
      } as any);

      expect(result.role).toBe('agent');
      expect(result.isApproved).toBe(true);
      expect(result.companyName).toBe('Test Company');
      expect(result.abtaPtsNumber).toBe('ABTA12345');
    });

    it('should return existing token when no user provided', async () => {
      const existingToken = {
        sub: '123',
        role: 'admin',
        isApproved: true,
        companyName: 'Existing Company',
        abtaPtsNumber: 'ABTA99999',
      };

      const result = await authOptions.callbacks!.jwt!({
        token: existingToken,
      } as any);

      expect(result).toEqual(existingToken);
    });
  });

  describe('Session Callback', () => {
    it('should send properties to client session', async () => {
      const mockToken = {
        sub: '123',
        role: 'agent',
        isApproved: true,
        companyName: 'Test Company',
        abtaPtsNumber: 'ABTA12345',
      };

      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const result = await authOptions.callbacks!.session!({
        session: mockSession,
        token: mockToken,
      } as any);

      expect(result.user.id).toBe('123');
      expect(result.user.role).toBe('agent');
      expect(result.user.isApproved).toBe(true);
      expect(result.user.companyName).toBe('Test Company');
      expect(result.user.abtaPtsNumber).toBe('ABTA12345');
    });
  });

  describe('Configuration', () => {
    it('should use JWT strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have correct session and JWT max age', () => {
      expect(authOptions.session?.maxAge).toBe(24 * 60 * 60); // 24 hours
      expect(authOptions.jwt?.maxAge).toBe(24 * 60 * 60); // 24 hours
    });

    it('should have custom pages configured', () => {
      expect(authOptions.pages?.signIn).toBe('/auth/login');
      expect(authOptions.pages?.error).toBe('/auth/error');
    });

    it('should have secret configured', () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });
  });
});
