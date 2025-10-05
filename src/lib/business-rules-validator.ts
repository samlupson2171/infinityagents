import { ValidationError, ValidationSeverity, ValidationContext } from './data-validation-engine';

/**
 * Business rule definition
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'pricing' | 'completeness' | 'consistency' | 'quality';
  severity: ValidationSeverity;
  validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => ValidationError[];
}

/**
 * Business rule validation context
 */
export interface BusinessRuleContext {
  fieldMappings?: Record<string, string>;
  metadata?: {
    resortName?: string;
    currency?: string;
    season?: string;
  };
  existingOffers?: any[];
}

/**
 * Business Rules Validator - Validates data against business logic
 */
export class BusinessRulesValidator {
  private rules: BusinessRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Add a business rule
   */
  addRule(rule: BusinessRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a business rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Validate data against all business rules
   */
  validateBusinessRules(
    data: any[][],
    headers: string[],
    context?: BusinessRuleContext
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.rules) {
      try {
        const ruleErrors = rule.validate(data, headers, context);
        errors.push(...ruleErrors);
      } catch (error) {
        errors.push({
          id: this.generateErrorId(),
          severity: ValidationSeverity.ERROR,
          code: 'BUSINESS_RULE_EXECUTION_FAILED',
          message: `Business rule "${rule.name}" failed to execute: ${error}`,
          context: { ruleId: rule.id, error: String(error) }
        });
      }
    }

    return errors;
  }

  /**
   * Initialize default business rules
   */
  private initializeDefaultRules(): void {
    // Pricing completeness rule
    this.addRule({
      id: 'pricing-completeness',
      name: 'Pricing Completeness',
      description: 'Ensures pricing data is complete across all combinations',
      category: 'completeness',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        const priceColumnIndex = this.findColumnIndex(headers, 'price', context?.fieldMappings);
        const monthColumnIndex = this.findColumnIndex(headers, 'month', context?.fieldMappings);

        if (priceColumnIndex === -1 || monthColumnIndex === -1) {
          return errors; // Can't validate without price and month columns
        }

        // Check for missing prices in month/price combinations
        const monthPriceCombinations = new Map<string, number>();
        let totalCombinations = 0;

        data.forEach((row, rowIndex) => {
          const month = row[monthColumnIndex];
          const price = row[priceColumnIndex];

          if (month) {
            totalCombinations++;
            if (price && price !== '' && price !== null && price !== undefined) {
              monthPriceCombinations.set(String(month), (monthPriceCombinations.get(String(month)) || 0) + 1);
            }
          }
        });

        // Calculate completeness percentage
        const completenessRate = monthPriceCombinations.size / new Set(data.map(row => row[monthColumnIndex]).filter(Boolean)).size;

        if (completenessRate < 0.8) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'INCOMPLETE_PRICING_DATA',
            message: `Pricing data is only ${Math.round(completenessRate * 100)}% complete`,
            suggestion: 'Ensure all month/accommodation combinations have pricing data'
          });
        }

        return errors;
      }
    });

    // Price consistency rule
    this.addRule({
      id: 'price-consistency',
      name: 'Price Consistency',
      description: 'Validates price consistency and reasonableness',
      category: 'pricing',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        const priceColumnIndex = this.findColumnIndex(headers, 'price', context?.fieldMappings);

        if (priceColumnIndex === -1) return errors;

        const prices: number[] = [];
        data.forEach((row, rowIndex) => {
          const priceValue = row[priceColumnIndex];
          if (priceValue) {
            const numPrice = this.parsePrice(priceValue);
            if (!isNaN(numPrice) && numPrice > 0) {
              prices.push(numPrice);
            }
          }
        });

        if (prices.length < 2) return errors;

        // Calculate price statistics
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
        const min = sortedPrices[0];
        const max = sortedPrices[sortedPrices.length - 1];
        const range = max - min;

        // Check for extreme price variations
        if (range > median * 5) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'EXTREME_PRICE_VARIATION',
            message: `Price range (${min} - ${max}) shows extreme variation`,
            suggestion: 'Review prices for accuracy - large variations may indicate data entry errors'
          });
        }

        // Check for potential outliers
        const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
        const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const outliers = prices.filter(price => price < lowerBound || price > upperBound);
        if (outliers.length > 0) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.INFO,
            code: 'PRICE_OUTLIERS_DETECTED',
            message: `${outliers.length} potential price outliers detected`,
            suggestion: 'Review outlier prices to ensure they are correct',
            context: { outliers: outliers.slice(0, 5) } // Show first 5 outliers
          });
        }

        return errors;
      }
    });

    // Resort name consistency rule
    this.addRule({
      id: 'resort-name-consistency',
      name: 'Resort Name Consistency',
      description: 'Ensures resort names are consistent within the file',
      category: 'consistency',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        
        // If resort name is provided in metadata, check consistency
        if (context?.metadata?.resortName) {
          const resortColumnIndex = this.findColumnIndex(headers, 'resortName', context?.fieldMappings);
          
          if (resortColumnIndex !== -1) {
            const inconsistentRows: number[] = [];
            
            data.forEach((row, rowIndex) => {
              const rowResortName = row[resortColumnIndex];
              if (rowResortName && 
                  String(rowResortName).toLowerCase().trim() !== 
                  context.metadata!.resortName!.toLowerCase().trim()) {
                inconsistentRows.push(rowIndex);
              }
            });

            if (inconsistentRows.length > 0) {
              errors.push({
                id: this.generateErrorId(),
                severity: ValidationSeverity.WARNING,
                code: 'INCONSISTENT_RESORT_NAME',
                message: `Resort name inconsistency found in ${inconsistentRows.length} rows`,
                suggestion: 'Ensure all rows reference the same resort',
                context: { inconsistentRows: inconsistentRows.slice(0, 10) }
              });
            }
          }
        }

        return errors;
      }
    });

    // Inclusions quality rule
    this.addRule({
      id: 'inclusions-quality',
      name: 'Inclusions Quality',
      description: 'Validates inclusions are meaningful and not placeholder text',
      category: 'quality',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        const inclusionsColumnIndex = this.findColumnIndex(headers, 'inclusions', context?.fieldMappings);

        if (inclusionsColumnIndex === -1) return errors;

        const placeholderPatterns = [
          /^(tbd|tba|pending|coming soon)$/i,
          /^(n\/a|na|none|nil)$/i,
          /^[x\-\.]+$/,
          /^(item|inclusion|feature)\s*\d*$/i,
          /^example/i
        ];

        let placeholderCount = 0;
        let emptyCount = 0;
        let shortCount = 0;

        data.forEach((row, rowIndex) => {
          const inclusions = row[inclusionsColumnIndex];
          
          if (!inclusions || inclusions === '') {
            emptyCount++;
            return;
          }

          const inclusionsStr = String(inclusions).trim();
          
          // Check for placeholder text
          if (placeholderPatterns.some(pattern => pattern.test(inclusionsStr))) {
            placeholderCount++;
            return;
          }

          // Check for very short inclusions (likely incomplete)
          if (inclusionsStr.length < 10) {
            shortCount++;
          }
        });

        const totalRows = data.length;
        
        if (placeholderCount > 0) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'PLACEHOLDER_INCLUSIONS',
            message: `${placeholderCount} rows contain placeholder inclusion text`,
            suggestion: 'Replace placeholder text with actual inclusion details'
          });
        }

        if (emptyCount > totalRows * 0.5) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'MISSING_INCLUSIONS',
            message: `${emptyCount} rows are missing inclusion information`,
            suggestion: 'Add inclusion details to provide complete package information'
          });
        }

        if (shortCount > totalRows * 0.3) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.INFO,
            code: 'SHORT_INCLUSIONS',
            message: `${shortCount} rows have very brief inclusion descriptions`,
            suggestion: 'Consider expanding inclusion descriptions for better clarity'
          });
        }

        return errors;
      }
    });

    // Date range validation rule
    this.addRule({
      id: 'date-range-validation',
      name: 'Date Range Validation',
      description: 'Validates date ranges and seasonal consistency',
      category: 'consistency',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        const monthColumnIndex = this.findColumnIndex(headers, 'month', context?.fieldMappings);

        if (monthColumnIndex === -1) return errors;

        const months = new Set<string>();
        const specialPeriods = new Set<string>();

        data.forEach(row => {
          const month = row[monthColumnIndex];
          if (month) {
            const monthStr = String(month).toLowerCase().trim();
            
            // Check if it's a special period
            if (/easter|peak|high|low|season/i.test(monthStr)) {
              specialPeriods.add(monthStr);
            } else {
              months.add(monthStr);
            }
          }
        });

        // Check for incomplete year coverage
        const standardMonths = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];

        const monthsArray = Array.from(months);
        const recognizedMonths = monthsArray.filter(month => 
          standardMonths.some(stdMonth => 
            stdMonth.includes(month) || month.includes(stdMonth.substring(0, 3))
          )
        );

        if (recognizedMonths.length > 0 && recognizedMonths.length < 6) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.INFO,
            code: 'LIMITED_MONTH_COVERAGE',
            message: `Only ${recognizedMonths.length} months covered in pricing data`,
            suggestion: 'Consider providing pricing for more months to give customers better options'
          });
        }

        // Check for mixed month formats
        const hasFullNames = monthsArray.some(month => month.length > 4);
        const hasAbbreviations = monthsArray.some(month => month.length <= 4 && /^[a-z]{3}$/i.test(month));

        if (hasFullNames && hasAbbreviations) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.INFO,
            code: 'MIXED_MONTH_FORMATS',
            message: 'Mixed month formats detected (full names and abbreviations)',
            suggestion: 'Use consistent month format throughout the file'
          });
        }

        return errors;
      }
    });

    // Duplicate data rule
    this.addRule({
      id: 'duplicate-data-detection',
      name: 'Duplicate Data Detection',
      description: 'Detects potential duplicate rows or data',
      category: 'quality',
      severity: ValidationSeverity.WARNING,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        
        // Create row signatures for duplicate detection
        const rowSignatures = new Map<string, number[]>();
        
        data.forEach((row, rowIndex) => {
          // Create a signature from key fields
          const signature = row.map(cell => String(cell || '').toLowerCase().trim()).join('|');
          
          if (rowSignatures.has(signature)) {
            rowSignatures.get(signature)!.push(rowIndex);
          } else {
            rowSignatures.set(signature, [rowIndex]);
          }
        });

        // Find duplicates
        const duplicateGroups = Array.from(rowSignatures.entries())
          .filter(([_, rows]) => rows.length > 1);

        if (duplicateGroups.length > 0) {
          const totalDuplicates = duplicateGroups.reduce((sum, [_, rows]) => sum + rows.length - 1, 0);
          
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.WARNING,
            code: 'DUPLICATE_ROWS_DETECTED',
            message: `${totalDuplicates} duplicate rows detected`,
            suggestion: 'Review and remove duplicate entries to avoid data inconsistency',
            context: { 
              duplicateGroups: duplicateGroups.slice(0, 5).map(([_, rows]) => rows)
            }
          });
        }

        return errors;
      }
    });

    // Currency consistency rule
    this.addRule({
      id: 'currency-consistency',
      name: 'Currency Consistency',
      description: 'Ensures currency is consistent throughout the data',
      category: 'consistency',
      severity: ValidationSeverity.ERROR,
      validate: (data: any[][], headers: string[], context?: BusinessRuleContext) => {
        const errors: ValidationError[] = [];
        const priceColumnIndex = this.findColumnIndex(headers, 'price', context?.fieldMappings);
        const currencyColumnIndex = this.findColumnIndex(headers, 'currency', context?.fieldMappings);

        if (priceColumnIndex === -1) return errors;

        const detectedCurrencies = new Set<string>();
        
        data.forEach((row, rowIndex) => {
          const price = row[priceColumnIndex];
          const currency = row[currencyColumnIndex];

          // Extract currency from price if no separate currency column
          if (price && typeof price === 'string') {
            const currencyMatch = price.match(/[£$€]/);
            if (currencyMatch) {
              detectedCurrencies.add(currencyMatch[0]);
            }
          }

          // Use explicit currency column if available
          if (currency) {
            detectedCurrencies.add(String(currency).toUpperCase());
          }
        });

        // Check for mixed currencies
        if (detectedCurrencies.size > 1) {
          errors.push({
            id: this.generateErrorId(),
            severity: ValidationSeverity.ERROR,
            code: 'MIXED_CURRENCIES',
            message: `Multiple currencies detected: ${Array.from(detectedCurrencies).join(', ')}`,
            suggestion: 'Use consistent currency throughout the pricing data',
            context: { currencies: Array.from(detectedCurrencies) }
          });
        }

        return errors;
      }
    });
  }

  /**
   * Find column index by field name
   */
  private findColumnIndex(headers: string[], fieldName: string, fieldMappings?: Record<string, string>): number {
    // First try to find by mapped field name
    if (fieldMappings) {
      const mappedHeader = Object.keys(fieldMappings).find(header => 
        fieldMappings[header] === fieldName
      );
      if (mappedHeader) {
        return headers.indexOf(mappedHeader);
      }
    }

    // Then try to find by direct field name match
    return headers.findIndex(header => 
      header.toLowerCase() === fieldName.toLowerCase()
    );
  }

  /**
   * Parse price from string or number
   */
  private parsePrice(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[£$€,\s]/g, '');
      return parseFloat(cleaned);
    }
    return NaN;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}