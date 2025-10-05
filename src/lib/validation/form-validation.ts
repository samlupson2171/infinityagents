import { z } from 'zod';

// Enhanced validation utilities for client-side forms
export class FormValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'FormValidationError';
  }
}

// Real-time validation helpers
export const validationHelpers = {
  // Company name validation with real-time feedback
  validateCompanyName: (value: string): { isValid: boolean; message?: string } => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'Company name is required' };
    }
    if (value.trim().length < 2) {
      return { isValid: false, message: 'Company name must be at least 2 characters long' };
    }
    if (value.trim().length > 200) {
      return { isValid: false, message: 'Company name cannot exceed 200 characters' };
    }
    return { isValid: true };
  },

  // Consortia validation with optional handling
  validateConsortia: (value?: string): { isValid: boolean; message?: string } => {
    if (!value || value.trim().length === 0) {
      return { isValid: true }; // Optional field
    }
    if (value.trim().length > 200) {
      return { isValid: false, message: 'Consortia name cannot exceed 200 characters' };
    }
    return { isValid: true };
  },

  // ABTA/PTS number validation with formatting
  validateAbtaPts: (value: string): { isValid: boolean; message?: string; formatted?: string } => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'ABTA/PTS number is required' };
    }
    
    const formatted = value.toUpperCase().trim();
    const regex = /^(ABTA|PTS)[A-Z0-9]{4,10}$/;
    
    if (!regex.test(formatted)) {
      return { 
        isValid: false, 
        message: 'Must start with ABTA or PTS followed by 4-10 alphanumeric characters',
        formatted 
      };
    }
    
    return { isValid: true, formatted };
  },

  // Email validation with domain checking
  validateEmail: (value: string): { isValid: boolean; message?: string } => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'Email address is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    // Check for common typos in domain
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = value.split('@')[1]?.toLowerCase();
    
    if (domain && domain.includes('.co') && !domain.includes('.com') && !domain.includes('.co.uk')) {
      return { 
        isValid: true, 
        message: `Did you mean ${domain.replace('.co', '.com')}?` 
      };
    }
    
    return { isValid: true };
  },

  // Website URL validation with protocol checking
  validateWebsite: (value: string): { isValid: boolean; message?: string; formatted?: string } => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, message: 'Website address is required' };
    }
    
    let formatted = value.trim();
    
    // Auto-add https:// if no protocol specified
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    
    try {
      const url = new URL(formatted);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { 
          isValid: false, 
          message: 'Website must use HTTP or HTTPS protocol',
          formatted 
        };
      }
      return { isValid: true, formatted };
    } catch {
      return { 
        isValid: false, 
        message: 'Please enter a valid website URL (e.g., https://www.example.com)',
        formatted 
      };
    }
  },

  // Password strength validation
  validatePassword: (value: string): { 
    isValid: boolean; 
    message?: string; 
    strength: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  } => {
    const suggestions: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (!value || value.length === 0) {
      return { 
        isValid: false, 
        message: 'Password is required',
        strength: 'weak',
        suggestions: ['Password is required']
      };
    }
    
    if (value.length < 8) {
      return { 
        isValid: false, 
        message: 'Password must be at least 8 characters long',
        strength: 'weak',
        suggestions: ['Use at least 8 characters']
      };
    }
    
    if (value.length > 128) {
      return { 
        isValid: false, 
        message: 'Password cannot exceed 128 characters',
        strength: 'weak',
        suggestions: ['Password is too long']
      };
    }
    
    // Check password strength
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    const criteriaCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (!hasLower) suggestions.push('Add lowercase letters');
    if (!hasUpper) suggestions.push('Add uppercase letters');
    if (!hasNumber) suggestions.push('Add numbers');
    if (!hasSpecial) suggestions.push('Add special characters');
    
    if (criteriaCount >= 3 && value.length >= 12) {
      strength = 'strong';
    } else if (criteriaCount >= 2 && value.length >= 8) {
      strength = 'medium';
    }
    
    return { 
      isValid: true, 
      strength,
      suggestions: suggestions.length > 0 ? suggestions : ['Password looks good!']
    };
  },

  // Contract reading validation
  validateContractReading: (scrollProgress: number, hasScrolledToEnd: boolean): {
    isValid: boolean;
    message?: string;
    remainingProgress: number;
  } => {
    if (!hasScrolledToEnd) {
      const remaining = Math.max(0, 100 - scrollProgress);
      return {
        isValid: false,
        message: `Please scroll through the entire contract. ${Math.round(remaining)}% remaining.`,
        remainingProgress: remaining
      };
    }
    
    return {
      isValid: true,
      message: 'Contract reading complete. You may now sign.',
      remainingProgress: 0
    };
  }
};

// Form validation schemas with enhanced error messages
export const enhancedFormSchemas = {
  // Registration form schema with detailed validation
  registration: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .trim()
      .refine((val) => /^[a-zA-Z\s'-]+$/.test(val), {
        message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
      }),
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
      .toLowerCase()
      .refine((email) => {
        // Block obviously fake emails
        const fakeDomains = ['test.com', 'example.com', 'fake.com'];
        const domain = email.split('@')[1];
        return !fakeDomains.includes(domain);
      }, {
        message: 'Please provide a real email address'
      }),
    websiteAddress: z
      .string()
      .url('Please provide a valid HTTP or HTTPS website URL')
      .refine((url) => {
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        } catch {
          return false;
        }
      }, 'Please provide a valid HTTP or HTTPS website URL'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  }),

  // Contract signing validation
  contractSigning: z.object({
    contractId: z.string().min(1, 'Contract ID is required'),
    contractVersion: z.string().min(1, 'Contract version is required'),
    hasReadContract: z.boolean().refine((val) => val === true, {
      message: 'You must read the entire contract before signing'
    }),
    digitalSignatureConsent: z.boolean().refine((val) => val === true, {
      message: 'You must consent to digital signature to proceed'
    }),
    token: z.string().optional()
  }),

  // Admin action validation
  adminAction: z.object({
    action: z.enum(['approve', 'reject'], {
      errorMap: () => ({ message: 'Action must be either approve or reject' })
    }),
    reason: z
      .string()
      .max(500, 'Reason cannot exceed 500 characters')
      .trim()
      .optional(),
    userId: z.string().min(1, 'User ID is required')
  }).refine((data) => {
    // Require reason for rejection
    if (data.action === 'reject' && (!data.reason || data.reason.trim().length === 0)) {
      return false;
    }
    return true;
  }, {
    message: 'Rejection reason is required when rejecting an application',
    path: ['reason']
  })
};

// Error recovery guidance
export const errorRecoveryGuidance = {
  'VALIDATION_ERROR': {
    title: 'Form Validation Error',
    message: 'Please check the highlighted fields and correct any errors.',
    actions: ['Review form fields', 'Check required information', 'Try submitting again']
  },
  'NETWORK_ERROR': {
    title: 'Connection Problem',
    message: 'Unable to connect to the server. Please check your internet connection.',
    actions: ['Check internet connection', 'Try again in a moment', 'Contact support if problem persists']
  },
  'SERVER_ERROR': {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again.',
    actions: ['Wait a moment and try again', 'Refresh the page', 'Contact support if error continues']
  },
  'AUTHENTICATION_ERROR': {
    title: 'Authentication Required',
    message: 'You need to be logged in to perform this action.',
    actions: ['Sign in to your account', 'Check if your session expired', 'Try logging in again']
  },
  'AUTHORIZATION_ERROR': {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    actions: ['Check your account status', 'Contact an administrator', 'Ensure you have the right permissions']
  },
  'CONTRACT_ERROR': {
    title: 'Contract Signing Error',
    message: 'There was a problem signing the contract.',
    actions: ['Ensure you\'ve read the entire contract', 'Check your internet connection', 'Try signing again']
  }
};

// Type exports
export type ValidationResult = {
  isValid: boolean;
  message?: string;
  suggestions?: string[];
  formatted?: string;
};

export type ErrorRecoveryInfo = {
  title: string;
  message: string;
  actions: string[];
};