'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Play, 
  RotateCcw,
  FileText,
  Video,
  Download
} from 'lucide-react';

interface MigrationStatus {
  total: number;
  migrated: number;
  needsMigration: number;
  byType: Record<string, { total: number; migrated: number }>;
}

interface MigrationResult {
  success: boolean;
  materialsProcessed: number;
  materialsUpdated: number;
  materialsSkipped: number;
  errors: string[];
  warnings: string[];
}

export default function MigrationManager() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Migration options
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(50);
  const [convertBlogUrls, setConvertBlogUrls] = useState(false);
  const [convertDownloadUrls, setConvertDownloadUrls] = useState(false);

  useEffect(() => {
    loadMigrationStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/training/migrate');
      if (!response.ok) {
        throw new Error('Failed to load migration status');
      }

      const data = await response.json();
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setMigrationResult(null);

      const response = await fetch('/api/admin/training/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'migrate',
          options: {
            dryRun,
            batchSize,
            convertBlogUrls,
            convertDownloadUrls,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Migration failed');
      }

      const data = await response.json();
      setMigrationResult(data.data);

      // Reload status after migration
      if (!dryRun) {
        await loadMigrationStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'blog':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'download':
        return <Download className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMigrationProgress = (migrated: number, total: number) => {
    if (total === 0) return 100;
    return Math.round((migrated / total) * 100);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Content Migration Manager
          </h3>
          <p className="text-gray-600">
            Migrate legacy training materials to the enhanced format
          </p>
        </div>
        <button
          onClick={loadMigrationStatus}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Migration Status */}
      {status && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Migration Status</h4>
          
          {/* Overall Progress */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {status.migrated} / {status.total} materials
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getMigrationProgress(status.migrated, status.total)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{getMigrationProgress(status.migrated, status.total)}% complete</span>
              <span>{status.needsMigration} need migration</span>
            </div>
          </div>

          {/* By Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(status.byType).map(([type, stats]) => (
              <div key={type} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(type)}
                    <span className="font-medium text-gray-900 capitalize">{type}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {stats.migrated} / {stats.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      type === 'video' ? 'bg-red-500' :
                      type === 'blog' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${getMigrationProgress(stats.migrated, stats.total)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getMigrationProgress(stats.migrated, stats.total)}% migrated
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Migration Options */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Migration Options</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Dry Run (preview changes without applying)
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={convertBlogUrls}
                  onChange={(e) => setConvertBlogUrls(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Convert blog URLs to rich content
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={convertDownloadUrls}
                  onChange={(e) => setConvertDownloadUrls(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Convert download URLs to file references
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of materials to process in one batch
            </p>
          </div>
        </div>
      </div>

      {/* Migration Actions */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={runMigration}
            disabled={loading || (status?.needsMigration === 0)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            <span>{dryRun ? 'Preview Migration' : 'Run Migration'}</span>
          </button>

          {status?.needsMigration === 0 && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">All materials are up to date</span>
            </div>
          )}
        </div>
      </div>

      {/* Migration Result */}
      {migrationResult && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {dryRun ? 'Migration Preview' : 'Migration Result'}
          </h4>
          
          <div className={`p-4 rounded-lg border ${
            migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center mb-3">
              {migrationResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <span className={`font-medium ${
                migrationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {migrationResult.materialsProcessed}
                </div>
                <div className="text-sm text-gray-600">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {migrationResult.materialsUpdated}
                </div>
                <div className="text-sm text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {migrationResult.materialsSkipped}
                </div>
                <div className="text-sm text-gray-600">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {migrationResult.errors.length}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {/* Warnings */}
            {migrationResult.warnings.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-yellow-800 mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  Warnings ({migrationResult.warnings.length})
                </h5>
                <div className="max-h-32 overflow-y-auto">
                  {migrationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-700 mb-1">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {migrationResult.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Errors ({migrationResult.errors.length})
                </h5>
                <div className="max-h-32 overflow-y-auto">
                  {migrationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Migration Information</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Migration adds new fields to existing training materials without removing legacy fields</li>
              <li>• Legacy content URLs will continue to work alongside new rich content</li>
              <li>• Use "Dry Run" to preview changes before applying them</li>
              <li>• URL conversion is optional and creates placeholder content linking to original URLs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}