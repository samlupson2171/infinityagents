'use client';

import React, { useState, useCallback } from 'react';
import { IDestination } from '@/models/Destination';
import DestinationPreview from './DestinationPreview';
import DestinationContentEditor from './DestinationContentEditor';

interface DestinationSideBySideEditorProps {
  destination: IDestination;
  onSave: (destination: IDestination) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export default function DestinationSideBySideEditor({
  destination,
  onSave,
  onCancel,
  className = ''
}: DestinationSideBySideEditorProps) {
  const [currentDestination, setCurrentDestination] = useState<IDestination>(destination);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('basic');

  const handleDestinationChange = useCallback((updatedDestination: IDestination) => {
    setCurrentDestination(updatedDestination);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(currentDestination);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Destination: {currentDestination.name}
          </h2>
          {hasUnsavedChanges && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Editor Panel */}
        <div className="w-1/2 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Content Editor</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <DestinationContentEditor
              destinationId={currentDestination._id}
              sections={currentDestination.sections}
              onSectionUpdate={(sectionKey, section) => {
                const updatedDestination = {
                  ...currentDestination,
                  sections: {
                    ...currentDestination.sections,
                    [sectionKey]: section
                  }
                };
                handleDestinationChange(updatedDestination);
              }}
              onSave={handleSave}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 flex flex-col">
          <DestinationPreview
            destination={currentDestination}
            mode="side-by-side"
            onDestinationChange={handleDestinationChange}
            isEditing={true}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}