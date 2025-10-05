import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import EnquiriesManager from '@/components/admin/EnquiriesManager';

export const metadata: Metadata = {
  title: 'Enquiries Management - Infinity Weekends Admin',
  description: 'Manage and track client enquiries submitted by travel agents',
};

export default function AdminEnquiriesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <EnquiriesManager />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
