# Enhanced Offers Excel Upload - Developer Guide

## Architecture Overview

The Enhanced Offers Excel Upload system is built with a modular architecture that provides intelligent Excel parsing, validation, and import capabilities.

## Core Components

### 1. Excel Analysis Engine

#### `ExcelSmartDetector`
- **Location**: `src/lib/excel-smart-detector.ts`
- **Purpose**: Main orchestrator for Excel file analysis
- **Key Methods**:
  - `analyzeExcelFile()`: Complete analysis of Excel structure
  - `getQuickSummary()`: Fast overview of file contents
  - `isProcessable()`: Determines if file can be processed

#### `ExcelLayoutDetector`
- **Location**: `src/lib/excel-layout-detector.ts`
- **Purpose**: Detects Excel layout patterns (months-in-rows vs months-in-columns)
- **Key Methods**:
  - `detectLayout()`: Analyzes worksheet structure
  - `findPricingSection()`: Locates pricing data
  - `findInclusionsSection()`: Locates inclusions data

#### `ExcelContentClassifier`
- **Location**: `src/lib/excel-content-classifier.ts`
- **Purpose**: Classifies cell content types (months, prices, accommodation types)
- **Key Methods**:
  - `classifyContent()`: Determines content type of individual cells
  - `detectMonth()`: Identifies month names and formats
  - `detectAccommodationType()`: Recognizes accommodation types

#### `ExcelMetadataExtractor`
- **Location**: `src/lib/excel-metadata-extractor.ts`
- **Purpose**: Extracts metadata like resort names, currencies, special periods
- **Key Methods**:
  - `extractMetadata()`: Comprehensive metadata extraction
  - `detectResortName()`: Finds resort/hotel names
  - `detectCurrency()`: Identifies currency information

### 2. Pricing Extraction System

#### `PricingExtractor`
- **Location**: `src/lib/pricing-extractor.ts`
- **Purpose**: Extracts pricing data from detected sections
- **Key Methods**:
  - `extractPricing()`: Main pricing extraction logic
  - `extractMonthsInRows()`: Handles months-in-rows layout
  - `extractMonthsInColumns()`: Handles months-in-columns layout

#### `PricingNormalizer`
- **Location**: `src/lib/pricing-normalizer.ts`
- **Purpose**: Normalizes extracted pricing data
- **Key Methods**:
  - `normalizePricing()`: Standardizes pricing format
  - `convertCurrency()`: Currency conversion
  - `validatePriceRanges()`: Price validation

#### `PriceValidator`
- **Location**: `src/lib/price-validator.ts`
- **Purpose**: Validates pricing data integrity
- **Key Methods**:
  - `validatePrices()`: Comprehensive price validation
  - `checkConsistency()`: Price consistency checks
  - `detectOutliers()`: Identifies unusual prices

### 3. Inclusions Processing

#### `InclusionsSectionDetector`
- **Location**: `src/lib/inclusions-section-detector.ts`
- **Purpose**: Detects inclusions sections in various Excel layouts
- **Key Methods**:
  - `detectInclusionsSections()`: Finds all inclusions sections
  - `analyzeInclusionsSection()`: Analyzes individual sections
  - `getBestInclusionsSection()`: Returns highest confidence section

#### `InclusionsTextProcessor`
- **Location**: `src/lib/inclusions-text-processor.ts`
- **Purpose**: Processes and validates inclusions text
- **Key Methods**:
  - `processInclusions()`: Batch processing of inclusions
  - `processInclusionItem()`: Individual item processing
  - `formatForDisplay()`: Formats for UI display

### 4. Column Mapping System

#### `ColumnMapper`
- **Location**: `src/lib/column-mapper.ts`
- **Purpose**: Intelligent column mapping with suggestions
- **Key Methods**:
  - `suggestMappings()`: Generates mapping suggestions
  - `applyMapping()`: Transforms data using mappings
  - `validateMappings()`: Validates mapping completeness

#### `MappingTemplateManager`
- **Location**: `src/lib/mapping-persistence.ts`
- **Purpose**: Manages mapping templates for reuse
- **Key Methods**:
  - `createTemplate()`: Creates new mapping template
  - `findMatchingTemplates()`: Finds applicable templates
  - `useTemplate()`: Applies template and tracks usage

### 5. Validation System

#### `DataValidationEngine`
- **Location**: `src/lib/data-validation-engine.ts`
- **Purpose**: Field-level data validation
- **Key Methods**:
  - `validateData()`: Complete dataset validation
  - `validateField()`: Individual field validation
  - `addRule()`: Add custom validation rules

#### `BusinessRulesValidator`
- **Location**: `src/lib/business-rules-validator.ts`
- **Purpose**: Business logic validation
- **Key Methods**:
  - `validateBusinessRules()`: Apply business rules
  - `addRule()`: Add custom business rules

### 6. UI Components

#### `ColumnMappingInterface`
- **Location**: `src/components/admin/ColumnMappingInterface.tsx`
- **Purpose**: Dropdown-based column mapping interface
- **Features**:
  - Automatic suggestions
  - Confidence indicators
  - Template management
  - Validation feedback

#### `DragDropColumnMapper`
- **Location**: `src/components/admin/DragDropColumnMapper.tsx`
- **Purpose**: Drag-and-drop column mapping interface
- **Features**:
  - Visual mapping
  - Real-time feedback
  - Required field indicators

#### `StructuredDataPreview`
- **Location**: `src/components/admin/StructuredDataPreview.tsx`
- **Purpose**: Rich data preview with multiple views
- **Features**:
  - Table, cards, and summary views
  - Filtering and search
  - Validation integration
  - Metadata display

## Usage Examples

### Basic Excel Analysis

```typescript
import { ExcelSmartDetector } from '@/lib/excel-smart-detector';

// Analyze an Excel file
const detector = new ExcelSmartDetector(buffer);
const analysis = detector.analyzeExcelFile();

console.log('Layout type:', analysis.layoutDetection.primaryLayout.type);
console.log('Confidence:', analysis.confidence);
console.log('Has pricing:', !!analysis.pricingSection);
console.log('Has inclusions:', !!analysis.inclusionsSection);
```

### Column Mapping

```typescript
import { ColumnMapper } from '@/lib/column-mapper';

const mapper = new ColumnMapper();
const headers = ['Month', 'Hotel Price', 'Apartment Price'];
const sampleData = [
  ['January', '€150', '€120'],
  ['February', '€160', '€130']
];

// Get mapping suggestions
const suggestions = mapper.suggestMappings(headers, sampleData);

// Apply mappings to transform data
const mappings = suggestions.map(s => s.mapping);
const transformedData = mapper.applyMapping(sampleData, mappings);
```

### Data Validation

```typescript
import { DataValidationEngine } from '@/lib/data-validation-engine';

const engine = new DataValidationEngine();
const headers = ['Month', 'Price'];
const data = [
  ['January', '150'],
  ['February', 'invalid']
];

const report = engine.validateData(data, headers);
console.log('Is valid:', report.isValid);
console.log('Errors:', report.errors.length);
console.log('Suggestions:', report.suggestions);
```

### Inclusions Processing

```typescript
import { InclusionsTextProcessor } from '@/lib/inclusions-text-processor';

const processor = new InclusionsTextProcessor();
const inclusions = [
  '• Daily breakfast',
  '• Free WiFi',
  '• Pool access'
];

const result = processor.processInclusions(inclusions);
console.log('Valid items:', result.validItems.length);
console.log('Categories:', result.categories.size);
console.log('Quality score:', result.overallQuality);
```

## Integration Points

### API Endpoints

The system integrates with existing API endpoints:

- `POST /api/admin/offers/upload` - Enhanced upload endpoint
- `GET /api/admin/offers/templates` - Mapping templates
- `POST /api/admin/offers/validate` - Data validation
- `GET /api/admin/offers/history` - Import history

### Database Models

#### Enhanced Offer Model
```typescript
interface EnhancedOffer {
  resortName: string;
  destination?: string;
  currency: string;
  pricing: PricingData[];
  inclusions: string[];
  metadata: OfferMetadata;
  importHistory: ImportHistoryEntry[];
}
```

#### Import History Model
```typescript
interface ImportHistory {
  id: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordsProcessed: number;
  errors: ValidationError[];
  metadata: ImportMetadata;
}
```

## Configuration

### Validation Rules

Add custom validation rules:

```typescript
engine.addRule({
  id: 'custom-price-range',
  name: 'Custom Price Range',
  description: 'Validates prices are within acceptable range',
  field: 'price',
  severity: ValidationSeverity.WARNING,
  validate: (value: any) => {
    const price = parseFloat(value);
    if (price < 50 || price > 5000) {
      return {
        isValid: false,
        errors: [{
          id: 'price-out-of-range',
          severity: ValidationSeverity.WARNING,
          code: 'PRICE_OUT_OF_RANGE',
          message: 'Price outside expected range (€50-€5000)'
        }],
        warnings: [],
        info: []
      };
    }
    return { isValid: true, errors: [], warnings: [], info: [] };
  }
});
```

### Business Rules

Add custom business rules:

```typescript
validator.addRule({
  id: 'seasonal-pricing',
  name: 'Seasonal Pricing Validation',
  description: 'Ensures seasonal pricing consistency',
  category: 'pricing',
  severity: ValidationSeverity.WARNING,
  validate: (data: any[][], headers: string[]) => {
    // Custom business logic here
    return errors;
  }
});
```

## Testing

### Unit Tests

Run component tests:
```bash
npm test src/lib/__tests__/excel-layout-detector.test.ts
npm test src/lib/__tests__/column-mapper.test.ts
npm test src/lib/__tests__/data-validation-engine.test.ts
```

### Integration Tests

Test complete workflows:
```bash
npm test src/test/integration/excel-import-workflow.test.ts
```

### Performance Tests

Test with large files:
```bash
npm test src/lib/__tests__/performance-optimizations.test.ts
```

## Deployment

### Environment Variables

```env
# Excel processing limits
MAX_EXCEL_FILE_SIZE=10485760  # 10MB
MAX_EXCEL_ROWS=10000
MAX_EXCEL_COLUMNS=100

# Validation settings
ENABLE_BUSINESS_RULES=true
VALIDATION_TIMEOUT=30000  # 30 seconds

# Template storage
TEMPLATE_STORAGE_TYPE=local  # local | database
```

### Performance Considerations

1. **File Size Limits**: Configure appropriate limits for your server
2. **Memory Usage**: Large Excel files can consume significant memory
3. **Processing Time**: Complex validation can take time for large datasets
4. **Caching**: Enable template and validation result caching

## Extending the System

### Adding New Content Classifiers

```typescript
// Add to ExcelContentClassifier
detectCustomType(value: string): boolean {
  // Custom detection logic
  return /custom-pattern/.test(value);
}
```

### Custom Layout Detectors

```typescript
// Add to ExcelLayoutDetector
detectCustomLayout(): LayoutPattern[] {
  // Custom layout detection logic
  return patterns;
}
```

### New Validation Rules

```typescript
// Add to DataValidationEngine initialization
this.addRule({
  id: 'custom-validation',
  name: 'Custom Validation Rule',
  // ... rule definition
});
```

## Troubleshooting

### Common Issues

1. **Memory Issues**: Reduce file size limits or increase server memory
2. **Timeout Errors**: Increase validation timeout settings
3. **Detection Failures**: Check Excel file formatting and structure
4. **Mapping Issues**: Verify column headers and data consistency

### Debug Mode

Enable debug logging:
```typescript
const detector = new ExcelSmartDetector(buffer, { debug: true });
```

### Performance Monitoring

Monitor key metrics:
- File processing time
- Memory usage during processing
- Validation rule execution time
- Template lookup performance

This developer guide provides the technical foundation for understanding, extending, and maintaining the Enhanced Offers Excel Upload system.