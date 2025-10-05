import mongoose from 'mongoose';
import { connectToDatabase } from '../mongodb';

/**
 * Migration script to enhance the TrainingMaterial schema with rich content and file upload capabilities
 * This migration:
 * 1. Adds new fields to existing training materials (richContent, richContentImages, uploadedFiles)
 * 2. Preserves existing data while adding new structure for enhanced functionality
 * 3. Maintains backward compatibility with existing URL-based content
 */

interface LegacyTrainingMaterial {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: 'video' | 'blog' | 'download';
  contentUrl?: string;
  fileUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

interface EnhancedTrainingMaterial extends LegacyTrainingMaterial {
  richContent?: string;
  richContentImages?: string[];
  uploadedFiles?: Array<{
    id: string;
    originalName: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }>;
}

export async function enhanceTrainingMaterialsSchema(): Promise<void> {
  try {
    await connectToDatabase();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const trainingMaterialsCollection = db.collection('trainingmaterials');

    console.log('Starting training materials schema enhancement...');

    // Get all existing training materials
    const existingMaterials = (await trainingMaterialsCollection
      .find({})
      .toArray()) as LegacyTrainingMaterial[];

    console.log(
      `Found ${existingMaterials.length} training materials to enhance`
    );

    let enhancedCount = 0;
    let skippedCount = 0;

    for (const material of existingMaterials) {
      try {
        // Check if already enhanced (has richContent, richContentImages, or uploadedFiles fields)
        if (
          'richContent' in material ||
          'richContentImages' in material ||
          'uploadedFiles' in material
        ) {
          console.log(
            `Training material ${material._id} already enhanced, skipping`
          );
          skippedCount++;
          continue;
        }

        // Prepare enhancement fields based on material type
        const enhancementFields: Partial<EnhancedTrainingMaterial> = {};

        if (material.type === 'blog') {
          // For blog materials, initialize richContent and richContentImages arrays
          enhancementFields.richContent = undefined; // Will use existing contentUrl for backward compatibility
          enhancementFields.richContentImages = [];
        } else if (material.type === 'download') {
          // For download materials, initialize uploadedFiles array
          enhancementFields.uploadedFiles = [];
        }
        // Video materials don't need additional fields

        // Update the training material with new fields
        const updateResult = await trainingMaterialsCollection.updateOne(
          { _id: material._id },
          {
            $set: enhancementFields,
          }
        );

        if (updateResult.modifiedCount > 0) {
          enhancedCount++;
          console.log(
            `Successfully enhanced training material ${material._id}: ${material.title} (${material.type})`
          );
        } else {
          console.warn(
            `No changes made to training material ${material._id}: ${material.title}`
          );
        }
      } catch (error) {
        console.error(
          `Error enhancing training material ${material._id}:`,
          error
        );
      }
    }

    console.log(
      `Enhancement completed: ${enhancedCount} enhanced, ${skippedCount} skipped`
    );

    // Create indexes for new fields
    console.log('Creating indexes for enhanced fields...');

    try {
      // Index for rich content search (text index)
      await trainingMaterialsCollection.createIndex(
        { richContent: 'text', title: 'text', description: 'text' },
        { name: 'training_content_text_index' }
      );

      // Index for uploaded files
      await trainingMaterialsCollection.createIndex(
        { 'uploadedFiles.id': 1 },
        { name: 'uploaded_files_id_index', sparse: true }
      );

      // Index for rich content images
      await trainingMaterialsCollection.createIndex(
        { richContentImages: 1 },
        { name: 'rich_content_images_index', sparse: true }
      );

      console.log('Indexes created successfully');
    } catch (indexError) {
      console.warn('Some indexes may already exist:', indexError);
    }
  } catch (error) {
    console.error('Enhancement migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration (removes new fields)
 */
export async function rollbackTrainingMaterialsSchema(): Promise<void> {
  try {
    await connectToDatabase();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const trainingMaterialsCollection = db.collection('trainingmaterials');

    console.log('Rolling back training materials schema enhancement...');

    const result = await trainingMaterialsCollection.updateMany(
      {},
      {
        $unset: {
          richContent: '',
          richContentImages: '',
          uploadedFiles: '',
        },
      }
    );

    console.log(
      `Rollback completed: ${result.modifiedCount} training materials updated`
    );

    // Drop the indexes we created
    console.log('Dropping enhanced field indexes...');

    try {
      await trainingMaterialsCollection.dropIndex(
        'training_content_text_index'
      );
      await trainingMaterialsCollection.dropIndex('uploaded_files_id_index');
      await trainingMaterialsCollection.dropIndex('rich_content_images_index');
      console.log('Indexes dropped successfully');
    } catch (indexError) {
      console.warn('Some indexes may not exist:', indexError);
    }
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'migrate') {
    enhanceTrainingMaterialsSchema()
      .then(() => {
        console.log(
          'Training materials schema enhancement completed successfully'
        );
        process.exit(0);
      })
      .catch((error) => {
        console.error('Training materials schema enhancement failed:', error);
        process.exit(1);
      });
  } else if (command === 'rollback') {
    rollbackTrainingMaterialsSchema()
      .then(() => {
        console.log(
          'Training materials schema rollback completed successfully'
        );
        process.exit(0);
      })
      .catch((error) => {
        console.error('Training materials schema rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.log(
      'Usage: ts-node 006-enhance-training-materials-schema.ts [migrate|rollback]'
    );
    process.exit(1);
  }
}
