'use client';

import { useState, useEffect } from 'react';
import { DataIntegrityReport } from '@/lib/validation/quote-data-integrity';

interface DataIntegrityDashboardProps {
  className?: string;
}

export default function DataIntegrityDashboard({ className = '' }: DataIntegrityDashboardProps) {
  const [report, setReport] = useState<DataIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data integrity report
  useEffect(() => {
    runIntegrityCheck();
  }, []);

  const runIntegrityCheck = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system/data-integrity?action=check');
      const result = await response.json();

      if (result.success) {
        setReport(result.data);
        setLastChecked(new Date());
      } else {
        setError(result.error?.message || 'Failed to check data integrity');
      }
    } catch (error) {
      setError('Failed to connect to data integrity service');
    } finally {
      setIsLoading(false);
    }
  };

  const runAutoFix = async () => {
    setIsRunningMaintenance(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system/data-integrity?action=autofix');
      const result = await response.json();

      if (result.success) {
        // Show success message and refresh report
        alert(`Auto-fix completed: ${result.data.fixed} issues fixed`);
        await runIntegrityCheck();
      } else {
        setError(result.error?.message || 'Auto-fix failed');
      }
    } catch (error) {
      setError('Failed to run auto-fix');
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const runMaintenance = async (type: 'daily' | 'weekly') => {
    setIsRunningMaintenance(true);
    setError(null);

    try {
      const action = type === 'daily' ? 'maintenance' : 'deep-maintenance';
      const response = await fetch(`/api/admin/system/data-integrity?action=${action}`);
      const result = await response.json();

      if (result.success) {
        alert(`${type === 'daily' ? 'Daily' : 'Weekly'} maintenance completed successfully`);
        await runIntegrityCheck();
      } else {
        setError(result.error?.message || 'Maintenance failed');
      }
    } catch (error) {
      setError('Failed to run maintenance');
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  const getTotalIssues = () => {
    if (!report) return 0;
    return Object.values(report.issues).reduce((sum, count) => sum + count, 0);
  };

  const getHealthStatus = () => {
    const totalIssues = getTotalIssues();
    if (totalIssues === 0) return { status: 'healthy', color: 'green', text: 'Healthy' };
    if (totalIssues <= 5) return { status: 'warning', color: 'yellow', text: 'Minor Issues' };
    if (totalIssues <= 20) return { status: 'concerning', color: 'orange', text: 'Needs Attention' };
    return { status: 'critical', color: 'red', text: 'Critical Issues' };
  };

  const health = getHealthStatus();

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Integrity Dashboard</h2>
              <p className="text-gray-600 mt-1">Monitor and maintain quote system data quality</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {lastChecked && (
                <span className="text-sm text-gray-500">
                  Last checked: {lastChecked.toLocaleString()}
                </span>
              )}
              <button
                onClick={runIntegrityCheck}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Checking...' : 'Refresh Check'}
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

          {/* Loading State */}
          {isLoading && !report && (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-2 text-gray-600">Running data integrity check...</span>
            </div>
          )}

          {/* Report Display */}
          {report && (
            <div className="space-y-6">
              {/* Health Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">System Health</h3>
                    <p className="text-sm text-gray-600">Overall data integrity status</p>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full bg-${health.color}-500 mr-2`}></div>
                    <span className={`text-sm font-medium text-${health.color}-700`}>
                      {health.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{report.totalQuotes}</div>
                  <div className="text-sm text-blue-700">Total Quotes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{report.totalEnquiries}</div>
                  <div className="text-sm text-green-700">Total Enquiries</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-900">{getTotalIssues()}</div>
                  <div className="text-sm text-yellow-700">Total Issues</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">
                    {((report.totalQuotes - getTotalIssues()) / report.totalQuotes * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-purple-700">Data Quality</div>
                </div>
              </div>

              {/* Issues Breakdown */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Issues Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-red-600">{report.issues.orphanedQuotes}</div>
                    <div className="text-sm text-gray-600">Orphaned Quotes</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-orange-600">{report.issues.inconsistentRelationships}</div>
                    <div className="text-sm text-gray-600">Inconsistent Relationships</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-yellow-600">{report.issues.invalidReferences}</div>
                    <div className="text-sm text-gray-600">Invalid References</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-blue-600">{report.issues.duplicateQuotes}</div>
                    <div className="text-sm text-gray-600">Duplicate Quotes</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-lg font-semibold text-purple-600">{report.issues.dataCorruption}</div>
                    <div className="text-sm text-gray-600">Data Corruption</div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {report.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3"></div>
                        <span className="text-sm text-blue-800">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={runAutoFix}
                  disabled={isRunningMaintenance || getTotalIssues() === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunningMaintenance ? 'Running...' : 'Auto-Fix Issues'}
                </button>
                
                <button
                  onClick={() => runMaintenance('daily')}
                  disabled={isRunningMaintenance}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Run Daily Maintenance
                </button>
                
                <button
                  onClick={() => runMaintenance('weekly')}
                  disabled={isRunningMaintenance}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Run Weekly Maintenance
                </button>
              </div>

              {/* Detailed Issues (Collapsible) */}
              {getTotalIssues() > 0 && (
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="cursor-pointer text-lg font-medium text-gray-900 mb-3">
                    Detailed Issues ({getTotalIssues()} total)
                  </summary>
                  
                  <div className="space-y-4 mt-4">
                    {/* Orphaned Quotes */}
                    {report.details.orphanedQuotes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-700 mb-2">Orphaned Quotes</h4>
                        <div className="bg-white rounded border max-h-40 overflow-y-auto">
                          {report.details.orphanedQuotes.map((item, index) => (
                            <div key={index} className="p-2 border-b last:border-b-0 text-sm">
                              <span className="font-medium">{item.leadName}</span> - {item.issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inconsistent Relationships */}
                    {report.details.inconsistentRelationships.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2">Inconsistent Relationships</h4>
                        <div className="bg-white rounded border max-h-40 overflow-y-auto">
                          {report.details.inconsistentRelationships.map((item, index) => (
                            <div key={index} className="p-2 border-b last:border-b-0 text-sm">
                              <span className="font-medium">{item.leadName}</span> - {item.issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Data Corruption */}
                    {report.details.dataCorruption.length > 0 && (
                      <div>
                        <h4 className="font-medium text-purple-700 mb-2">Data Corruption</h4>
                        <div className="bg-white rounded border max-h-40 overflow-y-auto">
                          {report.details.dataCorruption.map((item, index) => (
                            <div key={index} className="p-2 border-b last:border-b-0 text-sm">
                              <span className="font-medium">{item.leadName}</span> - {item.issues.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}