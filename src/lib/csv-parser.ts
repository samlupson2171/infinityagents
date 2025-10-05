import { ActivityCategory } from '../models/Activity';

export interface CSVValidationError {
  line: number;
  field: string;
  value: any;
  message: string;
}

export interface CSVParseResult {
  success: boolean;
  data: ActivityCSVRow[];
  errors: CSVValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export interface ActivityCSVRow {
  name: string;
  category: ActivityCategory;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: Date;
  availableTo: Date;
  duration: string;
  description: string;
}

// Expected CSV headers (case-insensitive)
const REQUIRED_HEADERS = [
  'name',
  'category',
  'location',
  'pricePerPerson',
  'minPersons',
  'maxPersons',
  'availableFrom',
  'availableTo',
  'duration',
  'description',
] as const;

// Alternative header names that should be mapped to standard names
const HEADER_ALIASES: Record<string, string> = {
  activity: 'name',
  activityname: 'name',
  price: 'pricePerPerson',
  priceperperson: 'pricePerPerson',
  price_per_person: 'pricePerPerson',
  minpersons: 'minPersons',
  min_persons: 'minPersons',
  minimum_persons: 'minPersons',
  maxpersons: 'maxPersons',
  max_persons: 'maxPersons',
  maximum_persons: 'maxPersons',
  availablefrom: 'availableFrom',
  available_from: 'availableFrom',
  start_date: 'availableFrom',
  startdate: 'availableFrom',
  availableto: 'availableTo',
  available_to: 'availableTo',
  end_date: 'availableTo',
  enddate: 'availableTo',
  desc: 'description',
};

export class CSVParser {
  private errors: CSVValidationError[] = [];

  /**
   * Parse CSV content and validate activity data
   */
  public parseActivitiesCSV(csvContent: string): CSVParseResult {
    this.errors = [];

    try {
      const lines = this.splitCSVLines(csvContent);

      if (lines.length === 0) {
        this.addError(0, 'file', '', 'CSV file is empty');
        return this.createResult([], 0);
      }

      const headers = this.parseCSVLine(lines[0]);
      const normalizedHeaders = this.normalizeHeaders(headers);

      // Validate headers
      const headerValidation = this.validateHeaders(normalizedHeaders);
      if (!headerValidation.valid) {
        this.addError(
          1,
          'headers',
          headers.join(','),
          headerValidation.message
        );
        return this.createResult([], lines.length - 1);
      }

      // Parse data rows
      const validRows: ActivityCSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) {
          continue;
        }

        try {
          const values = this.parseCSVLine(line);
          const rowData = this.createRowObject(normalizedHeaders, values);
          const validatedRow = this.validateRow(rowData, lineNumber);

          if (validatedRow) {
            validRows.push(validatedRow);
          }
        } catch (error) {
          this.addError(
            lineNumber,
            'parsing',
            line,
            `Failed to parse CSV line: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return this.createResult(validRows, lines.length - 1);
    } catch (error) {
      this.addError(
        0,
        'file',
        '',
        `Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return this.createResult([], 0);
    }
  }

  /**
   * Split CSV content into lines, handling different line endings
   */
  private splitCSVLines(content: string): string[] {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim().length > 0);
  }

  /**
   * Parse a single CSV line, handling quoted values and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  }

  /**
   * Normalize headers to standard names
   */
  private normalizeHeaders(headers: string[]): string[] {
    return headers.map((header) => {
      const normalized = header.toLowerCase().replace(/\s+/g, '');
      return HEADER_ALIASES[normalized] || normalized;
    });
  }

  /**
   * Validate that all required headers are present
   */
  private validateHeaders(headers: string[]): {
    valid: boolean;
    message: string;
  } {
    const missingHeaders = REQUIRED_HEADERS.filter(
      (required) => !headers.includes(required)
    );

    if (missingHeaders.length > 0) {
      return {
        valid: false,
        message: `Missing required headers: ${missingHeaders.join(', ')}. Expected headers: ${REQUIRED_HEADERS.join(', ')}`,
      };
    }

    return { valid: true, message: '' };
  }

  /**
   * Create row object from headers and values
   */
  private createRowObject(
    headers: string[],
    values: string[]
  ): Record<string, string> {
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row;
  }

  /**
   * Validate and convert a single row to ActivityCSVRow
   */
  private validateRow(
    rowData: Record<string, string>,
    lineNumber: number
  ): ActivityCSVRow | null {
    let hasErrors = false;
    const result: Partial<ActivityCSVRow> = {};

    // Validate name
    const name = rowData.name?.trim();
    if (!name) {
      this.addError(
        lineNumber,
        'name',
        rowData.name,
        'Activity name is required'
      );
      hasErrors = true;
    } else if (name.length < 3) {
      this.addError(
        lineNumber,
        'name',
        name,
        'Activity name must be at least 3 characters long'
      );
      hasErrors = true;
    } else if (name.length > 200) {
      this.addError(
        lineNumber,
        'name',
        name,
        'Activity name cannot exceed 200 characters'
      );
      hasErrors = true;
    } else {
      result.name = name;
    }

    // Validate category
    const category = rowData.category?.trim().toLowerCase();
    if (!category) {
      this.addError(
        lineNumber,
        'category',
        rowData.category,
        'Category is required'
      );
      hasErrors = true;
    } else if (
      !Object.values(ActivityCategory).includes(category as ActivityCategory)
    ) {
      this.addError(
        lineNumber,
        'category',
        category,
        `Invalid category. Must be one of: ${Object.values(ActivityCategory).join(', ')}`
      );
      hasErrors = true;
    } else {
      result.category = category as ActivityCategory;
    }

    // Validate location
    const location = rowData.location?.trim();
    if (!location) {
      this.addError(
        lineNumber,
        'location',
        rowData.location,
        'Location is required'
      );
      hasErrors = true;
    } else if (location.length < 2) {
      this.addError(
        lineNumber,
        'location',
        location,
        'Location must be at least 2 characters long'
      );
      hasErrors = true;
    } else if (location.length > 100) {
      this.addError(
        lineNumber,
        'location',
        location,
        'Location cannot exceed 100 characters'
      );
      hasErrors = true;
    } else {
      result.location = location;
    }

    // Validate pricePerPerson
    const priceStr = rowData.pricePerPerson?.trim();
    if (!priceStr) {
      this.addError(
        lineNumber,
        'pricePerPerson',
        rowData.pricePerPerson,
        'Price per person is required'
      );
      hasErrors = true;
    } else {
      const price = parseFloat(priceStr);
      if (isNaN(price)) {
        this.addError(
          lineNumber,
          'pricePerPerson',
          priceStr,
          'Price per person must be a valid number'
        );
        hasErrors = true;
      } else if (price < 0) {
        this.addError(
          lineNumber,
          'pricePerPerson',
          price,
          'Price per person must be a positive number'
        );
        hasErrors = true;
      } else if (price > 10000) {
        this.addError(
          lineNumber,
          'pricePerPerson',
          price,
          'Price per person seems unreasonably high (max 10,000 EUR)'
        );
        hasErrors = true;
      } else {
        result.pricePerPerson = price;
      }
    }

    // Validate minPersons
    const minPersonsStr = rowData.minPersons?.trim();
    if (!minPersonsStr) {
      this.addError(
        lineNumber,
        'minPersons',
        rowData.minPersons,
        'Minimum persons is required'
      );
      hasErrors = true;
    } else {
      const minPersons = parseInt(minPersonsStr, 10);
      if (isNaN(minPersons)) {
        this.addError(
          lineNumber,
          'minPersons',
          minPersonsStr,
          'Minimum persons must be a valid integer'
        );
        hasErrors = true;
      } else if (minPersons < 1) {
        this.addError(
          lineNumber,
          'minPersons',
          minPersons,
          'Minimum persons must be at least 1'
        );
        hasErrors = true;
      } else if (minPersons > 100) {
        this.addError(
          lineNumber,
          'minPersons',
          minPersons,
          'Minimum persons cannot exceed 100'
        );
        hasErrors = true;
      } else {
        result.minPersons = minPersons;
      }
    }

    // Validate maxPersons
    const maxPersonsStr = rowData.maxPersons?.trim();
    if (!maxPersonsStr) {
      this.addError(
        lineNumber,
        'maxPersons',
        rowData.maxPersons,
        'Maximum persons is required'
      );
      hasErrors = true;
    } else {
      const maxPersons = parseInt(maxPersonsStr, 10);
      if (isNaN(maxPersons)) {
        this.addError(
          lineNumber,
          'maxPersons',
          maxPersonsStr,
          'Maximum persons must be a valid integer'
        );
        hasErrors = true;
      } else if (maxPersons < 1) {
        this.addError(
          lineNumber,
          'maxPersons',
          maxPersons,
          'Maximum persons must be at least 1'
        );
        hasErrors = true;
      } else if (maxPersons > 100) {
        this.addError(
          lineNumber,
          'maxPersons',
          maxPersons,
          'Maximum persons cannot exceed 100'
        );
        hasErrors = true;
      } else {
        result.maxPersons = maxPersons;
      }
    }

    // Validate capacity relationship
    if (
      result.minPersons &&
      result.maxPersons &&
      result.minPersons > result.maxPersons
    ) {
      this.addError(
        lineNumber,
        'capacity',
        `${result.minPersons}-${result.maxPersons}`,
        'Minimum persons cannot be greater than maximum persons'
      );
      hasErrors = true;
    }

    // Validate availableFrom
    const availableFromStr = rowData.availableFrom?.trim();
    if (!availableFromStr) {
      this.addError(
        lineNumber,
        'availableFrom',
        rowData.availableFrom,
        'Available from date is required'
      );
      hasErrors = true;
    } else {
      const availableFrom = this.parseDate(availableFromStr);
      if (!availableFrom) {
        this.addError(
          lineNumber,
          'availableFrom',
          availableFromStr,
          'Available from date must be in format YYYY-MM-DD or DD/MM/YYYY'
        );
        hasErrors = true;
      } else {
        result.availableFrom = availableFrom;
      }
    }

    // Validate availableTo
    const availableToStr = rowData.availableTo?.trim();
    if (!availableToStr) {
      this.addError(
        lineNumber,
        'availableTo',
        rowData.availableTo,
        'Available to date is required'
      );
      hasErrors = true;
    } else {
      const availableTo = this.parseDate(availableToStr);
      if (!availableTo) {
        this.addError(
          lineNumber,
          'availableTo',
          availableToStr,
          'Available to date must be in format YYYY-MM-DD or DD/MM/YYYY'
        );
        hasErrors = true;
      } else {
        result.availableTo = availableTo;
      }
    }

    // Validate date relationship
    if (
      result.availableFrom &&
      result.availableTo &&
      result.availableFrom >= result.availableTo
    ) {
      this.addError(
        lineNumber,
        'dates',
        `${availableFromStr} to ${availableToStr}`,
        'Available from date must be before available to date'
      );
      hasErrors = true;
    }

    // Validate duration
    const duration = rowData.duration?.trim();
    if (!duration) {
      this.addError(
        lineNumber,
        'duration',
        rowData.duration,
        'Duration is required'
      );
      hasErrors = true;
    } else if (duration.length > 50) {
      this.addError(
        lineNumber,
        'duration',
        duration,
        'Duration cannot exceed 50 characters'
      );
      hasErrors = true;
    } else {
      result.duration = duration;
    }

    // Validate description
    const description = rowData.description?.trim();
    if (!description) {
      this.addError(
        lineNumber,
        'description',
        rowData.description,
        'Description is required'
      );
      hasErrors = true;
    } else if (description.length < 10) {
      this.addError(
        lineNumber,
        'description',
        description,
        'Description must be at least 10 characters long'
      );
      hasErrors = true;
    } else if (description.length > 2000) {
      this.addError(
        lineNumber,
        'description',
        description,
        'Description cannot exceed 2000 characters'
      );
      hasErrors = true;
    } else {
      result.description = description;
    }

    return hasErrors ? null : (result as ActivityCSVRow);
  }

  /**
   * Parse date string in various formats
   */
  private parseDate(dateStr: string): Date | null {
    // Try ISO format first (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return this.isValidDate(date) ? date : null;
    }

    // Try DD/MM/YYYY format
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return this.isValidDate(date) ? date : null;
    }

    // Try MM/DD/YYYY format
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return this.isValidDate(date) ? date : null;
    }

    // Try parsing with Date constructor as fallback
    const date = new Date(dateStr);
    return this.isValidDate(date) ? date : null;
  }

  /**
   * Check if date is valid
   */
  private isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Add validation error
   */
  private addError(
    line: number,
    field: string,
    value: any,
    message: string
  ): void {
    this.errors.push({
      line,
      field,
      value,
      message,
    });
  }

  /**
   * Create final result object
   */
  private createResult(
    data: ActivityCSVRow[],
    totalRows: number
  ): CSVParseResult {
    return {
      success: this.errors.length === 0,
      data,
      errors: this.errors,
      summary: {
        totalRows,
        validRows: data.length,
        errorRows: totalRows - data.length,
      },
    };
  }
}

/**
 * Utility function to parse CSV content
 */
export function parseActivitiesCSV(csvContent: string): CSVParseResult {
  const parser = new CSVParser();
  return parser.parseActivitiesCSV(csvContent);
}
