import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, requireAuth, router]);

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    user: session?.user,
  };
}

export function useRequireAuth() {
  return useAuth(true);
}

export function useRequireAdmin() {
  const { session, status, isLoading } = useAuth(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session && session.user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [session, isLoading, router]);

  return {
    session,
    status,
    isLoading: isLoading || (session && session.user.role !== 'admin'),
    isAdmin: session?.user.role === 'admin',
    user: session?.user,
  };
}

export function useRequireApproval() {
  const { session, status, isLoading } = useAuth(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session && !session.user.isApproved) {
      router.push('/auth/pending');
    }
  }, [session, isLoading, router]);

  return {
    session,
    status,
    isLoading: isLoading || (session && !session.user.isApproved),
    isApproved: session?.user.isApproved,
    user: session?.user,
  };
}
