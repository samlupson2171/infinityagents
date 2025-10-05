import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn()
}));

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    unlink: vi.fn(),
    rmdir: vi.fn()
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => true)
  };
});

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/'))
  };
});

const mockDb = {
  collection: vi.fn(() => ({
    findOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    countDocuments: vi.fn()
  }))
};

const mockParams = { params: { id: '507f1f77bcf86cd799439011' } };

describe('/api/admin/media/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({ db: mockDb } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('retrieves image metadata', async () => {
      const mockImage = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        originalName: 'test.jpg',
        altText: 'Test image',
        sizes: {}
      };

      mockDb.collection().findOne.mockResolvedValue(mockImage);

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011');
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockImage);
      expect(mockDb.collection().findOne).toHaveBeenCalledWith({
        _id: new ObjectId('507f1f77bcf86cd799439011')
      });
    });

    it('returns 404 for non-existent image', async () => {
      mockDb.collection().findOne.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011');
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Image not found');
    });

    it('handles database errors', async () => {
      mockDb.collection().findOne.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011');
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PATCH', () => {
    it('requires authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'PATCH',
        body: JSON.stringify({ altText: 'New alt text' })
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('requires admin role', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@test.com' }
      } as any);

      mockDb.collection().findOne.mockResolvedValue({
        email: 'user@test.com',
        role: 'user'
      });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'PATCH',
        body: JSON.stringify({ altText: 'New alt text' })
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('validates alt text', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      mockDb.collection().findOne.mockResolvedValue({
        email: 'admin@test.com',
        role: 'admin'
      });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'PATCH',
        body: JSON.stringify({ altText: 123 }) // Invalid type
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid alt text');
    });

    it('successfully updates alt text', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      const mockUser = {
        _id: 'user-id',
        email: 'admin@test.com',
        role: 'admin'
      };

      mockDb.collection().findOne.mockResolvedValue(mockUser);
      mockDb.collection().updateOne.mockResolvedValue({ matchedCount: 1 });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'PATCH',
        body: JSON.stringify({ altText: 'Updated alt text' })
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId('507f1f77bcf86cd799439011') },
        {
          $set: {
            altText: 'Updated alt text',
            updatedAt: expect.any(Date),
            lastModifiedBy: 'user-id'
          }
        }
      );
    });

    it('returns 404 for non-existent image', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      mockDb.collection().findOne.mockResolvedValue({
        email: 'admin@test.com',
        role: 'admin'
      });

      mockDb.collection().updateOne.mockResolvedValue({ matchedCount: 0 });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'PATCH',
        body: JSON.stringify({ altText: 'Updated alt text' })
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Image not found');
    });
  });

  describe('DELETE', () => {
    it('requires authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('requires admin role', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@test.com' }
      } as any);

      mockDb.collection().findOne.mockResolvedValue({
        email: 'user@test.com',
        role: 'user'
      });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('returns 404 for non-existent image', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      mockDb.collection().findOne
        .mockResolvedValueOnce({ email: 'admin@test.com', role: 'admin' })
        .mockResolvedValueOnce(null); // Image not found

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Image not found');
    });

    it('prevents deletion of images in use', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      const mockImage = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        originalName: 'test.jpg'
      };

      mockDb.collection().findOne
        .mockResolvedValueOnce({ email: 'admin@test.com', role: 'admin' })
        .mockResolvedValueOnce(mockImage);

      mockDb.collection().countDocuments.mockResolvedValue(2); // Image is in use

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Image is being used in 2 destination(s)');
    });

    it('successfully deletes unused image', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      const mockImage = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        originalName: 'test.jpg'
      };

      mockDb.collection().findOne
        .mockResolvedValueOnce({ email: 'admin@test.com', role: 'admin' })
        .mockResolvedValueOnce(mockImage);

      mockDb.collection().countDocuments.mockResolvedValue(0); // Image not in use
      mockDb.collection().deleteOne.mockResolvedValue({ deletedCount: 1 });

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDb.collection().deleteOne).toHaveBeenCalledWith({
        _id: new ObjectId('507f1f77bcf86cd799439011')
      });
    });

    it('handles file system errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@test.com' }
      } as any);

      const mockImage = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        originalName: 'test.jpg'
      };

      mockDb.collection().findOne
        .mockResolvedValueOnce({ email: 'admin@test.com', role: 'admin' })
        .mockResolvedValueOnce(mockImage);

      mockDb.collection().countDocuments.mockResolvedValue(0);
      mockDb.collection().deleteOne.mockResolvedValue({ deletedCount: 1 });

      // Mock file system error
      const { unlink } = await import('fs/promises');
      vi.mocked(unlink).mockRejectedValue(new Error('File system error'));

      const request = new NextRequest('http://localhost/api/admin/media/507f1f77bcf86cd799439011', {
        method: 'DELETE'
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      // Should still succeed even if file deletion fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});