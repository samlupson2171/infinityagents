import { ExtractedPricingData } from './pricing-extractor';

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validator: (data: ExtractedPricingData[], context?: ValidationContext) => ValidationResult[];
}

export interface ValidationContext {
  currency: string;
  destination?: string;
  accommodationTypes: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  priceRanges?: {
    [accommodationType: string]: {
      min: number;
      max: number;
    };
  };
}

export interface ValidationResult {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedEntries: string[]; // Cell references or entry identifiers
  suggestion?: string;
  value?: any; // The problematic value
  expectedValue?: any; // What the value should be
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  symbolPosition: 'before' | 'after';
  supportedFormats: RegExp[];
}

export interface PriceValidationOptions {
  strictCurrencyValidation: boolean;
  allowZeroPrices: boolean;
  priceReasonablenessCheck: boolean;
  currencyConsistencyCheck: boolean;
  numberFormatValidation: boolean;
  customRules?: ValidationRule[];
  priceRanges?: {
    [accommodationType: string]: {
      min: number;
      max: number;
    };
  };
}

/**
 * Price and Currency Validator - Validates pricing data and currency formats
 */
export class PriceValidator {
  private options: PriceValidationOptions;
  private supportedCurrencies: Map<string, CurrencyInfo>;
  private validationRules: ValidationRule[];

  constructor(options: Partial<PriceValidationOptions> = {}) {
    this.options = {
      strictCurrencyValidation: true,
      allowZeroPrices: false,
      priceReasonablenessCheck: true,
      currencyConsistencyCheck: true,
      numberFormatValidation: true,
      ...options
    };

    this.supportedCurrencies = this.initializeSupportedCurrencies();
    this.validationRules = this.initializeValidationRules();
    
    // Add custom rules if provided
    if (this.options.customRules) {
      this.validationRules.push(...this.options.customRules);
    }
  }

  /**
   * Main validation method
   */
  validatePricing(data: ExtractedPricingData[], context?: ValidationContext): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Run all validation rules
    for (const rule of this.validationRules) {
      try {
        const ruleResults = rule.validator(data, context);
        results.push(...ruleResults);
      } catch (error) {
        results.push({
          rule: rule.name,
          severity: 'error',
          message: `Validation rule failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          affectedEntries: [],
          suggestion: 'Check the validation rule implementation'
        });
      }
    }

    return results;
  }

  /**
   * Detects and validates currency format from a string
   */
  detectAndValidateCurrency(value: string): {
    currency: string | null;
    isValid: boolean;
    detectedFormat: string | null;
    suggestions: string[];
  } {
    const result = {
      currency: null as string | null,
      isValid: false,
      detectedFormat: null as string | null,
      suggestions: [] as string[]
    };

    if (!value || typeof value !== 'string') {
      result.suggestions.push('Provide a valid string value');
      return result;
    }

    // Try to detect currency from the value
    for (const [code, info] of this.supportedCurrencies) {
      // Check for currency symbol
      if (value.includes(info.symbol)) {
        result.currency = code;
        result.detectedFormat = 'symbol';
        result.isValid = true;
        break;
      }

      // Check for currency code
      if (value.toUpperCase().includes(code)) {
        result.currency = code;
        result.detectedFormat = 'code';
        result.isValid = true;
        break;
      }

      // Check supported formats
      for (const format of info.supportedFormats) {
        if (format.test(value)) {
          result.currency = code;
          result.detectedFormat = 'pattern';
          result.isValid = true;
          break;
        }
      }

      if (result.isValid) break;
    }

    if (!result.isValid) {
      result.suggestions.push('Use a recognized currency symbol (£, $, €) or code (GBP, USD, EUR)');
      result.suggestions.push('Ensure currency information is clearly visible in the data');
    }

    return result;
  }

  /**
   * Validates number format (European vs US)
   */
  validateNumberFormat(value: string, expectedCurrency?: string): {
    isValid: boolean;
    parsedValue: number;
    detectedFormat: 'US' | 'European' | 'unknown';
    errors: string[];
  } {
    const result = {
      isValid: false,
      parsedValue: 0,
      detectedFormat: 'unknown' as 'US' | 'European' | 'unknown',
      errors: [] as string[]
    };

    if (!value || typeof value !== 'string') {
      result.errors.push('Invalid input value');
      return result;
    }

    // Remove currency symbols and spaces
    let cleanValue = value.replace(/[£$€¥₹\s]/g, '');

    // Detect format based on comma and period usage
    const hasComma = cleanValue.includes(',');
    const hasPeriod = cleanValue.includes('.');
    const commaIndex = cleanValue.lastIndexOf(',');
    const periodIndex = cleanValue.lastIndexOf('.');

    if (hasComma && hasPeriod) {
      // Both comma and period present
      if (commaIndex > periodIndex) {
        // European format: 1.234,56
        result.detectedFormat = 'European';
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234.56
        result.detectedFormat = 'US';
        cleanValue = cleanValue.replace(/,/g, '');
      }
    } else if (hasComma && !hasPeriod) {
      // Only comma - could be thousands separator or decimal
      const digitsAfterComma = cleanValue.length - commaIndex - 1;
      if (digitsAfterComma <= 2) {
        // Likely decimal separator (European)
        result.detectedFormat = 'European';
        cleanValue = cleanValue.replace(',', '.');
      } else {
        // Likely thousands separator (US)
        result.detectedFormat = 'US';
        cleanValue = cleanValue.replace(/,/g, '');
      }
    } else if (hasPeriod && !hasComma) {
      // Only period - likely US format
      result.detectedFormat = 'US';
      // No change needed
    } else {
      // No separators - could be either format
      result.detectedFormat = 'unknown';
    }

    // Try to parse the cleaned value
    const parsed = parseFloat(cleanValue);
    if (isNaN(parsed)) {
      result.errors.push(`Cannot parse "${value}" as a number`);
      return result;
    }

    result.parsedValue = parsed;
    result.isValid = true;

    // Additional validation based on expected currency
    if (expectedCurrency && this.supportedCurrencies.has(expectedCurrency)) {
      const currencyInfo = this.supportedCurrencies.get(expectedCurrency)!;
      
      // Check decimal places
      const decimalPlaces = (cleanValue.split('.')[1] || '').length;
      if (decimalPlaces > currencyInfo.decimalPlaces) {
        result.errors.push(`Too many decimal places for ${expectedCurrency} (max: ${currencyInfo.decimalPlaces})`);
      }
    }

    return result;
  }

  /**
   * Checks if a price is reasonable for the given context
   */
  checkPriceReasonableness(
    price: number,
    currency: string,
    accommodationType: string,
    nights: number,
    pax: number
  ): {
    isReasonable: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const result = {
      isReasonable: true,
      warnings: [] as string[],
      suggestions: [] as string[]
    };

    // Basic sanity checks
    if (price < 0) {
      result.isReasonable = false;
      result.warnings.push('Price cannot be negative');
      result.suggestions.push('Check for data entry errors');
      return result;
    }

    if (price === 0 && !this.options.allowZeroPrices) {
      result.isReasonable = false;
      result.warnings.push('Zero prices may indicate missing data');
      result.suggestions.push('Verify if this should be marked as unavailable instead');
      return result;
    }

    // Currency-specific checks
    const currencyInfo = this.supportedCurrencies.get(currency);
    if (currencyInfo) {
      // Very low prices (might be data entry errors)
      const minReasonablePrice = this.getMinReasonablePrice(currency);
      if (price > 0 && price < minReasonablePrice) {
        result.isReasonable = false;
        result.warnings.push(`Price ${price} ${currency} seems unusually low`);
        result.suggestions.push('Verify the price or check for missing digits');
      }

      // Very high prices
      const maxReasonablePrice = this.getMaxReasonablePrice(currency, accommodationType, nights, pax);
      if (price > maxReasonablePrice) {
        result.isReasonable = false;
        result.warnings.push(`Price ${price} ${currency} seems unusually high`);
        result.suggestions.push('Verify the price or check for extra digits');
      }
    }

    // Accommodation type specific checks
    if (this.options.priceRanges && this.options.priceRanges[accommodationType]) {
      const range = this.options.priceRanges[accommodationType];
      if (price < range.min || price > range.max) {
        result.isReasonable = false;
        result.warnings.push(`Price ${price} ${currency} is outside expected range for ${accommodationType} (${range.min}-${range.max})`);
        result.suggestions.push('Check if the accommodation type is correct');
      }
    }

    // Nights and pax scaling checks
    if (nights > 7 && price < 100) {
      result.warnings.push('Price seems low for extended stay');
    }

    if (pax > 4 && price < 200) {
      result.warnings.push('Price seems low for large group');
    }

    // If we have warnings, mark as unreasonable
    if (result.warnings.length > 0) {
      result.isReasonable = false;
    }

    return result;
  }

  /**
   * Initializes supported currencies
   */
  private initializeSupportedCurrencies(): Map<string, CurrencyInfo> {
    const currencies = new Map<string, CurrencyInfo>();

    currencies.set('EUR', {
      code: 'EUR',
      symbol: '€',
      name: 'Euro',
      decimalPlaces: 2,
      thousandsSeparator: '.',
      decimalSeparator: ',',
      symbolPosition: 'after',
      supportedFormats: [
        /\d+[,\.]\d{2}\s*€/,
        /€\s*\d+[,\.]\d{2}/,
        /\d+\s*EUR/i
      ]
    });

    currencies.set('GBP', {
      code: 'GBP',
      symbol: '£',
      name: 'British Pound',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      symbolPosition: 'before',
      supportedFormats: [
        /£\s*\d+[,\.]\d{2}/,
        /\d+[,\.]\d{2}\s*GBP/i,
        /GBP\s*\d+[,\.]\d{2}/i
      ]
    });

    currencies.set('USD', {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      symbolPosition: 'before',
      supportedFormats: [
        /\$\s*\d+[,\.]\d{2}/,
        /\d+[,\.]\d{2}\s*USD/i,
        /USD\s*\d+[,\.]\d{2}/i
      ]
    });

    currencies.set('JPY', {
      code: 'JPY',
      symbol: '¥',
      name: 'Japanese Yen',
      decimalPlaces: 0,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      symbolPosition: 'before',
      supportedFormats: [
        /¥\s*\d+/,
        /\d+\s*JPY/i,
        /JPY\s*\d+/i
      ]
    });

    return currencies;
  }

  /**
   * Initializes validation rules
   */
  private initializeValidationRules(): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Currency consistency rule
    rules.push({
      name: 'currency-consistency',
      description: 'All prices should use the same currency',
      severity: 'error',
      validator: (data: ExtractedPricingData[]) => {
        const results: ValidationResult[] = [];
        const currencies = new Set(data.map(entry => entry.currency));
        
        if (currencies.size > 1) {
          results.push({
            rule: 'currency-consistency',
            severity: 'error',
            message: `Multiple currencies detected: ${Array.from(currencies).join(', ')}`,
            affectedEntries: data.map(entry => entry.cellReference || `${entry.month}-${entry.accommodationType}`),
            suggestion: 'Ensure all prices use the same currency or apply currency conversion'
          });
        }
        
        return results;
      }
    });

    // Price reasonableness rule
    rules.push({
      name: 'price-reasonableness',
      description: 'Prices should be within reasonable ranges',
      severity: 'warning',
      validator: (data: ExtractedPricingData[]) => {
        const results: ValidationResult[] = [];
        
        for (const entry of data) {
          if (entry.isAvailable && entry.price > 0) {
            const reasonableness = this.checkPriceReasonableness(
              entry.price,
              entry.currency,
              entry.accommodationType,
              entry.nights,
              entry.pax
            );
            
            if (!reasonableness.isReasonable) {
              results.push({
                rule: 'price-reasonableness',
                severity: 'warning',
                message: reasonableness.warnings.join('; '),
                affectedEntries: [entry.cellReference || `${entry.month}-${entry.accommodationType}`],
                suggestion: reasonableness.suggestions.join('; '),
                value: entry.price
              });
            }
          }
        }
        
        return results;
      }
    });

    // Zero price rule
    rules.push({
      name: 'zero-prices',
      description: 'Zero prices should be validated',
      severity: this.options.allowZeroPrices ? 'info' : 'warning',
      validator: (data: ExtractedPricingData[]) => {
        const results: ValidationResult[] = [];
        
        const zeroPriceEntries = data.filter(entry => entry.isAvailable && entry.price === 0);
        
        if (zeroPriceEntries.length > 0) {
          results.push({
            rule: 'zero-prices',
            severity: this.options.allowZeroPrices ? 'info' : 'warning',
            message: `Found ${zeroPriceEntries.length} entries with zero prices`,
            affectedEntries: zeroPriceEntries.map(entry => 
              entry.cellReference || `${entry.month}-${entry.accommodationType}`
            ),
            suggestion: this.options.allowZeroPrices ? 
              'Zero prices detected - verify these are intentional' :
              'Consider marking zero-price entries as unavailable instead'
          });
        }
        
        return results;
      }
    });

    // Missing prices rule
    rules.push({
      name: 'missing-prices',
      description: 'Check for missing price data',
      severity: 'info',
      validator: (data: ExtractedPricingData[]) => {
        const results: ValidationResult[] = [];
        
        const unavailableEntries = data.filter(entry => !entry.isAvailable);
        const totalEntries = data.length;
        const unavailablePercentage = (unavailableEntries.length / totalEntries) * 100;
        
        if (unavailablePercentage > 50) {
          results.push({
            rule: 'missing-prices',
            severity: 'warning',
            message: `High percentage of unavailable entries: ${unavailablePercentage.toFixed(1)}%`,
            affectedEntries: unavailableEntries.map(entry => 
              entry.cellReference || `${entry.month}-${entry.accommodationType}`
            ),
            suggestion: 'Review the data source for completeness'
          });
        } else if (unavailableEntries.length > 0) {
          results.push({
            rule: 'missing-prices',
            severity: 'info',
            message: `${unavailableEntries.length} entries marked as unavailable`,
            affectedEntries: unavailableEntries.map(entry => 
              entry.cellReference || `${entry.month}-${entry.accommodationType}`
            ),
            suggestion: 'Verify unavailable entries are correct'
          });
        }
        
        return results;
      }
    });

    // Price progression rule
    rules.push({
      name: 'price-progression',
      description: 'Prices should increase logically with nights and pax',
      severity: 'warning',
      validator: (data: ExtractedPricingData[]) => {
        const results: ValidationResult[] = [];
        
        // Group by month and accommodation type
        const groups = new Map<string, ExtractedPricingData[]>();
        for (const entry of data) {
          if (entry.isAvailable && entry.price > 0) {
            const key = `${entry.month}-${entry.accommodationType}`;
            if (!groups.has(key)) {
              groups.set(key, []);
            }
            groups.get(key)!.push(entry);
          }
        }
        
        // Check price progression within each group
        for (const [groupKey, entries] of groups) {
          // Sort by nights, then by pax
          entries.sort((a, b) => {
            if (a.nights !== b.nights) return a.nights - b.nights;
            return a.pax - b.pax;
          });
          
          // Check for logical price increases
          for (let i = 1; i < entries.length; i++) {
            const prev = entries[i - 1];
            const curr = entries[i];
            
            // If nights or pax increased, price should generally increase too
            if ((curr.nights > prev.nights || curr.pax > prev.pax) && curr.price < prev.price) {
              results.push({
                rule: 'price-progression',
                severity: 'warning',
                message: `Price decrease detected: ${prev.nights}n/${prev.pax}p (${prev.price}) > ${curr.nights}n/${curr.pax}p (${curr.price})`,
                affectedEntries: [
                  prev.cellReference || `${prev.month}-${prev.accommodationType}`,
                  curr.cellReference || `${curr.month}-${curr.accommodationType}`
                ],
                suggestion: 'Verify pricing logic for different nights/pax combinations'
              });
            }
          }
        }
        
        return results;
      }
    });

    return rules;
  }

  /**
   * Gets minimum reasonable price for a currency
   */
  private getMinReasonablePrice(currency: string): number {
    const minimums: Record<string, number> = {
      'EUR': 5,
      'GBP': 4,
      'USD': 6,
      'JPY': 500
    };
    
    return minimums[currency] || 5;
  }

  /**
   * Gets maximum reasonable price for a currency and context
   */
  private getMaxReasonablePrice(
    currency: string,
    accommodationType: string,
    nights: number,
    pax: number
  ): number {
    const baseMaximums: Record<string, number> = {
      'EUR': 5000,
      'GBP': 4000,
      'USD': 6000,
      'JPY': 500000
    };
    
    let baseMax = baseMaximums[currency] || 5000;
    
    // Adjust based on accommodation type
    const accomMultipliers: Record<string, number> = {
      'villa': 2.0,
      'resort': 1.5,
      'hotel': 1.2,
      'apartment': 1.0,
      'self-catering': 0.8,
      'hostel': 0.5
    };
    
    const accomType = accommodationType.toLowerCase();
    for (const [type, multiplier] of Object.entries(accomMultipliers)) {
      if (accomType.includes(type)) {
        baseMax *= multiplier;
        break;
      }
    }
    
    // Adjust for nights and pax
    baseMax *= Math.max(1, nights / 7); // Scale with nights
    baseMax *= Math.max(1, pax / 2); // Scale with pax
    
    return baseMax;
  }

  /**
   * Adds a custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Removes a validation rule by name
   */
  removeValidationRule(ruleName: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.name !== ruleName);
  }

  /**
   * Gets all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Updates validation options
   */
  updateOptions(newOptions: Partial<PriceValidationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Gets current validation options
   */
  getOptions(): PriceValidationOptions {
    return { ...this.options };
  }
}

/**
 * Utility function to create a price validator with common settings
 */
export function createPriceValidator(options?: Partial<PriceValidationOptions>): PriceValidator {
  return new PriceValidator(options);
}

/**
 * Utility function to validate pricing data with default settings
 */
export function validatePricingData(
  data: ExtractedPricingData[],
  context?: ValidationContext,
  options?: Partial<PriceValidationOptions>
): ValidationResult[] {
  const validator = createPriceValidator(options);
  return validator.validatePricing(data, context);
}