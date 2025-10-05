import { useState, useCallback, useEffect } from 'react';
import { validationHelpers, FormValidationError, errorRecoveryGuidance, type ValidationResult, type ErrorRecoveryInfo } from '@/lib/validation/form-validation';

interface ValidationState {
  [key: string]: {
    isValid: boolean;
    message?: string;
    isDirty: boolean;
    isValidating: boolean;
  };
}

interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export function useFormValidation(options: UseFormValidationOptions = {}) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Debounce timer for validation
  const [debounceTimers, setDebounceTimers] = useState<{ [key: string]: NodeJS.Timeout }>({});

  // Update form validity when validation state changes
  useEffect(() => {
    const allFields = Object.values(validationState);
    const hasInvalidFields = allFields.some(field => field.isDirty && !field.isValid);
    const hasUntouchedRequiredFields = allFields.some(field => !field.isDirty);
    
    setIsFormValid(!hasInvalidFields && !hasUntouchedRequiredFields);
    
    // Collect all error messages
    const errors = allFields
      .filter(field => field.isDirty && !field.isValid && field.message)
      .map(field => field.message!);
    setValidationErrors(errors);
  }, [validationState]);

  // Generic validation function
  const validateField = useCallback((
    fieldName: string,
    value: any,
    validator: (value: any) => ValidationResult,
    immediate = false
  ) => {
    // Clear existing timer
    if (debounceTimers[fieldName]) {
      clearTimeout(debounceTimers[fieldName]);
    }

    const performValidation = () => {
      setValidationState(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          isValidating: true
        }
      }));

      try {
        const result = validator(value);
        
        setValidationState(prev => ({
          ...prev,
          [fieldName]: {
            isValid: result.isValid,
            message: result.message,
            isDirty: true,
            isValidating: false
          }
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation error';
        
        setValidationState(prev => ({
          ...prev,
          [fieldName]: {
            isValid: false,
            message: errorMessage,
            isDirty: true,
            isValidating: false
          }
        }));

        return { isValid: false, message: errorMessage };
      }
    };

    if (immediate || debounceMs === 0) {
      return performValidation();
    } else {
      // Set up debounced validation
      const timer = setTimeout(performValidation, debounceMs);
      setDebounceTimers(prev => ({
        ...prev,
        [fieldName]: timer
      }));
    }
  }, [debounceMs, debounceTimers]);

  // Specific field validators
  const validators = {
    companyName: useCallback((value: string) => 
      validateField('companyName', value, validationHelpers.validateCompanyName), 
      [validateField]
    ),

    consortia: useCallback((value?: string) => 
      validateField('consortia', value, validationHelpers.validateConsortia), 
      [validateField]
    ),

    abtaPtsNumber: useCallback((value: string) => 
      validateField('abtaPtsNumber', value, validationHelpers.validateAbtaPts), 
      [validateField]
    ),

    email: useCallback((value: string) => 
      validateField('email', value, validationHelpers.validateEmail), 
      [validateField]
    ),

    website: useCallback((value: string) => 
      validateField('website', value, validationHelpers.validateWebsite), 
      [validateField]
    ),

    password: useCallback((value: string) => 
      validateField('password', value, validationHelpers.validatePassword), 
      [validateField]
    ),

    contractReading: useCallback((scrollProgress: number, hasScrolledToEnd: boolean) => 
      validateField('contractReading', { scrollProgress, hasScrolledToEnd }, 
        ({ scrollProgress, hasScrolledToEnd }) => 
          validationHelpers.validateContractReading(scrollProgress, hasScrolledToEnd)
      ), 
      [validateField]
    )
  };

  // Field event handlers
  const createFieldHandlers = useCallback((fieldName: string, validator: (value: any) => void) => ({
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (validateOnChange) {
        validator(e.target.value);
      }
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (validateOnBlur) {
        validator(e.target.value);
      }
    }
  }), [validateOnChange, validateOnBlur]);

  // Get field validation state
  const getFieldState = useCallback((fieldName: string) => {
    return validationState[fieldName] || {
      isValid: true,
      isDirty: false,
      isValidating: false
    };
  }, [validationState]);

  // Get field CSS classes for styling
  const getFieldClasses = useCallback((fieldName: string, baseClasses = '') => {
    const state = getFieldState(fieldName);
    let classes = baseClasses;
    
    if (state.isDirty) {
      if (state.isValid) {
        classes += ' border-green-500 focus:ring-green-500';
      } else {
        classes += ' border-red-500 focus:ring-red-500';
      }
    } else {
      classes += ' border-gray-300 focus:ring-blue-500';
    }
    
    if (state.isValidating) {
      classes += ' opacity-75';
    }
    
    return classes;
  }, [getFieldState]);

  // Clear validation for a field
  const clearFieldValidation = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  // Clear all validation
  const clearAllValidation = useCallback(() => {
    setValidationState({});
    setValidationErrors([]);
    
    // Clear all timers
    Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    setDebounceTimers({});
  }, [debounceTimers]);

  // Validate all fields immediately
  const validateAllFields = useCallback((formData: Record<string, any>) => {
    const results: Record<string, ValidationResult> = {};
    
    Object.entries(formData).forEach(([fieldName, value]) => {
      if (validators[fieldName as keyof typeof validators]) {
        const validator = validators[fieldName as keyof typeof validators] as (value: any) => ValidationResult;
        results[fieldName] = validateField(fieldName, value, validator, true) as ValidationResult;
      }
    });
    
    return results;
  }, [validateField, validators]);

  // Get error recovery guidance
  const getErrorRecoveryGuidance = useCallback((errorCode?: string): ErrorRecoveryInfo => {
    return errorRecoveryGuidance[errorCode as keyof typeof errorRecoveryGuidance] || 
           errorRecoveryGuidance.SERVER_ERROR;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [debounceTimers]);

  return {
    // Validation state
    validationState,
    isFormValid,
    validationErrors,
    
    // Validators
    validators,
    
    // Field utilities
    createFieldHandlers,
    getFieldState,
    getFieldClasses,
    
    // Control functions
    clearFieldValidation,
    clearAllValidation,
    validateAllFields,
    
    // Error handling
    getErrorRecoveryGuidance
  };
}

// Hook for password strength indicator
export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState<{
    score: number;
    level: 'weak' | 'medium' | 'strong';
    suggestions: string[];
    color: string;
  }>({
    score: 0,
    level: 'weak',
    suggestions: [],
    color: 'red'
  });

  useEffect(() => {
    const result = validationHelpers.validatePassword(password);
    
    let score = 0;
    let color = 'red';
    
    if (result.strength === 'medium') {
      score = 60;
      color = 'yellow';
    } else if (result.strength === 'strong') {
      score = 100;
      color = 'green';
    } else if (password.length >= 8) {
      score = 30;
      color = 'orange';
    }
    
    setStrength({
      score,
      level: result.strength,
      suggestions: result.suggestions,
      color
    });
  }, [password]);

  return strength;
}

// Hook for contract reading progress
export function useContractReading() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Calculate scroll progress percentage
    const progress = Math.min(
      (scrollTop / (scrollHeight - clientHeight)) * 100,
      100
    );
    setScrollProgress(progress);

    // Check if user has scrolled to the bottom (with 10px tolerance)
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10;

    if (isAtBottom && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
      setIsValid(true);
    }
  }, [hasScrolledToEnd]);

  const reset = useCallback(() => {
    setScrollProgress(0);
    setHasScrolledToEnd(false);
    setIsValid(false);
  }, []);

  const validation = validationHelpers.validateContractReading(scrollProgress, hasScrolledToEnd);

  return {
    scrollProgress,
    hasScrolledToEnd,
    isValid,
    validation,
    handleScroll,
    reset
  };
}