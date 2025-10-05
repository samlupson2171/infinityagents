# AI Content Generator Setup Guide

The destination admin management system includes an AI-powered content generator that can automatically create comprehensive destination content. This guide explains how to set it up.

## Prerequisites

You need an API key from one of the supported AI providers:

### OpenAI (Recommended)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key (it starts with `sk-`)

### Claude (Alternative)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Create a new API key
4. Copy the key

## Configuration

1. Open your `.env.local` file in the project root
2. Uncomment and update the appropriate API key:

```bash
# For OpenAI
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# OR for Claude
CLAUDE_API_KEY=your-claude-api-key-here
```

3. Restart your development server:
```bash
npm run dev
```

## Usage

Once configured, the AI content generator will be available in the destination admin interface:

1. Go to Admin → Destinations
2. Create a new destination or edit an existing one
3. In the content editor, click the "AI Generate" button
4. Configure your generation options:
   - **Sections**: Choose which content sections to generate
   - **Target Audience**: Select the intended audience (families, couples, etc.)
   - **Content Tone**: Choose the writing style (professional, casual, etc.)
   - **Content Length**: Select short, medium, or long content
   - **Custom Instructions**: Add specific requirements

5. Click "Generate Content" or "Batch Generate"
6. Review the generated content
7. Accept or reject individual sections
8. Edit content as needed
9. Apply the accepted content to your destination

## Features

### Content Sections
The AI can generate content for:
- **Overview**: General destination introduction
- **Accommodation**: Hotels, resorts, and lodging options
- **Attractions**: Tourist sites and activities
- **Beaches**: Beach descriptions and facilities
- **Nightlife**: Entertainment and venues
- **Dining**: Restaurants and local cuisine
- **Practical**: Travel tips and logistics

### Generation Options
- **Target Audiences**: Families, young adults, couples, solo travelers, luxury, budget
- **Content Tones**: Professional, casual, enthusiastic, informative
- **Content Lengths**: Short, medium, long
- **Custom Prompts**: Add specific instructions or requirements

### Quality Control
- Content preview before acceptance
- Individual section approval/rejection
- Inline editing capabilities
- Version history tracking
- AI generation metadata

## Troubleshooting

### "AI Service Unavailable" Message
- Check that your API key is correctly set in `.env.local`
- Ensure you've restarted the development server
- Verify your API key is valid and has sufficient credits

### Generation Fails
- Check your internet connection
- Verify your API key has sufficient credits/quota
- Try generating fewer sections at once
- Check the browser console for detailed error messages

### Poor Content Quality
- Adjust the target audience and content tone settings
- Use custom instructions to specify requirements
- Try different content length settings
- Edit the generated content before applying

## API Costs

Be aware that using AI content generation will consume API credits:
- OpenAI GPT-4: ~$0.03-0.06 per 1K tokens
- Claude: Varies by model and usage

Monitor your usage through your provider's dashboard to avoid unexpected charges.

## Security Notes

- Never commit your API keys to version control
- Keep your `.env.local` file private
- Regularly rotate your API keys
- Monitor API usage for unusual activity