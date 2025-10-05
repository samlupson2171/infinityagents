import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function withAuth(
  request: NextRequest,
  requiredRole?: 'admin' | 'agent'
) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      },
      { status: 401 }
    );
  }

  if (!token.isApproved) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PENDING_APPROVAL',
          message: 'Account pending approval',
        },
      },
      { status: 403 }
    );
  }

  if (requiredRole && token.role !== requiredRole && token.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
        },
      },
      { status: 403 }
    );
  }

  return null; // No error, proceed with request
}

export async function requireAuth(
  request: NextRequest,
  requiredRole?: 'admin' | 'agent'
) {
  const authError = await withAuth(request, requiredRole);
  if (authError) {
    // Extract the error details from the NextResponse and throw a proper error
    const errorData = await authError.json();
    const error = new Error(errorData.error.message);
    (error as any).code = errorData.error.code;
    (error as any).status = authError.status;
    throw error;
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token!;
}

export async function requireAdmin(request: NextRequest) {
  return requireAuth(request, 'admin');
}

export async function requireApprovedUser(request: NextRequest) {
  return requireAuth(request);
}
