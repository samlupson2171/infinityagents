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

interface IActivityPackage {
  _id: string;
  title: string;
  description: string;
  activities: IPackageActivity[];
  totalCost: number;
  inclusions: string[];
  exclusions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
}
import { PackageState, PackageItem } from './PackageBuilder';

interface PackageListItem extends Omit<IActivityPackage, 'activities'> {
  activities: PackageItem[];
}

interface PackageManagerProps {
  onLoadPackage?: (packageData: PackageState) => void;
  onEditPackage?: (packageId: string, packageData: PackageState) => void;
  className?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function PackageManager({
  onLoadPackage,
  onEditPackage,
  className = '',
}: PackageManagerProps) {
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'draft' | 'finalized'
  >('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set()
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  const fetchPackages = useCallback(
    async (page: number = 1, status?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });

        if (status && status !== 'all') {
          params.append('status', status);
        }

        const response = await fetch(`/api/packages?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch packages');
        }

        if (data.success) {
          setPackages(data.data.packages);
          setPagination(data.data.pagination);
        } else {
          throw new Error(data.error?.message || 'Failed to fetch packages');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch packages'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPackages(1, selectedStatus === 'all' ? undefined : selectedStatus);
  }, [selectedStatus, fetchPackages]);

  const handleStatusChange = (status: 'all' | 'draft' | 'finalized') => {
    setSelectedStatus(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    fetchPackages(page, selectedStatus === 'all' ? undefined : selectedStatus);
  };

  const handleLoadPackage = (pkg: PackageListItem) => {
    if (!onLoadPackage) return;

    const packageState: PackageState = {
      name: pkg.name,
      activities: pkg.activities,
      numberOfPersons: pkg.numberOfPersons,
      totalCost: pkg.totalCost,
      clientName: pkg.clientName || '',
      notes: pkg.notes || '',
    };

    onLoadPackage(packageState);
  };

  const handleEditPackage = (pkg: PackageListItem) => {
    if (!onEditPackage) return;

    const packageState: PackageState = {
      name: pkg.name,
      activities: pkg.activities,
      numberOfPersons: pkg.numberOfPersons,
      totalCost: pkg.totalCost,
      clientName: pkg.clientName || '',
      notes: pkg.notes || '',
    };

    onEditPackage(pkg._id.toString(), packageState);
  };

  const handleDeletePackage = async (packageId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete package');
      }

      if (data.success) {
        // Refresh the packages list
        await fetchPackages(
          pagination.page,
          selectedStatus === 'all' ? undefined : selectedStatus
        );
        setShowDeleteConfirm(null);
      } else {
        throw new Error(data.error?.message || 'Failed to delete package');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePackageStatus = async (pkg: PackageListItem) => {
    setIsLoading(true);
    setError(null);

    try {
      const newStatus = pkg.status === 'draft' ? 'finalized' : 'draft';

      const response = await fetch(`/api/packages/${pkg._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Failed to update package status'
        );
      }

      if (data.success) {
        // Refresh the packages list
        await fetchPackages(
          pagination.page,
          selectedStatus === 'all' ? undefined : selectedStatus
        );
      } else {
        throw new Error(
          data.error?.message || 'Failed to update package status'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update package status'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(packageId)) {
        newSet.delete(packageId);
      } else {
        newSet.add(packageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(packages.map((pkg) => pkg._id.toString())));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalized':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Package Manager</h2>
        <button
          onClick={() =>
            fetchPackages(
              pagination.page,
              selectedStatus === 'all' ? undefined : selectedStatus
            )
          }
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) =>
              handleStatusChange(
                e.target.value as 'all' | 'draft' | 'finalized'
              )
            }
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Packages</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
          </select>
        </div>

        {selectedPackages.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedPackages.size} selected
            </span>
            <button
              onClick={() => setSelectedPackages(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Packages Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    packages.length > 0 &&
                    selectedPackages.size === packages.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activities
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Persons
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  {isLoading ? 'Loading packages...' : 'No packages found'}
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg._id.toString()} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedPackages.has(pkg._id.toString())}
                      onChange={() => handleSelectPackage(pkg._id.toString())}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pkg.name}
                      </div>
                      {pkg.clientName && (
                        <div className="text-sm text-gray-500">
                          Client: {pkg.clientName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pkg.activities.length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pkg.numberOfPersons}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(pkg.totalCost)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(pkg.status)}`}
                    >
                      {pkg.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(pkg.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    {onLoadPackage && (
                      <button
                        onClick={() => handleLoadPackage(pkg)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Load
                      </button>
                    )}
                    {onEditPackage && (
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleTogglePackageStatus(pkg)}
                      disabled={isLoading}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50"
                    >
                      {pkg.status === 'draft' ? 'Finalize' : 'Revert'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(pkg._id.toString())}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} packages
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 border rounded-md text-sm font-medium ${
                    page === pagination.page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this package? This action cannot
              be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePackage(showDeleteConfirm)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
