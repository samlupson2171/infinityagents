// Simple test script to verify AI content generation
const fetch = require('node-fetch');

async function testAIGeneration() {
  try {
    console.log('🧪 Testing AI Content Generation...');
    
    // Test the GET endpoint first to check if AI service is available
    const configResponse = await fetch('http://localhost:3002/api/admin/destinations/generate-content');
    const configData = await configResponse.json();
    
    console.log('📋 Available providers:', configData.availableProviders);
    
    if (!configData.availableProviders || configData.availableProviders.length === 0) {
      console.log('❌ No AI providers available. Check your API keys.');
      return;
    }
    
    // Test content generation
    const testRequest = {
      destinationName: 'Test Destination',
      country: 'Spain',
      region: 'Costa del Sol',
      sections: ['overview', 'accommodation'],
      targetAudience: 'families',
      contentTone: 'informative',
      contentLength: 'medium',
      provider: configData.availableProviders[0],
      batchMode: false
    };
    
    console.log('🚀 Testing content generation with:', testRequest);
    
    const response = await fetch('http://localhost:3002/api/admin/destinations/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Content generation successful!');
      console.log('📝 Generated sections:', Object.keys(data.content));
      
      // Check each section
      Object.entries(data.content).forEach(([sectionName, sectionData]) => {
        console.log(`\n📄 Section: ${sectionName}`);
        console.log(`   Title: ${sectionData.title}`);
        console.log(`   Content length: ${sectionData.content.length} characters`);
        console.log(`   Highlights: ${sectionData.highlights.length} items`);
        console.log(`   Tips: ${sectionData.tips.length} items`);
        
        // Check for the problematic concatenated text
        if (sectionData.content.includes('EditAcceptReject') || 
            sectionData.content === 'Content generated but needs review.') {
          console.log('⚠️  Found problematic content in', sectionName);
        }
      });
    } else {
      console.log('❌ Content generation failed:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testAIGeneration();
}

module.exports = { testAIGeneration };