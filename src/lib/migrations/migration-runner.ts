import mongoose from 'mongoose';
import { connectToDatabase } from '../mongodb';

// Migration interface
export interface Migration {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration status tracking
interface MigrationRecord {
  version: string;
  description: string;
  appliedAt: Date;
  status: 'completed' | 'failed';
  error?: string;
}

const MigrationSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['completed', 'failed'], required: true },
  error: { type: String }
});

const MigrationModel = mongoose.models.Migration || 
  mongoose.model('Migration', MigrationSchema);

export class MigrationRunner {
  private migrations: Migration[] = [];

  /**
   * Register a migration
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Sort by version to ensure proper order
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<string[]> {
    await connectToDatabase();
    const applied = await MigrationModel.find({ status: 'completed' }).sort({ version: 1 });
    return applied.map(m => m.version);
  }

  /**
   * Record migration as applied
   */
  private async recordMigration(migration: Migration, status: 'completed' | 'failed', error?: string): Promise<void> {
    await MigrationModel.findOneAndUpdate(
      { version: migration.version },
      {
        version: migration.version,
        description: migration.description,
        appliedAt: new Date(),
        status,
        error
      },
      { upsert: true }
    );
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('Starting migration process...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.migrations.filter(
      m => !appliedMigrations.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        await migration.up();
        await this.recordMigration(migration, 'completed');
        console.log(`✓ Migration ${migration.version} completed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Migration ${migration.version} failed:`, errorMessage);
        await this.recordMigration(migration, 'failed', errorMessage);
        throw new Error(`Migration ${migration.version} failed: ${errorMessage}`);
      }
    }

    console.log('All migrations completed successfully');
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    console.log('Starting rollback process...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigrationVersion = appliedMigrations[appliedMigrations.length - 1];
    const migration = this.migrations.find(m => m.version === lastMigrationVersion);

    if (!migration) {
      throw new Error(`Migration ${lastMigrationVersion} not found in registered migrations`);
    }

    try {
      console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
      await migration.down();
      
      // Remove migration record
      await MigrationModel.deleteOne({ version: migration.version });
      
      console.log(`✓ Migration ${migration.version} rolled back successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ Rollback of migration ${migration.version} failed:`, errorMessage);
      throw new Error(`Rollback failed: ${errorMessage}`);
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{ version: string; description: string; applied: boolean; appliedAt?: Date }[]> {
    const appliedMigrations = await MigrationModel.find().sort({ version: 1 });
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    return this.migrations.map(migration => {
      const applied = appliedVersions.has(migration.version);
      const record = appliedMigrations.find(m => m.version === migration.version);
      
      return {
        version: migration.version,
        description: migration.description,
        applied,
        appliedAt: record?.appliedAt
      };
    });
  }
}

// Create global migration runner instance
export const migrationRunner = new MigrationRunner();