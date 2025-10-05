import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { InclusionsSectionDetector } from '../inclusions-section-detector';

describe('InclusionsSectionDetector', () => {
  let detector: InclusionsSectionDetector;

  const createWorksheet = (data: any[][]): XLSX.WorkSheet => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    return ws;
  };

  describe('Basic Inclusions Detection', () => {
    it('should detect inclusions with bullet points', () => {
      const data = [
        ['Resort Name', 'Benidorm Palace'],
        [''],
        ['Package Includes:'],
        ['• Daily breakfast'],
        ['• Airport transfers'],
        ['• Welcome drink'],
        ['• Free WiFi'],
        ['• Pool access']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual([
        '• Daily breakfast',
        '• Airport transfers', 
        '• Welcome drink',
        '• Free WiFi',
        '• Pool access'
      ]);
      expect(result.sections[0].format).toBe('bullet-points');
      expect(result.sections[0].confidence).toBeGreaterThan(0.5);
    });

    it('should detect inclusions with numbered list', () => {
      const data = [
        ['Hotel Amenities'],
        ['What\'s Included:'],
        ['1. Breakfast buffet'],
        ['2. Swimming pool'],
        ['3. Fitness center'],
        ['4. 24-hour reception'],
        ['5. Concierge service']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual([
        '1. Breakfast buffet',
        '2. Swimming pool',
        '3. Fitness center', 
        '4. 24-hour reception',
        '5. Concierge service'
      ]);
      expect(result.sections[0].format).toBe('numbered');
    });

    it('should detect inclusions with plain text format', () => {
      const data = [
        ['Inclusions'],
        ['Breakfast included'],
        ['Airport pickup'],
        ['Daily housekeeping'],
        ['Complimentary WiFi']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual([
        'Breakfast included',
        'Airport pickup',
        'Daily housekeeping',
        'Complimentary WiFi'
      ]);
      expect(result.sections[0].format).toBe('plain-text');
    });
  });

  describe('Multiple Accommodation Types', () => {
    it('should separate inclusions by accommodation type', () => {
      const data = [
        ['Hotel Inclusions:'],
        ['• Room service'],
        ['• Daily breakfast'],
        ['• Concierge'],
        [''],
        ['Self-Catering Inclusions:'],
        ['• Kitchen facilities'],
        ['• Weekly cleaning'],
        ['• Linen change']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(2);
      expect(result.byAccommodationType.has('Hotel')).toBe(true);
      expect(result.byAccommodationType.has('Self-Catering')).toBe(true);
      
      const hotelInclusions = result.byAccommodationType.get('Hotel');
      expect(hotelInclusions?.content).toEqual([
        '• Room service',
        '• Daily breakfast',
        '• Concierge'
      ]);
      
      const selfCateringInclusions = result.byAccommodationType.get('Self-Catering');
      expect(selfCateringInclusions?.content).toEqual([
        '• Kitchen facilities',
        '• Weekly cleaning',
        '• Linen change'
      ]);
    });

    it('should detect accommodation type from header text', () => {
      const data = [
        ['Villa Package Includes:'],
        ['- Private pool'],
        ['- Garden area'],
        ['- BBQ facilities'],
        ['- Car parking']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].accommodationType).toBe('Villa');
    });
  });

  describe('Various Bullet Point Formats', () => {
    it('should handle different bullet point characters', () => {
      const data = [
        ['Included Services:'],
        ['• Standard bullet'],
        ['- Dash bullet'],
        ['* Asterisk bullet'],
        ['+ Plus bullet'],
        ['o Letter o bullet'],
        ['> Arrow bullet']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].format).toBe('bullet-points');
      expect(result.sections[0].content).toHaveLength(6);
    });

    it('should handle different numbered formats', () => {
      const data = [
        ['Package Features:'],
        ['1. First item'],
        ['2) Second item'],
        ['(3) Third item'],
        ['a. Fourth item'],
        ['b) Fifth item'],
        ['i. Sixth item']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].format).toBe('numbered');
      expect(result.sections[0].content).toHaveLength(6);
    });
  });

  describe('Keyword Detection', () => {
    it('should detect various inclusion keywords', () => {
      const keywords = [
        'Inclusions',
        'Included',
        'Includes', 
        'Package Includes',
        'What\'s Included',
        'What is included',
        'Included in price',
        'Price includes',
        'Package contains',
        'Contains',
        'Features',
        'Amenities',
        'Services included'
      ];

      for (const keyword of keywords) {
        const data = [
          [keyword],
          ['Item 1'],
          ['Item 2']
        ];

        const worksheet = createWorksheet(data);
        detector = new InclusionsSectionDetector(worksheet);
        
        const result = detector.detectInclusionsSections();
        
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].headerText).toBe(keyword);
      }
    });
  });

  describe('Content Validation', () => {
    it('should filter out non-inclusion content', () => {
      const data = [
        ['Inclusions:'],
        ['• Real inclusion item'],
        ['150'], // Price - should be filtered
        ['January'], // Month - should be filtered  
        ['Hotel'], // Accommodation type only - should be filtered
        ['• Another real inclusion'],
        [''], // Empty - should be filtered
        ['Valid inclusion text']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual([
        '• Real inclusion item',
        '• Another real inclusion',
        'Valid inclusion text'
      ]);
    });

    it('should require minimum content length', () => {
      const data = [
        ['Inclusions:'],
        ['ab'], // Too short
        ['Valid inclusion item'],
        ['x'] // Too short
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual(['Valid inclusion item']);
    });
  });

  describe('Section Boundaries', () => {
    it('should stop at empty rows', () => {
      const data = [
        ['Package Includes:'],
        ['• Item 1'],
        ['• Item 2'],
        [''], // Empty row
        [''], // Another empty row  
        [''], // Third empty row - should stop here
        ['• This should not be included'],
        ['Different section content']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].content).toEqual([
        '• Item 1',
        '• Item 2'
      ]);
    });

    it('should handle sections in different columns', () => {
      const data = [
        ['', 'Hotel Inclusions:', 'Villa Inclusions:'],
        ['', '• Hotel item 1', '• Villa item 1'],
        ['', '• Hotel item 2', '• Villa item 2'],
        ['', '• Hotel item 3', '• Villa item 3']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(2);
      
      const hotelSection = result.sections.find(s => s.accommodationType === 'Hotel');
      const villaSection = result.sections.find(s => s.accommodationType === 'Villa');
      
      expect(hotelSection?.content).toEqual([
        '• Hotel item 1',
        '• Hotel item 2', 
        '• Hotel item 3'
      ]);
      
      expect(villaSection?.content).toEqual([
        '• Villa item 1',
        '• Villa item 2',
        '• Villa item 3'
      ]);
    });
  });

  describe('Confidence Scoring', () => {
    it('should give higher confidence to keyword-based detection', () => {
      const keywordData = [
        ['Package Includes:'], // Clear keyword
        ['• Item 1'],
        ['• Item 2'],
        ['• Item 3']
      ];

      const patternData = [
        ['Some header'], // No clear keyword
        ['• Item 1'], // Detected by bullet pattern
        ['• Item 2'],
        ['• Item 3']
      ];

      const keywordWorksheet = createWorksheet(keywordData);
      const patternWorksheet = createWorksheet(patternData);
      
      const keywordDetector = new InclusionsSectionDetector(keywordWorksheet);
      const patternDetector = new InclusionsSectionDetector(patternWorksheet);
      
      const keywordResult = keywordDetector.detectInclusionsSections();
      const patternResult = patternDetector.detectInclusionsSections();
      
      expect(keywordResult.sections[0].confidence).toBeGreaterThan(patternResult.sections[0].confidence);
    });

    it('should give higher confidence to more content', () => {
      const moreContentData = [
        ['Inclusions:'],
        ['• Item 1'],
        ['• Item 2'],
        ['• Item 3'],
        ['• Item 4'],
        ['• Item 5']
      ];

      const lessContentData = [
        ['Inclusions:'],
        ['• Item 1'],
        ['• Item 2']
      ];

      const moreWorksheet = createWorksheet(moreContentData);
      const lessWorksheet = createWorksheet(lessContentData);
      
      const moreDetector = new InclusionsSectionDetector(moreWorksheet);
      const lessDetector = new InclusionsSectionDetector(lessWorksheet);
      
      const moreResult = moreDetector.detectInclusionsSections();
      const lessResult = lessDetector.detectInclusionsSections();
      
      expect(moreResult.sections[0].confidence).toBeGreaterThan(lessResult.sections[0].confidence);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty worksheet', () => {
      const worksheet = createWorksheet([]);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle worksheet with no inclusions', () => {
      const data = [
        ['Resort Name', 'Test Resort'],
        ['January', '150', '200', '250'],
        ['February', '160', '210', '260'],
        ['March', '170', '220', '270']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.sections).toHaveLength(0);
      expect(result.suggestions).toContain('No inclusions sections detected. Add a clearly labeled "Inclusions" or "What\'s Included" section.');
    });

    it('should remove duplicate sections', () => {
      const data = [
        ['Inclusions:', 'Package Includes:'], // Two headers close together
        ['• Item 1', '• Item 1'],
        ['• Item 2', '• Item 2']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      // Should detect only one section, not duplicate
      expect(result.sections).toHaveLength(1);
    });
  });

  describe('Utility Methods', () => {
    it('should return best inclusions section', () => {
      const data = [
        ['Weak header'], // Lower confidence
        ['• Item 1'],
        [''],
        ['Package Includes:'], // Higher confidence
        ['• Item A'],
        ['• Item B'],
        ['• Item C'],
        ['• Item D']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const bestSection = detector.getBestInclusionsSection();
      
      expect(bestSection).not.toBeNull();
      expect(bestSection?.headerText).toBe('Package Includes:');
      expect(bestSection?.content).toHaveLength(4);
    });

    it('should check if worksheet has inclusions sections', () => {
      const withInclusionsData = [
        ['Inclusions:'],
        ['• Item 1'],
        ['• Item 2']
      ];

      const withoutInclusionsData = [
        ['Resort Name'],
        ['January', '150'],
        ['February', '160']
      ];

      const withWorksheet = createWorksheet(withInclusionsData);
      const withoutWorksheet = createWorksheet(withoutInclusionsData);
      
      const withDetector = new InclusionsSectionDetector(withWorksheet);
      const withoutDetector = new InclusionsSectionDetector(withoutWorksheet);
      
      expect(withDetector.hasInclusionsSections()).toBe(true);
      expect(withoutDetector.hasInclusionsSections()).toBe(false);
    });
  });

  describe('Suggestions Generation', () => {
    it('should provide helpful suggestions when no inclusions found', () => {
      const worksheet = createWorksheet([['No inclusions here']]);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.suggestions).toContain('No inclusions sections detected. Add a clearly labeled "Inclusions" or "What\'s Included" section.');
      expect(result.suggestions).toContain('Use bullet points or numbered lists to format inclusion items clearly.');
    });

    it('should suggest formatting improvements', () => {
      const data = [
        ['Inclusions:'],
        ['Item 1'], // Plain text, no bullets
        ['Item 2'],
        ['Item 3']
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.suggestions).toContain('Use bullet points (•) or numbered lists (1., 2., 3.) to format inclusions for better recognition.');
    });

    it('should suggest more descriptive content', () => {
      const data = [
        ['Inclusions:'],
        ['• A'], // Very short
        ['• B'], // Very short
        ['• C']  // Very short
      ];

      const worksheet = createWorksheet(data);
      detector = new InclusionsSectionDetector(worksheet);
      
      const result = detector.detectInclusionsSections();
      
      expect(result.suggestions).toContain('Some inclusion items are very short. Provide more descriptive inclusion details.');
    });
  });
});