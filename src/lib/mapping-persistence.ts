import { MappingTemplate, ColumnMapping } from './column-mapper';

/**
 * Mapping persistence interface
 */
export interface MappingPersistence {
  saveTemplate(template: Omit<MappingTemplate, 'id' | 'createdAt' | 'useCount'>): Promise<MappingTemplate>;
  loadTemplates(): Promise<MappingTemplate[]>;
  updateTemplate(id: string, updates: Partial<MappingTemplate>): Promise<MappingTemplate>;
  deleteTemplate(id: string): Promise<void>;
  findTemplatesByPattern(pattern: string): Promise<MappingTemplate[]>;
  incrementUsage(id: string): Promise<void>;
}

/**
 * Local storage implementation of mapping persistence
 */
export class LocalStorageMappingPersistence implements MappingPersistence {
  private readonly storageKey = 'excel-mapping-templates';

  async saveTemplate(template: Omit<MappingTemplate, 'id' | 'createdAt' | 'useCount'>): Promise<MappingTemplate> {
    const templates = await this.loadTemplates();
    
    const newTemplate: MappingTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date(),
      useCount: 0
    };
    
    templates.push(newTemplate);
    this.saveToStorage(templates);
    
    return newTemplate;
  }

  async loadTemplates(): Promise<MappingTemplate[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const templates = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return templates.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        lastUsed: template.lastUsed ? new Date(template.lastUsed) : undefined
      }));
    } catch (error) {
      console.error('Failed to load mapping templates:', error);
      return [];
    }
  }

  async updateTemplate(id: string, updates: Partial<MappingTemplate>): Promise<MappingTemplate> {
    const templates = await this.loadTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Template with id ${id} not found`);
    }
    
    templates[index] = { ...templates[index], ...updates };
    this.saveToStorage(templates);
    
    return templates[index];
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.loadTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
      throw new Error(`Template with id ${id} not found`);
    }
    
    this.saveToStorage(filtered);
  }

  async findTemplatesByPattern(pattern: string): Promise<MappingTemplate[]> {
    const templates = await this.loadTemplates();
    const regex = new RegExp(pattern, 'i');
    
    return templates.filter(template => 
      template.applicablePatterns.some(p => regex.test(p)) ||
      regex.test(template.name) ||
      regex.test(template.description)
    );
  }

  async incrementUsage(id: string): Promise<void> {
    const templates = await this.loadTemplates();
    const template = templates.find(t => t.id === id);
    
    if (template) {
      template.useCount++;
      template.lastUsed = new Date();
      this.saveToStorage(templates);
    }
  }

  private saveToStorage(templates: MappingTemplate[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to save mapping templates:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Database implementation of mapping persistence (for server-side)
 */
export class DatabaseMappingPersistence implements MappingPersistence {
  // This would connect to your database
  // Implementation depends on your database choice (MongoDB, PostgreSQL, etc.)
  
  async saveTemplate(template: Omit<MappingTemplate, 'id' | 'createdAt' | 'useCount'>): Promise<MappingTemplate> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }

  async loadTemplates(): Promise<MappingTemplate[]> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }

  async updateTemplate(id: string, updates: Partial<MappingTemplate>): Promise<MappingTemplate> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }

  async deleteTemplate(id: string): Promise<void> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }

  async findTemplatesByPattern(pattern: string): Promise<MappingTemplate[]> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }

  async incrementUsage(id: string): Promise<void> {
    // Database implementation
    throw new Error('Database persistence not implemented');
  }
}

/**
 * Template manager that handles template operations
 */
export class MappingTemplateManager {
  private persistence: MappingPersistence;

  constructor(persistence?: MappingPersistence) {
    this.persistence = persistence || new LocalStorageMappingPersistence();
  }

  /**
   * Create a template from current mappings
   */
  async createTemplate(
    name: string,
    description: string,
    mappings: ColumnMapping[],
    applicablePatterns: string[]
  ): Promise<MappingTemplate> {
    const template = {
      name,
      description,
      mappings,
      applicablePatterns
    };

    return await this.persistence.saveTemplate(template);
  }

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<MappingTemplate[]> {
    return await this.persistence.loadTemplates();
  }

  /**
   * Get templates sorted by usage
   */
  async getPopularTemplates(limit?: number): Promise<MappingTemplate[]> {
    const templates = await this.persistence.loadTemplates();
    const sorted = templates.sort((a, b) => b.useCount - a.useCount);
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get recently used templates
   */
  async getRecentTemplates(limit: number = 5): Promise<MappingTemplate[]> {
    const templates = await this.persistence.loadTemplates();
    const withLastUsed = templates.filter(t => t.lastUsed);
    const sorted = withLastUsed.sort((a, b) => 
      (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0)
    );
    
    return sorted.slice(0, limit);
  }

  /**
   * Find templates that match column headers
   */
  async findMatchingTemplates(headers: string[]): Promise<MappingTemplate[]> {
    const templates = await this.persistence.loadTemplates();
    const headerString = headers.join(' ').toLowerCase();
    
    const matches = templates.filter(template => 
      template.applicablePatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(headerString);
        } catch {
          // If pattern is not a valid regex, do simple string matching
          return headerString.includes(pattern.toLowerCase());
        }
      })
    );

    // Sort by relevance (number of matching patterns and usage count)
    return matches.sort((a, b) => {
      const aMatches = a.applicablePatterns.filter(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(headerString);
        } catch {
          return headerString.includes(pattern.toLowerCase());
        }
      }).length;

      const bMatches = b.applicablePatterns.filter(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(headerString);
        } catch {
          return headerString.includes(pattern.toLowerCase());
        }
      }).length;

      if (aMatches !== bMatches) {
        return bMatches - aMatches; // More matches first
      }

      return b.useCount - a.useCount; // Then by usage count
    });
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(templateId: string): Promise<void> {
    await this.persistence.incrementUsage(templateId);
  }

  /**
   * Update a template
   */
  async updateTemplate(id: string, updates: Partial<MappingTemplate>): Promise<MappingTemplate> {
    return await this.persistence.updateTemplate(id, updates);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.persistence.deleteTemplate(id);
  }

  /**
   * Export templates to JSON
   */
  async exportTemplates(): Promise<string> {
    const templates = await this.persistence.loadTemplates();
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import templates from JSON
   */
  async importTemplates(jsonData: string): Promise<MappingTemplate[]> {
    try {
      const templates = JSON.parse(jsonData) as MappingTemplate[];
      const imported: MappingTemplate[] = [];

      for (const template of templates) {
        // Remove id to create new templates
        const { id, ...templateData } = template;
        const newTemplate = await this.persistence.saveTemplate(templateData);
        imported.push(newTemplate);
      }

      return imported;
    } catch (error) {
      throw new Error(`Failed to import templates: ${error}`);
    }
  }

  /**
   * Create default templates
   */
  async createDefaultTemplates(): Promise<MappingTemplate[]> {
    const defaultTemplates = [
      {
        name: 'Standard Resort Pricing',
        description: 'Common mapping for resort pricing files with months and prices',
        mappings: [
          {
            excelColumn: 'Month',
            systemField: 'month',
            dataType: 'string' as const,
            required: true,
            confidence: 1.0
          },
          {
            excelColumn: 'Price',
            systemField: 'price',
            dataType: 'currency' as const,
            required: true,
            confidence: 1.0
          }
        ],
        applicablePatterns: ['month.*price', 'pricing.*table', 'resort.*rates']
      },
      {
        name: 'Hotel Accommodation Pricing',
        description: 'Mapping for hotel files with accommodation types',
        mappings: [
          {
            excelColumn: 'Month',
            systemField: 'month',
            dataType: 'string' as const,
            required: true,
            confidence: 1.0
          },
          {
            excelColumn: 'Accommodation',
            systemField: 'accommodationType',
            dataType: 'string' as const,
            required: false,
            confidence: 1.0
          },
          {
            excelColumn: 'Price',
            systemField: 'price',
            dataType: 'currency' as const,
            required: true,
            confidence: 1.0
          }
        ],
        applicablePatterns: ['hotel.*price', 'accommodation.*rate', 'room.*cost']
      },
      {
        name: 'Detailed Package Pricing',
        description: 'Comprehensive mapping including nights, pax, and inclusions',
        mappings: [
          {
            excelColumn: 'Month',
            systemField: 'month',
            dataType: 'string' as const,
            required: true,
            confidence: 1.0
          },
          {
            excelColumn: 'Nights',
            systemField: 'nights',
            dataType: 'number' as const,
            required: false,
            confidence: 1.0
          },
          {
            excelColumn: 'Pax',
            systemField: 'pax',
            dataType: 'number' as const,
            required: false,
            confidence: 1.0
          },
          {
            excelColumn: 'Price',
            systemField: 'price',
            dataType: 'currency' as const,
            required: true,
            confidence: 1.0
          },
          {
            excelColumn: 'Inclusions',
            systemField: 'inclusions',
            dataType: 'list' as const,
            required: false,
            confidence: 1.0
          }
        ],
        applicablePatterns: ['package.*pricing', 'nights.*pax', 'inclusions.*price']
      }
    ];

    const created: MappingTemplate[] = [];
    for (const template of defaultTemplates) {
      try {
        const newTemplate = await this.persistence.saveTemplate(template);
        created.push(newTemplate);
      } catch (error) {
        console.warn(`Failed to create default template "${template.name}":`, error);
      }
    }

    return created;
  }

  /**
   * Analyze mapping usage and suggest improvements
   */
  async analyzeUsage(): Promise<{
    totalTemplates: number;
    mostUsed: MappingTemplate[];
    leastUsed: MappingTemplate[];
    recentlyCreated: MappingTemplate[];
    suggestions: string[];
  }> {
    const templates = await this.persistence.loadTemplates();
    
    const mostUsed = templates
      .filter(t => t.useCount > 0)
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 5);

    const leastUsed = templates
      .filter(t => t.useCount === 0)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const recentlyCreated = templates
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const suggestions: string[] = [];
    
    if (leastUsed.length > templates.length * 0.5) {
      suggestions.push('Consider reviewing unused templates and removing outdated ones');
    }
    
    if (mostUsed.length > 0 && mostUsed[0].useCount > 10) {
      suggestions.push('Consider creating variations of your most-used templates for different scenarios');
    }
    
    if (templates.length === 0) {
      suggestions.push('Create some default templates to speed up future mappings');
    }

    return {
      totalTemplates: templates.length,
      mostUsed,
      leastUsed,
      recentlyCreated,
      suggestions
    };
  }
}