import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';

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
    writeFile: vi.fn(),
    mkdir: vi.fn()
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    existsSync: vi.fn(() => false)
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
    insertOne: vi.fn()
  }))
};

describe('/api/admin/media/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue({ db: mockDb } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
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

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Admin access required');
  });

  it('requires file in request', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    mockDb.collection().findOne.mockResolvedValue({
      email: 'admin@test.com',
      role: 'admin'
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('validates file type', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    mockDb.collection().findOne.mockResolvedValue({
      email: 'admin@test.com',
      role: 'admin'
    });

    const formData = new FormData();
    const invalidFile = new File(['test'], 'test.gif', { type: 'image/gif' });
    formData.append('originalFile', invalidFile);

    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid file type');
  });

  it('validates file size', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    mockDb.collection().findOne.mockResolvedValue({
      email: 'admin@test.com',
      role: 'admin'
    });

    const formData = new FormData();
    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });
    formData.append('originalFile', largeFile);

    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('File too large');
  });

  it('successfully uploads valid image', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    const mockUser = {
      _id: 'user-id',
      email: 'admin@test.com',
      role: 'admin'
    };

    mockDb.collection().findOne.mockResolvedValue(mockUser);
    mockDb.collection().insertOne.mockResolvedValue({ insertedId: 'image-id' });

    const formData = new FormData();
    const validFile = new File(['test image data'], 'test.jpg', { 
      type: 'image/jpeg' 
    });
    formData.append('originalFile', validFile);
    formData.append('altText', 'Test image');

    // Add size files
    const sizeNames = ['thumbnail', 'small', 'medium', 'large', 'hero'];
    for (const sizeName of sizeNames) {
      const sizeFile = new File(['size data'], `${sizeName}.webp`, { 
        type: 'image/webp' 
      });
      formData.append(`size_${sizeName}`, sizeFile);
    }

    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.originalName).toBe('test.jpg');
    expect(data.altText).toBe('Test image');
    expect(data.sizes).toBeDefined();
    expect(data.metadata).toBeDefined();
    expect(mockDb.collection().insertOne).toHaveBeenCalled();
  });

  it('handles database errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    mockDb.collection().findOne.mockResolvedValue({
      email: 'admin@test.com',
      role: 'admin'
    });

    mockDb.collection().insertOne.mockRejectedValue(new Error('Database error'));

    const formData = new FormData();
    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('originalFile', validFile);

    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('handles missing alt text', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'admin@test.com' }
    } as any);

    mockDb.collection().findOne.mockResolvedValue({
      email: 'admin@test.com',
      role: 'admin'
    });

    mockDb.collection().insertOne.mockResolvedValue({ insertedId: 'image-id' });

    const formData = new FormData();
    const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('originalFile', validFile);
    // No altText provided

    const request = new NextRequest('http://localhost/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.altText).toBe(''); // Should default to empty string
  });
});