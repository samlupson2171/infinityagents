const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupBenidormOffer() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  console.log('🏖️ Setting up Benidorm offer...');
  
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
    
    // Clear existing offers
    // Check if Benidorm offer already exists
    const existingBenidorm = await offers.findOne({ destination: "Benidorm" });
    if (existingBenidorm) {
      await offers.deleteOne({ destination: "Benidorm" });
      console.log('🗑️  Removed existing Benidorm offer');
    }
    
    const benidormOffer = {
      title: "Benidorm Stag & Hen Packages",
      description: "Experience the ultimate stag or hen party in Benidorm with our comprehensive packages. From wild nights out to relaxing beach days, we've got everything covered for an unforgettable celebration.",
      destination: "Benidorm",
      inclusions: [
        "Return private transfers from and to the airport (6 pax or more)",
        "Smashed group bar crawl with 5 shots and games (Fridays / Saturdays only)",
        "Centrally located accommodation (usually with pools, bars, and 24 hr reception)",
        "Based on 4-share apartments (no bed sharing)",
        "Chilled bottle of bubbly on arrival for the stag/hen",
        "Informative welcome pack on arrival (including \"I'm lost cards\")",
        "24-hour rep service",
        "Hens: Cava reception in a central venue",
        "Stags: VIP Lap club entry with stag stitch-up (any night except Tuesday)"
      ],
      pricing: [
        {
          month: "January",
          hotel: { twoNights: 105, threeNights: 105, fourNights: 119 },
          selfCatering: { twoNights: 101, threeNights: 101, fourNights: 115 }
        },
        {
          month: "February",
          hotel: { twoNights: 105, threeNights: 105, fourNights: 119 },
          selfCatering: { twoNights: 101, threeNights: 101, fourNights: 115 }
        },
        {
          month: "March",
          hotel: { twoNights: 123, threeNights: 123, fourNights: 139 },
          selfCatering: { twoNights: 119, threeNights: 119, fourNights: 135 }
        },
        {
          month: "April",
          hotel: { twoNights: 141, threeNights: 141, fourNights: 157 },
          selfCatering: { twoNights: 137, threeNights: 137, fourNights: 153 }
        },
        {
          month: "Easter (18–21 Apr)",
          hotel: { twoNights: 173, threeNights: 173, fourNights: 189 },
          selfCatering: { twoNights: 169, threeNights: 169, fourNights: 185 }
        },
        {
          month: "May",
          hotel: { twoNights: 163, threeNights: 163, fourNights: 179 },
          selfCatering: { twoNights: 159, threeNights: 159, fourNights: 175 }
        },
        {
          month: "June",
          hotel: { twoNights: 173, threeNights: 173, fourNights: 188 },
          selfCatering: { twoNights: 169, threeNights: 169, fourNights: 184 }
        },
        {
          month: "July",
          hotel: { twoNights: 189, threeNights: 189, fourNights: 205 },
          selfCatering: { twoNights: 185, threeNights: 185, fourNights: 201 }
        },
        {
          month: "August",
          hotel: { twoNights: 193, threeNights: 193, fourNights: 209 },
          selfCatering: { twoNights: 189, threeNights: 189, fourNights: 205 }
        },
        {
          month: "September",
          hotel: { twoNights: 163, threeNights: 163, fourNights: 179 },
          selfCatering: { twoNights: 159, threeNights: 159, fourNights: 175 }
        },
        {
          month: "October",
          hotel: { twoNights: 140, threeNights: 140, fourNights: 156 },
          selfCatering: { twoNights: 136, threeNights: 136, fourNights: 152 }
        },
        {
          month: "November",
          hotel: { twoNights: 128, threeNights: 128, fourNights: 144 },
          selfCatering: { twoNights: 124, threeNights: 124, fourNights: 140 }
        }
      ],
      isActive: true,
      createdBy: new ObjectId(adminUser._id),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert Benidorm offer
    const result = await offers.insertOne(benidormOffer);
    
    console.log('✅ Successfully created Benidorm offer');
    console.log(`   Offer ID: ${result.insertedId}`);
    console.log(`   Destination: ${benidormOffer.destination}`);
    console.log(`   Pricing months: ${benidormOffer.pricing.length}`);
    
    console.log('\n🎉 Benidorm offer setup complete!');
    console.log('\n📋 What you can do now:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ 1. Visit http://localhost:3000/offers to view offers   │');
    console.log('│ 2. Filter by destination, month, and accommodation     │');
    console.log('│ 3. View dynamic pricing for different durations        │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error setting up Benidorm offer:', error);
  } finally {
    await client.close();
  }
}

setupBenidormOffer();