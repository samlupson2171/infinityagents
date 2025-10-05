'use client';

import { useState, useEffect } from 'react';

interface QuoteVersion {
  _id: string;
  version: number;
  status: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  hotelName: string;
  numberOfPeople: number;
  numberOfRooms: number;
  numberOfNights: number;
  arrivalDate: string;
  isSuperPackage: boolean;
  transferIncluded: boolean;
  whatsIncluded: string;
  activitiesIncluded?: string;
  internalNotes?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  emailSent: boolean;
  emailSentAt?: string;
  changes: string[];
  isCurrentVersion: boolean;
}

interface QuoteVersionHistoryProps {
  quoteId: string;
  onClose: () => void;
  onCompareVersions?: (version1: string, version2: string) => void;
  className?: string;
}

export default function QuoteVersionHistory({
  quoteId,
  onClose,
  onCompareVersions,
  className = '',
}: QuoteVersionHistoryProps) {
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchVersionHistory();
  }, [quoteId]);

  const fetchVersionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quotes/${quoteId}/version-history`);
      const data = await response.json();

      if (response.ok) {
        setVersions(data.data.versions);
      } else {
        setError(data.error?.message || 'Failed to fetch version history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    } else {
      // Replace the first selected version
      setSelectedVersions([selectedVersions[1], versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompareVersions) {
      onCompareVersions(selectedVersions[0], selectedVersions[1]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'updated':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 ${className}`}>
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading version history...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 ${className}`}>
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white min-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Quote Version History</h3>
            <p className="text-sm text-gray-600 mt-1">
              {versions.length} version{versions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedVersions.length === 2 && onCompareVersions && (
              <button
                onClick={handleCompare}
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                Compare Selected
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {onCompareVersions && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 Select up to 2 versions to compare them side by side. 
              {selectedVersions.length > 0 && ` (${selectedVersions.length}/2 selected)`}
            </p>
          </div>
        )}

        {/* Version Timeline */}
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div
              key={version._id}
              className={`border rounded-lg p-4 ${
                version.isCurrentVersion 
                  ? 'border-blue-500 bg-blue-50' 
                  : selectedVersions.includes(version._id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white'
              } ${onCompareVersions ? 'cursor-pointer hover:border-gray-300' : ''}`}
              onClick={() => onCompareVersions && handleVersionSelect(version._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Version Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        Version {version.version}
                      </span>
                      {version.isCurrentVersion && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Current
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(version.status)}`}>
                        {version.status}
                      </span>
                    </div>
                    
                    {onCompareVersions && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedVersions.includes(version._id)}
                          onChange={() => handleVersionSelect(version._id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label className="ml-2 text-sm text-gray-600">Select for comparison</label>
                      </div>
                    )}
                  </div>

                  {/* Key Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Price:</span>
                      <span className="ml-2 text-sm text-gray-900 font-semibold">{version.formattedPrice}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Hotel:</span>
                      <span className="ml-2 text-sm text-gray-900">{version.hotelName}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">People:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {version.numberOfPeople} people, {version.numberOfRooms} rooms, {version.numberOfNights} nights
                      </span>
                    </div>
                  </div>

                  {/* Changes */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Changes:</span>
                    <ul className="ml-2 mt-1 space-y-1">
                      {version.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="text-sm text-gray-600 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      Created by {version.createdBy.name} on {formatDate(version.createdAt)}
                    </div>
                    <div className="flex items-center space-x-4">
                      {version.emailSent && version.emailSentAt && (
                        <span className="text-green-600">
                          ✓ Email sent {formatDate(version.emailSentAt)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVersion(expandedVersion === version._id ? null : version._id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {expandedVersion === version._id ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedVersion === version._id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Package Details</h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Arrival Date:</span>
                              <span className="ml-2">{new Date(version.arrivalDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="font-medium">Super Package:</span>
                              <span className="ml-2">{version.isSuperPackage ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                              <span className="font-medium">Transfer Included:</span>
                              <span className="ml-2">{version.transferIncluded ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">What's Included</h5>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {version.whatsIncluded.substring(0, 200)}
                            {version.whatsIncluded.length > 200 && '...'}
                          </p>
                        </div>
                      </div>

                      {version.activitiesIncluded && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">Activities Included</h5>
                          <p className="text-sm text-gray-600">{version.activitiesIncluded}</p>
                        </div>
                      )}

                      {version.internalNotes && (
                        <div className="mt-4">
                          <h5 className="font-medium text-gray-900 mb-2">Internal Notes</h5>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{version.internalNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}