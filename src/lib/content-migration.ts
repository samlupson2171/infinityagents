/**
 * Content migration utilities for upgrading legacy training materials
 * to the new enhanced format with rich content and file uploads
 */

import mongoose from 'mongoose';
import { connectToDatabase } from './mongodb';
import { ContentSanitizer } from './content-sanitizer';

export interface MigrationResult {
  success: boolean;
  materialsProcessed: number;
  materialsUpdated: number;
  materialsSkipped: number;
  errors: string[];
  warnings: string[];
}

export interface LegacyMaterial {
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

export interface EnhancedMaterial extends LegacyMaterial {
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

export class ContentMigrator {
  /**
   * Migrate all legacy training materials to enhanced format
   */
  static async migrateAllMaterials(options: {
    dryRun?: boolean;
    batchSize?: number;
    convertBlogUrls?: boolean;
    convertDownloadUrls?: boolean;
  } = {}): Promise<MigrationResult> {
    const {
      dryRun = false,
      batchSize = 50,
      convertBlogUrls = false,
      convertDownloadUrls = false,
    } = options;

    const result: MigrationResult = {
      success: true,
      materialsProcessed: 0,
      materialsUpdated: 0,
      materialsSkipped: 0,
      errors: [],
      warnings: [],
    };

    try {
      await connectToDatabase();
      const { default: TrainingMaterial } = await import('@/models/TrainingMaterial');

      // Find all materials that need migration
      const materialsToMigrate = await TrainingMaterial.find({
        $or: [
          { richContent: { $exists: false } },
          { richContentImages: { $exists: false } },
          { uploadedFiles: { $exists: false } },
        ],
      }).limit(batchSize);

      result.materialsProcessed = materialsToMigrate.length;

      for (const material of materialsToMigrate) {
        try {
          const migrationNeeded = await this.checkMigrationNeeded(material);
          
          if (!migrationNeeded.needed) {
            result.materialsSkipped++;
            result.warnings.push(`Material ${material._id}: ${migrationNeeded.reason}`);
            continue;
          }

          if (!dryRun) {
            const updateResult = await this.migrateSingleMaterial(
              material,
              { convertBlogUrls, convertDownloadUrls }
            );
            
            if (updateResult.success) {
              result.materialsUpdated++;
              result.warnings.push(...updateResult.warnings);
            } else {
              result.errors.push(`Material ${material._id}: ${updateResult.error}`);
            }
          } else {
            // Dry run - just log what would be done
            result.materialsUpdated++;
            result.warnings.push(`[DRY RUN] Would migrate material ${material._id}: ${material.title}`);
          }
        } catch (error) {
          result.errors.push(`Material ${material._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Migrate a single training material
   */
  static async migrateSingleMaterial(
    material: LegacyMaterial,
    options: {
      convertBlogUrls?: boolean;
      convertDownloadUrls?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    error?: string;
    warnings: string[];
  }> {
    const { convertBlogUrls = false, convertDownloadUrls = false } = options;
    const warnings: string[] = [];

    try {
      await connectToDatabase();
      const { default: TrainingMaterial } = await import('@/models/TrainingMaterial');

      const updates: any = {};

      switch (material.type) {
        case 'video':
          // Video materials don't need content migration, just add missing fields
          if (!material.hasOwnProperty('richContent')) {
            updates.richContent = undefined;
          }
          if (!material.hasOwnProperty('richContentImages')) {
            updates.richContentImages = [];
          }
          if (!material.hasOwnProperty('uploadedFiles')) {
            updates.uploadedFiles = [];
          }
          break;

        case 'blog':
          // Initialize blog-specific fields
          if (!material.hasOwnProperty('richContent')) {
            updates.richContent = undefined;
          }
          if (!material.hasOwnProperty('richContentImages')) {
            updates.richContentImages = [];
          }
          if (!material.hasOwnProperty('uploadedFiles')) {
            updates.uploadedFiles = [];
          }

          // Optionally convert external URL to rich content
          if (convertBlogUrls && material.contentUrl && !updates.richContent) {
            const convertedContent = await this.convertUrlToRichContent(material.contentUrl, 'blog');
            if (convertedContent.success) {
              updates.richContent = convertedContent.content;
              warnings.push(`Converted external URL to rich content for ${material.title}`);
            } else {
              warnings.push(`Failed to convert URL for ${material.title}: ${convertedContent.error}`);
            }
          }
          break;

        case 'download':
          // Initialize download-specific fields
          if (!material.hasOwnProperty('richContent')) {
            updates.richContent = undefined;
          }
          if (!material.hasOwnProperty('richContentImages')) {
            updates.richContentImages = [];
          }
          if (!material.hasOwnProperty('uploadedFiles')) {
            updates.uploadedFiles = [];
          }

          // Optionally convert external URL to uploaded file reference
          if (convertDownloadUrls && material.fileUrl && (!updates.uploadedFiles || updates.uploadedFiles.length === 0)) {
            const convertedFile = await this.convertUrlToFileReference(material.fileUrl);
            if (convertedFile.success) {
              updates.uploadedFiles = [convertedFile.fileReference];
              warnings.push(`Converted external URL to file reference for ${material.title}`);
            } else {
              warnings.push(`Failed to convert file URL for ${material.title}: ${convertedFile.error}`);
            }
          }
          break;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await TrainingMaterial.updateOne({ _id: material._id }, { $set: updates });
      }

      return { success: true, warnings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings,
      };
    }
  }

  /**
   * Check if a material needs migration
   */
  private static async checkMigrationNeeded(material: any): Promise<{
    needed: boolean;
    reason: string;
  }> {
    // Check if material already has enhanced fields
    const hasRichContent = material.hasOwnProperty('richContent');
    const hasRichContentImages = material.hasOwnProperty('richContentImages');
    const hasUploadedFiles = material.hasOwnProperty('uploadedFiles');

    if (hasRichContent && hasRichContentImages && hasUploadedFiles) {
      return { needed: false, reason: 'Already migrated' };
    }

    // Check if material has content to migrate
    if (material.type === 'blog' && !material.contentUrl && !material.richContent) {
      return { needed: false, reason: 'No content to migrate' };
    }

    if (material.type === 'download' && !material.fileUrl && (!material.uploadedFiles || material.uploadedFiles.length === 0)) {
      return { needed: false, reason: 'No files to migrate' };
    }

    return { needed: true, reason: 'Migration needed' };
  }

  /**
   * Convert external URL to rich content (placeholder implementation)
   */
  private static async convertUrlToRichContent(url: string, type: 'blog'): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> {
    try {
      // This is a placeholder implementation
      // In a real scenario, you might want to:
      // 1. Fetch the content from the URL
      // 2. Extract the main content
      // 3. Convert it to clean HTML
      // 4. Sanitize it

      // For now, we'll create a simple rich content with a link
      const sanitizedUrl = url.replace(/[<>"']/g, '');
      const content = `
        <div class="external-content-notice">
          <h3>External Content</h3>
          <p>This content was originally hosted externally. You can access it using the link below:</p>
          <p><a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">View Original Content</a></p>
          <p><em>Consider updating this content with the actual material for better user experience.</em></p>
        </div>
      `;

      const sanitizationResult = ContentSanitizer.sanitizeHtml(content);
      if (!sanitizationResult.isValid) {
        return { success: false, error: sanitizationResult.errors.join(', ') };
      }

      return { success: true, content: sanitizationResult.sanitizedContent };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'URL conversion failed',
      };
    }
  }

  /**
   * Convert external file URL to file reference (placeholder implementation)
   */
  private static async convertUrlToFileReference(url: string): Promise<{
    success: boolean;
    fileReference?: any;
    error?: string;
  }> {
    try {
      // This is a placeholder implementation
      // In a real scenario, you might want to:
      // 1. Download the file from the URL
      // 2. Store it in your file system
      // 3. Create a FileStorage record
      // 4. Return the file reference

      // For now, we'll create a placeholder file reference
      const fileName = url.split('/').pop() || 'external-file';
      const fileReference = {
        id: `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalName: fileName,
        fileName: `legacy_${fileName}`,
        filePath: url, // Keep original URL as path for now
        mimeType: this.guessMimeType(fileName),
        size: 0, // Unknown size
        uploadedAt: new Date(),
      };

      return { success: true, fileReference };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File URL conversion failed',
      };
    }
  }

  /**
   * Guess MIME type from file extension
   */
  private static guessMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Rollback migration for a material
   */
  static async rollbackMaterial(materialId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await connectToDatabase();
      const { default: TrainingMaterial } = await import('@/models/TrainingMaterial');

      await TrainingMaterial.updateOne(
        { _id: materialId },
        {
          $unset: {
            richContent: '',
            richContentImages: '',
            uploadedFiles: '',
          },
        }
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed',
      };
    }
  }

  /**
   * Get migration status for all materials
   */
  static async getMigrationStatus(): Promise<{
    total: number;
    migrated: number;
    needsMigration: number;
    byType: Record<string, { total: number; migrated: number }>;
  }> {
    try {
      await connectToDatabase();
      const { default: TrainingMaterial } = await import('@/models/TrainingMaterial');

      const allMaterials = await TrainingMaterial.find({});
      const total = allMaterials.length;

      let migrated = 0;
      const byType: Record<string, { total: number; migrated: number }> = {
        video: { total: 0, migrated: 0 },
        blog: { total: 0, migrated: 0 },
        download: { total: 0, migrated: 0 },
      };

      for (const material of allMaterials) {
        byType[material.type].total++;

        const hasMigrationFields = 
          material.hasOwnProperty('richContent') &&
          material.hasOwnProperty('richContentImages') &&
          material.hasOwnProperty('uploadedFiles');

        if (hasMigrationFields) {
          migrated++;
          byType[material.type].migrated++;
        }
      }

      return {
        total,
        migrated,
        needsMigration: total - migrated,
        byType,
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return {
        total: 0,
        migrated: 0,
        needsMigration: 0,
        byType: {
          video: { total: 0, migrated: 0 },
          blog: { total: 0, migrated: 0 },
          download: { total: 0, migrated: 0 },
        },
      };
    }
  }
}