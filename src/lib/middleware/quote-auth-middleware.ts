import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { 
  QuotePermissionManager, 
  QuotePermissions, 
  UserContext 
} from '@/lib/permissions/quote-permissions';
import { 
  QuoteAuditLogger, 
  AuditContext 
} from '@/lib/audit/quote-audit-logger';

export interface AuthenticatedRequest extends NextRequest {
  user: UserContext;
  auditContext: AuditContext;
}

/**
 * Enhanced authentication middleware for quote operations
 */
export async function withQuoteAuth(
  request: NextRequest,
  requiredPermission?: keyof QuotePermissions
): Promise<{
  user: UserContext;
  auditContext: AuditContext;
} | NextResponse> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'Authentication required for quote operations' 
          },
        },
        { status: 401 }
      );
    }

    // Create user context
    const userContext: UserContext = {
      id: token.sub as string,
      role: token.role as 'admin' | 'agent',
      isApproved: token.isApproved as boolean,
      registrationStatus: token.registrationStatus as string,
    };

    // Create audit context
    const auditContext: AuditContext = {
      userId: userContext.id,
      userEmail: token.email as string,
      userRole: userContext.role,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Check if user is approved
    if (!userContext.isApproved) {
      await QuoteAuditLogger.logPermissionDenied(
        auditContext,
        'ACCESS_QUOTE_SYSTEM',
        'quote'
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PENDING_APPROVAL',
            message: 'Account pending approval - quote access denied',
          },
        },
        { status: 403 }
      );
    }

    // Check specific permission if required
    if (requiredPermission) {
      const hasPermission = QuotePermissionManager.canPerformOperation(
        userContext,
        requiredPermission
      );

      if (!hasPermission) {
        await QuoteAuditLogger.logPermissionDenied(
          auditContext,
          requiredPermission,
          'quote'
        );

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: `Insufficient permissions for operation: ${requiredPermission}`,
            },
          },
          { status: 403 }
        );
      }
    }

    return { user: userContext, auditContext };
  } catch (error) {
    console.error('Quote auth middleware error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication system error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Require authentication and specific quote permission
 */
export async function requireQuoteAuth(
  request: NextRequest,
  requiredPermission?: keyof QuotePermissions
): Promise<{
  user: UserContext;
  auditContext: AuditContext;
}> {
  const result = await withQuoteAuth(request, requiredPermission);
  
  if (result instanceof NextResponse) {
    throw result;
  }
  
  return result;
}

/**
 * Require admin role for quote operations
 */
export async function requireQuoteAdmin(request: NextRequest): Promise<{
  user: UserContext;
  auditContext: AuditContext;
}> {
  const result = await requireQuoteAuth(request, 'canCreateQuote');
  
  if (result.user.role !== 'admin') {
    await QuoteAuditLogger.logPermissionDenied(
      result.auditContext,
      'ADMIN_ONLY_OPERATION',
      'quote'
    );

    throw NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_REQUIRED',
          message: 'Admin role required for this quote operation',
        },
      },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Middleware wrapper for quote API routes
 */
export function withQuotePermission(
  permission: keyof QuotePermissions,
  handler: (
    request: NextRequest,
    context: { user: UserContext; auditContext: AuditContext },
    ...args: any[]
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const authResult = await requireQuoteAuth(request, permission);
      return await handler(request, authResult, ...args);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      
      console.error('Quote permission middleware error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MIDDLEWARE_ERROR',
            message: 'Permission check failed',
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Create audit context from request and user
 */
export function createAuditContext(
  request: NextRequest,
  user: UserContext,
  userEmail: string
): AuditContext {
  return {
    userId: user.id,
    userEmail,
    userRole: user.role,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  };
}