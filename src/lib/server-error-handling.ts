import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Error types for better categorization
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EMAIL_DELIVERY_ERROR = 'EMAIL_DELIVERY_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

// Structured error class
export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION_ERROR, 400, details);
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorType.AUTHENTICATION_ERROR, 401);
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorType.AUTHORIZATION_ERROR, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, ErrorType.NOT_FOUND_ERROR, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT_ERROR, 409, details);
  }
}

export class EmailDeliveryError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.EMAIL_DELIVERY_ERROR, 500, details);
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.DATABASE_ERROR, 500, details);
  }
}

export class ContractError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONTRACT_ERROR, 400, details);
  }
}

// Logging levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Enhanced logging utility
export class Logger {
  private static formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  static error(message: string, error?: Error | any, context?: any): void {
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof ApiError ? {
        type: error.type,
        statusCode: error.statusCode,
        details: error.details
      } : {})
    } : error;

    const logMessage = this.formatMessage(LogLevel.ERROR, message, {
      ...context,
      error: errorDetails
    });

    console.error(logMessage);

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external logging service
      // await sendToLoggingService(logMessage, LogLevel.ERROR);
    }
  }

  static warn(message: string, context?: any): void {
    const logMessage = this.formatMessage(LogLevel.WARN, message, context);
    console.warn(logMessage);
  }

  static info(message: string, context?: any): void {
    const logMessage = this.formatMessage(LogLevel.INFO, message, context);
    console.info(logMessage);
  }

  static debug(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage(LogLevel.DEBUG, message, context);
      console.debug(logMessage);
    }
  }

  // Specific logging methods for different operations
  static emailDeliveryAttempt(recipient: string, template: string, attempt: number): void {
    this.info('Email delivery attempt', {
      recipient,
      template,
      attempt,
      timestamp: new Date().toISOString()
    });
  }

  static emailDeliverySuccess(recipient: string, template: string, attempts: number): void {
    this.info('Email delivered successfully', {
      recipient,
      template,
      attempts,
      timestamp: new Date().toISOString()
    });
  }

  static emailDeliveryFailure(recipient: string, template: string, error: any, attempts: number): void {
    this.error('Email delivery failed', error, {
      recipient,
      template,
      attempts,
      timestamp: new Date().toISOString()
    });
  }

  static contractSigningAttempt(userId: string, contractId: string, userAgent?: string): void {
    this.info('Contract signing attempt', {
      userId,
      contractId,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  static contractSigningSuccess(userId: string, contractId: string): void {
    this.info('Contract signed successfully', {
      userId,
      contractId,
      timestamp: new Date().toISOString()
    });
  }

  static contractSigningFailure(userId: string, contractId: string, error: any): void {
    this.error('Contract signing failed', error, {
      userId,
      contractId,
      timestamp: new Date().toISOString()
    });
  }

  static registrationAttempt(email: string, company: string): void {
    this.info('Registration attempt', {
      email,
      company,
      timestamp: new Date().toISOString()
    });
  }

  static registrationSuccess(userId: string, email: string, company: string): void {
    this.info('Registration successful', {
      userId,
      email,
      company,
      timestamp: new Date().toISOString()
    });
  }

  static registrationFailure(email: string, company: string, error: any): void {
    this.error('Registration failed', error, {
      email,
      company,
      timestamp: new Date().toISOString()
    });
  }

  static adminActionAttempt(adminId: string, action: string, targetUserId: string): void {
    this.info('Admin action attempt', {
      adminId,
      action,
      targetUserId,
      timestamp: new Date().toISOString()
    });
  }

  static adminActionSuccess(adminId: string, action: string, targetUserId: string): void {
    this.info('Admin action successful', {
      adminId,
      action,
      targetUserId,
      timestamp: new Date().toISOString()
    });
  }

  static adminActionFailure(adminId: string, action: string, targetUserId: string, error: any): void {
    this.error('Admin action failed', error, {
      adminId,
      action,
      targetUserId,
      timestamp: new Date().toISOString()
    });
  }
}

// Error handling middleware
export function handleApiError(error: unknown): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationDetails = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    Logger.warn('Validation error occurred', { validationDetails });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          details: validationDetails
        }
      },
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    Logger.error('API error occurred', error, {
      type: error.type,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.type,
          message: error.message,
          ...(error.details && { details: error.details })
        }
      },
      { status: error.statusCode }
    );
  }

  // Handle MongoDB/Database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;
    
    if (dbError.code === 11000) {
      // Duplicate key error
      const field = Object.keys(dbError.keyPattern || {})[0] || 'field';
      Logger.warn('Duplicate key error', { field, value: dbError.keyValue });
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorType.CONFLICT_ERROR,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
            details: { field, value: dbError.keyValue?.[field] }
          }
        },
        { status: 409 }
      );
    }

    Logger.error('Database error occurred', dbError);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorType.DATABASE_ERROR,
          message: 'Database operation failed'
        }
      },
      { status: 500 }
    );
  }

  // Handle generic errors
  const genericError = error instanceof Error ? error : new Error('Unknown error occurred');
  Logger.error('Unexpected error occurred', genericError);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorType.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'development' 
          ? genericError.message 
          : 'An unexpected error occurred'
      }
    },
    { status: 500 }
  );
}

// Async error wrapper for API routes
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Rate limiting helper
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(
    identifier: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      // First attempt or window expired
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
    }

    if (record.count >= maxAttempts) {
      // Rate limit exceeded
      Logger.warn('Rate limit exceeded', { identifier, attempts: record.count });
      return { allowed: false, remainingAttempts: 0, resetTime: record.resetTime };
    }

    // Increment attempt count
    record.count++;
    this.attempts.set(key, record);
    
    return { 
      allowed: true, 
      remainingAttempts: maxAttempts - record.count, 
      resetTime: record.resetTime 
    };
  }

  static resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Email retry mechanism
export class EmailRetryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  static async sendWithRetry<T>(
    emailFunction: () => Promise<T>,
    recipient: string,
    template: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        Logger.emailDeliveryAttempt(recipient, template, attempt + 1);
        const result = await emailFunction();
        Logger.emailDeliverySuccess(recipient, template, attempt + 1);
        return result;
      } catch (error) {
        lastError = error;
        Logger.warn(`Email delivery attempt ${attempt + 1} failed`, {
          recipient,
          template,
          error: error instanceof Error ? error.message : error
        });

        // Wait before retry (except on last attempt)
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAYS[attempt]));
        }
      }
    }

    // All retries failed
    Logger.emailDeliveryFailure(recipient, template, lastError, this.MAX_RETRIES);
    throw new EmailDeliveryError(
      `Failed to send email after ${this.MAX_RETRIES} attempts`,
      { recipient, template, lastError }
    );
  }
}

// Type exports
export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

export type ApiSuccessResponse<T = any> = {
  success: true;
  data: T;
};

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;