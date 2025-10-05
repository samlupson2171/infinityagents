import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

export interface SanitizationResult<T> {
  data: T;
  warnings: string[];
  sanitized: boolean;
}

export class QuoteDataSanitizer {
  /**
   * Sanitize text input to prevent XSS and injection attacks
   */
  static sanitizeText(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags and decode entities
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    // Additional cleaning
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/data:/gi, '') // Remove data protocols
      .replace(/vbscript:/gi, '') // Remove vbscript protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    // Truncate if max length specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize rich text content (allows safe HTML)
   */
  static sanitizeRichText(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote',
      ],
      ALLOWED_ATTR: ['class'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style'],
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    });

    // Truncate if max length specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(
    input: any,
    min?: number,
    max?: number
  ): { value: number; isValid: boolean } {
    const num = parseFloat(input);
    
    if (isNaN(num) || !isFinite(num)) {
      return { value: 0, isValid: false };
    }

    let sanitized = Math.abs(num); // Ensure positive for prices

    if (min !== undefined && sanitized < min) {
      sanitized = min;
    }

    if (max !== undefined && sanitized > max) {
      sanitized = max;
    }

    return { value: sanitized, isValid: true };
  }

  /**
   * Sanitize date input
   */
  static sanitizeDate(input: any): { date: Date | null; isValid: boolean } {
    if (!input) {
      return { date: null, isValid: false };
    }

    try {
      const date = new Date(input);
      
      if (isNaN(date.getTime())) {
        return { date: null, isValid: false };
      }

      // Check if date is reasonable (not too far in past or future)
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 1, 0, 1); // 1 year ago
      const maxDate = new Date(now.getFullYear() + 5, 11, 31); // 5 years from now

      if (date < minDate || date > maxDate) {
        return { date: null, isValid: false };
      }

      return { date, isValid: true };
    } catch {
      return { date: null, isValid: false };
    }
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(input: string): { email: string; isValid: boolean } {
    if (!input || typeof input !== 'string') {
      return { email: '', isValid: false };
    }

    const sanitized = this.sanitizeText(input.toLowerCase(), 254); // RFC 5321 limit
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(sanitized);

    return { email: sanitized, isValid };
  }

  /**
   * Sanitize currency code
   */
  static sanitizeCurrency(input: string): string {
    if (!input || typeof input !== 'string') {
      return 'GBP';
    }

    const sanitized = this.sanitizeText(input).toUpperCase();
    const validCurrencies = ['GBP', 'EUR', 'USD'];
    
    return validCurrencies.includes(sanitized) ? sanitized : 'GBP';
  }

  /**
   * Sanitize boolean input
   */
  static sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }
    
    if (typeof input === 'string') {
      return ['true', '1', 'yes', 'on'].includes(input.toLowerCase());
    }
    
    if (typeof input === 'number') {
      return input !== 0;
    }
    
    return false;
  }

  /**
   * Sanitize quote form data
   */
  static sanitizeQuoteData(data: any): SanitizationResult<any> {
    const warnings: string[] = [];
    let sanitized = false;

    const result = {
      enquiryId: this.sanitizeText(data.enquiryId, 24),
      leadName: this.sanitizeText(data.leadName, 100),
      hotelName: this.sanitizeText(data.hotelName, 200),
      whatsIncluded: this.sanitizeRichText(data.whatsIncluded, 2000),
      activitiesIncluded: this.sanitizeRichText(data.activitiesIncluded, 1000),
      internalNotes: this.sanitizeText(data.internalNotes, 1000),
      currency: this.sanitizeCurrency(data.currency),
      isSuperPackage: this.sanitizeBoolean(data.isSuperPackage),
      transferIncluded: this.sanitizeBoolean(data.transferIncluded),
    };

    // Sanitize numeric fields
    const numberOfPeople = this.sanitizeNumber(data.numberOfPeople, 1, 100);
    const numberOfRooms = this.sanitizeNumber(data.numberOfRooms, 1, 50);
    const numberOfNights = this.sanitizeNumber(data.numberOfNights, 1, 30);
    const totalPrice = this.sanitizeNumber(data.totalPrice, 0, 1000000);

    result.numberOfPeople = numberOfPeople.value;
    result.numberOfRooms = numberOfRooms.value;
    result.numberOfNights = numberOfNights.value;
    result.totalPrice = totalPrice.value;

    if (!numberOfPeople.isValid) {
      warnings.push('Invalid number of people - using default value');
      sanitized = true;
    }
    if (!numberOfRooms.isValid) {
      warnings.push('Invalid number of rooms - using default value');
      sanitized = true;
    }
    if (!numberOfNights.isValid) {
      warnings.push('Invalid number of nights - using default value');
      sanitized = true;
    }
    if (!totalPrice.isValid) {
      warnings.push('Invalid total price - using default value');
      sanitized = true;
    }

    // Sanitize date
    const arrivalDate = this.sanitizeDate(data.arrivalDate);
    if (arrivalDate.isValid && arrivalDate.date) {
      result.arrivalDate = arrivalDate.date;
    } else {
      warnings.push('Invalid arrival date');
      result.arrivalDate = new Date();
      sanitized = true;
    }

    // Check for potential data modifications
    if (data.leadName !== result.leadName) {
      warnings.push('Lead name was sanitized');
      sanitized = true;
    }
    if (data.hotelName !== result.hotelName) {
      warnings.push('Hotel name was sanitized');
      sanitized = true;
    }
    if (data.whatsIncluded !== result.whatsIncluded) {
      warnings.push('Inclusions text was sanitized');
      sanitized = true;
    }
    if (data.activitiesIncluded !== result.activitiesIncluded) {
      warnings.push('Activities text was sanitized');
      sanitized = true;
    }

    return {
      data: result,
      warnings,
      sanitized,
    };
  }

  /**
   * Validate sanitized data against business rules
   */
  static validateBusinessRules(data: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!data.leadName || data.leadName.trim().length === 0) {
      errors.push('Lead name is required');
    }
    if (!data.hotelName || data.hotelName.trim().length === 0) {
      errors.push('Hotel name is required');
    }
    if (!data.whatsIncluded || data.whatsIncluded.trim().length === 0) {
      errors.push('Inclusions list is required');
    }

    // Business logic validation
    if (data.numberOfRooms > data.numberOfPeople) {
      warnings.push('Number of rooms exceeds number of people');
    }
    if (data.numberOfNights > 21) {
      warnings.push('Very long stay - please verify');
    }
    if (data.totalPrice === 0) {
      warnings.push('Quote has zero price');
    }
    if (data.totalPrice > 50000) {
      warnings.push('Very high price - please verify');
    }

    // Date validation
    const arrivalDate = new Date(data.arrivalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (arrivalDate <= today) {
      errors.push('Arrival date must be in the future');
    }

    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
    
    if (arrivalDate > maxFutureDate) {
      warnings.push('Arrival date is very far in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Comprehensive quote data sanitization and validation
   */
  static processQuoteData(data: any): {
    data: any;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    wasSanitized: boolean;
  } {
    // First sanitize the data
    const sanitizationResult = this.sanitizeQuoteData(data);
    
    // Then validate business rules
    const validationResult = this.validateBusinessRules(sanitizationResult.data);
    
    return {
      data: sanitizationResult.data,
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: [...sanitizationResult.warnings, ...validationResult.warnings],
      wasSanitized: sanitizationResult.sanitized,
    };
  }

  /**
   * Sanitize search/filter parameters
   */
  static sanitizeSearchParams(params: any): {
    search?: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
    enquiryId?: string;
    dateFrom?: string;
    dateTo?: string;
    minPrice?: number;
    maxPrice?: number;
    emailStatus?: string;
    bookingInterest?: boolean;
    isSuperPackage?: boolean;
    createdBy?: string;
    format?: string;
  } {
    const result: any = {};

    if (params.search) {
      result.search = this.sanitizeText(params.search, 100);
    }

    if (params.q) {
      result.q = this.sanitizeText(params.q, 100);
    }

    if (params.status) {
      const validStatuses = ['draft', 'sent', 'updated', 'all'];
      const sanitizedStatus = this.sanitizeText(params.status);
      result.status = validStatuses.includes(sanitizedStatus) ? sanitizedStatus : 'all';
    }

    if (params.page) {
      const page = this.sanitizeNumber(params.page, 1, 1000);
      result.page = page.isValid ? page.value : 1;
    }

    if (params.limit) {
      const limit = this.sanitizeNumber(params.limit, 1, 100);
      result.limit = limit.isValid ? limit.value : 10;
    }

    if (params.enquiryId) {
      result.enquiryId = this.sanitizeText(params.enquiryId, 24);
    }

    if (params.dateFrom) {
      const dateResult = this.sanitizeDate(params.dateFrom);
      if (dateResult.isValid && dateResult.date) {
        result.dateFrom = dateResult.date.toISOString().split('T')[0];
      }
    }

    if (params.dateTo) {
      const dateResult = this.sanitizeDate(params.dateTo);
      if (dateResult.isValid && dateResult.date) {
        result.dateTo = dateResult.date.toISOString().split('T')[0];
      }
    }

    if (params.minPrice) {
      const price = this.sanitizeNumber(params.minPrice, 0, 1000000);
      if (price.isValid) {
        result.minPrice = price.value;
      }
    }

    if (params.maxPrice) {
      const price = this.sanitizeNumber(params.maxPrice, 0, 1000000);
      if (price.isValid) {
        result.maxPrice = price.value;
      }
    }

    if (params.emailStatus) {
      const validEmailStatuses = ['pending', 'delivered', 'failed', 'not_sent'];
      const sanitizedEmailStatus = this.sanitizeText(params.emailStatus);
      if (validEmailStatuses.includes(sanitizedEmailStatus)) {
        result.emailStatus = sanitizedEmailStatus;
      }
    }

    if (params.bookingInterest !== undefined) {
      result.bookingInterest = this.sanitizeBoolean(params.bookingInterest);
    }

    if (params.isSuperPackage !== undefined) {
      result.isSuperPackage = this.sanitizeBoolean(params.isSuperPackage);
    }

    if (params.createdBy) {
      result.createdBy = this.sanitizeText(params.createdBy, 24);
    }

    if (params.format) {
      const validFormats = ['csv', 'json'];
      const sanitizedFormat = this.sanitizeText(params.format).toLowerCase();
      result.format = validFormats.includes(sanitizedFormat) ? sanitizedFormat : 'csv';
    }

    return result;
  }

  /**
   * Log sanitization events for security monitoring
   */
  static logSanitizationEvent(
    userId: string,
    operation: string,
    warnings: string[],
    wasSanitized: boolean
  ): void {
    if (wasSanitized || warnings.length > 0) {
      console.warn('Data sanitization event:', {
        userId,
        operation,
        warnings,
        wasSanitized,
        timestamp: new Date().toISOString(),
      });
    }
  }
}