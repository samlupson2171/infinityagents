'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IDestination } from '@/models/Destination';
import { FormField, Form, FieldGroup } from '@/components/shared/FormField';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

import { useErrorHandler, ValidationRules, useFormValidation } from '@/lib/hooks/useErrorHandler';
import { useDebounce } from '@/lib/hooks/useDebounce';
import DestinationImageManager from './DestinationImageManager';

interface DestinationFormData {
  name: string;
  country: string;
  region: string;
  description: string;
  slug?: string;
  heroImage?: string;
  galleryImages?: string[];
}

interface DestinationFormProps {
  destination?: Partial<IDestination> & { _id?: string };
  onSubmit: (data: DestinationFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  className?: string;
}

// Validation rules for the basic information form
const validationRules: ValidationRules = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  country: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  region: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    required: true,
    minLength: 50,
    maxLength: 500,
  },
  slug: {
    required: false,
    pattern: /^[a-z0-9-]+$/,
    custom: (value: string) => {
      if (value && value.length > 0) {
        if (value.startsWith('-') || value.endsWith('-')) {
          return 'Slug cannot start or end with a hyphen';
        }
        if (value.includes('--')) {
          return 'Slug cannot contain consecutive hyphens';
        }
      }
      return null;
    },
  },
};

export function DestinationForm({
  destination,
  onSubmit,
  onCancel,
  isEditing = false,
  className = '',
}: DestinationFormProps) {
  const router = useRouter();
  const { error, isLoading, setError, clearError, executeWithErrorHandling } = useErrorHandler();
  const { errors, touched, isValid, validate, validateSingle, setFieldTouched } = useFormValidation(validationRules);

  // Form state
  const [formData, setFormData] = useState<DestinationFormData>({
    name: destination?.name || '',
    country: destination?.country || '',
    region: destination?.region || '',
    description: destination?.description || '',
    slug: destination?.slug || '',
    heroImage: destination?.heroImage || undefined,
    galleryImages: destination?.galleryImages || [],
  });

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [slugValidationStatus, setSlugValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Debounced values for auto-save and slug validation
  const debouncedFormData = useDebounce(formData, 2000); // 2 second delay for auto-save
  const debouncedSlug = useDebounce(formData.slug, 500); // 500ms delay for slug validation

  // Generate slug from name
  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof DestinationFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate slug when name changes (only if slug is empty or was auto-generated)
      if (field === 'name' && (!prev.slug || prev.slug === generateSlug(prev.name))) {
        newData.slug = generateSlug(value);
      }
      
      return newData;
    });
    
    setHasUnsavedChanges(true);
    
    // Real-time validation
    if (touched[field]) {
      validateSingle(field, value);
    }
  }, [touched, validateSingle, generateSlug]);

  // Handle field blur for validation
  const handleFieldBlur = useCallback((field: keyof DestinationFormData) => {
    setFieldTouched(field, true);
    validateSingle(field, formData[field]);
  }, [setFieldTouched, validateSingle, formData]);

  // Handle image changes
  const handleHeroImageChange = useCallback((url: string | undefined) => {
    setFormData(prev => ({ ...prev, heroImage: url }));
    setHasUnsavedChanges(true);
  }, []);

  const handleGalleryImagesChange = useCallback((urls: string[]) => {
    setFormData(prev => ({ ...prev, galleryImages: urls }));
    setHasUnsavedChanges(true);
  }, []);

  // Validate slug uniqueness
  const validateSlugUniqueness = useCallback(async (slug: string) => {
    if (!slug || slug === destination?.slug) {
      setSlugValidationStatus('idle');
      return;
    }

    setSlugValidationStatus('checking');
    
    try {
      const response = await fetch(`/api/admin/destinations/validate-slug?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSlugValidationStatus(data.isUnique ? 'valid' : 'invalid');
      } else {
        setSlugValidationStatus('idle');
      }
    } catch (error) {
      console.error('Error validating slug:', error);
      setSlugValidationStatus('idle');
    }
  }, [destination?.slug]);

  // Auto-save functionality
  const autoSave = useCallback(async (data: DestinationFormData) => {
    if (!hasUnsavedChanges || !isEditing) return;

    setIsAutoSaving(true);
    
    try {
      const response = await fetch(`/api/admin/destinations/${destination?._id}/auto-save`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isEditing, destination?._id]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    clearError();
    
    // Validate all fields
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      setError({
        message: 'Please fix the validation errors before submitting.',
      });
      return;
    }

    // Check slug uniqueness for new destinations or changed slugs
    if (slugValidationStatus === 'invalid') {
      setError({
        message: 'Please choose a unique slug for the destination.',
        field: 'slug',
      });
      return;
    }

    await executeWithErrorHandling(
      () => onSubmit(formData),
      () => {
        setHasUnsavedChanges(false);
        // Success handled by parent component
      }
    );
  }, [formData, validate, slugValidationStatus, clearError, setError, executeWithErrorHandling, onSubmit]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) return;
    }
    
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, onCancel, router]);

  // Effect for auto-save
  useEffect(() => {
    if (debouncedFormData && hasUnsavedChanges && isEditing) {
      autoSave(debouncedFormData);
    }
  }, [debouncedFormData, autoSave, hasUnsavedChanges, isEditing]);

  // Effect for slug validation
  useEffect(() => {
    if (debouncedSlug && debouncedSlug !== destination?.slug) {
      validateSlugUniqueness(debouncedSlug);
    }
  }, [debouncedSlug, validateSlugUniqueness, destination?.slug]);

  // Warn user about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Get slug validation message
  const getSlugValidationMessage = () => {
    switch (slugValidationStatus) {
      case 'checking':
        return 'Checking availability...';
      case 'valid':
        return 'Slug is available';
      case 'invalid':
        return 'This slug is already taken';
      default:
        return 'URL-friendly identifier for the destination';
    }
  };

  const getSlugValidationColor = () => {
    switch (slugValidationStatus) {
      case 'checking':
        return 'text-blue-600';
      case 'valid':
        return 'text-green-600';
      case 'invalid':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Destination' : 'Create New Destination'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing 
            ? 'Update the basic information for this destination.'
            : 'Enter the basic information to create a new destination.'
          }
        </p>
        
        {/* Auto-save status */}
        {isEditing && (
          <div className="flex items-center mt-2 text-sm">
            {isAutoSaving && (
              <div className="flex items-center text-blue-600">
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </div>
            )}
            {lastSaved && !isAutoSaving && (
              <div className="text-green-600">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
            {hasUnsavedChanges && !isAutoSaving && (
              <div className="text-orange-600">
                Unsaved changes
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={clearError}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <Form onSubmit={handleSubmit} className="space-y-6">
        <FieldGroup
          title="Basic Information"
          description="Essential details about the destination"
        >
          <FormField
            label="Destination Name"
            name="name"
            type="text"
            value={formData.name}
            onChange={(value) => handleFieldChange('name', value)}
            onBlur={() => handleFieldBlur('name')}
            placeholder="e.g., Benidorm"
            required
            error={touched.name ? errors.name : undefined}
            helperText="The display name for the destination"
            validation={validationRules.name}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Country"
              name="country"
              type="text"
              value={formData.country}
              onChange={(value) => handleFieldChange('country', value)}
              onBlur={() => handleFieldBlur('country')}
              placeholder="e.g., Spain"
              required
              error={touched.country ? errors.country : undefined}
              validation={validationRules.country}
            />

            <FormField
              label="Region"
              name="region"
              type="text"
              value={formData.region}
              onChange={(value) => handleFieldChange('region', value)}
              onBlur={() => handleFieldBlur('region')}
              placeholder="e.g., Costa Blanca"
              required
              error={touched.region ? errors.region : undefined}
              validation={validationRules.region}
            />
          </div>

          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={formData.description}
            onChange={(value) => handleFieldChange('description', value)}
            onBlur={() => handleFieldBlur('description')}
            placeholder="A brief overview of what makes this destination special..."
            required
            rows={4}
            error={touched.description ? errors.description : undefined}
            helperText={`${formData.description.length}/500 characters. This will be used for search results and previews.`}
            validation={validationRules.description}
          />

          <FormField
            label="URL Slug"
            name="slug"
            type="text"
            value={formData.slug}
            onChange={(value) => handleFieldChange('slug', value)}
            onBlur={() => handleFieldBlur('slug')}
            placeholder="benidorm"
            error={touched.slug ? errors.slug : undefined}
            helperText={
              <span className={getSlugValidationColor()}>
                {slugValidationStatus === 'checking' && <LoadingSpinner size="xs" className="inline mr-1" />}
                {getSlugValidationMessage()}
              </span>
            }
            validation={validationRules.slug}
          />
        </FieldGroup>

        {/* Images Section */}
        {isEditing && destination?._id && (
          <FieldGroup
            title="Images"
            description="Upload and manage images for this destination"
          >
            <DestinationImageManager
              destinationId={destination._id}
              heroImage={formData.heroImage}
              galleryImages={formData.galleryImages}
              onHeroImageChange={handleHeroImageChange}
              onGalleryImagesChange={handleGalleryImagesChange}
              readOnly={isLoading}
            />
          </FieldGroup>
        )}

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {isEditing && (
              <button
                type="button"
                onClick={() => autoSave(formData)}
                disabled={!hasUnsavedChanges || isLoading || isAutoSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAutoSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !isValid || slugValidationStatus === 'invalid'}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditing ? 'Update Destination' : 'Create Destination'
              )}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}