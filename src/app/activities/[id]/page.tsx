'use client';

import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ActivityDetails from '@/components/activities/ActivityDetails';

export default function ActivityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;

  const handleBackToSearch = () => {
    router.push('/activities');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={handleBackToSearch}
              className="flex items-center text-gray-600 hover:text-orange-500 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Activities
            </button>
          </div>

          {/* Activity Details Component */}
          <ActivityDetails activityId={activityId} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
