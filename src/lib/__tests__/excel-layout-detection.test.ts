import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { ExcelLayoutDetector } from '../excel-layout-detector';
import { ExcelContentClassifier } from '../excel-content-classifier';
import { ExcelMetadataExtractor } from '../excel-metadata-extractor';

describe('Excel Layout Detection System', () => {
  // Helper function to create a test worksheet
  function createTestWorksheet(data: any[][]): XLSX.WorkSheet {
    return XLSX.utils.aoa_to_sheet(data);
  }

  describe('ExcelLayoutDetector', () => {
    it('should detect months-in-rows layout', () => {
      const data = [
        ['Month', '2 Nights Hotel', '3 Nights Hotel', '4 Nights Hotel'],
        ['January', '€150', '€200', '€250'],
        ['February', '€140', '€190', '€240'],
        ['March', '€160', '€210', '€260']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const result = detector.detectLayout();
      
      expect(result.primaryLayout.type).toBe('months-rows');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.primaryLayout.metadata?.monthsDetected).toContain('january');
    });

    it('should detect months-in-columns layout', () => {
      const data = [
        ['Accommodation', 'January', 'February', 'March', 'April'],
        ['Hotel 2N', '€150', '€140', '€160', '€170'],
        ['Hotel 3N', '€200', '€190', '€210', '€220'],
        ['Self-Catering 2N', '€120', '€110', '€130', '€140']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const result = detector.detectLayout();
      
      expect(result.primaryLayout.type).toBe('months-columns');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.primaryLayout.headers).toContain('January');
    });

    it('should detect pricing matrix pattern', () => {
      const data = [
        ['', 'Jan', 'Feb', 'Mar'],
        ['2N Hotel', '150', '140', '160'],
        ['3N Hotel', '200', '190', '210'],
        ['2N Apartment', '120', '110', '130']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const result = detector.detectLayout();
      
      expect(result.secondaryLayouts.some(p => p.type === 'pricing-matrix')).toBe(true);
    });

    it('should detect inclusions list pattern', () => {
      const data = [
        ['Package Includes:'],
        ['• Return flights'],
        ['• Airport transfers'],
        ['• Accommodation'],
        ['• Breakfast daily'],
        ['']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const result = detector.detectLayout();
      
      expect(result.secondaryLayouts.some(p => p.type === 'inclusions-list')).toBe(true);
    });

    it('should find pricing section', () => {
      const data = [
        ['Benidorm Resort Prices 2025'],
        ['Month', '2 Nights Hotel', '3 Nights Hotel'],
        ['January', '€150', '€200'],
        ['February', '€140', '€190']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const pricingSection = detector.findPricingSection();
      
      expect(pricingSection).toBeTruthy();
      expect(pricingSection?.layout).toBe('months-rows'); // This data structure has months in rows
      expect(pricingSection?.startRow).toBeGreaterThanOrEqual(0);
    });

    it('should find inclusions section', () => {
      const data = [
        ['Resort Information'],
        ['Package Includes:'],
        ['• Return flights'],
        ['• Airport transfers'],
        ['• Accommodation']
      ];
      
      const worksheet = createTestWorksheet(data);
      const detector = new ExcelLayoutDetector(worksheet);
      const inclusionsSection = detector.findInclusionsSection();
      
      expect(inclusionsSection).toBeTruthy();
      expect(inclusionsSection?.content).toContain('• Return flights');
      expect(inclusionsSection?.format).toBe('bullet-points');
    });
  });

  describe('ExcelContentClassifier', () => {
    let classifier: ExcelContentClassifier;

    beforeEach(() => {
      classifier = new ExcelContentClassifier();
    });

    it('should detect month names correctly', () => {
      const testCases = [
        { input: 'January', expected: true, format: 'full' },
        { input: 'Jan', expected: true, format: 'abbreviated' },
        { input: 'FEBRUARY', expected: true, format: 'full' },
        { input: 'Easter', expected: true, format: 'special' },
        { input: 'Peak Season', expected: true, format: 'special' },
        { input: 'NotAMonth', expected: false, format: 'full' }
      ];

      testCases.forEach(testCase => {
        const result = classifier.detectMonth(testCase.input);
        expect(result.isMonth).toBe(testCase.expected);
        if (testCase.expected) {
          expect(result.format).toBe(testCase.format);
          expect(result.confidence).toBeGreaterThan(0.5);
        }
      });
    });

    it('should detect accommodation types correctly', () => {
      const testCases = [
        { input: 'Hotel', expected: true, category: 'hotel' },
        { input: 'Self-Catering', expected: true, category: 'self-catering' },
        { input: 'Apartment', expected: true, category: 'apartment' },
        { input: 'Villa', expected: true, category: 'villa' },
        { input: 'Luxury Resort', expected: true, category: 'resort' },
        { input: 'Random Text', expected: false, category: 'other' }
      ];

      testCases.forEach(testCase => {
        const result = classifier.detectAccommodationType(testCase.input);
        expect(result.isAccommodation).toBe(testCase.expected);
        if (testCase.expected) {
          expect(result.category).toBe(testCase.category);
          expect(result.confidence).toBeGreaterThan(0.5);
        }
      });
    });

    it('should detect nights/pax patterns correctly', () => {
      const testCases = [
        { input: '2 nights', expectedNights: 2, expectedPax: undefined },
        { input: '4 pax', expectedNights: undefined, expectedPax: 4 },
        { input: '3N/2P', expectedNights: 3, expectedPax: 2 },
        { input: '5 nights 4 people', expectedNights: 5, expectedPax: 4 },
        { input: '2N', expectedNights: 2, expectedPax: undefined },
        { input: '6P', expectedNights: undefined, expectedPax: 6 }
      ];

      testCases.forEach(testCase => {
        const result = classifier.detectNightsPaxPattern(testCase.input);
        
        if (testCase.expectedNights !== undefined) {
          expect(result.hasNights).toBe(true);
          expect(result.nights).toBe(testCase.expectedNights);
        }
        
        if (testCase.expectedPax !== undefined) {
          expect(result.hasPax).toBe(true);
          expect(result.pax).toBe(testCase.expectedPax);
        }
        
        if (testCase.expectedNights !== undefined || testCase.expectedPax !== undefined) {
          expect(result.confidence).toBeGreaterThan(0.3);
        }
      });
    });

    it('should classify content correctly', () => {
      const testCases = [
        { input: 'January', expectedType: 'month' },
        { input: 'Hotel', expectedType: 'accommodation' },
        { input: '3 nights', expectedType: 'nights-pax' },
        { input: '€150', expectedType: 'price' },
        { input: 'Some random text', expectedType: 'text' },
        { input: '', expectedType: 'empty' }
      ];

      testCases.forEach(testCase => {
        const result = classifier.classifyContent(testCase.input);
        expect(result.type).toBe(testCase.expectedType);
      });
    });

    it('should detect month sequences', () => {
      const sequence = ['January', 'February', 'March', 'April'];
      const result = classifier.detectMonthSequence(sequence);
      
      expect(result.isSequence).toBe(true);
      expect(result.months).toEqual(['January', 'February', 'March', 'April']);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should analyze content sequences', () => {
      const monthSequence = ['Jan', 'Feb', 'Mar', 'Apr'];
      const result = classifier.analyzeSequence(monthSequence);
      
      expect(result.primaryType).toBe('month');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.distribution.month).toBe(4);
    });
  });

  describe('ExcelMetadataExtractor', () => {
    it('should extract resort name from sheet name', () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = createTestWorksheet([['Data']]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Benidorm 2025');
      
      const extractor = new ExcelMetadataExtractor(workbook);
      const result = extractor.extractResortName();
      
      expect(result.name).toBe('Benidorm');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect currency from cell content', () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = createTestWorksheet([
        ['Prices', '€150', '€200'],
        ['More prices', '€180', '€220']
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const extractor = new ExcelMetadataExtractor(workbook);
      const result = extractor.detectCurrency();
      
      expect(result.currency).toBe('EUR');
      expect(result.symbol).toBe('€');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should identify special periods', () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = createTestWorksheet([
        ['Regular Season'],
        ['Peak Season rates apply'],
        ['Easter period: 18-21 Apr'],
        ['Off Season discounts']
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const extractor = new ExcelMetadataExtractor(workbook);
      const periods = extractor.identifySpecialPeriods();
      
      expect(periods.length).toBeGreaterThan(0);
      expect(periods.some(p => p.name === 'Peak Season')).toBe(true);
      expect(periods.some(p => p.name === 'Easter')).toBe(true);
      expect(periods.some(p => p.name === 'Off Season')).toBe(true);
    });

    it('should extract complete metadata', () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = createTestWorksheet([
        ['Albufeira Resort Prices 2025'],
        ['Valid from: 01/01/2025'],
        ['Peak Season', 'Easter period'],
        ['Prices in EUR', '€150', '€200']
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Albufeira 2025');
      
      const extractor = new ExcelMetadataExtractor(workbook);
      const metadata = extractor.extractMetadata();
      
      expect(metadata.resortName).toBe('Albufeira');
      expect(metadata.currency).toBe('EUR');
      expect(metadata.specialPeriods.length).toBeGreaterThan(0);
      expect(metadata.confidence.resortName).toBeGreaterThan(0.5);
      expect(metadata.confidence.currency).toBeGreaterThan(0.5);
    });
  });
});