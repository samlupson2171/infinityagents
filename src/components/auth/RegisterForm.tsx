'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

// Validation schema matching the API
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),
    companyName: z
      .string()
      .min(2, 'Company name must be at least 2 characters long')
      .max(200, 'Company name cannot exceed 200 characters')
      .trim(),
    company: z
      .string()
      .min(2, 'Company name must be at least 2 characters long')
      .max(200, 'Company name cannot exceed 200 characters')
      .trim(),
    consortia: z
      .string()
      .max(200, 'Consortia name cannot exceed 200 characters')
      .trim()
      .optional()
      .or(z.literal('')),
    abtaPtsNumber: z
      .string()
      .regex(
        /^(ABTA|PTS)[A-Z0-9]{4,10}$/i,
        'ABTA/PTS number must start with ABTA or PTS followed by 4-10 alphanumeric characters'
      )
      .transform((val) => val.toUpperCase()),
    contactEmail: z
      .string()
      .email('Please provide a valid email address')
      .toLowerCase(),
    websiteAddress: z
      .string()
      .url('Please provide a valid HTTP or HTTPS website URL')
      .refine((url) => {
        try {
          const parsedUrl = new URL(url);
          return (
            parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
          );
        } catch {
          return false;
        }
      }, 'Please provide a valid HTTP or HTTPS website URL'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

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
    user: {
      id: string;
      name: string;
      companyName: string;
      contactEmail: string;
      abtaPtsNumber: string;
      websiteAddress: string;
      isApproved: boolean;
      role: string;
      createdAt: string;
    };
  };
}

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange', // Enable real-time validation
  });

  // Watch ABTA/PTS number for real-time formatting
  const abtaPtsValue = watch('abtaPtsNumber');

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Remove confirmPassword from submission data and transform consortia
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
            setError(detail.field as keyof RegisterFormData, {
              type: 'server',
              message: detail.message,
            });
          });
        } else {
          // Set general error
          setSubmitError(result.error?.message || 'Registration failed');
        }
        return;
      }

      // Registration successful - redirect to confirmation page
      router.push('/auth/register/confirmation');
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Register for Infinity Weekends
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Company Name Field */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company Name *
          </label>
          <input
            {...register('companyName')}
            type="text"
            id="companyName"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.companyName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your company name"
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.companyName.message}
            </p>
          )}
        </div>

        {/* Company Field (Enhanced) */}
        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company *
          </label>
          <input
            {...register('company')}
            type="text"
            id="company"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.company ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your company name"
          />
          {errors.company && (
            <p className="mt-1 text-sm text-red-600">
              {errors.company.message}
            </p>
          )}
        </div>

        {/* Consortia Field */}
        <div>
          <label
            htmlFor="consortia"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Consortia
          </label>
          <input
            {...register('consortia')}
            type="text"
            id="consortia"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.consortia ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your consortia affiliation (optional)"
          />
          {errors.consortia && (
            <p className="mt-1 text-sm text-red-600">
              {errors.consortia.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Optional - Enter your consortia affiliation if applicable
          </p>
        </div>

        {/* ABTA/PTS Number Field */}
        <div>
          <label
            htmlFor="abtaPtsNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            ABTA/PTS Number *
          </label>
          <input
            {...register('abtaPtsNumber')}
            type="text"
            id="abtaPtsNumber"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.abtaPtsNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., ABTA12345 or PTS67890"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.abtaPtsNumber && (
            <p className="mt-1 text-sm text-red-600">
              {errors.abtaPtsNumber.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must start with ABTA or PTS followed by 4-10 alphanumeric characters
          </p>
        </div>

        {/* Contact Email Field */}
        <div>
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Contact Email *
          </label>
          <input
            {...register('contactEmail')}
            type="email"
            id="contactEmail"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.contactEmail ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
          />
          {errors.contactEmail && (
            <p className="mt-1 text-sm text-red-600">
              {errors.contactEmail.message}
            </p>
          )}
        </div>

        {/* Website Address Field */}
        <div>
          <label
            htmlFor="websiteAddress"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Website Address *
          </label>
          <input
            {...register('websiteAddress')}
            type="url"
            id="websiteAddress"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.websiteAddress ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="https://www.yourcompany.com"
          />
          {errors.websiteAddress && (
            <p className="mt-1 text-sm text-red-600">
              {errors.websiteAddress.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password *
          </label>
          <input
            {...register('password')}
            type="password"
            id="password"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter a secure password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters long
          </p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm Password *
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={`w-full py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isSubmitting || !isValid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Registering...
            </span>
          ) : (
            'Register'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a
            href="/auth/login"
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
