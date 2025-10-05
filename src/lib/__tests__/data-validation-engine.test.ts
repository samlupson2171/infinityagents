import { describe, it, expect, beforeEach } from 'vitest';
import { DataValidationEngine, ValidationSeverity } from '../data-validation-engine';

describe('DataValidationEngine', () => {
  let engine: DataValidationEngine;

  beforeEach(() => {
    engine = new DataValidationEngine();
  });

  describe('Price Validation', () => {
    it('should validate positive prices', () => {
      const result = engine.validateField('price', 150.50);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle currency symbols', () => {
      const testPrices = ['€150', '$200', '£250.50'];
      
      testPrices.forEach(price => {
        const result = engine.validateField('price', price);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject negative prices', () => {
      const result = engine.validateField('price', -50);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NEGATIVE_PRICE');
    });

    it('should reject invalid price formats', () => {
      const result = engine.validateField('price', 'not a price');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_PRICE_FORMAT');
    });

    it('should warn about zero prices', () => {
      const result = engine.validateField('price', 0);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('ZERO_PRICE');
    });

    it('should warn about unusually high prices', () => {
      const result = engine.validateField('price', 15000);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('HIGH_PRICE');
    });
  });

  describe('Month Validation', () => {
    it('should validate full month names', () => {
      const months = ['January', 'February', 'March', 'December'];
      
      months.forEach(month => {
        const result = engine.validateField('month', month);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate abbreviated month names', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Dec'];
      
      months.forEach(month => {
        const result = engine.validateField('month', month);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate special periods', () => {
      const periods = ['Easter', 'Peak Season', 'Off Season', 'High Season'];
      
      periods.forEach(period => {
        const result = engine.validateField('month', period);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid month formats', () => {
      const result = engine.validateField('month', 'Invalid Month');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_MONTH');
    });

    it('should be case insensitive', () => {
      const result = engine.validateField('month', 'january');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Nights Validation', () => {
    it('should validate reasonable night counts', () => {
      const nights = [1, 2, 3, 7, 14];
      
      nights.forEach(night => {
        const result = engine.validateField('nights', night);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject negative nights', () => {
      const result = engine.validateField('nights', -1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_NIGHTS_RANGE');
    });

    it('should reject zero nights', () => {
      const result = engine.validateField('nights', 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_NIGHTS_RANGE');
    });

    it('should warn about unusually high night counts', () => {
      const result = engine.validateField('nights', 45);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('HIGH_NIGHTS_COUNT');
    });

    it('should reject non-numeric values', () => {
      const result = engine.validateField('nights', 'not a number');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_NIGHTS_FORMAT');
    });
  });

  describe('Pax Validation', () => {
    it('should validate reasonable pax counts', () => {
      const paxCounts = [1, 2, 4, 6, 8];
      
      paxCounts.forEach(pax => {
        const result = engine.validateField('pax', pax);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject negative pax', () => {
      const result = engine.validateField('pax', -1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_PAX_RANGE');
    });

    it('should reject zero pax', () => {
      const result = engine.validateField('pax', 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_PAX_RANGE');
    });

    it('should warn about unusually high pax counts', () => {
      const result = engine.validateField('pax', 25);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('HIGH_PAX_COUNT');
    });

    it('should reject non-numeric values', () => {
      const result = engine.validateField('pax', 'not a number');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_PAX_FORMAT');
    });
  });

  describe('Accommodation Type Validation', () => {
    it('should validate standard accommodation types', () => {
      const types = ['Hotel', 'Apartment', 'Villa', 'Resort', 'Self-Catering'];
      
      types.forEach(type => {
        const result = engine.validateField('accommodationType', type);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    it('should warn about unrecognized accommodation types', () => {
      const result = engine.validateField('accommodationType', 'Unknown Type');
      
      expect(result.isValid).toBe(true); // Warning only, not error
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('UNRECOGNIZED_ACCOMMODATION_TYPE');
    });

    it('should be case insensitive', () => {
      const result = engine.validateField('accommodationType', 'hotel');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Required Field Validation', () => {
    it('should validate required fields are not empty', () => {
      const result = engine.validateField('month', '', { fieldName: 'month' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_EMPTY');
    });

    it('should allow empty non-required fields', () => {
      const result = engine.validateField('description', '', { fieldName: 'description' });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null values for required fields', () => {
      const result = engine.validateField('price', null, { fieldName: 'price' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_EMPTY');
    });
  });

  describe('Complete Data Validation', () => {
    it('should validate complete dataset', () => {
      const headers = ['Month', 'Price', 'Nights', 'Pax'];
      const data = [
        ['January', '150', '3', '2'],
        ['February', '160', '4', '4'],
        ['March', '170', '2', '2']
      ];
      const fieldMappings = {
        'Month': 'month',
        'Price': 'price',
        'Nights': 'nights',
        'Pax': 'pax'
      };

      const report = engine.validateData(data, headers, fieldMappings);

      expect(report.isValid).toBe(true);
      expect(report.summary.totalRows).toBe(3);
      expect(report.summary.validRows).toBe(3);
      expect(report.summary.errorRows).toBe(0);
    });

    it('should identify rows with errors', () => {
      const headers = ['Month', 'Price'];
      const data = [
        ['January', '150'],
        ['Invalid Month', 'not a price'],
        ['March', '200']
      ];
      const fieldMappings = {
        'Month': 'month',
        'Price': 'price'
      };

      const report = engine.validateData(data, headers, fieldMappings);

      expect(report.isValid).toBe(false);
      expect(report.summary.totalRows).toBe(3);
      expect(report.summary.validRows).toBe(1);
      expect(report.summary.errorRows).toBe(1);
      expect(report.errors).toHaveLength(2); // Invalid month + invalid price
    });

    it('should generate field summaries', () => {
      const headers = ['Month', 'Price'];
      const data = [
        ['January', '150'],
        ['February', 'invalid'],
        ['March', '200']
      ];
      const fieldMappings = {
        'Month': 'month',
        'Price': 'price'
      };

      const report = engine.validateData(data, headers, fieldMappings);

      expect(report.fieldSummary['Month'].validCount).toBe(3);
      expect(report.fieldSummary['Month'].errorCount).toBe(0);
      expect(report.fieldSummary['Price'].validCount).toBe(2);
      expect(report.fieldSummary['Price'].errorCount).toBe(1);
    });

    it('should generate helpful suggestions', () => {
      const headers = ['Month', 'Price'];
      const data = [
        ['Invalid1', 'not a price'],
        ['Invalid2', 'also not a price'],
        ['Invalid3', 'still not a price'],
        ['Invalid4', 'definitely not a price'],
        ['Invalid5', 'nope'],
        ['Invalid6', 'no way']
      ];
      const fieldMappings = {
        'Month': 'month',
        'Price': 'price'
      };

      const report = engine.validateData(data, headers, fieldMappings);

      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.suggestions.some(s => s.includes('price format errors'))).toBe(true);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom validation rules', () => {
      engine.addRule({
        id: 'custom-test',
        name: 'Custom Test Rule',
        description: 'Test custom rule',
        field: 'testField',
        severity: ValidationSeverity.ERROR,
        validate: (value: any) => {
          if (value === 'invalid') {
            return {
              isValid: false,
              errors: [{
                id: 'test-error',
                severity: ValidationSeverity.ERROR,
                code: 'CUSTOM_ERROR',
                message: 'Custom validation failed'
              }],
              warnings: [],
              info: []
            };
          }
          return { isValid: true, errors: [], warnings: [], info: [] };
        }
      });

      const result = engine.validateField('testField', 'invalid');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CUSTOM_ERROR');
    });

    it('should allow removing validation rules', () => {
      engine.addRule({
        id: 'removable-rule',
        name: 'Removable Rule',
        description: 'Rule to be removed',
        severity: ValidationSeverity.ERROR,
        validate: () => ({ isValid: false, errors: [{ id: 'test', severity: ValidationSeverity.ERROR, code: 'TEST', message: 'Test' }], warnings: [], info: [] })
      });

      // Rule should exist
      let result = engine.validateField('anyField', 'anyValue');
      expect(result.errors.some(e => e.code === 'TEST')).toBe(true);

      // Remove rule
      engine.removeRule('removable-rule');

      // Rule should no longer exist
      result = engine.validateField('anyField', 'anyValue');
      expect(result.errors.some(e => e.code === 'TEST')).toBe(false);
    });
  });

  describe('Error Context', () => {
    it('should include row and column information in errors', () => {
      const context = {
        row: 5,
        column: 'Price',
        fieldName: 'price'
      };

      const result = engine.validateField('price', 'invalid', context);

      expect(result.errors[0].row).toBe(5);
      expect(result.errors[0].column).toBe('Price');
      expect(result.errors[0].field).toBe('price');
    });

    it('should handle rule execution failures gracefully', () => {
      engine.addRule({
        id: 'failing-rule',
        name: 'Failing Rule',
        description: 'Rule that throws an error',
        severity: ValidationSeverity.ERROR,
        validate: () => {
          throw new Error('Rule execution failed');
        }
      });

      const result = engine.validateField('anyField', 'anyValue');

      expect(result.errors.some(e => e.code === 'RULE_EXECUTION_FAILED')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      const report = engine.validateData([], [], {});

      expect(report.isValid).toBe(true);
      expect(report.summary.totalRows).toBe(0);
    });

    it('should handle null and undefined values', () => {
      const result1 = engine.validateField('price', null);
      const result2 = engine.validateField('price', undefined);

      // Should not crash, and should handle gracefully
      expect(result1.isValid).toBe(true); // null/undefined prices are allowed (not required)
      expect(result2.isValid).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = engine.validateField('description', '');
      expect(result.isValid).toBe(true); // Empty description is allowed
    });
  });
});