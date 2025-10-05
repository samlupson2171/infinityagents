import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminActivityManager from '@/components/admin/AdminActivityManager';
import ActivitiesUpload from '@/components/admin/ActivitiesUpload';

export const metadata: Metadata = {
  title: 'Activities Management - Infinity Weekends Admin',
  description:
    'Manage activities and upload CSV files for the Infinity Weekends platform',
};

export default function AdminActivitiesPage() {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Activities Management
              </h1>
              <p className="mt-2 text-gray-600">
                Upload and manage activities for travel agents to use in their
                packages
              </p>
            </div>

            {/* Upload Section */}
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Upload Activities
                </h2>
                <ActivitiesUpload
                  onUploadComplete={() => window.location.reload()}
                />
              </div>
            </div>

            {/* Management Section */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Manage Activities
                </h2>
                <AdminActivityManager />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
