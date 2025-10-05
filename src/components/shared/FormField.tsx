/**
 * Form field components with validation and real-time feedback
 */

import React, { useState, useCallback } from 'react';
import { useFormValidation, ValidationRule } from '@/lib/hooks/useErrorHandler';

interface FormFieldProps {
  label: string;
  name: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'textarea'
    | 'select';
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>; // For select fields
  rows?: number; // For textarea
  className?: string;
  validation?: ValidationRule;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  options = [],
  rows = 3,
  className = '',
  validation,
}: FormFieldProps) {
  const [isTouched, setIsTouched] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const validateField = useCallback(
    (fieldValue: any) => {
      if (!validation) return '';

      // Required validation
      if (
        validation.required &&
        (fieldValue === undefined || fieldValue === null || fieldValue === '')
      ) {
        return `${label} is required`;
      }

      // Skip other validations if field is empty and not required
      if (
        !validation.required &&
        (fieldValue === undefined || fieldValue === null || fieldValue === '')
      ) {
        return '';
      }

      // String validations
      if (typeof fieldValue === 'string') {
        if (validation.minLength && fieldValue.length < validation.minLength) {
          return `${label} must be at least ${validation.minLength} characters`;
        }

        if (validation.maxLength && fieldValue.length > validation.maxLength) {
          return `${label} must not exceed ${validation.maxLength} characters`;
        }

        if (validation.pattern && !validation.pattern.test(fieldValue)) {
          return `${label} format is invalid`;
        }
      }

      // Custom validation
      if (validation.custom) {
        return validation.custom(fieldValue) || '';
      }

      return '';
    },
    [validation, label]
  );

  const handleChange = (newValue: any) => {
    onChange(newValue);

    // Real-time validation
    if (isTouched && validation) {
      const validationError = validateField(newValue);
      setLocalError(validationError);
    }
  };

  const handleBlur = () => {
    setIsTouched(true);

    if (validation) {
      const validationError = validateField(value);
      setLocalError(validationError);
    }

    if (onBlur) {
      onBlur();
    }
  };

  const displayError = error || localError;
  const hasError = Boolean(displayError);

  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${hasError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
  `;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={(e) => {
              const newValue =
                type === 'number'
                  ? parseFloat(e.target.value) || ''
                  : e.target.value;
              handleChange(newValue);
            }}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {renderInput()}

      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠</span>
          {displayError}
        </p>
      )}

      {!hasError && helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

interface FormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function Form({ children, onSubmit, className = '' }: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {children}
    </form>
  );
}

interface FieldGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldGroup({
  title,
  description,
  children,
  className = '',
}: FieldGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
