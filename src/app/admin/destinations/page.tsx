'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DestinationManager from '@/components/admin/DestinationManager';

export default function AdminDestinationsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <DestinationManager />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}