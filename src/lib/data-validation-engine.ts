/**
 * Validation error severity levels
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Validation error with location and context
 */
export interface ValidationError {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  field?: string;
  row?: number;
  column?: string;
  value?: any;
  expectedType?: string;
  suggestion?: string;
  context?: Record<string, any>;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  field?: string;
  severity: ValidationSeverity;
  validate: (value: any, context?: ValidationContext) => ValidationResult;
}

/**
 * Validation context with additional data
 */
export interface ValidationContext {
  row?: number;
  column?: string;
  allData?: any[][];
  headers?: string[];
  fieldName?: string;
  relatedFields?: Record<string, any>;
}

/**
 * Result of a single validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  isValid: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: number;
  };
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  fieldSummary: Record<string, {
    validCount: number;
    errorCount: number;
    warningCount: number;
    commonErrors: string[];
  }>;
  suggestions: string[];
}

/**
 * Data Validation Engine - Validates imported data against business rules
 */
export class DataValidationEngine {
  private rules: ValidationRule[] = [];
  private customValidators: Map<string, (value: any, context?: ValidationContext) => boolean> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Add a custom validator function
   */
  addCustomValidator(name: string, validator: (value: any, context?: ValidationContext) => boolean): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate a complete dataset
   */
  validateData(data: any[][], headers: string[], fieldMappings?: Record<string, string>): ValidationReport {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];
    const fieldSummary: Record<string, any> = {};

    // Initialize field summary
    headers.forEach(header => {
      fieldSummary[header] = {
        validCount: 0,
        errorCount: 0,
        warningCount: 0,
        commonErrors: []
      };
    });

    let validRows = 0;
    let errorRows = 0;
    let warningRows = 0;

    // Validate each row
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      let rowHasErrors = false;
      let rowHasWarnings = false;

      // Validate each field in the row
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];
        const value = row[colIndex];
        const fieldName = fieldMappings?.[header] || header;

        const context: ValidationContext = {
          row: rowIndex,
          column: header,
          allData: data,
          headers,
          fieldName,
          relatedFields: this.getRelatedFields(row, headers, colIndex)
        };

        const fieldResult = this.validateField(fieldName, value, context);

        // Categorize results
        fieldResult.errors.forEach(error => {
          errors.push(error);
          fieldSummary[header].errorCount++;
          rowHasErrors = true;
        });

        fieldResult.warnings.forEach(warning => {
          warnings.push(warning);
          fieldSummary[header].warningCount++;
          rowHasWarnings = true;
        });

        fieldResult.info.forEach(infoItem => {
          info.push(infoItem);
        });

        if (fieldResult.isValid) {
          fieldSummary[header].validCount++;
        }
      }

      // Update row counters
      if (rowHasErrors) {
        errorRows++;
      } else if (rowHasWarnings) {
        warningRows++;
      } else {
        validRows++;
      }
    }

    // Generate common errors for each field
    Object.keys(fieldSummary).forEach(field => {
      const fieldErrors = errors.filter(e => e.column === field);
      const errorCounts = new Map<string, number>();
      
      fieldErrors.forEach(error => {
        const count = errorCounts.get(error.code) || 0;
        errorCounts.set(error.code, count + 1);
      });

      fieldSummary[field].commonErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([code]) => code);
    });

    // Generate suggestions
    const suggestions = this.generateSuggestions(errors, warnings, fieldSummary);

    return {
      isValid: errors.filter(e => e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL).length === 0,
      summary: {
        totalRows: data.length,
        validRows,
        errorRows,
        warningRows,
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        criticalErrors: errors.filter(e => e.severity === ValidationSeverity.CRITICAL).length
      },
      errors,
      warnings,
      info,
      fieldSummary,
      suggestions
    };
  }

  /**
   * Validate a single field value
   */
  validateField(fieldName: string, value: any, context?: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // Find applicable rules for this field
    const applicableRules = this.rules.filter(rule => 
      !rule.field || rule.field === fieldName || rule.field === '*'
    );

    // Apply each rule
    for (const rule of applicableRules) {
      try {
        const result = rule.validate(value, context);
        
        result.errors.forEach(error => errors.push(error));
        result.warnings.forEach(warning => warnings.push(warning));
        result.info.forEach(infoItem => info.push(infoItem));
      } catch (error) {
        // Rule execution failed
        errors.push({
          id: this.generateErrorId(),
          severity: ValidationSeverity.ERROR,
          code: 'RULE_EXECUTION_FAILED',
          message: `Validation rule "${rule.name}" failed to execute`,
          field: fieldName,
          row: context?.row,
          column: context?.column,
          value,
          context: { ruleId: rule.id, error: String(error) }
        });
      }
    }

    return {
      isValid: errors.filter(e => e.severity === ValidationSeverity.ERROR || e.severity === ValidationSeverity.CRITICAL).length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Required field validation
    this.addRule({
      id: 'required-field',
      name: 'Required Field',
      description: 'Validates that required fields are not empty',
      severity: ValidationSeverity.ERROR,
      validate: (value: any, context?: ValidationContext) => {
        const isEmpty = value === null || value === undefined || value === '';
        
        if (isEmpty && this.isRequiredField(context?.fieldName)) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'REQUIRED_FIELD_EMPTY',
              message: `Required field "${context?.fieldName}" cannot be empty`,
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              suggestion: 'Provide a valid value for this required field'
            }],
            warnings: [],
            info: []
          };
        }

        return { isValid: true, errors: [], warnings: [], info: [] };
      }
    });

    // Price validation
    this.addRule({
      id: 'price-validation',
      name: 'Price Validation',
      description: 'Validates price values are positive numbers',
      field: 'price',
      severity: ValidationSeverity.ERROR,
      validate: (value: any, context?: ValidationContext) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        if (value === null || value === undefined || value === '') {
          return { isValid: true, errors: [], warnings: [], info: [] };
        }

        // Convert to number if it's a string
        let numValue = value;
        if (typeof value === 'string') {
          // Remove currency symbols and commas
          const cleaned = value.replace(/[£$€,\s]/g, '');
          numValue = parseFloat(cleaned);
        }

        if (isNaN(numValue)) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.ERROR,
            code: 'INVALID_PRICE_FORMAT',
            message: 'Price must be a valid number',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            expectedType: 'number',
            suggestion: 'Enter a valid price (e.g., 150.50, €200, $250)'
          });
        } else if (numValue < 0) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.ERROR,
            code: 'NEGATIVE_PRICE',
            message: 'Price cannot be negative',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            suggestion: 'Enter a positive price value'
          });
        } else if (numValue === 0) {
          warnings.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'ZERO_PRICE',
            message: 'Price is zero - please verify this is correct',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            suggestion: 'Confirm if zero price is intentional'
          });
        } else if (numValue > 10000) {
          warnings.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'HIGH_PRICE',
            message: 'Price seems unusually high - please verify',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            suggestion: 'Double-check if this price is correct'
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info: []
        };
      }
    });

    // Month validation
    this.addRule({
      id: 'month-validation',
      name: 'Month Validation',
      description: 'Validates month names and formats',
      field: 'month',
      severity: ValidationSeverity.ERROR,
      validate: (value: any, context?: ValidationContext) => {
        if (!value) {
          return { isValid: true, errors: [], warnings: [], info: [] };
        }

        const monthPatterns = [
          /^(january|jan)$/i, /^(february|feb)$/i, /^(march|mar)$/i,
          /^(april|apr)$/i, /^may$/i, /^(june|jun)$/i,
          /^(july|jul)$/i, /^(august|aug)$/i, /^(september|sep|sept)$/i,
          /^(october|oct)$/i, /^(november|nov)$/i, /^(december|dec)$/i,
          /easter/i, /peak\s*season/i, /off\s*season/i, /high\s*season/i, /low\s*season/i
        ];

        const isValidMonth = monthPatterns.some(pattern => pattern.test(String(value).trim()));

        if (!isValidMonth) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'INVALID_MONTH',
              message: 'Invalid month format',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              suggestion: 'Use valid month names (January, Feb, Mar) or special periods (Easter, Peak Season)'
            }],
            warnings: [],
            info: []
          };
        }

        return { isValid: true, errors: [], warnings: [], info: [] };
      }
    });

    // Nights validation
    this.addRule({
      id: 'nights-validation',
      name: 'Nights Validation',
      description: 'Validates number of nights is reasonable',
      field: 'nights',
      severity: ValidationSeverity.WARNING,
      validate: (value: any, context?: ValidationContext) => {
        if (!value) {
          return { isValid: true, errors: [], warnings: [], info: [] };
        }

        const numValue = Number(value);
        const warnings: ValidationError[] = [];

        if (isNaN(numValue)) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'INVALID_NIGHTS_FORMAT',
              message: 'Number of nights must be a valid number',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              expectedType: 'number',
              suggestion: 'Enter a valid number (e.g., 2, 3, 7)'
            }],
            warnings: [],
            info: []
          };
        }

        if (numValue < 1) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'INVALID_NIGHTS_RANGE',
              message: 'Number of nights must be at least 1',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              suggestion: 'Enter a positive number of nights'
            }],
            warnings: [],
            info: []
          };
        }

        if (numValue > 30) {
          warnings.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'HIGH_NIGHTS_COUNT',
            message: 'Number of nights seems unusually high',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            suggestion: 'Verify if this many nights is correct'
          });
        }

        return {
          isValid: true,
          errors: [],
          warnings,
          info: []
        };
      }
    });

    // Pax validation
    this.addRule({
      id: 'pax-validation',
      name: 'Pax Validation',
      description: 'Validates number of people is reasonable',
      field: 'pax',
      severity: ValidationSeverity.WARNING,
      validate: (value: any, context?: ValidationContext) => {
        if (!value) {
          return { isValid: true, errors: [], warnings: [], info: [] };
        }

        const numValue = Number(value);
        const warnings: ValidationError[] = [];

        if (isNaN(numValue)) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'INVALID_PAX_FORMAT',
              message: 'Number of people must be a valid number',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              expectedType: 'number',
              suggestion: 'Enter a valid number (e.g., 2, 4, 6)'
            }],
            warnings: [],
            info: []
          };
        }

        if (numValue < 1) {
          return {
            isValid: false,
            errors: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.ERROR,
              code: 'INVALID_PAX_RANGE',
              message: 'Number of people must be at least 1',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              suggestion: 'Enter a positive number of people'
            }],
            warnings: [],
            info: []
          };
        }

        if (numValue > 20) {
          warnings.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'HIGH_PAX_COUNT',
            message: 'Number of people seems unusually high',
            field: context?.fieldName,
            row: context?.row,
            column: context?.column,
            value,
            suggestion: 'Verify if this many people is correct'
          });
        }

        return {
          isValid: true,
          errors: [],
          warnings,
          info: []
        };
      }
    });

    // Accommodation type validation
    this.addRule({
      id: 'accommodation-validation',
      name: 'Accommodation Type Validation',
      description: 'Validates accommodation types are recognized',
      field: 'accommodationType',
      severity: ValidationSeverity.WARNING,
      validate: (value: any, context?: ValidationContext) => {
        if (!value) {
          return { isValid: true, errors: [], warnings: [], info: [] };
        }

        const validTypes = [
          'hotel', 'apartment', 'villa', 'resort', 'self-catering',
          'b&b', 'bed and breakfast', 'guesthouse', 'lodge', 'cabin',
          'hostel', 'studio', 'suite', 'room'
        ];

        const valueStr = String(value).toLowerCase();
        const isValid = validTypes.some(type => valueStr.includes(type));

        if (!isValid) {
          return {
            isValid: true, // Warning only, not an error
            errors: [],
            warnings: [{
              id: this.generateErrorId(),
              severity: ValidationSeverity.WARNING,
              code: 'UNRECOGNIZED_ACCOMMODATION_TYPE',
              message: 'Accommodation type not recognized',
              field: context?.fieldName,
              row: context?.row,
              column: context?.column,
              value,
              suggestion: 'Use standard accommodation types (Hotel, Apartment, Villa, Resort, etc.)'
            }],
            info: []
          };
        }

        return { isValid: true, errors: [], warnings: [], info: [] };
      }
    });
  }

  /**
   * Check if a field is required
   */
  private isRequiredField(fieldName?: string): boolean {
    const requiredFields = ['month', 'price'];
    return requiredFields.includes(fieldName || '');
  }

  /**
   * Get related fields from the same row
   */
  private getRelatedFields(row: any[], headers: string[], currentIndex: number): Record<string, any> {
    const related: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      if (index !== currentIndex) {
        related[header] = row[index];
      }
    });

    return related;
  }

  /**
   * Generate suggestions based on validation results
   */
  private generateSuggestions(
    errors: ValidationError[],
    warnings: ValidationError[],
    fieldSummary: Record<string, any>
  ): string[] {
    const suggestions: string[] = [];

    // Critical errors
    const criticalErrors = errors.filter(e => e.severity === ValidationSeverity.CRITICAL);
    if (criticalErrors.length > 0) {
      suggestions.push(`Fix ${criticalErrors.length} critical errors before proceeding`);
    }

    // High error rate fields
    Object.entries(fieldSummary).forEach(([field, summary]) => {
      const errorRate = summary.errorCount / (summary.validCount + summary.errorCount);
      if (errorRate > 0.5 && summary.errorCount > 5) {
        suggestions.push(`Field "${field}" has a high error rate (${Math.round(errorRate * 100)}%) - review data format`);
      }
    });

    // Common error patterns
    const errorCodes = new Map<string, number>();
    errors.forEach(error => {
      const count = errorCodes.get(error.code) || 0;
      errorCodes.set(error.code, count + 1);
    });

    const commonErrors = Array.from(errorCodes.entries())
      .filter(([_, count]) => count > 5)
      .sort((a, b) => b[1] - a[1]);

    commonErrors.forEach(([code, count]) => {
      switch (code) {
        case 'INVALID_PRICE_FORMAT':
          suggestions.push(`${count} price format errors - ensure prices are numbers with optional currency symbols`);
          break;
        case 'REQUIRED_FIELD_EMPTY':
          suggestions.push(`${count} required fields are empty - fill in all mandatory data`);
          break;
        case 'INVALID_MONTH':
          suggestions.push(`${count} invalid month formats - use standard month names or abbreviations`);
          break;
      }
    });

    // Warning suggestions
    if (warnings.length > errors.length * 2) {
      suggestions.push('Many warnings detected - review data quality to improve accuracy');
    }

    return suggestions;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}