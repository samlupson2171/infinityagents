'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ContractTemplateManager from '@/components/admin/ContractTemplateManager';
import { ToastProvider } from '@/components/shared/Toast';

export default function AdminContractsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (session.user?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage contract templates and version history for agency agreements.
              </p>
            </div>
            
            <ContractTemplateManager />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}