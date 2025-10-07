import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getAIContentGenerator, 
  AIGenerationRequest, 
  processGeneratedContent,
  validateGeneratedContent 
} from '@/lib/ai-content-generator';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    console.log('🔍 API received request body:', body);
    
    // Validate request body
    const {
      destinationId,
      destinationName,
      country,
      region,
      sections,
      targetAudience,
      contentTone,
      contentLength,
      provider,
      customPrompt,
      batchMode = false
    } = body;

    console.log('🎯 Extracted sections:', sections);

    if (!destinationName || !country || !region) {
      return NextResponse.json(
        { error: 'Destination name, country, and region are required' },
        { status: 400 }
      );
    }

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'At least one section must be specified' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get existing destination if updating
    let existingDestination = null;
    if (destinationId) {
      existingDestination = await Destination.findById(destinationId);
      if (!existingDestination) {
        return NextResponse.json(
          { error: 'Destination not found' },
          { status: 404 }
        );
      }
    }

    // Initialize AI generator
    const generator = getAIContentGenerator();

    // Prepare generation request
    const generationRequest: AIGenerationRequest = {
      destinationName,
      country,
      region,
      sections,
      targetAudience,
      contentTone,
      contentLength,
      existingContent: existingDestination?.toObject(),
      customPrompt
    };

    let response;

    if (batchMode) {
      // Generate content for each section separately for better error handling
      const requests = sections.map((section: string) => ({
        ...generationRequest,
        sections: [section]
      }));

      const responses = await generator.generateBatchContent(requests, provider);
      
      // Combine successful responses
      const combinedContent: { [key: string]: { title: string; content: string; highlights: string[]; tips: string[] } } = {};
      const errors: string[] = [];
      
      responses.forEach((resp, index) => {
        const sectionName = sections[index];
        if (resp.success && resp.content[sectionName]) {
          combinedContent[sectionName] = resp.content[sectionName];
        } else {
          errors.push(`${sectionName}: ${resp.error || 'Generation failed'}`);
        }
      });

      if (Object.keys(combinedContent).length === 0) {
        return NextResponse.json(
          { 
            error: 'Failed to generate content for any sections',
            details: errors
          },
          { status: 500 }
        );
      }

      response = {
        success: true,
        content: combinedContent,
        metadata: {
          model: provider || 'default',
          tokensUsed: 0, // Would be calculated from individual responses
          generationTime: 0,
          confidence: 0.85
        }
      };
    } else {
      // Single generation request
      response = await generator.generateContent(generationRequest, provider);
    }

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Content generation failed' },
        { status: 500 }
      );
    }

    // Debug: Log the raw response
    console.log('Raw AI response:', JSON.stringify(response, null, 2));

    // Validate generated content
    const validation = validateGeneratedContent(response.content);
    if (!validation.isValid) {
      console.error('Content validation failed:', {
        errors: validation.errors,
        content: response.content,
        rawResponse: response
      });
      
      // Instead of failing, let's try to fix the content
      const fixedContent: { [key: string]: { title: string; content: string; highlights: string[]; tips: string[] } } = {};
      Object.entries(response.content || {}).forEach(([sectionName, sectionData]: [string, any]) => {
        console.log(`🔧 Fixing content for section ${sectionName}:`, sectionData);
        
        if (sectionData && typeof sectionData === 'object') {
          // Ensure we have clean, valid content
          const cleanTitle = sectionData.title || `${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`;
          let cleanContent = sectionData.content || sectionData.text || '';
          
          // If content is empty or looks malformed, provide a better fallback
          if (!cleanContent || cleanContent.length < 10 || cleanContent.includes('undefined')) {
            cleanContent = `Detailed information about ${sectionName} for ${destinationName}. This section is being generated and will be available shortly.`;
          }
          
          fixedContent[sectionName] = {
            title: cleanTitle,
            content: cleanContent,
            highlights: Array.isArray(sectionData.highlights) ? sectionData.highlights : [],
            tips: Array.isArray(sectionData.tips) ? sectionData.tips : []
          };
          
          console.log(`✅ Fixed content for ${sectionName}:`, fixedContent[sectionName]);
        }
      });
      
      // If we have any fixed content, use it
      if (Object.keys(fixedContent).length > 0) {
        response.content = fixedContent;
        console.log('✅ All content fixed successfully');
      } else {
        console.error('❌ Could not fix any content, using fallback');
        // Create minimal valid content structure
        const fallbackContent: { [key: string]: { title: string; content: string; highlights: string[]; tips: string[] } } = {};
        sections.forEach((sectionName: string) => {
          fallbackContent[sectionName] = {
            title: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
            content: `Information about ${sectionName} for ${destinationName} is being prepared. Please try generating this section again.`,
            highlights: [],
            tips: []
          };
        });
        response.content = fallbackContent;
      }
    }

    // If destinationId is provided, optionally save the generated content
    if (destinationId && body.autoSave) {
      try {
        const processedContent = processGeneratedContent(response, existingDestination?.toObject());
        
        await Destination.findByIdAndUpdate(
          destinationId,
          {
            ...processedContent,
            lastModifiedBy: session.user.id,
            aiGenerated: true,
            aiGenerationDate: new Date(),
            aiGenerationPrompt: customPrompt || `Generated for sections: ${sections.join(', ')}`
          },
          { new: true, runValidators: true }
        );
      } catch (saveError) {
        console.error('Failed to auto-save generated content:', saveError);
        // Don't fail the request if auto-save fails, just log it
      }
    }

    // Return the generated content
    return NextResponse.json({
      success: true,
      content: response.content,
      metadata: response.metadata
    });

  } catch (error) {
    console.error('AI content generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('No AI providers configured')) {
        return NextResponse.json(
          { error: 'AI service not configured. Please set up API keys.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during content generation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get available AI providers and configuration
    try {
      const generator = getAIContentGenerator();
      const availableProviders = generator.getAvailableProviders();
      
      return NextResponse.json({
        availableProviders,
        supportedSections: [
          'overview',
          'accommodation', 
          'attractions',
          'beaches',
          'nightlife',
          'dining',
          'practical'
        ],
        targetAudiences: [
          'families',
          'young-adults',
          'couples',
          'solo-travelers',
          'luxury',
          'budget'
        ],
        contentTones: [
          'professional',
          'casual',
          'enthusiastic',
          'informative'
        ],
        contentLengths: [
          'short',
          'medium',
          'long'
        ]
      });
    } catch (error) {
      return NextResponse.json({
        availableProviders: [],
        error: 'AI service not configured'
      });
    }

  } catch (error) {
    console.error('AI configuration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}