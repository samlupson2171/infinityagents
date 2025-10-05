import { connectToDatabase } from '../mongodb';
import mongoose from 'mongoose';

export async function createSettingsCollection(): Promise<void> {
  console.log('Running migration: Create settings collection');
  
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    // Create settings collection if it doesn't exist
    const collections = await db.listCollections({ name: 'settings' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('settings');
      console.log('Created settings collection');
    }
    
    // Create indexes
    const settingsCollection = db.collection('settings');
    
    // Create unique index on key
    await settingsCollection.createIndex({ key: 1 }, { unique: true });
    console.log('Created unique index on settings.key');
    
    // Create index on category
    await settingsCollection.createIndex({ category: 1 });
    console.log('Created index on settings.category');
    
    // Create index on updatedBy
    await settingsCollection.createIndex({ updatedBy: 1 });
    console.log('Created index on settings.updatedBy');
    
    console.log('Settings collection migration completed');
  } catch (error) {
    console.error('Error in settings collection migration:', error);
    throw error;
  }
}

export async function rollbackSettingsCollection(): Promise<void> {
  console.log('Rolling back migration: Create settings collection');
  
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    // Drop the settings collection
    try {
      await db.dropCollection('settings');
      console.log('Dropped settings collection');
    } catch (error: any) {
      if (error.code === 26) {
        console.log('Settings collection does not exist, nothing to drop');
      } else {
        throw error;
      }
    }
    
    console.log('Settings collection rollback completed');
  } catch (error) {
    console.error('Error in settings collection rollback:', error);
    throw error;
  }
}