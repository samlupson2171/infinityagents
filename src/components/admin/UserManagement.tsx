'use client';

import { useState, useEffect } from 'react';
import { IUser } from '@/models/User';

interface UserWithId extends Omit<IUser, '_id' | 'approvedBy'> {
  _id: string;
  approvedBy?: {
    _id: string;
    name: string;
    contactEmail: string;
  };
}

interface UserManagementProps {
  className?: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function UserManagement({
  className = '',
}: UserManagementProps) {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'approved' | 'pending'
  >('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null);
  
  // Form states
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    contactEmail: '',
    password: '',
    companyName: '',
    websiteAddress: '',
    abtaPtsNumber: '',
    role: 'agent' as 'agent' | 'admin',
    isApproved: true,
  });
  
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    contactEmail: '',
    companyName: '',
    websiteAddress: '',
    abtaPtsNumber: '',
    role: 'agent' as 'agent' | 'admin',
    isApproved: true,
  });
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (
      !confirm(
        'Are you sure you want to deactivate this user? They will lose access to the platform.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to deactivate user');
      }

      // Refresh the users list
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reactivate user');
      }

      // Refresh the users list
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      setActionLoading('create');
      setError(null); // Clear previous errors
      
      // Basic client-side validation
      if (!newUserForm.name.trim()) {
        throw new Error('Name is required');
      }
      if (!newUserForm.contactEmail.trim()) {
        throw new Error('Email is required');
      }
      if (!newUserForm.password.trim()) {
        throw new Error('Password is required');
      }
      if (newUserForm.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!newUserForm.companyName.trim()) {
        throw new Error('Company name is required');
      }
      if (!newUserForm.websiteAddress.trim()) {
        throw new Error('Website is required');
      }
      if (!newUserForm.abtaPtsNumber.trim()) {
        throw new Error('ABTA/PTS number is required');
      }
      
      console.log('Sending user data:', newUserForm);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserForm),
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        // Handle validation errors with more detail
        if (data.error?.code === 'VALIDATION_ERROR' && data.error?.details) {
          const errorMessages = data.error.details.map((detail: any) => 
            `${detail.path?.join?.('.') || detail.path}: ${detail.message}`
          ).join(', ');
          throw new Error(`Validation errors: ${errorMessages}`);
        }
        
        if (data.error?.code === 'MONGOOSE_VALIDATION_ERROR' && data.error?.details) {
          const errorMessages = data.error.details.map((detail: any) => 
            `${detail.path}: ${detail.message} (value: ${detail.value})`
          ).join(', ');
          throw new Error(`Database validation errors: ${errorMessages}`);
        }
        
        if (data.error?.code === 'DUPLICATE_KEY') {
          throw new Error(`Duplicate data: ${JSON.stringify(data.error.details)}`);
        }
        
        if (data.error?.code === 'INVALID_ABTA_PTS') {
          throw new Error(data.error.message);
        }
        
        throw new Error(data.error?.message || `Failed to create user (${response.status})`);
      }

      // Reset form and close modal
      setNewUserForm({
        name: '',
        contactEmail: '',
        password: '',
        companyName: '',
        websiteAddress: '',
        abtaPtsNumber: '',
        role: 'agent',
        isApproved: true,
      });
      setShowAddUserModal(false);
      
      // Refresh the users list
      fetchUsers();
    } catch (err) {
      console.error('Create user error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    try {
      setActionLoading('edit');
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editUserForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update user');
      }

      // Close modal and refresh
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePassword = async () => {
    if (!editingUser) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setActionLoading('password');
      const response = await fetch(`/api/admin/users/${editingUser._id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to change password');
      }

      // Reset form and close modal
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete user');
      }

      // Refresh the users list
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (user: UserWithId) => {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      contactEmail: user.contactEmail,
      companyName: user.companyName,
      websiteAddress: user.websiteAddress,
      abtaPtsNumber: user.abtaPtsNumber,
      role: user.role,
      isApproved: user.isApproved,
    });
    setShowEditUserModal(true);
  };

  const openPasswordModal = (user: UserWithId) => {
    setEditingUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Management
            </h3>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as 'all' | 'approved' | 'pending'
                  );
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Users</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg
                  className="h-4 w-4 mr-2"
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
                Add User
              </button>
              <button
                onClick={fetchUsers}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No users found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'all'
                  ? 'No users have registered yet.'
                  : `No ${statusFilter} users found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.contactEmail}
                            </div>
                            <div className="text-xs text-gray-400">
                              ABTA/PTS: {user.abtaPtsNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.companyName}
                          </div>
                          <div className="text-sm text-gray-500">
                            <a
                              href={user.websiteAddress}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {user.websiteAddress}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isApproved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {user.isApproved ? 'Approved' : 'Pending'}
                          </span>
                          {user.role === 'admin' && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          {user.approvedAt && (
                            <div className="text-xs text-gray-400">
                              Approved:{' '}
                              {new Date(user.approvedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-blue-600 hover:text-blue-900 px-2 py-1 text-xs"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-green-600 hover:text-green-900 px-2 py-1 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openPasswordModal(user)}
                              className="text-purple-600 hover:text-purple-900 px-2 py-1 text-xs"
                            >
                              Password
                            </button>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user._id, user.name)}
                                disabled={actionLoading === user._id}
                                className="text-red-600 hover:text-red-900 disabled:text-red-400 px-2 py-1 text-xs"
                              >
                                {actionLoading === user._id ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                            {user.isApproved ? (
                              <button
                                onClick={() => handleDeactivateUser(user._id)}
                                disabled={actionLoading === user._id}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-2 py-1 rounded text-xs"
                              >
                                {actionLoading === user._id
                                  ? 'Deactivating...'
                                  : 'Deactivate'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateUser(user._id)}
                                disabled={actionLoading === user._id}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-2 py-1 rounded text-xs"
                              >
                                {actionLoading === user._id
                                  ? 'Activating...'
                                  : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(pagination.totalPages, prev + 1)
                        )
                      }
                      disabled={!pagination.hasNextPage}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page{' '}
                        <span className="font-medium">
                          {pagination.currentPage}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">
                          {pagination.totalPages}
                        </span>{' '}
                        ({pagination.totalUsers} total users)
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={!pagination.hasPrevPage}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                        >
                          <span className="sr-only">Previous</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>

                        {Array.from(
                          { length: Math.min(5, pagination.totalPages) },
                          (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                  pageNum === pagination.currentPage
                                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(pagination.totalPages, prev + 1)
                            )
                          }
                          disabled={!pagination.hasNextPage}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                        >
                          <span className="sr-only">Next</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  User Details
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <p className="text-sm text-gray-900">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedUser.companyName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedUser.contactEmail}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ABTA/PTS Number
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedUser.abtaPtsNumber}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <a
                    href={selectedUser.websiteAddress}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedUser.websiteAddress}
                  </a>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedUser.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  {selectedUser.role === 'admin' && (
                    <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedUser.approvedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Approved Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedUser.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedUser.approvedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Approved By
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedUser.approvedBy.name} (
                      {selectedUser.approvedBy.contactEmail})
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedUser.isApproved ? (
                  <button
                    onClick={() => handleDeactivateUser(selectedUser._id)}
                    disabled={actionLoading === selectedUser._id}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-red-400"
                  >
                    {actionLoading === selectedUser._id
                      ? 'Deactivating...'
                      : 'Deactivate'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivateUser(selectedUser._id)}
                    disabled={actionLoading === selectedUser._id}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-green-400"
                  >
                    {actionLoading === selectedUser._id
                      ? 'Activating...'
                      : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newUserForm.contactEmail}
                    onChange={(e) => setNewUserForm({ ...newUserForm, contactEmail: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    value={newUserForm.companyName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, companyName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    value={newUserForm.websiteAddress}
                    onChange={(e) => setNewUserForm({ ...newUserForm, websiteAddress: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ABTA/PTS Number</label>
                  <input
                    type="text"
                    value={newUserForm.abtaPtsNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, abtaPtsNumber: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ABTA12345 or PTS67890"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must start with ABTA or PTS followed by 4-10 alphanumeric characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'agent' | 'admin' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUserForm.isApproved}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isApproved: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Approved</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={actionLoading === 'create'}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:bg-orange-400"
                >
                  {actionLoading === 'create' ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editUserForm.contactEmail}
                    onChange={(e) => setEditUserForm({ ...editUserForm, contactEmail: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input
                    type="text"
                    value={editUserForm.companyName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, companyName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    value={editUserForm.websiteAddress}
                    onChange={(e) => setEditUserForm({ ...editUserForm, websiteAddress: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ABTA/PTS Number</label>
                  <input
                    type="text"
                    value={editUserForm.abtaPtsNumber}
                    onChange={(e) => setEditUserForm({ ...editUserForm, abtaPtsNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as 'agent' | 'admin' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editUserForm.isApproved}
                    onChange={(e) => setEditUserForm({ ...editUserForm, isApproved: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Approved</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  disabled={actionLoading === 'edit'}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {actionLoading === 'edit' ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Change Password for {editingUser.name}
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>
                {passwordForm.newPassword && passwordForm.confirmPassword && 
                 passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={
                    actionLoading === 'password' || 
                    !passwordForm.newPassword || 
                    passwordForm.newPassword !== passwordForm.confirmPassword
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:bg-purple-400"
                >
                  {actionLoading === 'password' ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
