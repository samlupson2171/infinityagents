'use client';

import React from 'react';

interface DestinationFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'excel' | 'image' | 'document';
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
  description?: string;
  isPublic: boolean;
}

interface DestinationFilesProps {
  files: DestinationFile[];
  className?: string;
}

export default function DestinationFiles({ files, className = '' }: DestinationFilesProps) {
  // Only show public files
  const publicFiles = files.filter(file => file.isPublic);

  if (publicFiles.length === 0) {
    return null;
  }

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
        return (
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'excel':
        return (
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'image':
        return (
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return 'PDF Document';
      case 'excel':
        return 'Excel Spreadsheet';
      case 'image':
        return 'Image';
      default:
        return 'Document';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Downloads & Resources
        </h3>
        <p className="text-gray-600">
          Helpful documents and resources for your trip
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {publicFiles.map((file) => (
          <div
            key={file.id}
            className="group relative bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start space-x-3">
              {getFileIcon(file.fileType)}
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                  {file.originalName}
                </h4>
                
                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                  <span>{getFileTypeLabel(file.fileType)}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                </div>

                {file.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {file.description}
                  </p>
                )}

                <div className="mt-3">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {publicFiles.length > 6 && (
        <div className="mt-6 text-center">
          <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
            View all {publicFiles.length} files
          </button>
        </div>
      )}
    </div>
  );
}