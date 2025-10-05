const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupDemoOffers() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  console.log('🎯 Setting up demo offers...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const offers = db.collection('offers');
    const users = db.collection('users');
    
    // Get admin user to use as creator
    const adminUser = await users.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run setup-users.js first.');
      return;
    }
    
    // Clear existing offers (optional)
    await offers.deleteMany({});
    console.log('🗑️  Cleared existing offers');
    
    const demoOffers = [
      {
        title: "Mediterranean Cruise - 7 Days",
        description: "Discover the beauty of the Mediterranean with this incredible 7-day cruise package. Visit stunning destinations including Barcelona, Rome, Naples, and the French Riviera. Perfect for couples and families looking for a luxurious getaway with world-class dining, entertainment, and shore excursions.",
        inclusions: [
          "7 nights accommodation in ocean view cabin",
          "All meals and beverages (excluding premium alcohol)",
          "Daily entertainment and shows",
          "Access to spa and fitness facilities",
          "Shore excursion in each port",
          "Gratuities included",
          "Airport transfers"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Bali Paradise Retreat - 10 Days",
        description: "Escape to tropical paradise with our exclusive Bali retreat package. Experience the perfect blend of culture, relaxation, and adventure. Stay in luxury resorts, explore ancient temples, enjoy pristine beaches, and indulge in traditional Balinese spa treatments.",
        inclusions: [
          "10 nights in 5-star beachfront resort",
          "Daily breakfast and 3 dinners",
          "Private airport transfers",
          "Half-day cultural tour with guide",
          "Traditional Balinese massage session",
          "Sunset dinner cruise",
          "Complimentary WiFi",
          "24/7 concierge service"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Swiss Alps Adventure - 5 Days",
        description: "Experience the breathtaking beauty of the Swiss Alps with this adventure-packed 5-day tour. Perfect for nature lovers and thrill-seekers, featuring scenic train rides, mountain hiking, and charming alpine villages. Includes stays in traditional Swiss chalets.",
        inclusions: [
          "5 nights in authentic Swiss chalet",
          "Daily breakfast and 2 dinners",
          "Scenic train journey (Glacier Express)",
          "Guided mountain hiking tour",
          "Cable car rides to mountain peaks",
          "Visit to traditional cheese factory",
          "Professional mountain guide",
          "All transportation included"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Tokyo & Kyoto Cultural Experience - 8 Days",
        description: "Immerse yourself in Japanese culture with this comprehensive 8-day tour of Japan's most iconic cities. From the bustling streets of Tokyo to the serene temples of Kyoto, experience traditional and modern Japan. Includes authentic cultural experiences and guided tours.",
        inclusions: [
          "8 nights accommodation (4 nights each city)",
          "Daily breakfast and 4 traditional dinners",
          "High-speed bullet train between cities",
          "Guided tours of major temples and shrines",
          "Traditional tea ceremony experience",
          "Sushi making class",
          "Visit to authentic geisha district",
          "English-speaking tour guide"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "African Safari Adventure - 6 Days",
        description: "Embark on the ultimate African safari adventure in Kenya's world-famous Masai Mara. Witness the incredible wildlife including the Big Five, experience Masai culture, and stay in luxury safari lodges. Perfect timing for the Great Migration season.",
        inclusions: [
          "6 nights in luxury safari lodge",
          "All meals and beverages",
          "Daily game drives in 4x4 vehicles",
          "Professional safari guide",
          "Visit to authentic Masai village",
          "Hot air balloon safari (optional)",
          "Airport transfers in Nairobi",
          "Park entrance fees included"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Iceland Northern Lights Tour - 4 Days",
        description: "Chase the magical Northern Lights in Iceland with this winter wonderland package. Experience the dramatic landscapes, geothermal hot springs, and hopefully catch the spectacular Aurora Borealis. Includes cozy accommodation and expert Northern Lights hunting guides.",
        inclusions: [
          "4 nights in boutique hotel in Reykjavik",
          "Daily breakfast",
          "Northern Lights hunting tours (2 nights)",
          "Golden Circle sightseeing tour",
          "Blue Lagoon geothermal spa entry",
          "Professional Aurora guide",
          "Warm winter clothing provided",
          "Airport transfers"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Caribbean Island Hopping - 12 Days",
        description: "Explore multiple Caribbean islands with this comprehensive island-hopping adventure. Visit Barbados, St. Lucia, and Grenada, each offering unique experiences from pristine beaches to lush rainforests and vibrant local culture.",
        inclusions: [
          "12 nights accommodation (4 nights per island)",
          "Inter-island flights included",
          "Daily breakfast and 6 dinners",
          "Catamaran sailing excursion",
          "Rainforest hiking tour",
          "Rum distillery visits",
          "Snorkeling equipment provided",
          "Local cultural performances"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "New Zealand South Island Explorer - 9 Days",
        description: "Discover the stunning landscapes of New Zealand's South Island. From the adventure capital Queenstown to the majestic Milford Sound, experience breathtaking scenery, thrilling activities, and unique wildlife in this comprehensive tour.",
        inclusions: [
          "9 nights in premium accommodations",
          "Daily breakfast and 4 dinners",
          "Milford Sound cruise with lunch",
          "Scenic helicopter flight",
          "Wine tasting in Central Otago",
          "TranzAlpine scenic train journey",
          "Professional tour guide",
          "All transportation and transfers"
        ],
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert demo offers
    const result = await offers.insertMany(demoOffers);
    
    console.log(`✅ Successfully created ${result.insertedCount} demo offers:`);
    demoOffers.forEach((offer, index) => {
      console.log(`   ${index + 1}. ${offer.title}`);
    });
    
    console.log('\n🎉 Demo offers setup complete!');
    console.log('\n📋 What you can do now:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ 1. Visit http://localhost:3000/offers to view offers   │');
    console.log('│ 2. Login as admin to manage offers at /admin/dashboard │');
    console.log('│ 3. Login as agent to browse available offers           │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error setting up demo offers:', error);
  } finally {
    await client.close();
  }
}

setupDemoOffers();