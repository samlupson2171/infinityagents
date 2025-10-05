// Import using dynamic imports for ES modules
async function importModules() {
  const { connectToDatabase } = await import('../src/lib/mongodb.ts');
  const { migrateDestinations, rollbackMigration } = await import('../src/lib/destination-migration.ts');
  return { connectToDatabase, migrateDestinations, rollbackMigration };
}

async function runMigration() {
  const command = process.argv[2];
  
  try {
    const { connectToDatabase, migrateDestinations, rollbackMigration } = await importModules();
    
    if (command === 'rollback') {
      console.log('Rolling back destination migration...');
      const result = await rollbackMigration();
      console.log('Rollback completed:', result);
    } else {
      console.log('Running destination migration...');
      const results = await migrateDestinations('migration-script');
      
      console.log('\nMigration Results:');
      console.log('==================');
      
      results.forEach(result => {
        const status = result.status === 'success' ? '✅' : 
                     result.status === 'skipped' ? '⏭️' : '❌';
        console.log(`${status} ${result.name}: ${result.status}`);
        if (result.reason) console.log(`   Reason: ${result.reason}`);
        if (result.error) console.log(`   Error: ${result.error}`);
      });
      
      const successful = results.filter(r => r.status === 'success').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      const failed = results.filter(r => r.status === 'error').length;
      
      console.log('\nSummary:');
      console.log(`✅ Successful: ${successful}`);
      console.log(`⏭️ Skipped: ${skipped}`);
      console.log(`❌ Failed: ${failed}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Destination Migration Script

Usage:
  node scripts/migrate-destinations.js          # Run migration
  node scripts/migrate-destinations.js rollback # Rollback migration
  node scripts/migrate-destinations.js --help   # Show this help

This script migrates hardcoded destination data to the database.
`);
  process.exit(0);
}

runMigration();