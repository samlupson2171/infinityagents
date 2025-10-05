const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkData() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Check users
    const usersCount = await db.collection('users').countDocuments();
    console.log(`👥 Users in database: ${usersCount}`);
    
    const users = await db.collection('users').find({}).toArray();
    console.log('Users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.contactEmail}) - Role: ${user.role}, Approved: ${user.isApproved}`);
    });
    
    // Check offers
    const offersCount = await db.collection('offers').countDocuments();
    console.log(`\n🎯 Offers in database: ${offersCount}`);
    
    const offers = await db.collection('offers').find({}).toArray();
    console.log('Offers:');
    offers.forEach(offer => {
      console.log(`  - ${offer.title} - Active: ${offer.isActive}`);
    });
    
    // Check training materials
    const trainingCount = await db.collection('trainingmaterials').countDocuments();
    console.log(`\n📚 Training materials in database: ${trainingCount}`);
    
    const training = await db.collection('trainingmaterials').find({}).toArray();
    console.log('Training materials:');
    training.forEach(material => {
      console.log(`  - ${material.title} (${material.type}) - Active: ${material.isActive}`);
    });
    
    // Check enquiries
    const enquiriesCount = await db.collection('enquiries').countDocuments();
    console.log(`\n💬 Enquiries in database: ${enquiriesCount}`);
    
    // Check activities
    const activitiesCount = await db.collection('activities').countDocuments();
    console.log(`\n🎪 Activities in database: ${activitiesCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkData();