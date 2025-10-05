'use client';

import React, { useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireApproval?: boolean;
  requiredRole?: 'admin' | 'agent';
  requireAdmin?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireApproval = true,
  requiredRole,
  requireAdmin = false,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    // Check authentication requirement
    if (requireAuth && status === 'unauthenticated') {
      router.push(redirectTo || '/auth/login');
      return;
    }

    // Check approval requirement
    if (requireApproval && session && !session.user.isApproved) {
      router.push('/auth/pending');
      return;
    }

    // Check role requirement
    if (
      requiredRole &&
      session &&
      session.user.role !== requiredRole &&
      session.user.role !== 'admin'
    ) {
      router.push('/unauthorized');
      return;
    }

    // Check admin requirement (convenience prop)
    if (requireAdmin && session && session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
  }, [
    session,
    status,
    requireAuth,
    requireApproval,
    requiredRole,
    requireAdmin,
    router,
    redirectTo,
  ]);

  // Show loading state
  if (status === 'loading') {
    return fallback || <LoadingSpinner />;
  }

  // Show fallback if not authenticated and auth is required
  if (requireAuth && status === 'unauthenticated') {
    return fallback || <LoadingSpinner />;
  }

  // Show fallback if not approved and approval is required
  if (requireApproval && session && !session.user.isApproved) {
    return fallback || <LoadingSpinner />;
  }

  // Show fallback if role requirement not met
  if (
    requiredRole &&
    session &&
    session.user.role !== requiredRole &&
    session.user.role !== 'admin'
  ) {
    return fallback || <LoadingSpinner />;
  }

  // Show fallback if admin requirement not met
  if (requireAdmin && session && session.user.role !== 'admin') {
    return fallback || <LoadingSpinner />;
  }

  return <>{children}</>;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
