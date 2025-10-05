'use client';

import { useState, useEffect } from 'react';
import { IUser } from '@/models/User';

interface AgencyUser extends Omit<IUser, '_id' | 'approvedBy'> {
  _id: string;
  approvedBy?: {
    _id: string;
    name: string;
    contactEmail: string;
  };
}

interface AgencyManagementProps {
  className?: string;
  onStatsChange?: () => void;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function AgencyManagement({
  className = '',
  onStatsChange,
}: AgencyManagementProps) {
  const [agencies, setAgencies] = useState<AgencyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<AgencyUser | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'contracted'
  >('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState<AgencyUser | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState<AgencyUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    fetchAgencies();
  }, [statusFilter, currentPage]);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        role: 'agent', // Only fetch agency users
        ...(statusFilter !== 'all' && { registrationStatus: statusFilter }),
      });

      const response = await fetch(`/api/admin/agencies?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch agencies');
      }

      setAgencies(data.data.agencies);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAgency = async (agency: AgencyUser) => {
    try {
      setActionLoading(agency._id);
      const response = await fetch(`/api/admin/agencies/${agency._id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments: approvalComments }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to approve agency');
      }

      // Refresh the agencies list
      fetchAgencies();
      // Refresh parent dashboard stats
      onStatsChange?.();
      setShowApprovalDialog(null);
      setApprovalComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAgency = async (agency: AgencyUser) => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(agency._id);
      const response = await fetch(`/api/admin/agencies/${agency._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reject agency');
      }

      // Refresh the agencies list
      fetchAgencies();
      // Refresh parent dashboard stats
      onStatsChange?.();
      setShowRejectionDialog(null);
      setRejectionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      contracted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Contracted' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading agencies...</span>
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
              onClick={fetchAgencies}
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
              Agency Registration Management
            </h3>
            <div className="flex items-center space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value as 'all' | 'pending' | 'approved' | 'rejected' | 'contracted'
                  );
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Agencies</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="contracted">Contracted</option>
              </select>
              <button
                onClick={fetchAgencies}
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

          {agencies.length === 0 ? (
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No agencies found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'all'
                  ? 'No agencies have registered yet.'
                  : `No ${statusFilter} agencies found.`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agency Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Information
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
                    {agencies.map((agency) => (
                      <tr key={agency._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {agency.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {agency.contactEmail}
                            </div>
                            <div className="text-xs text-gray-400">
                              ABTA/PTS: {agency.abtaPtsNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {agency.company}
                          </div>
                          {agency.consortia && (
                            <div className="text-sm text-gray-500">
                              Consortia: {agency.consortia}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            <a
                              href={agency.websiteAddress}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {agency.websiteAddress}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(agency.registrationStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {new Date(agency.createdAt).toLocaleDateString()}
                          </div>
                          {agency.approvedAt && (
                            <div className="text-xs text-gray-400">
                              Approved:{' '}
                              {new Date(agency.approvedAt).toLocaleDateString()}
                            </div>
                          )}
                          {agency.contractSignedAt && (
                            <div className="text-xs text-gray-400">
                              Contracted:{' '}
                              {new Date(agency.contractSignedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setSelectedAgency(agency)}
                              className="text-blue-600 hover:text-blue-900 px-2 py-1 text-sm"
                            >
                              View Details
                            </button>
                            {agency.registrationStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => setShowApprovalDialog(agency)}
                                  disabled={actionLoading === agency._id}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm"
                                >
                                  {actionLoading === agency._id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => setShowRejectionDialog(agency)}
                                  disabled={actionLoading === agency._id}
                                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm"
                                >
                                  {actionLoading === agency._id ? 'Processing...' : 'Reject'}
                                </button>
                              </>
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
                        ({pagination.totalUsers} total agencies)
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

      {/* Agency Details Modal */}
      {selectedAgency && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Agency Details
                </h3>
                <button
                  onClick={() => setSelectedAgency(null)}
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
                    Contact Name
                  </label>
                  <p className="text-sm text-gray-900">{selectedAgency.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedAgency.company}
                  </p>
                </div>
                {selectedAgency.consortia && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Consortia
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAgency.consortia}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedAgency.contactEmail}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ABTA/PTS Number
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedAgency.abtaPtsNumber}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <a
                    href={selectedAgency.websiteAddress}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedAgency.websiteAddress}
                  </a>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Status
                  </label>
                  {getStatusBadge(selectedAgency.registrationStatus)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedAgency.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedAgency.approvedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Approved Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedAgency.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedAgency.approvedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Approved By
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAgency.approvedBy.name} (
                      {selectedAgency.approvedBy.contactEmail})
                    </p>
                  </div>
                )}
                {selectedAgency.contractSignedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contract Signed Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedAgency.contractSignedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedAgency.contractVersion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contract Version
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAgency.contractVersion}
                    </p>
                  </div>
                )}
                {selectedAgency.rejectionReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rejection Reason
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedAgency.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedAgency(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Approve Agency Registration
                </h3>
                <button
                  onClick={() => {
                    setShowApprovalDialog(null);
                    setApprovalComments('');
                  }}
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

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to approve the registration for{' '}
                  <strong>{showApprovalDialog.company}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  This will send an approval email with contract signing instructions to{' '}
                  {showApprovalDialog.contactEmail}.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments (Optional)
                  </label>
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add any comments for internal records..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalDialog(null);
                    setApprovalComments('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproveAgency(showApprovalDialog)}
                  disabled={actionLoading === showApprovalDialog._id}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-green-400"
                >
                  {actionLoading === showApprovalDialog._id ? 'Approving...' : 'Approve Agency'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Confirmation Dialog */}
      {showRejectionDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Reject Agency Registration
                </h3>
                <button
                  onClick={() => {
                    setShowRejectionDialog(null);
                    setRejectionReason('');
                  }}
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

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to reject the registration for{' '}
                  <strong>{showRejectionDialog.company}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  This will send a rejection notification to {showRejectionDialog.contactEmail}.
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={4}
                    required
                  />
                  {!rejectionReason.trim() && (
                    <p className="text-xs text-red-500 mt-1">
                      Rejection reason is required
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectionDialog(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectAgency(showRejectionDialog)}
                  disabled={actionLoading === showRejectionDialog._id || !rejectionReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-red-400"
                >
                  {actionLoading === showRejectionDialog._id ? 'Rejecting...' : 'Reject Agency'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}