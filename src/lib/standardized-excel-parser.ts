import * as XLSX from 'xlsx';

export interface OfferData {
  resortName: string;
  destination: string;
  description: string;
  inclusions: string[];
  pricing: PricingData[];
  currency: string;
}

export interface PricingData {
  month: string;
  accommodationType: string;
  nights: number;
  price: number;
}

/**
 * Parses Excel data using the standardized template format
 */
export function parseStandardizedExcel(buffer: Buffer): OfferData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (!data || data.length < 2) {
    throw new Error('Excel file must contain at least a header row and one data row');
  }

  console.log('Raw Excel data:', data);

  // Get header row and normalize column names
  const headerRow = data[0];
  const columnMap: { [key: string]: number } = {};
  
  headerRow.forEach((header, index) => {
    const normalizedHeader = String(header || '').toLowerCase().trim();
    columnMap[normalizedHeader] = index;
  });

  console.log('Column mapping:', columnMap);

  // Required columns mapping
  const requiredColumns = {
    resortName: ['resort name', 'hotel name', 'resort', 'hotel'],
    destination: ['destination', 'location'],
    description: ['description', 'desc'],
    month: ['month'],
    accommodationType: ['accommodation type', 'accommodation', 'type'],
    nights: ['nights', 'night'],
    price: ['price', 'cost'],
    currency: ['currency', 'curr'],
    inclusion1: ['inclusion 1', 'inclusion1', 'include 1']
  };

  // Find column indices
  const columns: { [key: string]: number } = {};
  
  Object.entries(requiredColumns).forEach(([key, possibleNames]) => {
    for (const name of possibleNames) {
      if (columnMap[name] !== undefined) {
        columns[key] = columnMap[name];
        break;
      }
    }
  });

  console.log('Found columns:', columns);

  // Validate required columns exist
  const missingColumns = [];
  if (columns.resortName === undefined) missingColumns.push('Resort Name');
  if (columns.destination === undefined) missingColumns.push('Destination');
  if (columns.description === undefined) missingColumns.push('Description');
  if (columns.month === undefined) missingColumns.push('Month');
  if (columns.accommodationType === undefined) missingColumns.push('Accommodation Type');
  if (columns.nights === undefined) missingColumns.push('Nights');
  if (columns.price === undefined) missingColumns.push('Price');
  if (columns.currency === undefined) missingColumns.push('Currency');
  if (columns.inclusion1 === undefined) missingColumns.push('Inclusion 1');

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Please use the provided template with exact column names.`);
  }

  // Parse data from first row (all rows should have same resort info)
  const firstDataRow = data[1];
  if (!firstDataRow) {
    throw new Error('No data rows found');
  }

  const resortName = String(firstDataRow[columns.resortName] || '').trim();
  const destination = String(firstDataRow[columns.destination] || '').trim();
  const description = String(firstDataRow[columns.description] || '').trim();
  const currency = String(firstDataRow[columns.currency] || 'EUR').trim().toUpperCase();

  // Validate destination
  if (!['Benidorm', 'Albufeira'].includes(destination)) {
    throw new Error(`Invalid destination: "${destination}". Must be exactly "Benidorm" or "Albufeira"`);
  }

  // Validate currency
  if (!['EUR', 'GBP', 'USD'].includes(currency)) {
    throw new Error(`Invalid currency: "${currency}". Must be EUR, GBP, or USD`);
  }

  // Collect inclusions from first row
  const inclusions: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const inclusionCol = columnMap[`inclusion ${i}`] || columnMap[`inclusion${i}`];
    if (inclusionCol !== undefined) {
      const inclusion = String(firstDataRow[inclusionCol] || '').trim();
      if (inclusion) {
        inclusions.push(inclusion);
      }
    }
  }

  if (inclusions.length === 0) {
    throw new Error('At least one inclusion is required');
  }

  // Parse pricing data from all rows
  const pricing: PricingData[] = [];
  const validMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const validAccommodationTypes = ['Hotel', 'Self-Catering', 'Apartment', 'Villa', 'Hostel', 'Resort'];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // Skip empty rows
    }

    const month = String(row[columns.month] || '').trim();
    const accommodationType = String(row[columns.accommodationType] || '').trim();
    const nights = parseInt(String(row[columns.nights] || '0'));
    const price = parseFloat(String(row[columns.price] || '0'));

    // Validate month
    if (!validMonths.includes(month)) {
      throw new Error(`Invalid month in row ${i + 1}: "${month}". Must be a full month name like "January"`);
    }

    // Validate accommodation type
    if (!validAccommodationTypes.includes(accommodationType)) {
      throw new Error(`Invalid accommodation type in row ${i + 1}: "${accommodationType}". Must be one of: ${validAccommodationTypes.join(', ')}`);
    }

    // Validate nights
    if (isNaN(nights) || nights < 1 || nights > 14) {
      throw new Error(`Invalid nights in row ${i + 1}: "${nights}". Must be a number between 1 and 14`);
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price in row ${i + 1}: "${price}". Must be a positive number`);
    }

    pricing.push({
      month,
      accommodationType,
      nights,
      price,
    });
  }

  if (pricing.length === 0) {
    throw new Error('No valid pricing data found');
  }

  // Validate required fields
  if (!resortName) {
    throw new Error('Resort Name is required');
  }
  if (!description || description.length < 10) {
    throw new Error('Description is required and must be at least 10 characters');
  }

  console.log('Parsed offer data:', {
    resortName,
    destination,
    description,
    inclusions,
    pricing,
    currency
  });

  return {
    resortName,
    destination,
    description,
    inclusions,
    pricing,
    currency
  };
}