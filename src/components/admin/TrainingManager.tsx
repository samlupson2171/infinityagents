'use client';

import { useState, useEffect } from 'react';
import WYSIWYGEditor from './WYSIWYGEditor';
import FileManager from './FileManager';
import ContentPreview from './ContentPreview';
import AutoSaveIndicator from './AutoSaveIndicator';
import { useAutoSave, useUnsavedChanges, useDraftManager } from '@/lib/hooks/useAutoSave';
import type { UploadedFile } from './FileUpload';

interface TrainingMaterial {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'blog' | 'download';
  contentUrl?: string;
  fileUrl?: string;
  richContent?: string;
  richContentImages?: string[];
  uploadedFiles?: Array<{
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  }>;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}

interface TrainingManagerProps {
  className?: string;
}

export default function TrainingManager({
  className = '',
}: TrainingManagerProps) {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] =
    useState<TrainingMaterial | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<Error | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'blog' | 'download',
    contentUrl: '',
    fileUrl: '',
    richContent: '',
    richContentImages: [] as string[],
    uploadedFiles: [] as UploadedFile[],
    isActive: true,
  });

  // Draft management
  const draftKey = selectedMaterial ? `training_material_${selectedMaterial._id}` : 'new_training_material';
  const { draftData, saveDraft, clearDraft, hasDraft } = useDraftManager(draftKey, formData);

  // Auto-save functionality
  const autoSaveStatus = useAutoSave(formData, {
    delay: 3000, // 3 seconds
    enabled: (showCreateModal || showEditModal) && formData.title.trim().length > 0,
    onSave: async (data) => {
      // Save as draft
      saveDraft(data);
      setHasUnsavedChanges(false);
    },
    onError: (error) => {
      setAutoSaveError(error);
    },
  });

  // Warn about unsaved changes
  useUnsavedChanges(hasUnsavedChanges);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/training');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `HTTP ${response.status}: Failed to fetch training materials`
        );
      }

      const data = await response.json();

      // Handle different API response structures and ensure we always have an array
      let materialsArray: TrainingMaterial[] = [];

      if (Array.isArray(data)) {
        materialsArray = data;
      } else if (
        data.success &&
        data.data &&
        data.data.materials &&
        Array.isArray(data.data.materials)
      ) {
        materialsArray = data.data.materials;
      } else if (data.data && Array.isArray(data.data)) {
        materialsArray = data.data;
      } else if (data.materials && Array.isArray(data.materials)) {
        materialsArray = data.materials;
      } else {
        // If no array found, default to empty array
        materialsArray = [];
      }

      // Ensure all items have required properties
      const validMaterials = materialsArray.filter(
        (material) =>
          material &&
          typeof material === 'object' &&
          material._id &&
          material.title &&
          material.type
      );

      setMaterials(validMaterials);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching training materials';
      setError(errorMessage);
      setMaterials([]); // Ensure materials is always an array on error
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const initialData = {
      title: '',
      description: '',
      type: 'video' as 'video' | 'blog' | 'download',
      contentUrl: '',
      fileUrl: '',
      richContent: '',
      richContentImages: [] as string[],
      uploadedFiles: [] as UploadedFile[],
      isActive: true,
    };
    setFormData(initialData);
    setHasUnsavedChanges(false);
    setAutoSaveError(null);
    clearDraft();
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear any previous errors

    // Debug: Log current form data
    console.log('Form data before validation:', formData);

    // Validate form based on type
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      console.log('Validation failed:', validation.error);
      setError(validation.error!);
      return;
    }

    try {
      setActionLoading('create');

      // Prepare data for submission
      const submitData = prepareSubmissionData(formData);
      
      // Debug: Log the data being submitted
      console.log('Submitting training material data:', submitData);

      const response = await fetch('/api/admin/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        const errorMessage = data.error?.message || data.error || 'Failed to create training material';
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Material created successfully:', data);
      setShowCreateModal(false);
      clearDraft(); // Clear the draft after successful creation
      resetForm();
      fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMaterial) return;

    // Validate form based on type
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    try {
      setActionLoading('update');

      // Prepare data for submission
      const submitData = prepareSubmissionData(formData);
      
      // Debug: Log the data being submitted
      console.log('Updating training material data:', submitData);

      const response = await fetch(
        `/api/admin/training/${selectedMaterial._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Failed to update training material'
        );
      }

      setShowEditModal(false);
      setSelectedMaterial(null);
      clearDraft(); // Clear the draft after successful update
      resetForm();
      fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this training material? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(materialId);
      const response = await fetch(`/api/admin/training/${materialId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Failed to delete training material'
        );
      }

      fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (material: TrainingMaterial) => {
    try {
      setActionLoading(material._id);
      const response = await fetch(`/api/admin/training/${material._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !material.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || 'Failed to update material status'
        );
      }

      fetchMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateModal = () => {
    resetForm();
    
    // Check if there's a draft for new materials
    const newDraftKey = 'new_training_material';
    const savedDraft = localStorage.getItem(`draft_${newDraftKey}`);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        if (confirm('You have an unsaved draft. Would you like to continue editing it?')) {
          setFormData(draftData);
          setHasUnsavedChanges(true);
        }
      } catch {
        // Invalid draft, ignore
      }
    }
    
    setShowCreateModal(true);
  };

  const openEditModal = (material: TrainingMaterial) => {
    setSelectedMaterial(material);
    
    const materialData = {
      title: material.title,
      description: material.description,
      type: material.type,
      contentUrl: material.contentUrl || '',
      fileUrl: material.fileUrl || '',
      richContent: material.richContent || '',
      richContentImages: material.richContentImages || [],
      uploadedFiles: material.uploadedFiles?.map(file => ({
        id: file.id,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: new Date(file.uploadedAt),
      })) || [],
      isActive: material.isActive,
    };
    
    // Check if there's a draft for this material
    const editDraftKey = `training_material_${material._id}`;
    const savedDraft = localStorage.getItem(`draft_${editDraftKey}`);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        if (confirm('You have an unsaved draft for this material. Would you like to continue editing it?')) {
          setFormData(draftData);
          setHasUnsavedChanges(true);
        } else {
          setFormData(materialData);
          localStorage.removeItem(`draft_${editDraftKey}`);
        }
      } catch {
        setFormData(materialData);
      }
    } else {
      setFormData(materialData);
    }
    
    setShowEditModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'blog':
        return '📝';
      case 'download':
        return '📁';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-100 text-red-800';
      case 'blog':
        return 'bg-blue-100 text-blue-800';
      case 'download':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Validate form data based on material type
  const validateFormData = (data: typeof formData): { isValid: boolean; error?: string } => {
    if (!data.title.trim()) {
      return { isValid: false, error: 'Title is required' };
    }
    
    if (!data.description.trim()) {
      return { isValid: false, error: 'Description is required' };
    }

    switch (data.type) {
      case 'video':
        if (!data.contentUrl.trim()) {
          return { isValid: false, error: 'Video URL is required' };
        }
        break;
      
      case 'blog':
        if (!data.richContent.trim() && !data.contentUrl.trim()) {
          return { isValid: false, error: 'Blog content or external URL is required' };
        }
        break;
      
      case 'download':
        if (data.uploadedFiles.length === 0 && !data.fileUrl.trim()) {
          return { isValid: false, error: 'At least one file or external URL is required' };
        }
        break;
    }

    return { isValid: true };
  };

  // Prepare data for API submission
  const prepareSubmissionData = (data: typeof formData) => {
    const baseData = {
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      isActive: data.isActive,
    };

    switch (data.type) {
      case 'video':
        return {
          ...baseData,
          contentUrl: data.contentUrl.trim(),
        };
      
      case 'blog':
        return {
          ...baseData,
          richContent: data.richContent.trim() || undefined,
          contentUrl: data.contentUrl.trim() || undefined,
          richContentImages: data.richContentImages,
        };
      
      case 'download':
        console.log('Preparing download data with files:', data.uploadedFiles);
        const downloadData = {
          ...baseData,
          uploadedFiles: data.uploadedFiles?.length > 0 ? data.uploadedFiles.map(file => ({
            id: file.id,
            originalName: file.originalName,
            fileName: file.fileName,
            filePath: file.filePath,
            mimeType: file.mimeType,
            size: file.size,
            uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt : new Date(file.uploadedAt),
          })) : [],
          fileUrl: data.fileUrl?.trim() || undefined,
        };
        console.log('Final download data:', downloadData);
        return downloadData;
      
      default:
        return baseData;
    }
  };

  // Check if material is in legacy format
  const isLegacyMaterial = (material: TrainingMaterial): boolean => {
    switch (material.type) {
      case 'blog':
        return !material.richContent && !!material.contentUrl;
      case 'download':
        return (!material.uploadedFiles || material.uploadedFiles.length === 0) && !!material.fileUrl;
      default:
        return false;
    }
  };

  // Ensure materials is always an array
  const safeMaterials = Array.isArray(materials) ? materials : [];

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-2 text-gray-600">
          Loading training materials...
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white shadow-lg rounded-lg border border-gray-200">
        <div className="px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Training Materials Management
              </h3>
              <p className="text-gray-600">
                Manage videos, articles, and downloadable resources
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">📚</span>
              Add Material
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Materials Grid */}
          {safeMaterials.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Training Materials
              </h3>
              <p className="text-gray-500 mb-6">
                Get started by adding your first training material.
              </p>
              <button
                onClick={openCreateModal}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Add First Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeMaterials.map((material) => (
                <div
                  key={material._id}
                  className="bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(material.type)}`}
                      >
                        <span className="mr-1">
                          {getTypeIcon(material.type)}
                        </span>
                        {material.type.charAt(0).toUpperCase() +
                          material.type.slice(1)}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          material.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {material.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {material.title}
                    </h4>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {material.description}
                    </p>

                    {/* Legacy Content Indicator */}
                    {isLegacyMaterial(material) && (
                      <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <div className="flex items-center text-yellow-800">
                          <span className="mr-1">⚠️</span>
                          <span>Legacy format - consider upgrading to enhanced features</span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-4">
                      Created:{' '}
                      {new Date(material.createdAt).toLocaleDateString()}
                      {material.createdBy && (
                        <span> by {material.createdBy.name}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(material)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(material)}
                          disabled={actionLoading === material._id}
                          className={`text-sm font-medium ${
                            material.isActive
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {actionLoading === material._id
                            ? 'Updating...'
                            : material.isActive
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteMaterial(material._id)}
                        disabled={actionLoading === material._id}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        {actionLoading === material._id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white my-10">
            <form
              onSubmit={
                showCreateModal ? handleCreateMaterial : handleUpdateMaterial
              }
            >
              <div className="mt-3">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {showCreateModal
                        ? 'Add Training Material'
                        : 'Edit Training Material'}
                    </h3>
                    <AutoSaveIndicator
                      isSaving={autoSaveStatus.isSaving}
                      lastSaved={autoSaveStatus.lastSaved}
                      error={autoSaveStatus.error || autoSaveError}
                      className="mt-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
                        return;
                      }
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedMaterial(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Enter material title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description *
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Enter material description"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label
                      htmlFor="type"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Type *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value as 'video' | 'blog' | 'download',
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="video">Video</option>
                      <option value="blog">Blog/Article</option>
                      <option value="download">Download</option>
                    </select>
                  </div>

                  {/* Video Content URL */}
                  {formData.type === 'video' && (
                    <div>
                      <label
                        htmlFor="contentUrl"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Video URL *
                      </label>
                      <input
                        type="url"
                        id="contentUrl"
                        value={formData.contentUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            contentUrl: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                  )}

                  {/* Blog Rich Content */}
                  {formData.type === 'blog' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content *
                      </label>
                      <div className="mb-4">
                        <WYSIWYGEditor
                          value={formData.richContent}
                          onChange={(content) => {
                            setFormData((prev) => ({
                              ...prev,
                              richContent: content,
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Write your blog content here..."
                          height={300}
                        />
                      </div>
                      
                      {/* Legacy URL option for blog */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Or use external URL (legacy)
                        </label>
                        <input
                          type="url"
                          value={formData.contentUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              contentUrl: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="https://blog.example.com/article"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty to use rich content above
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Download Files */}
                  {formData.type === 'download' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Files *
                      </label>
                      <div className="mb-4">
                        <FileManager
                          onFilesChange={(files) => {
                            setFormData((prev) => ({
                              ...prev,
                              uploadedFiles: files,
                            }));
                            setHasUnsavedChanges(true);
                          }}
                          initialFiles={formData.uploadedFiles}
                          maxFiles={5}
                          allowUpload={true}
                          showSearch={false}
                          viewMode="list"
                        />
                      </div>
                      
                      {/* Legacy URL option for downloads */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Or use external URL (legacy)
                        </label>
                        <input
                          type="url"
                          value={formData.fileUrl}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              fileUrl: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="https://example.com/file.pdf"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty to use uploaded files above
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Active (visible to users)
                      </span>
                    </label>
                  </div>

                  {/* Content Preview */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <ContentPreview
                      type={formData.type}
                      title={formData.title}
                      description={formData.description}
                      contentUrl={formData.contentUrl}
                      richContent={formData.richContent}
                      uploadedFiles={formData.uploadedFiles}
                      fileUrl={formData.fileUrl}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setSelectedMaterial(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      actionLoading === 'create' || actionLoading === 'update'
                    }
                    className="px-6 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-md disabled:bg-orange-400"
                  >
                    {actionLoading === 'create' || actionLoading === 'update'
                      ? 'Saving...'
                      : showCreateModal
                        ? 'Create Material'
                        : 'Update Material'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
