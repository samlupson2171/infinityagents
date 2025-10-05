import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import TrainingMaterial from '@/models/TrainingMaterial';
import { FileManager } from '@/lib/file-manager';
import { ContentSanitizer, validateTrainingContent } from '@/lib/content-sanitizer';
import mongoose from 'mongoose';
import { z } from 'zod';

const uploadedFileSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedAt: z.date().or(z.string()),
});

const updateTrainingMaterialSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long')
    .optional(),
  type: z.enum(['video', 'blog', 'download']).optional(),
  
  // Video content
  contentUrl: z.string().url().optional(),
  
  // Blog content
  richContent: z.string().optional(),
  richContentImages: z.array(z.string()).optional(),
  
  // Download content
  uploadedFiles: z.array(uploadedFileSchema).optional(),
  
  // Legacy support
  fileUrl: z.string().url().optional(),
  
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const updateData = updateTrainingMaterialSchema.parse(body);

    // Connect to database
    await connectDB();

    // Find the training material to update
    const material = await TrainingMaterial.findById(params.id);
    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MATERIAL_NOT_FOUND',
            message: 'Training material not found',
          },
        },
        { status: 404 }
      );
    }

    // Handle type-specific updates
    if (updateData.type && updateData.type !== material.type) {
      // Type is changing, clear old content fields
      material.contentUrl = undefined;
      material.richContent = undefined;
      material.richContentImages = undefined;
      material.uploadedFiles = undefined;
      material.fileUrl = undefined;
    }

    // Update basic fields
    if (updateData.title !== undefined) material.title = updateData.title;
    if (updateData.description !== undefined) material.description = updateData.description;
    if (updateData.type !== undefined) material.type = updateData.type;
    if (updateData.isActive !== undefined) material.isActive = updateData.isActive;

    // Update type-specific content
    const materialType = updateData.type || material.type;
    
    if (materialType === 'video') {
      if (updateData.contentUrl !== undefined) {
        material.contentUrl = updateData.contentUrl;
      }
    } else if (materialType === 'blog') {
      if (updateData.richContent !== undefined) {
        const sanitizationResult = ContentSanitizer.sanitizeHtml(updateData.richContent);
        if (!sanitizationResult.isValid) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'CONTENT_SANITIZATION_ERROR',
                message: sanitizationResult.errors.join(', '),
                details: sanitizationResult.errors,
              },
            },
            { status: 400 }
          );
        }
        material.richContent = sanitizationResult.sanitizedContent;
      }
      if (updateData.richContentImages !== undefined) {
        material.richContentImages = updateData.richContentImages;
      }
      if (updateData.contentUrl !== undefined) {
        material.contentUrl = updateData.contentUrl;
      }
    } else if (materialType === 'download') {
      if (updateData.uploadedFiles !== undefined) {
        // Update file associations
        const oldFileIds = material.uploadedFiles?.map(f => f.id) || [];
        const newFileIds = updateData.uploadedFiles.map(f => f.id);
        
        // Remove old associations
        for (const oldId of oldFileIds) {
          if (!newFileIds.includes(oldId)) {
            // File was removed, mark as orphaned
            await FileManager.associateFileWithMaterial(oldId, new mongoose.Types.ObjectId());
          }
        }
        
        // Add new associations
        for (const file of updateData.uploadedFiles) {
          await FileManager.associateFileWithMaterial(file.id, material._id);
        }
        
        material.uploadedFiles = updateData.uploadedFiles.map(file => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt),
        }));
      }
      if (updateData.fileUrl !== undefined) {
        material.fileUrl = updateData.fileUrl;
      }
    }

    // Validate content after update
    const contentValidation = validateMaterialContent({
      type: materialType,
      contentUrl: material.contentUrl,
      richContent: material.richContent,
      uploadedFiles: material.uploadedFiles,
      fileUrl: material.fileUrl,
    });
    
    if (!contentValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: contentValidation.error,
          },
        },
        { status: 400 }
      );
    }

    material.updatedAt = new Date();
    await material.save();

    // Return updated material with creator info
    await material.populate('createdBy', 'name contactEmail');

    return NextResponse.json({
      success: true,
      data: material,
    });
  } catch (error: any) {
    console.error('Error updating training material:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update training material',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find and delete the training material
    const material = await TrainingMaterial.findByIdAndDelete(params.id);
    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MATERIAL_NOT_FOUND',
            message: 'Training material not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        materialId: params.id,
        message: 'Training material deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('Error deleting training material:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete training material',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Find the training material
    const material = await TrainingMaterial.findById(params.id).populate(
      'createdBy',
      'name contactEmail'
    );

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MATERIAL_NOT_FOUND',
            message: 'Training material not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: material,
    });
  } catch (error: any) {
    console.error('Error fetching training material:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch training material',
        },
      },
      { status: 500 }
    );
  }
}
/**
 * Validate material content based on type
 */
function validateMaterialContent(data: any): { isValid: boolean; error?: string } {
  switch (data.type) {
    case 'video':
      if (!data.contentUrl) {
        return { isValid: false, error: 'Video URL is required for video materials' };
      }
      break;
    
    case 'blog':
      if (!data.richContent && !data.contentUrl) {
        return { isValid: false, error: 'Blog content or external URL is required for blog materials' };
      }
      if (data.richContent) {
        const textContent = data.richContent.replace(/<[^>]*>/g, '').trim();
        if (textContent.length > 50000) {
          return { isValid: false, error: 'Blog content is too long (maximum 50,000 characters)' };
        }
      }
      break;
    
    case 'download':
      const hasFiles = data.uploadedFiles && data.uploadedFiles.length > 0;
      const hasFileUrl = data.fileUrl;
      if (!hasFiles && !hasFileUrl) {
        return { isValid: false, error: 'Files or file URL is required for download materials' };
      }
      break;
  }
  
  return { isValid: true };
}

/**
 * Sanitize HTML content to prevent XSS
 */
function sanitizeHtmlContent(html: string): string {
  if (!html) return '';
  
  // Basic XSS prevention - remove script tags and event handlers
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, 'data:text/plain');
  
  return sanitized;
}