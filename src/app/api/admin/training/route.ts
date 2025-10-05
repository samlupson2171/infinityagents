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
  filePath: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedAt: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  }),
});

const createTrainingMaterialSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  type: z.enum(['video', 'blog', 'download'], {
    required_error: 'Type is required',
  }),
  
  // Video content
  contentUrl: z.string().url().optional().or(z.literal('')),
  
  // Blog content
  richContent: z.string().optional().or(z.literal('')),
  richContentImages: z.array(z.string()).optional().default([]),
  
  // Download content
  uploadedFiles: z.array(uploadedFileSchema).optional().default([]),
  
  // Legacy support
  fileUrl: z.string().url().optional().or(z.literal('')),
  
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    console.log('Training API: Starting POST request');
    
    // Verify admin authorization
    console.log('Training API: Verifying admin authorization');
    const adminToken = await requireAdmin(request);
    console.log('Training API: Admin authorized:', adminToken.sub);

    // Parse and validate request body
    console.log('Training API: Parsing request body');
    const body = await request.json();
    console.log('Training API: Request body:', body);
    
    const materialData = createTrainingMaterialSchema.parse(body);
    console.log('Training API: Validated material data:', materialData);

    // Validate content using comprehensive validator
    console.log('Training API: Validating content');
    const contentValidation = validateTrainingContent(materialData.type, {
      title: materialData.title,
      description: materialData.description,
      contentUrl: materialData.contentUrl,
      richContent: materialData.richContent,
      uploadedFiles: materialData.uploadedFiles,
      fileUrl: materialData.fileUrl,
    });
    
    if (!contentValidation.isValid) {
      console.log('Training API: Content validation failed:', contentValidation.errors);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: contentValidation.errors.join(', '),
            details: contentValidation.errors,
            warnings: contentValidation.warnings,
          },
        },
        { status: 400 }
      );
    }

    // Connect to database
    console.log('Training API: Connecting to database');
    await connectDB();
    console.log('Training API: Database connected');

    // Prepare material data
    const materialToSave: any = {
      title: materialData.title,
      description: materialData.description,
      type: materialData.type,
      isActive: materialData.isActive,
      createdBy: adminToken.sub,
    };

    // Add type-specific content
    if (materialData.type === 'video') {
      materialToSave.contentUrl = materialData.contentUrl;
    } else if (materialData.type === 'blog') {
      if (materialData.richContent) {
        const sanitizationResult = ContentSanitizer.sanitizeHtml(materialData.richContent);
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
        materialToSave.richContent = sanitizationResult.sanitizedContent;
        materialToSave.richContentImages = materialData.richContentImages || [];
      } else {
        materialToSave.contentUrl = materialData.contentUrl;
      }
    } else if (materialData.type === 'download') {
      if (materialData.uploadedFiles && materialData.uploadedFiles.length > 0) {
        materialToSave.uploadedFiles = materialData.uploadedFiles.map(file => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt),
        }));
        // Note: File association will happen after material is saved
      } else {
        materialToSave.fileUrl = materialData.fileUrl;
      }
    }

    // Create new training material
    const material = new TrainingMaterial(materialToSave);
    await material.save();

    // Update file associations with actual material ID
    if (materialData.type === 'download' && materialData.uploadedFiles) {
      for (const file of materialData.uploadedFiles) {
        await FileManager.associateFileWithMaterial(file.id, material._id);
      }
    }

    // Populate creator info for response
    await material.populate('createdBy', 'name contactEmail');

    return NextResponse.json(
      {
        success: true,
        data: material,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Training API: Error creating training material:', error);
    console.error('Training API: Error stack:', error.stack);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Training API: Zod validation error:', error.errors);
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
          message: 'Failed to create training material',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type'); // 'video', 'blog', 'download', or 'all'
    const status = searchParams.get('status'); // 'active', 'inactive', or 'all'
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    // 'all' or no status means no filter

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get training materials with pagination
    const materials = await TrainingMaterial.find(query)
      .populate('createdBy', 'name contactEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalMaterials = await TrainingMaterial.countDocuments(query);
    const totalPages = Math.ceil(totalMaterials / limit);

    return NextResponse.json({
      success: true,
      data: {
        materials,
        pagination: {
          currentPage: page,
          totalPages,
          totalMaterials,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching training materials:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch training materials',
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