'use client';

import React, { useState } from 'react';
import { Eye, Download, Trash2, FileText, Image, File } from 'lucide-react';
import type { UploadedFile } from './FileUpload';

interface FilePreviewProps {
  file: UploadedFile;
  onRemove?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export default function FilePreview({
  file,
  onRemove,
  onDownload,
  showActions = true,
  compact = false,
  className = '',
}: FilePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type info
  const getFileTypeInfo = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return {
        icon: Image,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        type: 'Image',
        canPreview: true,
      };
    } else if (mimeType.includes('pdf')) {
      return {
        icon: FileText,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        type: 'PDF',
        canPreview: true,
      };
    } else if (mimeType.includes('word')) {
      return {
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        type: 'Word',
        canPreview: false,
      };
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return {
        icon: FileText,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        type: 'Excel',
        canPreview: false,
      };
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return {
        icon: FileText,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        type: 'PowerPoint',
        canPreview: false,
      };
    }
    return {
      icon: File,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      type: 'File',
      canPreview: false,
    };
  };

  const fileTypeInfo = getFileTypeInfo(file.mimeType);
  const IconComponent = fileTypeInfo.icon;

  // Handle download
  const handleDownload = () => {
    if (onDownload) {
      onDownload(file.id);
    } else {
      // Default download behavior
      window.open(`/api/training/files/${file.id}/download`, '_blank');
    }
  };

  // Handle preview
  const handlePreview = () => {
    if (fileTypeInfo.canPreview) {
      setIsPreviewOpen(true);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 p-2 rounded ${className}`}>
        <div className={`p-1 rounded ${fileTypeInfo.bgColor}`}>
          <IconComponent className={`h-4 w-4 ${fileTypeInfo.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.originalName}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
        </div>
        {showActions && (
          <div className="flex items-center space-x-1">
            {fileTypeInfo.canPreview && (
              <button
                onClick={handlePreview}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            {onRemove && (
              <button
                onClick={() => onRemove(file.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className={`p-3 rounded-lg ${fileTypeInfo.bgColor}`}>
            <IconComponent className={`h-6 w-6 ${fileTypeInfo.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {file.originalName}
            </h4>
            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
              <span>{fileTypeInfo.type}</span>
              <span>{formatFileSize(file.size)}</span>
              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>
            
            {/* File description or metadata could go here */}
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                Uploaded on {new Date(file.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              {fileTypeInfo.canPreview && (
                <button
                  onClick={handlePreview}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors rounded-md hover:bg-gray-50"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-green-500 transition-colors rounded-md hover:bg-gray-50"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              {onRemove && (
                <button
                  onClick={() => onRemove(file.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-gray-50"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <FilePreviewModal
          file={file}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  );
}

interface FilePreviewModalProps {
  file: UploadedFile;
  onClose: () => void;
}

function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {file.originalName}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pb-4 sm:p-6 sm:pt-0">
            <div className="max-h-96 overflow-auto">
              {isImage && (
                <img
                  src={`/api/training/files/${file.id}/download`}
                  alt={file.originalName}
                  className="max-w-full h-auto mx-auto"
                />
              )}
              
              {isPDF && (
                <iframe
                  src={`/api/training/files/${file.id}/download`}
                  className="w-full h-96 border-0"
                  title={file.originalName}
                />
              )}
              
              {!isImage && !isPDF && (
                <div className="text-center py-8">
                  <File className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    Preview not available for this file type
                  </p>
                  <button
                    onClick={() => window.open(`/api/training/files/${file.id}/download`, '_blank')}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={() => window.open(`/api/training/files/${file.id}/download`, '_blank')}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}