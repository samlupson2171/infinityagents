#!/usr/bin/env node

/**
 * Atlas Connection Test
 * 
 * Quick test to verify MongoDB Atlas connection is working
 */

const { MongoClient } = require('mongodb');

const ATLAS_URI = 'mongodb+srv://samlupson:gjmSxDQq75TQGSMC@infinagent.1pgp6zc.mongodb.net/infinityweekends?retryWrites=true&w=majority';

async function testConnection() {
  console.log('🔗 Testing MongoDB Atlas connection...\n');
  
  try {
    const client = new MongoClient(ATLAS_URI);
    await client.connect();
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const db = client.db();
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // Check if we can list collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    
    await client.close();
    console.log('✅ Connection closed successfully');
    
    console.log('\n🎉 Atlas connection test passed! Ready for deployment.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Check username and password in connection string');
      console.log('   - Verify user has read/write permissions');
    } else if (error.message.includes('network')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Check your internet connection');
      console.log('   - Verify IP whitelist in MongoDB Atlas');
    }
    
    process.exit(1);
  }
}

testConnection().catch(console.error);