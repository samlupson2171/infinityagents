'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ActivitySearch from '@/components/activities/ActivitySearch';
import PackageBuilder from '@/components/packages/PackageBuilder';
// Define Activity interface locally to avoid importing mongoose models on client
interface Activity {
  _id: string;
  name: string;
  category: string;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: string;
  availableTo: string;
  duration: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ActivitiesPage() {
  const { data: session } = useSession();
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);

  const handleActivitySelect = (activity: Activity) => {
    // Check if activity is already selected
    const isAlreadySelected = selectedActivities.some(
      (a) => a._id === activity._id
    );
    if (!isAlreadySelected) {
      setSelectedActivities((prev) => [...prev, activity]);
    }
  };

  const handleActivityRemove = (activityId: string) => {
    setSelectedActivities((prev) => prev.filter((a) => a._id !== activityId));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Activities
            </h1>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Search and select activities to build custom packages for your
              clients
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Activity Search - Takes up 2 columns */}
            <div className="lg:col-span-2">
              <ActivitySearch onActivitySelect={handleActivitySelect} />
            </div>

            {/* Package Builder - Takes up 1 column */}
            <div className="lg:col-span-1">
              <PackageBuilder
                activities={selectedActivities}
                onActivityRemove={handleActivityRemove}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
