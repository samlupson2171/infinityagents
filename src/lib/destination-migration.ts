import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';

// Legacy destination data structure
interface LegacyDestination {
  id: string;
  name: string;
  country: string;
  region: string;
  image?: string;
  description: string;
  highlights: string[];
  climate: string;
  bestTime: string;
  flightTime: string;
  population?: string;
  language?: string;
  currency?: string;
  timeZone?: string;
  airport?: string;
}

// Sample legacy destinations data
const legacyDestinations: LegacyDestination[] = [
  {
    id: 'benidorm',
    name: 'Benidorm',
    country: 'Spain',
    region: 'Costa Blanca',
    image: '/destinations/benidorm-hero.jpg',
    description: "The vibrant resort town on Spain's Costa Blanca, famous for its stunning beaches, exciting nightlife, and year-round sunshine.",
    highlights: [
      'Levante Beach',
      'Poniente Beach', 
      'Terra Mítica Theme Park',
      'Benidorm Palace',
      'Old Town',
    ],
    climate: 'Mediterranean with 300+ days of sunshine',
    bestTime: 'April to October',
    flightTime: '2.5 hours from UK',
    population: '70,000',
    language: 'Spanish, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'CET (GMT+1)',
    airport: 'Alicante (ALC) - 60km'
  },
  {
    id: 'albufeira',
    name: 'Albufeira',
    country: 'Portugal',
    region: 'Algarve',
    image: '/destinations/albufeira-hero.jpg',
    description: "Portugal's premier beach destination in the heart of the Algarve, offering golden beaches, charming old town, and vibrant nightlife.",
    highlights: [
      'Praia da Falésia',
      'Old Town Square',
      'Zoomarine',
      'Strip (nightlife area)',
      "Fisherman's Beach",
    ],
    climate: 'Mediterranean with mild winters',
    bestTime: 'May to September',
    flightTime: '2.5 hours from UK',
    population: '40,000',
    language: 'Portuguese, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'WET (GMT+0)',
    airport: 'Faro (FAO) - 45km'
  },
  {
    id: 'magaluf',
    name: 'Magaluf',
    country: 'Spain',
    region: 'Balearic Islands',
    image: '/destinations/magaluf-hero.jpg',
    description: "Mallorca's most famous party destination, offering beautiful beaches, world-class nightlife, and endless entertainment for young adults.",
    highlights: [
      'Magaluf Beach',
      'BCM Planet Dance',
      'Katmandu Park',
      'Pirates Adventure',
      'Western Water Park',
    ],
    climate: 'Mediterranean with hot summers',
    bestTime: 'May to October',
    flightTime: '2 hours from UK',
    population: '4,000',
    language: 'Spanish, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'CET (GMT+1)',
    airport: 'Palma (PMI) - 20km'
  },
  {
    id: 'ayia-napa',
    name: 'Ayia Napa',
    country: 'Cyprus',
    region: 'Cyprus',
    image: '/destinations/ayia-napa-hero.jpg',
    description: "Cyprus's premier resort destination, famous for crystal-clear waters, golden beaches, and legendary nightlife scene.",
    highlights: [
      'Nissi Beach',
      'Fig Tree Bay',
      'Cape Greco',
      'Ayia Napa Monastery',
      'WaterWorld Waterpark',
    ],
    climate: 'Mediterranean with year-round sunshine',
    bestTime: 'April to November',
    flightTime: '4.5 hours from UK',
    population: '3,000',
    language: 'Greek, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'EET (GMT+2)',
    airport: 'Larnaca (LCA) - 45km'
  },
  {
    id: 'zante',
    name: 'Zante',
    country: 'Greece',
    region: 'Greek Islands',
    image: '/destinations/zante-hero.jpg',
    description: 'The stunning Greek island of Zakynthos, home to the famous Shipwreck Beach, crystal-clear waters, and vibrant nightlife.',
    highlights: [
      'Shipwreck Beach',
      'Blue Caves',
      'Laganas Beach',
      'Zakynthos Town',
      'Turtle Spotting',
    ],
    climate: 'Mediterranean with warm summers',
    bestTime: 'May to October',
    flightTime: '3.5 hours from UK',
    population: '40,000',
    language: 'Greek, English widely spoken',
    currency: 'Euro (EUR)',
    timeZone: 'EET (GMT+2)',
    airport: 'Zakynthos (ZTH) - 5km'
  },
];

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Generate gradient colors based on region
function generateGradientColors(region: string): string {
  const gradients: { [key: string]: string } = {
    'costa blanca': 'from-blue-500 to-orange-400',
    'algarve': 'from-orange-400 to-red-500',
    'balearic islands': 'from-purple-500 to-pink-400',
    'cyprus': 'from-teal-400 to-blue-500',
    'greek islands': 'from-blue-600 to-indigo-500'
  };
  
  return gradients[region.toLowerCase()] || 'from-blue-600 to-orange-500';
}

// Generate sample content for sections
function generateSectionContent(destination: LegacyDestination, sectionType: string): any {
  const baseContent = {
    title: '',
    content: '',
    highlights: [],
    tips: [],
    images: [],
    lastModified: new Date(),
    aiGenerated: false
  };

  switch (sectionType) {
    case 'overview':
      return {
        ...baseContent,
        title: 'Overview',
        content: `<p>${destination.description}</p><p>${destination.name} offers the perfect blend of beautiful beaches, exciting attractions, and vibrant culture, making it an ideal destination for travelers seeking both relaxation and adventure.</p>`,
        highlights: destination.highlights.slice(0, 3),
        tips: [
          `Best visited during ${destination.bestTime}`,
          'Book accommodation early during peak season',
          'Learn a few local phrases to enhance your experience'
        ]
      };
      
    case 'accommodation':
      return {
        ...baseContent,
        title: 'Hotels & Accommodation',
        content: `<p>${destination.name} offers a wide range of accommodation options to suit every budget and preference. From luxury beachfront resorts to budget-friendly hotels, you'll find the perfect place to stay.</p>`,
        highlights: [
          'Beachfront luxury resorts',
          'Budget-friendly hotels',
          'All-inclusive options available'
        ],
        tips: [
          'Book early for better rates',
          'Consider all-inclusive packages',
          'Check proximity to main attractions'
        ]
      };
      
    case 'attractions':
      return {
        ...baseContent,
        title: 'Attractions & Activities',
        content: `<p>Discover the amazing attractions and activities that make ${destination.name} a must-visit destination. From cultural sites to thrilling adventures, there's something for everyone.</p>`,
        highlights: destination.highlights,
        tips: [
          'Purchase attraction tickets online for discounts',
          'Plan your itinerary to avoid crowds',
          'Check opening hours and seasonal availability'
        ]
      };
      
    case 'beaches':
      return {
        ...baseContent,
        title: 'Beaches',
        content: `<p>The stunning beaches of ${destination.name} are among the best in the region. With crystal-clear waters and golden sand, they provide the perfect setting for relaxation and water sports.</p>`,
        highlights: [
          'Crystal-clear waters',
          'Golden sandy beaches',
          'Water sports available',
          'Beach bars and restaurants'
        ],
        tips: [
          'Arrive early to secure the best spots',
          'Bring sun protection',
          'Try local water sports activities'
        ]
      };
      
    case 'nightlife':
      return {
        ...baseContent,
        title: 'Nightlife & Entertainment',
        content: `<p>${destination.name} comes alive after dark with an incredible nightlife scene. From beach bars to world-class clubs, the entertainment options are endless.</p>`,
        highlights: [
          'World-class nightclubs',
          'Beach bars with sunset views',
          'Live music venues',
          'Late-night dining options'
        ],
        tips: [
          'Pre-drink at beach bars for better prices',
          'Dress codes may apply at upscale venues',
          'Stay safe and drink responsibly'
        ]
      };
      
    case 'dining':
      return {
        ...baseContent,
        title: 'Dining & Cuisine',
        content: `<p>Experience the incredible culinary scene in ${destination.name}. From traditional local dishes to international cuisine, the dining options will satisfy every palate.</p>`,
        highlights: [
          'Fresh seafood specialties',
          'Traditional local cuisine',
          'International dining options',
          'Beachfront restaurants'
        ],
        tips: [
          'Try the local seafood specialties',
          'Make reservations for popular restaurants',
          'Explore local markets for authentic experiences'
        ]
      };
      
    case 'practical':
      return {
        ...baseContent,
        title: 'Practical Information',
        content: `<p>Everything you need to know for planning your trip to ${destination.name}. From transportation to local customs, we've got you covered.</p>`,
        highlights: [
          'Easy airport transfers available',
          'Good public transportation',
          'English widely spoken',
          'Tourist-friendly infrastructure'
        ],
        tips: [
          'Keep copies of important documents',
          'Learn about local customs and etiquette',
          'Download offline maps and translation apps'
        ]
      };
      
    default:
      return baseContent;
  }
}

// Convert legacy destination to new format
function convertLegacyDestination(legacy: LegacyDestination, userId: string = 'migration-script') {
  const slug = generateSlug(legacy.name);
  
  return {
    name: legacy.name,
    slug,
    country: legacy.country,
    region: legacy.region,
    description: legacy.description,
    heroImage: legacy.image,
    gradientColors: generateGradientColors(legacy.region),
    sections: {
      overview: generateSectionContent(legacy, 'overview'),
      accommodation: generateSectionContent(legacy, 'accommodation'),
      attractions: generateSectionContent(legacy, 'attractions'),
      beaches: generateSectionContent(legacy, 'beaches'),
      nightlife: generateSectionContent(legacy, 'nightlife'),
      dining: generateSectionContent(legacy, 'dining'),
      practical: generateSectionContent(legacy, 'practical')
    },
    quickFacts: {
      population: legacy.population,
      language: legacy.language,
      currency: legacy.currency,
      timeZone: legacy.timeZone,
      airport: legacy.airport,
      flightTime: legacy.flightTime,
      climate: legacy.climate,
      bestTime: legacy.bestTime
    },
    status: 'published',
    aiGenerated: false,
    createdBy: userId,
    lastModifiedBy: userId,
    publishedAt: new Date()
  };
}

// Migration function
export async function migrateDestinations(userId: string = 'migration-script') {
  try {
    await connectToDatabase();
    
    console.log('Starting destination migration...');
    
    const results = [];
    
    for (const legacy of legacyDestinations) {
      try {
        // Check if destination already exists
        const existing = await Destination.findOne({ slug: generateSlug(legacy.name) });
        
        if (existing) {
          console.log(`Destination ${legacy.name} already exists, skipping...`);
          results.push({ name: legacy.name, status: 'skipped', reason: 'already exists' });
          continue;
        }
        
        // Convert and create new destination
        const destinationData = convertLegacyDestination(legacy, userId);
        const destination = new Destination(destinationData);
        
        await destination.save();
        
        console.log(`Successfully migrated ${legacy.name}`);
        results.push({ name: legacy.name, status: 'success', id: destination._id });
        
      } catch (error) {
        console.error(`Error migrating ${legacy.name}:`, error);
        results.push({ name: legacy.name, status: 'error', error: error.message });
      }
    }
    
    console.log('Migration completed!');
    return results;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Rollback function
export async function rollbackMigration() {
  try {
    await connectToDatabase();
    
    console.log('Starting migration rollback...');
    
    const slugs = legacyDestinations.map(d => generateSlug(d.name));
    const result = await Destination.deleteMany({ slug: { $in: slugs } });
    
    console.log(`Rollback completed. Deleted ${result.deletedCount} destinations.`);
    return result;
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

export { legacyDestinations, generateSlug, generateGradientColors };