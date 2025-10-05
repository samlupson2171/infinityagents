import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import OffersManager from '@/components/admin/OffersManager';

export const metadata: Metadata = {
  title: 'Offers Management - Infinity Weekends Admin',
  description:
    'Manage travel offers and packages for the Infinity Weekends platform',
};

export default function AdminOffersPage() {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <OffersManager />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
