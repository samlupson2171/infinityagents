import { NextRequest } from 'next/server';
import { GET } from '../route';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Enquiry');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockEnquiryFind = Enquiry.find as jest.MockedFunction<
  typeof Enquiry.find
>;
const mockEnquiryCountDocuments = Enquiry.countDocuments as jest.MockedFunction<
  typeof Enquiry.countDocuments
>;

describe('/api/admin/enquiries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('GET', () => {
    it('should return enquiries for admin', async () => {
      // Mock admin token
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      // Mock enquiries
      const mockEnquiries = [
        {
          _id: 'enquiry1',
          leadName: 'John Smith',
          tripType: 'stag',
          resort: 'Ibiza',
          travelDate: new Date('2024-06-15'),
          agentEmail: 'agent@test.com',
          status: 'new',
          createdAt: new Date(),
          submittedBy: { name: 'Agent Name', companyName: 'Test Company' },
        },
        {
          _id: 'enquiry2',
          leadName: 'Jane Doe',
          tripType: 'hen',
          resort: 'Barcelona',
          travelDate: new Date('2024-07-20'),
          agentEmail: 'agent2@test.com',
          status: 'in-progress',
          createdAt: new Date(),
          submittedBy: {
            name: 'Another Agent',
            companyName: 'Another Company',
          },
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEnquiries),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(2);

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.enquiries).toEqual(mockEnquiries);
      expect(data.data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalEnquiries: 2,
        hasNextPage: false,
        hasPrevPage: false,
      });
      expect(mockEnquiryFind).toHaveBeenCalledWith({});
    });

    it('should filter enquiries by status', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/enquiries?status=new'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockEnquiryFind).toHaveBeenCalledWith({ status: 'new' });
      expect(mockEnquiryCountDocuments).toHaveBeenCalledWith({ status: 'new' });
    });

    it('should handle search functionality', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(1);

      const request = new NextRequest(
        'http://localhost/api/admin/enquiries?search=john'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockEnquiryFind).toHaveBeenCalledWith({
        $or: [
          { leadName: { $regex: 'john', $options: 'i' } },
          { resort: { $regex: 'john', $options: 'i' } },
          { agentEmail: { $regex: 'john', $options: 'i' } },
          { departureAirport: { $regex: 'john', $options: 'i' } },
        ],
      });
    });

    it('should handle pagination correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(25);

      const request = new NextRequest(
        'http://localhost/api/admin/enquiries?page=3&limit=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination).toEqual({
        currentPage: 3,
        totalPages: 5,
        totalEnquiries: 25,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (3-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      const response = await GET(request);
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

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle database errors', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      mockEnquiryFind.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should use default pagination values', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(5);

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.pagination.currentPage).toBe(1);
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should populate submittedBy field correctly', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      await GET(request);

      expect(mockQuery.populate).toHaveBeenCalledWith(
        'submittedBy',
        'name companyName contactEmail'
      );
    });

    it('should sort enquiries by creation date descending', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'admin-id',
        role: 'admin',
        isApproved: true,
      });

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockEnquiryFind.mockReturnValue(mockQuery as any);
      mockEnquiryCountDocuments.mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/admin/enquiries');
      await GET(request);

      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });
});
