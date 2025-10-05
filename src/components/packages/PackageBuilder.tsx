'use client';

import React, { useState, useEffect, useCallback } from 'react';
// Define interfaces locally to avoid importing mongoose models on client
interface IActivity {
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

interface IPackageActivity {
  activity: IActivity;
  quantity: number;
  subtotal: number;
}
import {
  validatePackageAvailability,
  validatePackageCapacity,
} from '@/lib/availability-utils';
import { AvailabilityBadge } from '../activities/AvailabilityIndicator';

export interface PackageItem extends IPackageActivity {
  activity: IActivity;
}

export interface PackageState {
  name: string;
  activities: PackageItem[];
  numberOfPersons: number;
  totalCost: number;
  clientName?: string;
  notes?: string;
}

interface PackageBuilderProps {
  initialPackage?: Partial<PackageState>;
  onPackageChange?: (packageState: PackageState) => void;
  onSave?: (packageState: PackageState) => Promise<void>;
  onExport?: (packageState: PackageState) => Promise<void>;
  className?: string;
}

export default function PackageBuilder({
  initialPackage,
  onPackageChange,
  onSave,
  onExport,
  className = '',
}: PackageBuilderProps) {
  const [packageState, setPackageState] = useState<PackageState>({
    name: initialPackage?.name || 'New Package',
    activities: initialPackage?.activities || [],
    numberOfPersons: initialPackage?.numberOfPersons || 1,
    totalCost: initialPackage?.totalCost || 0,
    clientName: initialPackage?.clientName || '',
    notes: initialPackage?.notes || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Calculate total cost whenever activities or number of persons changes
  const calculateTotalCost = useCallback(
    (activities: PackageItem[], numberOfPersons: number): number => {
      return activities.reduce((total, item) => {
        return total + item.subtotal * numberOfPersons;
      }, 0);
    },
    []
  );

  // Update total cost and validate package when activities or persons change
  useEffect(() => {
    const newTotalCost = calculateTotalCost(
      packageState.activities,
      packageState.numberOfPersons
    );
    if (newTotalCost !== packageState.totalCost) {
      setPackageState((prev) => ({
        ...prev,
        totalCost: newTotalCost,
      }));
    }

    // Validate package availability and capacity
    if (packageState.activities.length > 0) {
      const activities = packageState.activities.map((item) => item.activity);
      const mockPackage = {
        activities: packageState.activities.map((item) => ({
          activityId: item.activityId,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        numberOfPersons: packageState.numberOfPersons,
      } as any;

      const availabilityCheck = validatePackageAvailability(
        mockPackage,
        activities
      );
      const capacityCheck = validatePackageCapacity(mockPackage, activities);

      const newWarnings: string[] = [];

      // Add availability warnings
      if (availabilityCheck.warnings.length > 0) {
        newWarnings.push(...availabilityCheck.warnings);
      }

      // Add unavailable activity warnings
      if (availabilityCheck.unavailableActivities.length > 0) {
        availabilityCheck.unavailableActivities.forEach((item) => {
          newWarnings.push(`${item.activityName}: ${item.reason}`);
        });
      }

      // Add capacity warnings
      if (capacityCheck.issues.length > 0) {
        capacityCheck.issues.forEach((issue) => {
          newWarnings.push(`${issue.activityName}: ${issue.issue}`);
        });
      }

      setWarnings(newWarnings);
    } else {
      setWarnings([]);
    }
  }, [
    packageState.activities,
    packageState.numberOfPersons,
    calculateTotalCost,
  ]);

  // Notify parent component of package changes
  useEffect(() => {
    if (onPackageChange) {
      onPackageChange(packageState);
    }
  }, [packageState, onPackageChange]);

  const addActivity = useCallback(
    (activity: IActivity, quantity: number = 1) => {
      setPackageState((prev) => {
        const existingIndex = prev.activities.findIndex(
          (item) => item.activityId.toString() === activity._id.toString()
        );

        const subtotal = quantity * activity.pricePerPerson;
        const newActivity: PackageItem = {
          activityId: activity._id,
          activity,
          quantity,
          subtotal,
        };

        let newActivities: PackageItem[];
        if (existingIndex >= 0) {
          // Update existing activity
          newActivities = [...prev.activities];
          newActivities[existingIndex] = newActivity;
        } else {
          // Add new activity
          newActivities = [...prev.activities, newActivity];
        }

        return {
          ...prev,
          activities: newActivities,
        };
      });
    },
    []
  );

  const removeActivity = useCallback((activityId: string) => {
    setPackageState((prev) => ({
      ...prev,
      activities: prev.activities.filter(
        (item) => item.activityId.toString() !== activityId
      ),
    }));
  }, []);

  const updateActivityQuantity = useCallback(
    (activityId: string, quantity: number) => {
      if (quantity < 1) return;

      setPackageState((prev) => ({
        ...prev,
        activities: prev.activities.map((item) => {
          if (item.activityId.toString() === activityId) {
            return {
              ...item,
              quantity,
              subtotal: quantity * item.activity.pricePerPerson,
            };
          }
          return item;
        }),
      }));
    },
    []
  );

  const updateNumberOfPersons = useCallback((persons: number) => {
    if (persons < 1) return;
    setPackageState((prev) => ({
      ...prev,
      numberOfPersons: persons,
    }));
  }, []);

  const updatePackageDetails = useCallback(
    (updates: Partial<Pick<PackageState, 'name' | 'clientName' | 'notes'>>) => {
      setPackageState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const handleSave = async () => {
    if (!onSave) return;

    if (packageState.activities.length === 0) {
      setError('Cannot save empty package. Please add activities first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(packageState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!onExport) return;

    if (packageState.activities.length === 0) {
      setError('Cannot export empty package. Please add activities first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onExport(packageState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export package');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Package Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Package Builder</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Activities:</span>
            <span className="font-semibold text-blue-600">
              {packageState.activities.length}
            </span>
          </div>
        </div>

        {/* Package Details Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="packageName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Package Name
            </label>
            <input
              type="text"
              id="packageName"
              value={packageState.name}
              onChange={(e) => updatePackageDetails({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter package name"
            />
          </div>

          <div>
            <label
              htmlFor="clientName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Client Name (Optional)
            </label>
            <input
              type="text"
              id="clientName"
              value={packageState.clientName}
              onChange={(e) =>
                updatePackageDetails({ clientName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter client name"
            />
          </div>
        </div>

        {/* Number of Persons */}
        <div className="mb-4">
          <label
            htmlFor="numberOfPersons"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Number of Persons
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                updateNumberOfPersons(packageState.numberOfPersons - 1)
              }
              disabled={packageState.numberOfPersons <= 1}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <input
              type="number"
              id="numberOfPersons"
              value={packageState.numberOfPersons}
              onChange={(e) =>
                updateNumberOfPersons(parseInt(e.target.value) || 1)
              }
              min="1"
              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() =>
                updateNumberOfPersons(packageState.numberOfPersons + 1)
              }
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              +
            </button>
            <span className="text-sm text-gray-600 ml-2">persons</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={packageState.notes}
            onChange={(e) => updatePackageDetails({ notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this package..."
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Warnings Display */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md">
          <div className="font-medium mb-2">Package Warnings:</div>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Activities List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Selected Activities
        </h3>

        {packageState.activities.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">No activities added yet</p>
            <p className="text-sm text-gray-500">
              Use the activity search to add activities to your package
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {packageState.activities.map((item) => (
              <div
                key={item.activityId.toString()}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {item.activity.name}
                      </h4>
                      <AvailabilityBadge activity={item.activity} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {item.activity.location} • {item.activity.category}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      {item.activity.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Duration: {item.activity.duration}</span>
                      <span>
                        Price: {formatCurrency(item.activity.pricePerPerson)}
                        /person
                      </span>
                      <span>
                        Capacity: {item.activity.minPersons}-
                        {item.activity.maxPersons} persons
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="text-sm text-gray-600">Quantity:</label>
                      <button
                        onClick={() =>
                          updateActivityQuantity(
                            item.activityId.toString(),
                            item.quantity - 1
                          )
                        }
                        disabled={item.quantity <= 1}
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateActivityQuantity(
                            item.activityId.toString(),
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() =>
                          updateActivityQuantity(
                            item.activityId.toString(),
                            item.quantity + 1
                          )
                        }
                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-sm text-gray-600 mb-1">
                      Subtotal: {formatCurrency(item.subtotal)}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      Total:{' '}
                      {formatCurrency(
                        item.subtotal * packageState.numberOfPersons
                      )}
                    </div>

                    <button
                      onClick={() => removeActivity(item.activityId.toString())}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Package Summary */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Package Summary
            </h3>
            <p className="text-sm text-gray-600">
              {packageState.activities.length} activities for{' '}
              {packageState.numberOfPersons} person
              {packageState.numberOfPersons !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(packageState.totalCost)}
            </div>
            <div className="text-sm text-gray-600">Total Cost</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Package'}
            </button>
          )}

          {onExport && (
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the hook for external use
export function usePackageBuilder(initialPackage?: Partial<PackageState>) {
  const [packageState, setPackageState] = useState<PackageState>({
    name: initialPackage?.name || 'New Package',
    activities: initialPackage?.activities || [],
    numberOfPersons: initialPackage?.numberOfPersons || 1,
    totalCost: initialPackage?.totalCost || 0,
    clientName: initialPackage?.clientName || '',
    notes: initialPackage?.notes || '',
  });

  const addActivity = useCallback(
    (activity: IActivity, quantity: number = 1) => {
      setPackageState((prev) => {
        const existingIndex = prev.activities.findIndex(
          (item) => item.activityId.toString() === activity._id.toString()
        );

        const subtotal = quantity * activity.pricePerPerson;
        const newActivity: PackageItem = {
          activityId: activity._id,
          activity,
          quantity,
          subtotal,
        };

        let newActivities: PackageItem[];
        if (existingIndex >= 0) {
          newActivities = [...prev.activities];
          newActivities[existingIndex] = newActivity;
        } else {
          newActivities = [...prev.activities, newActivity];
        }

        const newTotalCost = newActivities.reduce((total, item) => {
          return total + item.subtotal * prev.numberOfPersons;
        }, 0);

        return {
          ...prev,
          activities: newActivities,
          totalCost: newTotalCost,
        };
      });
    },
    []
  );

  const removeActivity = useCallback((activityId: string) => {
    setPackageState((prev) => {
      const newActivities = prev.activities.filter(
        (item) => item.activityId.toString() !== activityId
      );

      const newTotalCost = newActivities.reduce((total, item) => {
        return total + item.subtotal * prev.numberOfPersons;
      }, 0);

      return {
        ...prev,
        activities: newActivities,
        totalCost: newTotalCost,
      };
    });
  }, []);

  const updateActivityQuantity = useCallback(
    (activityId: string, quantity: number) => {
      if (quantity < 1) return;

      setPackageState((prev) => {
        const newActivities = prev.activities.map((item) => {
          if (item.activityId.toString() === activityId) {
            return {
              ...item,
              quantity,
              subtotal: quantity * item.activity.pricePerPerson,
            };
          }
          return item;
        });

        const newTotalCost = newActivities.reduce((total, item) => {
          return total + item.subtotal * prev.numberOfPersons;
        }, 0);

        return {
          ...prev,
          activities: newActivities,
          totalCost: newTotalCost,
        };
      });
    },
    []
  );

  const updateNumberOfPersons = useCallback((persons: number) => {
    if (persons < 1) return;

    setPackageState((prev) => {
      const newTotalCost = prev.activities.reduce((total, item) => {
        return total + item.subtotal * persons;
      }, 0);

      return {
        ...prev,
        numberOfPersons: persons,
        totalCost: newTotalCost,
      };
    });
  }, []);

  const updatePackageDetails = useCallback(
    (updates: Partial<Pick<PackageState, 'name' | 'clientName' | 'notes'>>) => {
      setPackageState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  const resetPackage = useCallback(() => {
    setPackageState({
      name: 'New Package',
      activities: [],
      numberOfPersons: 1,
      totalCost: 0,
      clientName: '',
      notes: '',
    });
  }, []);

  return {
    packageState,
    addActivity,
    removeActivity,
    updateActivityQuantity,
    updateNumberOfPersons,
    updatePackageDetails,
    resetPackage,
    setPackageState,
  };
}
