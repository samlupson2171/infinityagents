import * as XLSX from 'xlsx';
import { ExcelLayoutDetector, PricingSection } from './excel-layout-detector';

export interface PricingMatrix {
  months: string[];
  accommodationTypes: AccommodationType[];
  nightsOptions: number[];
  paxOptions: number[];
  priceGrid: PriceCell[][];
  metadata: {
    currency: string;
    season?: string;
    validFrom?: Date;
    validTo?: Date;
  };
}

export interface AccommodationType {
  name: string;
  code: string;
  description?: string;
}

export interface PriceCell {
  value: number;
  currency: string;
  isAvailable: boolean;
  notes?: string;
  validFrom?: Date;
  validTo?: Date;
  originalValue?: string; // Store original Excel value for debugging
  cellReference?: string; // Excel cell reference (e.g., "B5")
  isMerged?: boolean; // Whether this cell was part of a merged range
}

export interface ExtractedPricingData {
  month: string;
  accommodationType: string;
  nights: number;
  pax: number;
  price: number;
  currency: string;
  isAvailable: boolean;
  specialPeriod?: string;
  validFrom?: Date;
  validTo?: Date;
  notes?: string;
  cellReference?: string;
}

export interface MergedCellInfo {
  range: XLSX.Range;
  value: any;
  formattedValue: string;
  appliesTo: string[]; // Array of cell references this merged cell applies to
}

/**
 * Pricing Data Extractor - Extracts structured pricing data from Excel worksheets
 */
export class PricingExtractor {
  private worksheet: XLSX.WorkSheet;
  private layoutDetector: ExcelLayoutDetector;
  private cellData: any[][];
  private range: XLSX.Range;
  private mergedCells: MergedCellInfo[];

  constructor(worksheet: XLSX.WorkSheet) {
    this.worksheet = worksheet;
    this.layoutDetector = new ExcelLayoutDetector(worksheet);
    this.range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    this.cellData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: true,
      range: this.range
    }) as any[][];
    this.mergedCells = this.extractMergedCells();
  }

  /**
   * Main extraction method that returns a complete pricing matrix
   */
  extractPricingMatrix(): PricingMatrix | null {
    const pricingSection = this.layoutDetector.findPricingSection();
    if (!pricingSection) {
      return null;
    }

    const currency = this.detectCurrency();
    const months = this.extractMonths(pricingSection);
    const accommodationTypes = this.extractAccommodationTypes(pricingSection);
    const nightsOptions = pricingSection.nightsOptions;
    const paxOptions = pricingSection.paxOptions;

    // Extract the price grid based on layout
    const priceGrid = this.extractPriceGrid(pricingSection, months, accommodationTypes, nightsOptions, paxOptions);

    return {
      months,
      accommodationTypes,
      nightsOptions,
      paxOptions,
      priceGrid,
      metadata: {
        currency,
        season: this.detectSeason(),
        validFrom: this.detectValidFrom(),
        validTo: this.detectValidTo()
      }
    };
  }

  /**
   * Extracts price grid from the pricing section
   */
  private extractPriceGrid(
    section: PricingSection,
    months: string[],
    accommodationTypes: AccommodationType[],
    nightsOptions: number[],
    paxOptions: number[]
  ): PriceCell[][] {
    const grid: PriceCell[][] = [];

    if (section.layout === 'months-rows') {
      return this.extractPriceGridMonthsRows(section, months, accommodationTypes, nightsOptions, paxOptions);
    } else {
      return this.extractPriceGridMonthsColumns(section, months, accommodationTypes, nightsOptions, paxOptions);
    }
  }

  /**
   * Extracts price grid for months-in-rows layout
   */
  private extractPriceGridMonthsRows(
    section: PricingSection,
    months: string[],
    accommodationTypes: AccommodationType[],
    nightsOptions: number[],
    paxOptions: number[]
  ): PriceCell[][] {
    const grid: PriceCell[][] = [];
    const currency = this.detectCurrency();

    // For months-in-rows, each row represents a month
    for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
      const row: PriceCell[] = [];
      const excelRow = section.startRow + monthIndex;

      // Each column represents a combination of accommodation type, nights, and pax
      let colIndex = section.startCol + 1; // Skip the month column

      for (const accommodationType of accommodationTypes) {
        for (const nights of nightsOptions) {
          for (const pax of paxOptions) {
            if (colIndex <= section.endCol && excelRow < this.cellData.length) {
              const cellValue = this.cellData[excelRow]?.[colIndex];
              const cellRef = XLSX.utils.encode_cell({ r: excelRow, c: colIndex });
              
              const priceCell = this.createPriceCell(
                cellValue,
                currency,
                cellRef,
                accommodationType.name,
                nights,
                pax
              );

              row.push(priceCell);
              colIndex++;
            }
          }
        }
      }

      grid.push(row);
    }

    return grid;
  }

  /**
   * Extracts price grid for months-in-columns layout
   */
  private extractPriceGridMonthsColumns(
    section: PricingSection,
    months: string[],
    accommodationTypes: AccommodationType[],
    nightsOptions: number[],
    paxOptions: number[]
  ): PriceCell[][] {
    const grid: PriceCell[][] = [];
    const currency = this.detectCurrency();

    // For months-in-columns, each column represents a month
    for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
      const column: PriceCell[] = [];
      const excelCol = section.startCol + 1 + monthIndex; // Skip the row header column

      // Each row represents a combination of accommodation type, nights, and pax
      let rowIndex = section.startRow + 1; // Skip the header row

      for (const accommodationType of accommodationTypes) {
        for (const nights of nightsOptions) {
          for (const pax of paxOptions) {
            if (rowIndex <= section.endRow && excelCol < (this.cellData[0]?.length || 0)) {
              const cellValue = this.cellData[rowIndex]?.[excelCol];
              const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: excelCol });
              
              const priceCell = this.createPriceCell(
                cellValue,
                currency,
                cellRef,
                accommodationType.name,
                nights,
                pax
              );

              column.push(priceCell);
              rowIndex++;
            }
          }
        }
      }

      grid.push(column);
    }

    return grid;
  }

  /**
   * Creates a PriceCell from raw Excel data
   */
  private createPriceCell(
    cellValue: any,
    currency: string,
    cellRef: string,
    accommodationType: string,
    nights: number,
    pax: number
  ): PriceCell {
    const originalValue = String(cellValue || '');
    const mergedInfo = this.getMergedCellInfo(cellRef);
    
    // If this cell is part of a merged range, use the merged value
    const valueToProcess = mergedInfo ? mergedInfo.formattedValue : originalValue;
    
    const price = this.parsePrice(valueToProcess);
    const isAvailable = this.isPriceAvailable(valueToProcess, price);
    
    return {
      value: price,
      currency,
      isAvailable,
      originalValue,
      cellReference: cellRef,
      isMerged: !!mergedInfo,
      notes: this.extractNotes(valueToProcess)
    };
  }

  /**
   * Handles merged cells in Excel pricing tables
   */
  private extractMergedCells(): MergedCellInfo[] {
    const mergedCells: MergedCellInfo[] = [];
    
    if (!this.worksheet['!merges']) {
      return mergedCells;
    }

    for (const merge of this.worksheet['!merges']) {
      const range = merge;
      const topLeftCell = XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c });
      const cellValue = this.worksheet[topLeftCell];
      
      if (cellValue) {
        const appliesTo: string[] = [];
        
        // Generate all cell references that this merged cell applies to
        for (let row = range.s.r; row <= range.e.r; row++) {
          for (let col = range.s.c; col <= range.e.c; col++) {
            appliesTo.push(XLSX.utils.encode_cell({ r: row, c: col }));
          }
        }

        mergedCells.push({
          range,
          value: cellValue.v,
          formattedValue: cellValue.w || String(cellValue.v || ''),
          appliesTo
        });
      }
    }

    return mergedCells;
  }

  /**
   * Gets merged cell information for a specific cell reference
   */
  private getMergedCellInfo(cellRef: string): MergedCellInfo | null {
    return this.mergedCells.find(merged => 
      merged.appliesTo.includes(cellRef)
    ) || null;
  }

  /**
   * Extracts months from the pricing section
   */
  private extractMonths(section: PricingSection): string[] {
    const months: string[] = [];
    const monthPatterns = this.getMonthPatterns();

    if (section.layout === 'months-rows') {
      // Months are in the first column of each row
      for (let row = section.startRow; row <= section.endRow; row++) {
        const cellValue = String(this.cellData[row]?.[section.startCol] || '').trim();
        const normalizedMonth = this.normalizeMonth(cellValue);
        if (normalizedMonth && this.isValidMonth(normalizedMonth, monthPatterns)) {
          months.push(normalizedMonth);
        }
      }
    } else {
      // Months are in the header row
      for (let col = section.startCol + 1; col <= section.endCol; col++) {
        const cellValue = String(this.cellData[section.startRow]?.[col] || '').trim();
        const normalizedMonth = this.normalizeMonth(cellValue);
        if (normalizedMonth && this.isValidMonth(normalizedMonth, monthPatterns)) {
          months.push(normalizedMonth);
        }
      }
    }

    return months;
  }

  /**
   * Extracts accommodation types from headers or section analysis
   */
  private extractAccommodationTypes(section: PricingSection): AccommodationType[] {
    const types: AccommodationType[] = [];
    const detectedTypes = section.accommodationTypes;

    if (detectedTypes.length > 0) {
      // Remove duplicates and create unique accommodation types
      const uniqueTypes = [...new Set(detectedTypes)];
      for (const type of uniqueTypes) {
        types.push({
          name: type,
          code: this.generateAccommodationCode(type),
          description: type
        });
      }
    } else {
      // Try to extract from row labels in the pricing section
      const extractedTypes = this.extractAccommodationTypesFromRowLabels(section);
      if (extractedTypes.length > 0) {
        types.push(...extractedTypes);
      } else {
        // Default accommodation type if none detected
        types.push({
          name: 'Standard',
          code: 'STD',
          description: 'Standard accommodation'
        });
      }
    }

    return types;
  }

  /**
   * Extracts accommodation types from row labels in pricing section
   */
  private extractAccommodationTypesFromRowLabels(section: PricingSection): AccommodationType[] {
    const types: AccommodationType[] = [];
    const seenTypes = new Set<string>();

    // Look at row labels to extract accommodation types
    for (let row = section.startRow; row <= section.endRow; row++) {
      const rowLabel = String(this.cellData[row]?.[section.startCol] || '').trim();
      if (rowLabel) {
        const accommodationType = this.extractAccommodationTypeFromLabel(rowLabel);
        if (accommodationType && !seenTypes.has(accommodationType)) {
          seenTypes.add(accommodationType);
          types.push({
            name: accommodationType,
            code: this.generateAccommodationCode(accommodationType),
            description: accommodationType
          });
        }
      }
    }

    return types;
  }

  /**
   * Extracts accommodation type from a row label
   */
  private extractAccommodationTypeFromLabel(label: string): string | null {
    const lowerLabel = label.toLowerCase();
    
    // Common accommodation type patterns
    const patterns = [
      { pattern: /hotel/i, type: 'Hotel' },
      { pattern: /self[-\s]?catering/i, type: 'Self-Catering' },
      { pattern: /apartment/i, type: 'Apartment' },
      { pattern: /villa/i, type: 'Villa' },
      { pattern: /hostel/i, type: 'Hostel' },
      { pattern: /resort/i, type: 'Resort' },
      { pattern: /b&b|bed\s*and\s*breakfast/i, type: 'B&B' },
      { pattern: /guesthouse/i, type: 'Guesthouse' }
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(label)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Detects currency from the worksheet
   */
  detectCurrency(): string {
    const currencySymbols = {
      '£': 'GBP',
      '$': 'USD',
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR'
    };

    // Search for currency symbols in the worksheet
    for (let row = 0; row < Math.min(this.cellData.length, 20); row++) {
      const rowData = this.cellData[row] || [];
      for (let col = 0; col < Math.min(rowData.length, 20); col++) {
        const cellValue = String(rowData[col] || '');
        
        for (const [symbol, currency] of Object.entries(currencySymbols)) {
          if (cellValue.includes(symbol)) {
            return currency;
          }
        }
      }
    }

    // Check for currency codes in text
    const currencyCodes = ['GBP', 'USD', 'EUR', 'JPY', 'INR'];
    for (let row = 0; row < Math.min(this.cellData.length, 10); row++) {
      const rowData = this.cellData[row] || [];
      for (let col = 0; col < Math.min(rowData.length, 10); col++) {
        const cellValue = String(rowData[col] || '').toUpperCase();
        
        for (const code of currencyCodes) {
          if (cellValue.includes(code)) {
            return code;
          }
        }
      }
    }

    return 'EUR'; // Default currency
  }

  /**
   * Parses price from various formats
   */
  private parsePrice(value: string): number {
    if (!value || typeof value !== 'string') return 0;
    
    // Handle special cases
    if (value.toLowerCase().includes('n/a') || 
        value.toLowerCase().includes('not available') ||
        value.toLowerCase().includes('tbc') ||
        value.toLowerCase().includes('tba')) {
      return 0;
    }

    // Remove currency symbols, spaces, and common formatting
    let cleanValue = value
      .replace(/[£$€¥₹,\s]/g, '')
      .replace(/[^\d.-]/g, '');

    // Handle European number format (comma as decimal separator)
    if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      cleanValue = cleanValue.replace(',', '.');
    } else if (cleanValue.includes(',') && cleanValue.includes('.')) {
      // Handle format like "1,234.56" - remove comma
      cleanValue = cleanValue.replace(/,/g, '');
    }

    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Determines if a price is available based on the value and parsed price
   */
  private isPriceAvailable(originalValue: string, parsedPrice: number): boolean {
    if (parsedPrice <= 0) return false;
    
    const lowerValue = originalValue.toLowerCase();
    const unavailableIndicators = [
      'n/a', 'not available', 'unavailable', 'tbc', 'tba', 
      'closed', 'sold out', 'full', 'no availability'
    ];
    
    return !unavailableIndicators.some(indicator => lowerValue.includes(indicator));
  }

  /**
   * Extracts notes from cell value
   */
  private extractNotes(value: string): string | undefined {
    if (!value) return undefined;
    
    // Look for text in parentheses or after common separators
    const notePatterns = [
      /\(([^)]+)\)/, // Text in parentheses
      /\*(.+)/, // Text after asterisk
      /note:\s*(.+)/i, // Text after "note:"
      /-\s*(.+)/ // Text after dash
    ];
    
    for (const pattern of notePatterns) {
      const match = value.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  /**
   * Gets regex patterns for month detection
   */
  private getMonthPatterns(): RegExp[] {
    return [
      /^(january|jan)$/i,
      /^(february|feb)$/i,
      /^(march|mar)$/i,
      /^(april|apr)$/i,
      /^may$/i,
      /^(june|jun)$/i,
      /^(july|jul)$/i,
      /^(august|aug)$/i,
      /^(september|sep|sept)$/i,
      /^(october|oct)$/i,
      /^(november|nov)$/i,
      /^(december|dec)$/i,
      /easter/i,
      /peak\s*season/i,
      /off\s*season/i
    ];
  }

  /**
   * Normalizes month names to standard format
   */
  private normalizeMonth(month: string): string {
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
    
    // Handle special periods
    if (normalized.includes('easter')) return 'Easter (18–21 Apr)';
    if (normalized.includes('peak')) return 'Peak Season';
    if (normalized.includes('off')) return 'Off Season';
    
    return monthMap[normalized] || month;
  }

  /**
   * Checks if a month name is valid
   */
  private isValidMonth(month: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(month));
  }

  /**
   * Generates accommodation code from name
   */
  private generateAccommodationCode(name: string): string {
    const codeMap: Record<string, string> = {
      'hotel': 'HTL',
      'self-catering': 'SC',
      'apartment': 'APT',
      'villa': 'VIL',
      'hostel': 'HST',
      'resort': 'RST',
      'b&b': 'BB',
      'bed and breakfast': 'BB',
      'guesthouse': 'GH',
      'lodge': 'LDG',
      'cabin': 'CAB'
    };

    const lowerName = name.toLowerCase();
    for (const [key, code] of Object.entries(codeMap)) {
      if (lowerName.includes(key)) {
        return code;
      }
    }

    // Generate code from first 3 characters
    return name.substring(0, 3).toUpperCase();
  }

  /**
   * Detects season information from the worksheet
   */
  private detectSeason(): string | undefined {
    const seasonKeywords = ['summer', 'winter', 'spring', 'autumn', 'fall', 'peak', 'off-season', 'high season', 'low season'];
    
    for (let row = 0; row < Math.min(this.cellData.length, 10); row++) {
      const rowData = this.cellData[row] || [];
      for (let col = 0; col < Math.min(rowData.length, 10); col++) {
        const cellValue = String(rowData[col] || '').toLowerCase();
        
        for (const keyword of seasonKeywords) {
          if (cellValue.includes(keyword)) {
            return keyword;
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Detects valid from date
   */
  private detectValidFrom(): Date | undefined {
    // Look for date patterns in the first few rows
    const datePatterns = [
      /valid\s+from[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /from[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*-/
    ];

    for (let row = 0; row < Math.min(this.cellData.length, 10); row++) {
      const rowData = this.cellData[row] || [];
      for (let col = 0; col < Math.min(rowData.length, 10); col++) {
        const cellValue = String(rowData[col] || '');
        
        for (const pattern of datePatterns) {
          const match = cellValue.match(pattern);
          if (match && match[1]) {
            const date = new Date(match[1]);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Detects valid to date
   */
  private detectValidTo(): Date | undefined {
    // Look for date patterns in the first few rows
    const datePatterns = [
      /valid\s+to[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /to[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /-\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    ];

    for (let row = 0; row < Math.min(this.cellData.length, 10); row++) {
      const rowData = this.cellData[row] || [];
      for (let col = 0; col < Math.min(rowData.length, 10); col++) {
        const cellValue = String(rowData[col] || '');
        
        for (const pattern of datePatterns) {
          const match = cellValue.match(pattern);
          if (match && match[1]) {
            const date = new Date(match[1]);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
      }
    }
    
    return undefined;
  }
}