import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnMapper } from '../column-mapper';

describe('ColumnMapper', () => {
  let mapper: ColumnMapper;

  beforeEach(() => {
    mapper = new ColumnMapper();
  });

  describe('Column Analysis', () => {
    it('should detect currency data type', () => {
      const headers = ['Price'];
      const sampleData = [
        ['€150'],
        ['£200'],
        ['$250'],
        ['300.50']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].mapping.systemField).toBe('price');
      expect(suggestions[0].mapping.dataType).toBe('currency');
    });

    it('should detect month data type', () => {
      const headers = ['Month'];
      const sampleData = [
        ['January'],
        ['February'],
        ['March'],
        ['April']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].mapping.systemField).toBe('month');
      expect(suggestions[0].mapping.dataType).toBe('string');
    });

    it('should detect number data type', () => {
      const headers = ['Nights'];
      const sampleData = [
        ['2'],
        ['3'],
        ['4'],
        ['7']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].mapping.systemField).toBe('nights');
      expect(suggestions[0].mapping.dataType).toBe('number');
    });

    it('should detect list data type', () => {
      const headers = ['Inclusions'];
      const sampleData = [
        ['Breakfast, WiFi, Pool'],
        ['Dinner, Spa, Gym'],
        ['All meals, Transfer'],
        ['Breakfast; Pool; WiFi']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].mapping.systemField).toBe('inclusions');
      expect(suggestions[0].mapping.dataType).toBe('list');
    });
  });

  describe('Pattern Matching', () => {
    it('should match month patterns', () => {
      const monthHeaders = [
        'Month',
        'Period',
        'Jan',
        'January',
        'Time'
      ];

      for (const header of monthHeaders) {
        const suggestions = mapper.suggestMappings([header]);
        expect(suggestions[0]?.mapping.systemField).toBe('month');
      }
    });

    it('should match price patterns', () => {
      const priceHeaders = [
        'Price',
        'Cost',
        'Rate',
        'Amount',
        'Fee',
        '€',
        'EUR',
        'GBP'
      ];

      for (const header of priceHeaders) {
        const suggestions = mapper.suggestMappings([header]);
        const priceMapping = suggestions.find(s => s.mapping.systemField === 'price');
        expect(priceMapping).toBeDefined();
      }
    });

    it('should match accommodation patterns', () => {
      const accomHeaders = [
        'Accommodation',
        'Accom',
        'Type',
        'Room',
        'Hotel',
        'Apartment'
      ];

      for (const header of accomHeaders) {
        const suggestions = mapper.suggestMappings([header]);
        const accomMapping = suggestions.find(s => s.mapping.systemField === 'accommodationType');
        expect(accomMapping).toBeDefined();
      }
    });

    it('should match nights patterns', () => {
      const nightsHeaders = [
        'Nights',
        'Night',
        'N',
        'Days',
        '2 Nights',
        'Nights 3'
      ];

      for (const header of nightsHeaders) {
        const suggestions = mapper.suggestMappings([header]);
        const nightsMapping = suggestions.find(s => s.mapping.systemField === 'nights');
        expect(nightsMapping).toBeDefined();
      }
    });

    it('should match pax patterns', () => {
      const paxHeaders = [
        'Pax',
        'People',
        'Persons',
        'Adults',
        'Guests',
        '2 Pax',
        'Pax 4'
      ];

      for (const header of paxHeaders) {
        const suggestions = mapper.suggestMappings([header]);
        const paxMapping = suggestions.find(s => s.mapping.systemField === 'pax');
        expect(paxMapping).toBeDefined();
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to exact matches', () => {
      const suggestions = mapper.suggestMappings(['Price', 'Cost']);
      
      const priceMapping = suggestions.find(s => s.mapping.excelColumn === 'Price');
      const costMapping = suggestions.find(s => s.mapping.excelColumn === 'Cost');
      
      expect(priceMapping?.mapping.confidence).toBeGreaterThan(costMapping?.mapping.confidence || 0);
    });

    it('should boost confidence with consistent data', () => {
      const consistentData = [
        ['€150'],
        ['€200'],
        ['€250'],
        ['€300']
      ];

      const inconsistentData = [
        ['€150'],
        ['Text'],
        ['€250'],
        ['Another text']
      ];

      const consistentSuggestions = mapper.suggestMappings(['Price'], consistentData);
      const inconsistentSuggestions = mapper.suggestMappings(['Price'], inconsistentData);

      expect(consistentSuggestions[0].mapping.confidence)
        .toBeGreaterThan(inconsistentSuggestions[0].mapping.confidence);
    });

    it('should boost confidence with contextual columns', () => {
      // Price column with month context should have higher confidence
      const withContext = mapper.suggestMappings(['Month', 'Price']);
      const withoutContext = mapper.suggestMappings(['Price']);

      const priceWithContext = withContext.find(s => s.mapping.systemField === 'price');
      const priceWithoutContext = withoutContext.find(s => s.mapping.systemField === 'price');

      expect(priceWithContext?.mapping.confidence)
        .toBeGreaterThan(priceWithoutContext?.mapping.confidence || 0);
    });
  });

  describe('Data Transformation', () => {
    it('should transform currency values', () => {
      const mappings = [{
        excelColumn: 'Price',
        systemField: 'price',
        dataType: 'currency' as const,
        required: true,
        confidence: 0.9
      }];

      const data = [
        ['€150.50'],
        ['£200'],
        ['$250.75'],
        ['300']
      ];

      const result = mapper.applyMapping(data, mappings);

      expect(result).toEqual([
        { price: 150.50 },
        { price: 200 },
        { price: 250.75 },
        { price: 300 }
      ]);
    });

    it('should transform number values', () => {
      const mappings = [{
        excelColumn: 'Nights',
        systemField: 'nights',
        dataType: 'number' as const,
        required: false,
        confidence: 0.8
      }];

      const data = [
        ['2'],
        ['3'],
        ['4.5'],
        ['invalid']
      ];

      const result = mapper.applyMapping(data, mappings);

      expect(result).toEqual([
        { nights: 2 },
        { nights: 3 },
        { nights: 4.5 },
        { nights: null }
      ]);
    });

    it('should transform list values', () => {
      const mappings = [{
        excelColumn: 'Inclusions',
        systemField: 'inclusions',
        dataType: 'list' as const,
        required: false,
        confidence: 0.7
      }];

      const data = [
        ['Breakfast, WiFi, Pool'],
        ['Dinner; Spa; Gym'],
        ['All meals|Transfer'],
        ['Single item']
      ];

      const result = mapper.applyMapping(data, mappings);

      expect(result).toEqual([
        { inclusions: ['Breakfast', 'WiFi', 'Pool'] },
        { inclusions: ['Dinner', 'Spa', 'Gym'] },
        { inclusions: ['All meals', 'Transfer'] },
        { inclusions: ['Single item'] }
      ]);
    });

    it('should handle custom transformers', () => {
      const mappings = [{
        excelColumn: 'Month',
        systemField: 'month',
        dataType: 'string' as const,
        required: true,
        confidence: 0.9,
        transformer: (value: any) => String(value).toUpperCase()
      }];

      const data = [
        ['january'],
        ['february'],
        ['march']
      ];

      const result = mapper.applyMapping(data, mappings);

      expect(result).toEqual([
        { month: 'JANUARY' },
        { month: 'FEBRUARY' },
        { month: 'MARCH' }
      ]);
    });
  });

  describe('Template Management', () => {
    it('should save and load mapping templates', () => {
      const template = {
        name: 'Standard Resort Template',
        description: 'Common mapping for resort pricing files',
        mappings: [{
          excelColumn: 'Month',
          systemField: 'month',
          dataType: 'string' as const,
          required: true,
          confidence: 0.9
        }],
        applicablePatterns: ['month.*price', 'resort.*pricing']
      };

      const savedTemplate = mapper.saveMappingTemplate(template);
      expect(savedTemplate.id).toBeDefined();
      expect(savedTemplate.createdAt).toBeDefined();
      expect(savedTemplate.useCount).toBe(0);

      const templates = mapper.loadMappingTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe(template.name);
    });

    it('should find applicable templates', () => {
      const template1 = mapper.saveMappingTemplate({
        name: 'Resort Template',
        description: 'For resort files',
        mappings: [],
        applicablePatterns: ['month', 'price']
      });

      const template2 = mapper.saveMappingTemplate({
        name: 'Hotel Template',
        description: 'For hotel files',
        mappings: [],
        applicablePatterns: ['hotel', 'accommodation']
      });

      const applicableForResort = mapper.findApplicableTemplates(['Month', 'Price', 'Resort']);
      const applicableForHotel = mapper.findApplicableTemplates(['Hotel', 'Room', 'Rate']);

      expect(applicableForResort).toContain(template1);
      expect(applicableForHotel).toContain(template2);
    });

    it('should track template usage', () => {
      const template = mapper.saveMappingTemplate({
        name: 'Test Template',
        description: 'Test',
        mappings: [],
        applicablePatterns: ['test']
      });

      expect(template.useCount).toBe(0);
      expect(template.lastUsed).toBeUndefined();

      mapper.useTemplate(template.id);

      const templates = mapper.loadMappingTemplates();
      const usedTemplate = templates.find(t => t.id === template.id);

      expect(usedTemplate?.useCount).toBe(1);
      expect(usedTemplate?.lastUsed).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should validate required fields', () => {
      const mappings = [{
        excelColumn: 'Description',
        systemField: 'description',
        dataType: 'string' as const,
        required: false,
        confidence: 0.5
      }];

      const validation = mapper.validateMappings(mappings);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Required field 'month' is not mapped");
      expect(validation.errors).toContain("Required field 'price' is not mapped");
    });

    it('should detect duplicate mappings', () => {
      const mappings = [
        {
          excelColumn: 'Month1',
          systemField: 'month',
          dataType: 'string' as const,
          required: true,
          confidence: 0.9
        },
        {
          excelColumn: 'Month2',
          systemField: 'month',
          dataType: 'string' as const,
          required: true,
          confidence: 0.8
        }
      ];

      const validation = mapper.validateMappings(mappings);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Field 'month' is mapped multiple times");
    });

    it('should validate successful mappings', () => {
      const mappings = [
        {
          excelColumn: 'Month',
          systemField: 'month',
          dataType: 'string' as const,
          required: true,
          confidence: 0.9
        },
        {
          excelColumn: 'Price',
          systemField: 'price',
          dataType: 'currency' as const,
          required: true,
          confidence: 0.8
        }
      ];

      const validation = mapper.validateMappings(mappings);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multi-column pricing structure', () => {
      const headers = ['Month', '2N/2P', '3N/2P', '4N/2P', '2N/4P', '3N/4P'];
      const sampleData = [
        ['January', '150', '200', '250', '300', '350'],
        ['February', '160', '210', '260', '310', '360'],
        ['March', '170', '220', '270', '320', '370']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);

      expect(suggestions).toHaveLength(6);
      
      const monthMapping = suggestions.find(s => s.mapping.systemField === 'month');
      expect(monthMapping).toBeDefined();
      expect(monthMapping?.mapping.confidence).toBeGreaterThan(0.7);

      const priceMappings = suggestions.filter(s => s.mapping.systemField === 'price');
      expect(priceMappings.length).toBeGreaterThan(0);
    });

    it('should handle accommodation-specific columns', () => {
      const headers = ['Month', 'Hotel Price', 'Apartment Price', 'Villa Price'];
      const sampleData = [
        ['January', '150', '120', '300'],
        ['February', '160', '130', '320'],
        ['March', '170', '140', '340']
      ];

      const suggestions = mapper.suggestMappings(headers, sampleData);

      expect(suggestions).toHaveLength(4);
      
      const monthMapping = suggestions.find(s => s.mapping.systemField === 'month');
      expect(monthMapping).toBeDefined();

      const priceMappings = suggestions.filter(s => s.mapping.systemField === 'price');
      expect(priceMappings.length).toBe(3);
    });

    it('should provide alternative suggestions', () => {
      const suggestions = mapper.suggestMappings(['Rate']);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].alternatives.length).toBeGreaterThan(0);
      
      // Rate could be price or could be other fields
      const alternatives = suggestions[0].alternatives.map(alt => alt.systemField);
      expect(alternatives).toContain('price');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty headers', () => {
      const suggestions = mapper.suggestMappings([]);
      expect(suggestions).toHaveLength(0);
    });

    it('should handle headers with no clear mapping', () => {
      const suggestions = mapper.suggestMappings(['Random Column', 'Another Random']);
      
      // Should still try to provide suggestions, even if confidence is low
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
      
      if (suggestions.length > 0) {
        expect(suggestions[0].mapping.confidence).toBeLessThan(0.7);
      }
    });

    it('should handle null and undefined values in data', () => {
      const mappings = [{
        excelColumn: 'Price',
        systemField: 'price',
        dataType: 'currency' as const,
        required: true,
        confidence: 0.9
      }];

      const data = [
        [null],
        [undefined],
        [''],
        ['150']
      ];

      const result = mapper.applyMapping(data, mappings);

      expect(result).toEqual([
        { price: null },
        { price: null },
        { price: null },
        { price: 150 }
      ]);
    });
  });
});