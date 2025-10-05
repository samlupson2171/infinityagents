import { describe, it, expect } from 'vitest';
import { CSVParser, parseActivitiesCSV, ActivityCSVRow } from '../csv-parser';
import { ActivityCategory } from '../../models/Activity';

describe('CSV Parser', () => {
  describe('Valid CSV Parsing', () => {
    it('should parse a valid CSV with all required fields', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,A wonderful beach excursion with guided tour
Mountain Hike,adventure,Albufeira,35.00,4,15,2025-05-01,2025-10-31,6 hours,Challenging mountain hike with scenic views`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.validRows).toBe(2);
      expect(result.summary.errorRows).toBe(0);

      const firstActivity = result.data[0];
      expect(firstActivity.name).toBe('Beach Tour');
      expect(firstActivity.category).toBe(ActivityCategory.EXCURSION);
      expect(firstActivity.location).toBe('Benidorm');
      expect(firstActivity.pricePerPerson).toBe(25.5);
      expect(firstActivity.minPersons).toBe(2);
      expect(firstActivity.maxPersons).toBe(20);
      expect(firstActivity.availableFrom).toEqual(new Date(2025, 5, 1)); // June 1st
      expect(firstActivity.availableTo).toEqual(new Date(2025, 8, 30)); // September 30th
      expect(firstActivity.duration).toBe('4 hours');
      expect(firstActivity.description).toBe(
        'A wonderful beach excursion with guided tour'
      );
    });

    it('should handle alternative header names', () => {
      const csvContent = `Activity,Category,Location,Price,Min Persons,Max Persons,Start Date,End Date,Duration,Description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,A wonderful beach excursion`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Beach Tour');
      expect(result.data[0].pricePerPerson).toBe(25.5);
    });

    it('should handle quoted CSV values with commas', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
"Beach Tour, Premium",excursion,"Benidorm, Spain",25.50,2,20,2025-06-01,2025-09-30,4 hours,"A wonderful beach excursion, with guided tour and refreshments"`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Beach Tour, Premium');
      expect(result.data[0].location).toBe('Benidorm, Spain');
      expect(result.data[0].description).toBe(
        'A wonderful beach excursion, with guided tour and refreshments'
      );
    });

    it('should handle different date formats', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,01/06/2025,30/09/2025,4 hours,Beach excursion
Mountain Hike,adventure,Albufeira,35.00,4,15,2025-05-01,2025-10-31,6 hours,Mountain hike`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].availableFrom).toEqual(new Date(2025, 5, 1)); // June 1st
      expect(result.data[0].availableTo).toEqual(new Date(2025, 8, 30)); // September 30th
    });

    it('should skip empty lines', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion

Mountain Hike,adventure,Albufeira,35.00,4,15,2025-05-01,2025-10-31,6 hours,Mountain hike
`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Header Validation', () => {
    it('should reject CSV with missing required headers', () => {
      const csvContent = `name,category,location,pricePerPerson
Beach Tour,excursion,Benidorm,25.50`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('headers');
      expect(result.errors[0].message).toContain('Missing required headers');
    });

    it('should accept headers in different order', () => {
      const csvContent = `description,duration,availableTo,availableFrom,maxPersons,minPersons,pricePerPerson,location,category,name
Beach excursion,4 hours,2025-09-30,2025-06-01,20,2,25.50,Benidorm,excursion,Beach Tour`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Beach Tour');
    });
  });

  describe('Field Validation', () => {
    const validHeaders =
      'name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description';

    it('should validate required fields', () => {
      const csvContent = `${validHeaders}
,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'name' && e.message.includes('required')
        )
      ).toBe(true);
    });

    it('should validate name length constraints', () => {
      const csvContent = `${validHeaders}
AB,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion
${'A'.repeat(201)},excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'name' && e.message.includes('at least 3 characters')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'name' &&
            e.message.includes('cannot exceed 200 characters')
        )
      ).toBe(true);
    });

    it('should validate category enum values', () => {
      const csvContent = `${validHeaders}
Beach Tour,invalid_category,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'category' && e.message.includes('Invalid category')
        )
      ).toBe(true);
    });

    it('should validate all activity categories', () => {
      const categories = Object.values(ActivityCategory);
      const rows = categories
        .map(
          (category, index) =>
            `Activity ${index + 1},${category},Location,25.50,2,20,2025-06-01,2025-09-30,4 hours,Description`
        )
        .join('\n');

      const csvContent = `${validHeaders}\n${rows}`;
      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(categories.length);
    });

    it('should validate price constraints', () => {
      const csvContent = `${validHeaders}
Beach Tour,excursion,Benidorm,invalid_price,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion
Mountain Hike,adventure,Albufeira,-10,2,20,2025-06-01,2025-09-30,4 hours,Mountain hike
Expensive Tour,excursion,Benidorm,15000,2,20,2025-06-01,2025-09-30,4 hours,Very expensive`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'pricePerPerson' && e.message.includes('valid number')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'pricePerPerson' &&
            e.message.includes('positive number')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'pricePerPerson' &&
            e.message.includes('unreasonably high')
        )
      ).toBe(true);
    });

    it('should validate person count constraints', () => {
      const csvContent = `${validHeaders}
Beach Tour,excursion,Benidorm,25.50,invalid_min,20,2025-06-01,2025-09-30,4 hours,Beach excursion
Mountain Hike,adventure,Albufeira,35.00,0,20,2025-06-01,2025-09-30,4 hours,Mountain hike
Large Group,excursion,Benidorm,25.50,1,150,2025-06-01,2025-09-30,4 hours,Large group activity
Invalid Capacity,excursion,Benidorm,25.50,10,5,2025-06-01,2025-09-30,4 hours,Invalid capacity`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'minPersons' && e.message.includes('valid integer')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) => e.field === 'minPersons' && e.message.includes('at least 1')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'maxPersons' && e.message.includes('cannot exceed 100')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'capacity' &&
            e.message.includes('cannot be greater than')
        )
      ).toBe(true);
    });

    it('should validate date formats and constraints', () => {
      const csvContent = `${validHeaders}
Beach Tour,excursion,Benidorm,25.50,2,20,invalid_date,2025-09-30,4 hours,Beach excursion
Mountain Hike,adventure,Albufeira,35.00,2,20,2025-06-01,invalid_date,4 hours,Mountain hike
Wrong Order,excursion,Benidorm,25.50,2,20,2025-09-30,2025-06-01,4 hours,Wrong date order`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'availableFrom' && e.message.includes('format')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) => e.field === 'availableTo' && e.message.includes('format')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) => e.field === 'dates' && e.message.includes('must be before')
        )
      ).toBe(true);
    });

    it('should validate duration constraints', () => {
      const csvContent = `${validHeaders}
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,,Beach excursion
Long Duration,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,${'A'.repeat(51)},Long duration`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'duration' && e.message.includes('required')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'duration' &&
            e.message.includes('cannot exceed 50 characters')
        )
      ).toBe(true);
    });

    it('should validate description constraints', () => {
      const csvContent = `${validHeaders}
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,
Short Desc,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Short
Long Desc,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,${'A'.repeat(2001)}`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'description' && e.message.includes('required')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'description' &&
            e.message.includes('at least 10 characters')
        )
      ).toBe(true);
      expect(
        result.errors.some(
          (e) =>
            e.field === 'description' &&
            e.message.includes('cannot exceed 2000 characters')
        )
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty CSV file', () => {
      const result = parseActivitiesCSV('');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('CSV file is empty');
    });

    it('should handle malformed CSV lines', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion
"Unclosed quote,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Description`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(result.data).toHaveLength(1); // First row should still be parsed
      // The malformed line should either cause a parsing error or validation errors
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide line numbers for errors', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion
,invalid_category,Benidorm,invalid_price,0,150,invalid_date,invalid_date,,Short
Mountain Hike,adventure,Albufeira,35.00,4,15,2025-05-01,2025-10-31,6 hours,Mountain hiking adventure`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.success).toBe(false);
      expect(result.data).toHaveLength(2); // First and last rows should be valid

      // All errors should be from line 3
      const line3Errors = result.errors.filter((e) => e.line === 3);
      expect(line3Errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorFields = line3Errors.map((e) => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('category');
      expect(errorFields).toContain('pricePerPerson');
    });
  });

  describe('Summary Statistics', () => {
    it('should provide accurate summary statistics', () => {
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion
,invalid_category,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Invalid row
Mountain Hike,adventure,Albufeira,35.00,4,15,2025-05-01,2025-10-31,6 hours,Mountain hiking adventure
Another Invalid,,Benidorm,invalid_price,2,20,2025-06-01,2025-09-30,4 hours,Another invalid row`;

      const result = parseActivitiesCSV(csvContent);

      expect(result.summary.totalRows).toBe(4);
      expect(result.summary.validRows).toBe(2);
      expect(result.summary.errorRows).toBe(2);
      expect(result.success).toBe(false);
    });
  });

  describe('CSVParser Class', () => {
    it('should work as a class instance', () => {
      const parser = new CSVParser();
      const csvContent = `name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description
Beach Tour,excursion,Benidorm,25.50,2,20,2025-06-01,2025-09-30,4 hours,Beach excursion`;

      const result = parser.parseActivitiesCSV(csvContent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
