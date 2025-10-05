import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../ProtectedRoute';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('ProtectedRoute', () => {
  const mockPush = vi.fn();
  const mockUseSession = vi.mocked(useSession);
  const mockUseRouter = vi.mocked(useRouter);

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
    vi.clearAllMocks();
  });

  const TestComponent = () => <div>Protected Content</div>;

  it('should show loading spinner when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when unauthenticated and auth required', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <ProtectedRoute requireAuth={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('should redirect to custom path when unauthenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <ProtectedRoute requireAuth={true} redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/custom-login');
  });

  it('should show content when auth not required and unauthenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <ProtectedRoute requireAuth={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect to pending when user not approved', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent',
          isApproved: false,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute requireApproval={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/auth/pending');
  });

  it('should show content when approval not required and user not approved', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent',
          isApproved: false,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute requireApproval={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect to unauthorized when role requirement not met', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent',
          isApproved: true,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/unauthorized');
  });

  it('should show content when user has required role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          isApproved: true,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should allow admin to access agent-only content', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          isApproved: true,
          companyName: 'Admin Company',
          abtaPtsNumber: 'ABTA99999',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute requiredRole="agent">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show content when all requirements are met', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent',
          isApproved: true,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute
        requireAuth={true}
        requireApproval={true}
        requiredRole="agent"
      >
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show custom fallback when provided', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });

    const CustomFallback = () => <div>Custom Loading...</div>;

    render(
      <ProtectedRoute fallback={<CustomFallback />}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle multiple failed conditions correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'agent',
          isApproved: false,
          companyName: 'Test Company',
          abtaPtsNumber: 'ABTA12345',
        },
      },
      status: 'authenticated',
    });

    render(
      <ProtectedRoute
        requireAuth={true}
        requireApproval={true}
        requiredRole="admin"
      >
        <TestComponent />
      </ProtectedRoute>
    );

    // Should redirect to pending approval first (approval check comes before role check)
    expect(mockPush).toHaveBeenCalledWith('/auth/pending');
  });
});
