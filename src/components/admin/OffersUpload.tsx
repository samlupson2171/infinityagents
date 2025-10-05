'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/shared/Toast';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface PreviewData {
  sheets: string[];
  headers: Record<string, string[]>;
  sampleData: Record<string, any[]>;
  filename: string;
  size: number;
}

interface ImportResult {
  parseResult: {
    totalRows: number;
    validOffers: number;
    skippedRows: number;
    warnings: string[];
    errors: string[];
  };
  importResults: {
    created: number;
    updated: number;
    errors: string[];
  };
  summary: {
    totalProcessed: number;
    created: number;
    updated: number;
    failed: number;
  };
}

interface OffersUploadProps {
  onUploadComplete?: () => void;
}

export default function OffersUpload({ onUploadComplete }: OffersUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const { showSuccess, showError, showWarning } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setCurrentFile(file);
    setPreviewData(null);
    setImportResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const response = await fetch('/api/admin/offers/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setPreviewData(result.data);
        setSelectedSheet(result.data.sheets[0] || '');
        showSuccess('File uploaded successfully', 'Review the preview and configure import settings');
      } else {
        showError('Upload failed', result.error.message);
      }
    } catch (error) {
      showError('Upload failed', 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  }, [showSuccess, showError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  const handleImport = async () => {
    if (!currentFile) return;

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('action', 'import');
      formData.append('sheetName', selectedSheet);
      formData.append('headerRow', headerRow.toString());
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const response = await fetch('/api/admin/offers/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setImportResult(result.data);
        showSuccess(
          'Import completed successfully',
          `Created: ${result.data.summary.created}, Updated: ${result.data.summary.updated}`
        );
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        showError('Import failed', result.error.message);
      }
    } catch (error) {
      showError('Import failed', 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const updateColumnMapping = (originalColumn: string, mappedColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [originalColumn]: mappedColumn
    }));
  };

  const commonColumns = [
    'destination', 'title', 'description', 'month', 'accommodation',
    'duration', 'price', 'inclusions', 'exclusions', 'notes'
  ];

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div {...getRootProps()} className="text-center cursor-pointer">
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-lg text-gray-600">Processing file...</p>
            </div>
          ) : (
            <div>
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                📊
              </div>
              
              {isDragActive ? (
                <p className="text-lg text-blue-600">Drop the Excel file here...</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-600 mb-2">
                    Drag and drop an Excel file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            File Preview: {previewData.filename}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Sheet Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sheet
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {previewData.sheets.map(sheet => (
                  <option key={sheet} value={sheet}>{sheet}</option>
                ))}
              </select>
            </div>

            {/* Header Row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header Row (0-based)
              </label>
              <input
                type="number"
                value={headerRow}
                onChange={(e) => setHeaderRow(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Column Mapping */}
          {selectedSheet && previewData.headers[selectedSheet] && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Column Mapping
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewData.headers[selectedSheet].map((header, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      {header}
                    </label>
                    <select
                      value={columnMapping[header] || ''}
                      onChange={(e) => updateColumnMapping(header, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Skip Column --</option>
                      {commonColumns.map(col => (
                        <option key={col} value={col}>
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Data Preview */}
          {selectedSheet && previewData.sampleData[selectedSheet] && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">
                Sample Data (First 3 rows)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers[selectedSheet].map((header, index) => (
                        <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sampleData[selectedSheet].map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.map((cell: any, cellIndex: number) => (
                          <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border-r">
                            {String(cell).substring(0, 50)}
                            {String(cell).length > 50 && '...'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Button */}
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={isUploading || !selectedSheet}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              {isUploading ? 'Importing...' : 'Import Offers'}
            </button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Import Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {importResult.summary.totalProcessed}
              </div>
              <div className="text-sm text-blue-800">Total Processed</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {importResult.summary.created}
              </div>
              <div className="text-sm text-green-800">Created</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {importResult.summary.updated}
              </div>
              <div className="text-sm text-yellow-800">Updated</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {importResult.summary.failed}
              </div>
              <div className="text-sm text-red-800">Failed</div>
            </div>
          </div>

          {/* Warnings and Errors */}
          {(importResult.parseResult.warnings.length > 0 || importResult.parseResult.errors.length > 0) && (
            <div className="space-y-4">
              {importResult.parseResult.warnings.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {importResult.parseResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {importResult.parseResult.errors.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {importResult.parseResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}