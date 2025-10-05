#!/usr/bin/env node

/**
 * Data Migration Script: Local MongoDB to MongoDB Atlas
 * 
 * This script migrates all data from your local MongoDB instance
 * to your MongoDB Atlas cluster before production deployment.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// Configuration
const LOCAL_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity-weekends';
const ATLAS_URI = 'mongodb+srv://samlupson:gjmSxDQq75TQGSMC@infinagent.1pgp6zc.mongodb.net/infinityweekends?retryWrites=true&w=majority';

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'users',
  'offers',
  'enquiries',
  'destinations',
  'activities',
  'packages',
  'training_materials',
  'quotes',
  'contract_templates',
  'contract_signatures',
  'settings',
  'file_storage',
  'import_history'
];

async function connectToDatabase(uri, name) {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log(`✅ Connected to ${name}`);
    return { client, db: client.db() };
  } catch (error) {
    console.error(`❌ Failed to connect to ${name}:`, error.message);
    throw error;
  }
}

async function getCollectionStats(db, collectionName) {
  try {
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();
    return { exists: true, count };
  } catch (error) {
    return { exists: false, count: 0 };
  }
}

async function migrateCollection(sourceDb, targetDb, collectionName) {
  try {
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = targetDb.collection(collectionName);
    
    // Get source data
    const documents = await sourceCollection.find({}).toArray();
    
    if (documents.length === 0) {
      console.log(`  📭 ${collectionName}: No documents to migrate`);
      return { migrated: 0, skipped: 0 };
    }

    // Clear target collection (optional - comment out if you want to preserve existing data)
    await targetCollection.deleteMany({});
    console.log(`  🗑️  ${collectionName}: Cleared existing documents`);

    // Insert documents in batches
    const batchSize = 100;
    let migrated = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await targetCollection.insertMany(batch, { ordered: false });
      migrated += batch.length;
      console.log(`  📦 ${collectionName}: Migrated ${migrated}/${documents.length} documents`);
    }

    console.log(`  ✅ ${collectionName}: Successfully migrated ${migrated} documents`);
    return { migrated, skipped: 0 };
  } catch (error) {
    console.error(`  ❌ ${collectionName}: Migration failed -`, error.message);
    return { migrated: 0, skipped: 0, error: error.message };
  }
}

async function createIndexes(db) {
  console.log('\n📊 Creating indexes...');
  
  try {
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    // Destination indexes
    await db.collection('destinations').createIndex({ slug: 1 }, { unique: true });
    await db.collection('destinations').createIndex({ status: 1 });
    
    // Offer indexes
    await db.collection('offers').createIndex({ destination: 1 });
    await db.collection('offers').createIndex({ startDate: 1 });
    
    // Quote indexes
    await db.collection('quotes').createIndex({ enquiryId: 1 });
    await db.collection('quotes').createIndex({ status: 1 });
    
    // Activity indexes
    await db.collection('activities').createIndex({ location: 1 });
    await db.collection('activities').createIndex({ category: 1 });
    
    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting data migration from Local MongoDB to Atlas...\n');
  
  let localClient, atlasClient;
  
  try {
    // Connect to both databases
    const { client: localConn, db: localDb } = await connectToDatabase(LOCAL_URI, 'Local MongoDB');
    const { client: atlasConn, db: atlasDb } = await connectToDatabase(ATLAS_URI, 'MongoDB Atlas');
    
    localClient = localConn;
    atlasClient = atlasConn;
    
    console.log('\n📋 Analyzing collections...');
    
    // Check what collections exist locally
    const localCollections = await localDb.listCollections().toArray();
    const existingCollections = localCollections.map(col => col.name);
    
    console.log(`Found ${existingCollections.length} collections in local database:`);
    existingCollections.forEach(name => console.log(`  - ${name}`));
    
    // Migration summary
    const migrationResults = {
      total: 0,
      migrated: 0,
      failed: 0,
      errors: []
    };
    
    console.log('\n🔄 Starting migration...');
    
    // Migrate each collection
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      if (existingCollections.includes(collectionName)) {
        console.log(`\n📦 Migrating ${collectionName}...`);
        const result = await migrateCollection(localDb, atlasDb, collectionName);
        
        migrationResults.total++;
        if (result.error) {
          migrationResults.failed++;
          migrationResults.errors.push({ collection: collectionName, error: result.error });
        } else {
          migrationResults.migrated++;
        }
      } else {
        console.log(`\n⏭️  Skipping ${collectionName} (not found locally)`);
      }
    }
    
    // Create indexes
    await createIndexes(atlasDb);
    
    // Final summary
    console.log('\n📊 Migration Summary:');
    console.log(`  Total collections processed: ${migrationResults.total}`);
    console.log(`  Successfully migrated: ${migrationResults.migrated}`);
    console.log(`  Failed: ${migrationResults.failed}`);
    
    if (migrationResults.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      migrationResults.errors.forEach(({ collection, error }) => {
        console.log(`  - ${collection}: ${error}`);
      });
    }
    
    console.log('\n✅ Migration completed!');
    console.log('\n🔗 Your Atlas connection string for production:');
    console.log('MONGODB_URI=' + ATLAS_URI);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close connections
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Migration interrupted by user');
  process.exit(0);
});

// Run the migration
main().catch(console.error);