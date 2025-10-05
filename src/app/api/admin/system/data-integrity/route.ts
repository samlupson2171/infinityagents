import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { 
  QuoteDataIntegrityChecker,
  QuoteDataMaintenance 
} from '@/lib/validation/quote-data-integrity';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';

    switch (action) {
      case 'check':
        // Run comprehensive data integrity check
        const report = await QuoteDataIntegrityChecker.runIntegrityCheck();
        
        return NextResponse.json({
          success: true,
          data: report
        });

      case 'autofix':
        // Run auto-fix for common issues
        const autoFixResult = await QuoteDataIntegrityChecker.autoFixIssues();
        
        return NextResponse.json({
          success: true,
          data: autoFixResult
        });

      case 'maintenance':
        // Run daily maintenance
        await QuoteDataMaintenance.runDailyMaintenance();
        
        return NextResponse.json({
          success: true,
          message: 'Daily maintenance completed'
        });

      case 'deep-maintenance':
        // Run weekly deep maintenance
        await QuoteDataMaintenance.runWeeklyMaintenance();
        
        return NextResponse.json({
          success: true,
          message: 'Weekly deep maintenance completed'
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action. Use "check", "autofix", "maintenance", or "deep-maintenance"',
            },
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Data integrity API error:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to run data integrity operation',
        },
      },
      { status: 500 }
    );
  }
}