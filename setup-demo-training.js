const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupDemoTraining() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  console.log('📚 Setting up demo training materials...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const trainingMaterials = db.collection('trainingmaterials');
    const users = db.collection('users');

    // Get admin user to use as creator
    const adminUser = await users.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run setup-users.js first.');
      return;
    }

    // Clear existing training materials (optional)
    await trainingMaterials.deleteMany({});
    console.log('🗑️  Cleared existing training materials');

    const demoMaterials = [
      {
        title: "Travel Sales Fundamentals",
        description: "Learn the basics of travel sales including customer service, product knowledge, and closing techniques. This comprehensive video covers everything you need to know to start selling travel packages effectively.",
        type: "video",
        contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Understanding Travel Insurance",
        description: "A detailed guide on different types of travel insurance, when to recommend them, and how to explain the benefits to customers. Essential reading for all travel agents.",
        type: "blog",
        contentUrl: "https://example.com/travel-insurance-guide",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Destination Knowledge: Europe",
        description: "Comprehensive destination guide covering popular European destinations, best travel times, cultural highlights, and insider tips for creating memorable itineraries.",
        type: "download",
        fileUrl: "https://example.com/europe-guide.pdf",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Customer Service Excellence",
        description: "Master the art of exceptional customer service in the travel industry. Learn how to handle complaints, exceed expectations, and build lasting relationships with clients.",
        type: "video",
        contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Digital Marketing for Travel Agents",
        description: "Stay competitive in the digital age with this comprehensive guide to online marketing strategies specifically designed for travel professionals.",
        type: "blog",
        contentUrl: "https://example.com/digital-marketing-guide",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "ABTA Guidelines and Regulations",
        description: "Essential reference document covering ABTA guidelines, legal requirements, and best practices for travel agents operating in the UK market.",
        type: "download",
        fileUrl: "https://example.com/abta-guidelines.pdf",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Cruise Sales Masterclass",
        description: "Specialized training on selling cruise packages, understanding different cruise lines, cabin categories, and how to match clients with their perfect cruise experience.",
        type: "video",
        contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Handling Group Bookings",
        description: "Learn the intricacies of managing group travel bookings, from initial inquiry to final departure. Includes templates and checklists for efficient group management.",
        type: "blog",
        contentUrl: "https://example.com/group-bookings-guide",
        isActive: true,
        createdBy: new ObjectId(adminUser._id),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert demo training materials
    const result = await trainingMaterials.insertMany(demoMaterials);
    console.log(`✅ Successfully created ${result.insertedCount} demo training materials:`);
    
    demoMaterials.forEach((material, index) => {
      console.log(`   ${index + 1}. ${material.title} (${material.type})`);
    });

    console.log('\n🎉 Demo training materials setup complete!');
    console.log('\n📋 What you can do now:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ 1. Visit http://localhost:3000/training to view content │');
    console.log('│ 2. Filter by type: Videos, Articles, Downloads         │');
    console.log('│ 3. Login as admin to manage training materials         │');
    console.log('└─────────────────────────────────────────────────────────┘');

  } catch (error) {
    console.error('❌ Error setting up demo training materials:', error);
  } finally {
    await client.close();
  }
}

setupDemoTraining();