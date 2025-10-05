'use client';

import { useState, useRef } from 'react';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useToast } from '@/components/shared/Toast';
import {
  LoadingSpinner,
  LoadingButton,
} from '@/components/shared/LoadingSpinner';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ErrorDisplay } from '@/components/shared/ErrorBoundary';
import { uploadFileWithRetry } from '@/lib/retry-utils';

interface UploadError {
  line: number;
  field: string;
  value: any;
  message: string;
}

interface ImportError {
  row: any;
  error: string;
}

interface UploadResult {
  success: boolean;
  data?: {
    summary: {
      totalRows: number;
      validRows: number;
      errorRows: number;
      created: number;
      updated: number;
    };
    errors?: UploadError[];
    importErrors?: ImportError[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ActivitiesUploadProps {
  className?: string;
  onUploadComplete?: () => void;
}

export default function ActivitiesUpload({
  className = '',
  onUploadComplete,
}: ActivitiesUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
  } = useErrorHandler();
  const { showSuccess, showError, showWarning } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(
      (file) =>
        file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );

    if (csvFile) {
      setSelectedFile(csvFile);
      setUploadResult(null);
      clearError();
    } else {
      showError('Invalid File Type', 'Please select a CSV file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      clearError();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await executeWithErrorHandling(async () => {
      setUploadProgress(0);
      setUploadResult(null);

      // Use the retry-enabled upload function
      const uploadResult = await uploadFileWithRetry(
        '/api/admin/activities/upload',
        selectedFile,
        (progress) => setUploadProgress(progress),
        { maxAttempts: 2 }
      );

      setUploadResult(uploadResult);

      if (uploadResult.success) {
        const summary = uploadResult.data?.summary;
        if (summary) {
          showSuccess(
            'Upload Successful!',
            `Created: ${summary.created}, Updated: ${summary.updated}, Errors: ${summary.errorRows}`
          );
        }

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else if (uploadResult.data?.errors?.length) {
        showWarning(
          'Upload Completed with Errors',
          `${uploadResult.data.errors.length} validation errors found`
        );
      }

      return uploadResult;
    });

    if (!result) {
      // Error was handled by executeWithErrorHandling
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    clearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      'name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description',
      'Beach Excursion,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,"Guided beach tour with water sports and lunch"',
      'Flamenco Show,show,Benidorm,35.00,1,50,2025-01-01,2025-12-31,3 hours,"Authentic flamenco performance with dinner"',
      'Airport Transfer,transport,Benidorm,15.00,1,8,2025-01-01,2025-12-31,1 hour,"Comfortable airport transfer service"',
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-activities.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={className}>
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Activities CSV Upload
              </h3>
              <p className="text-gray-600">
                Upload activities in bulk using CSV files
              </p>
            </div>
            <button
              onClick={downloadSampleCSV}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">📥</span>
              Download Sample CSV
            </button>
          </div>

          {/* Upload Area */}
          <div className="mb-8">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-orange-400 bg-orange-50'
                  : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <div className="text-6xl">📄</div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedFile.name}
                    </h4>
                    <p className="text-gray-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  {/* Upload Progress */}
                  {isLoading && uploadProgress > 0 && (
                    <div className="mb-4">
                      <ProgressBar
                        progress={uploadProgress}
                        label="Uploading file..."
                        color="primary"
                      />
                    </div>
                  )}

                  <div className="flex justify-center space-x-4">
                    <LoadingButton
                      onClick={handleUpload}
                      isLoading={isLoading}
                      loadingText="Uploading..."
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <span className="mr-2">🚀</span>
                      Upload Activities
                    </LoadingButton>
                    <button
                      onClick={handleReset}
                      disabled={isLoading}
                      className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      Choose Different File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl">📁</div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Drop your CSV file here
                    </h4>
                    <p className="text-gray-600">or click to browse files</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Supported format: CSV files only</p>
                    <p>Maximum file size: 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-8">
              <ErrorDisplay
                error={error}
                onRetry={selectedFile ? handleUpload : undefined}
                onDismiss={clearError}
              />
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="mb-8">
              {uploadResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-green-800">
                        Upload Successful!
                      </h3>
                    </div>
                  </div>

                  {uploadResult.data && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {uploadResult.data.summary.totalRows}
                        </div>
                        <div className="text-sm text-gray-600">Total Rows</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {uploadResult.data.summary.validRows}
                        </div>
                        <div className="text-sm text-gray-600">Valid Rows</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {uploadResult.data.summary.created}
                        </div>
                        <div className="text-sm text-gray-600">Created</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {uploadResult.data.summary.updated}
                        </div>
                        <div className="text-sm text-gray-600">Updated</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {uploadResult.data.summary.errorRows}
                        </div>
                        <div className="text-sm text-gray-600">Error Rows</div>
                      </div>
                    </div>
                  )}

                  {uploadResult.data?.errors &&
                    uploadResult.data.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold text-orange-800 mb-2">
                          Validation Errors:
                        </h4>
                        <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                          {uploadResult.data.errors.map((error, index) => (
                            <div
                              key={index}
                              className="text-sm text-gray-700 mb-2"
                            >
                              <span className="font-medium">
                                Line {error.line}:
                              </span>{' '}
                              {error.message}
                              {error.field !== 'parsing' && (
                                <span className="text-gray-500">
                                  {' '}
                                  (Field: {error.field})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-red-800">
                        Upload Failed
                      </h3>
                      <p className="text-red-700 mt-1">
                        {uploadResult.error?.message}
                      </p>
                    </div>
                  </div>

                  {uploadResult.data?.errors &&
                    uploadResult.data.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold text-red-800 mb-2">
                          Validation Errors:
                        </h4>
                        <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                          {uploadResult.data.errors.map((error, index) => (
                            <div
                              key={index}
                              className="text-sm text-gray-700 mb-2"
                            >
                              <span className="font-medium">
                                Line {error.line}:
                              </span>{' '}
                              {error.message}
                              {error.field !== 'parsing' && (
                                <span className="text-gray-500">
                                  {' '}
                                  (Field: {error.field})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-blue-900 mb-4">
              CSV Format Requirements
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-blue-800 mb-2">
                  Required Headers:
                </h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    • <code className="bg-blue-100 px-1 rounded">name</code> -
                    Activity name (3-200 chars)
                  </li>
                  <li>
                    • <code className="bg-blue-100 px-1 rounded">category</code>{' '}
                    - excursion, show, transport, dining, adventure, cultural,
                    nightlife, shopping
                  </li>
                  <li>
                    • <code className="bg-blue-100 px-1 rounded">location</code>{' '}
                    - Activity location (2-100 chars)
                  </li>
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">
                      pricePerPerson
                    </code>{' '}
                    - Price in EUR (positive number)
                  </li>
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">minPersons</code>{' '}
                    - Minimum persons (1-100)
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-800 mb-2">
                  Additional Headers:
                </h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">maxPersons</code>{' '}
                    - Maximum persons (≥ minPersons)
                  </li>
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">
                      availableFrom
                    </code>{' '}
                    - Start date (YYYY-MM-DD)
                  </li>
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">
                      availableTo
                    </code>{' '}
                    - End date (YYYY-MM-DD)
                  </li>
                  <li>
                    • <code className="bg-blue-100 px-1 rounded">duration</code>{' '}
                    - Activity duration (max 50 chars)
                  </li>
                  <li>
                    •{' '}
                    <code className="bg-blue-100 px-1 rounded">
                      description
                    </code>{' '}
                    - Description (10-2000 chars)
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Activities with the same name and
                location will be updated. New activities will be created for
                unique name+location combinations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
