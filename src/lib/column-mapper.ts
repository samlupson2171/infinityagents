/**
 * Column mapping definition
 */
export interface ColumnMapping {
  excelColumn: string;
  systemField: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'list';
  required: boolean;
  confidence: number;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => any;
}

/**
 * Mapping template for reuse
 */
export interface MappingTemplate {
  id: string;
  name: string;
  description: string;
  mappings: ColumnMapping[];
  applicablePatterns: string[];
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

/**
 * Mapping suggestion result
 */
export interface MappingSuggestion {
  mapping: ColumnMapping;
  reasons: string[];
  alternatives: ColumnMapping[];
}

/**
 * Column analysis result
 */
export interface ColumnAnalysis {
  columnName: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'list' | 'mixed';
  sampleValues: any[];
  uniqueValues: number;
  nullCount: number;
  patterns: string[];
  confidence: number;
}

/**
 * Intelligent Column Mapper - Automatically suggests column mappings
 */
export class ColumnMapper {
  private systemFields = new Map<string, {
    type: 'string' | 'number' | 'date' | 'currency' | 'list';
    required: boolean;
    description: string;
    patterns: RegExp[];
    validators: ((value: any) => boolean)[];
  }>([
    ['month', {
      type: 'string',
      required: true,
      description: 'Month name or period',
      patterns: [
        /^(month|mth|period|time)$/i,
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
        /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
      ],
      validators: [(value) => typeof value === 'string' && value.length > 0]
    }],
    ['accommodationType', {
      type: 'string',
      required: false,
      description: 'Type of accommodation',
      patterns: [
        /^(accommodation|accom|type|room)$/i,
        /^(hotel|apartment|villa|resort|self.?catering)$/i
      ],
      validators: [(value) => typeof value === 'string' && value.length > 0]
    }],
    ['nights', {
      type: 'number',
      required: false,
      description: 'Number of nights',
      patterns: [
        /^(nights?|n|days?)$/i,
        /^\d+\s*(nights?|n|days?)$/i,
        /^(nights?|n|days?)\s*\d+$/i
      ],
      validators: [(value) => !isNaN(Number(value)) && Number(value) > 0]
    }],
    ['pax', {
      type: 'number',
      required: false,
      description: 'Number of people/pax',
      patterns: [
        /^(pax|people|persons?|adults?|guests?)$/i,
        /^\d+\s*(pax|people|persons?|adults?|guests?)$/i,
        /^(pax|people|persons?|adults?|guests?)\s*\d+$/i
      ],
      validators: [(value) => !isNaN(Number(value)) && Number(value) > 0]
    }],
    ['price', {
      type: 'currency',
      required: true,
      description: 'Price value',
      patterns: [
        /^(price|cost|rate|amount|fee)$/i,
        /^(€|£|\$|eur|gbp|usd)$/i,
        /^\d+(\.\d{2})?$/
      ],
      validators: [(value) => !isNaN(Number(String(value).replace(/[£$€,\s]/g, '')))]
    }],
    ['currency', {
      type: 'string',
      required: false,
      description: 'Currency code',
      patterns: [
        /^(currency|curr|ccy)$/i,
        /^(eur|gbp|usd|€|£|\$)$/i
      ],
      validators: [(value) => /^(EUR|GBP|USD|€|£|\$)$/i.test(String(value))]
    }],
    ['specialPeriod', {
      type: 'string',
      required: false,
      description: 'Special period or season',
      patterns: [
        /^(special|season|period|event)$/i,
        /^(easter|peak|high|low|summer|winter)$/i
      ],
      validators: [(value) => typeof value === 'string' && value.length > 0]
    }],
    ['inclusions', {
      type: 'list',
      required: false,
      description: 'Package inclusions',
      patterns: [
        /^(inclusions?|included|includes)$/i,
        /^(package|what.?s.?included)$/i
      ],
      validators: [(value) => Array.isArray(value) || typeof value === 'string']
    }],
    ['description', {
      type: 'string',
      required: false,
      description: 'General description',
      patterns: [
        /^(description|desc|details|notes)$/i,
        /^(info|information|about)$/i
      ],
      validators: [(value) => typeof value === 'string']
    }]
  ]);

  private templates: MappingTemplate[] = [];

  /**
   * Analyze columns and suggest mappings
   */
  suggestMappings(headers: string[], sampleData?: any[][]): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];
    
    // Analyze each column
    const columnAnalyses = headers.map((header, index) => 
      this.analyzeColumn(header, sampleData?.map(row => row[index]) || [])
    );

    // Generate suggestions for each column
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const analysis = columnAnalyses[i];
      const suggestion = this.generateMappingSuggestion(header, analysis, columnAnalyses);
      
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.mapping.confidence - a.mapping.confidence);

    return suggestions;
  }

  /**
   * Analyze a single column
   */
  private analyzeColumn(columnName: string, sampleValues: any[]): ColumnAnalysis {
    const cleanValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(cleanValues).size;
    const nullCount = sampleValues.length - cleanValues.length;

    // Detect data type
    const dataType = this.detectDataType(cleanValues);
    
    // Extract patterns
    const patterns = this.extractPatterns(columnName, cleanValues);
    
    // Calculate confidence based on consistency
    const confidence = this.calculateColumnConfidence(columnName, cleanValues, dataType);

    return {
      columnName,
      dataType,
      sampleValues: cleanValues.slice(0, 10), // Keep first 10 samples
      uniqueValues,
      nullCount,
      patterns,
      confidence
    };
  }

  /**
   * Detect data type from sample values
   */
  private detectDataType(values: any[]): 'string' | 'number' | 'date' | 'currency' | 'list' | 'mixed' {
    if (values.length === 0) return 'string';

    const types = new Set<string>();
    
    for (const value of values) {
      const strValue = String(value).trim();
      
      if (this.isCurrency(strValue)) {
        types.add('currency');
      } else if (this.isDate(strValue)) {
        types.add('date');
      } else if (this.isNumber(strValue)) {
        types.add('number');
      } else if (this.isList(strValue)) {
        types.add('list');
      } else {
        types.add('string');
      }
    }

    if (types.size === 1) {
      return Array.from(types)[0] as any;
    } else if (types.has('currency')) {
      return 'currency'; // Currency takes precedence
    } else if (types.has('number') && types.has('string')) {
      // Check if strings are just formatted numbers
      const numericCount = values.filter(v => this.isNumber(String(v))).length;
      return numericCount > values.length * 0.7 ? 'number' : 'mixed';
    }

    return 'mixed';
  }

  /**
   * Check if value is currency
   */
  private isCurrency(value: string): boolean {
    return /^[£$€]?\s*\d+(\.\d{2})?\s*[£$€]?$/.test(value) ||
           /^\d+(\.\d{2})?\s*(EUR|GBP|USD)$/i.test(value);
  }

  /**
   * Check if value is date
   */
  private isDate(value: string): boolean {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    ];
    
    return datePatterns.some(pattern => pattern.test(value)) || !isNaN(Date.parse(value));
  }

  /**
   * Check if value is number
   */
  private isNumber(value: string): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }

  /**
   * Check if value is list
   */
  private isList(value: string): boolean {
    return value.includes(',') || value.includes(';') || value.includes('|') ||
           value.includes('\n') || /^[•\-\*]\s/.test(value);
  }

  /**
   * Extract patterns from column name and values
   */
  private extractPatterns(columnName: string, values: any[]): string[] {
    const patterns: string[] = [];
    
    // Column name patterns
    const lowerName = columnName.toLowerCase();
    if (/month|period|time/.test(lowerName)) patterns.push('temporal');
    if (/price|cost|rate|amount/.test(lowerName)) patterns.push('monetary');
    if (/night|day/.test(lowerName)) patterns.push('duration');
    if (/pax|people|person|adult|guest/.test(lowerName)) patterns.push('quantity');
    if (/hotel|apartment|villa|accommodation/.test(lowerName)) patterns.push('accommodation');
    
    // Value patterns
    const sampleStr = values.slice(0, 5).join(' ').toLowerCase();
    if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/.test(sampleStr)) patterns.push('months');
    if (/hotel|apartment|villa|resort/.test(sampleStr)) patterns.push('accommodation-types');
    if (/\d+\s*(night|day)/.test(sampleStr)) patterns.push('duration-values');
    if (/\d+\s*(pax|people|person)/.test(sampleStr)) patterns.push('quantity-values');
    
    return patterns;
  }

  /**
   * Calculate confidence for column analysis
   */
  private calculateColumnConfidence(columnName: string, values: any[], dataType: string): number {
    let confidence = 0.5; // Base confidence
    
    // Name clarity bonus
    const lowerName = columnName.toLowerCase();
    const clearNames = ['month', 'price', 'nights', 'pax', 'accommodation', 'currency'];
    if (clearNames.some(name => lowerName.includes(name))) {
      confidence += 0.3;
    }
    
    // Data consistency bonus
    if (dataType !== 'mixed') {
      confidence += 0.2;
    }
    
    // Sample size bonus
    if (values.length >= 5) {
      confidence += 0.1;
    }
    
    // Pattern consistency
    if (values.length > 0) {
      const firstType = this.detectDataType([values[0]]);
      const consistentCount = values.filter(v => this.detectDataType([v]) === firstType).length;
      const consistency = consistentCount / values.length;
      confidence += consistency * 0.2;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Generate mapping suggestion for a column
   */
  private generateMappingSuggestion(
    columnName: string, 
    analysis: ColumnAnalysis,
    allAnalyses: ColumnAnalysis[]
  ): MappingSuggestion | null {
    const suggestions: { field: string; confidence: number; reasons: string[] }[] = [];
    
    // Check each system field
    for (const [fieldName, fieldDef] of this.systemFields) {
      let confidence = 0;
      const reasons: string[] = [];
      
      // Pattern matching
      for (const pattern of fieldDef.patterns) {
        if (pattern.test(columnName)) {
          confidence += 0.4;
          reasons.push(`Column name matches ${fieldName} pattern`);
          break;
        }
      }
      
      // Data type matching
      if (fieldDef.type === analysis.dataType) {
        confidence += 0.3;
        reasons.push(`Data type matches expected ${fieldDef.type}`);
      }
      
      // Content validation
      if (analysis.sampleValues.length > 0) {
        const validCount = analysis.sampleValues.filter(value => 
          fieldDef.validators.every(validator => validator(value))
        ).length;
        
        if (validCount > 0) {
          const validRatio = validCount / analysis.sampleValues.length;
          confidence += validRatio * 0.2;
          reasons.push(`${Math.round(validRatio * 100)}% of values are valid for ${fieldName}`);
        }
      }
      
      // Context-based adjustments
      confidence = this.adjustConfidenceByContext(fieldName, analysis, allAnalyses, confidence);
      
      if (confidence > 0.3) { // Minimum threshold
        suggestions.push({ field: fieldName, confidence, reasons });
      }
    }
    
    if (suggestions.length === 0) return null;
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    const bestSuggestion = suggestions[0];
    const alternatives = suggestions.slice(1, 4).map(s => ({
      excelColumn: columnName,
      systemField: s.field,
      dataType: this.systemFields.get(s.field)!.type,
      required: this.systemFields.get(s.field)!.required,
      confidence: s.confidence
    }));
    
    return {
      mapping: {
        excelColumn: columnName,
        systemField: bestSuggestion.field,
        dataType: this.systemFields.get(bestSuggestion.field)!.type,
        required: this.systemFields.get(bestSuggestion.field)!.required,
        confidence: bestSuggestion.confidence
      },
      reasons: bestSuggestion.reasons,
      alternatives
    };
  }

  /**
   * Adjust confidence based on context of other columns
   */
  private adjustConfidenceByContext(
    fieldName: string,
    analysis: ColumnAnalysis,
    allAnalyses: ColumnAnalysis[],
    baseConfidence: number
  ): number {
    let confidence = baseConfidence;
    
    // If this is a price field, boost confidence if we have month columns
    if (fieldName === 'price') {
      const hasMonthColumn = allAnalyses.some(a => 
        a.patterns.includes('temporal') || a.patterns.includes('months')
      );
      if (hasMonthColumn) {
        confidence += 0.1;
      }
    }
    
    // If this is a month field, boost confidence if we have price columns
    if (fieldName === 'month') {
      const hasPriceColumn = allAnalyses.some(a => 
        a.patterns.includes('monetary') || a.dataType === 'currency'
      );
      if (hasPriceColumn) {
        confidence += 0.1;
      }
    }
    
    // Reduce confidence if multiple columns could be the same field
    const similarColumns = allAnalyses.filter(a => 
      a.dataType === analysis.dataType && a.patterns.some(p => analysis.patterns.includes(p))
    );
    
    if (similarColumns.length > 1) {
      confidence *= 0.8; // Reduce confidence due to ambiguity
    }
    
    return confidence;
  }

  /**
   * Apply mappings to transform data
   */
  applyMapping(data: any[][], mappings: ColumnMapping[]): any[] {
    const result: any[] = [];
    
    // Create mapping index
    const mappingIndex = new Map<string, ColumnMapping>();
    mappings.forEach(mapping => {
      mappingIndex.set(mapping.excelColumn, mapping);
    });
    
    // Transform each row
    for (const row of data) {
      const transformedRow: any = {};
      
      mappings.forEach((mapping, index) => {
        const value = row[index];
        let transformedValue = value;
        
        // Apply transformer if available
        if (mapping.transformer) {
          transformedValue = mapping.transformer(value);
        } else {
          // Apply default transformations based on data type
          transformedValue = this.defaultTransform(value, mapping.dataType);
        }
        
        transformedRow[mapping.systemField] = transformedValue;
      });
      
      result.push(transformedRow);
    }
    
    return result;
  }

  /**
   * Apply default transformation based on data type
   */
  private defaultTransform(value: any, dataType: string): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    const strValue = String(value).trim();
    
    switch (dataType) {
      case 'number':
        const num = Number(strValue);
        return isNaN(num) ? null : num;
        
      case 'currency':
        const cleanPrice = strValue.replace(/[£$€,\s]/g, '');
        const price = Number(cleanPrice);
        return isNaN(price) ? null : price;
        
      case 'date':
        const date = new Date(strValue);
        return isNaN(date.getTime()) ? null : date;
        
      case 'list':
        if (Array.isArray(value)) return value;
        return strValue.split(/[,;|\n]/).map(item => item.trim()).filter(item => item);
        
      case 'string':
      default:
        return strValue;
    }
  }

  /**
   * Save a mapping template
   */
  saveMappingTemplate(template: Omit<MappingTemplate, 'id' | 'createdAt' | 'useCount'>): MappingTemplate {
    const newTemplate: MappingTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      useCount: 0
    };
    
    this.templates.push(newTemplate);
    return newTemplate;
  }

  /**
   * Load mapping templates
   */
  loadMappingTemplates(): MappingTemplate[] {
    return [...this.templates];
  }

  /**
   * Find applicable templates based on column headers
   */
  findApplicableTemplates(headers: string[]): MappingTemplate[] {
    const headerStr = headers.join(' ').toLowerCase();
    
    return this.templates.filter(template => 
      template.applicablePatterns.some(pattern => 
        new RegExp(pattern, 'i').test(headerStr)
      )
    ).sort((a, b) => b.useCount - a.useCount); // Sort by usage
  }

  /**
   * Use a template (increment usage count)
   */
  useTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      template.useCount++;
      template.lastUsed = new Date();
    }
  }

  /**
   * Validate mappings
   */
  validateMappings(mappings: ColumnMapping[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required fields
    const requiredFields = Array.from(this.systemFields.entries())
      .filter(([_, def]) => def.required)
      .map(([name, _]) => name);
    
    const mappedFields = new Set(mappings.map(m => m.systemField));
    
    for (const requiredField of requiredFields) {
      if (!mappedFields.has(requiredField)) {
        errors.push(`Required field '${requiredField}' is not mapped`);
      }
    }
    
    // Check for duplicate mappings
    const fieldCounts = new Map<string, number>();
    for (const mapping of mappings) {
      const count = fieldCounts.get(mapping.systemField) || 0;
      fieldCounts.set(mapping.systemField, count + 1);
    }
    
    for (const [field, count] of fieldCounts) {
      if (count > 1) {
        errors.push(`Field '${field}' is mapped multiple times`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}