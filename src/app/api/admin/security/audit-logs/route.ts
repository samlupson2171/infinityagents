import { NextRequest, NextResponse } from 'next/server';
import { requireQuoteAdmin } from '@/lib/middleware/quote-auth-middleware';
import { QuoteAuditLogger } from '@/lib/audit/quote-audit-logger';
import { QuoteDataSanitizer } from '@/lib/security/quote-data-sanitizer';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const { user, auditContext } = await requireQuoteAdmin(request);

    // Only super admins can view audit logs
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin role required to view audit logs',
          },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Sanitize query parameters
    const sanitizedParams = QuoteDataSanitizer.sanitizeSearchParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      userId: searchParams.get('userId'),
      resourceId: searchParams.get('resourceId'),
      action: searchParams.get('action'),
      success: searchParams.get('success'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    const page = sanitizedParams.page || 1;
    const limit = Math.min(sanitizedParams.limit || 50, 100); // Max 100 records per page
    
    let logs;
    
    if (sanitizedParams.resourceId) {
      // Get logs for specific resource
      logs = await QuoteAuditLogger.getResourceAuditLogs(
        'quote',
        sanitizedParams.resourceId,
        limit
      );
    } else if (sanitizedParams.userId) {
      // Get logs for specific user
      logs = await QuoteAuditLogger.getUserAuditLogs(
        sanitizedParams.userId,
        limit
      );
    } else if (sanitizedParams.success === 'false') {
      // Get security-related logs (failures, permission denials)
      logs = await QuoteAuditLogger.getSecurityAuditLogs(limit);
    } else {
      // Get general audit logs with pagination
      // This would need to be implemented in the audit logger
      logs = await QuoteAuditLogger.getSecurityAuditLogs(limit);
    }

    // Get audit statistics
    const startDate = sanitizedParams.startDate ? new Date(sanitizedParams.startDate) : undefined;
    const endDate = sanitizedParams.endDate ? new Date(sanitizedParams.endDate) : undefined;
    
    const statistics = await QuoteAuditLogger.getAuditStatistics(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        statistics,
        pagination: {
          currentPage: page,
          limit,
          totalLogs: logs.length,
        },
        filters: {
          userId: sanitizedParams.userId,
          resourceId: sanitizedParams.resourceId,
          action: sanitizedParams.action,
          success: sanitizedParams.success,
          startDate: sanitizedParams.startDate,
          endDate: sanitizedParams.endDate,
        },
      },
    });

  } catch (error: any) {
    console.error('Error fetching audit logs:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit logs',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const { user, auditContext } = await requireQuoteAdmin(request);

    // Only super admins can manually create audit logs
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin role required to create audit logs',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, resource, resourceId, details, success, errorMessage } = body;

    // Validate required fields
    if (!action || !resource) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Action and resource are required',
          },
        },
        { status: 400 }
      );
    }

    // Sanitize input data
    const sanitizedAction = QuoteDataSanitizer.sanitizeText(action, 50);
    const sanitizedResource = QuoteDataSanitizer.sanitizeText(resource, 20);
    const sanitizedResourceId = resourceId ? QuoteDataSanitizer.sanitizeText(resourceId, 24) : undefined;
    const sanitizedErrorMessage = errorMessage ? QuoteDataSanitizer.sanitizeText(errorMessage, 500) : undefined;

    // Log the manual audit entry
    await QuoteAuditLogger.logAction(auditContext, {
      action: sanitizedAction,
      resource: sanitizedResource as 'quote' | 'enquiry' | 'email',
      resourceId: sanitizedResourceId,
      details: details || {},
      success: success !== false, // Default to true if not specified
      errorMessage: sanitizedErrorMessage,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Audit log entry created successfully',
        action: sanitizedAction,
        resource: sanitizedResource,
        resourceId: sanitizedResourceId,
      },
    });

  } catch (error: any) {
    console.error('Error creating audit log:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create audit log',
        },
      },
      { status: 500 }
    );
  }
}