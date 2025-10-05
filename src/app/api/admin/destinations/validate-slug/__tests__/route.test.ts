import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../route';
import { getServerSession } from 'next-auth';
import Destination from '@/models/Destination';
import { connectToDatabase } from '@/lib/mongodb';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/models/Destination');
vi.mock('@/lib/mongodb');

const mockGetServerSession = vi.mocked(getServerSession);
const mockDestination = vi.mocked(Destination);
const mockConnectToDatabase = vi.mocked(connectToDatabase);

describe('/api/admin/destinations/validate-slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=test-slug');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', role: 'user' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=test-slug');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 if slug parameter is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return false for invalid slug format', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=Invalid%20Slug!');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isUnique).toBe(false);
      expect(data.error).toBe('Slug can only contain lowercase letters, numbers, and hyphens');
    });

    it('should return false for reserved slugs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=admin');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isUnique).toBe(false);
      expect(data.error).toBe('This slug is reserved and cannot be used');
    });

    it('should return true for unique slug', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findOne.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=unique-slug');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isUnique).toBe(true);
      expect(data.slug).toBe('unique-slug');
      expect(mockDestination.findOne).toHaveBeenCalledWith({ slug: 'unique-slug' });
    });

    it('should return false for existing slug', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findOne.mockResolvedValue({ _id: 'existing-id' });

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=existing-slug');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isUnique).toBe(false);
      expect(data.error).toBe('This slug is already taken');
    });

    it('should exclude current destination when editing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findOne.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=test-slug&excludeId=current-id');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isUnique).toBe(true);
      expect(mockDestination.findOne).toHaveBeenCalledWith({
        slug: 'test-slug',
        _id: { $ne: 'current-id' }
      });
    });

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findOne.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/destinations/validate-slug?slug=test-slug');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should validate all reserved slugs', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const reservedSlugs = ['admin', 'api', 'auth', 'dashboard', 'new', 'edit', 'create'];

      for (const slug of reservedSlugs) {
        const request = new NextRequest(`http://localhost/api/admin/destinations/validate-slug?slug=${slug}`);
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.isUnique).toBe(false);
        expect(data.error).toBe('This slug is reserved and cannot be used');
      }
    });

    it('should handle valid slug formats', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);
      mockConnectToDatabase.mockResolvedValue(undefined);
      mockDestination.findOne.mockResolvedValue(null);

      const validSlugs = ['benidorm', 'costa-del-sol', 'new-york-city', 'test123', 'a-b-c-d-e'];

      for (const slug of validSlugs) {
        const request = new NextRequest(`http://localhost/api/admin/destinations/validate-slug?slug=${slug}`);
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.isUnique).toBe(true);
      }
    });

    it('should handle invalid slug formats', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'admin' }
      } as any);

      const invalidSlugs = ['Invalid Slug', 'slug_with_underscore', 'UPPERCASE', 'slug!', 'slug@domain'];

      for (const slug of invalidSlugs) {
        const request = new NextRequest(`http://localhost/api/admin/destinations/validate-slug?slug=${encodeURIComponent(slug)}`);
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.isUnique).toBe(false);
        expect(data.error).toBe('Slug can only contain lowercase letters, numbers, and hyphens');
      }
    });
  });
});