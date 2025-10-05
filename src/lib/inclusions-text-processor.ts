/**
 * Processed inclusion item with cleaned text and metadata
 */
export interface ProcessedInclusion {
  originalText: string;
  cleanedText: string;
  isValid: boolean;
  emphasis?: 'bold' | 'italic' | 'underline';
  category?: string;
  confidence: number;
  issues: string[];
}

/**
 * Processing result for a list of inclusions
 */
export interface InclusionsProcessingResult {
  processedItems: ProcessedInclusion[];
  validItems: ProcessedInclusion[];
  invalidItems: ProcessedInclusion[];
  categories: Map<string, ProcessedInclusion[]>;
  overallQuality: number;
  suggestions: string[];
}

/**
 * Inclusions Text Processor - Cleans and validates inclusion text
 */
export class InclusionsTextProcessor {
  private commonCategories = new Map<RegExp, string>([
    [/breakfast|meal|dining|food|buffet/i, 'Dining'],
    [/wifi|internet|connection/i, 'Internet'],
    [/pool|swimming|spa|gym|fitness|sauna/i, 'Facilities'],
    [/transfer|transport|pickup|shuttle/i, 'Transport'],
    [/parking|garage/i, 'Parking'],
    [/cleaning|housekeeping|laundry/i, 'Housekeeping'],
    [/reception|concierge|service/i, 'Services'],
    [/air\s*conditioning|heating|climate/i, 'Climate'],
    [/balcony|terrace|view|garden/i, 'Amenities'],
    [/towel|linen|bedding/i, 'Linens']
  ]);

  /**
   * Process a list of inclusion items
   */
  processInclusions(inclusions: string[]): InclusionsProcessingResult {
    const processedItems: ProcessedInclusion[] = [];
    const categories = new Map<string, ProcessedInclusion[]>();

    for (const inclusion of inclusions) {
      const processed = this.processInclusionItem(inclusion);
      processedItems.push(processed);

      // Categorize valid items
      if (processed.isValid && processed.category) {
        if (!categories.has(processed.category)) {
          categories.set(processed.category, []);
        }
        categories.get(processed.category)!.push(processed);
      }
    }

    const validItems = processedItems.filter(item => item.isValid);
    const invalidItems = processedItems.filter(item => !item.isValid);

    const overallQuality = this.calculateOverallQuality(processedItems);
    const suggestions = this.generateSuggestions(processedItems);

    return {
      processedItems,
      validItems,
      invalidItems,
      categories,
      overallQuality,
      suggestions
    };
  }

  /**
   * Process a single inclusion item
   */
  processInclusionItem(text: string): ProcessedInclusion {
    const originalText = text;
    const issues: string[] = [];
    let confidence = 0.8; // Base confidence

    // Step 1: Clean formatting
    let cleanedText = this.cleanFormatting(text);

    // Step 2: Detect emphasis
    const emphasis = this.detectEmphasis(text);

    // Step 3: Validate content
    const isValid = this.validateContent(cleanedText, issues);
    if (!isValid) {
      confidence *= 0.3; // Significantly reduce confidence for invalid content
    }

    // Step 4: Categorize
    const category = this.categorizeInclusion(cleanedText);

    // Step 5: Adjust confidence based on quality indicators
    confidence = this.adjustConfidenceByQuality(cleanedText, confidence);

    return {
      originalText,
      cleanedText,
      isValid,
      emphasis,
      category,
      confidence,
      issues
    };
  }

  /**
   * Clean formatting from inclusion text
   */
  private cleanFormatting(text: string): string {
    let cleaned = text.trim();

    // Remove emphasis markers first
    cleaned = cleaned.replace(/\*+/g, '');

    // Remove bullet points and numbering
    cleaned = cleaned.replace(/^[•\-\*\+\d\.\)\(\s]+/, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Remove trailing punctuation if it's just a period
    cleaned = cleaned.replace(/\.$/, '');

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned.trim();
  }

  /**
   * Detect text emphasis from original formatting
   */
  private detectEmphasis(text: string): 'bold' | 'italic' | 'underline' | undefined {
    // This would typically check for formatting markers in Excel
    // For now, we'll detect based on common patterns
    if (text.includes('**') || text.toUpperCase() === text) {
      return 'bold';
    }
    if (text.includes('*') || text.includes('_')) {
      return 'italic';
    }
    return undefined;
  }

  /**
   * Validate that the content is meaningful
   */
  private validateContent(text: string, issues: string[]): boolean {
    if (!text || text.length < 3) {
      issues.push('Text too short');
      return false;
    }

    // Check for placeholder text first (before length check)
    const placeholderPatterns = [
      /^(item|inclusion|feature)\s*\d*$/i,
      /^(tbd|tba|pending|coming soon)$/i,
      /^(n\/a|na|none|nil)$/i,
      /^[x\-\.]+$/,
      /^example/i
    ];

    for (const pattern of placeholderPatterns) {
      if (pattern.test(text)) {
        issues.push('Appears to be placeholder text');
        return false;
      }
    }

    // Check for common invalid patterns
    if (/^\d+$/.test(text)) {
      issues.push('Contains only numbers');
      return false;
    }

    // Check for meaningful content (must have at least one real word)
    const hasRealWords = /[a-zA-Z]{3,}/.test(text);
    if (!hasRealWords) {
      issues.push('No meaningful words detected');
      return false;
    }

    if (text.length > 200) {
      issues.push('Text too long (may be description rather than inclusion)');
      return false;
    }

    return true;
  }

  /**
   * Categorize inclusion based on content
   */
  private categorizeInclusion(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    for (const [pattern, category] of this.commonCategories) {
      if (pattern.test(lowerText)) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Adjust confidence based on quality indicators
   */
  private adjustConfidenceByQuality(text: string, baseConfidence: number): number {
    let confidence = baseConfidence;

    // Length indicators
    if (text.length >= 10 && text.length <= 50) {
      confidence += 0.1; // Good length
    } else if (text.length < 5) {
      confidence -= 0.2; // Too short
    } else if (text.length > 100) {
      confidence -= 0.1; // Might be too long
    }

    // Descriptive quality
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 8) {
      confidence += 0.1; // Good word count
    }

    // Check for specific inclusion keywords
    const inclusionKeywords = [
      'included', 'free', 'complimentary', 'daily', 'weekly', 'unlimited',
      'access', 'service', 'facility', 'amenity'
    ];

    const hasInclusionKeywords = inclusionKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (hasInclusionKeywords) {
      confidence += 0.15;
    }

    // Check for vague terms that reduce confidence
    const vagueTerms = ['various', 'some', 'certain', 'available', 'possible'];
    const hasVagueTerms = vagueTerms.some(term => 
      text.toLowerCase().includes(term)
    );

    if (hasVagueTerms) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate overall quality score for all processed items
   */
  private calculateOverallQuality(items: ProcessedInclusion[]): number {
    if (items.length === 0) return 0;

    const validItems = items.filter(item => item.isValid);
    const validRatio = validItems.length / items.length;

    const avgConfidence = validItems.reduce((sum, item) => sum + item.confidence, 0) / 
                         Math.max(validItems.length, 1);

    const categoryCount = new Set(validItems.map(item => item.category)).size;
    const categoryBonus = Math.min(0.2, categoryCount * 0.05); // Bonus for variety

    return Math.min(1, validRatio * 0.6 + avgConfidence * 0.3 + categoryBonus);
  }

  /**
   * Generate suggestions for improving inclusions
   */
  private generateSuggestions(items: ProcessedInclusion[]): string[] {
    const suggestions: string[] = [];
    const validItems = items.filter(item => item.isValid);
    const invalidItems = items.filter(item => !item.isValid);

    if (invalidItems.length > 0) {
      suggestions.push(`${invalidItems.length} inclusion items need attention: ${invalidItems.map(item => item.originalText).join(', ')}`);
    }

    const shortItems = validItems.filter(item => item.cleanedText.length < 10);
    if (shortItems.length > 0) {
      suggestions.push('Some inclusions are very brief. Consider adding more descriptive details.');
    }

    const uncategorizedItems = validItems.filter(item => item.category === 'Other');
    if (uncategorizedItems.length > validItems.length * 0.5) {
      suggestions.push('Many inclusions don\'t fit standard categories. Consider using more specific terms.');
    }

    const lowConfidenceItems = validItems.filter(item => item.confidence < 0.6);
    if (lowConfidenceItems.length > 0) {
      suggestions.push('Some inclusions have unclear descriptions. Consider rewording for clarity.');
    }

    if (validItems.length < 3) {
      suggestions.push('Consider adding more inclusions to provide better value perception.');
    }

    const categories = new Set(validItems.map(item => item.category));
    if (categories.size < 3 && validItems.length > 5) {
      suggestions.push('Consider diversifying inclusions across different categories (dining, facilities, services, etc.).');
    }

    return suggestions;
  }

  /**
   * Format processed inclusions for display
   */
  formatForDisplay(items: ProcessedInclusion[], format: 'bullet' | 'numbered' | 'plain' = 'bullet'): string[] {
    const validItems = items.filter(item => item.isValid);
    
    return validItems.map((item, index) => {
      let formatted = item.cleanedText;

      // Apply emphasis if detected
      if (item.emphasis === 'bold') {
        formatted = `**${formatted}**`;
      } else if (item.emphasis === 'italic') {
        formatted = `*${formatted}*`;
      }

      // Apply formatting
      switch (format) {
        case 'bullet':
          return `• ${formatted}`;
        case 'numbered':
          return `${index + 1}. ${formatted}`;
        case 'plain':
        default:
          return formatted;
      }
    });
  }

  /**
   * Group inclusions by category
   */
  groupByCategory(items: ProcessedInclusion[]): Map<string, ProcessedInclusion[]> {
    const groups = new Map<string, ProcessedInclusion[]>();
    const validItems = items.filter(item => item.isValid);

    for (const item of validItems) {
      const category = item.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }

    return groups;
  }

  /**
   * Merge similar inclusions
   */
  mergeSimilarInclusions(items: ProcessedInclusion[]): ProcessedInclusion[] {
    const merged: ProcessedInclusion[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      if (processed.has(i) || !items[i].isValid) continue;

      const currentItem = items[i];
      const similar: ProcessedInclusion[] = [currentItem];

      // Find similar items
      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j) || !items[j].isValid) continue;

        if (this.areSimilar(currentItem.cleanedText, items[j].cleanedText)) {
          similar.push(items[j]);
          processed.add(j);
        }
      }

      // Merge if we found similar items
      if (similar.length > 1) {
        const mergedItem = this.mergeInclusionItems(similar);
        merged.push(mergedItem);
      } else {
        merged.push(currentItem);
      }

      processed.add(i);
    }

    return merged;
  }

  /**
   * Check if two inclusion texts are similar
   */
  private areSimilar(text1: string, text2: string): boolean {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return false;

    // Calculate word overlap
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);

    return similarity > 0.7; // 70% word overlap threshold for meaningful words
  }

  /**
   * Merge multiple similar inclusion items
   */
  private mergeInclusionItems(items: ProcessedInclusion[]): ProcessedInclusion {
    // Use the item with highest confidence as base
    const baseItem = items.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    // Combine unique words from all items
    const allWords = new Set<string>();
    for (const item of items) {
      const words = item.cleanedText.toLowerCase().split(/\s+/);
      words.forEach(word => allWords.add(word));
    }

    const mergedText = Array.from(allWords).join(' ');
    const cleanedMerged = this.cleanFormatting(mergedText);

    return {
      ...baseItem,
      originalText: items.map(item => item.originalText).join(' / '),
      cleanedText: cleanedMerged,
      confidence: Math.min(1, baseItem.confidence + 0.1) // Slight confidence boost for merged items
    };
  }
}