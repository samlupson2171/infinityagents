import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { PricingExtractor } from '../pricing-extractor';
import { PricingNormalizer, createPricingNormalizer } from '../pricing-normalizer';
import { PriceValidator, createPriceValidator } from '../price-validator';

describe('Pricing Data Extraction Engine', () => {
  let testWorksheet: XLSX.WorkSheet;

  beforeEach(() => {
    // Create a test worksheet with sample pricing data
    const testData = [
      ['', 'January', 'February', 'March', 'April'],
      ['Hotel 2 nights 2 pax', '€150.00', '€160.00', '€170.00', '€180.00'],
      ['Hotel 3 nights 2 pax', '€220.00', '€240.00', '€260.00', '€280.00'],
      ['Hotel 2 nights 4 pax', '€280.00', '€300.00', '€320.00', '€340.00'],
      ['Self-Catering 2 nights 2 pax', '€120.00', '€130.00', '€140.00', '€150.00'],
      ['Self-Catering 3 nights 2 pax', '€180.00', '€195.00', '€210.00', '€225.00'],
      ['', '', '', '', ''],
      ['Inclusions:', '', '', '', ''],
      ['• Airport transfers', '', '', '', ''],
      ['• Daily breakfast', '', '', '', ''],
      ['• Welcome drink', '', '', '', '']
    ];

    testWorksheet = XLSX.utils.aoa_to_sheet(testData);
  });

  describe('PricingExtractor', () => {
    it('should extract pricing matrix from months-in-columns layout', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();

      expect(matrix).toBeTruthy();
      expect(matrix!.months).toEqual(['January', 'February', 'March', 'April']);
      expect(matrix!.accommodationTypes.length).toBeGreaterThan(0);
      expect(matrix!.metadata.currency).toBe('EUR');
      expect(matrix!.priceGrid.length).toBeGreaterThan(0);
    });

    it('should handle merged cells correctly', () => {
      // Create worksheet with merged cells
      const mergedData = [
        ['', 'January', 'February'],
        ['Hotel 2 nights', '€150.00', '€160.00'],
        ['Hotel 3 nights', '€220.00', '€240.00']
      ];
      
      const mergedWorksheet = XLSX.utils.aoa_to_sheet(mergedData);
      
      // Simulate merged cell
      mergedWorksheet['!merges'] = [{
        s: { r: 1, c: 1 }, // B2
        e: { r: 1, c: 2 }  // C2
      }];

      const extractor = new PricingExtractor(mergedWorksheet);
      const matrix = extractor.extractPricingMatrix();

      expect(matrix).toBeTruthy();
      expect(matrix!.priceGrid).toBeTruthy();
    });

    it('should detect currency correctly', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const currency = extractor.detectCurrency();

      expect(currency).toBe('EUR');
    });

    it('should extract accommodation types', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();

      expect(matrix!.accommodationTypes.length).toBeGreaterThan(0);
      // Check that accommodation types have proper structure
      expect(matrix!.accommodationTypes[0]).toHaveProperty('name');
      expect(matrix!.accommodationTypes[0]).toHaveProperty('code');
      expect(matrix!.accommodationTypes[0]).toHaveProperty('description');
    });
  });

  describe('PricingNormalizer', () => {
    it('should normalize pricing matrix to flat structure', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();
      
      const normalizer = createPricingNormalizer({
        preserveSpecialPeriods: true,
        handleMissingPrices: 'mark-unavailable'
      });

      const result = normalizer.normalizePricing(matrix!);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0); // Should have extracted pricing data
      expect(result.summary.totalEntries).toBeGreaterThan(0);
      expect(result.summary.availableEntries).toBeGreaterThan(0);
    });

    it('should handle missing prices correctly', () => {
      // Create matrix with missing prices
      const dataWithMissing = [
        ['', 'January', 'February', 'March'],
        ['Hotel 2 nights 2 pax', '€150.00', '', '€170.00'],
        ['Hotel 3 nights 2 pax', '€220.00', 'N/A', '€260.00']
      ];

      const worksheetWithMissing = XLSX.utils.aoa_to_sheet(dataWithMissing);
      const extractor = new PricingExtractor(worksheetWithMissing);
      const matrix = extractor.extractPricingMatrix();

      const normalizer = createPricingNormalizer({
        handleMissingPrices: 'mark-unavailable'
      });

      const result = normalizer.normalizePricing(matrix!);

      expect(result.success).toBe(true);
      expect(result.summary.unavailableEntries).toBeGreaterThan(0);
    });

    it('should preserve special periods', () => {
      const dataWithSpecialPeriods = [
        ['', 'January', 'Easter (18–21 Apr)', 'Peak Season'],
        ['Hotel 2 nights 2 pax', '€150.00', '€200.00', '€250.00']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(dataWithSpecialPeriods);
      const extractor = new PricingExtractor(worksheet);
      const matrix = extractor.extractPricingMatrix();

      const normalizer = createPricingNormalizer({
        preserveSpecialPeriods: true
      });

      const result = normalizer.normalizePricing(matrix!);

      expect(result.success).toBe(true);
      expect(result.summary.specialPeriods).toContain('Easter');
      expect(result.summary.specialPeriods).toContain('Peak Season');
    });

    it('should apply currency conversion', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();

      const normalizer = createPricingNormalizer({
        currencyConversion: {
          from: 'EUR',
          to: 'GBP',
          rate: 0.85
        }
      });

      const result = normalizer.normalizePricing(matrix!);

      expect(result.success).toBe(true);
      expect(result.data[0].currency).toBe('GBP');
      expect(result.data[0].price).toBeLessThan(150); // Should be converted
    });

    it('should apply price rounding', () => {
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();

      const normalizer = createPricingNormalizer({
        priceRounding: {
          enabled: true,
          precision: 0 // Round to whole numbers
        }
      });

      const result = normalizer.normalizePricing(matrix!);

      expect(result.success).toBe(true);
      result.data.forEach(entry => {
        expect(entry.price % 1).toBe(0); // Should be whole numbers
      });
    });
  });

  describe('PriceValidator', () => {
    it('should validate currency consistency', () => {
      const mixedCurrencyData = [
        { month: 'January', accommodationType: 'Hotel', nights: 2, pax: 2, price: 150, currency: 'EUR', isAvailable: true },
        { month: 'February', accommodationType: 'Hotel', nights: 2, pax: 2, price: 120, currency: 'GBP', isAvailable: true }
      ];

      const validator = createPriceValidator({
        currencyConsistencyCheck: true
      });

      const results = validator.validatePricing(mixedCurrencyData);
      const currencyError = results.find(r => r.rule === 'currency-consistency');

      expect(currencyError).toBeTruthy();
      expect(currencyError!.severity).toBe('error');
    });

    it('should detect unreasonable prices', () => {
      const unreasonableData = [
        { month: 'January', accommodationType: 'Hotel', nights: 7, pax: 2, price: 1, currency: 'EUR', isAvailable: true }, // Too low
        { month: 'February', accommodationType: 'Hotel', nights: 2, pax: 2, price: 50000, currency: 'EUR', isAvailable: true } // Too high
      ];

      const validator = createPriceValidator({
        priceReasonablenessCheck: true
      });

      const results = validator.validatePricing(unreasonableData);
      const reasonablenessWarnings = results.filter(r => r.rule === 'price-reasonableness');

      // Should detect at least the very low price
      expect(reasonablenessWarnings.length).toBeGreaterThan(0);
      expect(reasonablenessWarnings.every(w => w.severity === 'warning')).toBe(true);
    });

    it('should validate zero prices', () => {
      const zeroData = [
        { month: 'January', accommodationType: 'Hotel', nights: 2, pax: 2, price: 0, currency: 'EUR', isAvailable: true }
      ];

      const validator = createPriceValidator({
        allowZeroPrices: false
      });

      const results = validator.validatePricing(zeroData);
      const zeroWarning = results.find(r => r.rule === 'zero-prices');

      expect(zeroWarning).toBeTruthy();
      expect(zeroWarning!.severity).toBe('warning');
    });

    it('should check price progression logic', () => {
      const progressionData = [
        { month: 'January', accommodationType: 'Hotel', nights: 2, pax: 2, price: 200, currency: 'EUR', isAvailable: true },
        { month: 'January', accommodationType: 'Hotel', nights: 3, pax: 2, price: 150, currency: 'EUR', isAvailable: true } // Should be higher
      ];

      const validator = createPriceValidator();
      const results = validator.validatePricing(progressionData);
      const progressionWarning = results.find(r => r.rule === 'price-progression');

      expect(progressionWarning).toBeTruthy();
      expect(progressionWarning!.severity).toBe('warning');
    });

    it('should detect and validate currency formats', () => {
      const validator = createPriceValidator();

      // Test EUR detection
      const eurResult = validator.detectAndValidateCurrency('€150.00');
      expect(eurResult.currency).toBe('EUR');
      expect(eurResult.isValid).toBe(true);

      // Test GBP detection
      const gbpResult = validator.detectAndValidateCurrency('£120.50');
      expect(gbpResult.currency).toBe('GBP');
      expect(gbpResult.isValid).toBe(true);

      // Test USD detection
      const usdResult = validator.detectAndValidateCurrency('$180.75');
      expect(usdResult.currency).toBe('USD');
      expect(usdResult.isValid).toBe(true);
    });

    it('should validate number formats', () => {
      const validator = createPriceValidator();

      // Test US format
      const usResult = validator.validateNumberFormat('1,234.56');
      expect(usResult.isValid).toBe(true);
      expect(usResult.parsedValue).toBe(1234.56);
      expect(usResult.detectedFormat).toBe('US');

      // Test European format
      const eurResult = validator.validateNumberFormat('1.234,56');
      expect(eurResult.isValid).toBe(true);
      expect(eurResult.parsedValue).toBe(1234.56);
      expect(eurResult.detectedFormat).toBe('European');
    });

    it('should check price reasonableness with context', () => {
      const validator = createPriceValidator();

      // Test reasonable price
      const reasonable = validator.checkPriceReasonableness(150, 'EUR', 'Hotel', 3, 2);
      expect(reasonable.isReasonable).toBe(true);

      // Test unreasonably low price
      const tooLow = validator.checkPriceReasonableness(1, 'EUR', 'Hotel', 7, 4);
      expect(tooLow.isReasonable).toBe(false);
      expect(tooLow.warnings.length).toBeGreaterThan(0);

      // Test unreasonably high price
      const tooHigh = validator.checkPriceReasonableness(10000, 'EUR', 'Hostel', 2, 2);
      expect(tooHigh.isReasonable).toBe(false);
      expect(tooHigh.warnings).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end: extract, normalize, and validate', () => {
      // Extract pricing matrix
      const extractor = new PricingExtractor(testWorksheet);
      const matrix = extractor.extractPricingMatrix();
      expect(matrix).toBeTruthy();

      // Normalize pricing data
      const normalizer = createPricingNormalizer({
        preserveSpecialPeriods: true,
        handleMissingPrices: 'mark-unavailable'
      });
      const normalizationResult = normalizer.normalizePricing(matrix!);
      expect(normalizationResult.success).toBe(true);

      // Validate pricing data
      const validator = createPriceValidator({
        currencyConsistencyCheck: true,
        priceReasonablenessCheck: true
      });
      const validationResults = validator.validatePricing(normalizationResult.data);

      // Should have minimal validation issues with good test data
      const errors = validationResults.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('should handle complex Excel layouts', () => {
      // Create more complex test data
      const complexData = [
        ['Resort: Test Resort', '', '', '', ''],
        ['Currency: EUR', '', '', '', ''],
        ['', 'Jan', 'Feb', 'Mar', 'Easter (18–21 Apr)'],
        ['Hotel - 2n/2p', '€150.00', '€160.00', '€170.00', '€200.00'],
        ['Hotel - 3n/2p', '€220.00', '€240.00', '€260.00', '€300.00'],
        ['Hotel - 2n/4p', '€280.00', '€300.00', '€320.00', '€380.00'],
        ['Self-Catering - 2n/2p', '€120.00', '€130.00', '€140.00', '€160.00'],
        ['Self-Catering - 3n/2p', '€180.00', '€195.00', '€210.00', '€240.00'],
        ['', '', '', '', ''],
        ['Package Inclusions:', '', '', '', ''],
        ['• Return airport transfers', '', '', '', ''],
        ['• Daily breakfast (Hotel only)', '', '', '', ''],
        ['• Welcome drink on arrival', '', '', '', ''],
        ['• 24/7 customer support', '', '', '', '']
      ];

      const complexWorksheet = XLSX.utils.aoa_to_sheet(complexData);
      
      // Full pipeline test
      const extractor = new PricingExtractor(complexWorksheet);
      const matrix = extractor.extractPricingMatrix();
      
      expect(matrix).toBeTruthy();
      expect(matrix!.months).toContain('January');
      expect(matrix!.months).toContain('Easter (18–21 Apr)');
      
      const normalizer = createPricingNormalizer();
      const result = normalizer.normalizePricing(matrix!);
      
      expect(result.success).toBe(true);
      expect(result.summary.specialPeriods).toContain('Easter');
      
      const validator = createPriceValidator();
      const validationResults = validator.validatePricing(result.data);
      
      // Should be valid data
      const errors = validationResults.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });
});