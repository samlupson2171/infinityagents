/**
 * Excel Content Classifier - Identifies and classifies content types in Excel cells
 */

export interface MonthDetectionResult {
  isMonth: boolean;
  monthName: string;
  format: 'full' | 'abbreviated' | 'special';
  confidence: number;
  normalizedName: string;
}

export interface AccommodationDetectionResult {
  isAccommodation: boolean;
  type: string;
  confidence: number;
  category: 'hotel' | 'self-catering' | 'apartment' | 'villa' | 'hostel' | 'resort' | 'other';
}

export interface NightsPaxDetectionResult {
  hasNights: boolean;
  hasPax: boolean;
  nights?: number;
  pax?: number;
  pattern: string;
  confidence: number;
}

export interface ContentClassification {
  type: 'month' | 'accommodation' | 'nights-pax' | 'price' | 'text' | 'empty';
  confidence: number;
  details: any;
}

/**
 * Content Classifier for Excel cells
 */
export class ExcelContentClassifier {
  private monthPatterns: Map<RegExp, { name: string; format: 'full' | 'abbreviated' | 'special' }>;
  private accommodationPatterns: Map<RegExp, { type: string; category: string }>;
  private nightsPaxPatterns: RegExp[];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Classifies the content of a cell
   */
  classifyContent(cellValue: any): ContentClassification {
    if (!cellValue || cellValue === '') {
      return {
        type: 'empty',
        confidence: 1.0,
        details: {}
      };
    }

    const stringValue = String(cellValue).trim();

    // Check for month
    const monthResult = this.detectMonth(stringValue);
    if (monthResult.isMonth && monthResult.confidence > 0.7) {
      return {
        type: 'month',
        confidence: monthResult.confidence,
        details: monthResult
      };
    }

    // Check for accommodation type
    const accommodationResult = this.detectAccommodationType(stringValue);
    if (accommodationResult.isAccommodation && accommodationResult.confidence > 0.6) {
      return {
        type: 'accommodation',
        confidence: accommodationResult.confidence,
        details: accommodationResult
      };
    }

    // Check for nights/pax pattern
    const nightsPaxResult = this.detectNightsPaxPattern(stringValue);
    if ((nightsPaxResult.hasNights || nightsPaxResult.hasPax) && nightsPaxResult.confidence > 0.3) {
      return {
        type: 'nights-pax',
        confidence: nightsPaxResult.confidence,
        details: nightsPaxResult
      };
    }

    // Check for price
    if (this.isPriceValue(stringValue)) {
      return {
        type: 'price',
        confidence: 0.8,
        details: { value: this.parsePrice(stringValue) }
      };
    }

    // Default to text
    return {
      type: 'text',
      confidence: 0.5,
      details: { text: stringValue }
    };
  }

  /**
   * Detects month names in various formats
   */
  detectMonth(value: string): MonthDetectionResult {
    const lowerValue = value.toLowerCase().trim();
    
    for (const [pattern, info] of this.monthPatterns) {
      if (pattern.test(lowerValue)) {
        const confidence = this.calculateMonthConfidence(lowerValue, info.format);
        return {
          isMonth: true,
          monthName: value,
          format: info.format,
          confidence,
          normalizedName: info.name
        };
      }
    }

    return {
      isMonth: false,
      monthName: value,
      format: 'full',
      confidence: 0,
      normalizedName: ''
    };
  }

  /**
   * Detects accommodation types
   */
  detectAccommodationType(value: string): AccommodationDetectionResult {
    const lowerValue = value.toLowerCase().trim();
    
    for (const [pattern, info] of this.accommodationPatterns) {
      if (pattern.test(lowerValue)) {
        const confidence = this.calculateAccommodationConfidence(lowerValue, info.type);
        return {
          isAccommodation: true,
          type: info.type,
          confidence,
          category: info.category as any
        };
      }
    }

    return {
      isAccommodation: false,
      type: value,
      confidence: 0,
      category: 'other'
    };
  }

  /**
   * Detects nights and pax patterns in headers
   */
  detectNightsPaxPattern(value: string): NightsPaxDetectionResult {
    const lowerValue = value.toLowerCase().trim();
    let hasNights = false;
    let hasPax = false;
    let nights: number | undefined;
    let pax: number | undefined;
    let confidence = 0;
    let pattern = '';

    // Check for nights patterns
    const nightsPatterns = [
      /(\d+)\s*nights?/i,
      /(\d+)\s*n/i,
      /(\d+)\s*day/i,
      /nights?\s*(\d+)/i,
      /n\s*(\d+)/i
    ];

    for (const nightsPattern of nightsPatterns) {
      const match = value.match(nightsPattern);
      if (match) {
        hasNights = true;
        nights = parseInt(match[1]);
        pattern += `${nights}N `;
        confidence += 0.4;
        break;
      }
    }

    // Check for pax patterns
    const paxPatterns = [
      /(\d+)\s*(pax|people|persons?|adults?|guests?)/i,
      /(pax|people|persons?|adults?|guests?)\s*(\d+)/i,
      /(\d+)\s*p/i,
      /p\s*(\d+)/i
    ];

    for (const paxPattern of paxPatterns) {
      const match = value.match(paxPattern);
      if (match) {
        hasPax = true;
        // Handle both capture group orders
        pax = parseInt(match[1]) || parseInt(match[2]);
        pattern += `${pax}P`;
        confidence += 0.4;
        break;
      }
    }

    // Check for combined patterns like "2N/4P" or "3 nights 2 people"
    const combinedPatterns = [
      /(\d+)\s*n\s*\/?\s*(\d+)\s*p/i,
      /(\d+)\s*nights?\s*\/?\s*(\d+)\s*(pax|people|persons?)/i,
      /(\d+)\s*(pax|people|persons?)\s*\/?\s*(\d+)\s*nights?/i
    ];

    for (const combinedPattern of combinedPatterns) {
      const match = value.match(combinedPattern);
      if (match) {
        hasNights = true;
        hasPax = true;
        nights = parseInt(match[1]);
        pax = parseInt(match[2]) || parseInt(match[3]);
        pattern = `${nights}N/${pax}P`;
        confidence = 0.9;
        break;
      }
    }

    return {
      hasNights,
      hasPax,
      nights,
      pax,
      pattern: pattern.trim(),
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Batch classify multiple values
   */
  classifyBatch(values: any[]): ContentClassification[] {
    return values.map(value => this.classifyContent(value));
  }

  /**
   * Analyzes a row or column to determine its primary content type
   */
  analyzeSequence(values: any[]): {
    primaryType: string;
    confidence: number;
    distribution: Record<string, number>;
    details: ContentClassification[];
  } {
    const classifications = this.classifyBatch(values);
    const distribution: Record<string, number> = {};
    
    // Count occurrences of each type
    for (const classification of classifications) {
      distribution[classification.type] = (distribution[classification.type] || 0) + 1;
    }

    // Find the most common type
    let primaryType = 'text';
    let maxCount = 0;
    
    for (const [type, count] of Object.entries(distribution)) {
      if (count > maxCount && type !== 'empty') {
        primaryType = type;
        maxCount = count;
      }
    }

    // Calculate confidence based on consistency
    const totalNonEmpty = classifications.filter(c => c.type !== 'empty').length;
    const confidence = totalNonEmpty > 0 ? maxCount / totalNonEmpty : 0;

    return {
      primaryType,
      confidence,
      distribution,
      details: classifications
    };
  }

  /**
   * Detects if a sequence contains months in order
   */
  detectMonthSequence(values: any[]): {
    isSequence: boolean;
    months: string[];
    confidence: number;
    gaps: number[];
  } {
    const monthResults = values.map(v => this.detectMonth(String(v || '')));
    const detectedMonths = monthResults.filter(r => r.isMonth);
    
    if (detectedMonths.length < 3) {
      return {
        isSequence: false,
        months: [],
        confidence: 0,
        gaps: []
      };
    }

    // Check if months are in chronological order
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthIndices = detectedMonths.map(m => 
      monthOrder.findIndex(month => month === m.normalizedName)
    ).filter(index => index !== -1);

    let isSequential = true;
    const gaps: number[] = [];
    
    for (let i = 1; i < monthIndices.length; i++) {
      const gap = monthIndices[i] - monthIndices[i - 1];
      gaps.push(gap);
      if (gap !== 1 && gap !== -11) { // -11 for December to January wrap
        isSequential = false;
      }
    }

    const confidence = isSequential ? 0.9 : Math.max(0.3, detectedMonths.length / values.length);

    return {
      isSequence: isSequential,
      months: detectedMonths.map(m => m.normalizedName),
      confidence,
      gaps
    };
  }

  /**
   * Initialize all pattern mappings
   */
  private initializePatterns(): void {
    // Month patterns
    this.monthPatterns = new Map([
      // Full month names
      [/^january$/i, { name: 'January', format: 'full' }],
      [/^february$/i, { name: 'February', format: 'full' }],
      [/^march$/i, { name: 'March', format: 'full' }],
      [/^april$/i, { name: 'April', format: 'full' }],
      [/^may$/i, { name: 'May', format: 'full' }],
      [/^june$/i, { name: 'June', format: 'full' }],
      [/^july$/i, { name: 'July', format: 'full' }],
      [/^august$/i, { name: 'August', format: 'full' }],
      [/^september$/i, { name: 'September', format: 'full' }],
      [/^october$/i, { name: 'October', format: 'full' }],
      [/^november$/i, { name: 'November', format: 'full' }],
      [/^december$/i, { name: 'December', format: 'full' }],
      
      // Abbreviated month names
      [/^jan$/i, { name: 'January', format: 'abbreviated' }],
      [/^feb$/i, { name: 'February', format: 'abbreviated' }],
      [/^mar$/i, { name: 'March', format: 'abbreviated' }],
      [/^apr$/i, { name: 'April', format: 'abbreviated' }],
      [/^jun$/i, { name: 'June', format: 'abbreviated' }],
      [/^jul$/i, { name: 'July', format: 'abbreviated' }],
      [/^aug$/i, { name: 'August', format: 'abbreviated' }],
      [/^sep$/i, { name: 'September', format: 'abbreviated' }],
      [/^sept$/i, { name: 'September', format: 'abbreviated' }],
      [/^oct$/i, { name: 'October', format: 'abbreviated' }],
      [/^nov$/i, { name: 'November', format: 'abbreviated' }],
      [/^dec$/i, { name: 'December', format: 'abbreviated' }],
      
      // Special periods
      [/easter/i, { name: 'Easter', format: 'special' }],
      [/peak\s*season/i, { name: 'Peak Season', format: 'special' }],
      [/off\s*season/i, { name: 'Off Season', format: 'special' }],
      [/high\s*season/i, { name: 'High Season', format: 'special' }],
      [/low\s*season/i, { name: 'Low Season', format: 'special' }],
      [/summer/i, { name: 'Summer', format: 'special' }],
      [/winter/i, { name: 'Winter', format: 'special' }],
      [/spring/i, { name: 'Spring', format: 'special' }],
      [/autumn/i, { name: 'Autumn', format: 'special' }],
      [/fall/i, { name: 'Fall', format: 'special' }]
    ]);

    // Accommodation patterns
    this.accommodationPatterns = new Map([
      // Hotel types
      [/\bhotel\b/i, { type: 'Hotel', category: 'hotel' }],
      [/\b(boutique|luxury|budget)\s*hotel\b/i, { type: 'Hotel', category: 'hotel' }],
      [/\bresort\b/i, { type: 'Resort', category: 'resort' }],
      [/\b(beach|ski|golf)\s*resort\b/i, { type: 'Resort', category: 'resort' }],
      
      // Self-catering types
      [/self[\s-]?catering/i, { type: 'Self-Catering', category: 'self-catering' }],
      [/\bapartment\b/i, { type: 'Apartment', category: 'apartment' }],
      [/\bapt\b/i, { type: 'Apartment', category: 'apartment' }],
      [/\bstudio\b/i, { type: 'Studio', category: 'apartment' }],
      [/\bflat\b/i, { type: 'Apartment', category: 'apartment' }],
      
      // Villa types
      [/\bvilla\b/i, { type: 'Villa', category: 'villa' }],
      [/\bhouse\b/i, { type: 'House', category: 'villa' }],
      [/\bcottage\b/i, { type: 'Cottage', category: 'villa' }],
      [/\bcabin\b/i, { type: 'Cabin', category: 'villa' }],
      
      // Hostel types
      [/\bhostel\b/i, { type: 'Hostel', category: 'hostel' }],
      [/\bbackpacker/i, { type: 'Hostel', category: 'hostel' }],
      [/\bdorm/i, { type: 'Hostel', category: 'hostel' }],
      
      // B&B types
      [/\bb&b\b/i, { type: 'B&B', category: 'hotel' }],
      [/bed\s*and\s*breakfast/i, { type: 'B&B', category: 'hotel' }],
      [/\bguesthouse\b/i, { type: 'Guesthouse', category: 'hotel' }],
      [/\binn\b/i, { type: 'Inn', category: 'hotel' }],
      [/\blodge\b/i, { type: 'Lodge', category: 'hotel' }],
      
      // Room types
      [/\bsingle\b/i, { type: 'Single Room', category: 'hotel' }],
      [/\bdouble\b/i, { type: 'Double Room', category: 'hotel' }],
      [/\btwin\b/i, { type: 'Twin Room', category: 'hotel' }],
      [/\btriple\b/i, { type: 'Triple Room', category: 'hotel' }],
      [/\bfamily\s*room\b/i, { type: 'Family Room', category: 'hotel' }],
      [/\bsuite\b/i, { type: 'Suite', category: 'hotel' }]
    ]);
  }

  /**
   * Calculate confidence score for month detection
   */
  private calculateMonthConfidence(value: string, format: string): number {
    let confidence = 0.8; // Base confidence
    
    if (format === 'full') {
      confidence = 0.95; // Full month names are most reliable
    } else if (format === 'abbreviated') {
      confidence = 0.85; // Abbreviated are quite reliable
    } else if (format === 'special') {
      confidence = 0.7; // Special periods are less certain
    }
    
    // Reduce confidence if there are extra characters
    if (value.length > 12) {
      confidence *= 0.8;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate confidence score for accommodation detection
   */
  private calculateAccommodationConfidence(value: string, type: string): number {
    let confidence = 0.7; // Base confidence
    
    // Exact matches get higher confidence
    if (value.toLowerCase() === type.toLowerCase()) {
      confidence = 0.95;
    }
    
    // Longer descriptions might be less certain
    if (value.length > 20) {
      confidence *= 0.8;
    }
    
    // Multiple words might indicate a more specific type
    const wordCount = value.split(/\s+/).length;
    if (wordCount > 3) {
      confidence *= 0.9;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Check if a value looks like a price
   */
  private isPriceValue(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    
    // Remove common currency symbols and spaces
    const cleaned = value.replace(/[£$€\s,]/g, '');
    
    // Check if it's a number or number with decimal places
    return /^\d+(\.\d{1,2})?$/.test(cleaned) && parseFloat(cleaned) > 0;
  }

  /**
   * Parse price from string
   */
  private parsePrice(value: string): number {
    const cleaned = value.replace(/[£$€\s,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}