import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/mongodb');
vi.mock('@/models/Destination');

const mockSession = {
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin'
  }
};

const mockDestination = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Test Destination',
  slug: 'test-destination',
  country: 'Spain',
  region: 'Costa Blanca',
  description: 'A beautiful test destination for our comprehensive testing suite.',
  status: 'draft',
  sections: {
    overview: {
      title: 'Overview',
      content: 'Test overview content',
      highlights: ['Test highlight'],
      tips: ['Test tip'],
      lastModified: new Date(),
      aiGenerated: false
    },
    accommodation: {
      title: 'Accommodation',
      content: 'Test accommodation content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    attractions: {
      title: 'Attractions',
      content: 'Test attractions content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    beaches: {
      title: 'Beaches',
      content: 'Test beaches content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    nightlife: {
      title: 'Nightlife',
      content: 'Test nightlife content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    dining: {
      title: 'Dining',
      content: 'Test dining content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    },
    practical: {
      title: 'Practical Information',
      content: 'Test practical content',
      highlights: [],
      tips: [],
      lastModified: new Date(),
      aiGenerated: false
    }
  },
  quickFacts: {
    population: '100,000',
    language: 'Spanish',
    currency: 'EUR'
  },
  createdBy: mockSession.user.id,
  lastModifiedBy: mockSession.user.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  populate: vi.fn().mockReturnThis()
};

describe('/api/admin/destinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectToDatabase).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/destinations', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return destinations with pagination', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockFind = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDestination])
              })
            })
          })
        })
      });
      
      vi.mocked(Destination.find).mockImplementation(mockFind);
      vi.mocked(Destination.countDocuments).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.destinations).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter destinations by status', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockFind = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDestination])
              })
            })
          })
        })
      });
      
      vi.mocked(Destination.find).mockImplementation(mockFind);
      vi.mocked(Destination.countDocuments).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations?status=published');
      const response = await GET(request);

      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
        status: 'published'
      }));
      expect(response.status).toBe(200);
    });

    it('should perform text search when search parameter is provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockFind = vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              skip: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockDestination])
              })
            })
          })
        })
      });
      
      vi.mocked(Destination.find).mockImplementation(mockFind);
      vi.mocked(Destination.countDocuments).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations?search=benidorm');
      const response = await GET(request);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { name: /benidorm/i },
            { description: /benidorm/i }
          ]
        })
      );
      expect(response.status).toBe(200);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.find).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/destinations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch destinations');
    });
  });

  describe('POST /api/admin/destinations', () => {
    const validDestinationData = {
      name: 'New Destination',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A beautiful new destination for testing our comprehensive API endpoints.'
    };

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 403 when user is not admin', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: 'user' }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 400 when required fields are missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const incompleteData = { name: 'Test' };
      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(incompleteData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(data.missingFields).toContain('country');
      expect(data.missingFields).toContain('region');
      expect(data.missingFields).toContain('description');
    });

    it('should create destination successfully with valid data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockSave = vi.fn().mockResolvedValue(mockDestination);
      const mockPopulate = vi.fn().mockReturnThis();
      
      const mockDestinationInstance = {
        ...mockDestination,
        save: mockSave,
        populate: mockPopulate
      };

      vi.mocked(Destination.findOne).mockResolvedValue(null); // No existing destination
      vi.mocked(Destination).mockImplementation(() => mockDestinationInstance as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Destination created successfully');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should return 409 when slug already exists', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(Destination.findOne).mockResolvedValue(mockDestination);

      const dataWithSlug = { ...validDestinationData, slug: 'existing-slug' };
      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(dataWithSlug)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('A destination with this slug already exists');
    });

    it('should handle validation errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const validationError = {
        name: 'ValidationError',
        errors: {
          name: { path: 'name', message: 'Name is too short' }
        }
      };

      const mockSave = vi.fn().mockRejectedValue(validationError);
      const mockDestinationInstance = {
        save: mockSave,
        populate: vi.fn().mockReturnThis()
      };

      vi.mocked(Destination.findOne).mockResolvedValue(null);
      vi.mocked(Destination).mockImplementation(() => mockDestinationInstance as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.validationErrors).toHaveLength(1);
    });

    it('should handle duplicate key errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const duplicateError = {
        code: 11000,
        keyPattern: { slug: 1 }
      };

      const mockSave = vi.fn().mockRejectedValue(duplicateError);
      const mockDestinationInstance = {
        save: mockSave,
        populate: vi.fn().mockReturnThis()
      };

      vi.mocked(Destination.findOne).mockResolvedValue(null);
      vi.mocked(Destination).mockImplementation(() => mockDestinationInstance as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('A destination with this slug already exists');
    });

    it('should create default sections when not provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      
      const mockSave = vi.fn().mockResolvedValue(mockDestination);
      const mockPopulate = vi.fn().mockReturnThis();
      
      let capturedData: any;
      const mockDestinationConstructor = vi.fn().mockImplementation((data) => {
        capturedData = data;
        return {
          save: mockSave,
          populate: mockPopulate
        };
      });

      vi.mocked(Destination.findOne).mockResolvedValue(null);
      vi.mocked(Destination).mockImplementation(mockDestinationConstructor as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(validDestinationData)
      });
      await POST(request);

      expect(capturedData.sections).toBeDefined();
      expect(capturedData.sections.overview.title).toBe('Overview');
      expect(capturedData.sections.accommodation.title).toBe('Accommodation');
      expect(capturedData.sections.attractions.title).toBe('Attractions');
      expect(capturedData.sections.beaches.title).toBe('Beaches');
      expect(capturedData.sections.nightlife.title).toBe('Nightlife');
      expect(capturedData.sections.dining.title).toBe('Dining');
      expect(capturedData.sections.practical.title).toBe('Practical Information');
    });
  });
});