'use client';

import React, { useState, useMemo } from 'react';
import { ValidationReport } from '@/lib/data-validation-engine';

interface ParsedOfferData {
  resortName?: string;
  destination?: string;
  currency?: string;
  pricing: PricingData[];
  inclusions: string[];
  metadata: {
    totalRows: number;
    accommodationTypes: string[];
    monthsCovered: string[];
    priceRange: { min: number; max: number };
  };
}

interface PricingData {
  month: string;
  accommodationType?: string;
  nights?: number;
  pax?: number;
  price: number;
  currency?: string;
  specialPeriod?: string;
  isAvailable: boolean;
}

interface StructuredDataPreviewProps {
  data: ParsedOfferData;
  validationReport?: ValidationReport;
  onDataChange?: (data: ParsedOfferData) => void;
  isEditable?: boolean;
}

export default function StructuredDataPreview({
  data,
  validationReport,
  onDataChange,
  isEditable = false
}: StructuredDataPreviewProps) {
  const [activeTab, setActiveTab] = useState<'pricing' | 'inclusions' | 'metadata' | 'validation'>('pricing');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const [filters, setFilters] = useState({
    month: '',
    accommodationType: '',
    priceRange: { min: 0, max: 0 }
  });

  // Memoized filtered pricing data
  const filteredPricing = useMemo(() => {
    return data.pricing.filter(item => {
      if (filters.month && !item.month.toLowerCase().includes(filters.month.toLowerCase())) {
        return false;
      }
      if (filters.accommodationType && 
          item.accommodationType && 
          !item.accommodationType.toLowerCase().includes(filters.accommodationType.toLowerCase())) {
        return false;
      }
      if (filters.priceRange.max > 0 && 
          (item.price < filters.priceRange.min || item.price > filters.priceRange.max)) {
        return false;
      }
      return true;
    });
  }, [data.pricing, filters]);

  // Group pricing data by accommodation type
  const pricingByAccommodation = useMemo(() => {
    const grouped = new Map<string, PricingData[]>();
    filteredPricing.forEach(item => {
      const key = item.accommodationType || 'Standard';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    return grouped;
  }, [filteredPricing]);

  // Validation summary
  const validationSummary = useMemo(() => {
    if (!validationReport) return null;
    
    return {
      isValid: validationReport.isValid,
      errorCount: validationReport.errors.length,
      warningCount: validationReport.warnings.length,
      criticalErrors: validationReport.errors.filter(e => e.severity === 'critical').length,
      fieldIssues: Object.entries(validationReport.fieldSummary)
        .filter(([_, summary]) => summary.errorCount > 0)
        .map(([field, summary]) => ({ field, errorCount: summary.errorCount }))
    };
  }, [validationReport]);

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const renderPricingTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Month
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Accommodation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nights
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pax
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredPricing.map((item, index) => (
            <tr key={index} className={!item.isAvailable ? 'bg-gray-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.month}
                {item.specialPeriod && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {item.specialPeriod}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.accommodationType || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.nights || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.pax || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className="font-medium">
                  {item.currency || data.currency || '€'}{item.price.toFixed(2)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPricingCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from(pricingByAccommodation.entries()).map(([accommodationType, items]) => (
        <div key={accommodationType} className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">{accommodationType}</h4>
          <div className="space-y-2">
            {items.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{item.month}</span>
                <span className="font-medium">
                  {item.currency || data.currency || '€'}{item.price.toFixed(2)}
                </span>
              </div>
            ))}
            {items.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-2">
                +{items.length - 5} more items
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPricingSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">{data.pricing.length}</div>
        <div className="text-sm text-gray-500">Total Price Points</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">{data.metadata.accommodationTypes.length}</div>
        <div className="text-sm text-gray-500">Accommodation Types</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">{data.metadata.monthsCovered.length}</div>
        <div className="text-sm text-gray-500">Months Covered</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-2xl font-bold text-gray-900">
          {data.currency || '€'}{data.metadata.priceRange.min} - {data.metadata.priceRange.max}
        </div>
        <div className="text-sm text-gray-500">Price Range</div>
      </div>
    </div>
  );

  const renderInclusions = () => (
    <div className="space-y-4">
      {data.inclusions.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Package Inclusions</h4>
          <ul className="space-y-2">
            {data.inclusions.map((inclusion, index) => (
              <li key={index} className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{inclusion}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800">No Inclusions Found</h4>
              <p className="text-sm text-yellow-700 mt-1">
                No package inclusions were detected in the uploaded data. Consider adding inclusion information to provide complete package details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMetadata = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Resort Information</h4>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Resort Name</dt>
              <dd className="text-sm text-gray-900">{data.resortName || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Destination</dt>
              <dd className="text-sm text-gray-900">{data.destination || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Currency</dt>
              <dd className="text-sm text-gray-900">{data.currency || 'Not specified'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Data Coverage</h4>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Rows</dt>
              <dd className="text-sm text-gray-900">{data.metadata.totalRows}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Accommodation Types</dt>
              <dd className="text-sm text-gray-900">
                {data.metadata.accommodationTypes.length > 0 
                  ? data.metadata.accommodationTypes.join(', ')
                  : 'Standard'
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Months Covered</dt>
              <dd className="text-sm text-gray-900">
                {data.metadata.monthsCovered.join(', ')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );

  const renderValidation = () => {
    if (!validationSummary) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="text-gray-500">No validation report available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Validation Summary */}
        <div className={`border rounded-lg p-6 ${
          validationSummary.isValid 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            <svg className={`h-5 w-5 mr-3 ${
              validationSummary.isValid ? 'text-green-500' : 'text-red-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              {validationSummary.isValid ? (
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <h4 className={`font-medium ${
              validationSummary.isValid ? 'text-green-800' : 'text-red-800'
            }`}>
              {validationSummary.isValid ? 'Data Validation Passed' : 'Data Validation Issues Found'}
            </h4>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-red-600">{validationSummary.errorCount}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{validationSummary.warningCount}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-800">{validationSummary.criticalErrors}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        </div>

        {/* Field Issues */}
        {validationSummary.fieldIssues.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Fields with Issues</h4>
            <div className="space-y-2">
              {validationSummary.fieldIssues.map(({ field, errorCount }) => (
                <div key={field} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{field}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {errorCount} errors
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {validationReport && validationReport.errors.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Recent Errors</h4>
            <div className="space-y-3">
              {validationReport.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="border-l-4 border-red-400 pl-4">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-900">{error.message}</p>
                    <span className="text-xs text-gray-500">
                      {error.row !== undefined && `Row ${error.row + 1}`}
                    </span>
                  </div>
                  {error.suggestion && (
                    <p className="text-xs text-gray-600 mt-1">{error.suggestion}</p>
                  )}
                </div>
              ))}
              {validationReport.errors.length > 5 && (
                <p className="text-sm text-gray-500">
                  +{validationReport.errors.length - 5} more errors
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
          <p className="text-sm text-gray-500">
            Review the parsed data before importing
          </p>
        </div>
        {validationSummary && (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            validationSummary.isValid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {validationSummary.isValid ? 'Valid' : `${validationSummary.errorCount} Issues`}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'pricing', label: 'Pricing Data', count: data.pricing.length },
            { id: 'inclusions', label: 'Inclusions', count: data.inclusions.length },
            { id: 'metadata', label: 'Metadata' },
            { id: 'validation', label: 'Validation', count: validationSummary?.errorCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'pricing' && (
          <>
            {/* Filters and View Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Filter by month..."
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="text"
                  placeholder="Filter by accommodation..."
                  value={filters.accommodationType}
                  onChange={(e) => handleFilterChange('accommodationType', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">View:</span>
                {['table', 'cards', 'summary'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === mode
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing Content */}
            {viewMode === 'table' && renderPricingTable()}
            {viewMode === 'cards' && renderPricingCards()}
            {viewMode === 'summary' && renderPricingSummary()}
          </>
        )}

        {activeTab === 'inclusions' && renderInclusions()}
        {activeTab === 'metadata' && renderMetadata()}
        {activeTab === 'validation' && renderValidation()}
      </div>
    </div>
  );
}