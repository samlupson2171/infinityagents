'use client';

import React, { useState } from 'react';
import { IDestination } from '@/models/Destination';

interface ApprovalWorkflowProps {
  destination: IDestination;
  onApprovalChange: (destination: IDestination) => void;
  userRole: string;
  className?: string;
}

export default function ApprovalWorkflow({
  destination,
  onApprovalChange,
  userRole,
  className = ''
}: ApprovalWorkflowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [comment, setComment] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  const handleRequestApproval = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/destinations/${destination._id}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request approval');
      }

      const result = await response.json();
      onApprovalChange(result.destination);
      setComment('');
      setShowRequestModal(false);
    } catch (error) {
      console.error('Error requesting approval:', error);
      alert(`Failed to request approval: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewApproval = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/destinations/${destination._id}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: reviewAction,
          comment 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process approval');
      }

      const result = await response.json();
      onApprovalChange(result.destination);
      setComment('');
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error processing approval:', error);
      alert(`Failed to ${reviewAction} content: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openReviewModal = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const canRequestApproval = () => {
    return !destination.approvalWorkflow?.isRequired || 
           destination.approvalWorkflow.status === 'rejected' ||
           destination.approvalWorkflow.status === 'not_required';
  };

  const canReviewApproval = () => {
    return userRole === 'admin' && 
           destination.approvalWorkflow?.status === 'pending';
  };

  const getWorkflowStatus = () => {
    if (!destination.approvalWorkflow?.isRequired) {
      return (
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          No approval required
        </div>
      );
    }

    const status = destination.approvalWorkflow.status;
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending Review' },
      approved: { color: 'green', text: 'Approved' },
      rejected: { color: 'red', text: 'Rejected' },
      not_required: { color: 'gray', text: 'No Approval Required' }
    };

    const config = statusConfig[status] || statusConfig.not_required;

    return (
      <div className="flex items-center text-sm">
        <div className={`w-2 h-2 bg-${config.color}-500 rounded-full mr-2`}></div>
        <span className={`text-${config.color}-700`}>{config.text}</span>
      </div>
    );
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Approval Workflow</h3>
        {getWorkflowStatus()}
      </div>

      {/* Workflow Details */}
      {destination.approvalWorkflow?.isRequired && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {destination.approvalWorkflow.requestedBy && (
              <div>
                <span className="font-medium text-gray-700">Requested by:</span>
                <p className="text-gray-600">{destination.approvalWorkflow.requestedBy.name}</p>
                <p className="text-gray-500 text-xs">
                  {destination.approvalWorkflow.requestedAt && 
                    new Date(destination.approvalWorkflow.requestedAt).toLocaleString()}
                </p>
              </div>
            )}

            {destination.approvalWorkflow.reviewedBy && (
              <div>
                <span className="font-medium text-gray-700">Reviewed by:</span>
                <p className="text-gray-600">{destination.approvalWorkflow.reviewedBy.name}</p>
                <p className="text-gray-500 text-xs">
                  {destination.approvalWorkflow.reviewedAt && 
                    new Date(destination.approvalWorkflow.reviewedAt).toLocaleString()}
                </p>
              </div>
            )}

            {destination.approvalWorkflow.comments && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Comments:</span>
                <p className="text-gray-600 mt-1">{destination.approvalWorkflow.comments}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {canRequestApproval() && (
          <button
            onClick={() => setShowRequestModal(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Request Approval
          </button>
        )}

        {canReviewApproval() && (
          <>
            <button
              onClick={() => openReviewModal('approve')}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => openReviewModal('reject')}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
      </div>

      {/* Request Approval Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Request Approval</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Reviewer (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Provide context or specific areas you'd like reviewed..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestApproval}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Requesting...' : 'Request Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {reviewAction === 'approve' ? 'Approve Content' : 'Reject Content'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Comments {reviewAction === 'reject' ? '(required)' : '(optional)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder={
                  reviewAction === 'approve' 
                    ? "Add any final comments or suggestions..."
                    : "Please explain what needs to be changed before approval..."
                }
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewApproval}
                disabled={isLoading || (reviewAction === 'reject' && !comment.trim())}
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  reviewAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoading ? 'Processing...' : (reviewAction === 'approve' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}