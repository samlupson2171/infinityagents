import { MongoClient, Db } from 'mongodb';

export interface Migration {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

export const migration002: Migration = {
  version: 2,
  name: 'create-destinations-collection',
  
  async up(db: Db): Promise<void> {
    console.log('Running migration: Create destinations collection');
    
    // Create destinations collection
    const destinationsCollection = db.collection('destinations');
    
    // Create indexes for performance optimization
    await Promise.all([
      // Unique index for slug
      destinationsCollection.createIndex({ slug: 1 }, { unique: true }),
      
      // Compound index for status and publishedAt (for listing published destinations)
      destinationsCollection.createIndex({ status: 1, publishedAt: -1 }),
      
      // Compound index for country and region (for filtering)
      destinationsCollection.createIndex({ country: 1, region: 1 }),
      
      // Index for creator (for admin filtering)
      destinationsCollection.createIndex({ createdBy: 1 }),
      
      // Index for last modifier (for audit purposes)
      destinationsCollection.createIndex({ lastModifiedBy: 1 }),
      
      // Index for scheduled publishing
      destinationsCollection.createIndex({ scheduledPublishAt: 1 }),
      
      // Index for AI generated content filtering
      destinationsCollection.createIndex({ aiGenerated: 1 }),
      
      // Index for quick facts country (for geographical filtering)
      destinationsCollection.createIndex({ 'quickFacts.country': 1 }),
      
      // Index for keywords (for SEO and search)
      destinationsCollection.createIndex({ keywords: 1 }),
      
      // Text search index for full-text search across content
      destinationsCollection.createIndex({
        name: 'text',
        description: 'text',
        'sections.overview.content': 'text',
        'sections.accommodation.content': 'text',
        'sections.attractions.content': 'text',
        'sections.beaches.content': 'text',
        'sections.nightlife.content': 'text',
        'sections.dining.content': 'text',
        'sections.practical.content': 'text'
      }, {
        name: 'destinations_text_search',
        weights: {
          name: 10,
          description: 5,
          'sections.overview.content': 3,
          'sections.accommodation.content': 1,
          'sections.attractions.content': 1,
          'sections.beaches.content': 1,
          'sections.nightlife.content': 1,
          'sections.dining.content': 1,
          'sections.practical.content': 1
        }
      })
    ]);
    
    // Create a sample destination for testing (optional)
    const sampleDestination = {
      name: 'Benidorm',
      slug: 'benidorm',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A vibrant coastal resort town known for its stunning beaches, towering skyscrapers, and exciting nightlife.',
      metaTitle: 'Benidorm - Costa Blanca Beach Resort | Infinity Weekends',
      metaDescription: 'Discover Benidorm\'s beautiful beaches, vibrant nightlife, and endless entertainment. Book your perfect Costa Blanca getaway today.',
      keywords: ['benidorm', 'costa blanca', 'spain', 'beach', 'nightlife', 'resort'],
      gradientColors: 'from-blue-600 to-orange-500',
      sections: {
        overview: {
          title: 'Overview',
          content: '<p>Benidorm is a spectacular resort destination on Spain\'s Costa Blanca, famous for its golden beaches, modern skyline, and vibrant atmosphere.</p>',
          highlights: ['Two beautiful main beaches', 'Modern skyline with high-rise hotels', 'Year-round entertainment'],
          tips: ['Visit during shoulder season for better prices', 'Book restaurants in advance during peak season'],
          lastModified: new Date(),
          aiGenerated: false
        },
        accommodation: {
          title: 'Accommodation',
          content: '<p>Benidorm offers a wide range of accommodation options from luxury beachfront hotels to budget-friendly apartments.</p>',
          highlights: ['Beachfront luxury hotels', 'Self-catering apartments', 'All-inclusive resorts'],
          tips: ['Book early for sea view rooms', 'Consider location based on your priorities'],
          lastModified: new Date(),
          aiGenerated: false
        },
        attractions: {
          title: 'Attractions',
          content: '<p>Beyond the beaches, Benidorm offers theme parks, cultural sites, and natural attractions for all ages.</p>',
          highlights: ['Terra Mítica theme park', 'Benidorm Island boat trips', 'Old Town charm'],
          tips: ['Buy theme park tickets online for discounts', 'Explore the old town in the evening'],
          lastModified: new Date(),
          aiGenerated: false
        },
        beaches: {
          title: 'Beaches',
          content: '<p>Benidorm\'s two main beaches, Levante and Poniente, offer different atmospheres and excellent facilities.</p>',
          highlights: ['Levante Beach - lively and energetic', 'Poniente Beach - more relaxed', 'Blue Flag certified'],
          tips: ['Arrive early to secure good spots', 'Try water sports at both beaches'],
          lastModified: new Date(),
          aiGenerated: false
        },
        nightlife: {
          title: 'Nightlife',
          content: '<p>Benidorm is renowned for its incredible nightlife scene with something for everyone from quiet bars to mega-clubs.</p>',
          highlights: ['British-style pubs', 'Spanish tapas bars', 'International nightclubs'],
          tips: ['Pre-drink at hotel bars', 'Nightlife starts late in Spain'],
          lastModified: new Date(),
          aiGenerated: false
        },
        dining: {
          title: 'Dining',
          content: '<p>The dining scene in Benidorm is incredibly diverse, offering everything from traditional Spanish cuisine to international favorites.</p>',
          highlights: ['Fresh seafood restaurants', 'Traditional tapas bars', 'International cuisine'],
          tips: ['Try local paella restaurants', 'Book popular restaurants in advance'],
          lastModified: new Date(),
          aiGenerated: false
        },
        practical: {
          title: 'Practical Information',
          content: '<p>Essential information for planning your trip to Benidorm including transport, currency, and local customs.</p>',
          highlights: ['Easy airport transfers', 'Euro currency', 'English widely spoken'],
          tips: ['Keep receipts for tax-free shopping', 'Tipping is appreciated but not mandatory'],
          lastModified: new Date(),
          aiGenerated: false
        }
      },
      quickFacts: {
        population: '70,000',
        language: 'Spanish (English widely spoken)',
        currency: 'Euro (EUR)',
        timeZone: 'CET (UTC+1)',
        airport: 'Alicante Airport (ALC)',
        flightTime: '2.5 hours from UK',
        climate: 'Mediterranean',
        bestTime: 'April to October'
      },
      status: 'draft',
      aiGenerated: false,
      relatedOffers: [],
      relatedActivities: [],
      createdBy: null, // Will be set when actual admin creates destinations
      lastModifiedBy: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Only insert sample if no destinations exist
    const existingCount = await destinationsCollection.countDocuments();
    if (existingCount === 0) {
      console.log('Inserting sample destination for testing');
      // Note: In production, this would be created through the admin interface
      // await destinationsCollection.insertOne(sampleDestination);
    }
    
    console.log('Migration completed: Destinations collection created with indexes');
  },
  
  async down(db: Db): Promise<void> {
    console.log('Rolling back migration: Drop destinations collection');
    
    // Drop the entire destinations collection
    await db.collection('destinations').drop();
    
    console.log('Migration rolled back: Destinations collection dropped');
  }
};