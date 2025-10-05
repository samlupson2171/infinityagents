# AI Content Generation System

This document describes the AI-powered content generation system for destination management in the Infinity Weekends platform.

## Overview

The AI Content Generation system allows administrators to automatically generate comprehensive destination content using AI services like OpenAI GPT-4 or Anthropic Claude. The system provides structured prompts for different destination sections and includes content review and editing capabilities.

## Architecture

### Core Components

1. **AIContentGeneratorService** (`src/lib/ai-content-generator.ts`)
   - Main service class that handles AI provider integration
   - Supports multiple AI providers (OpenAI, Claude)
   - Provides content generation, validation, and processing utilities

2. **AIContentGenerator Component** (`src/components/admin/AIContentGenerator.tsx`)
   - React component for the admin interface
   - Provides generation options and content preview
   - Includes content review and editing functionality

3. **API Endpoint** (`src/app/api/admin/destinations/generate-content/route.ts`)
   - REST API for content generation requests
   - Handles authentication and validation
   - Supports both single and batch generation

## Features

### Content Generation Options

- **Target Audience**: families, young-adults, couples, solo-travelers, luxury, budget
- **Content Tone**: professional, casual, enthusiastic, informative
- **Content Length**: short, medium, long
- **AI Provider**: OpenAI, Claude (configurable)
- **Custom Prompts**: Additional instructions for content generation

### Supported Destination Sections

1. **Overview** - General destination introduction and highlights
2. **Accommodation** - Hotels, resorts, and lodging options
3. **Attractions** - Tourist sites, landmarks, and activities
4. **Beaches** - Beach information and water activities
5. **Nightlife** - Bars, clubs, and entertainment venues
6. **Dining** - Restaurants, local cuisine, and food culture
7. **Practical** - Travel tips, transportation, and logistics

### Content Review Workflow

1. **Generation** - AI generates content based on selected options
2. **Preview** - Content is displayed for review with highlights and tips
3. **Edit** - Administrators can modify generated content before acceptance
4. **Accept/Reject** - Individual sections can be accepted or rejected
5. **Apply** - Accepted content is merged into the destination

## Setup and Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Claude Configuration (optional)
CLAUDE_API_KEY=your_claude_api_key_here
```

### Installation

The AI content generation system is automatically available when the required environment variables are configured. No additional installation steps are required.

## Usage

### Basic Usage

```typescript
import { AIContentGenerator } from '@/components/admin/AIContentGenerator';

function DestinationEditor() {
  const [destination, setDestination] = useState({
    name: 'Barcelona',
    country: 'Spain',
    region: 'Catalonia'
  });

  const handleContentGenerated = (aiContent) => {
    setDestination(prev => ({
      ...prev,
      ...aiContent
    }));
  };

  return (
    <AIContentGenerator
      destination={destination}
      onContentGenerated={handleContentGenerated}
      onError={(error) => console.error(error)}
    />
  );
}
```

### API Usage

```typescript
// Generate content for specific sections
const response = await fetch('/api/admin/destinations/generate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    destinationName: 'Barcelona',
    country: 'Spain',
    region: 'Catalonia',
    sections: ['overview', 'attractions'],
    targetAudience: 'families',
    contentTone: 'informative',
    contentLength: 'medium',
    provider: 'openai'
  })
});

const data = await response.json();
```

### Batch Generation

```typescript
// Generate multiple sections in parallel
const response = await fetch('/api/admin/destinations/generate-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    destinationName: 'Barcelona',
    country: 'Spain',
    region: 'Catalonia',
    sections: ['overview', 'attractions', 'dining'],
    batchMode: true,
    provider: 'openai'
  })
});
```

## Content Structure

### Generated Content Format

Each generated section includes:

```typescript
interface GeneratedSection {
  title: string;           // Section title
  content: string;         // HTML formatted content
  highlights: string[];    // Key highlights array
  tips: string[];         // Practical tips array
}
```

### Example Generated Content

```json
{
  "overview": {
    "title": "Overview",
    "content": "<p>Barcelona is a vibrant Mediterranean city that seamlessly blends historic charm with modern innovation...</p>",
    "highlights": [
      "Iconic Sagrada Familia basilica",
      "Beautiful Mediterranean beaches",
      "Rich Catalan culture and cuisine"
    ],
    "tips": [
      "Visit early morning to avoid crowds",
      "Learn basic Catalan phrases",
      "Book popular attractions in advance"
    ]
  }
}
```

## Error Handling

### Common Errors

1. **Configuration Errors**
   - Missing API keys
   - Invalid provider configuration
   - Network connectivity issues

2. **Validation Errors**
   - Missing required fields (name, country, region)
   - Invalid section names
   - Malformed request data

3. **AI Service Errors**
   - Rate limiting
   - API quota exceeded
   - Service unavailable

### Error Recovery

- Automatic retry for transient errors
- Graceful degradation when AI services are unavailable
- Detailed error messages for troubleshooting
- Fallback to manual content creation

## Performance Considerations

### Optimization Strategies

1. **Caching**
   - Generated content can be cached to reduce API calls
   - Provider responses are cached for similar requests

2. **Rate Limiting**
   - Built-in rate limiting to prevent API abuse
   - Queue management for batch requests

3. **Token Management**
   - Token usage tracking and optimization
   - Content length controls to manage costs

### Best Practices

- Use batch generation for multiple sections
- Cache frequently requested content
- Monitor API usage and costs
- Implement proper error handling and fallbacks

## Security

### Access Control

- Admin-only access to AI generation features
- API key security and rotation
- Input validation and sanitization
- Audit logging for all generation requests

### Content Safety

- Content filtering for inappropriate material
- Review workflow before publication
- Manual override capabilities
- Content validation and quality checks

## Testing

### Unit Tests

```bash
# Run AI service tests
npm test src/lib/__tests__/ai-content-generator.test.ts

# Run component tests
npm test src/components/admin/__tests__/AIContentGenerator.test.tsx

# Run API tests
npm test src/app/api/admin/destinations/generate-content/__tests__/route.test.ts
```

### Integration Testing

The system includes comprehensive tests for:
- AI service integration
- Content generation workflows
- Error handling scenarios
- API endpoint functionality

## Monitoring and Analytics

### Metrics to Track

- Generation success/failure rates
- API response times
- Token usage and costs
- Content quality scores
- User adoption rates

### Logging

All AI generation requests are logged with:
- User information
- Request parameters
- Response metadata
- Error details
- Performance metrics

## Future Enhancements

### Planned Features

1. **Content Templates**
   - Pre-defined content templates for different destination types
   - Customizable prompt templates

2. **Quality Scoring**
   - Automatic content quality assessment
   - SEO optimization suggestions

3. **Multi-language Support**
   - Content generation in multiple languages
   - Translation capabilities

4. **Advanced Personalization**
   - User preference learning
   - Dynamic content adaptation

### Integration Opportunities

- Integration with existing CMS workflows
- Connection to analytics and performance data
- Integration with SEO optimization tools
- Connection to social media and marketing platforms

## Support and Troubleshooting

### Common Issues

1. **AI Service Not Available**
   - Check environment variables
   - Verify API key validity
   - Test network connectivity

2. **Poor Content Quality**
   - Adjust generation parameters
   - Use custom prompts for specific requirements
   - Review and edit generated content

3. **Performance Issues**
   - Monitor API rate limits
   - Use batch generation for efficiency
   - Implement caching strategies

### Getting Help

For technical support or questions about the AI content generation system:

1. Check the error logs for detailed error messages
2. Review the test suite for usage examples
3. Consult the API documentation for endpoint details
4. Contact the development team for advanced troubleshooting

## Conclusion

The AI Content Generation system provides a powerful tool for creating high-quality destination content efficiently. By leveraging advanced AI models and providing comprehensive review workflows, it enables administrators to scale content creation while maintaining quality and consistency.

The system is designed to be extensible and can be enhanced with additional features as requirements evolve. Regular monitoring and optimization ensure optimal performance and cost-effectiveness.