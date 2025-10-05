import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContentMigrator } from '@/lib/content-migration';
import { z } from 'zod';

const migrationRequestSchema = z.object({
  action: z.enum(['migrate', 'status', 'rollback']),
  options: z.object({
    dryRun: z.boolean().optional(),
    batchSize: z.number().min(1).max(1000).optional(),
    convertBlogUrls: z.boolean().optional(),
    convertDownloadUrls: z.boolean().optional(),
    materialId: z.string().optional(), // For rollback
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request
    const body = await request.json();
    const { action, options = {} } = migrationRequestSchema.parse(body);

    switch (action) {
      case 'migrate':
        const migrationResult = await ContentMigrator.migrateAllMaterials({
          dryRun: options.dryRun || false,
          batchSize: options.batchSize || 50,
          convertBlogUrls: options.convertBlogUrls || false,
          convertDownloadUrls: options.convertDownloadUrls || false,
        });

        return NextResponse.json({
          success: true,
          data: migrationResult,
        });

      case 'status':
        const status = await ContentMigrator.getMigrationStatus();
        return NextResponse.json({
          success: true,
          data: status,
        });

      case 'rollback':
        if (!options.materialId) {
          return NextResponse.json(
            { error: 'Material ID is required for rollback' },
            { status: 400 }
          );
        }

        const rollbackResult = await ContentMigrator.rollbackMaterial(options.materialId);
        return NextResponse.json({
          success: rollbackResult.success,
          data: rollbackResult,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Migration API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get migration status
    const status = await ContentMigrator.getMigrationStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Migration status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}