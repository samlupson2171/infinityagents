import * as XLSX from 'xlsx';

export interface ExcelOfferRow {
  destination?: string;
  title?: string;
  description?: string;
  month?: string;
  accommodation?: string;
  duration?: string | number;
  price?: string | number;
  inclusions?: string;
  exclusions?: string;
  notes?: string;
  [key: string]: any; // Allow for flexible column names
}

export interface ParsedOffer {
  title: string;
  description: string;
  destination: string;
  inclusions: string[];
  exclusions?: string[];
  pricing: Array<{
    month: string;
    accommodation: string;
    duration: number;
    price: number;
  }>;
  isActive: boolean;
}

export interface ExcelParseResult {
  success: boolean;
  data: ParsedOffer[];
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    validOffers: number;
    skippedRows: number;
  };
}

/**
 * Parses Excel file buffer and extracts offer data
 */
export function parseOffersExcel(buffer: Buffer, options: {
  sheetName?: string;
  headerRow?: number;
  columnMapping?: Record<string, string>;
} = {}): ExcelParseResult {
  const result: ExcelParseResult = {
    success: false,
    data: [],
    errors: [],
    warnings: [],
    summary: {
      totalRows: 0,
      validOffers: 0,
      skippedRows: 0
    }
  };

  try {
    // Read the Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet or specified sheet
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      result.errors.push(`Sheet "${sheetName}" not found`);
      return result;
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as any[][];

    if (jsonData.length === 0) {
      result.errors.push('No data found in Excel file');
      return result;
    }

    result.summary.totalRows = jsonData.length;

    // Get headers (assuming first row contains headers)
    const headerRowIndex = options.headerRow || 0;
    const headers = jsonData[headerRowIndex] as string[];
    
    // Normalize headers (remove spaces, convert to lowercase)
    const normalizedHeaders = headers.map(h => 
      String(h).toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '')
    );

    // Process data rows
    const dataRows = jsonData.slice(headerRowIndex + 1);
    const offersMap = new Map<string, ParsedOffer>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + headerRowIndex + 2; // +2 for 1-based indexing and header

      try {
        const rowData = parseExcelRow(row, normalizedHeaders, options.columnMapping);
        
        if (!rowData.destination || !rowData.title) {
          result.warnings.push(`Row ${rowNumber}: Missing destination or title, skipping`);
          result.summary.skippedRows++;
          continue;
        }

        // Group by destination and title to create comprehensive offers
        const offerKey = `${rowData.destination}-${rowData.title}`;
        
        if (!offersMap.has(offerKey)) {
          offersMap.set(offerKey, {
            title: rowData.title,
            description: rowData.description || `${rowData.destination} package`,
            destination: rowData.destination,
            inclusions: parseInclusions(rowData.inclusions),
            exclusions: parseExclusions(rowData.exclusions),
            pricing: [],
            isActive: true
          });
        }

        const offer = offersMap.get(offerKey)!;
        
        // Add pricing information if available
        if (rowData.month && rowData.price) {
          const price = parsePrice(rowData.price);
          const duration = parseDuration(rowData.duration);
          
          if (price > 0) {
            offer.pricing.push({
              month: normalizeMonth(rowData.month),
              accommodation: rowData.accommodation || 'Standard',
              duration: duration,
              price: price
            });
          }
        }

      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.summary.skippedRows++;
      }
    }

    // Convert map to array and validate
    const offers = Array.from(offersMap.values());
    for (const offer of offers) {
      if (offer.pricing.length === 0) {
        result.warnings.push(`Offer "${offer.title}" has no pricing data`);
      }
      result.data.push(offer);
      result.summary.validOffers++;
    }

    result.success = true;

  } catch (error) {
    result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Parses a single Excel row into structured data
 */
function parseExcelRow(
  row: any[], 
  headers: string[], 
  columnMapping?: Record<string, string>
): ExcelOfferRow {
  const rowData: ExcelOfferRow = {};

  for (let i = 0; i < headers.length && i < row.length; i++) {
    const header = headers[i];
    const value = row[i];
    
    if (value !== null && value !== undefined && value !== '') {
      // Map common column variations to standard names
      const mappedHeader = mapColumnName(header, columnMapping);
      rowData[mappedHeader] = value;
    }
  }

  return rowData;
}

/**
 * Maps various column name variations to standard field names
 */
function mapColumnName(header: string, customMapping?: Record<string, string>): string {
  // Check custom mapping first
  if (customMapping && customMapping[header]) {
    return customMapping[header];
  }

  // Standard mappings for common variations
  const mappings: Record<string, string> = {
    // Destination variations
    'dest': 'destination',
    'location': 'destination',
    'city': 'destination',
    'resort': 'destination',
    
    // Title variations
    'name': 'title',
    'packagename': 'title',
    'offername': 'title',
    'product': 'title',
    
    // Description variations
    'desc': 'description',
    'details': 'description',
    'summary': 'description',
    
    // Month variations
    'mon': 'month',
    'period': 'month',
    'season': 'month',
    
    // Accommodation variations
    'accom': 'accommodation',
    'hotel': 'accommodation',
    'room': 'accommodation',
    'roomtype': 'accommodation',
    
    // Duration variations
    'days': 'duration',
    'nights': 'duration',
    'length': 'duration',
    
    // Price variations
    'cost': 'price',
    'rate': 'price',
    'amount': 'price',
    'fee': 'price',
    
    // Inclusions variations
    'included': 'inclusions',
    'includes': 'inclusions',
    'whatsincluded': 'inclusions',
    
    // Exclusions variations
    'excluded': 'exclusions',
    'excludes': 'exclusions',
    'notincluded': 'exclusions'
  };

  return mappings[header] || header;
}

/**
 * Parses inclusions string into array
 */
function parseInclusions(inclusions?: string): string[] {
  if (!inclusions) return [];
  
  // Split by common delimiters and clean up
  return inclusions
    .split(/[,;•\n\r]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => item.replace(/^[-*]\s*/, '')); // Remove bullet points
}

/**
 * Parses exclusions string into array
 */
function parseExclusions(exclusions?: string): string[] {
  if (!exclusions) return [];
  
  return exclusions
    .split(/[,;•\n\r]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => item.replace(/^[-*]\s*/, ''));
}

/**
 * Parses price from various formats
 */
function parsePrice(price: string | number | undefined): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  
  // Remove currency symbols and spaces
  const cleanPrice = String(price)
    .replace(/[£$€,\s]/g, '')
    .replace(/[^\d.]/g, '');
  
  const parsed = parseFloat(cleanPrice);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses duration from various formats
 */
function parseDuration(duration: string | number | undefined): number {
  if (typeof duration === 'number') return duration;
  if (!duration) return 7; // Default to 7 days
  
  // Extract number from strings like "7 days", "5 nights", etc.
  const match = String(duration).match(/(\d+)/);
  return match ? parseInt(match[1]) : 7; // Default to 7 days
}

/**
 * Normalizes month names
 */
function normalizeMonth(month: string): string {
  const monthMap: Record<string, string> = {
    'jan': 'January', 'january': 'January',
    'feb': 'February', 'february': 'February',
    'mar': 'March', 'march': 'March',
    'apr': 'April', 'april': 'April',
    'may': 'May',
    'jun': 'June', 'june': 'June',
    'jul': 'July', 'july': 'July',
    'aug': 'August', 'august': 'August',
    'sep': 'September', 'september': 'September',
    'oct': 'October', 'october': 'October',
    'nov': 'November', 'november': 'November',
    'dec': 'December', 'december': 'December'
  };

  const normalized = month.toLowerCase().trim();
  return monthMap[normalized] || month;
}

/**
 * Validates parsed offer data
 */
export function validateOffer(offer: ParsedOffer): string[] {
  const errors: string[] = [];

  if (!offer.title || offer.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!offer.destination || offer.destination.trim().length === 0) {
    errors.push('Destination is required');
  }

  if (!offer.description || offer.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!offer.inclusions || offer.inclusions.length === 0) {
    errors.push('At least one inclusion is required');
  }

  if (offer.pricing.length === 0) {
    errors.push('At least one pricing entry is required');
  }

  // Validate pricing entries
  offer.pricing.forEach((pricing, index) => {
    if (!pricing.month) {
      errors.push(`Pricing entry ${index + 1}: Month is required`);
    }
    if (pricing.price <= 0) {
      errors.push(`Pricing entry ${index + 1}: Price must be greater than 0`);
    }
    if (pricing.duration <= 0) {
      errors.push(`Pricing entry ${index + 1}: Duration must be greater than 0`);
    }
  });

  return errors;
}

/**
 * Generates a preview of the Excel file structure
 */
export function previewExcelStructure(buffer: Buffer): {
  sheets: string[];
  headers: Record<string, string[]>;
  sampleData: Record<string, any[]>;
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result: any = {
    sheets: workbook.SheetNames,
    headers: {},
    sampleData: {}
  };

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    }) as any[][];

    if (jsonData.length > 0) {
      result.headers[sheetName] = jsonData[0] || [];
      result.sampleData[sheetName] = jsonData.slice(1, 4); // First 3 data rows
    }
  });

  return result;
}