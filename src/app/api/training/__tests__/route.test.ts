import { NextRequest } from 'next/server';
import { GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import TrainingMaterial from '@/models/TrainingMaterial';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/TrainingMaterial');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockTrainingMaterialFind = TrainingMaterial.find as jest.MockedFunction<
  typeof TrainingMaterial.find
>;
const mockTrainingMaterialCountDocuments =
  TrainingMaterial.countDocuments as jest.MockedFunction<
    typeof TrainingMaterial.countDocuments
  >;

describe('/api/training', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('should return active training materials for approved users', async () => {
      // Mock approved user token
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      // Mock training materials
      const mockMaterials = [
        {
          _id: 'material1',
          title: 'Introduction to Travel Sales',
          description: 'Learn the basics of travel sales',
          type: 'video',
          contentUrl: 'https://example.com/video1',
          isActive: true,
          createdAt: new Date(),
          createdBy: { name: 'Admin User' },
        },
        {
          _id: 'material2',
          title: 'Customer Service Excellence',
          description: 'Best practices for customer service',
          type: 'blog',
          contentUrl: 'https://example.com/blog1',
          isActive: true,
          createdAt: new Date(),
          createdBy: { name: 'Admin User' },
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMaterials),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(2);

      const request = new NextRequest('http://localhost/api/training');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.materials).toEqual(mockMaterials);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalMaterials: 2,
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(mockTrainingMaterialFind).toHaveBeenCalledWith({ isActive: true });
    });

    it('should filter materials by type', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/training?type=video'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockTrainingMaterialFind).toHaveBeenCalledWith({
        isActive: true,
        type: 'video',
      });
    });

    it('should handle search functionality', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/training?search=sales'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockTrainingMaterialFind).toHaveBeenCalledWith({
        isActive: true,
        $or: [
          { title: { $regex: 'sales', $options: 'i' } },
          { description: { $regex: 'sales', $options: 'i' } },
        ],
      });
    });

    it('should handle pagination correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/training?page=3&limit=6'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 3,
        totalPages: 5,
        totalMaterials: 25,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(12); // (3-1) * 6
      expect(mockQuery.limit).toHaveBeenCalledWith(6);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/training');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for unapproved user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: false,
      });

      const request = new NextRequest('http://localhost/api/training');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PENDING_APPROVAL');
    });

    it('should handle database errors', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      mockTrainingMaterialFind.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/training');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should use default pagination values', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/training');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(12);
    });

    it('should populate createdBy field correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/training');
      await GET(request);

      expect(mockQuery.populate).toHaveBeenCalledWith('createdBy', 'name');
    });

    it('should sort materials by creation date descending', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/training');
      await GET(request);

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should handle type filter with all option', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        role: 'agent',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockTrainingMaterialFind.mockReturnValue(mockQuery as any);
      mockTrainingMaterialCountDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/training?type=all');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockTrainingMaterialFind).toHaveBeenCalledWith({ isActive: true });
    });
  });
});
