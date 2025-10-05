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
  pax: number; // Number of people (6-11 or 12+)
  specialPeriod?: string; // For specific dates like Easter, weekends
}

/**
 * Parses Excel data using the Albufeira template format
 * Expected format:
 * Row 1: Resort, [Resort Name]
 * Row 2: Destination, [Destination]
 * Row 3: Empty
 * Row 4: How many People, 6-11 People, , , 12+ People
 * Row 5: Months, 2 Nights, 3 Nights, 4 Nights, 2 Nights, 3 Nights, 4 Nights
 * Row 6+: [Month], [Price], [Price], [Price], [Price], [Price], [Price]
 */
export function parseAlbufeiraExcel(buffer: Buffer): OfferData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (!data || data.length < 5) {
    throw new Error('Excel file must contain resort info and pricing data');
  }

  console.log('Raw Excel data:', data);

  // Parse resort and destination from first two rows
  const resortRow = data[0];
  const destinationRow = data[1];
  
  if (!resortRow || !destinationRow) {
    throw new Error('Missing resort or destination information in first two rows');
  }

  const resortName = String(resortRow[1] || '').trim();
  let destination = String(destinationRow[1] || '').trim();
  
  // Map destination variations to standard names
  if (destination.toLowerCase().includes('algarve') || destination.toLowerCase().includes('albufeira')) {
    destination = 'Albufeira';
  } else if (destination.toLowerCase().includes('benidorm')) {
    destination = 'Benidorm';
  }

  if (!resortName) {
    throw new Error('Resort name not found in first row, second column');
  }

  if (!['Benidorm', 'Albufeira'].includes(destination)) {
    throw new Error(`Invalid destination: "${destination}". Must be "Benidorm" or "Albufeira"`);
  }

  // Find the people count row (contains "How many People")
  let peopleRowIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && String(row[0] || '').toLowerCase().includes('how many people')) {
      peopleRowIndex = i;
      break;
    }
  }

  // Find the pricing header row (contains "Months" and night options)
  let pricingHeaderRowIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && String(row[0] || '').toLowerCase().includes('months')) {
      pricingHeaderRowIndex = i;
      break;
    }
  }

  if (pricingHeaderRowIndex === -1) {
    throw new Error('Could not find pricing header row (should contain "Months")');
  }

  const peopleRow = peopleRowIndex >= 0 ? data[peopleRowIndex] : null;
  const pricingHeaderRow = data[pricingHeaderRowIndex];
  console.log('People row:', peopleRow);
  console.log('Pricing header row:', pricingHeaderRow);

  // Parse people groups and night options
  const pricingStructure: Array<{nights: number, pax: number, columnIndex: number}> = [];
  
  if (peopleRow) {
    let currentPaxGroup = 0;
    for (let i = 1; i < pricingHeaderRow.length; i++) {
      const nightHeader = String(pricingHeaderRow[i] || '').trim();
      const nightMatch = nightHeader.match(/(\d+)\s*nights?/i);
      
      if (nightMatch) {
        const nights = parseInt(nightMatch[1]);
        
        // Determine pax group based on people row
        let pax = 8; // Default for 6-11 people (use middle value)
        if (peopleRow[i] && String(peopleRow[i]).includes('12+')) {
          pax = 15; // Use 15 for 12+ people
        }
        
        pricingStructure.push({
          nights,
          pax,
          columnIndex: i
        });
      }
    }
  } else {
    // Fallback: assume standard structure
    for (let i = 1; i < pricingHeaderRow.length; i++) {
      const nightHeader = String(pricingHeaderRow[i] || '').trim();
      const nightMatch = nightHeader.match(/(\d+)\s*nights?/i);
      
      if (nightMatch) {
        const nights = parseInt(nightMatch[1]);
        const pax = i <= 3 ? 8 : 15; // First 3 columns = 6-11 people, rest = 12+ people
        
        pricingStructure.push({
          nights,
          pax,
          columnIndex: i
        });
      }
    }
  }

  if (pricingStructure.length === 0) {
    throw new Error('No pricing structure found');
  }

  console.log('Pricing structure:', pricingStructure);

  // Parse pricing data
  const pricing: PricingData[] = [];
  const validMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let i = pricingHeaderRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const monthCell = String(row[0] || '').trim();
    if (!monthCell) continue;

    // Skip non-month rows (like empty rows or inclusions section)
    if (monthCell.toLowerCase().includes('inclusion') || 
        monthCell.toLowerCase().includes('sales') ||
        monthCell === '') {
      break;
    }

    // Extract month name from various formats
    let month = '';
    for (const validMonth of validMonths) {
      if (monthCell.toLowerCase().includes(validMonth.toLowerCase())) {
        month = validMonth;
        break;
      }
    }

    // Handle special cases like "Easter"
    if (!month && monthCell.toLowerCase().includes('easter')) {
      month = 'April'; // Easter is typically in April
    }

    if (!month) {
      console.log(`Skipping row with unrecognized month: "${monthCell}"`);
      continue;
    }

    // Extract special period info from month cell
    let specialPeriod: string | undefined;
    if (monthCell.includes('(') && monthCell.includes(')')) {
      const periodMatch = monthCell.match(/\(([^)]+)\)/);
      if (periodMatch) {
        specialPeriod = periodMatch[1];
      }
    }

    // Parse prices for each pricing structure option
    for (const structure of pricingStructure) {
      const priceCell = String(row[structure.columnIndex] || '').trim();
      if (!priceCell || priceCell.toLowerCase().includes('request')) {
        continue; // Skip "ON REQUEST" or empty cells
      }

      // Extract price from various formats (€ 85.00, 85.00, etc.)
      const priceMatch = priceCell.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[0].replace(',', ''));
        if (price > 0) {
          pricing.push({
            month,
            accommodationType: 'Apartment', // Default for Albufeira packages
            nights: structure.nights,
            price,
            pax: structure.pax,
            specialPeriod
          });
        }
      }
    }
  }

  if (pricing.length === 0) {
    throw new Error('No valid pricing data found');
  }

  // Find inclusions section
  const inclusions: string[] = [];
  let inclusionsStartIndex = -1;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && String(row[0] || '').toLowerCase().includes('inclusion')) {
      inclusionsStartIndex = i + 1;
      break;
    }
  }

  if (inclusionsStartIndex > 0) {
    for (let i = inclusionsStartIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[0]) continue;
      
      const inclusionText = String(row[0] || '').trim();
      if (!inclusionText || inclusionText.toLowerCase().includes('sales')) {
        break; // Stop at sales notes or empty rows
      }
      
      // Clean up inclusion text (remove asterisks, etc.)
      const cleanInclusion = inclusionText.replace(/^\*\s*/, '').trim();
      if (cleanInclusion && cleanInclusion.length > 3) {
        inclusions.push(cleanInclusion);
      }
    }
  }

  // Default inclusions if none found
  if (inclusions.length === 0) {
    inclusions.push(
      'Return Private Airport Transfers',
      'Centrally located accommodation',
      'Meet and Greet meeting on arrival',
      '24 Hour rep service'
    );
  }

  // Generate description
  const description = `Experience ${destination} with our comprehensive ${resortName} package including accommodation, transfers, and activities. Perfect for groups looking for a memorable getaway.`;

  console.log('Parsed offer data:', {
    resortName,
    destination,
    description,
    inclusions,
    pricing,
    currency: 'EUR'
  });

  return {
    resortName,
    destination,
    description,
    inclusions,
    pricing,
    currency: 'EUR'
  };
}