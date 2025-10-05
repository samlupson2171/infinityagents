'use client';

import React, { useState, useEffect } from 'react';

interface VersionEntry {
  version: number;
  data: any;
  savedAt: string;
  savedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

interface VersionHistoryProps {
  destinationId: string;
  currentVersion: number;
  onRollback: (version: number) => void;
  className?: string;
}

export default function VersionHistory({
  destinationId,
  currentVersion,
  onRollback,
  className = ''
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [destinationId]);

  const fetchVersions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/destinations/${destinationId}/versions`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/destinations/${destinationId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save version');
      }

      await fetchVersions(); // Refresh the list
    } catch (error) {
      console.error('Error saving version:', error);
      alert(`Failed to save version: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedVersion) return;

    try {
      setIsRollingBack(true);
      const response = await fetch(`/api/admin/destinations/${destinationId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ version: selectedVersion }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rollback');
      }

      const result = await response.json();
      onRollback(selectedVersion);
      setShowRollbackModal(false);
      setSelectedVersion(null);
      await fetchVersions(); // Refresh the list
    } catch (error) {
      console.error('Error rolling back:', error);
      alert(`Failed to rollback: ${error.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const openRollbackModal = (version: number) => {
    setSelectedVersion(version);
    setShowRollbackModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getVersionChanges = (versionData: any) => {
    // Simple change detection - in a real app, you might want more sophisticated diff
    const changes = [];
    
    if (versionData.name) changes.push('Name');
    if (versionData.description) changes.push('Description');
    if (versionData.sections) changes.push('Content Sections');
    if (versionData.heroImage) changes.push('Hero Image');
    if (versionData.status) changes.push('Status');
    
    return changes.length > 0 ? changes.join(', ') : 'Various changes';
  };

  if (isLoading && versions.length === 0) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Failed to load version history</div>
          <button
            onClick={fetchVersions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Version History</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Current: v{currentVersion}</span>
          <button
            onClick={handleSaveVersion}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Save Version
          </button>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No previous versions available</p>
          <p className="text-sm mt-2">Save a version to create a restore point</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions
            .sort((a, b) => b.version - a.version)
            .map((version) => {
              const timestamp = formatDate(version.savedAt);
              
              return (
                <div
                  key={version.version}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        Version {version.version}
                      </span>
                      {version.version === currentVersion && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-1">
                      <p>Saved by {version.savedBy.name}</p>
                      <p>{timestamp.date} at {timestamp.time}</p>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Changes: {getVersionChanges(version.data)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {version.version !== currentVersion && (
                      <button
                        onClick={() => openRollbackModal(version.version)}
                        className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Confirm Rollback</h3>
            
            <div className="mb-4">
              <p className="text-gray-700">
                Are you sure you want to rollback to version {selectedVersion}?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This will create a new version with the content from version {selectedVersion}. 
                Your current changes will be preserved in the version history.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    This action cannot be undone, but you can always rollback to another version later.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRollbackModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                disabled={isRollingBack}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {isRollingBack ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}