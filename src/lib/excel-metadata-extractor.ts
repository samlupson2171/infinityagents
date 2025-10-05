import * as XLSX from 'xlsx';

/**
 * Metadata extracted from Excel files
 */
export interface ResortMetadata {
  resortName?: string;
  destination?: string;
  currency: string;
  season?: string;
  validFrom?: Date;
  validTo?: Date;
  specialPeriods: SpecialPeriod[];
  extractionSource: {
    resortNameSource?: string;
    currencySource?: string;
    dateSource?: string;
  };
  confidence: {
    resortName: number;
    currency: number;
    dates: number;
  };
}

export interface SpecialPeriod {
  name: string;
  type: 'holiday' | 'season' | 'event';
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  description?: string;
}

export interface CurrencyDetectionResult {
  currency: string;
  symbol: string;
  confidence: number;
  locations: Array<{
    sheet: string;
    cell: string;
    value: string;
  }>;
}

/**
 * Excel Metadata Extractor - Extracts resort information, currency, and special periods
 */
export class ExcelMetadataExtractor {
  private workbook: XLSX.WorkBook;
  private worksheets: Map<string, XLSX.WorkSheet>;

  constructor(workbook: XLSX.WorkBook) {
    this.workbook = workbook;
    this.worksheets = new Map();
    
    // Cache all worksheets
    for (const sheetName of workbook.SheetNames) {
      this.worksheets.set(sheetName, workbook.Sheets[sheetName]);
    }
  }

  /**
   * Extract all metadata from the workbook
   */
  extractMetadata(): ResortMetadata {
    const resortInfo = this.extractResortName();
    const currencyInfo = this.detectCurrency();
    const dateInfo = this.extractDateRanges();
    const specialPeriods = this.identifySpecialPeriods();

    return {
      resortName: resortInfo.name,
      destination: resortInfo.destination,
      currency: currencyInfo.currency,
      season: dateInfo.season,
      validFrom: dateInfo.validFrom,
      validTo: dateInfo.validTo,
      specialPeriods,
      extractionSource: {
        resortNameSource: resortInfo.source,
        currencySource: currencyInfo.locations[0]?.cell,
        dateSource: dateInfo.source
      },
      confidence: {
        resortName: resortInfo.confidence,
        currency: currencyInfo.confidence,
        dates: dateInfo.confidence
      }
    };
  }

  /**
   * Extract resort name from sheet names or content
   */
  extractResortName(): {
    name?: string;
    destination?: string;
    source?: string;
    confidence: number;
  } {
    const candidates: Array<{
      name: string;
      source: string;
      confidence: number;
      destination?: string;
    }> = [];

    // Check sheet names first
    for (const sheetName of this.workbook.SheetNames) {
      const resortInfo = this.analyzeSheetNameForResort(sheetName);
      if (resortInfo.name) {
        candidates.push({
          name: resortInfo.name,
          destination: resortInfo.destination,
          source: `Sheet name: ${sheetName}`,
          confidence: resortInfo.confidence
        });
      }
    }

    // Check cell content in each sheet
    for (const [sheetName, worksheet] of this.worksheets) {
      const cellCandidates = this.extractResortFromCells(worksheet, sheetName);
      candidates.push(...cellCandidates);
    }

    // Sort by confidence and return the best candidate
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    if (candidates.length > 0) {
      const best = candidates[0];
      return {
        name: best.name,
        destination: best.destination,
        source: best.source,
        confidence: best.confidence
      };
    }

    return { confidence: 0 };
  }

  /**
   * Detect currency symbols and formats throughout the workbook
   */
  detectCurrency(): CurrencyDetectionResult {
    const currencyFindings: Map<string, {
      count: number;
      symbol: string;
      locations: Array<{ sheet: string; cell: string; value: string }>;
    }> = new Map();

    // Currency patterns
    const currencyPatterns = [
      { regex: /£|GBP/g, currency: 'GBP', symbol: '£' },
      { regex: /€|EUR/g, currency: 'EUR', symbol: '€' },
      { regex: /\$|USD/g, currency: 'USD', symbol: '$' },
      { regex: /¥|JPY/g, currency: 'JPY', symbol: '¥' },
      { regex: /CHF/g, currency: 'CHF', symbol: 'CHF' },
      { regex: /CAD/g, currency: 'CAD', symbol: 'C$' }
    ];

    // Search through all sheets
    for (const [sheetName, worksheet] of this.worksheets) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 50); row++) {
        for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 20); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            
            for (const pattern of currencyPatterns) {
              const matches = cellValue.match(pattern.regex);
              if (matches) {
                const key = pattern.currency;
                if (!currencyFindings.has(key)) {
                  currencyFindings.set(key, {
                    count: 0,
                    symbol: pattern.symbol,
                    locations: []
                  });
                }
                
                const finding = currencyFindings.get(key)!;
                finding.count += matches.length;
                finding.locations.push({
                  sheet: sheetName,
                  cell: cellAddress,
                  value: cellValue
                });
              }
            }
          }
        }
      }
    }

    // Determine the most likely currency
    let bestCurrency = 'EUR'; // Default
    let bestSymbol = '€';
    let maxCount = 0;
    let bestLocations: Array<{ sheet: string; cell: string; value: string }> = [];

    for (const [currency, finding] of currencyFindings) {
      if (finding.count > maxCount) {
        bestCurrency = currency;
        bestSymbol = finding.symbol;
        maxCount = finding.count;
        bestLocations = finding.locations;
      }
    }

    // Calculate confidence based on frequency and consistency
    const totalFindings = Array.from(currencyFindings.values()).reduce((sum, f) => sum + f.count, 0);
    const confidence = totalFindings > 0 ? Math.min(0.95, maxCount / totalFindings) : 0.3;

    return {
      currency: bestCurrency,
      symbol: bestSymbol,
      confidence,
      locations: bestLocations.slice(0, 5) // Limit to first 5 locations
    };
  }

  /**
   * Identify special periods like Easter, Peak Season, etc.
   */
  identifySpecialPeriods(): SpecialPeriod[] {
    const specialPeriods: SpecialPeriod[] = [];
    const periodPatterns = [
      {
        pattern: /easter/i,
        name: 'Easter',
        type: 'holiday' as const,
        description: 'Easter holiday period'
      },
      {
        pattern: /peak\s*season/i,
        name: 'Peak Season',
        type: 'season' as const,
        description: 'High demand period with premium pricing'
      },
      {
        pattern: /off\s*season/i,
        name: 'Off Season',
        type: 'season' as const,
        description: 'Low demand period with reduced pricing'
      },
      {
        pattern: /high\s*season/i,
        name: 'High Season',
        type: 'season' as const,
        description: 'High demand period'
      },
      {
        pattern: /low\s*season/i,
        name: 'Low Season',
        type: 'season' as const,
        description: 'Low demand period'
      },
      {
        pattern: /christmas/i,
        name: 'Christmas',
        type: 'holiday' as const,
        description: 'Christmas holiday period'
      },
      {
        pattern: /new\s*year/i,
        name: 'New Year',
        type: 'holiday' as const,
        description: 'New Year holiday period'
      },
      {
        pattern: /summer\s*holidays?/i,
        name: 'Summer Holidays',
        type: 'season' as const,
        description: 'Summer vacation period'
      },
      {
        pattern: /school\s*holidays?/i,
        name: 'School Holidays',
        type: 'season' as const,
        description: 'School vacation period'
      }
    ];

    // Search through all sheets for special period mentions
    for (const [sheetName, worksheet] of this.worksheets) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 100); row++) {
        for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 20); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            
            for (const periodPattern of periodPatterns) {
              if (periodPattern.pattern.test(cellValue)) {
                // Try to extract date information if present
                const dateRange = this.extractDateRangeFromText(cellValue);
                
                // Check if we already have this period
                const existing = specialPeriods.find(p => p.name === periodPattern.name);
                if (!existing) {
                  specialPeriods.push({
                    name: periodPattern.name,
                    type: periodPattern.type,
                    dateRange,
                    description: periodPattern.description
                  });
                }
              }
            }
          }
        }
      }
    }

    return specialPeriods;
  }

  /**
   * Extract date ranges from the workbook
   */
  private extractDateRanges(): {
    validFrom?: Date;
    validTo?: Date;
    season?: string;
    source?: string;
    confidence: number;
  } {
    const datePatterns = [
      /valid\s*from\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /valid\s*to\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*-\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /season\s*:?\s*(\d{4})/i,
      /(\d{4})\s*season/i
    ];

    let validFrom: Date | undefined;
    let validTo: Date | undefined;
    let season: string | undefined;
    let source: string | undefined;
    let confidence = 0;

    // Search through all sheets
    for (const [sheetName, worksheet] of this.worksheets) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 20); row++) {
        for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 10); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v) {
            const cellValue = String(cell.v);
            
            for (const pattern of datePatterns) {
              const match = cellValue.match(pattern);
              if (match) {
                if (pattern.source?.includes('valid from')) {
                  validFrom = this.parseDate(match[1]);
                  source = `${sheetName}:${cellAddress}`;
                  confidence = Math.max(confidence, 0.8);
                } else if (pattern.source?.includes('valid to')) {
                  validTo = this.parseDate(match[1]);
                  source = `${sheetName}:${cellAddress}`;
                  confidence = Math.max(confidence, 0.8);
                } else if (match[2]) {
                  // Date range pattern
                  validFrom = this.parseDate(match[1]);
                  validTo = this.parseDate(match[2]);
                  source = `${sheetName}:${cellAddress}`;
                  confidence = Math.max(confidence, 0.9);
                } else if (pattern.source?.includes('season')) {
                  season = match[1];
                  source = `${sheetName}:${cellAddress}`;
                  confidence = Math.max(confidence, 0.6);
                }
              }
            }
          }
        }
      }
    }

    return {
      validFrom,
      validTo,
      season,
      source,
      confidence
    };
  }

  /**
   * Analyze sheet name for resort information
   */
  private analyzeSheetNameForResort(sheetName: string): {
    name?: string;
    destination?: string;
    confidence: number;
  } {
    // Common patterns in sheet names
    const patterns = [
      // "Benidorm 2025" or "Albufeira Prices"
      /^([A-Za-z\s]+)\s*(\d{4}|prices?|rates?)/i,
      // "Resort Name - Details"
      /^([A-Za-z\s]+)\s*[-–]\s*/i,
      // Just the resort name
      /^([A-Za-z\s]{3,})/i
    ];

    for (const pattern of patterns) {
      const match = sheetName.match(pattern);
      if (match) {
        const name = match[1].trim();
        
        // Skip generic sheet names
        if (this.isGenericSheetName(name)) {
          continue;
        }

        // Check if it looks like a resort/destination name
        if (this.looksLikeResortName(name)) {
          return {
            name,
            destination: name, // For now, assume resort name is the destination
            confidence: 0.7
          };
        }
      }
    }

    return { confidence: 0 };
  }

  /**
   * Extract resort information from cell content
   */
  private extractResortFromCells(worksheet: XLSX.WorkSheet, sheetName: string): Array<{
    name: string;
    destination?: string;
    source: string;
    confidence: number;
  }> {
    const candidates: Array<{
      name: string;
      destination?: string;
      source: string;
      confidence: number;
    }> = [];

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Check first few rows and columns for resort names
    for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 10); row++) {
      for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 5); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
          const cellValue = String(cell.v).trim();
          
          // Look for resort/destination patterns
          const resortPatterns = [
            /resort\s*:?\s*([A-Za-z\s]+)/i,
            /destination\s*:?\s*([A-Za-z\s]+)/i,
            /location\s*:?\s*([A-Za-z\s]+)/i,
            /^([A-Za-z\s]{5,})\s*(resort|hotel|destination)/i
          ];

          for (const pattern of resortPatterns) {
            const match = cellValue.match(pattern);
            if (match) {
              const name = match[1].trim();
              if (this.looksLikeResortName(name)) {
                candidates.push({
                  name,
                  destination: name,
                  source: `${sheetName}:${cellAddress}`,
                  confidence: 0.6
                });
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Check if a name looks like a resort/destination name
   */
  private looksLikeResortName(name: string): boolean {
    // Must be at least 3 characters
    if (name.length < 3) return false;
    
    // Should contain mostly letters and spaces
    if (!/^[A-Za-z\s\-']+$/.test(name)) return false;
    
    // Should not be all uppercase (likely a header)
    if (name === name.toUpperCase() && name.length > 10) return false;
    
    // Should not contain common non-resort words
    const excludeWords = ['sheet', 'data', 'table', 'price', 'rate', 'month', 'year', 'total', 'summary'];
    const lowerName = name.toLowerCase();
    if (excludeWords.some(word => lowerName.includes(word))) return false;
    
    return true;
  }

  /**
   * Check if a sheet name is generic
   */
  private isGenericSheetName(name: string): boolean {
    const genericNames = [
      'sheet1', 'sheet2', 'sheet3', 'data', 'prices', 'rates', 'table',
      'summary', 'total', 'main', 'primary', 'default'
    ];
    
    return genericNames.includes(name.toLowerCase());
  }

  /**
   * Extract date range from text
   */
  private extractDateRangeFromText(text: string): {
    start?: Date;
    end?: Date;
  } | undefined {
    const dateRangePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[-–]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const match = text.match(dateRangePattern);
    
    if (match) {
      return {
        start: this.parseDate(match[1]),
        end: this.parseDate(match[2])
      };
    }
    
    return undefined;
  }

  /**
   * Parse date string into Date object
   */
  private parseDate(dateString: string): Date | undefined {
    try {
      // Handle various date formats
      const formats = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,   // DD/MM/YY or MM/DD/YY
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/    // YYYY/MM/DD
      ];

      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          let year = parseInt(match[3]);
          let month = parseInt(match[2]);
          let day = parseInt(match[1]);

          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }

          // For YYYY/MM/DD format, swap day and month
          if (format === formats[2]) {
            [day, month] = [month, day];
          }

          // Create date (month is 0-indexed in JavaScript)
          const date = new Date(year, month - 1, day);
          
          // Validate the date
          if (date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            return date;
          }
        }
      }
    } catch (error) {
      // Invalid date
    }
    
    return undefined;
  }
}