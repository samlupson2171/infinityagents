import mongoose from 'mongoose';
import { connectToDatabase } from '../mongodb';

/**
 * Migration script to enhance the Offer schema with flexible pricing structure
 * This migration:
 * 1. Adds new fields to existing offers (resortName, exclusions, metadata)
 * 2. Converts legacy pricing to flexible pricing format
 * 3. Preserves existing data while adding new structure
 */

interface LegacyOffer {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  destination: string;
  inclusions: string[];
  pricing: Array<{
    month: string;
    hotel: {
      twoNights: number;
      threeNights: number;
      fourNights: number;
    };
    selfCatering: {
      twoNights: number;
      threeNights: number;
      fourNights: number;
    };
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

interface FlexiblePricing {
  month: string;
  accommodationType: string;
  nights: number;
  pax: number;
  price: number;
  currency: string;
  isAvailable: boolean;
}

interface OfferMetadata {
  currency: string;
  season: string;
  lastUpdated: Date;
  importSource: string;
  version: number;
}

export async function migrateOffersSchema(): Promise<void> {
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');
    
    console.log('Starting offers schema migration...');
    
    // Get all existing offers
    const existingOffers = await offersCollection.find({}).toArray() as LegacyOffer[];
    
    console.log(`Found ${existingOffers.length} offers to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const offer of existingOffers) {
      try {
        // Check if already migrated (has metadata field)
        if ('metadata' in offer) {
          console.log(`Offer ${offer._id} already migrated, skipping`);
          skippedCount++;
          continue;
        }
        
        // Convert legacy pricing to flexible pricing
        const flexiblePricing: FlexiblePricing[] = [];
        
        if (offer.pricing && offer.pricing.length > 0) {
          for (const monthPricing of offer.pricing) {
            // Convert hotel pricing
            if (monthPricing.hotel) {
              // Assume 2 pax for hotel pricing (standard assumption)
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Hotel',
                nights: 2,
                pax: 2,
                price: monthPricing.hotel.twoNights,
                currency: 'EUR',
                isAvailable: monthPricing.hotel.twoNights > 0
              });
              
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Hotel',
                nights: 3,
                pax: 2,
                price: monthPricing.hotel.threeNights,
                currency: 'EUR',
                isAvailable: monthPricing.hotel.threeNights > 0
              });
              
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Hotel',
                nights: 4,
                pax: 2,
                price: monthPricing.hotel.fourNights,
                currency: 'EUR',
                isAvailable: monthPricing.hotel.fourNights > 0
              });
            }
            
            // Convert self-catering pricing
            if (monthPricing.selfCatering) {
              // Assume 4 pax for self-catering (standard assumption)
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Self-Catering',
                nights: 2,
                pax: 4,
                price: monthPricing.selfCatering.twoNights,
                currency: 'EUR',
                isAvailable: monthPricing.selfCatering.twoNights > 0
              });
              
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Self-Catering',
                nights: 3,
                pax: 4,
                price: monthPricing.selfCatering.threeNights,
                currency: 'EUR',
                isAvailable: monthPricing.selfCatering.threeNights > 0
              });
              
              flexiblePricing.push({
                month: monthPricing.month,
                accommodationType: 'Self-Catering',
                nights: 4,
                pax: 4,
                price: monthPricing.selfCatering.fourNights,
                currency: 'EUR',
                isAvailable: monthPricing.selfCatering.fourNights > 0
              });
            }
          }
        }
        
        // Create metadata
        const metadata: OfferMetadata = {
          currency: 'EUR',
          season: '2025',
          lastUpdated: offer.updatedAt || new Date(),
          importSource: 'legacy-migration',
          version: 1
        };
        
        // Extract resort name from title or use destination
        const resortName = extractResortName(offer.title, offer.destination);
        
        // Update the offer with new fields
        const updateResult = await offersCollection.updateOne(
          { _id: offer._id },
          {
            $set: {
              resortName,
              flexiblePricing,
              metadata,
              exclusions: [] // Initialize empty exclusions array
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          migratedCount++;
          console.log(`Successfully migrated offer ${offer._id}: ${offer.title}`);
        } else {
          console.warn(`Failed to migrate offer ${offer._id}: ${offer.title}`);
        }
        
      } catch (error) {
        console.error(`Error migrating offer ${offer._id}:`, error);
      }
    }
    
    console.log(`Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Extract resort name from title or use destination as fallback
 */
function extractResortName(title: string, destination: string): string {
  // Simple extraction logic - can be enhanced later
  const titleWords = title.split(' ');
  
  // Look for common resort indicators
  const resortIndicators = ['Hotel', 'Resort', 'Apartments', 'Villa', 'Beach'];
  
  for (const word of titleWords) {
    if (resortIndicators.some(indicator => word.includes(indicator))) {
      return word;
    }
  }
  
  // Fallback to destination
  return destination;
}

/**
 * Rollback migration (removes new fields)
 */
export async function rollbackOffersSchema(): Promise<void> {
  try {
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');
    
    console.log('Rolling back offers schema migration...');
    
    const result = await offersCollection.updateMany(
      {},
      {
        $unset: {
          resortName: '',
          flexiblePricing: '',
          metadata: '',
          exclusions: ''
        }
      }
    );
    
    console.log(`Rollback completed: ${result.modifiedCount} offers updated`);
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'migrate') {
    migrateOffersSchema()
      .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  } else if (command === 'rollback') {
    rollbackOffersSchema()
      .then(() => {
        console.log('Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: ts-node 001-enhance-offers-schema.ts [migrate|rollback]');
    process.exit(1);
  }
}