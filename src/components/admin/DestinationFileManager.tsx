'use client';

import React, { useState, useCallback } from 'react';
import { useToast } from '@/components/shared/Toast';

interface DestinationFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'excel' | 'image' | 'document';
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: {
    name: string;
    email: string;
  };
  uploadedAt: string;
  description?: string;
  isPublic: boolean;
}

interface DestinationFileManagerProps {
  destinationId: string;
  files: DestinationFile[];
  onFilesChange: (files: DestinationFile[]) => void;
  readOnly?: boolean;
}

export default function DestinationFileManager({
  destinationId,
  files,
  onFilesChange,
  readOnly = false
}: DestinationFileManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { showSuccess, showError } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return '📄';
      case 'excel':
        return '📊';
      case 'image':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const handleFileUpload = useCallback(async (fileList: FileList) => {
    if (!fileList.length || readOnly) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(fileList).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('isPublic', 'true');

        const response = await fetch(`/api/admin/destinations/${destinationId}/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      const newFiles = results.map(result => result.file);
      
      onFilesChange([...files, ...newFiles]);
      showSuccess('Files uploaded successfully', `${newFiles.length} file(s) uploaded`);

    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsUploading(false);
    }
  }, [destinationId, files, onFilesChange, readOnly, showSuccess, showError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  }, [handleFileUpload]);

  const handleDeleteFile = async (fileId: string) => {
    if (readOnly) return;

    try {
      const response = await fetch(`/api/admin/destinations/${destinationId}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      const updatedFiles = files.filter(f => f.id !== fileId);
      onFilesChange(updatedFiles);
      showSuccess('File deleted successfully');

    } catch (error) {
      console.error('Delete error:', error);
      showError('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleUpdateFile = async (fileId: string, updates: { description?: string; isPublic?: boolean }) => {
    if (readOnly) return;

    try {
      const response = await fetch(`/api/admin/destinations/${destinationId}/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      const result = await response.json();
      const updatedFiles = files.map(f => f.id === fileId ? result.file : f);
      onFilesChange(updatedFiles);
      showSuccess('File updated successfully');

    } catch (error) {
      console.error('Update error:', error);
      showError('Update failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Files & Documents</h3>
        <span className="text-sm text-gray-500">{files.length} file(s)</span>
      </div>

      {!readOnly && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isUploading ? 'Uploading...' : 'Drop files here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                PDF, Excel, Word documents, and images up to 10MB
              </p>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDelete={() => handleDeleteFile(file.id)}
              onUpdate={(updates) => handleUpdateFile(file.id, updates)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📂</div>
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}

interface FileItemProps {
  file: DestinationFile;
  onDelete: () => void;
  onUpdate: (updates: { description?: string; isPublic?: boolean }) => void;
  readOnly: boolean;
}

function FileItem({ file, onDelete, onUpdate, readOnly }: FileItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(file.description || '');
  const [isPublic, setIsPublic] = useState(file.isPublic);

  const handleSave = () => {
    onUpdate({ description, isPublic });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(file.description || '');
    setIsPublic(file.isPublic);
    setIsEditing(false);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-2xl">{getFileIcon(file.fileType)}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900 truncate">{file.originalName}</h4>
              {file.isPublic && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
            </div>
            
            <div className="mt-1 text-sm text-gray-500">
              {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
              {file.uploadedBy && ` by ${file.uploadedBy.name}`}
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`public-${file.id}`}
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`public-${file.id}`} className="ml-2 text-sm text-gray-700">
                    Make file publicly accessible
                  </label>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              file.description && (
                <p className="mt-2 text-sm text-gray-600">{file.description}</p>
              )
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Download
          </a>
          
          {!readOnly && (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={onDelete}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'excel':
      return '📊';
    case 'image':
      return '🖼️';
    default:
      return '📎';
  }
}