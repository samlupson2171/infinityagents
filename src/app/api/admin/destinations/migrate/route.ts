import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { migrateDestinations, rollbackMigration } from '@/lib/destination-migration';

// POST /api/admin/destinations/migrate - Run destination migration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'rollback') {
      console.log('Rolling back destination migration...');
      const result = await rollbackMigration();
      
      return NextResponse.json({
        success: true,
        message: 'Migration rolled back successfully',
        deletedCount: result.deletedCount
      });
    } else {
      console.log('Running destination migration...');
      const results = await migrateDestinations(session.user.id);
      
      const successful = results.filter(r => r.status === 'success').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      const failed = results.filter(r => r.status === 'error').length;
      
      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        results,
        summary: {
          successful,
          skipped,
          failed,
          total: results.length
        }
      });
    }

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}