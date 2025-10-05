import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIContentGenerator } from '../AIContentGenerator';
import * as aiGenerator from '@/lib/ai-content-generator';

// Mock the AI content generator
vi.mock('@/lib/ai-content-generator', () => ({
  getAIContentGenerator: vi.fn(),
  processGeneratedContent: vi.fn(),
  validateGeneratedContent: vi.fn()
}));

// Mock the shared components
vi.mock('@/components/shared/LoadingSpinner', () => ({
  LoadingSpinner: ({ className }: { className?: string }) => (
    <div data-testid="loading-spinner" className={className}>Loading...</div>
  )
}));

vi.mock('@/components/shared/Toast', () => ({
  Toast: ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
    <div data-testid="toast" data-type={type} onClick={onClose}>
      {message}
    </div>
  )
}));

describe('AIContentGenerator', () => {
  const mockDestination = {
    name: 'Barcelona',
    country: 'Spain',
    region: 'Catalonia',
    description: 'Beautiful city in Spain'
  };

  const mockOnContentGenerated = vi.fn();
  const mockOnError = vi.fn();

  const mockAIService = {
    getAvailableProviders: vi.fn(() => ['openai', 'claude']),
    generateContent: vi.fn(),
    generateBatchContent: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('Initialization', () => {
    it('should render with basic elements', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      expect(screen.getByText('AI Content Generator')).toBeInTheDocument();
      expect(screen.getByText('Generate comprehensive destination content using AI')).toBeInTheDocument();
      expect(screen.getByText('Generate Content')).toBeInTheDocument();
    });

    it('should show unavailable message when no providers are configured', () => {
      vi.mocked(aiGenerator.getAIContentGenerator).mockImplementation(() => {
        throw new Error('No AI providers configured');
      });

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      expect(screen.getByText('AI Service Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/configure AI service credentials/)).toBeInTheDocument();
    });

    it('should initialize with available providers', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      // Click options to expand
      fireEvent.click(screen.getByText('Options'));

      // Should show provider selection
      expect(screen.getByDisplayValue('Openai')).toBeInTheDocument();
    });
  });

  describe('Options Configuration', () => {
    it('should show and hide options panel', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      // Options should be hidden initially
      expect(screen.queryByText('Sections to Generate')).not.toBeInTheDocument();

      // Click to show options
      fireEvent.click(screen.getByText('Options'));
      expect(screen.getByText('Sections to Generate')).toBeInTheDocument();

      // Click to hide options
      fireEvent.click(screen.getByText('Options'));
      expect(screen.queryByText('Sections to Generate')).not.toBeInTheDocument();
    });

    it('should allow section selection', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      // Check overview section (should be checked by default)
      const overviewCheckbox = screen.getByLabelText('Overview');
      expect(overviewCheckbox).toBeChecked();

      // Check attractions section
      const attractionsCheckbox = screen.getByLabelText('Attractions');
      fireEvent.click(attractionsCheckbox);
      expect(attractionsCheckbox).toBeChecked();

      // Uncheck overview section
      fireEvent.click(overviewCheckbox);
      expect(overviewCheckbox).not.toBeChecked();
    });

    it('should allow target audience selection', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      const audienceSelect = screen.getByDisplayValue('Families');
      fireEvent.change(audienceSelect, { target: { value: 'couples' } });
      expect(audienceSelect.value).toBe('couples');
    });

    it('should allow content tone selection', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      const toneSelect = screen.getByDisplayValue('Informative');
      fireEvent.change(toneSelect, { target: { value: 'enthusiastic' } });
      expect(toneSelect.value).toBe('enthusiastic');
    });

    it('should allow custom prompt input', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      const customPrompt = screen.getByPlaceholderText(/Add any specific instructions/);
      fireEvent.change(customPrompt, { 
        target: { value: 'Focus on family-friendly activities' } 
      });
      expect(customPrompt.value).toBe('Focus on family-friendly activities');
    });
  });

  describe('Content Generation', () => {
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

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      const generateButton = screen.getByText('Generate Content');
      fireEvent.click(generateButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // Should show generated content
      await waitFor(() => {
        expect(screen.getByText('Generated Content')).toBeInTheDocument();
        expect(screen.getByText('Barcelona is a beautiful city')).toBeInTheDocument();
      });

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

    it('should handle generation errors', async () => {
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

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
          onError={mockOnError}
        />
      );

      const generateButton = screen.getByText('Generate Content');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('toast')).toBeInTheDocument();
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
      });

      expect(mockOnError).toHaveBeenCalledWith('API rate limit exceeded');
    });

    it('should validate destination information before generation', async () => {
      const incompleteDestination = {
        name: 'Barcelona',
        // Missing country and region
      };

      render(
        <AIContentGenerator
          destination={incompleteDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      const generateButton = screen.getByText('Generate Content');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Please fill in destination name, country, and region/)).toBeInTheDocument();
      });

      expect(mockAIService.generateContent).not.toHaveBeenCalled();
    });

    it('should disable generation when no sections are selected', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      // Uncheck the default overview section
      const overviewCheckbox = screen.getByLabelText('Overview');
      fireEvent.click(overviewCheckbox);

      const generateButton = screen.getByText('Generate Content');
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Batch Generation', () => {
    it('should perform batch generation', async () => {
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

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      // Select multiple sections
      fireEvent.click(screen.getByLabelText('Attractions'));

      const batchButton = screen.getByText('Batch Generate');
      fireEvent.click(batchButton);

      await waitFor(() => {
        expect(screen.getByText('Generated Content')).toBeInTheDocument();
      });

      expect(mockAIService.generateBatchContent).toHaveBeenCalled();
    });

    it('should handle partial failures in batch generation', async () => {
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

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));
      fireEvent.click(screen.getByLabelText('Attractions'));

      const batchButton = screen.getByText('Batch Generate');
      fireEvent.click(batchButton);

      await waitFor(() => {
        expect(screen.getByText(/Generated content for 1 section\(s\), 1 failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Content Preview and Editing', () => {
    beforeEach(async () => {
      const mockGeneratedContent = {
        overview: {
          title: 'Overview',
          content: '<p>Barcelona is amazing</p>',
          highlights: ['Sagrada Familia', 'Park Güell'],
          tips: ['Visit early', 'Book online']
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
    });

    it('should show generated content for review', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        expect(screen.getByText('Generated Content')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Barcelona is amazing')).toBeInTheDocument();
        expect(screen.getByText('Accept')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });
    });

    it('should allow accepting sections', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        const acceptButton = screen.getByText('Accept');
        fireEvent.click(acceptButton);
        expect(screen.getByText('✓ Accepted')).toBeInTheDocument();
      });
    });

    it('should allow rejecting sections', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        expect(screen.getByText('Generated Content')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.queryByText('Generated Content')).not.toBeInTheDocument();
      });
    });

    it('should allow editing content', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        expect(screen.getByText('Generated Content')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Overview');
        fireEvent.change(titleInput, { target: { value: 'Updated Overview' } });
        expect(titleInput.value).toBe('Updated Overview');
      });
    });

    it('should enable apply button only when sections are accepted', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        const applyButton = screen.getByText('Apply Selected Content');
        expect(applyButton).toBeDisabled();

        const acceptButton = screen.getByText('Accept');
        fireEvent.click(acceptButton);

        expect(applyButton).not.toBeDisabled();
      });
    });

    it('should apply accepted content', async () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        const acceptButton = screen.getByText('Accept');
        fireEvent.click(acceptButton);

        const applyButton = screen.getByText('Apply Selected Content');
        fireEvent.click(applyButton);
      });

      expect(mockOnContentGenerated).toHaveBeenCalled();
      expect(aiGenerator.processGeneratedContent).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      vi.mocked(aiGenerator.validateGeneratedContent).mockReturnValue({
        isValid: false,
        errors: ['Invalid content structure']
      });

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

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
          onError={mockOnError}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        expect(screen.getByText(/Generated content validation failed/)).toBeInTheDocument();
      });

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      mockAIService.generateContent.mockRejectedValue(new Error('Network error'));

      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
          onError={mockOnError}
        />
      );

      fireEvent.click(screen.getByText('Generate Content'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(mockOnError).toHaveBeenCalledWith('Network error');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      fireEvent.click(screen.getByText('Options'));

      // Check that form elements have proper labels
      expect(screen.getByLabelText('Overview')).toBeInTheDocument();
      expect(screen.getByLabelText('Attractions')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(
        <AIContentGenerator
          destination={mockDestination}
          onContentGenerated={mockOnContentGenerated}
        />
      );

      const generateButton = screen.getByText('Generate Content');
      generateButton.focus();
      expect(document.activeElement).toBe(generateButton);
    });
  });
});