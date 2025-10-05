'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/shared/Toast';

interface ContractTemplate {
  _id: string;
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  effectiveDate: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface TemplateDiff {
  template1: {
    id: string;
    version: string;
    title: string;
    createdAt: string;
    createdBy: { name: string; email: string };
  };
  template2: {
    id: string;
    version: string;
    title: string;
    createdAt: string;
    createdBy: { name: string; email: string };
  };
  differences: {
    titleChanged: boolean;
    contentChanges: Array<{
      lineNumber: number;
      oldLine: string;
      newLine: string;
      type: 'added' | 'removed' | 'modified';
    }>;
    totalChanges: number;
  };
}

export default function ContractTemplateManager() {
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<TemplateDiff | null>(null);
  const [compareTemplates, setCompareTemplates] = useState<{ id1: string; id2: string }>({ id1: '', id2: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    effectiveDate: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/contracts/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
        
        // Set active template as selected by default
        const activeTemplate = data.templates.find((t: ContractTemplate) => t.isActive);
        if (activeTemplate && !selectedTemplate) {
          setSelectedTemplate(activeTemplate);
        }
      } else {
        showError('Failed to fetch contract templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showError('Error loading contract templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setIsEditing(true);
    setFormData({
      title: '',
      content: '',
      effectiveDate: new Date().toISOString().split('T')[0]
    });
    setSelectedTemplate(null);
  };

  const handleEdit = (template: ContractTemplate) => {
    setIsEditing(true);
    setIsCreating(false);
    setFormData({
      title: template.title,
      content: template.content,
      effectiveDate: template.effectiveDate ? new Date(template.effectiveDate).toISOString().split('T')[0] : ''
    });
    setSelectedTemplate(template);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showError('Title and content are required');
      return;
    }

    if (formData.content.length < 100) {
      showError('Contract content must be at least 100 characters');
      return;
    }

    try {
      const url = isCreating 
        ? '/api/admin/contracts/templates'
        : `/api/admin/contracts/templates/${selectedTemplate?._id}`;
      
      const method = isCreating ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        setIsEditing(false);
        setIsCreating(false);
        setSelectedTemplate(data.template);
        await fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Error saving contract template');
    }
  };

  const handleActivate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/contracts/templates/${templateId}/activate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        await fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to activate template');
      }
    } catch (error) {
      console.error('Error activating template:', error);
      showError('Error activating contract template');
    }
  };

  const handleDeactivate = async (templateId: string) => {
    if (!confirm('Are you sure you want to deactivate this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contracts/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Template deactivated successfully');
        await fetchTemplates();
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to deactivate template');
      }
    } catch (error) {
      console.error('Error deactivating template:', error);
      showError('Error deactivating contract template');
    }
  };

  const handleCompare = async () => {
    if (!compareTemplates.id1 || !compareTemplates.id2) {
      showError('Please select two templates to compare');
      return;
    }

    if (compareTemplates.id1 === compareTemplates.id2) {
      showError('Please select different templates to compare');
      return;
    }

    try {
      const response = await fetch('/api/admin/contracts/templates/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId1: compareTemplates.id1,
          templateId2: compareTemplates.id2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
        setShowComparison(true);
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to compare templates');
      }
    } catch (error) {
      console.error('Error comparing templates:', error);
      showError('Error comparing contract templates');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setFormData({ title: '', content: '', effectiveDate: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Contract Template Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {showVersionHistory ? 'Hide' : 'Show'} Version History
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Create New Version
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List / Version History */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {showVersionHistory ? 'Version History' : 'Current Template'}
              </h3>
              
              {showVersionHistory && (
                <div className="mb-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Compare Versions</h4>
                  <div className="space-y-2">
                    <select
                      value={compareTemplates.id1}
                      onChange={(e) => setCompareTemplates(prev => ({ ...prev, id1: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select first template</option>
                      {templates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.version} - {template.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={compareTemplates.id2}
                      onChange={(e) => setCompareTemplates(prev => ({ ...prev, id2: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select second template</option>
                      {templates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.version} - {template.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCompare}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Compare
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(showVersionHistory ? templates : templates.filter(t => t.isActive)).map((template) => (
                  <div
                    key={template._id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?._id === template._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {template.version}
                          </span>
                          {template.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{template.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Template Editor/Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isCreating ? 'Create New Template' : 'Edit Template'}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter contract title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Content
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Enter contract content..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.content.length} characters (minimum 100 required)
                    </p>
                  </div>
                </div>
              ) : selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedTemplate.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Version {selectedTemplate.version} • 
                        Created {new Date(selectedTemplate.createdAt).toLocaleDateString()} by {selectedTemplate.createdBy.name}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!selectedTemplate.isActive && (
                        <button
                          onClick={() => handleActivate(selectedTemplate._id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                        >
                          Activate
                        </button>
                      )}
                      {selectedTemplate.isActive && templates.length > 1 && (
                        <button
                          onClick={() => handleDeactivate(selectedTemplate._id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(selectedTemplate)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      >
                        Edit (New Version)
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Select a template to view or create a new one</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {showComparison && comparisonData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Template Comparison</h3>
              <button
                onClick={() => setShowComparison(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-900">
                  {comparisonData.template1.version} - {comparisonData.template1.title}
                </h4>
                <p className="text-sm text-gray-600">
                  Created {new Date(comparisonData.template1.createdAt).toLocaleDateString()} by {comparisonData.template1.createdBy.name}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {comparisonData.template2.version} - {comparisonData.template2.title}
                </h4>
                <p className="text-sm text-gray-600">
                  Created {new Date(comparisonData.template2.createdAt).toLocaleDateString()} by {comparisonData.template2.createdBy.name}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Total changes: {comparisonData.differences.totalChanges}
                {comparisonData.differences.titleChanged && ' (including title change)'}
              </p>
            </div>

            {comparisonData.differences.contentChanges.length > 0 && (
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h5 className="font-medium text-gray-900">Content Changes</h5>
                </div>
                <div className="p-4 space-y-2">
                  {comparisonData.differences.contentChanges.map((change, index) => (
                    <div key={index} className="border-l-4 pl-4 py-2" style={{
                      borderLeftColor: change.type === 'added' ? '#10b981' : change.type === 'removed' ? '#ef4444' : '#f59e0b'
                    }}>
                      <div className="text-xs text-gray-500 mb-1">
                        Line {change.lineNumber} - {change.type}
                      </div>
                      {change.type !== 'added' && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded font-mono">
                          - {change.oldLine}
                        </div>
                      )}
                      {change.type !== 'removed' && (
                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded font-mono">
                          + {change.newLine}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comparisonData.differences.totalChanges === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No differences found between these templates</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}