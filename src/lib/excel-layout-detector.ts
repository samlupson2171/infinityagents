import * as XLSX from 'xlsx';

export interface LayoutPattern {
  type: 'months-rows' | 'months-columns' | 'pricing-matrix' | 'inclusions-list';
  confidence: number;
  startCell: string;
  endCell: string;
  headers: string[];
  dataPattern: string;
  metadata?: {
    monthsDetected?: string[];
    accommodationTypes?: string[];
    pricingStructure?: string;
  };
}

export interface DetectionResult {
  primaryLayout: LayoutPattern;
  secondaryLayouts: LayoutPattern[];
  suggestions: string[];
  confidence: number;
}

export interface PricingSection {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  accommodationTypes: string[];
  nightsOptions: number[];
  paxOptions: number[];
  layout: 'months-rows' | 'months-columns';
}

export interface InclusionsSection {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  content: string[];
  format: 'bullet-points' | 'numbered' | 'plain-text';
}

/**
 * Excel Layout Detector - Analyzes Excel structure and detects patterns
 */
export class ExcelLayoutDetector {
  private worksheet: XLSX.WorkSheet;
  private cellData: any[][];
  private range: XLSX.Range;

  constructor(worksheet: XLSX.WorkSheet) {
    this.worksheet = worksheet;
    this.range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    this.cellData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: true,
      range: this.range
    }) as any[][];
  }

  /**
   * Main detection method that analyzes the entire worksheet
   */
  detectLayout(): DetectionResult {
    const patterns: LayoutPattern[] = [];

    // Detect different layout patterns
    patterns.push(...this.detectMonthsInRowsPattern());
    patterns.push(...this.detectMonthsInColumnsPattern());
    patterns.push(...this.detectPricingMatrixPattern());
    patterns.push(...this.detectInclusionsListPattern());

    // Sort by confidence score
    patterns.sort((a, b) => b.confidence - a.confidence);

    // Ensure we have at least one pattern
    const primaryLayout = patterns[0] || {
      type: 'pricing-matrix' as const,
      confidence: 0.1,
      startCell: 'A1',
      endCell: 'A1',
      headers: [],
      dataPattern: 'unknown',
      metadata: {}
    };
    const secondaryLayouts = patterns.slice(1);

    // Generate suggestions based on detected patterns
    const suggestions = this.generateSuggestions(patterns);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(patterns);

    return {
      primaryLayout,
      secondaryLayouts,
      suggestions,
      confidence
    };
  }

  /**
   * Detects months-in-rows layout pattern
   */
  private detectMonthsInRowsPattern(): LayoutPattern[] {
    const patterns: LayoutPattern[] = [];
    const monthPatterns = this.getMonthPatterns();

    for (let row = 0; row < Math.min(this.cellData.length, 20); row++) {
      const rowData = this.cellData[row] || [];
      
      // Check if first column contains months
      const firstCellValue = String(rowData[0] || '').toLowerCase().trim();
      
      for (const monthPattern of monthPatterns) {
        if (monthPattern.test(firstCellValue)) {
          // Found a month in first column, analyze the pattern
          const pattern = this.analyzeMonthsInRowsPattern(row);
          if (pattern) {
            patterns.push(pattern);
          }
          break;
        }
      }
    }

    return patterns;
  }

  /**
   * Detects months-in-columns layout pattern
   */
  private detectMonthsInColumnsPattern(): LayoutPattern[] {
    const patterns: LayoutPattern[] = [];
    const monthPatterns = this.getMonthPatterns();

    // Check first few rows for month headers
    for (let row = 0; row < Math.min(this.cellData.length, 5); row++) {
      const rowData = this.cellData[row] || [];
      let monthsFound = 0;
      const monthPositions: number[] = [];

      for (let col = 1; col < rowData.length; col++) { // Start from col 1 to skip row headers
        const cellValue = String(rowData[col] || '').toLowerCase().trim();
        
        for (const monthPattern of monthPatterns) {
          if (monthPattern.test(cellValue)) {
            monthsFound++;
            monthPositions.push(col);
            break;
          }
        }
      }

      // If we found multiple months in a row, it's likely a months-in-columns layout
      if (monthsFound >= 3) {
        const pattern = this.analyzeMonthsInColumnsPattern(row, monthPositions);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Detects pricing matrix patterns
   */
  private detectPricingMatrixPattern(): LayoutPattern[] {
    const patterns: LayoutPattern[] = [];
    
    // Look for pricing patterns (numbers with currency symbols or in price ranges)
    for (let row = 1; row < this.cellData.length; row++) {
      const rowData = this.cellData[row] || [];
      let priceCount = 0;
      const pricePositions: number[] = [];

      for (let col = 1; col < rowData.length; col++) {
        const cellValue = String(rowData[col] || '');
        if (this.isPriceValue(cellValue)) {
          priceCount++;
          pricePositions.push(col);
        }
      }

      // If we found multiple prices in a row, analyze the matrix structure
      if (priceCount >= 3) {
        const pattern = this.analyzePricingMatrixPattern(row, pricePositions);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Detects inclusions list patterns
   */
  private detectInclusionsListPattern(): LayoutPattern[] {
    const patterns: LayoutPattern[] = [];
    const inclusionKeywords = ['inclusions', 'included', 'includes', 'package includes', 'what\'s included'];

    for (let row = 0; row < this.cellData.length; row++) {
      const rowData = this.cellData[row] || [];
      
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = String(rowData[col] || '').toLowerCase().trim();
        
        if (inclusionKeywords.some(keyword => cellValue.includes(keyword))) {
          // Found inclusions section, analyze the pattern
          const pattern = this.analyzeInclusionsPattern(row, col);
          if (pattern) {
            patterns.push(pattern);
          }
        }
        
        // Also check for bullet point patterns that might indicate inclusions
        if (cellValue.match(/^[•\-\*]/)) {
          const pattern = this.analyzeInclusionsPattern(row - 1, col); // Check if previous row has header
          if (pattern) {
            patterns.push(pattern);
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Analyzes months-in-rows pattern starting from a specific row
   */
  private analyzeMonthsInRowsPattern(startRow: number): LayoutPattern | null {
    const monthsDetected: string[] = [];
    let endRow = startRow;
    const monthPatterns = this.getMonthPatterns();

    // Scan consecutive rows for months
    for (let row = startRow; row < Math.min(this.cellData.length, startRow + 15); row++) {
      const rowData = this.cellData[row] || [];
      const firstCellValue = String(rowData[0] || '').toLowerCase().trim();
      
      let monthFound = false;
      for (const monthPattern of monthPatterns) {
        if (monthPattern.test(firstCellValue)) {
          monthsDetected.push(firstCellValue);
          endRow = row;
          monthFound = true;
          break;
        }
      }
      
      // If no month found and we have some months, we might have reached the end
      if (!monthFound && monthsDetected.length > 0) {
        break;
      }
    }

    if (monthsDetected.length < 2) { // Reduced threshold for testing
      return null; // Not enough months to be confident
    }

    // Analyze headers to detect accommodation types and pricing structure
    const headers = this.extractHeaders(startRow - 1, 1, 10);
    const accommodationTypes = this.detectAccommodationTypes(headers);

    const confidence = this.calculatePatternConfidence('months-rows', {
      monthsCount: monthsDetected.length,
      hasHeaders: headers.length > 0,
      accommodationTypes: accommodationTypes.length
    });

    return {
      type: 'months-rows',
      confidence,
      startCell: XLSX.utils.encode_cell({ r: startRow, c: 0 }),
      endCell: XLSX.utils.encode_cell({ r: endRow, c: 10 }),
      headers,
      dataPattern: 'months-in-first-column',
      metadata: {
        monthsDetected,
        accommodationTypes,
        pricingStructure: 'horizontal'
      }
    };
  }

  /**
   * Analyzes months-in-columns pattern starting from a specific row
   */
  private analyzeMonthsInColumnsPattern(headerRow: number, monthPositions: number[]): LayoutPattern | null {
    const rowData = this.cellData[headerRow] || [];
    const monthsDetected = monthPositions.map(pos => String(rowData[pos] || '').trim());
    
    // Look for row headers (accommodation types, nights/pax info)
    const rowHeaders: string[] = [];
    for (let row = headerRow + 1; row < Math.min(this.cellData.length, headerRow + 20); row++) {
      const firstCell = String(this.cellData[row]?.[0] || '').trim();
      if (firstCell && !this.isPriceValue(firstCell)) {
        rowHeaders.push(firstCell);
      }
    }

    const accommodationTypes = this.detectAccommodationTypes(rowHeaders);

    const confidence = this.calculatePatternConfidence('months-columns', {
      monthsCount: monthsDetected.length,
      hasRowHeaders: rowHeaders.length > 0,
      accommodationTypes: accommodationTypes.length
    });

    return {
      type: 'months-columns',
      confidence,
      startCell: XLSX.utils.encode_cell({ r: headerRow, c: 0 }),
      endCell: XLSX.utils.encode_cell({ r: headerRow + 20, c: monthPositions[monthPositions.length - 1] }),
      headers: monthsDetected,
      dataPattern: 'months-in-header-row',
      metadata: {
        monthsDetected,
        accommodationTypes,
        pricingStructure: 'vertical'
      }
    };
  }

  /**
   * Analyzes pricing matrix pattern
   */
  private analyzePricingMatrixPattern(row: number, pricePositions: number[]): LayoutPattern | null {
    // Analyze the structure around the pricing data
    const headers = this.extractHeaders(row - 1, 0, pricePositions[pricePositions.length - 1] + 1);
    const rowLabel = String(this.cellData[row]?.[0] || '').trim();

    const confidence = this.calculatePatternConfidence('pricing-matrix', {
      priceCount: pricePositions.length,
      hasHeaders: headers.length > 0,
      hasRowLabel: rowLabel.length > 0
    });

    return {
      type: 'pricing-matrix',
      confidence,
      startCell: XLSX.utils.encode_cell({ r: row, c: 0 }),
      endCell: XLSX.utils.encode_cell({ r: row, c: pricePositions[pricePositions.length - 1] }),
      headers,
      dataPattern: 'price-matrix',
      metadata: {
        pricingStructure: 'matrix'
      }
    };
  }

  /**
   * Analyzes inclusions pattern
   */
  private analyzeInclusionsPattern(row: number, col: number): LayoutPattern | null {
    const inclusionItems: string[] = [];
    let format: 'bullet-points' | 'numbered' | 'plain-text' = 'plain-text';

    // Scan following rows/cells for inclusion items
    for (let r = row + 1; r < Math.min(this.cellData.length, row + 20); r++) {
      const cellValue = String(this.cellData[r]?.[col] || '').trim();
      
      if (cellValue) {
        inclusionItems.push(cellValue);
        
        // Detect format
        if (cellValue.match(/^[•\-\*]/)) {
          format = 'bullet-points';
        } else if (cellValue.match(/^\d+\./)) {
          format = 'numbered';
        }
      } else if (inclusionItems.length > 0) {
        // Empty cell might indicate end of inclusions
        break;
      }
    }

    if (inclusionItems.length < 2) {
      return null; // Not enough items to be confident
    }

    const confidence = this.calculatePatternConfidence('inclusions-list', {
      itemCount: inclusionItems.length,
      hasFormat: format !== 'plain-text'
    });

    return {
      type: 'inclusions-list',
      confidence,
      startCell: XLSX.utils.encode_cell({ r: row, c: col }),
      endCell: XLSX.utils.encode_cell({ r: row + inclusionItems.length, c: col }),
      headers: [String(this.cellData[row]?.[col] || '')],
      dataPattern: format,
      metadata: {}
    };
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
   * Checks if a value looks like a price
   */
  private isPriceValue(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    // Remove common currency symbols and spaces
    const cleaned = value.replace(/[£$€\s,]/g, '');
    
    // Check if it's a number or number with decimal places
    return /^\d+(\.\d{1,2})?$/.test(cleaned) && parseFloat(cleaned) > 0;
  }

  /**
   * Extracts headers from a specific row range
   */
  private extractHeaders(row: number, startCol: number, endCol: number): string[] {
    if (row < 0 || row >= this.cellData.length) return [];
    
    const rowData = this.cellData[row] || [];
    const headers: string[] = [];
    
    for (let col = startCol; col < Math.min(endCol, rowData.length); col++) {
      const cellValue = String(rowData[col] || '').trim();
      if (cellValue) {
        headers.push(cellValue);
      }
    }
    
    return headers;
  }

  /**
   * Detects accommodation types from headers or labels
   */
  private detectAccommodationTypes(headers: string[]): string[] {
    const accommodationKeywords = [
      'hotel', 'self-catering', 'apartment', 'villa', 'hostel', 'resort',
      'b&b', 'bed and breakfast', 'guesthouse', 'lodge', 'cabin'
    ];
    
    const detected: string[] = [];
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase();
      for (const keyword of accommodationKeywords) {
        if (lowerHeader.includes(keyword)) {
          detected.push(header);
          break;
        }
      }
    }
    
    return detected;
  }

  /**
   * Calculates confidence score for a specific pattern type
   */
  private calculatePatternConfidence(type: string, factors: any): number {
    let confidence = 0;
    
    switch (type) {
      case 'months-rows':
        confidence = Math.min(0.9, 0.3 + (factors.monthsCount * 0.05));
        if (factors.hasHeaders) confidence += 0.2;
        if (factors.accommodationTypes > 0) confidence += 0.1;
        break;
        
      case 'months-columns':
        confidence = Math.min(0.95, 0.4 + (factors.monthsCount * 0.08)); // Higher base confidence
        if (factors.hasRowHeaders) confidence += 0.2;
        if (factors.accommodationTypes > 0) confidence += 0.1;
        break;
        
      case 'pricing-matrix':
        confidence = Math.min(0.8, 0.2 + (factors.priceCount * 0.08));
        if (factors.hasHeaders) confidence += 0.2;
        if (factors.hasRowLabel) confidence += 0.1;
        break;
        
      case 'inclusions-list':
        confidence = Math.min(0.7, 0.3 + (factors.itemCount * 0.05));
        if (factors.hasFormat) confidence += 0.2;
        break;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculates overall confidence based on all detected patterns
   */
  private calculateOverallConfidence(patterns: LayoutPattern[]): number {
    if (patterns.length === 0) return 0;
    
    // Weight the confidence by pattern importance
    const weights = {
      'months-rows': 0.4,
      'months-columns': 0.4,
      'pricing-matrix': 0.3,
      'inclusions-list': 0.2
    };
    
    let totalWeightedConfidence = 0;
    let totalWeight = 0;
    
    for (const pattern of patterns) {
      const weight = weights[pattern.type] || 0.1;
      totalWeightedConfidence += pattern.confidence * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
  }

  /**
   * Generates suggestions based on detected patterns
   */
  private generateSuggestions(patterns: LayoutPattern[]): string[] {
    const suggestions: string[] = [];
    
    if (patterns.length === 0) {
      suggestions.push('No clear layout pattern detected. Please ensure the Excel file contains recognizable month names and pricing data.');
      return suggestions;
    }
    
    const primaryPattern = patterns[0];
    
    if (primaryPattern.confidence < 0.5) {
      suggestions.push('Layout detection confidence is low. Consider reformatting the Excel file for better recognition.');
    }
    
    if (primaryPattern.type === 'months-rows') {
      suggestions.push('Detected months in rows layout. Ensure pricing data is in columns to the right of month names.');
    } else if (primaryPattern.type === 'months-columns') {
      suggestions.push('Detected months in columns layout. Ensure pricing data is in rows below month headers.');
    }
    
    const hasInclusions = patterns.some(p => p.type === 'inclusions-list');
    if (!hasInclusions) {
      suggestions.push('No inclusions section detected. Consider adding a clearly labeled inclusions section.');
    }
    
    const hasPricing = patterns.some(p => p.type === 'pricing-matrix' || p.type.includes('months'));
    if (!hasPricing) {
      suggestions.push('No pricing data detected. Ensure prices are formatted as numbers with optional currency symbols.');
    }
    
    return suggestions;
  }

  /**
   * Finds the pricing section in the worksheet
   */
  findPricingSection(): PricingSection | null {
    const result = this.detectLayout();
    let pricingPattern = result.primaryLayout;
    
    // If primary layout is not pricing-related, check secondary layouts
    if (!pricingPattern || (!pricingPattern.type.includes('months') && pricingPattern.type !== 'pricing-matrix')) {
      pricingPattern = result.secondaryLayouts.find(p => 
        p.type.includes('months') || p.type === 'pricing-matrix'
      );
    }
    
    if (!pricingPattern || (!pricingPattern.type.includes('months') && pricingPattern.type !== 'pricing-matrix')) {
      return null;
    }
    
    const startCell = XLSX.utils.decode_cell(pricingPattern.startCell);
    const endCell = XLSX.utils.decode_cell(pricingPattern.endCell);
    
    return {
      startRow: startCell.r,
      endRow: endCell.r,
      startCol: startCell.c,
      endCol: endCell.c,
      accommodationTypes: pricingPattern.metadata?.accommodationTypes || [],
      nightsOptions: this.extractNightsOptions(pricingPattern),
      paxOptions: this.extractPaxOptions(pricingPattern),
      layout: pricingPattern.type === 'months-rows' ? 'months-rows' : 'months-columns'
    };
  }

  /**
   * Finds the inclusions section in the worksheet
   */
  findInclusionsSection(): InclusionsSection | null {
    const result = this.detectLayout();
    const inclusionsPattern = result.secondaryLayouts.find(p => p.type === 'inclusions-list') || 
                             (result.primaryLayout.type === 'inclusions-list' ? result.primaryLayout : null);
    
    if (!inclusionsPattern) {
      return null;
    }
    
    const startCell = XLSX.utils.decode_cell(inclusionsPattern.startCell);
    const endCell = XLSX.utils.decode_cell(inclusionsPattern.endCell);
    
    // Extract content from the section
    const content: string[] = [];
    for (let row = startCell.r + 1; row <= endCell.r; row++) {
      const cellValue = String(this.cellData[row]?.[startCell.c] || '').trim();
      if (cellValue) {
        content.push(cellValue);
      }
    }
    
    return {
      startRow: startCell.r,
      endRow: endCell.r,
      startCol: startCell.c,
      endCol: endCell.c,
      content,
      format: inclusionsPattern.dataPattern as 'bullet-points' | 'numbered' | 'plain-text'
    };
  }

  /**
   * Extracts nights options from pattern headers
   */
  private extractNightsOptions(pattern: LayoutPattern): number[] {
    const nights: number[] = [];
    const nightsRegex = /(\d+)\s*nights?/i;
    
    for (const header of pattern.headers) {
      const match = header.match(nightsRegex);
      if (match) {
        nights.push(parseInt(match[1]));
      }
    }
    
    return nights.length > 0 ? nights : [2, 3, 4, 7]; // Default options
  }

  /**
   * Extracts pax options from pattern headers
   */
  private extractPaxOptions(pattern: LayoutPattern): number[] {
    const pax: number[] = [];
    const paxRegex = /(\d+)\s*(pax|people|persons?)/i;
    
    for (const header of pattern.headers) {
      const match = header.match(paxRegex);
      if (match) {
        pax.push(parseInt(match[1]));
      }
    }
    
    return pax.length > 0 ? pax : [2, 4, 6]; // Default options
  }
}