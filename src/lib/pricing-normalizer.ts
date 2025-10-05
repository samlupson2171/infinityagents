import { PricingMatrix, ExtractedPricingData, PriceCell, AccommodationType } from './pricing-extractor';

export interface NormalizationOptions {
  preserveSpecialPeriods: boolean;
  handleMissingPrices: 'mark-unavailable' | 'interpolate' | 'skip';
  currencyConversion?: {
    from: string;
    to: string;
    rate: number;
  };
  priceRounding?: {
    enabled: boolean;
    precision: number; // Number of decimal places
  };
}

export interface NormalizationResult {
  success: boolean;
  data: ExtractedPricingData[];
  warnings: string[];
  errors: string[];
  summary: {
    totalEntries: number;
    availableEntries: number;
    unavailableEntries: number;
    interpolatedEntries: number;
    specialPeriods: string[];
  };
}

/**
 * Pricing Normalizer - Converts various Excel layouts to standardized pricing structure
 */
export class PricingNormalizer {
  private options: NormalizationOptions;

  constructor(options: Partial<NormalizationOptions> = {}) {
    this.options = {
      preserveSpecialPeriods: true,
      handleMissingPrices: 'mark-unavailable',
      priceRounding: {
        enabled: true,
        precision: 2
      },
      ...options
    };
  }

  /**
   * Main normalization method that converts pricing matrix to standardized format
   */
  normalizePricing(matrix: PricingMatrix): NormalizationResult {
    const result: NormalizationResult = {
      success: false,
      data: [],
      warnings: [],
      errors: [],
      summary: {
        totalEntries: 0,
        availableEntries: 0,
        unavailableEntries: 0,
        interpolatedEntries: 0,
        specialPeriods: []
      }
    };

    try {
      // Validate input matrix
      const validationErrors = this.validateMatrix(matrix);
      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors);
        return result;
      }

      // Convert matrix to flat structure
      const flatData = this.flattenPricingMatrix(matrix);
      
      // Process each pricing entry
      for (const entry of flatData) {
        const normalizedEntry = this.normalizeEntry(entry, matrix);
        
        if (normalizedEntry) {
          result.data.push(normalizedEntry);
          result.summary.totalEntries++;
          
          if (normalizedEntry.isAvailable) {
            result.summary.availableEntries++;
          } else {
            result.summary.unavailableEntries++;
          }
          
          // Track special periods
          if (normalizedEntry.specialPeriod && 
              !result.summary.specialPeriods.includes(normalizedEntry.specialPeriod)) {
            result.summary.specialPeriods.push(normalizedEntry.specialPeriod);
          }
        }
      }

      // Handle missing prices if requested
      if (this.options.handleMissingPrices === 'interpolate') {
        const interpolatedEntries = this.interpolateMissingPrices(result.data, matrix);
        result.data.push(...interpolatedEntries);
        result.summary.interpolatedEntries = interpolatedEntries.length;
        result.summary.totalEntries += interpolatedEntries.length;
        result.summary.availableEntries += interpolatedEntries.length;
      }

      // Apply currency conversion if specified
      if (this.options.currencyConversion) {
        this.applyCurrencyConversion(result.data);
      }

      // Apply price rounding if enabled
      if (this.options.priceRounding?.enabled) {
        this.applyPriceRounding(result.data);
      }

      // Sort data for consistency
      result.data.sort(this.createSortComparator());

      result.success = true;

    } catch (error) {
      result.errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validates the pricing matrix structure
   */
  private validateMatrix(matrix: PricingMatrix): string[] {
    const errors: string[] = [];

    if (!matrix.months || matrix.months.length === 0) {
      errors.push('No months found in pricing matrix');
    }

    if (!matrix.accommodationTypes || matrix.accommodationTypes.length === 0) {
      errors.push('No accommodation types found in pricing matrix');
    }

    if (!matrix.nightsOptions || matrix.nightsOptions.length === 0) {
      errors.push('No nights options found in pricing matrix');
    }

    if (!matrix.paxOptions || matrix.paxOptions.length === 0) {
      errors.push('No pax options found in pricing matrix');
    }

    if (!matrix.priceGrid || matrix.priceGrid.length === 0) {
      errors.push('No price data found in pricing matrix');
    }

    // Validate grid dimensions
    if (matrix.priceGrid.length !== matrix.months.length) {
      errors.push(`Price grid rows (${matrix.priceGrid.length}) don't match months count (${matrix.months.length})`);
    }

    return errors;
  }

  /**
   * Flattens the pricing matrix into individual pricing entries
   */
  private flattenPricingMatrix(matrix: PricingMatrix): Array<{
    monthIndex: number;
    month: string;
    accommodationTypeIndex: number;
    accommodationType: AccommodationType;
    nightsIndex: number;
    nights: number;
    paxIndex: number;
    pax: number;
    priceCell: PriceCell;
  }> {
    const flatData: Array<any> = [];

    for (let monthIndex = 0; monthIndex < matrix.months.length; monthIndex++) {
      const month = matrix.months[monthIndex];
      const monthRow = matrix.priceGrid[monthIndex] || [];

      let cellIndex = 0;
      for (let accomIndex = 0; accomIndex < matrix.accommodationTypes.length; accomIndex++) {
        const accommodationType = matrix.accommodationTypes[accomIndex];
        
        for (let nightsIndex = 0; nightsIndex < matrix.nightsOptions.length; nightsIndex++) {
          const nights = matrix.nightsOptions[nightsIndex];
          
          for (let paxIndex = 0; paxIndex < matrix.paxOptions.length; paxIndex++) {
            const pax = matrix.paxOptions[paxIndex];
            const priceCell = monthRow[cellIndex];
            
            if (priceCell) {
              flatData.push({
                monthIndex,
                month,
                accommodationTypeIndex: accomIndex,
                accommodationType,
                nightsIndex,
                nights,
                paxIndex,
                pax,
                priceCell
              });
            }
            
            cellIndex++;
          }
        }
      }
    }

    return flatData;
  }

  /**
   * Normalizes a single pricing entry
   */
  private normalizeEntry(
    entry: any,
    matrix: PricingMatrix
  ): ExtractedPricingData | null {
    const { month, accommodationType, nights, pax, priceCell } = entry;

    // Handle missing prices vs zero prices
    const isAvailable = this.determineAvailability(priceCell);
    const price = this.normalizePrice(priceCell);

    // Detect special periods
    const specialPeriod = this.detectSpecialPeriod(month);

    // Extract valid dates from matrix metadata or cell data
    const validFrom = matrix.metadata.validFrom || priceCell.validFrom;
    const validTo = matrix.metadata.validTo || priceCell.validTo;

    return {
      month: this.normalizeMonthName(month),
      accommodationType: accommodationType.name,
      nights,
      pax,
      price,
      currency: priceCell.currency || matrix.metadata.currency,
      isAvailable,
      specialPeriod: this.options.preserveSpecialPeriods ? specialPeriod : undefined,
      validFrom,
      validTo,
      notes: priceCell.notes,
      cellReference: priceCell.cellReference
    };
  }

  /**
   * Determines availability based on price cell data
   */
  private determineAvailability(priceCell: PriceCell): boolean {
    // If explicitly marked as unavailable, respect that
    if (!priceCell.isAvailable) {
      return false;
    }

    // If price is 0 but original value suggests unavailability, mark as unavailable
    if (priceCell.value === 0 && priceCell.originalValue) {
      const originalLower = priceCell.originalValue.toLowerCase();
      const unavailableIndicators = [
        'n/a', 'not available', 'unavailable', 'tbc', 'tba',
        'closed', 'sold out', 'full', 'no availability', '-'
      ];
      
      if (unavailableIndicators.some(indicator => originalLower.includes(indicator))) {
        return false;
      }
    }

    // If price is 0 and no clear unavailability indicator, treat based on context
    if (priceCell.value === 0) {
      // If original value is empty or just whitespace, consider unavailable
      if (!priceCell.originalValue || priceCell.originalValue.trim() === '') {
        return false;
      }
      
      // If original value is "0" or "0.00", consider it a valid zero price
      if (/^0(\.0+)?$/.test(priceCell.originalValue.trim())) {
        return true;
      }
      
      // Otherwise, consider unavailable
      return false;
    }

    // Price > 0, consider available
    return true;
  }

  /**
   * Normalizes price value
   */
  private normalizePrice(priceCell: PriceCell): number {
    return Math.max(0, priceCell.value);
  }

  /**
   * Detects special periods from month names
   */
  private detectSpecialPeriod(month: string): string | undefined {
    const lowerMonth = month.toLowerCase();
    
    if (lowerMonth.includes('easter')) {
      return 'Easter';
    }
    if (lowerMonth.includes('peak') || lowerMonth.includes('high')) {
      return 'Peak Season';
    }
    if (lowerMonth.includes('off') || lowerMonth.includes('low')) {
      return 'Off Season';
    }
    if (lowerMonth.includes('christmas') || lowerMonth.includes('xmas')) {
      return 'Christmas';
    }
    if (lowerMonth.includes('new year')) {
      return 'New Year';
    }
    if (lowerMonth.includes('summer')) {
      return 'Summer';
    }
    if (lowerMonth.includes('winter')) {
      return 'Winter';
    }
    
    return undefined;
  }

  /**
   * Normalizes month names to standard format
   */
  private normalizeMonthName(month: string): string {
    const monthMap: Record<string, string> = {
      'jan': 'January', 'january': 'January',
      'feb': 'February', 'february': 'February',
      'mar': 'March', 'march': 'March',
      'apr': 'April', 'april': 'April',
      'may': 'May',
      'jun': 'June', 'june': 'June',
      'jul': 'July', 'july': 'July',
      'aug': 'August', 'august': 'August',
      'sep': 'September', 'sept': 'September', 'september': 'September',
      'oct': 'October', 'october': 'October',
      'nov': 'November', 'november': 'November',
      'dec': 'December', 'december': 'December'
    };

    const normalized = month.toLowerCase().trim();
    
    // Handle special periods - preserve them as-is if they contain month info
    if (normalized.includes('easter')) {
      return month; // Keep original format like "Easter (18–21 Apr)"
    }
    if (normalized.includes('peak') || normalized.includes('high')) {
      return month; // Keep original format
    }
    if (normalized.includes('off') || normalized.includes('low')) {
      return month; // Keep original format
    }
    
    // Try to extract month name from complex strings
    for (const [key, standardName] of Object.entries(monthMap)) {
      if (normalized.includes(key)) {
        return standardName;
      }
    }
    
    return month; // Return original if no match found
  }

  /**
   * Interpolates missing prices based on available data
   */
  private interpolateMissingPrices(
    existingData: ExtractedPricingData[],
    matrix: PricingMatrix
  ): ExtractedPricingData[] {
    const interpolatedEntries: ExtractedPricingData[] = [];
    
    // Create a map of existing entries for quick lookup
    const existingMap = new Map<string, ExtractedPricingData>();
    for (const entry of existingData) {
      const key = `${entry.month}-${entry.accommodationType}-${entry.nights}-${entry.pax}`;
      existingMap.set(key, entry);
    }

    // Generate all possible combinations
    for (const month of matrix.months) {
      for (const accommodationType of matrix.accommodationTypes) {
        for (const nights of matrix.nightsOptions) {
          for (const pax of matrix.paxOptions) {
            const key = `${month}-${accommodationType.name}-${nights}-${pax}`;
            
            if (!existingMap.has(key)) {
              // Try to interpolate price
              const interpolatedPrice = this.interpolatePrice(
                month,
                accommodationType.name,
                nights,
                pax,
                existingData
              );
              
              if (interpolatedPrice > 0) {
                interpolatedEntries.push({
                  month: this.normalizeMonthName(month),
                  accommodationType: accommodationType.name,
                  nights,
                  pax,
                  price: interpolatedPrice,
                  currency: matrix.metadata.currency,
                  isAvailable: true,
                  notes: 'Interpolated price',
                  specialPeriod: this.detectSpecialPeriod(month)
                });
              }
            }
          }
        }
      }
    }

    return interpolatedEntries;
  }

  /**
   * Interpolates a price based on similar entries
   */
  private interpolatePrice(
    month: string,
    accommodationType: string,
    nights: number,
    pax: number,
    existingData: ExtractedPricingData[]
  ): number {
    // Find similar entries for interpolation
    const similarEntries = existingData.filter(entry => 
      entry.isAvailable && 
      entry.price > 0 &&
      (entry.accommodationType === accommodationType ||
       entry.nights === nights ||
       entry.pax === pax)
    );

    if (similarEntries.length === 0) {
      return 0;
    }

    // Calculate weighted average based on similarity
    let totalWeight = 0;
    let weightedSum = 0;

    for (const entry of similarEntries) {
      let weight = 1;
      
      // Higher weight for exact matches
      if (entry.accommodationType === accommodationType) weight += 2;
      if (entry.nights === nights) weight += 2;
      if (entry.pax === pax) weight += 2;
      if (entry.month === month) weight += 3;
      
      totalWeight += weight;
      weightedSum += entry.price * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Applies currency conversion to all pricing data
   */
  private applyCurrencyConversion(data: ExtractedPricingData[]): void {
    if (!this.options.currencyConversion) return;

    const { from, to, rate } = this.options.currencyConversion;

    for (const entry of data) {
      if (entry.currency === from) {
        entry.price = entry.price * rate;
        entry.currency = to;
        entry.notes = entry.notes ? 
          `${entry.notes} (Converted from ${from})` : 
          `Converted from ${from}`;
      }
    }
  }

  /**
   * Applies price rounding to all pricing data
   */
  private applyPriceRounding(data: ExtractedPricingData[]): void {
    if (!this.options.priceRounding?.enabled) return;

    const precision = this.options.priceRounding.precision;

    for (const entry of data) {
      entry.price = Math.round(entry.price * Math.pow(10, precision)) / Math.pow(10, precision);
    }
  }

  /**
   * Creates a sort comparator for consistent data ordering
   */
  private createSortComparator(): (a: ExtractedPricingData, b: ExtractedPricingData) => number {
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (a, b) => {
      // Sort by month first
      const aMonthIndex = monthOrder.indexOf(a.month);
      const bMonthIndex = monthOrder.indexOf(b.month);
      
      if (aMonthIndex !== bMonthIndex) {
        // Handle special periods (put them at the end)
        if (aMonthIndex === -1 && bMonthIndex !== -1) return 1;
        if (bMonthIndex === -1 && aMonthIndex !== -1) return -1;
        if (aMonthIndex === -1 && bMonthIndex === -1) {
          return a.month.localeCompare(b.month);
        }
        return aMonthIndex - bMonthIndex;
      }

      // Then by accommodation type
      if (a.accommodationType !== b.accommodationType) {
        return a.accommodationType.localeCompare(b.accommodationType);
      }

      // Then by nights
      if (a.nights !== b.nights) {
        return a.nights - b.nights;
      }

      // Finally by pax
      return a.pax - b.pax;
    };
  }

  /**
   * Updates normalization options
   */
  updateOptions(newOptions: Partial<NormalizationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Gets current normalization options
   */
  getOptions(): NormalizationOptions {
    return { ...this.options };
  }
}

/**
 * Utility function to create a normalizer with common settings
 */
export function createPricingNormalizer(options?: Partial<NormalizationOptions>): PricingNormalizer {
  return new PricingNormalizer(options);
}

/**
 * Utility function to normalize pricing with default settings
 */
export function normalizePricingMatrix(
  matrix: PricingMatrix,
  options?: Partial<NormalizationOptions>
): NormalizationResult {
  const normalizer = createPricingNormalizer(options);
  return normalizer.normalizePricing(matrix);
}