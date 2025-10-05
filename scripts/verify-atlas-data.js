#!/usr/bin/env node

/**
 * Atlas Data Verification Script
 * 
 * This script verifies that your data was successfully migrated
 * to MongoDB Atlas and provides a summary of what's available.
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://samlupson:gjmSxDQq75TQGSMC@infinagent.1pgp6zc.mongodb.net/infinityweekends?retryWrites=true&w=majority';

async function verifyAtlasData() {
  console.log('🔍 Verifying data in MongoDB Atlas...\n');
  
  let client;
  
  try {
    client = new MongoClient(ATLAS_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db();
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Found ${collections.length} collections:\n`);
    
    let totalDocuments = 0;
    
    // Check each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const coll = db.collection(collectionName);
      const count = await coll.countDocuments();
      totalDocuments += count;
      
      console.log(`📦 ${collectionName}: ${count} documents`);
      
      // Show sample data for key collections
      if (['users', 'destinations', 'offers', 'quotes'].includes(collectionName) && count > 0) {
        const sample = await coll.findOne({});
        const keys = Object.keys(sample).slice(0, 5);
        console.log(`   Sample fields: ${keys.join(', ')}`);
      }
    }
    
    console.log(`\n📈 Total documents across all collections: ${totalDocuments}`);
    
    // Check for admin users
    const adminUsers = await db.collection('users').countDocuments({ role: 'admin' });
    console.log(`\n👤 Admin users: ${adminUsers}`);
    
    if (adminUsers === 0) {
      console.log('⚠️  Warning: No admin users found. You\'ll need to create one after deployment.');
    }
    
    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const userIndexes = await db.collection('users').indexes();
    console.log(`   Users collection has ${userIndexes.length} indexes`);
    
    console.log('\n✅ Atlas verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

verifyAtlasData().catch(console.error);