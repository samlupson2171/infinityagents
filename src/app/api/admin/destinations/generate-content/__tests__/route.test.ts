import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { getServerSession } from 'next-auth';
import * as aiGenerator from '@/lib/ai-content-generator';
import * as mongodb from '@/lib/mongodb';
import { Destination } from '@/models/Destination';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@/lib/ai-content-generator', () => ({
  getAIContentGenerator: vi.fn(),
  validateGeneratedContent: vi.fn(),
  processGeneratedContent: vi.fn()
}));

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: vi.fn()
}));

vi.mock('@/models/Destination', () => ({
  Destination: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  }
}));

describe('/api/admin/destinations/generate-content', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'admin@test.com',
      role: 'admin'
    }
  };

  const mockAIService = {
    generateContent: vi.fn(),
    generateBatchContent: vi.fn(),
    getAvailableProviders: vi.fn(() => ['openai', 'claude'])
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(aiGenerator.getAIContentGenerator).mockReturnValue(mockAIService as any);
    vi.mocked(aiGenerator.validateGeneratedContent).mockReturnValue({
      isValid: true,
      errors: []
    });
    vi.mocked(aiGenerator.processGeneratedContent).mockReturnValue({
      sections: {
        overview: {
          title: 'Overview',
          content: '<p>Generated content</p>',
          highlights: ['Great beaches'],
          tips: ['Visit in summer'],
          lastModified: new Date(),
          aiGenerated: true
        }
      },
      aiGenerated: true,
      aiGenerationDate: new Date()
    });
    vi.mocked(mongodb.connectToDatabase).mockResolvedValue(undefined);
  });

  describe('POST /api/admin/destinations/generate-content', () => {
    it('should generate content successfully', async () => {
      const mockGeneratedContent = {
        overview: {
          title: 'Overview',
          content: '<p>Barcelona is a beautiful city</p>',
          highlights: ['Sagrada Familia', 'Park Güell'],
          tips: ['Visit early morning', 'Book tickets online']
        }
      };

      mockAIService.generateContent.mockResolvedValue({
        success: true,
        content: mockGeneratedContent,
        metadata: {
          model: 'gpt-4',
          tokensUsed: 150,
          generationTime: 2000,
          confidence: 0.9
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview'],
          targetAudience: 'families',
          contentTone: 'informative',
          contentLength: 'medium',
          provider: 'openai'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.content.overview).toBeDefined();
      expect(data.content.overview.title).toBe('Overview');
      expect(mockAIService.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        }),
        'openai'
      );
    });

    it('should handle batch generation', async () => {
      const mockBatchResponse = [
        {
          success: true,
          content: {
            overview: {
              title: 'Overview',
              content: '<p>Overview content</p>',
              highlights: ['Highlight 1'],
              tips: ['Tip 1']
            }
          },
          metadata: { model: 'gpt-4', tokensUsed: 100, generationTime: 1000, confidence: 0.9 }
        },
        {
          success: true,
          content: {
            attractions: {
              title: 'Attractions',
              content: '<p>Attractions content</p>',
              highlights: ['Highlight 2'],
              tips: ['Tip 2']
            }
          },
          metadata: { model: 'gpt-4', tokensUsed: 120, generationTime: 1200, confidence: 0.85 }
        }
      ];

      mockAIService.generateBatchContent.mockResolvedValue(mockBatchResponse);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview', 'attractions'],
          batchMode: true,
          provider: 'openai'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.content.overview).toBeDefined();
      expect(data.content.attractions).toBeDefined();
      expect(mockAIService.generateBatchContent).toHaveBeenCalled();
    });

    it('should handle partial failures in batch mode', async () => {
      const mockBatchResponse = [
        {
          success: true,
          content: {
            overview: {
              title: 'Overview',
              content: '<p>Success</p>',
              highlights: [],
              tips: []
            }
          },
          metadata: { model: 'gpt-4', tokensUsed: 100, generationTime: 1000, confidence: 0.9 }
        },
        {
          success: false,
          content: {},
          metadata: { model: 'gpt-4', tokensUsed: 0, generationTime: 0, confidence: 0 },
          error: 'Generation failed for attractions'
        }
      ];

      mockAIService.generateBatchContent.mockResolvedValue(mockBatchResponse);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview', 'attractions'],
          batchMode: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.content.overview).toBeDefined();
      expect(data.content.attractions).toBeUndefined();
      expect(data.errors).toContain('attractions: Generation failed for attractions');
    });

    it('should auto-save when destinationId and autoSave are provided', async () => {
      const mockDestination = {
        _id: 'dest123',
        name: 'Barcelona',
        toObject: () => ({ name: 'Barcelona' })
      };

      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findByIdAndUpdate).mockResolvedValue(mockDestination);

      mockAIService.generateContent.mockResolvedValue({
        success: true,
        content: {
          overview: {
            title: 'Overview',
            content: '<p>Content</p>',
            highlights: [],
            tips: []
          }
        },
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
          generationTime: 1000,
          confidence: 0.9
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationId: 'dest123',
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview'],
          autoSave: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Destination.findByIdAndUpdate).toHaveBeenCalledWith(
        'dest123',
        expect.objectContaining({
          aiGenerated: true,
          aiGenerationDate: expect.any(Date),
          lastModifiedBy: 'user123'
        }),
        { new: true, runValidators: true }
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user123', role: 'user' }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: '',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate sections array', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: []
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('At least one section must be specified');
    });

    it('should handle AI service errors', async () => {
      mockAIService.generateContent.mockResolvedValue({
        success: false,
        content: {},
        metadata: {
          model: 'gpt-4',
          tokensUsed: 0,
          generationTime: 0,
          confidence: 0
        },
        error: 'API rate limit exceeded'
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('API rate limit exceeded');
    });

    it('should handle validation errors', async () => {
      mockAIService.generateContent.mockResolvedValue({
        success: true,
        content: { overview: { title: 'Test' } }, // Invalid structure
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
          generationTime: 1000,
          confidence: 0.9
        }
      });

      vi.mocked(aiGenerator.validateGeneratedContent).mockReturnValue({
        isValid: false,
        errors: ['Invalid content structure']
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Generated content validation failed');
      expect(data.details).toContain('Invalid content structure');
    });

    it('should handle AI service configuration errors', async () => {
      vi.mocked(aiGenerator.getAIContentGenerator).mockImplementation(() => {
        throw new Error('No AI providers configured');
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('AI service not configured');
    });

    it('should handle rate limit errors', async () => {
      mockAIService.generateContent.mockRejectedValue(
        new Error('rate limit exceeded')
      );

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('rate limit exceeded');
    });

    it('should handle destination not found for auto-save', async () => {
      vi.mocked(Destination.findById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationId: 'nonexistent',
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview'],
          autoSave: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Destination not found');
    });
  });

  describe('GET /api/admin/destinations/generate-content', () => {
    it('should return AI service configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableProviders).toEqual(['openai', 'claude']);
      expect(data.supportedSections).toContain('overview');
      expect(data.targetAudiences).toContain('families');
      expect(data.contentTones).toContain('informative');
      expect(data.contentLengths).toContain('medium');
    });

    it('should handle AI service not configured', async () => {
      vi.mocked(aiGenerator.getAIContentGenerator).mockImplementation(() => {
        throw new Error('No AI providers configured');
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableProviders).toEqual([]);
      expect(data.error).toBe('AI service not configured');
    });

    it('should return 401 for unauthenticated GET requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'GET'
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin GET requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user123', role: 'user' }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'GET'
      });

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      vi.mocked(mongodb.connectToDatabase).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should continue on auto-save failures', async () => {
      const mockDestination = {
        _id: 'dest123',
        name: 'Barcelona',
        toObject: () => ({ name: 'Barcelona' })
      };

      vi.mocked(Destination.findById).mockResolvedValue(mockDestination);
      vi.mocked(Destination.findByIdAndUpdate).mockRejectedValue(
        new Error('Save failed')
      );

      mockAIService.generateContent.mockResolvedValue({
        success: true,
        content: {
          overview: {
            title: 'Overview',
            content: '<p>Content</p>',
            highlights: [],
            tips: []
          }
        },
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
          generationTime: 1000,
          confidence: 0.9
        }
      });

      const request = new NextRequest('http://localhost:3000/api/admin/destinations/generate-content', {
        method: 'POST',
        body: JSON.stringify({
          destinationId: 'dest123',
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview'],
          autoSave: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still return success even if auto-save fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});