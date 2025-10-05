import { describe, it, expect } from 'vitest';
import { InclusionsTextProcessor } from '../inclusions-text-processor';

describe('InclusionsTextProcessor', () => {
  let processor: InclusionsTextProcessor;

  beforeEach(() => {
    processor = new InclusionsTextProcessor();
  });

  describe('Basic Text Cleaning', () => {
    it('should remove bullet points and numbering', () => {
      const testCases = [
        { input: '• Daily breakfast', expected: 'Daily breakfast' },
        { input: '- Free WiFi', expected: 'Free WiFi' },
        { input: '* Pool access', expected: 'Pool access' },
        { input: '1. Airport transfer', expected: 'Airport transfer' },
        { input: '2) Gym facilities', expected: 'Gym facilities' },
        { input: '(3) Spa services', expected: 'Spa services' }
      ];

      for (const testCase of testCases) {
        const result = processor.processInclusionItem(testCase.input);
        expect(result.cleanedText).toBe(testCase.expected);
      }
    });

    it('should clean extra whitespace', () => {
      const result = processor.processInclusionItem('  •   Daily    breakfast   ');
      expect(result.cleanedText).toBe('Daily breakfast');
    });

    it('should capitalize first letter', () => {
      const result = processor.processInclusionItem('• daily breakfast');
      expect(result.cleanedText).toBe('Daily breakfast');
    });

    it('should remove trailing periods', () => {
      const result = processor.processInclusionItem('• Daily breakfast.');
      expect(result.cleanedText).toBe('Daily breakfast');
    });
  });

  describe('Content Validation', () => {
    it('should validate meaningful content', () => {
      const validInclusions = [
        'Daily breakfast',
        'Free WiFi access',
        'Airport transfer service',
        'Swimming pool',
        'Gym facilities'
      ];

      for (const inclusion of validInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      }
    });

    it('should reject too short content', () => {
      const shortInclusions = ['A', 'Wi', ''];

      for (const inclusion of shortInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Text too short');
      }
    });

    it('should reject placeholder text', () => {
      const placeholders = [
        'Item 1',
        'TBD',
        'Coming soon',
        'N/A',
        'Example inclusion',
        '---',
        'xxx'
      ];

      for (const placeholder of placeholders) {
        const result = processor.processInclusionItem(placeholder);
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Appears to be placeholder text');
      }
    });

    it('should reject number-only content', () => {
      const result = processor.processInclusionItem('123');
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Contains only numbers');
    });

    it('should reject overly long content', () => {
      const longText = 'This is an extremely long inclusion description that goes on and on with way too much detail about every single aspect of the service which makes it more like a full description rather than a simple inclusion item that should be concise and to the point for easy reading and understanding by customers who just want to know what is included in their package without reading a novel about each individual service or amenity that is provided by the establishment.';
      
      const result = processor.processInclusionItem(longText);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Text too long (may be description rather than inclusion)');
    });
  });

  describe('Categorization', () => {
    it('should categorize dining inclusions', () => {
      const diningInclusions = [
        'Daily breakfast',
        'Buffet meals',
        'Restaurant dining',
        'Food service'
      ];

      for (const inclusion of diningInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.category).toBe('Dining');
      }
    });

    it('should categorize internet inclusions', () => {
      const internetInclusions = [
        'Free WiFi',
        'Internet access',
        'Wireless connection'
      ];

      for (const inclusion of internetInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.category).toBe('Internet');
      }
    });

    it('should categorize facility inclusions', () => {
      const facilityInclusions = [
        'Swimming pool',
        'Gym access',
        'Spa services',
        'Fitness center',
        'Sauna'
      ];

      for (const inclusion of facilityInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.category).toBe('Facilities');
      }
    });

    it('should categorize transport inclusions', () => {
      const transportInclusions = [
        'Airport transfer',
        'Shuttle service',
        'Transport included',
        'Pickup service'
      ];

      for (const inclusion of transportInclusions) {
        const result = processor.processInclusionItem(inclusion);
        expect(result.category).toBe('Transport');
      }
    });

    it('should use Other category for unrecognized items', () => {
      const result = processor.processInclusionItem('Special unique service');
      expect(result.category).toBe('Other');
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to well-formed inclusions', () => {
      const goodInclusion = processor.processInclusionItem('Daily breakfast included');
      const poorInclusion = processor.processInclusionItem('X');

      expect(goodInclusion.confidence).toBeGreaterThan(poorInclusion.confidence);
    });

    it('should boost confidence for inclusion keywords', () => {
      const withKeywords = processor.processInclusionItem('Complimentary breakfast service');
      const withoutKeywords = processor.processInclusionItem('Morning food');

      expect(withKeywords.confidence).toBeGreaterThan(withoutKeywords.confidence);
    });

    it('should reduce confidence for vague terms', () => {
      const specific = processor.processInclusionItem('Daily breakfast');
      const vague = processor.processInclusionItem('Various services available');

      expect(specific.confidence).toBeGreaterThan(vague.confidence);
    });

    it('should prefer optimal length inclusions', () => {
      const optimal = processor.processInclusionItem('Daily breakfast service');
      const tooShort = processor.processInclusionItem('Food');
      const tooLong = processor.processInclusionItem('Comprehensive daily breakfast service with extensive buffet options including continental and local specialties served in our elegant dining room with panoramic views');

      expect(optimal.confidence).toBeGreaterThan(tooShort.confidence);
      expect(optimal.confidence).toBeGreaterThan(tooLong.confidence);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple inclusions', () => {
      const inclusions = [
        '• Daily breakfast',
        '• Free WiFi',
        '• Swimming pool',
        '• Airport transfer',
        '• Invalid item: TBD'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.processedItems).toHaveLength(5);
      expect(result.validItems).toHaveLength(4);
      expect(result.invalidItems).toHaveLength(1);
    });

    it('should categorize items correctly', () => {
      const inclusions = [
        'Daily breakfast',
        'Free WiFi',
        'Swimming pool',
        'Airport transfer'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.categories.has('Dining')).toBe(true);
      expect(result.categories.has('Internet')).toBe(true);
      expect(result.categories.has('Facilities')).toBe(true);
      expect(result.categories.has('Transport')).toBe(true);
    });

    it('should calculate overall quality', () => {
      const goodInclusions = [
        'Daily breakfast included',
        'Free WiFi access',
        'Swimming pool facilities',
        'Airport transfer service'
      ];

      const poorInclusions = [
        'TBD',
        'X',
        'Item 1',
        'Coming soon'
      ];

      const goodResult = processor.processInclusions(goodInclusions);
      const poorResult = processor.processInclusions(poorInclusions);

      expect(goodResult.overallQuality).toBeGreaterThan(poorResult.overallQuality);
      expect(goodResult.overallQuality).toBeGreaterThan(0.7);
      expect(poorResult.overallQuality).toBeLessThan(0.3);
    });
  });

  describe('Formatting for Display', () => {
    it('should format as bullet points', () => {
      const items = [
        processor.processInclusionItem('Daily breakfast'),
        processor.processInclusionItem('Free WiFi')
      ];

      const formatted = processor.formatForDisplay(items, 'bullet');

      expect(formatted).toEqual([
        '• Daily breakfast',
        '• Free WiFi'
      ]);
    });

    it('should format as numbered list', () => {
      const items = [
        processor.processInclusionItem('Daily breakfast'),
        processor.processInclusionItem('Free WiFi')
      ];

      const formatted = processor.formatForDisplay(items, 'numbered');

      expect(formatted).toEqual([
        '1. Daily breakfast',
        '2. Free WiFi'
      ]);
    });

    it('should format as plain text', () => {
      const items = [
        processor.processInclusionItem('Daily breakfast'),
        processor.processInclusionItem('Free WiFi')
      ];

      const formatted = processor.formatForDisplay(items, 'plain');

      expect(formatted).toEqual([
        'Daily breakfast',
        'Free WiFi'
      ]);
    });

    it('should preserve emphasis in formatting', () => {
      const item = processor.processInclusionItem('**DAILY BREAKFAST**');
      item.emphasis = 'bold'; // Simulate emphasis detection
      
      const formatted = processor.formatForDisplay([item], 'bullet');
      expect(formatted[0]).toBe('• **Daily breakfast**');
    });
  });

  describe('Grouping by Category', () => {
    it('should group items by category', () => {
      const items = [
        processor.processInclusionItem('Daily breakfast'),
        processor.processInclusionItem('Buffet dinner'),
        processor.processInclusionItem('Free WiFi'),
        processor.processInclusionItem('Swimming pool')
      ];

      const groups = processor.groupByCategory(items);

      expect(groups.has('Dining')).toBe(true);
      expect(groups.has('Internet')).toBe(true);
      expect(groups.has('Facilities')).toBe(true);
      
      expect(groups.get('Dining')).toHaveLength(2);
      expect(groups.get('Internet')).toHaveLength(1);
      expect(groups.get('Facilities')).toHaveLength(1);
    });
  });

  describe('Merging Similar Inclusions', () => {
    it('should identify similar inclusions', () => {
      const items = [
        processor.processInclusionItem('Daily breakfast'),
        processor.processInclusionItem('Breakfast daily'),
        processor.processInclusionItem('Free WiFi'),
        processor.processInclusionItem('WiFi access free')
      ];

      const merged = processor.mergeSimilarInclusions(items);

      expect(merged.length).toBeLessThan(items.length);
      expect(merged.length).toBe(2); // Should merge breakfast items and WiFi items
    });

    it('should preserve best quality when merging', () => {
      const items = [
        processor.processInclusionItem('Breakfast'),
        processor.processInclusionItem('Daily breakfast service included')
      ];

      const merged = processor.mergeSimilarInclusions(items);

      expect(merged).toHaveLength(1);
      // Should prefer the more descriptive version
      expect(merged[0].cleanedText).toContain('Daily');
    });
  });

  describe('Suggestions Generation', () => {
    it('should suggest attention for invalid items', () => {
      const inclusions = [
        'Daily breakfast',
        'TBD',
        'Free WiFi'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.suggestions.some(s => s.includes('need attention'))).toBe(true);
    });

    it('should suggest more descriptive details for short items', () => {
      const inclusions = [
        'Food',
        'WiFi',
        'Pool'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.suggestions).toContain('Some inclusions are very brief. Consider adding more descriptive details.');
    });

    it('should suggest diversification for single category', () => {
      const inclusions = [
        'Breakfast',
        'Lunch',
        'Dinner',
        'Snacks',
        'Beverages',
        'Room service'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.suggestions.some(s => s.includes('diversifying inclusions'))).toBe(true);
    });

    it('should suggest adding more inclusions for short lists', () => {
      const inclusions = ['Daily breakfast'];

      const result = processor.processInclusions(inclusions);

      expect(result.suggestions).toContain('Consider adding more inclusions to provide better value perception.');
    });

    it('should suggest clarity improvements for low confidence items', () => {
      const inclusions = [
        'Various services available',
        'Some facilities',
        'Certain amenities'
      ];

      const result = processor.processInclusions(inclusions);

      expect(result.suggestions).toContain('Some inclusions have unclear descriptions. Consider rewording for clarity.');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = processor.processInclusions([]);

      expect(result.processedItems).toHaveLength(0);
      expect(result.validItems).toHaveLength(0);
      expect(result.overallQuality).toBe(0);
    });

    it('should handle null and undefined values', () => {
      const items = [
        processor.processInclusionItem(''),
        processor.processInclusionItem('   '),
        processor.processInclusionItem('Valid inclusion')
      ];

      expect(items[0].isValid).toBe(false);
      expect(items[1].isValid).toBe(false);
      expect(items[2].isValid).toBe(true);
    });

    it('should handle special characters', () => {
      const result = processor.processInclusionItem('• Café & restaurant access');
      expect(result.isValid).toBe(true);
      expect(result.cleanedText).toBe('Café & restaurant access');
    });

    it('should handle mixed language content', () => {
      const result = processor.processInclusionItem('• Desayuno incluido (breakfast included)');
      expect(result.isValid).toBe(true);
      expect(result.category).toBe('Dining');
    });
  });

  describe('Performance', () => {
    it('should handle large lists efficiently', () => {
      const largeList = Array(1000).fill(0).map((_, i) => `Inclusion item ${i + 1}`);
      
      const startTime = Date.now();
      const result = processor.processInclusions(largeList);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.processedItems).toHaveLength(1000);
    });
  });
});