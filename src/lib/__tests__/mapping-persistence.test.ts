import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageMappingPersistence, MappingTemplateManager } from '../mapping-persistence';
import { MappingTemplate } from '../column-mapper';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('LocalStorageMappingPersistence', () => {
  let persistence: LocalStorageMappingPersistence;

  beforeEach(() => {
    persistence = new LocalStorageMappingPersistence();
    vi.clearAllMocks();
  });

  describe('Template Management', () => {
    it('should save a template', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const template = {
        name: 'Test Template',
        description: 'Test description',
        mappings: [{
          excelColumn: 'Month',
          systemField: 'month',
          dataType: 'string' as const,
          required: true,
          confidence: 1.0
        }],
        applicablePatterns: ['month.*price']
      };

      const saved = await persistence.saveTemplate(template);

      expect(saved.id).toBeDefined();
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.useCount).toBe(0);
      expect(saved.name).toBe(template.name);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should load templates', async () => {
      const mockTemplates = [{
        id: '1',
        name: 'Test Template',
        description: 'Test',
        mappings: [],
        applicablePatterns: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        useCount: 5
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      const templates = await persistence.loadTemplates();

      expect(templates).toHaveLength(1);
      expect(templates[0].createdAt).toBeInstanceOf(Date);
      expect(templates[0].name).toBe('Test Template');
    });

    it('should handle empty storage', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const templates = await persistence.loadTemplates();

      expect(templates).toEqual([]);
    });

    it('should handle corrupted storage', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const templates = await persistence.loadTemplates();

      expect(templates).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should update a template', async () => {
      const mockTemplates = [{
        id: '1',
        name: 'Original Name',
        description: 'Original description',
        mappings: [],
        applicablePatterns: [],
        createdAt: new Date(),
        useCount: 0
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      const updated = await persistence.updateTemplate('1', {
        name: 'Updated Name',
        description: 'Updated description'
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should throw error when updating non-existent template', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      await expect(persistence.updateTemplate('nonexistent', { name: 'New Name' }))
        .rejects.toThrow('Template with id nonexistent not found');
    });

    it('should delete a template', async () => {
      const mockTemplates = [{
        id: '1',
        name: 'Template to delete',
        description: 'Test',
        mappings: [],
        applicablePatterns: [],
        createdAt: new Date(),
        useCount: 0
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      await persistence.deleteTemplate('1');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'excel-mapping-templates',
        JSON.stringify([])
      );
    });

    it('should throw error when deleting non-existent template', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      await expect(persistence.deleteTemplate('nonexistent'))
        .rejects.toThrow('Template with id nonexistent not found');
    });

    it('should find templates by pattern', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Resort Template',
          description: 'For resort pricing',
          mappings: [],
          applicablePatterns: ['resort.*pricing', 'hotel.*rates'],
          createdAt: new Date(),
          useCount: 0
        },
        {
          id: '2',
          name: 'Hotel Template',
          description: 'For hotel data',
          mappings: [],
          applicablePatterns: ['accommodation.*type'],
          createdAt: new Date(),
          useCount: 0
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      const found = await persistence.findTemplatesByPattern('resort');

      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('Resort Template');
    });

    it('should increment usage count', async () => {
      const mockTemplates = [{
        id: '1',
        name: 'Test Template',
        description: 'Test',
        mappings: [],
        applicablePatterns: [],
        createdAt: new Date(),
        useCount: 5
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      await persistence.incrementUsage('1');

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].useCount).toBe(6);
      expect(savedData[0].lastUsed).toBeDefined();
    });
  });
});

describe('MappingTemplateManager', () => {
  let manager: MappingTemplateManager;
  let mockPersistence: any;

  beforeEach(() => {
    mockPersistence = {
      saveTemplate: vi.fn(),
      loadTemplates: vi.fn(),
      updateTemplate: vi.fn(),
      deleteTemplate: vi.fn(),
      findTemplatesByPattern: vi.fn(),
      incrementUsage: vi.fn()
    };

    manager = new MappingTemplateManager(mockPersistence);
  });

  describe('Template Creation', () => {
    it('should create a template from mappings', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Test Template',
        description: 'Test description',
        mappings: [],
        applicablePatterns: ['test'],
        createdAt: new Date(),
        useCount: 0
      };

      mockPersistence.saveTemplate.mockResolvedValue(mockTemplate);

      const mappings = [{
        excelColumn: 'Month',
        systemField: 'month',
        dataType: 'string' as const,
        required: true,
        confidence: 1.0
      }];

      const result = await manager.createTemplate(
        'Test Template',
        'Test description',
        mappings,
        ['test']
      );

      expect(result).toEqual(mockTemplate);
      expect(mockPersistence.saveTemplate).toHaveBeenCalledWith({
        name: 'Test Template',
        description: 'Test description',
        mappings,
        applicablePatterns: ['test']
      });
    });
  });

  describe('Template Retrieval', () => {
    it('should get all templates', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1', useCount: 5, createdAt: new Date() },
        { id: '2', name: 'Template 2', useCount: 3, createdAt: new Date() }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const result = await manager.getAllTemplates();

      expect(result).toEqual(mockTemplates);
    });

    it('should get popular templates sorted by usage', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1', useCount: 3, createdAt: new Date() },
        { id: '2', name: 'Template 2', useCount: 10, createdAt: new Date() },
        { id: '3', name: 'Template 3', useCount: 1, createdAt: new Date() }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const result = await manager.getPopularTemplates(2);

      expect(result).toHaveLength(2);
      expect(result[0].useCount).toBe(10);
      expect(result[1].useCount).toBe(3);
    });

    it('should get recent templates', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockTemplates = [
        { id: '1', name: 'Template 1', lastUsed: twoDaysAgo, createdAt: new Date() },
        { id: '2', name: 'Template 2', lastUsed: now, createdAt: new Date() },
        { id: '3', name: 'Template 3', lastUsed: yesterday, createdAt: new Date() },
        { id: '4', name: 'Template 4', createdAt: new Date() } // No lastUsed
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const result = await manager.getRecentTemplates(2);

      expect(result).toHaveLength(2);
      expect(result[0].lastUsed).toEqual(now);
      expect(result[1].lastUsed).toEqual(yesterday);
    });

    it('should find matching templates by headers', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Resort Template',
          applicablePatterns: ['month.*price', 'resort'],
          useCount: 5,
          createdAt: new Date()
        },
        {
          id: '2',
          name: 'Hotel Template',
          applicablePatterns: ['hotel.*rate'],
          useCount: 3,
          createdAt: new Date()
        },
        {
          id: '3',
          name: 'Another Resort Template',
          applicablePatterns: ['resort.*pricing'],
          useCount: 8,
          createdAt: new Date()
        }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const result = await manager.findMatchingTemplates(['Month', 'Resort Price']);

      expect(result).toHaveLength(2);
      // Should be sorted by relevance and usage count
      expect(result[0].useCount).toBe(8); // Higher usage count
      expect(result[1].useCount).toBe(5);
    });
  });

  describe('Template Operations', () => {
    it('should use a template', async () => {
      await manager.useTemplate('template-id');

      expect(mockPersistence.incrementUsage).toHaveBeenCalledWith('template-id');
    });

    it('should update a template', async () => {
      const mockUpdated = { id: '1', name: 'Updated Template' } as MappingTemplate;
      mockPersistence.updateTemplate.mockResolvedValue(mockUpdated);

      const result = await manager.updateTemplate('1', { name: 'Updated Template' });

      expect(result).toEqual(mockUpdated);
      expect(mockPersistence.updateTemplate).toHaveBeenCalledWith('1', { name: 'Updated Template' });
    });

    it('should delete a template', async () => {
      await manager.deleteTemplate('template-id');

      expect(mockPersistence.deleteTemplate).toHaveBeenCalledWith('template-id');
    });
  });

  describe('Import/Export', () => {
    it('should export templates to JSON', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1' },
        { id: '2', name: 'Template 2' }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const result = await manager.exportTemplates();

      expect(result).toBe(JSON.stringify(mockTemplates, null, 2));
    });

    it('should import templates from JSON', async () => {
      const templatesData = [
        { id: '1', name: 'Template 1', mappings: [], applicablePatterns: [] },
        { id: '2', name: 'Template 2', mappings: [], applicablePatterns: [] }
      ];

      const jsonData = JSON.stringify(templatesData);
      
      mockPersistence.saveTemplate
        .mockResolvedValueOnce({ ...templatesData[0], id: 'new-1' })
        .mockResolvedValueOnce({ ...templatesData[1], id: 'new-2' });

      const result = await manager.importTemplates(jsonData);

      expect(result).toHaveLength(2);
      expect(mockPersistence.saveTemplate).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid JSON during import', async () => {
      await expect(manager.importTemplates('invalid json'))
        .rejects.toThrow('Failed to import templates');
    });
  });

  describe('Default Templates', () => {
    it('should create default templates', async () => {
      mockPersistence.saveTemplate.mockImplementation((template: any) => 
        Promise.resolve({ ...template, id: 'generated-id', createdAt: new Date(), useCount: 0 })
      );

      const result = await manager.createDefaultTemplates();

      expect(result.length).toBeGreaterThan(0);
      expect(mockPersistence.saveTemplate).toHaveBeenCalledTimes(3); // 3 default templates
    });

    it('should handle errors when creating default templates', async () => {
      mockPersistence.saveTemplate
        .mockResolvedValueOnce({ id: '1' })
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce({ id: '3' });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await manager.createDefaultTemplates();

      expect(result).toHaveLength(2); // Only successful saves
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Usage Analysis', () => {
    it('should analyze template usage', async () => {
      const now = new Date();
      const mockTemplates = [
        { id: '1', name: 'Popular', useCount: 10, createdAt: now },
        { id: '2', name: 'Unused', useCount: 0, createdAt: now },
        { id: '3', name: 'Moderate', useCount: 5, createdAt: now },
        { id: '4', name: 'Another Unused', useCount: 0, createdAt: now }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const analysis = await manager.analyzeUsage();

      expect(analysis.totalTemplates).toBe(4);
      expect(analysis.mostUsed).toHaveLength(2); // Only used templates
      expect(analysis.mostUsed[0].useCount).toBe(10);
      expect(analysis.leastUsed).toHaveLength(2); // Unused templates
      expect(analysis.suggestions).toContain('Consider reviewing unused templates and removing outdated ones');
    });

    it('should provide suggestions based on usage patterns', async () => {
      const mockTemplates = [
        { id: '1', name: 'Very Popular', useCount: 15, createdAt: new Date() }
      ] as MappingTemplate[];

      mockPersistence.loadTemplates.mockResolvedValue(mockTemplates);

      const analysis = await manager.analyzeUsage();

      expect(analysis.suggestions).toContain('Consider creating variations of your most-used templates for different scenarios');
    });

    it('should suggest creating templates when none exist', async () => {
      mockPersistence.loadTemplates.mockResolvedValue([]);

      const analysis = await manager.analyzeUsage();

      expect(analysis.totalTemplates).toBe(0);
      expect(analysis.suggestions).toContain('Create some default templates to speed up future mappings');
    });
  });
});