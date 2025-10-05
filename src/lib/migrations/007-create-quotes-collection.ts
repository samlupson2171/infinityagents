import { MongoClient, Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  console.log('Running migration: 007-create-quotes-collection');

  try {
    // Create the quotes collection with validation
    await db.createCollection('quotes', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            'enquiryId',
            'leadName',
            'hotelName',
            'numberOfPeople',
            'numberOfRooms',
            'numberOfNights',
            'arrivalDate',
            'whatsIncluded',
            'totalPrice',
            'createdBy'
          ],
          properties: {
            enquiryId: {
              bsonType: 'objectId',
              description: 'Reference to the original enquiry'
            },
            leadName: {
              bsonType: 'string',
              maxLength: 100,
              description: 'Name of the lead customer'
            },
            hotelName: {
              bsonType: 'string',
              maxLength: 200,
              description: 'Name of the hotel'
            },
            numberOfPeople: {
              bsonType: 'int',
              minimum: 1,
              maximum: 100,
              description: 'Number of people in the group'
            },
            numberOfRooms: {
              bsonType: 'int',
              minimum: 1,
              maximum: 50,
              description: 'Number of rooms required'
            },
            numberOfNights: {
              bsonType: 'int',
              minimum: 1,
              maximum: 30,
              description: 'Number of nights for the stay'
            },
            arrivalDate: {
              bsonType: 'date',
              description: 'Arrival date for the trip'
            },
            isSuperPackage: {
              bsonType: 'bool',
              description: 'Whether this is a super package'
            },
            whatsIncluded: {
              bsonType: 'string',
              maxLength: 2000,
              description: 'List of what is included in the package'
            },
            transferIncluded: {
              bsonType: 'bool',
              description: 'Whether transfer is included'
            },
            activitiesIncluded: {
              bsonType: 'string',
              maxLength: 1000,
              description: 'Activities included in the package'
            },
            totalPrice: {
              bsonType: 'number',
              minimum: 0,
              maximum: 1000000,
              description: 'Total price of the quote'
            },
            currency: {
              bsonType: 'string',
              enum: ['GBP', 'EUR', 'USD'],
              description: 'Currency for the quote'
            },
            version: {
              bsonType: 'int',
              minimum: 1,
              description: 'Version number for quote history'
            },
            status: {
              bsonType: 'string',
              enum: ['draft', 'sent', 'updated'],
              description: 'Current status of the quote'
            },
            createdBy: {
              bsonType: 'objectId',
              description: 'Admin user who created the quote'
            },
            emailSent: {
              bsonType: 'bool',
              description: 'Whether the quote email has been sent'
            },
            emailSentAt: {
              bsonType: 'date',
              description: 'When the quote email was sent'
            },
            emailDeliveryStatus: {
              bsonType: 'string',
              enum: ['pending', 'delivered', 'failed'],
              description: 'Status of email delivery'
            },
            emailMessageId: {
              bsonType: 'string',
              description: 'Email service message ID for tracking'
            },
            internalNotes: {
              bsonType: 'string',
              maxLength: 1000,
              description: 'Internal notes for the quote'
            }
          }
        }
      }
    });

    // Create indexes for the quotes collection
    await db.collection('quotes').createIndexes([
      { key: { enquiryId: 1, version: -1 }, name: 'enquiry_version_idx' },
      { key: { createdBy: 1, createdAt: -1 }, name: 'created_by_date_idx' },
      { key: { status: 1, createdAt: -1 }, name: 'status_date_idx' },
      { key: { emailDeliveryStatus: 1 }, name: 'email_status_idx' },
      { key: { arrivalDate: 1 }, name: 'arrival_date_idx' }
    ]);

    // Update existing enquiries to add quote-related fields
    await db.collection('enquiries').updateMany(
      {},
      {
        $set: {
          quotes: [],
          hasQuotes: false,
          quotesCount: 0
        }
      }
    );

    // Create indexes for the updated enquiries collection
    await db.collection('enquiries').createIndexes([
      { key: { hasQuotes: 1 }, name: 'has_quotes_idx' },
      { key: { latestQuoteDate: -1 }, name: 'latest_quote_date_idx' }
    ]);

    console.log('✅ Successfully created quotes collection and updated enquiries schema');

  } catch (error) {
    console.error('❌ Error in migration 007-create-quotes-collection:', error);
    throw error;
  }
}

export async function down(db: Db): Promise<void> {
  console.log('Rolling back migration: 007-create-quotes-collection');

  try {
    // Drop the quotes collection
    await db.collection('quotes').drop();

    // Remove quote-related fields from enquiries
    await db.collection('enquiries').updateMany(
      {},
      {
        $unset: {
          quotes: '',
          hasQuotes: '',
          latestQuoteDate: '',
          quotesCount: ''
        }
      }
    );

    // Drop the quote-related indexes from enquiries
    try {
      await db.collection('enquiries').dropIndex('has_quotes_idx');
      await db.collection('enquiries').dropIndex('latest_quote_date_idx');
    } catch (indexError) {
      // Indexes might not exist, continue
      console.log('Some indexes were not found during rollback, continuing...');
    }

    console.log('✅ Successfully rolled back quotes collection migration');

  } catch (error) {
    console.error('❌ Error rolling back migration 007-create-quotes-collection:', error);
    throw error;
  }
}