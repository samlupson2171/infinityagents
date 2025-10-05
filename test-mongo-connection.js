const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read .env.local directly
const envContent = fs.readFileSync('.env.local', 'utf8');
console.log('📄 .env.local content:');
console.log(envContent);

// Parse environment variables manually
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

async function testConnection() {
  const uri = envVars.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    return;
  }
  
  console.log('\n🔍 Testing MongoDB connection...');
  console.log('URI format:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`📊 Database name: ${db.databaseName}`);
    console.log(`📁 Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('Collections:', collections.map(c => c.name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Suggestions:');
      console.log('- Check your username and password in the MongoDB URI');
      console.log('- Ensure the database user has proper permissions');
    } else if (error.message.includes('network')) {
      console.log('\n💡 Suggestions:');
      console.log('- Check your internet connection');
      console.log('- Verify the cluster is running in MongoDB Atlas');
      console.log('- Check if your IP is whitelisted in MongoDB Atlas');
    }
  } finally {
    await client.close();
  }
}

testConnection();