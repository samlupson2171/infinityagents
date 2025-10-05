'use client';

import React, { useState, useEffect } from 'react';
import { ColumnMapping, MappingSuggestion, ColumnMapper } from '@/lib/column-mapper';

interface ColumnMappingInterfaceProps {
  headers: string[];
  sampleData?: any[][];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  initialMappings?: ColumnMapping[];
}

interface MappingRow {
  excelColumn: string;
  systemField: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'list';
  required: boolean;
  confidence: number;
  isCustom: boolean;
}

export default function ColumnMappingInterface({
  headers,
  sampleData,
  onMappingChange,
  onValidationChange,
  initialMappings
}: ColumnMappingInterfaceProps) {
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mapper] = useState(() => new ColumnMapper());

  const systemFields = [
    { value: '', label: 'Select field...', required: false },
    { value: 'month', label: 'Month', required: true },
    { value: 'accommodationType', label: 'Accommodation Type', required: false },
    { value: 'nights', label: 'Nights', required: false },
    { value: 'pax', label: 'Pax/People', required: false },
    { value: 'price', label: 'Price', required: true },
    { value: 'currency', label: 'Currency', required: false },
    { value: 'specialPeriod', label: 'Special Period', required: false },
    { value: 'inclusions', label: 'Inclusions', required: false },
    { value: 'description', label: 'Description', required: false }
  ];

  const dataTypes = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'currency', label: 'Currency' },
    { value: 'date', label: 'Date' },
    { value: 'list', label: 'List' }
  ];

  useEffect(() => {
    if (initialMappings) {
      const initialRows = initialMappings.map(mapping => ({
        excelColumn: mapping.excelColumn,
        systemField: mapping.systemField,
        dataType: mapping.dataType,
        required: mapping.required,
        confidence: mapping.confidence,
        isCustom: false
      }));
      setMappings(initialRows);
    } else {
      // Generate suggestions
      const newSuggestions = mapper.suggestMappings(headers, sampleData);
      setSuggestions(newSuggestions);

      // Create initial mappings from suggestions
      const initialRows = headers.map(header => {
        const suggestion = newSuggestions.find(s => s.mapping.excelColumn === header);
        if (suggestion) {
          return {
            excelColumn: header,
            systemField: suggestion.mapping.systemField,
            dataType: suggestion.mapping.dataType,
            required: suggestion.mapping.required,
            confidence: suggestion.mapping.confidence,
            isCustom: false
          };
        } else {
          return {
            excelColumn: header,
            systemField: '',
            dataType: 'string' as const,
            required: false,
            confidence: 0,
            isCustom: true
          };
        }
      });
      setMappings(initialRows);
    }
  }, [headers, sampleData, initialMappings, mapper]);

  useEffect(() => {
    // Convert mappings to ColumnMapping format and validate
    const columnMappings: ColumnMapping[] = mappings
      .filter(m => m.systemField !== '')
      .map(m => ({
        excelColumn: m.excelColumn,
        systemField: m.systemField,
        dataType: m.dataType,
        required: m.required,
        confidence: m.confidence
      }));

    const validation = mapper.validateMappings(columnMappings);
    setValidationErrors(validation.errors);
    
    onMappingChange(columnMappings);
    onValidationChange(validation.isValid, validation.errors);
  }, [mappings, mapper, onMappingChange, onValidationChange]);

  const handleMappingChange = (index: number, field: keyof MappingRow, value: any) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    
    // If system field changed, update required status and data type
    if (field === 'systemField') {
      const systemField = systemFields.find(sf => sf.value === value);
      if (systemField) {
        newMappings[index].required = systemField.required;
        // Auto-detect appropriate data type based on system field
        if (value === 'price') newMappings[index].dataType = 'currency';
        else if (value === 'nights' || value === 'pax') newMappings[index].dataType = 'number';
        else if (value === 'inclusions') newMappings[index].dataType = 'list';
        else newMappings[index].dataType = 'string';
      }
      newMappings[index].isCustom = true;
    }
    
    setMappings(newMappings);
  };

  const applySuggestion = (index: number, suggestion: MappingSuggestion) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      excelColumn: suggestion.mapping.excelColumn,
      systemField: suggestion.mapping.systemField,
      dataType: suggestion.mapping.dataType,
      required: suggestion.mapping.required,
      confidence: suggestion.mapping.confidence,
      isCustom: false
    };
    setMappings(newMappings);
  };

  const applyAllSuggestions = () => {
    const newMappings = headers.map(header => {
      const suggestion = suggestions.find(s => s.mapping.excelColumn === header);
      if (suggestion) {
        return {
          excelColumn: header,
          systemField: suggestion.mapping.systemField,
          dataType: suggestion.mapping.dataType,
          required: suggestion.mapping.required,
          confidence: suggestion.mapping.confidence,
          isCustom: false
        };
      } else {
        const existing = mappings.find(m => m.excelColumn === header);
        return existing || {
          excelColumn: header,
          systemField: '',
          dataType: 'string' as const,
          required: false,
          confidence: 0,
          isCustom: true
        };
      }
    });
    setMappings(newMappings);
  };

  const clearAllMappings = () => {
    const clearedMappings = mappings.map(m => ({
      ...m,
      systemField: '',
      confidence: 0,
      isCustom: true
    }));
    setMappings(clearedMappings);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    if (confidence >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Column Mapping</h3>
          <p className="text-sm text-gray-500">
            Map Excel columns to system fields. Required fields are marked with *.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>
          <button
            onClick={applyAllSuggestions}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply All Suggestions
          </button>
          <button
            onClick={clearAllMappings}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Mapping Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Excel Column
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                System Field
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sample Data
              </th>
              {showSuggestions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Suggestions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((mapping, index) => {
              const suggestion = suggestions.find(s => s.mapping.excelColumn === mapping.excelColumn);
              const sampleValues = sampleData?.map(row => row[index]).slice(0, 3) || [];
              
              return (
                <tr key={`row-${mapping.excelColumn}-${index}`} className={mapping.required && !mapping.systemField ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mapping.excelColumn}
                    {mapping.required && <span className="text-red-500 ml-1">*</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      key={`systemField-${mapping.excelColumn}-${index}`}
                      value={mapping.systemField}
                      onChange={(e) => handleMappingChange(index, 'systemField', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {systemFields.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}{field.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      key={`dataType-${mapping.excelColumn}-${index}`}
                      value={mapping.dataType}
                      onChange={(e) => handleMappingChange(index, 'dataType', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {dataTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {mapping.confidence > 0 && (
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${getConfidenceColor(mapping.confidence)}`}>
                          {getConfidenceLabel(mapping.confidence)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({Math.round(mapping.confidence * 100)}%)
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {sampleValues.join(', ')}
                    </div>
                  </td>
                  {showSuggestions && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {suggestion && (
                        <div className="space-y-2">
                          <button
                            onClick={() => applySuggestion(index, suggestion)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Use: {systemFields.find(f => f.value === suggestion.mapping.systemField)?.label}
                          </button>
                          {suggestion.alternatives.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Alternatives: {suggestion.alternatives.slice(0, 2).map(alt => 
                                systemFields.find(f => f.value === alt.systemField)?.label
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-4 py-3 rounded-md">
        <div className="flex justify-between text-sm">
          <span>
            Mapped: {mappings.filter(m => m.systemField !== '').length} / {mappings.length} columns
          </span>
          <span>
            Required fields: {mappings.filter(m => m.required && m.systemField !== '').length} / {systemFields.filter(f => f.required).length - 1}
          </span>
        </div>
      </div>
    </div>
  );
}