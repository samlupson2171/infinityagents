import mongoose from 'mongoose';
import { connectToDatabase } from '../mongodb';

export async function createContractCollections(): Promise<void> {
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log('Running migration 004: Create contract template and signature collections');
    
    // Create contract templates collection
    const contractTemplatesCollection = db.collection('contracttemplates');
    
    // Create indexes for contract templates
    await contractTemplatesCollection.createIndex({ version: 1 }, { unique: true });
    await contractTemplatesCollection.createIndex({ isActive: 1 }, { 
      unique: true, 
      partialFilterExpression: { isActive: true } 
    });
    await contractTemplatesCollection.createIndex({ effectiveDate: -1 });
    await contractTemplatesCollection.createIndex({ createdAt: -1 });
    
    console.log('Created contract templates collection with indexes');
    
    // Create contract signatures collection
    const contractSignaturesCollection = db.collection('contractsignatures');
    
    // Create indexes for contract signatures
    await contractSignaturesCollection.createIndex(
      { userId: 1, contractTemplateId: 1 }, 
      { unique: true }
    );
    await contractSignaturesCollection.createIndex({ userId: 1 });
    await contractSignaturesCollection.createIndex({ contractTemplateId: 1 });
    await contractSignaturesCollection.createIndex({ signedAt: -1 });
    await contractSignaturesCollection.createIndex({ signatureType: 1 });
    await contractSignaturesCollection.createIndex({ createdAt: -1 });
    
    console.log('Created contract signatures collection with indexes');
    
    // Create a default contract template if none exists
    const existingTemplates = await contractTemplatesCollection.countDocuments();
    if (existingTemplates === 0) {
      // Find an admin user to set as creator
      const usersCollection = db.collection('users');
      const adminUser = await usersCollection.findOne({ role: 'admin' });
      
      if (adminUser) {
        const defaultTemplate = {
          version: 'v1.0',
          title: 'Standard Agency Agreement',
          content: `# Standard Agency Agreement

## Terms and Conditions

This agreement governs the relationship between the agency and our platform.

### 1. Acceptance of Terms
By signing this agreement, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.

### 2. Agency Responsibilities
- Provide accurate and up-to-date information
- Comply with all applicable laws and regulations
- Maintain professional standards in all interactions

### 3. Platform Rights and Responsibilities
- Provide access to platform features and services
- Maintain system security and data protection
- Provide reasonable support and assistance

### 4. Data Protection
Both parties agree to comply with applicable data protection laws and regulations.

### 5. Termination
This agreement may be terminated by either party with appropriate notice.

### 6. Governing Law
This agreement is governed by the laws of the applicable jurisdiction.

By signing below, you acknowledge that you have read and agree to these terms.`,
          isActive: true,
          createdBy: adminUser._id,
          effectiveDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await contractTemplatesCollection.insertOne(defaultTemplate);
        console.log('Created default contract template');
      } else {
        console.log('No admin user found, skipping default template creation');
      }
    }
    
    console.log('Migration 004 completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function rollbackContractCollections(): Promise<void> {
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    console.log('Rolling back migration 004: Create contract template and signature collections');
    
    // Drop contract signatures collection
    try {
      await db.collection('contractsignatures').drop();
      console.log('Dropped contract signatures collection');
    } catch (error) {
      console.log('Contract signatures collection may not exist, continuing rollback');
    }
    
    // Drop contract templates collection
    try {
      await db.collection('contracttemplates').drop();
      console.log('Dropped contract templates collection');
    } catch (error) {
      console.log('Contract templates collection may not exist, continuing rollback');
    }
    
    console.log('Rolled back contract collections creation');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}