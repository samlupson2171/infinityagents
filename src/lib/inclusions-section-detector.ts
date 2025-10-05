import * as XLSX from 'xlsx';

/**
 * Detected inclusions section information
 */
export interface InclusionsSection {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  content: string[];
  format: 'bullet-points' | 'numbered' | 'plain-text' | 'mixed';
  accommodationType?: string;
  confidence: number;
  headerText?: string;
}

/**
 * Inclusions detection result for multiple sections
 */
export interface InclusionsDetectionResult {
  sections: InclusionsSection[];
  byAccommodationType: Map<string, InclusionsSection>;
  globalInclusions?: InclusionsSection;
  confidence: number;
  suggestions: string[];
}

/**
 * Inclusions Section Detector - Identifies and extracts inclusions from Excel files
 */
export class InclusionsSectionDetector {
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
   * Main detection method that finds all inclusions sections
   */
  detectInclusionsSections(): InclusionsDetectionResult {
    const sections: InclusionsSection[] = [];
    const byAccommodationType = new Map<string, InclusionsSection>();
    let globalInclusions: InclusionsSection | undefined;

    // Find all potential inclusions sections
    const potentialSections = this.findPotentialInclusionsSections();
    
    // Remove overlapping sections (keep the one with higher confidence)
    const filteredSections = this.filterOverlappingSections(potentialSections);
    
    for (const section of filteredSections) {
      const analyzedSection = this.analyzeInclusionsSection(section);
      if (analyzedSection && analyzedSection.confidence > 0.3) {
        sections.push(analyzedSection);

        // Categorize by accommodation type if detected
        if (analyzedSection.accommodationType) {
          byAccommodationType.set(analyzedSection.accommodationType, analyzedSection);
        } else if (!globalInclusions || analyzedSection.confidence > globalInclusions.confidence) {
          globalInclusions = analyzedSection;
        }
      }
    }

    // Sort sections by confidence
    sections.sort((a, b) => b.confidence - a.confidence);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(sections);

    // Generate suggestions
    const suggestions = this.generateSuggestions(sections);

    return {
      sections,
      byAccommodationType,
      globalInclusions,
      confidence,
      suggestions
    };
  }

  /**
   * Find potential inclusions sections by looking for keywords and patterns
   */
  private findPotentialInclusionsSections(): Array<{
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: 'keyword' | 'bullet-pattern' | 'numbered-pattern';
  }> {
    const potentialSections: Array<{
      headerRow: number;
      headerCol: number;
      headerText: string;
      type: 'keyword' | 'bullet-pattern' | 'numbered-pattern';
    }> = [];

    // Keywords that indicate inclusions sections
    const inclusionKeywords = [
      'inclusions', 'included', 'includes', 'package includes', 'what\'s included',
      'what is included', 'included in price', 'price includes', 'package contains',
      'contains', 'features', 'amenities', 'services included', 'included services'
    ];

    // Scan all cells for inclusion keywords
    for (let row = 0; row < this.cellData.length; row++) {
      const rowData = this.cellData[row] || [];
      
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = String(rowData[col] || '').toLowerCase().trim();
        
        // Check for inclusion keywords
        for (const keyword of inclusionKeywords) {
          if (cellValue.includes(keyword)) {
            potentialSections.push({
              headerRow: row,
              headerCol: col,
              headerText: String(rowData[col] || '').trim(),
              type: 'keyword'
            });
            break;
          }
        }
        
        // Check for bullet point patterns that might indicate inclusions
        if (this.isBulletPoint(cellValue)) {
          // Look for a header in previous rows
          const headerInfo = this.findNearbyHeader(row, col);
          if (headerInfo) {
            potentialSections.push({
              headerRow: headerInfo.row,
              headerCol: headerInfo.col,
              headerText: headerInfo.text,
              type: 'bullet-pattern'
            });
          }
        }
        
        // Check for numbered list patterns
        if (this.isNumberedItem(cellValue)) {
          const headerInfo = this.findNearbyHeader(row, col);
          if (headerInfo) {
            potentialSections.push({
              headerRow: headerInfo.row,
              headerCol: headerInfo.col,
              headerText: headerInfo.text,
              type: 'numbered-pattern'
            });
          }
        }
      }
    }

    // Remove duplicates based on proximity
    return this.removeDuplicateSections(potentialSections);
  }

  /**
   * Analyze a potential inclusions section to extract content and metadata
   */
  private analyzeInclusionsSection(section: {
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: string;
  }): InclusionsSection | null {
    const content: string[] = [];
    let format: 'bullet-points' | 'numbered' | 'plain-text' | 'mixed' = 'plain-text';
    let endRow = section.headerRow;
    let endCol = section.headerCol;
    
    const formatCounts = {
      bullet: 0,
      numbered: 0,
      plain: 0
    };

    // Scan following rows for inclusion items
    const maxScanRows = 30; // Limit scan to prevent false positives
    let emptyRowCount = 0;
    let hitNewSection = false;
    
    for (let row = section.headerRow + 1; row < Math.min(this.cellData.length, section.headerRow + maxScanRows); row++) {
      const rowData = this.cellData[row] || [];
      let foundContentInRow = false;
      
      // Check the same column first, then nearby columns
      const columnsToCheck = [section.headerCol, section.headerCol - 1, section.headerCol + 1, section.headerCol + 2];
      
      for (const col of columnsToCheck) {
        if (col < 0 || col >= rowData.length) continue;
        
        const cellValue = String(rowData[col] || '').trim();
        
        if (cellValue) {
          // Check if this might be a new section header (stop current section)
          if (this.looksLikeHeader(cellValue) && content.length > 0) {
            hitNewSection = true;
            break;
          }
          
          if (this.isInclusionItem(cellValue)) {
            content.push(cellValue);
            endRow = row;
            endCol = Math.max(endCol, col);
            foundContentInRow = true;
            
            // Determine format
            if (this.isBulletPoint(cellValue)) {
              formatCounts.bullet++;
            } else if (this.isNumberedItem(cellValue)) {
              formatCounts.numbered++;
            } else {
              formatCounts.plain++;
            }
            
            break; // Found content in this row, move to next row
          }
        }
      }
      
      if (hitNewSection) {
        break; // Stop processing if we hit a new section
      }
      
      if (!foundContentInRow) {
        emptyRowCount++;
        // Stop if we hit too many empty rows (likely end of section)
        if (emptyRowCount >= 3) {
          break;
        }
      } else {
        emptyRowCount = 0; // Reset empty row counter
      }
    }

    if (content.length < 1) {
      return null; // No content found
    }

    // Determine predominant format
    const maxCount = Math.max(formatCounts.bullet, formatCounts.numbered, formatCounts.plain);
    if (formatCounts.bullet === maxCount) {
      format = 'bullet-points';
    } else if (formatCounts.numbered === maxCount) {
      format = 'numbered';
    } else if (formatCounts.bullet > 0 && formatCounts.numbered > 0) {
      format = 'mixed';
    } else {
      format = 'plain-text';
    }

    // Detect accommodation type from header or nearby content
    const accommodationType = this.detectAccommodationType(section.headerText, content);

    // Calculate confidence
    const confidence = this.calculateSectionConfidence(section, content, format);

    return {
      startRow: section.headerRow,
      endRow,
      startCol: section.headerCol,
      endCol,
      content,
      format,
      accommodationType,
      confidence,
      headerText: section.headerText
    };
  }

  /**
   * Check if a cell value is a bullet point
   */
  private isBulletPoint(value: string): boolean {
    if (!value) return false;
    
    const bulletPatterns = [
      /^[•\-\*\+]/,           // Standard bullet characters
      /^[\u2022\u2023\u2043]/, // Unicode bullet characters
      /^o\s/i,                 // Letter 'o' as bullet
      /^>\s/,                  // Greater than as bullet
      /^–\s/,                  // En dash as bullet
      /^—\s/                   // Em dash as bullet
    ];
    
    return bulletPatterns.some(pattern => pattern.test(value.trim()));
  }

  /**
   * Check if a cell value is a numbered item
   */
  private isNumberedItem(value: string): boolean {
    if (!value) return false;
    
    const numberedPatterns = [
      /^\d+\./,               // 1. 2. 3.
      /^\d+\)/,               // 1) 2) 3)
      /^\(\d+\)/,             // (1) (2) (3)
      /^[a-z]\./i,            // a. b. c.
      /^[a-z]\)/i,            // a) b) c)
      /^[ivx]+\./i,           // i. ii. iii. (Roman numerals)
      /^[ivx]+\)/i            // i) ii) iii)
    ];
    
    return numberedPatterns.some(pattern => pattern.test(value.trim()));
  }

  /**
   * Check if a cell value looks like an inclusion item
   */
  private isInclusionItem(value: string): boolean {
    if (!value || value.length < 3) return false;
    
    // Skip if it looks like a header
    if (this.looksLikeHeader(value)) {
      return false;
    }
    
    // Skip if it looks like a price or number only
    const cleanedValue = value.replace(/[£$€\s,]/g, '');
    if (/^\d+(\.\d{2})?$/.test(cleanedValue) && parseFloat(cleanedValue) > 0) {
      return false;
    }
    
    // Skip if it's just a month name
    const monthPattern = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)$/i;
    if (monthPattern.test(value.trim())) {
      return false;
    }
    
    // Skip if it looks like accommodation type only
    const accommodationOnlyPattern = /^(hotel|apartment|villa|resort|self-catering)$/i;
    if (accommodationOnlyPattern.test(value.trim())) {
      return false;
    }
    
    // Must contain some descriptive text
    const hasDescriptiveContent = /[a-zA-Z]{3,}/.test(value);
    
    return hasDescriptiveContent;
  }

  /**
   * Find a nearby header for bullet/numbered patterns
   */
  private findNearbyHeader(row: number, col: number): { row: number; col: number; text: string } | null {
    // Look in previous rows (up to 3 rows back)
    for (let lookbackRow = Math.max(0, row - 3); lookbackRow < row; lookbackRow++) {
      const rowData = this.cellData[lookbackRow] || [];
      
      // Check same column and nearby columns
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        const checkCol = col + colOffset;
        if (checkCol < 0 || checkCol >= rowData.length) continue;
        
        const cellValue = String(rowData[checkCol] || '').trim();
        
        if (cellValue && this.looksLikeHeader(cellValue)) {
          return {
            row: lookbackRow,
            col: checkCol,
            text: cellValue
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a value looks like a section header
   */
  private looksLikeHeader(value: string): boolean {
    if (!value || value.length < 3) return false;
    
    // Common header patterns
    const headerPatterns = [
      /inclusions?/i,
      /included/i,
      /includes/i,
      /package/i,
      /features/i,
      /amenities/i,
      /services/i,
      /what.*included/i,
      /price.*includes/i
    ];
    
    return headerPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Remove duplicate sections that are too close to each other
   */
  private removeDuplicateSections(sections: Array<{
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: string;
  }>): Array<{
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: string;
  }> {
    const filtered: typeof sections = [];
    
    for (const section of sections) {
      const isDuplicate = filtered.some(existing => 
        Math.abs(existing.headerRow - section.headerRow) <= 2 &&
        Math.abs(existing.headerCol - section.headerCol) <= 2
      );
      
      if (!isDuplicate) {
        filtered.push(section);
      }
    }
    
    return filtered;
  }

  /**
   * Filter overlapping sections to avoid content duplication
   */
  private filterOverlappingSections(sections: Array<{
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: string;
  }>): Array<{
    headerRow: number;
    headerCol: number;
    headerText: string;
    type: string;
  }> {
    // Sort by row position
    const sorted = [...sections].sort((a, b) => a.headerRow - b.headerRow);
    const filtered: typeof sections = [];
    
    for (const section of sorted) {
      // Check if this section would overlap with any existing section
      const wouldOverlap = filtered.some(existing => {
        // Only consider overlap if they're very close (within 5 rows) and same column
        const rowDistance = Math.abs(existing.headerRow - section.headerRow);
        const colDistance = Math.abs(existing.headerCol - section.headerCol);
        
        return rowDistance <= 5 && colDistance <= 1;
      });
      
      if (!wouldOverlap) {
        filtered.push(section);
      }
    }
    
    return filtered;
  }

  /**
   * Detect accommodation type from header text or content
   */
  private detectAccommodationType(headerText: string, content: string[]): string | undefined {
    const accommodationTypes = [
      'hotel', 'self-catering', 'apartment', 'villa', 'resort', 'hostel',
      'b&b', 'bed and breakfast', 'guesthouse', 'lodge', 'cabin', 'studio'
    ];
    
    // Check header text first
    const headerLower = headerText.toLowerCase();
    for (const type of accommodationTypes) {
      if (headerLower.includes(type)) {
        return this.capitalizeAccommodationType(type);
      }
    }
    
    // Check content for accommodation type mentions
    const allContent = content.join(' ').toLowerCase();
    for (const type of accommodationTypes) {
      if (allContent.includes(type)) {
        return this.capitalizeAccommodationType(type);
      }
    }
    
    return undefined;
  }

  /**
   * Capitalize accommodation type properly
   */
  private capitalizeAccommodationType(type: string): string {
    const specialCases: Record<string, string> = {
      'b&b': 'B&B',
      'bed and breakfast': 'Bed and Breakfast',
      'self-catering': 'Self-Catering'
    };
    
    return specialCases[type.toLowerCase()] || 
           type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  /**
   * Calculate confidence score for a section
   */
  private calculateSectionConfidence(
    section: { headerText: string; type: string },
    content: string[],
    format: string
  ): number {
    let confidence = 0.3; // Base confidence
    
    // Header quality
    if (section.type === 'keyword') {
      confidence += 0.3; // Keyword-based detection is more reliable
    } else {
      confidence += 0.2; // Pattern-based detection
    }
    
    // Content quantity
    if (content.length >= 5) {
      confidence += 0.2;
    } else if (content.length >= 3) {
      confidence += 0.15;
    } else if (content.length >= 1) {
      confidence += 0.1;
    }
    
    // Format consistency
    if (format === 'bullet-points' || format === 'numbered') {
      confidence += 0.15; // Structured format is good
    } else if (format === 'mixed') {
      confidence += 0.05; // Mixed format is less ideal
    }
    
    // Content quality (check for meaningful text)
    const avgContentLength = content.reduce((sum, item) => sum + item.length, 0) / content.length;
    if (avgContentLength > 20) {
      confidence += 0.1; // Longer descriptions are better
    }
    
    // Check for common inclusion words
    const inclusionWords = ['breakfast', 'wifi', 'parking', 'pool', 'gym', 'spa', 'transfer', 'meal', 'drink'];
    const hasInclusionWords = content.some(item => 
      inclusionWords.some(word => item.toLowerCase().includes(word))
    );
    if (hasInclusionWords) {
      confidence += 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate overall confidence for all detected sections
   */
  private calculateOverallConfidence(sections: InclusionsSection[]): number {
    if (sections.length === 0) return 0;
    
    // Use the highest confidence section as primary indicator
    const maxConfidence = Math.max(...sections.map(s => s.confidence));
    
    // Bonus for having multiple sections (indicates comprehensive data)
    const multiSectionBonus = sections.length > 1 ? 0.1 : 0;
    
    return Math.min(1, maxConfidence + multiSectionBonus);
  }

  /**
   * Generate suggestions for improving inclusions detection
   */
  private generateSuggestions(sections: InclusionsSection[]): string[] {
    const suggestions: string[] = [];
    
    if (sections.length === 0) {
      suggestions.push('No inclusions sections detected. Add a clearly labeled "Inclusions" or "What\'s Included" section.');
      suggestions.push('Use bullet points or numbered lists to format inclusion items clearly.');
      return suggestions;
    }
    
    const avgConfidence = sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length;
    
    if (avgConfidence < 0.6) {
      suggestions.push('Inclusions detection confidence is low. Consider using clearer section headers like "Package Includes" or "What\'s Included".');
    }
    
    const hasStructuredFormat = sections.some(s => s.format === 'bullet-points' || s.format === 'numbered');
    if (!hasStructuredFormat) {
      suggestions.push('Use bullet points (•) or numbered lists (1., 2., 3.) to format inclusions for better recognition.');
    }
    
    // Check for very short content items
    const hasShortItems = sections.some(s => 
      s.content.some(item => {
        // Remove bullet points and numbering for length check
        const cleanItem = item.replace(/^[•\-\*\+\d\.\)\(\s]+/, '').trim();
        return cleanItem.length < 10;
      })
    );
    
    if (hasShortItems) {
      suggestions.push('Some inclusion items are very short. Provide more descriptive inclusion details.');
    }
    
    const hasAccommodationSpecific = sections.some(s => s.accommodationType);
    if (!hasAccommodationSpecific && sections.length === 1) {
      suggestions.push('Consider specifying which inclusions apply to which accommodation types if offering multiple options.');
    }
    
    return suggestions;
  }

  /**
   * Get the best inclusions section (highest confidence)
   */
  getBestInclusionsSection(): InclusionsSection | null {
    const result = this.detectInclusionsSections();
    return result.sections.length > 0 ? result.sections[0] : null;
  }

  /**
   * Check if the worksheet has any inclusions sections
   */
  hasInclusionsSections(): boolean {
    const result = this.detectInclusionsSections();
    return result.sections.length > 0 && result.confidence > 0.3;
  }
}