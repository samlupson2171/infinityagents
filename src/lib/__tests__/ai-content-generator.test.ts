import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AIContentGeneratorService,
  getAIContentGenerator,
  processGeneratedContent,
  validateGeneratedContent,
  AIGenerationRequest,
  AIGenerationResponse
} from '../ai-content-generator';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

describe('AIContentGeneratorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'test-openai-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should initialize with OpenAI provider when API key is available', () => {
      const service = new AIContentGeneratorService();
      const providers = service.getAvailableProviders();
      
      expect(providers).toContain('openai');
    });

    it('should throw error when no API keys are configured', () => {
      process.env = { ...originalEnv };
      delete process.env.OPENAI_API_KEY;
      delete process.env.CLAUDE_API_KEY;

      expect(() => new AIContentGeneratorService()).toThrow(
        'No AI providers configured'
      );
    });

    it('should return singleton instance', () => {
      const instance1 = getAIContentGenerator();
      const instance2 = getAIContentGenerator();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Content Generation', () => {
    let service: AIContentGeneratorService;

    beforeEach(() => {
      service = new AIContentGeneratorService();
    });

    it('should generate content for single section successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Overview',
              content: '<p>Beautiful destination with amazing attractions.</p>',
              highlights: ['Great beaches', 'Rich culture', 'Delicious food'],
              tips: ['Visit in spring', 'Book early']
            })
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview'],
        targetAudience: 'families',
        contentTone: 'informative',
        contentLength: 'medium'
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(true);
      expect(result.content.overview).toBeDefined();
      expect(result.content.overview.title).toBe('Overview');
      expect(result.content.overview.highlights).toHaveLength(3);
      expect(result.metadata.model).toBe('gpt-4');
    });

    it('should handle multiple sections in single request', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Section',
              content: '<p>Test content</p>',
              highlights: ['Test highlight'],
              tips: ['Test tip']
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview', 'attractions'],
        targetAudience: 'couples',
        contentTone: 'enthusiastic',
        contentLength: 'long'
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(true);
      expect(result.content.overview).toBeDefined();
      expect(result.content.attractions).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API error');
    });

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON content'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(true);
      expect(result.content.overview.content).toBe('Invalid JSON content');
      expect(result.content.overview.title).toBe('Overview');
    });

    it('should validate request parameters', async () => {
      const invalidRequest: AIGenerationRequest = {
        destinationName: '',
        country: 'Spain',
        region: 'Catalonia',
        sections: []
      };

      await expect(service.generateContent(invalidRequest)).rejects.toThrow(
        'Destination name is required'
      );
    });

    it('should validate section names', async () => {
      const invalidRequest: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['invalid-section']
      };

      await expect(service.generateContent(invalidRequest)).rejects.toThrow(
        'Invalid sections: invalid-section'
      );
    });
  });

  describe('Batch Content Generation', () => {
    let service: AIContentGeneratorService;

    beforeEach(() => {
      service = new AIContentGeneratorService();
    });

    it('should process multiple requests in parallel', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Section',
              content: '<p>Test content</p>',
              highlights: ['Test highlight'],
              tips: ['Test tip']
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const requests: AIGenerationRequest[] = [
        {
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        },
        {
          destinationName: 'Madrid',
          country: 'Spain',
          region: 'Madrid',
          sections: ['attractions']
        }
      ];

      const results = await service.generateBatchContent(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures in batch processing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  title: 'Success',
                  content: '<p>Success content</p>',
                  highlights: [],
                  tips: []
                })
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });

      const requests: AIGenerationRequest[] = [
        {
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        },
        {
          destinationName: 'Madrid',
          country: 'Spain',
          region: 'Madrid',
          sections: ['attractions']
        }
      ];

      const results = await service.generateBatchContent(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('OpenAI API error');
    });
  });

  describe('Content Processing and Validation', () => {
    it('should process generated content correctly', () => {
      const mockResponse: AIGenerationResponse = {
        success: true,
        content: {
          overview: {
            title: 'Overview',
            content: '<p>Great destination</p>',
            highlights: ['Beach', 'Culture'],
            tips: ['Visit in summer']
          }
        },
        metadata: {
          model: 'gpt-4',
          tokensUsed: 100,
          generationTime: 1000,
          confidence: 0.9
        }
      };

      const existingDestination = {
        name: 'Barcelona',
        country: 'Spain',
        sections: {
          attractions: {
            title: 'Existing Attractions',
            content: 'Existing content',
            highlights: [],
            tips: [],
            lastModified: new Date(),
            aiGenerated: false
          }
        }
      };

      const result = processGeneratedContent(mockResponse, existingDestination);

      expect(result.sections.overview).toBeDefined();
      expect(result.sections.overview.aiGenerated).toBe(true);
      expect(result.sections.attractions).toBeDefined(); // Existing content preserved
      expect(result.aiGenerated).toBe(true);
      expect(result.aiGenerationDate).toBeInstanceOf(Date);
    });

    it('should validate generated content structure', () => {
      const validContent = {
        overview: {
          title: 'Overview',
          content: '<p>Valid content</p>',
          highlights: ['highlight1'],
          tips: ['tip1']
        }
      };

      const validation = validateGeneratedContent(validContent);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid content structure', () => {
      const invalidContent = {
        overview: {
          title: 'Overview',
          // Missing content field
          highlights: 'not an array', // Wrong type
          tips: ['tip1']
        }
      };

      const validation = validateGeneratedContent(invalidContent);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('content'))).toBe(true);
      expect(validation.errors.some(error => error.includes('highlights'))).toBe(true);
    });

    it('should handle null or undefined content', () => {
      const validation1 = validateGeneratedContent(null);
      expect(validation1.isValid).toBe(false);

      const validation2 = validateGeneratedContent(undefined);
      expect(validation2.isValid).toBe(false);
    });
  });

  describe('Prompt Building', () => {
    let service: AIContentGeneratorService;

    beforeEach(() => {
      service = new AIContentGeneratorService();
    });

    it('should include target audience in prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Overview',
              content: '<p>Family-friendly content</p>',
              highlights: [],
              tips: []
            })
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview'],
        targetAudience: 'families'
      };

      await service.generateContent(request);

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      const prompt = body.messages[1].content;

      expect(prompt).toContain('families');
    });

    it('should include content tone in prompts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Overview',
              content: '<p>Enthusiastic content!</p>',
              highlights: [],
              tips: []
            })
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview'],
        contentTone: 'enthusiastic'
      };

      await service.generateContent(request);

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      const prompt = body.messages[1].content;

      expect(prompt).toContain('enthusiastic');
    });

    it('should use different prompts for different sections', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test',
              content: '<p>Test</p>',
              highlights: [],
              tips: []
            })
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Test overview section
      await service.generateContent({
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      });

      const overviewCall = mockFetch.mock.calls[0][1];
      const overviewBody = JSON.parse(overviewCall.body);
      const overviewPrompt = overviewBody.messages[1].content;

      // Test beaches section
      await service.generateContent({
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['beaches']
      });

      const beachesCall = mockFetch.mock.calls[1][1];
      const beachesBody = JSON.parse(beachesCall.body);
      const beachesPrompt = beachesBody.messages[1].content;

      expect(overviewPrompt).toContain('overview');
      expect(beachesPrompt).toContain('beach');
      expect(overviewPrompt).not.toEqual(beachesPrompt);
    });
  });

  describe('Error Handling', () => {
    let service: AIContentGeneratorService;

    beforeEach(() => {
      service = new AIContentGeneratorService();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('should provide fallback for unknown providers', async () => {
      await expect(
        service.generateContent({
          destinationName: 'Barcelona',
          country: 'Spain',
          region: 'Catalonia',
          sections: ['overview']
        }, 'unknown-provider')
      ).rejects.toThrow('Provider unknown-provider not found');
    });
  });

  describe('Token Calculation', () => {
    let service: AIContentGeneratorService;

    beforeEach(() => {
      service = new AIContentGeneratorService();
    });

    it('should estimate token usage', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Overview',
              content: '<p>This is a longer piece of content that should result in more tokens being calculated for the response.</p>',
              highlights: ['Highlight one', 'Highlight two'],
              tips: ['Tip one', 'Tip two']
            })
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request: AIGenerationRequest = {
        destinationName: 'Barcelona',
        country: 'Spain',
        region: 'Catalonia',
        sections: ['overview']
      };

      const result = await service.generateContent(request);

      expect(result.success).toBe(true);
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);
    });
  });
});