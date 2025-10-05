/**
 * Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  createErrorResponse,
  createSuccessResponse,
  handleAPIError,
  BusinessError,
  validateRequired,
  getUserFriendlyMessage,
} from '../error-handling';

describe('Error Handling', () => {
  describe('createErrorResponse', () => {
    it('should create a properly formatted error response', () => {
      const error = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Test error message',
        { field: 'test' },
        'testField'
      );

      expect(error.success).toBe(false);
      expect(error.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.error.message).toBe('Test error message');
      expect(error.error.details).toEqual({ field: 'test' });
      expect(error.error.field).toBe('testField');
      expect(error.error.timestamp).toBeDefined();
    });
  });

  describe('createSuccessResponse', () => {
    it('should create a properly formatted success response', () => {
      const data = { test: 'data' };
      const response = createSuccessResponse(data, 'Success message');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Success message');
    });
  });

  describe('BusinessError', () => {
    it('should create a business error with proper properties', () => {
      const error = new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Invalid input provided',
        { value: 'test' },
        'inputField'
      );

      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Invalid input provided');
      expect(error.details).toEqual({ value: 'test' });
      expect(error.field).toBe('inputField');
      expect(error.name).toBe('BusinessError');
    });
  });

  describe('validateRequired', () => {
    it('should not throw for valid values', () => {
      expect(() => validateRequired('test', 'testField')).not.toThrow();
      expect(() => validateRequired(123, 'numberField')).not.toThrow();
      expect(() => validateRequired(true, 'booleanField')).not.toThrow();
    });

    it('should throw BusinessError for invalid values', () => {
      expect(() => validateRequired('', 'emptyField')).toThrow(BusinessError);
      expect(() => validateRequired(null, 'nullField')).toThrow(BusinessError);
      expect(() => validateRequired(undefined, 'undefinedField')).toThrow(
        BusinessError
      );

      try {
        validateRequired('', 'testField');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessError);
        expect((error as BusinessError).code).toBe(
          ErrorCode.MISSING_REQUIRED_FIELD
        );
        expect((error as BusinessError).field).toBe('testField');
      }
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return custom message when provided', () => {
      const customMessage = 'Custom error message';
      const result = getUserFriendlyMessage(
        ErrorCode.VALIDATION_ERROR,
        customMessage
      );
      expect(result).toBe(customMessage);
    });

    it('should return default message for known error codes', () => {
      const result = getUserFriendlyMessage(ErrorCode.UNAUTHORIZED);
      expect(result).toBe('Please log in to access this feature.');
    });

    it('should return generic message for unknown error codes', () => {
      const result = getUserFriendlyMessage('UNKNOWN_CODE' as ErrorCode);
      expect(result).toBe('An unexpected error occurred.');
    });
  });

  describe('handleAPIError', () => {
    it('should handle BusinessError correctly', () => {
      const businessError = new BusinessError(
        ErrorCode.INVALID_INPUT,
        'Test business error',
        { test: 'data' },
        'testField'
      );

      const result = handleAPIError(businessError);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(result.error.message).toBe('Test business error');
      expect(result.error.details).toEqual({ test: 'data' });
      expect(result.error.field).toBe('testField');
    });

    it('should handle MongoDB validation errors', () => {
      const mongoError = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
        },
      };

      const result = handleAPIError(mongoError);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error.message).toBe('Name is required');
      expect(result.error.field).toBe('name');
    });

    it('should handle MongoDB duplicate key errors', () => {
      const duplicateError = {
        code: 11000,
        keyValue: { email: 'test@example.com' },
      };

      const result = handleAPIError(duplicateError);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.ALREADY_EXISTS);
      expect(result.error.details).toEqual({ email: 'test@example.com' });
    });

    it('should handle network errors', () => {
      const networkError = {
        code: 'ECONNREFUSED',
      };

      const result = handleAPIError(networkError);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');

      const result = handleAPIError(unknownError);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error.message).toBe(
        'Something went wrong on our end. Please try again later.'
      );
    });
  });
});
