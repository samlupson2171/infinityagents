'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useFormValidation, usePasswordStrength } from '@/lib/hooks/useFormValidation';
import { enhancedFormSchemas } from '@/lib/validation/form-validation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Toast } from '@/components/shared/Toast';

type EnhancedRegistrationData = {
  name: string;
  company: string;
  consortia?: string;
  abtaPtsNumber: string;
  contactEmail: string;
  websiteAddress: string;
  password: string;
  confirmPassword: string;
};

interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  error?: ApiError;
  data?: {
    message: string;
    user: any;
  };
}

export default function EnhancedRegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const router = useRouter();

  // Form validation setup
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError,
    setValue,
    trigger
  } = useForm<EnhancedRegistrationData>({
    resolver: zodResolver(enhancedFormSchemas.registration),
    mode: 'onChange',
    defaultValues: {
      name: '',
      company: '',
      consortia: '',
      abtaPtsNumber: '',
      contactEmail: '',
      websiteAddress: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Enhanced validation hooks
  const {
    validators,
    getFieldState,
    getFieldClasses,
    getErrorRecoveryGuidance,
    clearAllValidation
  } = useFormValidation({
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  });

  // Watch form values for real-time validation
  const watchedValues = watch();
  const passwordStrength = usePasswordStrength(watchedValues.password || '');

  // Real-time field validation handlers
  const handleFieldChange = (fieldName: keyof EnhancedRegistrationData, value: string) => {
    setValue(fieldName, value);
    
    // Trigger validation for specific fields
    switch (fieldName) {
      case 'company':
        validators.companyName(value);
        break;
      case 'consortia':
        validators.consortia(value);
        break;
      case 'abtaPtsNumber':
        const result = validators.abtaPtsNumber(value);
        if (result && 'formatted' in result && result.formatted) {
          setValue('abtaPtsNumber', result.formatted);
        }
        break;
      case 'contactEmail':
        validators.email(value);
        break;
      case 'websiteAddress':
        const websiteResult = validators.website(value);
        if (websiteResult && 'formatted' in websiteResult && websiteResult.formatted) {
          setValue('websiteAddress', websiteResult.formatted);
        }
        break;
      case 'password':
        validators.password(value);
        // Re-validate confirm password if it exists
        if (watchedValues.confirmPassword) {
          trigger('confirmPassword');
        }
        break;
    }
    
    // Trigger form validation
    trigger(fieldName);
  };

  const onSubmit = async (data: EnhancedRegistrationData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    clearAllValidation();

    try {
      // Remove confirmPassword from submission data
      const { confirmPassword, consortia, ...submitData } = data;
      
      // Transform empty consortia string to undefined
      const finalData = {
        ...submitData,
        consortia: consortia && consortia.trim() !== '' ? consortia : undefined,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData),
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        if (result.error?.code === 'VALIDATION_ERROR' && result.error.details) {
          // Set field-specific errors
          result.error.details.forEach((detail) => {
            setError(detail.field as keyof EnhancedRegistrationData, {
              type: 'server',
              message: detail.message,
            });
          });
        } else {
          // Set general error with recovery guidance
          const guidance = getErrorRecoveryGuidance(result.error?.code);
          setSubmitError(`${result.error?.message || 'Registration failed'}\n\n${guidance.message}`);
        }
        return;
      }

      // Registration successful
      setShowSuccessToast(true);
      setTimeout(() => {
        router.push('/auth/register/confirmation');
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      const guidance = getErrorRecoveryGuidance('NETWORK_ERROR');
      setSubmitError(`${guidance.message}\n\nPlease try again or contact support if the problem persists.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation state helpers
  const getFieldValidationState = (fieldName: keyof EnhancedRegistrationData) => {
    const hasError = !!errors[fieldName];
    const fieldState = getFieldState(fieldName);
    
    return {
      hasError,
      isValidating: fieldState.isValidating,
      isDirty: fieldState.isDirty,
      isValid: fieldState.isValid && !hasError
    };
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Register for Infinity Weekends
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('name', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="Enter your full name"
            onChange={(e) => handleFieldChange('name', e.target.value)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Company Field */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            {...register('company')}
            type="text"
            id="company"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('company', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="Enter your company name"
            onChange={(e) => handleFieldChange('company', e.target.value)}
            aria-describedby={errors.company ? 'company-error' : undefined}
            aria-invalid={!!errors.company}
          />
          {errors.company && (
            <p id="company-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.company.message}
            </p>
          )}
        </div>

        {/* Consortia Field */}
        <div>
          <label htmlFor="consortia" className="block text-sm font-medium text-gray-700 mb-1">
            Consortia
          </label>
          <input
            {...register('consortia')}
            type="text"
            id="consortia"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('consortia', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="Enter your consortia affiliation (optional)"
            onChange={(e) => handleFieldChange('consortia', e.target.value)}
            aria-describedby="consortia-help"
          />
          <p id="consortia-help" className="mt-1 text-xs text-gray-500">
            Optional - Enter your consortia affiliation if applicable
          </p>
          {errors.consortia && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.consortia.message}
            </p>
          )}
        </div>

        {/* ABTA/PTS Number Field */}
        <div>
          <label htmlFor="abtaPtsNumber" className="block text-sm font-medium text-gray-700 mb-1">
            ABTA/PTS Number *
          </label>
          <input
            {...register('abtaPtsNumber')}
            type="text"
            id="abtaPtsNumber"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('abtaPtsNumber', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="e.g., ABTA12345 or PTS67890"
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => handleFieldChange('abtaPtsNumber', e.target.value)}
            aria-describedby={`abta-help ${errors.abtaPtsNumber ? 'abta-error' : ''}`}
            aria-invalid={!!errors.abtaPtsNumber}
          />
          <p id="abta-help" className="mt-1 text-xs text-gray-500">
            Must start with ABTA or PTS followed by 4-10 alphanumeric characters
          </p>
          {errors.abtaPtsNumber && (
            <p id="abta-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.abtaPtsNumber.message}
            </p>
          )}
        </div>

        {/* Contact Email Field */}
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email *
          </label>
          <input
            {...register('contactEmail')}
            type="email"
            id="contactEmail"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('contactEmail', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="Enter your email address"
            onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
            aria-describedby={errors.contactEmail ? 'email-error' : undefined}
            aria-invalid={!!errors.contactEmail}
          />
          {errors.contactEmail && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.contactEmail.message}
            </p>
          )}
        </div>

        {/* Website Address Field */}
        <div>
          <label htmlFor="websiteAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Website Address *
          </label>
          <input
            {...register('websiteAddress')}
            type="url"
            id="websiteAddress"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('websiteAddress', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="https://www.yourcompany.com"
            onChange={(e) => handleFieldChange('websiteAddress', e.target.value)}
            aria-describedby={errors.websiteAddress ? 'website-error' : undefined}
            aria-invalid={!!errors.websiteAddress}
          />
          {errors.websiteAddress && (
            <p id="website-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.websiteAddress.message}
            </p>
          )}
        </div>

        {/* Password Field with Strength Indicator */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            {...register('password')}
            type="password"
            id="password"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              getFieldClasses('password', 'border-gray-300 focus:ring-blue-500')
            }`}
            placeholder="Enter a secure password"
            onChange={(e) => handleFieldChange('password', e.target.value)}
            aria-describedby="password-help password-strength"
            aria-invalid={!!errors.password}
          />
          
          {/* Password Strength Indicator */}
          {watchedValues.password && (
            <div id="password-strength" className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                <span className={`text-xs font-medium text-${passwordStrength.color}-600`}>
                  {passwordStrength.level.charAt(0).toUpperCase() + passwordStrength.level.slice(1)}
                </span>
              </div>
              {passwordStrength.suggestions.length > 0 && (
                <ul className="mt-1 text-xs text-gray-600">
                  {passwordStrength.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center">
                      <span className="mr-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          <p id="password-help" className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters long
          </p>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Confirm your password"
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Registration Error</h3>
                <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                  {submitError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            isSubmitting || !isValid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          aria-describedby="submit-help"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2">Registering...</span>
            </span>
          ) : (
            'Register'
          )}
        </button>
        
        {!isValid && (
          <p id="submit-help" className="text-xs text-gray-500 text-center">
            Please complete all required fields to register
          </p>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a
            href="/auth/login"
            className="text-blue-600 hover:text-blue-500 font-medium focus:outline-none focus:underline"
          >
            Sign in here
          </a>
        </p>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <Toast
          type="success"
          message="Registration successful! Redirecting to confirmation page..."
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  );
}