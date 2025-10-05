import { Db } from 'mongodb';

export interface Migration {
  version: string;
  description: string;
  up: (db: Db) => Promise<void>;
  down: (db: Db) => Promise<void>;
}

export const migration003: Migration = {
  version: '003',
  description: 'Enhance User schema for agency registration',
  
  async up(db: Db) {
    console.log('Running migration 003: Enhance User schema for agency registration');
    
    const usersCollection = db.collection('users');
    
    // Add new fields to existing users using aggregation pipeline
    const updateResult = await usersCollection.updateMany(
      {},
      [
        {
          $set: {
            // Set company field to existing companyName for backward compatibility
            company: { $ifNull: ['$companyName', ''] },
            // Set default values for new fields
            consortia: null,
            registrationStatus: {
              $cond: {
                if: { $eq: ['$isApproved', true] },
                then: 'approved',
                else: 'pending'
              }
            },
            rejectionReason: null,
            contractSignedAt: null,
            contractVersion: null
          }
        }
      ]
    );
    
    console.log(`Updated ${updateResult.modifiedCount} user documents with new fields`);
    
    // Create indexes for new fields
    await usersCollection.createIndex('registrationStatus');
    await usersCollection.createIndex('company');
    await usersCollection.createIndex('consortia');
    
    console.log('Created indexes for new user fields');
    
    // Update users where company field might be empty
    const emptyCompanyResult = await usersCollection.updateMany(
      { company: { $in: ['', null] } },
      [
        {
          $set: {
            company: { $ifNull: ['$companyName', 'Unknown Company'] }
          }
        }
      ]
    );
    
    console.log(`Updated ${emptyCompanyResult.modifiedCount} users with empty company field`);
  },
  
  async down(db: Db) {
    console.log('Rolling back migration 003: Enhance User schema for agency registration');
    
    const usersCollection = db.collection('users');
    
    // Remove the new fields
    await usersCollection.updateMany(
      {},
      {
        $unset: {
          company: '',
          consortia: '',
          registrationStatus: '',
          rejectionReason: '',
          contractSignedAt: '',
          contractVersion: ''
        }
      }
    );
    
    // Drop the indexes
    try {
      await usersCollection.dropIndex('registrationStatus_1');
      await usersCollection.dropIndex('company_1');
      await usersCollection.dropIndex('consortia_1');
    } catch (error) {
      console.log('Some indexes may not exist, continuing rollback');
    }
    
    console.log('Rolled back user schema enhancements');
  }
};