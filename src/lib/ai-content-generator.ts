import { IDestination, IDestinationSection } from '@/models/Destination';

export interface AIGenerationRequest {
  destinationName: string;
  country: string;
  region: string;
  sections: string[]; // Which sections to generate
  targetAudience?:
    | 'families'
    | 'young-adults'
    | 'couples'
    | 'solo-travelers'
    | 'luxury'
    | 'budget';
  contentTone?: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  contentLength?: 'short' | 'medium' | 'long';
  existingContent?: Partial<IDestination>;
  customPrompt?: string;
}

export interface AIGenerationResponse {
  success: boolean;
  content: {
    [sectionName: string]: {
      title: string;
      content: string;
      highlights: string[];
      tips: string[];
    };
  };
  metadata: {
    model: string;
    tokensUsed: number;
    generationTime: number;
    confidence: number;
  };
  error?: string;
}

export interface AIProvider {
  name: string;
  generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse>;
}

// OpenAI Provider Implementation
class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateContent(
    request: AIGenerationRequest
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();

    try {
      const responses: { [key: string]: { title: string; content: string; highlights: string[]; tips: string[] } } = {};

      console.log('🔥 AI Generator processing sections:', request.sections);
      
      // Generate content for each requested section
      for (const section of request.sections) {
        try {
          const prompt = this.buildPrompt(section, request);
          console.log(`🎨 Generating content for section: ${section}`);
          console.log(`📝 Using prompt for ${section}:`, prompt.substring(0, 200) + '...');
          const response = await this.callOpenAI(prompt);
          console.log(`🤖 Raw OpenAI response for ${section}:`, response);
          responses[section] = this.parseResponse(response, section);
          console.log(`✅ Parsed response for ${section}:`, responses[section]);
          
          // Add a small delay between requests to avoid rate limiting
          if (request.sections.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (sectionError) {
          console.error(`Error generating content for section ${section}:`, sectionError);
          // Create a fallback response for this section
          responses[section] = {
            title: this.getDefaultTitle(section),
            content: `Content generation failed for ${section}. Please try again or add content manually.`,
            highlights: [],
            tips: []
          };
        }
      }

      const generationTime = Date.now() - startTime;

      return {
        success: true,
        content: responses,
        metadata: {
          model: this.model,
          tokensUsed: this.calculateTokens(responses),
          generationTime,
          confidence: 0.85, // Mock confidence score
        },
      };
    } catch (error) {
      return {
        success: false,
        content: {},
        metadata: {
          model: this.model,
          tokensUsed: 0,
          generationTime: Date.now() - startTime,
          confidence: 0,
        },
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildPrompt(section: string, request: AIGenerationRequest): string {
    console.log(`🔧 buildPrompt called with section: "${section}"`);
    
    const baseContext = `Generate travel content for ${request.destinationName} in ${request.region}, ${request.country}.`;
    const audienceContext = request.targetAudience
      ? `Target audience: ${request.targetAudience}.`
      : '';
    const toneContext = request.contentTone
      ? `Writing tone: ${request.contentTone}.`
      : '';
    const lengthContext = request.contentLength
      ? `Content length: ${request.contentLength}.`
      : '';

    const sectionPrompts = {
      overview: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create an engaging overview section that includes:
        - A compelling introduction to the destination
        - Key highlights and unique selling points
        - What makes this destination special
        - Brief mention of main attractions and experiences
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Overview",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      accommodation: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create detailed accommodation information including:
        - Types of accommodation available (hotels, resorts, apartments, etc.)
        - Best areas to stay with brief descriptions
        - Price ranges and booking considerations
        - Recommendations for different budgets and preferences
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Where to Stay",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      attractions: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create comprehensive attractions content including:
        - Must-see landmarks and tourist attractions
        - Cultural sites and museums
        - Natural attractions and scenic spots
        - Activities and experiences available
        - Opening hours and ticket information where relevant
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Top Attractions",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      beaches: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create detailed beach information including:
        - Best beaches in the area with descriptions
        - Beach facilities and amenities
        - Water sports and activities available
        - Beach safety and conditions
        - Recommendations for different preferences (family-friendly, party beaches, quiet spots)
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Beaches",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      nightlife: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create vibrant nightlife content including:
        - Popular bars, clubs, and entertainment venues
        - Different nightlife areas and their characteristics
        - Live music and entertainment options
        - Dress codes and entry requirements
        - Safety tips for nightlife
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Nightlife",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      dining: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create comprehensive dining information including:
        - Local cuisine and must-try dishes
        - Restaurant recommendations for different budgets
        - Popular dining areas and food markets
        - Dietary restrictions and vegetarian/vegan options
        - Dining customs and tipping etiquette
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Dining",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,

      practical: `${baseContext} ${audienceContext} ${toneContext} ${lengthContext}
        
        Create practical travel information including:
        - Transportation options (airport transfers, local transport)
        - Currency, payment methods, and tipping
        - Language and communication tips
        - Weather and best time to visit
        - Health and safety considerations
        - Local customs and etiquette
        
        IMPORTANT: Respond ONLY with valid JSON in this exact format:
        {
          "title": "Practical Information",
          "content": "HTML formatted content (use <p>, <strong>, <em> tags)",
          "highlights": ["highlight 1", "highlight 2", "highlight 3"],
          "tips": ["tip 1", "tip 2"]
        }
        
        Do not include any text before or after the JSON object.`,
    };

    const selectedPrompt = sectionPrompts[section as keyof typeof sectionPrompts];
    console.log(`🎯 Section "${section}" prompt found:`, !!selectedPrompt);
    
    if (!selectedPrompt) {
      console.log(`⚠️ No prompt found for section "${section}", falling back to overview`);
      console.log(`📋 Available sections:`, Object.keys(sectionPrompts));
    }
    
    return selectedPrompt || sectionPrompts.overview;
  }

  private async callOpenAI(prompt: string): Promise<any> {
    console.log('🚀 Calling OpenAI API with prompt length:', prompt.length);
    
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional travel content writer. Always respond with valid JSON in the exact format requested. Do not include any text before or after the JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    };
    
    console.log('📤 OpenAI request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log('📥 OpenAI API response data:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Invalid response structure from OpenAI API:', data);
      throw new Error('Invalid response structure from OpenAI API');
    }
    
    const content = data.choices[0].message.content;
    console.log('📝 Extracted content from OpenAI:', content);
    
    return content;
  }

  private parseResponse(response: string, section: string): any {
    if (!response || typeof response !== 'string') {
      console.warn(`Invalid response for section ${section}:`, response);
      return {
        title: this.getDefaultTitle(section),
        content: 'No content generated. Please try again.',
        highlights: [],
        tips: []
      };
    }

    console.log(`🔍 Parsing response for section ${section}:`, response.substring(0, 500) + '...');

    try {
      // Clean the response - sometimes AI adds extra text before/after JSON
      let cleanResponse = response.trim();
      
      // Remove any markdown code block markers
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      console.log(`🧹 Cleaned response for ${section}:`, cleanResponse.substring(0, 300) + '...');

      const parsed = JSON.parse(cleanResponse);
      console.log(`✅ Successfully parsed JSON for ${section}:`, parsed);
      
      // Ensure we have the required fields
      const result = {
        title: parsed.title || parsed.name || this.getDefaultTitle(section),
        content: parsed.content || parsed.text || parsed.description || '',
        highlights: [],
        tips: []
      };

      // Handle highlights - could be array or string
      if (Array.isArray(parsed.highlights)) {
        result.highlights = parsed.highlights;
      } else if (typeof parsed.highlights === 'string') {
        result.highlights = [parsed.highlights];
      } else if (Array.isArray(parsed.keyPoints)) {
        result.highlights = parsed.keyPoints;
      }

      // Handle tips - could be array or string
      if (Array.isArray(parsed.tips)) {
        result.tips = parsed.tips;
      } else if (typeof parsed.tips === 'string') {
        result.tips = [parsed.tips];
      } else if (Array.isArray(parsed.advice)) {
        result.tips = parsed.advice;
      }

      console.log(`🎯 Final result for ${section}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to parse AI response for section ${section}:`, error);
      console.error('Raw response:', response);
      
      // Enhanced fallback - try to extract meaningful content from the raw response
      let fallbackContent = '';
      let fallbackTitle = this.getDefaultTitle(section);
      
      // If the response looks like it might contain useful text, try to extract it
      if (response.length > 50) {
        // Remove common JSON artifacts and clean up the text
        let cleanText = response
          .replace(/[{}"\[\]]/g, ' ')  // Remove JSON characters
          .replace(/title:|content:|highlights:|tips:/gi, ' ')  // Remove field names
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();
        
        // If we have substantial text, use it
        if (cleanText.length > 20) {
          // Try to extract the first meaningful sentence or paragraph
          const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
          if (sentences.length > 0) {
            fallbackContent = sentences.slice(0, 3).join('. ').trim();
            if (!fallbackContent.endsWith('.')) {
              fallbackContent += '.';
            }
          } else {
            fallbackContent = cleanText.substring(0, 200) + (cleanText.length > 200 ? '...' : '');
          }
        }
      }
      
      // If we still don't have good content, provide a helpful message
      if (!fallbackContent || fallbackContent.length < 20) {
        fallbackContent = `Content generation for ${section} encountered an issue. The AI service returned data that couldn't be processed properly. Please try generating this section again or add content manually.`;
      }
      
      return {
        title: fallbackTitle,
        content: fallbackContent,
        highlights: [],
        tips: []
      };
    }
  }

  private getDefaultTitle(section: string): string {
    const titles = {
      overview: 'Overview',
      accommodation: 'Where to Stay',
      attractions: 'Top Attractions',
      beaches: 'Beaches',
      nightlife: 'Nightlife',
      dining: 'Dining',
      practical: 'Practical Information',
    };
    return titles[section as keyof typeof titles] || 'Information';
  }

  private calculateTokens(responses: { [key: string]: { title: string; content: string; highlights: string[]; tips: string[] } }): number {
    // Simple token estimation - in production, use proper token counting
    const totalContent = Object.values(responses)
      .map((r) => r.content + r.highlights.join(' ') + r.tips.join(' '))
      .join(' ');
    return Math.ceil(totalContent.length / 4); // Rough estimation
  }
}

// Claude Provider Implementation (placeholder)
class ClaudeProvider implements AIProvider {
  name = 'Claude';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(
    request: AIGenerationRequest
  ): Promise<AIGenerationResponse> {
    // Placeholder implementation - would integrate with Anthropic's Claude API
    throw new Error('Claude provider not yet implemented');
  }
}

// Main AI Content Generator Service
export class AIContentGeneratorService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string = '';

  constructor() {
    // Initialize providers based on available API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;

    if (openaiKey) {
      this.providers.set('openai', new OpenAIProvider(openaiKey));
      this.defaultProvider = 'openai';
    }

    if (claudeKey) {
      this.providers.set('claude', new ClaudeProvider(claudeKey));
      if (!this.defaultProvider) {
        this.defaultProvider = 'claude';
      }
    }

    if (this.providers.size === 0) {
      throw new Error(
        'No AI providers configured. Please set OPENAI_API_KEY or CLAUDE_API_KEY environment variables.'
      );
    }
  }

  async generateContent(
    request: AIGenerationRequest,
    providerName?: string
  ): Promise<AIGenerationResponse> {
    const selectedProvider = providerName || this.defaultProvider;
    if (!selectedProvider) {
      throw new Error('No AI provider available');
    }
    const provider = this.providers.get(selectedProvider);

    if (!provider) {
      throw new Error(
        `Provider ${providerName || this.defaultProvider} not found`
      );
    }

    // Validate request
    this.validateRequest(request);

    return await provider.generateContent(request);
  }

  async generateBatchContent(
    requests: AIGenerationRequest[],
    providerName?: string
  ): Promise<AIGenerationResponse[]> {
    const provider = this.providers.get(providerName || this.defaultProvider);

    if (!provider) {
      throw new Error(
        `Provider ${providerName || this.defaultProvider} not found`
      );
    }

    // Process requests in parallel with rate limiting
    const results = await Promise.allSettled(
      requests.map((request) => provider.generateContent(request))
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            content: {},
            metadata: {
              model: 'unknown',
              tokensUsed: 0,
              generationTime: 0,
              confidence: 0,
            },
            error: result.reason?.message || 'Generation failed',
          }
    );
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  private validateRequest(request: AIGenerationRequest): void {
    if (!request.destinationName?.trim()) {
      throw new Error('Destination name is required');
    }
    if (!request.country?.trim()) {
      throw new Error('Country is required');
    }
    if (!request.region?.trim()) {
      throw new Error('Region is required');
    }
    if (!request.sections || request.sections.length === 0) {
      throw new Error('At least one section must be specified');
    }

    const validSections = [
      'overview',
      'accommodation',
      'attractions',
      'beaches',
      'nightlife',
      'dining',
      'practical',
    ];
    const invalidSections = request.sections.filter(
      (section) => !validSections.includes(section)
    );
    if (invalidSections.length > 0) {
      throw new Error(`Invalid sections: ${invalidSections.join(', ')}`);
    }
  }
}

// Singleton instance
let aiGeneratorInstance: AIContentGeneratorService | null = null;

export function getAIContentGenerator(): AIContentGeneratorService {
  if (!aiGeneratorInstance) {
    aiGeneratorInstance = new AIContentGeneratorService();
  }
  return aiGeneratorInstance;
}

// Utility functions for content processing
export function processGeneratedContent(
  generatedContent: AIGenerationResponse,
  existingDestination?: Partial<IDestination>
): Partial<IDestination> {
  if (!generatedContent.success) {
    throw new Error(generatedContent.error || 'Content generation failed');
  }

  const sections: any = {};

  Object.entries(generatedContent.content).forEach(
    ([sectionName, sectionData]) => {
      sections[sectionName] = {
        title: sectionData.title,
        content: sectionData.content,
        highlights: sectionData.highlights,
        tips: sectionData.tips,
        lastModified: new Date(),
        aiGenerated: true,
      };
    }
  );

  return {
    ...existingDestination,
    sections: {
      ...existingDestination?.sections,
      ...sections,
    },
    aiGenerated: true,
    aiGenerationDate: new Date(),
  };
}

export function validateGeneratedContent(content: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  console.log('Validating generated content:', content);

  if (!content || typeof content !== 'object') {
    errors.push('Content must be an object');
    console.log('Validation failed: Content is not an object');
    return { isValid: false, errors };
  }

  // Check if we have at least one section
  if (Object.keys(content).length === 0) {
    errors.push('Content must contain at least one section');
    console.log('Validation failed: No sections found');
    return { isValid: false, errors };
  }

  Object.entries(content).forEach(
    ([sectionName, sectionData]: [string, any]) => {
      console.log(`Validating section ${sectionName}:`, sectionData);
      
      if (!sectionData || typeof sectionData !== 'object') {
        errors.push(`Section ${sectionName} must be an object`);
        console.log(`Section ${sectionName} is not an object:`, typeof sectionData);
        return;
      }

      // Title is required
      if (!sectionData.title || typeof sectionData.title !== 'string') {
        errors.push(`Section ${sectionName} must have a valid title`);
        console.log(`Section ${sectionName} missing title:`, sectionData.title);
      }

      // Content is required
      if (!sectionData.content || typeof sectionData.content !== 'string') {
        errors.push(`Section ${sectionName} must have valid content`);
        console.log(`Section ${sectionName} missing content:`, sectionData.content);
      }

      // Highlights and tips are optional, but if present, must be arrays
      if (sectionData.highlights !== undefined && !Array.isArray(sectionData.highlights)) {
        errors.push(`Section ${sectionName} highlights must be an array if provided`);
        console.log(`Section ${sectionName} highlights not array:`, sectionData.highlights);
      }

      if (sectionData.tips !== undefined && !Array.isArray(sectionData.tips)) {
        errors.push(`Section ${sectionName} tips must be an array if provided`);
        console.log(`Section ${sectionName} tips not array:`, sectionData.tips);
      }
    }
  );

  console.log('Validation result:', { isValid: errors.length === 0, errors });
  return { isValid: errors.length === 0, errors };
}
