/**
 * Standardized error handling system for the Activities Module
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Upload/File errors
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  CSV_PARSING_ERROR = 'CSV_PARSING_ERROR',

  // Network/Server errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Business logic errors
  ACTIVITY_UNAVAILABLE = 'ACTIVITY_UNAVAILABLE',
  PACKAGE_EMPTY = 'PACKAGE_EMPTY',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
}

export interface APIError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    field?: string;
    timestamp: string;
  };
}

export interface APISuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type APIResponse<T = any> = APISuccess<T> | APIError;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  field?: string
): APIError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      field,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): APISuccess<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * User-friendly error messages mapping
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.INVALID_INPUT]: 'The provided information is not valid.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',

  [ErrorCode.UNAUTHORIZED]: 'Please log in to access this feature.',
  [ErrorCode.FORBIDDEN]: "You don't have permission to perform this action.",
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',

  [ErrorCode.NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCode.ALREADY_EXISTS]: 'This item already exists.',
  [ErrorCode.RESOURCE_CONFLICT]: 'This action conflicts with existing data.',

  [ErrorCode.UPLOAD_ERROR]: 'There was a problem uploading your file.',
  [ErrorCode.FILE_TOO_LARGE]:
    'The file is too large. Please choose a smaller file.',
  [ErrorCode.INVALID_FILE_FORMAT]: 'Please upload a valid CSV file.',
  [ErrorCode.CSV_PARSING_ERROR]: 'There was an error processing your CSV file.',

  [ErrorCode.NETWORK_ERROR]:
    'Connection problem. Please check your internet and try again.',
  [ErrorCode.TIMEOUT_ERROR]: 'The request took too long. Please try again.',
  [ErrorCode.INTERNAL_ERROR]:
    'Something went wrong on our end. Please try again later.',
  [ErrorCode.DATABASE_ERROR]: 'Database error occurred. Please try again.',

  [ErrorCode.ACTIVITY_UNAVAILABLE]: 'This activity is no longer available.',
  [ErrorCode.PACKAGE_EMPTY]:
    'Please add activities to your package before proceeding.',
  [ErrorCode.INVALID_DATE_RANGE]: 'Please select a valid date range.',
  [ErrorCode.CAPACITY_EXCEEDED]:
    'The number of people exceeds the activity capacity.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(
  code: ErrorCode,
  customMessage?: string
): string {
  return (
    customMessage || ERROR_MESSAGES[code] || 'An unexpected error occurred.'
  );
}

/**
 * Error handler for API routes
 */
export function handleAPIError(error: any): APIError {
  console.error('API Error:', error);

  // Handle known error types
  if (error.code && Object.values(ErrorCode).includes(error.code)) {
    return createErrorResponse(
      error.code,
      getUserFriendlyMessage(error.code, error.message),
      error.details,
      error.field
    );
  }

  // Handle MongoDB errors
  if (error.name === 'ValidationError') {
    const field = Object.keys(error.errors)[0];
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      error.errors[field]?.message || 'Validation failed',
      error.errors,
      field
    );
  }

  if (error.code === 11000) {
    return createErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'This item already exists',
      error.keyValue
    );
  }

  // Handle network/timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return createErrorResponse(
      ErrorCode.NETWORK_ERROR,
      getUserFriendlyMessage(ErrorCode.NETWORK_ERROR)
    );
  }

  // Default internal error
  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    getUserFriendlyMessage(ErrorCode.INTERNAL_ERROR),
    process.env.NODE_ENV === 'development' ? error.stack : undefined
  );
}

/**
 * Custom error class for business logic errors
 */
export class BusinessError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public field?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * Validation helper
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new BusinessError(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `${fieldName} is required`,
      undefined,
      fieldName
    );
  }
}

/**
 * Async wrapper with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>
): Promise<APIResponse<T>> {
  try {
    const result = await operation();
    return createSuccessResponse(result);
  } catch (error) {
    return handleAPIError(error);
  }
}
