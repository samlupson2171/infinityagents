'use client';

import React, { useState, useEffect } from 'react';
import { ColumnMapping, MappingSuggestion, ColumnMapper } from '@/lib/column-mapper';

interface DragDropColumnMapperProps {
  headers: string[];
  sampleData?: any[][];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

interface DragItem {
  type: 'excel-column' | 'system-field';
  id: string;
  label: string;
  dataType?: string;
  required?: boolean;
}

interface DropZone {
  excelColumn: string;
  systemField: string | null;
  confidence: number;
  isRequired: boolean;
}

export default function DragDropColumnMapper({
  headers,
  sampleData,
  onMappingChange,
  onValidationChange
}: DragDropColumnMapperProps) {
  const [dropZones, setDropZones] = useState<DropZone[]>([]);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [mapper] = useState(() => new ColumnMapper());

  const systemFields = [
    { id: 'month', label: 'Month', dataType: 'string', required: true },
    { id: 'accommodationType', label: 'Accommodation Type', dataType: 'string', required: false },
    { id: 'nights', label: 'Nights', dataType: 'number', required: false },
    { id: 'pax', label: 'Pax/People', dataType: 'number', required: false },
    { id: 'price', label: 'Price', dataType: 'currency', required: true },
    { id: 'currency', label: 'Currency', dataType: 'string', required: false },
    { id: 'specialPeriod', label: 'Special Period', dataType: 'string', required: false },
    { id: 'inclusions', label: 'Inclusions', dataType: 'list', required: false },
    { id: 'description', label: 'Description', dataType: 'string', required: false }
  ];

  useEffect(() => {
    // Generate suggestions
    const newSuggestions = mapper.suggestMappings(headers, sampleData);
    setSuggestions(newSuggestions);

    // Initialize drop zones
    const initialDropZones = headers.map(header => {
      const suggestion = newSuggestions.find(s => s.mapping.excelColumn === header);
      const systemField = systemFields.find(f => f.id === suggestion?.mapping.systemField);
      
      return {
        excelColumn: header,
        systemField: suggestion?.mapping.systemField || null,
        confidence: suggestion?.mapping.confidence || 0,
        isRequired: systemField?.required || false
      };
    });
    
    setDropZones(initialDropZones);
  }, [headers, sampleData, mapper]);

  useEffect(() => {
    // Convert drop zones to mappings and validate
    const mappings: ColumnMapping[] = dropZones
      .filter(zone => zone.systemField)
      .map(zone => {
        const systemField = systemFields.find(f => f.id === zone.systemField);
        return {
          excelColumn: zone.excelColumn,
          systemField: zone.systemField!,
          dataType: systemField?.dataType as any || 'string',
          required: systemField?.required || false,
          confidence: zone.confidence
        };
      });

    const validation = mapper.validateMappings(mappings);
    
    onMappingChange(mappings);
    onValidationChange(validation.isValid, validation.errors);
  }, [dropZones, mapper, onMappingChange, onValidationChange]);

  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.type !== 'system-field') return;

    const newDropZones = dropZones.map(zone => {
      if (zone.excelColumn === targetColumn) {
        const systemField = systemFields.find(f => f.id === draggedItem.id);
        return {
          ...zone,
          systemField: draggedItem.id,
          confidence: 1.0, // Manual mapping gets full confidence
          isRequired: systemField?.required || false
        };
      }
      // Remove the field from other zones if it was already mapped
      if (zone.systemField === draggedItem.id) {
        return {
          ...zone,
          systemField: null,
          confidence: 0,
          isRequired: false
        };
      }
      return zone;
    });

    setDropZones(newDropZones);
    setDraggedItem(null);
  };

  const handleRemoveMapping = (columnName: string) => {
    const newDropZones = dropZones.map(zone => 
      zone.excelColumn === columnName 
        ? { ...zone, systemField: null, confidence: 0, isRequired: false }
        : zone
    );
    setDropZones(newDropZones);
  };

  const applySuggestions = () => {
    const newDropZones = dropZones.map(zone => {
      const suggestion = suggestions.find(s => s.mapping.excelColumn === zone.excelColumn);
      if (suggestion) {
        const systemField = systemFields.find(f => f.id === suggestion.mapping.systemField);
        return {
          ...zone,
          systemField: suggestion.mapping.systemField,
          confidence: suggestion.mapping.confidence,
          isRequired: systemField?.required || false
        };
      }
      return zone;
    });
    setDropZones(newDropZones);
  };

  const clearAllMappings = () => {
    const clearedDropZones = dropZones.map(zone => ({
      ...zone,
      systemField: null,
      confidence: 0,
      isRequired: false
    }));
    setDropZones(clearedDropZones);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'border-green-300 bg-green-50';
    if (confidence >= 0.6) return 'border-yellow-300 bg-yellow-50';
    if (confidence >= 0.4) return 'border-orange-300 bg-orange-50';
    return 'border-red-300 bg-red-50';
  };

  const getMappedFields = () => {
    return new Set(dropZones.filter(zone => zone.systemField).map(zone => zone.systemField));
  };

  const getUnmappedFields = () => {
    const mappedFields = getMappedFields();
    return systemFields.filter(field => !mappedFields.has(field.id));
  };

  const getSampleData = (columnIndex: number) => {
    return sampleData?.map(row => row[columnIndex]).slice(0, 3) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Drag & Drop Column Mapping</h3>
          <p className="text-sm text-gray-500">
            Drag system fields from the right panel to Excel columns on the left.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={applySuggestions}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply Suggestions
          </button>
          <button
            onClick={clearAllMappings}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Excel Columns (Drop Zones) */}
        <div className="lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Excel Columns</h4>
          <div className="space-y-3">
            {dropZones.map((zone, index) => (
              <div
                key={zone.excelColumn}
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  zone.systemField 
                    ? getConfidenceColor(zone.confidence)
                    : 'border-gray-300 bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, zone.excelColumn)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900">{zone.excelColumn}</h5>
                      {zone.isRequired && <span className="text-red-500 text-sm">*</span>}
                    </div>
                    
                    {zone.systemField ? (
                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {systemFields.find(f => f.id === zone.systemField)?.label}
                          </span>
                          <button
                            onClick={() => handleRemoveMapping(zone.excelColumn)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        {zone.confidence > 0 && zone.confidence < 1 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Confidence: {Math.round(zone.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500">
                        Drop a system field here
                      </div>
                    )}

                    {/* Sample Data */}
                    <div className="mt-2 text-xs text-gray-400">
                      Sample: {getSampleData(index).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Fields (Draggable) */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">System Fields</h4>
          <div className="space-y-2">
            {systemFields.map(field => {
              const isMapped = getMappedFields().has(field.id);
              
              return (
                <div
                  key={field.id}
                  draggable={!isMapped}
                  onDragStart={(e) => handleDragStart(e, {
                    type: 'system-field',
                    id: field.id,
                    label: field.label,
                    dataType: field.dataType,
                    required: field.required
                  })}
                  className={`p-3 rounded-lg border cursor-move transition-colors ${
                    isMapped 
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && <span className="text-red-500 text-sm">*</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Type: {field.dataType}
                      </div>
                    </div>
                    {isMapped && (
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unmapped Required Fields Warning */}
          {getUnmappedFields().filter(f => f.required).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Required Fields Missing</h3>
                  <div className="mt-1 text-sm text-red-700">
                    {getUnmappedFields().filter(f => f.required).map(f => f.label).join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mapping Summary */}
      <div className="bg-gray-50 px-4 py-3 rounded-md">
        <div className="flex justify-between text-sm">
          <span>
            Mapped: {dropZones.filter(z => z.systemField).length} / {dropZones.length} columns
          </span>
          <span>
            Required fields: {dropZones.filter(z => z.systemField && z.isRequired).length} / {systemFields.filter(f => f.required).length}
          </span>
        </div>
      </div>
    </div>
  );
}