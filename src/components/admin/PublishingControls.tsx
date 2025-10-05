'use client';

import React, { useState } from 'react';
import { IDestination } from '@/models/Destination';

interface PublishingControlsProps {
  destination: IDestination;
  onStatusChange: (destination: IDestination) => void;
  className?: string;
}

export default function PublishingControls({
  destination,
  onStatusChange,
  className = ''
}: PublishingControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'unpublish' | 'archive' | 'schedule'>('publish');
  const [comment, setComment] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const handleAction = async (action: 'publish' | 'unpublish' | 'archive' | 'schedule', data?: any) => {
    setIsLoading(true);
    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = { comment };

      switch (action) {
        case 'publish':
          endpoint = `/api/admin/destinations/${destination._id}/publish`;
          break;
        case 'unpublish':
          endpoint = `/api/admin/destinations/${destination._id}/publish`;
          method = 'DELETE';
          break;
        case 'archive':
          endpoint = `/api/admin/destinations/${destination._id}/archive`;
          break;
        case 'schedule':
          endpoint = `/api/admin/destinations/${destination._id}/schedule`;
          body.scheduledDate = data?.scheduledDate;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Action failed');
      }

      const result = await response.json();
      onStatusChange(result.destination);
      
      // Reset form state
      setComment('');
      setScheduledDate('');
      setShowCommentModal(false);
      setShowScheduleModal(false);
    } catch (error) {
      console.error(`Error ${action}ing destination:`, error);
      alert(`Failed to ${action} destination: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openActionModal = (action: 'publish' | 'unpublish' | 'archive' | 'schedule') => {
    setActionType(action);
    if (action === 'schedule') {
      setShowScheduleModal(true);
    } else {
      setShowCommentModal(true);
    }
  };

  const executeAction = () => {
    if (actionType === 'schedule') {
      handleAction('schedule', { scheduledDate });
    } else {
      handleAction(actionType);
    }
  };

  const canPublish = () => {
    if (destination.approvalWorkflow?.isRequired) {
      return destination.approvalWorkflow.status === 'approved';
    }
    return true;
  };

  const getStatusBadge = () => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    
    switch (destination.status) {
      case 'published':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Published
          </span>
        );
      case 'draft':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Archived
        </span>
        );
      default:
        return null;
    }
  };

  const getApprovalBadge = () => {
    if (!destination.approvalWorkflow?.isRequired) return null;

    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium ml-2';
    
    switch (destination.approvalWorkflow.status) {
      case 'pending':
        return (
          <span className={`${baseClasses} bg-orange-100 text-orange-800`}>
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">Publishing Status</h3>
          <div className="ml-3 flex items-center">
            {getStatusBadge()}
            {getApprovalBadge()}
          </div>
        </div>
        
        {destination.scheduledPublishAt && (
          <div className="text-sm text-gray-600">
            Scheduled: {new Date(destination.scheduledPublishAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Publishing Actions */}
      <div className="flex flex-wrap gap-2">
        {destination.status === 'draft' && (
          <>
            <button
              onClick={() => openActionModal('publish')}
              disabled={isLoading || !canPublish()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Publishing...' : 'Publish Now'}
            </button>
            
            <button
              onClick={() => openActionModal('schedule')}
              disabled={isLoading || !canPublish()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Schedule Publish
            </button>
          </>
        )}

        {destination.status === 'published' && (
          <button
            onClick={() => openActionModal('unpublish')}
            disabled={isLoading}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {isLoading ? 'Unpublishing...' : 'Unpublish'}
          </button>
        )}

        {destination.status !== 'archived' && (
          <button
            onClick={() => openActionModal('archive')}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {isLoading ? 'Archiving...' : 'Archive'}
          </button>
        )}

        {destination.scheduledPublishAt && (
          <button
            onClick={() => handleAction('schedule')} // This will cancel the schedule
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Cancel Schedule
          </button>
        )}
      </div>

      {/* Approval Status */}
      {destination.approvalWorkflow?.isRequired && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Approval Workflow</h4>
          <div className="text-sm text-gray-600">
            <p>Status: {destination.approvalWorkflow.status}</p>
            {destination.approvalWorkflow.requestedBy && (
              <p>Requested by: {destination.approvalWorkflow.requestedBy.name}</p>
            )}
            {destination.approvalWorkflow.reviewedBy && (
              <p>Reviewed by: {destination.approvalWorkflow.reviewedBy.name}</p>
            )}
            {destination.approvalWorkflow.comments && (
              <p>Comments: {destination.approvalWorkflow.comments}</p>
            )}
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)} Destination
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add a comment about this action..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Schedule Publishing</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publish Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add a comment about this scheduled publish..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={isLoading || !scheduledDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}