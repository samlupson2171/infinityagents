#!/usr/bin/env node

/**
 * Migration CLI script
 * Usage:
 *   node scripts/migrate.js up     - Run pending migrations
 *   node scripts/migrate.js down   - Rollback last migration
 *   node scripts/migrate.js status - Show migration status
 */

const { migrationRunner } = require('../src/lib/migrations/index.ts');

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        await migrationRunner.runMigrations();
        break;
      
      case 'down':
        await migrationRunner.rollbackLastMigration();
        break;
      
      case 'status':
        const status = await migrationRunner.getMigrationStatus();
        console.log('\nMigration Status:');
        console.log('================');
        status.forEach(migration => {
          const statusIcon = migration.applied ? '✓' : '○';
          const appliedAt = migration.appliedAt ? ` (${migration.appliedAt.toISOString()})` : '';
          console.log(`${statusIcon} ${migration.version}: ${migration.description}${appliedAt}`);
        });
        break;
      
      default:
        console.log('Usage:');
        console.log('  node scripts/migrate.js up     - Run pending migrations');
        console.log('  node scripts/migrate.js down   - Rollback last migration');
        console.log('  node scripts/migrate.js status - Show migration status');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

main();