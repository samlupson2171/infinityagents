/**
 * Example usage of the Enhanced Pricing Data Extraction Engine
 * This demonstrates how to use the PricingExtractor, PricingNormalizer, and PriceValidator together
 */

import * as XLSX from 'xlsx';
import { PricingExtractor } from './pricing-extractor';
import { createPricingNormalizer } from './pricing-normalizer';
import { createPriceValidator } from './price-validator';

/**
 * Example function showing complete pricing extraction workflow
 */
export async function extractPricingFromExcel(buffer: Buffer): Promise<{
  success: boolean;
  data: any[];
  errors: string[];
  warnings: string[];
  summary: any;
}> {
  const result = {
    success: false,
    data: [] as any[],
    errors: [] as string[],
    warnings: [] as string[],
    summary: {} as any
  };

  try {
    // Step 1: Read Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      result.errors.push('No worksheet found in Excel file');
      return result;
    }

    // Step 2: Extract pricing matrix
    const extractor = new PricingExtractor(worksheet);
    const matrix = extractor.extractPricingMatrix();

    if (!matrix) {
      result.errors.push('Could not extract pricing matrix from Excel file');
      return result;
    }

    console.log('Extracted pricing matrix:', {
      months: matrix.months,
      accommodationTypes: matrix.accommodationTypes.map(a => a.name),
      currency: matrix.metadata.currency,
      priceGridSize: `${matrix.priceGrid.length} x ${matrix.priceGrid[0]?.length || 0}`
    });

    // Step 3: Normalize pricing data
    const normalizer = createPricingNormalizer({
      preserveSpecialPeriods: true,
      handleMissingPrices: 'mark-unavailable',
      priceRounding: {
        enabled: true,
        precision: 2
      }
    });

    const normalizationResult = normalizer.normalizePricing(matrix);

    if (!normalizationResult.success) {
      result.errors.push(...normalizationResult.errors);
      result.warnings.push(...normalizationResult.warnings);
      return result;
    }

    console.log('Normalization summary:', normalizationResult.summary);

    // Step 4: Validate pricing data
    const validator = createPriceValidator({
      currencyConsistencyCheck: true,
      priceReasonablenessCheck: true,
      allowZeroPrices: false
    });

    const validationResults = validator.validatePricing(normalizationResult.data, {
      currency: matrix.metadata.currency,
      accommodationTypes: matrix.accommodationTypes.map(a => a.name)
    });

    // Separate validation results by severity
    const errors = validationResults.filter(r => r.severity === 'error');
    const warnings = validationResults.filter(r => r.severity === 'warning');
    const info = validationResults.filter(r => r.severity === 'info');

    result.errors.push(...errors.map(e => e.message));
    result.warnings.push(...warnings.map(w => w.message));
    result.warnings.push(...info.map(i => i.message));

    // Step 5: Return results
    result.success = errors.length === 0;
    result.data = normalizationResult.data;
    result.summary = {
      extraction: {
        months: matrix.months.length,
        accommodationTypes: matrix.accommodationTypes.length,
        currency: matrix.metadata.currency
      },
      normalization: normalizationResult.summary,
      validation: {
        errors: errors.length,
        warnings: warnings.length,
        info: info.length
      }
    };

    console.log('Final summary:', result.summary);

  } catch (error) {
    result.errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Example function to create a sample Excel file for testing
 */
export function createSampleExcelFile(): Buffer {
  const sampleData = [
    ['Resort: Sample Beach Resort', '', '', '', ''],
    ['Currency: EUR', '', '', '', ''],
    ['Valid: 01/04/2024 - 31/10/2024', '', '', '', ''],
    ['', 'January', 'February', 'March', 'Easter (18–21 Apr)'],
    ['Hotel - 2 nights / 2 pax', '€150.00', '€160.00', '€170.00', '€200.00'],
    ['Hotel - 3 nights / 2 pax', '€220.00', '€240.00', '€260.00', '€300.00'],
    ['Hotel - 2 nights / 4 pax', '€280.00', '€300.00', '€320.00', '€380.00'],
    ['Hotel - 3 nights / 4 pax', '€400.00', '€430.00', '€460.00', '€550.00'],
    ['Self-Catering - 2 nights / 2 pax', '€120.00', '€130.00', '€140.00', '€160.00'],
    ['Self-Catering - 3 nights / 2 pax', '€180.00', '€195.00', '€210.00', '€240.00'],
    ['Self-Catering - 2 nights / 4 pax', '€220.00', '€240.00', '€260.00', '€300.00'],
    ['Self-Catering - 3 nights / 4 pax', '€320.00', '€350.00', '€380.00', '€450.00'],
    ['', '', '', '', ''],
    ['Package Inclusions:', '', '', '', ''],
    ['• Return airport transfers', '', '', '', ''],
    ['• Daily breakfast (Hotel only)', '', '', '', ''],
    ['• Welcome drink on arrival', '', '', '', ''],
    ['• 24/7 customer support', '', '', '', ''],
    ['• Free WiFi throughout property', '', '', '', ''],
    ['', '', '', '', ''],
    ['Package Exclusions:', '', '', '', ''],
    ['• Travel insurance', '', '', '', ''],
    ['• Meals not specified', '', '', '', ''],
    ['• Personal expenses', '', '', '', ''],
    ['• Optional excursions', '', '', '', '']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Resort Pricing');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Example usage demonstration
 */
export async function demonstratePricingExtraction(): Promise<void> {
  console.log('=== Enhanced Pricing Data Extraction Engine Demo ===\n');

  // Create sample Excel file
  console.log('1. Creating sample Excel file...');
  const excelBuffer = createSampleExcelFile();
  console.log('✓ Sample Excel file created\n');

  // Extract pricing data
  console.log('2. Extracting pricing data...');
  const result = await extractPricingFromExcel(excelBuffer);

  if (result.success) {
    console.log('✓ Pricing extraction successful!');
    console.log(`✓ Extracted ${result.data.length} pricing entries`);
    
    // Show sample data
    console.log('\nSample extracted data:');
    result.data.slice(0, 3).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.month} - ${entry.accommodationType} - ${entry.nights}n/${entry.pax}p: ${entry.price} ${entry.currency}`);
    });

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`⚠️  ${warning}`));
    }
  } else {
    console.log('❌ Pricing extraction failed');
    result.errors.forEach(error => console.log(`❌ ${error}`));
  }

  console.log('\n=== Demo Complete ===');
}

// Uncomment to run the demo
// demonstratePricingExtraction().catch(console.error);