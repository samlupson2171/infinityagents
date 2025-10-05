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
  createdBy?: {
    _id: string;
    name: string;
  };
}

enum ActivityCategory {
  EXCURSION = 'excursion',
  SHOW = 'show',
  TRANSPORT = 'transport',
  DINING = 'dining',
  ADVENTURE = 'adventure',
  CULTURAL = 'cultural',
  NIGHTLIFE = 'nightlife',
  SHOPPING = 'shopping'
}

interface AdminActivityManagerProps {
  className?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface FilterOptions {
  categories: string[];
  locations: string[];
}

interface ActivityFormData {
  name: string;
  category: ActivityCategory;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: string;
  availableTo: string;
  duration: string;
  description: string;
  isActive: boolean;
}

const initialFormData: ActivityFormData = {
  name: '',
  category: ActivityCategory.EXCURSION,
  location: '',
  pricePerPerson: 0,
  minPersons: 1,
  maxPersons: 10,
  availableFrom: '',
  availableTo: '',
  duration: '',
  description: '',
  isActive: true,
};

export default function AdminActivityManager({
  className = '',
}: AdminActivityManagerProps) {
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    locations: [],
  });

  // Selection and bulk operations
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set()
  );
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<IActivity | null>(
    null
  );
  const [formData, setFormData] = useState<ActivityFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (locationFilter) params.append('location', locationFilter);

      const response = await fetch(
        `/api/admin/activities?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch activities');
      }

      if (data.success) {
        setActivities(data.data.activities);
        setPagination(data.data.pagination);
        setFilterOptions(data.data.filters);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch activities');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch activities'
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    categoryFilter,
    locationFilter,
  ]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (type: string, value: string) => {
    switch (type) {
      case 'status':
        setStatusFilter(value as 'all' | 'active' | 'inactive');
        break;
      case 'category':
        setCategoryFilter(value);
        break;
      case 'location':
        setLocationFilter(value);
        break;
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSelectActivity = (activityId: string) => {
    setSelectedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedActivities.size === activities.length) {
      setSelectedActivities(new Set());
    } else {
      setSelectedActivities(
        new Set(activities.map((activity) => activity._id.toString()))
      );
    }
  };

  const handleBulkOperation = async (
    operation: 'activate' | 'deactivate' | 'delete'
  ) => {
    if (selectedActivities.size === 0) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/activities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityIds: Array.from(selectedActivities),
          operation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || `Failed to ${operation} activities`
        );
      }

      if (data.success) {
        setSuccess(data.data.message);
        setSelectedActivities(new Set());
        setShowBulkActions(false);
        await fetchActivities();
      } else {
        throw new Error(
          data.error?.message || `Failed to ${operation} activities`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${operation} activities`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setError(null);
    setSuccess(null);

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (formData.pricePerPerson < 0)
      errors.pricePerPerson = 'Price must be positive';
    if (formData.minPersons < 1)
      errors.minPersons = 'Minimum persons must be at least 1';
    if (formData.maxPersons < formData.minPersons)
      errors.maxPersons = 'Maximum must be >= minimum';
    if (!formData.availableFrom)
      errors.availableFrom = 'Available from date is required';
    if (!formData.availableTo)
      errors.availableTo = 'Available to date is required';
    if (!formData.duration.trim()) errors.duration = 'Duration is required';
    if (!formData.description.trim())
      errors.description = 'Description is required';

    if (formData.availableFrom && formData.availableTo) {
      const fromDate = new Date(formData.availableFrom);
      const toDate = new Date(formData.availableTo);
      if (toDate <= fromDate) {
        errors.availableTo = 'Available to must be after available from';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const url = editingActivity
        ? `/api/admin/activities/${editingActivity._id}`
        : '/api/admin/activities';

      const method = editingActivity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save activity');
      }

      if (data.success) {
        setSuccess(
          editingActivity
            ? 'Activity updated successfully'
            : 'Activity created successfully'
        );
        setShowForm(false);
        setEditingActivity(null);
        setFormData(initialFormData);
        await fetchActivities();
      } else {
        throw new Error(data.error?.message || 'Failed to save activity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save activity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (activity: IActivity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      category: activity.category,
      location: activity.location,
      pricePerPerson: activity.pricePerPerson,
      minPersons: activity.minPersons,
      maxPersons: activity.maxPersons,
      availableFrom: activity.availableFrom.toISOString().split('T')[0],
      availableTo: activity.availableTo.toISOString().split('T')[0],
      duration: activity.duration,
      description: activity.description,
      isActive: activity.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (activityId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/activities/${activityId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete activity');
      }

      if (data.success) {
        setSuccess('Activity deleted successfully');
        setShowDeleteConfirm(null);
        await fetchActivities();
      } else {
        throw new Error(data.error?.message || 'Failed to delete activity');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete activity'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (activity: IActivity) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/activities/${activity._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !activity.isActive }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Failed to update activity status'
        );
      }

      if (data.success) {
        setSuccess(
          `Activity ${activity.isActive ? 'deactivated' : 'activated'} successfully`
        );
        await fetchActivities();
      } else {
        throw new Error(
          data.error?.message || 'Failed to update activity status'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update activity status'
      );
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Activity Management
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchActivities()}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setEditingActivity(null);
              setFormData(initialFormData);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Activity
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search activities..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={locationFilter}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Locations</option>
            {filterOptions.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedActivities.size > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-md">
          <span className="text-sm text-blue-700">
            {selectedActivities.size} activities selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkOperation('activate')}
              disabled={isLoading}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkOperation('deactivate')}
              disabled={isLoading}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
            >
              Deactivate
            </button>
            <button
              onClick={() => handleBulkOperation('delete')}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedActivities(new Set())}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {/* Activities Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    activities.length > 0 &&
                    selectedActivities.size === activities.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  {isLoading ? 'Loading activities...' : 'No activities found'}
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity._id.toString()} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedActivities.has(activity._id.toString())}
                      onChange={() =>
                        handleSelectActivity(activity._id.toString())
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {activity.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.duration}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                    {activity.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.location}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(activity.pricePerPerson)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.minPersons}-{activity.maxPersons}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(activity.isActive)}`}
                    >
                      {activity.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(activity)}
                      disabled={isLoading}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      {activity.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() =>
                        setShowDeleteConfirm(activity._id.toString())
                      }
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
            {pagination.total} activities
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = i + Math.max(1, pagination.page - 2);
              return page <= pagination.pages ? (
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
              ) : null;
            })}
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

      {/* Activity Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value as ActivityCategory,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(ActivityCategory).map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.location
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.location && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.location}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Person (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pricePerPerson}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          pricePerPerson: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.pricePerPerson
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.pricePerPerson && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.pricePerPerson}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Persons *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minPersons}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          minPersons: parseInt(e.target.value) || 1,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.minPersons
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.minPersons && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.minPersons}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Persons *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxPersons}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxPersons: parseInt(e.target.value) || 1,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.maxPersons
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.maxPersons && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.maxPersons}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available From *
                    </label>
                    <input
                      type="date"
                      value={formData.availableFrom}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          availableFrom: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.availableFrom
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.availableFrom && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.availableFrom}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available To *
                    </label>
                    <input
                      type="date"
                      value={formData.availableTo}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          availableTo: e.target.value,
                        }))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.availableTo
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.availableTo && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.availableTo}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      placeholder="e.g., 2 hours, Half day"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.duration
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.duration && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.duration}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.description
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.description}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingActivity(null);
                      setFormData(initialFormData);
                      setFormErrors({});
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading
                      ? 'Saving...'
                      : editingActivity
                        ? 'Update'
                        : 'Create'}
                  </button>
                </div>
              </form>
            </div>
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
              Are you sure you want to delete this activity? This action cannot
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
                onClick={() => handleDelete(showDeleteConfirm)}
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
