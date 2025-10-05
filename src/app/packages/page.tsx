'use client';

import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PackageManager from '@/components/packages/PackageManager';
import Link from 'next/link';

export default function PackagesPage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Activity Packages
            </h1>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Manage your saved activity packages and create new ones
            </p>
          </div>

          {/* Action Bar */}
          <div className="mb-8 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Packages
            </h2>
            <Link
              href="/activities"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create New Package
            </Link>
          </div>

          {/* Package Manager Component */}
          <PackageManager />
        </div>
      </div>
    </ProtectedRoute>
  );
}
