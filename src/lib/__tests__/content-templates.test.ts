import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { describe } from 'vitest';
import {
  CONTENT_TEMPLATES,
  CONTENT_SNIPPETS,
  getTemplatesByCategory,
  getSnippetsByCategory,
  searchTemplates,
  getTemplateById,
  getSnippetById,
  ContentTemplate,
  ContentSnippet
} from '../content-templates';

describe('Content Templates', () => {
  describe('CONTENT_TEMPLATES', () => {
    it('should contain templates for all destination sections', () => {
      const categories = ['overview', 'accommodation', 'attractions', 'beaches', 'nightlife', 'dining', 'practical'];
      
      categories.forEach(category => {
        const templatesInCategory = CONTENT_TEMPLATES.filter(t => t.category === category);
        expect(templatesInCategory.length).toBeGreaterThan(0);
      });
    });

    it('should have valid template structure', () => {
      CONTENT_TEMPLATES.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('content');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('tags');
        
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.content).toBe('string');
        expect(typeof template.category).toBe('string');
        expect(Array.isArray(template.tags)).toBe(true);
        
        expect(template.id.length).toBeGreaterThan(0);
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.content.length).toBeGreaterThan(0);
      });
    });

    it('should have unique template IDs', () => {
      const ids = CONTENT_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should contain HTML content', () => {
      CONTENT_TEMPLATES.forEach(template => {
        expect(template.content).toMatch(/<[^>]+>/); // Contains HTML tags
      });
    });
  });

  describe('CONTENT_SNIPPETS', () => {
    it('should contain useful content snippets', () => {
      expect(CONTENT_SNIPPETS.length).toBeGreaterThan(0);
    });

    it('should have valid snippet structure', () => {
      CONTENT_SNIPPETS.forEach(snippet => {
        expect(snippet).toHaveProperty('id');
        expect(snippet).toHaveProperty('name');
        expect(snippet).toHaveProperty('content');
        expect(snippet).toHaveProperty('category');
        
        expect(typeof snippet.id).toBe('string');
        expect(typeof snippet.name).toBe('string');
        expect(typeof snippet.content).toBe('string');
        expect(typeof snippet.category).toBe('string');
        
        expect(snippet.id.length).toBeGreaterThan(0);
        expect(snippet.name.length).toBeGreaterThan(0);
        expect(snippet.content.length).toBeGreaterThan(0);
      });
    });

    it('should have unique snippet IDs', () => {
      const ids = CONTENT_SNIPPETS.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have shortcuts for some snippets', () => {
      const snippetsWithShortcuts = CONTENT_SNIPPETS.filter(s => s.shortcut);
      expect(snippetsWithShortcuts.length).toBeGreaterThan(0);
      
      snippetsWithShortcuts.forEach(snippet => {
        expect(typeof snippet.shortcut).toBe('string');
        expect(snippet.shortcut!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for valid categories', () => {
      const overviewTemplates = getTemplatesByCategory('overview');
      expect(overviewTemplates.length).toBeGreaterThan(0);
      
      overviewTemplates.forEach(template => {
        expect(template.category).toBe('overview');
      });
    });

    it('should return empty array for invalid category', () => {
      const invalidTemplates = getTemplatesByCategory('invalid-category');
      expect(invalidTemplates).toEqual([]);
    });

    it('should return all accommodation templates', () => {
      const accommodationTemplates = getTemplatesByCategory('accommodation');
      expect(accommodationTemplates.length).toBeGreaterThan(0);
      
      accommodationTemplates.forEach(template => {
        expect(template.category).toBe('accommodation');
      });
    });
  });

  describe('getSnippetsByCategory', () => {
    it('should return snippets for valid categories', () => {
      const formattingSnippets = getSnippetsByCategory('formatting');
      expect(formattingSnippets.length).toBeGreaterThan(0);
      
      formattingSnippets.forEach(snippet => {
        expect(snippet.category).toBe('formatting');
      });
    });

    it('should return empty array for invalid category', () => {
      const invalidSnippets = getSnippetsByCategory('invalid-category');
      expect(invalidSnippets).toEqual([]);
    });
  });

  describe('searchTemplates', () => {
    it('should find templates by name', () => {
      const results = searchTemplates('beach');
      expect(results.length).toBeGreaterThan(0);
      
      const hasBeachInName = results.some(template => 
        template.name.toLowerCase().includes('beach')
      );
      expect(hasBeachInName).toBe(true);
    });

    it('should find templates by description', () => {
      const results = searchTemplates('coastal');
      expect(results.length).toBeGreaterThan(0);
      
      const hasCoastalInDescription = results.some(template => 
        template.description.toLowerCase().includes('coastal')
      );
      expect(hasCoastalInDescription).toBe(true);
    });

    it('should find templates by tags', () => {
      const results = searchTemplates('culture');
      expect(results.length).toBeGreaterThan(0);
      
      const hasCultureTag = results.some(template => 
        template.tags.some(tag => tag.toLowerCase().includes('culture'))
      );
      expect(hasCultureTag).toBe(true);
    });

    it('should be case insensitive', () => {
      const lowerResults = searchTemplates('beach');
      const upperResults = searchTemplates('BEACH');
      const mixedResults = searchTemplates('Beach');
      
      expect(lowerResults).toEqual(upperResults);
      expect(lowerResults).toEqual(mixedResults);
    });

    it('should return empty array for no matches', () => {
      const results = searchTemplates('nonexistent-term-xyz');
      expect(results).toEqual([]);
    });

    it('should return all templates for empty query', () => {
      const results = searchTemplates('');
      expect(results.length).toBe(CONTENT_TEMPLATES.length);
    });
  });

  describe('getTemplateById', () => {
    it('should return template for valid ID', () => {
      const firstTemplate = CONTENT_TEMPLATES[0];
      const result = getTemplateById(firstTemplate.id);
      
      expect(result).toEqual(firstTemplate);
    });

    it('should return undefined for invalid ID', () => {
      const result = getTemplateById('invalid-id');
      expect(result).toBeUndefined();
    });

    it('should return correct template for each valid ID', () => {
      CONTENT_TEMPLATES.forEach(template => {
        const result = getTemplateById(template.id);
        expect(result).toEqual(template);
      });
    });
  });

  describe('getSnippetById', () => {
    it('should return snippet for valid ID', () => {
      const firstSnippet = CONTENT_SNIPPETS[0];
      const result = getSnippetById(firstSnippet.id);
      
      expect(result).toEqual(firstSnippet);
    });

    it('should return undefined for invalid ID', () => {
      const result = getSnippetById('invalid-id');
      expect(result).toBeUndefined();
    });

    it('should return correct snippet for each valid ID', () => {
      CONTENT_SNIPPETS.forEach(snippet => {
        const result = getSnippetById(snippet.id);
        expect(result).toEqual(snippet);
      });
    });
  });

  describe('Template Content Quality', () => {
    it('should have meaningful content in templates', () => {
      CONTENT_TEMPLATES.forEach(template => {
        // Should contain headings
        expect(template.content).toMatch(/<h[1-6]>/);
        
        // Should contain paragraphs or lists
        expect(template.content).toMatch(/<(p|ul|ol)>/);
        
        // Should not be too short
        expect(template.content.length).toBeGreaterThan(100);
      });
    });

    it('should have placeholder text for customization', () => {
      const templatesWithPlaceholders = CONTENT_TEMPLATES.filter(template =>
        template.content.includes('[') && template.content.includes(']')
      );
      
      expect(templatesWithPlaceholders.length).toBeGreaterThan(0);
    });

    it('should include emojis or visual elements', () => {
      const templatesWithEmojis = CONTENT_TEMPLATES.filter(template =>
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(template.content)
      );
      
      expect(templatesWithEmojis.length).toBeGreaterThan(0);
    });
  });

  describe('Snippet Content Quality', () => {
    it('should have functional HTML in snippets', () => {
      CONTENT_SNIPPETS.forEach(snippet => {
        // Should contain HTML tags
        expect(snippet.content).toMatch(/<[^>]+>/);
        
        // Should not be empty
        expect(snippet.content.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have formatting snippets with proper styling', () => {
      const formattingSnippets = getSnippetsByCategory('formatting');
      
      formattingSnippets.forEach(snippet => {
        // Should contain style attributes or CSS classes
        expect(snippet.content).toMatch(/(style=|class=)/);
      });
    });

    it('should have content snippets with structured information', () => {
      const contentSnippets = getSnippetsByCategory('content');
      
      contentSnippets.forEach(snippet => {
        // Should contain meaningful structure
        expect(snippet.content).toMatch(/<(strong|p|br)/);
      });
    });
  });

  describe('Category Coverage', () => {
    it('should cover all destination section categories', () => {
      const expectedCategories = ['overview', 'accommodation', 'attractions', 'beaches', 'nightlife', 'dining', 'practical'];
      const actualCategories = [...new Set(CONTENT_TEMPLATES.map(t => t.category))];
      
      expectedCategories.forEach(category => {
        expect(actualCategories).toContain(category);
      });
    });

    it('should have multiple templates for popular categories', () => {
      const popularCategories = ['overview', 'accommodation'];
      
      popularCategories.forEach(category => {
        const templates = getTemplatesByCategory(category);
        expect(templates.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
});