/**
 * React hook for centralized error handling and user feedback
 */

import { useState, useCallback } from 'react';
import { ErrorCode, getUserFriendlyMessage } from '../error-handling';

export interface ErrorState {
  code?: ErrorCode;
  message: string;
  details?: any;
  field?: string;
  timestamp?: string;
}

export interface UseErrorHandlerReturn {
  error: ErrorState | null;
  isLoading: boolean;
  setError: (error: ErrorState | null) => void;
  setLoading: (loading: boolean) => void;
  handleError: (error: any) => void;
  clearError: () => void;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void
  ) => Promise<T | null>;
}

/**
 * Hook for managing error states and loading indicators
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setLoading] = useState(false);

  const handleError = useCallback((error: any) => {
    console.error('Error handled:', error);

    // Handle API error responses
    if (error.error && error.error.code) {
      setError({
        code: error.error.code,
        message: error.error.message,
        details: error.error.details,
        field: error.error.field,
        timestamp: error.error.timestamp,
      });
      return;
    }

    // Handle business errors
    if (error.code && Object.values(ErrorCode).includes(error.code)) {
      setError({
        code: error.code,
        message: getUserFriendlyMessage(error.code, error.message),
        details: error.details,
        field: error.field,
      });
      return;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      setError({
        code: ErrorCode.NETWORK_ERROR,
        message: getUserFriendlyMessage(ErrorCode.NETWORK_ERROR),
      });
      return;
    }

    // Handle timeout errors
    if (error.name === 'AbortError' || error.code === 'TIMEOUT_ERROR') {
      setError({
        code: ErrorCode.TIMEOUT_ERROR,
        message: getUserFriendlyMessage(ErrorCode.TIMEOUT_ERROR),
      });
      return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors || {})[0];
      setError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          error.errors?.[field]?.message ||
          getUserFriendlyMessage(ErrorCode.VALIDATION_ERROR),
        field,
      });
      return;
    }

    // Default error handling
    setError({
      code: ErrorCode.INTERNAL_ERROR,
      message:
        error.message || getUserFriendlyMessage(ErrorCode.INTERNAL_ERROR),
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      onSuccess?: (result: T) => void
    ): Promise<T | null> => {
      try {
        setLoading(true);
        clearError();

        const result = await operation();

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        handleError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError, clearError]
  );

  return {
    error,
    isLoading,
    setError,
    setLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
  };
}

/**
 * Hook for form validation with real-time feedback
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string;
}

export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [field: string]: boolean }>({});

  const validateField = useCallback(
    (field: string, value: any): string | null => {
      const rule = rules[field];
      if (!rule) return null;

      // Required validation
      if (
        rule.required &&
        (value === undefined || value === null || value === '')
      ) {
        return `${field} is required`;
      }

      // Skip other validations if field is empty and not required
      if (
        !rule.required &&
        (value === undefined || value === null || value === '')
      ) {
        return null;
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          return `${field} must be at least ${rule.minLength} characters`;
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          return `${field} must not exceed ${rule.maxLength} characters`;
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          return `${field} format is invalid`;
        }
      }

      // Custom validation
      if (rule.custom) {
        return rule.custom(value);
      }

      return null;
    },
    [rules]
  );

  const validate = useCallback(
    (values: { [field: string]: any }): ValidationErrors => {
      const newErrors: ValidationErrors = {};

      Object.keys(rules).forEach((field) => {
        const error = validateField(field, values[field]);
        if (error) {
          newErrors[field] = error;
        }
      });

      setErrors(newErrors);
      return newErrors;
    },
    [rules, validateField]
  );

  const validateSingle = useCallback(
    (field: string, value: any) => {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error || '',
      }));
      return error;
    },
    [validateField]
  );

  const setFieldTouched = useCallback((field: string, isTouched = true) => {
    setTouched((prev) => ({
      ...prev,
      [field]: isTouched,
    }));
  }, []);

  const isValid =
    Object.keys(errors).length === 0 ||
    Object.values(errors).every((error) => !error);

  return {
    errors,
    touched,
    isValid,
    validate,
    validateSingle,
    setFieldTouched,
    clearErrors: () => setErrors({}),
    clearTouched: () => setTouched({}),
  };
}
