import { describe, it, expect } from 'vitest';

/**
 * Date utility functions for activities module
 * These functions are used throughout the application for date calculations
 */

// Date calculation utilities
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return date >= startDate && date <= endDate;
}

export function formatDateForCSV(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function parseDateFromCSV(dateStr: string): Date | null {
  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    // Validate ranges
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;

    const date = new Date(yearNum, monthNum - 1, dayNum);

    // Check if the date is valid and matches input (handles invalid dates like Feb 30)
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return null;
    }

    return isValidDate(date) ? date : null;
  }

  // Try DD/MM/YYYY format
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    // Validate ranges
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;

    const date = new Date(yearNum, monthNum - 1, dayNum);

    // Check if the date is valid and matches input
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return null;
    }

    return isValidDate(date) ? date : null;
  }

  return null;
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function getDaysDifference(date1: Date, date2: Date): number {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function getNextWeekday(date: Date): Date {
  const result = new Date(date);
  do {
    result.setDate(result.getDate() + 1);
  } while (isWeekend(result));
  return result;
}

describe('Date Utilities', () => {
  const testDate = new Date('2024-06-15T10:00:00Z'); // Saturday, June 15, 2024

  describe('addDays', () => {
    it('should add days correctly', () => {
      const result = addDays(testDate, 5);
      const expected = new Date('2024-06-20T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle negative days (subtract)', () => {
      const result = addDays(testDate, -3);
      const expected = new Date('2024-06-12T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle zero days', () => {
      const result = addDays(testDate, 0);
      expect(result.getTime()).toBe(testDate.getTime());
    });

    it('should handle month boundaries', () => {
      const endOfMonth = new Date('2024-06-30T10:00:00Z');
      const result = addDays(endOfMonth, 1);
      const expected = new Date('2024-07-01T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle year boundaries', () => {
      const endOfYear = new Date('2024-12-31T10:00:00Z');
      const result = addDays(endOfYear, 1);
      const expected = new Date('2025-01-01T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle leap year', () => {
      const feb28 = new Date('2024-02-28T10:00:00Z'); // 2024 is a leap year
      const result = addDays(feb28, 1);
      const expected = new Date('2024-02-29T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe('subtractDays', () => {
    it('should subtract days correctly', () => {
      const result = subtractDays(testDate, 5);
      const expected = new Date('2024-06-10T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle negative days (add)', () => {
      const result = subtractDays(testDate, -3);
      const expected = new Date('2024-06-18T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });

    it('should handle month boundaries', () => {
      const startOfMonth = new Date('2024-06-01T10:00:00Z');
      const result = subtractDays(startOfMonth, 1);
      const expected = new Date('2024-05-31T10:00:00Z');
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe('isDateInRange', () => {
    const startDate = new Date('2024-06-01T00:00:00Z');
    const endDate = new Date('2024-06-30T23:59:59Z');

    it('should return true for date within range', () => {
      const dateInRange = new Date('2024-06-15T12:00:00Z');
      expect(isDateInRange(dateInRange, startDate, endDate)).toBe(true);
    });

    it('should return true for start date', () => {
      expect(isDateInRange(startDate, startDate, endDate)).toBe(true);
    });

    it('should return true for end date', () => {
      expect(isDateInRange(endDate, startDate, endDate)).toBe(true);
    });

    it('should return false for date before range', () => {
      const dateBefore = new Date('2024-05-31T23:59:59Z');
      expect(isDateInRange(dateBefore, startDate, endDate)).toBe(false);
    });

    it('should return false for date after range', () => {
      const dateAfter = new Date('2024-07-01T00:00:00Z');
      expect(isDateInRange(dateAfter, startDate, endDate)).toBe(false);
    });
  });

  describe('formatDateForCSV', () => {
    it('should format date in YYYY-MM-DD format', () => {
      const result = formatDateForCSV(testDate);
      expect(result).toBe('2024-06-15');
    });

    it('should handle single digit months and days', () => {
      const singleDigitDate = new Date('2024-01-05T10:00:00Z');
      const result = formatDateForCSV(singleDigitDate);
      expect(result).toBe('2024-01-05');
    });

    it('should handle different timezones consistently', () => {
      const utcDate = new Date('2024-06-15T00:00:00Z');
      const result = formatDateForCSV(utcDate);
      expect(result).toBe('2024-06-15');
    });
  });

  describe('parseDateFromCSV', () => {
    it('should parse ISO format (YYYY-MM-DD)', () => {
      const result = parseDateFromCSV('2024-06-15');
      const expected = new Date(2024, 5, 15); // Month is 0-indexed
      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should parse DD/MM/YYYY format', () => {
      const result = parseDateFromCSV('15/06/2024');
      const expected = new Date(2024, 5, 15);
      expect(result?.getTime()).toBe(expected.getTime());
    });

    it('should handle single digit days and months', () => {
      const result1 = parseDateFromCSV('5/6/2024');
      const expected1 = new Date(2024, 5, 5);
      expect(result1?.getTime()).toBe(expected1.getTime());

      const result2 = parseDateFromCSV('2024-01-05');
      const expected2 = new Date(2024, 0, 5);
      expect(result2?.getTime()).toBe(expected2.getTime());
    });

    it('should return null for invalid formats', () => {
      expect(parseDateFromCSV('invalid-date')).toBeNull();
      expect(parseDateFromCSV('2024/06/15')).toBeNull(); // Wrong separator for ISO
      expect(parseDateFromCSV('15-06-2024')).toBeNull(); // Wrong separator for DD/MM
      expect(parseDateFromCSV('')).toBeNull();
    });

    it('should return null for invalid dates', () => {
      expect(parseDateFromCSV('2024-13-01')).toBeNull(); // Invalid month
      expect(parseDateFromCSV('2024-02-30')).toBeNull(); // Invalid day for February
      expect(parseDateFromCSV('32/01/2024')).toBeNull(); // Invalid day
    });

    it('should handle leap year correctly', () => {
      const result = parseDateFromCSV('2024-02-29'); // Valid leap year date
      expect(result).not.toBeNull();

      const invalidLeap = parseDateFromCSV('2023-02-29'); // Invalid non-leap year
      expect(invalidLeap).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate(new Date('2024-06-15'))).toBe(true);
      expect(isValidDate(new Date(2024, 5, 15))).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate(new Date(NaN))).toBe(false);
    });

    it('should return false for non-Date objects', () => {
      expect(isValidDate('2024-06-15' as any)).toBe(false);
      expect(isValidDate(null as any)).toBe(false);
      expect(isValidDate(undefined as any)).toBe(false);
      expect(isValidDate(123456789 as any)).toBe(false);
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate difference correctly', () => {
      const date1 = new Date('2024-06-15');
      const date2 = new Date('2024-06-20');
      expect(getDaysDifference(date1, date2)).toBe(5);
    });

    it('should handle reverse order', () => {
      const date1 = new Date('2024-06-20');
      const date2 = new Date('2024-06-15');
      expect(getDaysDifference(date1, date2)).toBe(5);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2024-06-15');
      expect(getDaysDifference(date, date)).toBe(0);
    });

    it('should handle month boundaries', () => {
      const date1 = new Date('2024-06-30');
      const date2 = new Date('2024-07-02');
      expect(getDaysDifference(date1, date2)).toBe(2);
    });

    it('should handle year boundaries', () => {
      const date1 = new Date('2024-12-30');
      const date2 = new Date('2025-01-02');
      expect(getDaysDifference(date1, date2)).toBe(3);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2024-06-15'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2024-06-16'); // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date('2024-06-17'); // Monday
      const tuesday = new Date('2024-06-18'); // Tuesday
      const wednesday = new Date('2024-06-19'); // Wednesday
      const thursday = new Date('2024-06-20'); // Thursday
      const friday = new Date('2024-06-21'); // Friday

      expect(isWeekend(monday)).toBe(false);
      expect(isWeekend(tuesday)).toBe(false);
      expect(isWeekend(wednesday)).toBe(false);
      expect(isWeekend(thursday)).toBe(false);
      expect(isWeekend(friday)).toBe(false);
    });
  });

  describe('getNextWeekday', () => {
    it('should return next Monday for Saturday', () => {
      const saturday = new Date('2024-06-15'); // Saturday
      const result = getNextWeekday(saturday);
      const expectedMonday = new Date('2024-06-17'); // Monday
      expect(result.getTime()).toBe(expectedMonday.getTime());
    });

    it('should return next Monday for Sunday', () => {
      const sunday = new Date('2024-06-16'); // Sunday
      const result = getNextWeekday(sunday);
      const expectedMonday = new Date('2024-06-17'); // Monday
      expect(result.getTime()).toBe(expectedMonday.getTime());
    });

    it('should return next day for weekdays', () => {
      const monday = new Date('2024-06-17'); // Monday
      const result = getNextWeekday(monday);
      const expectedTuesday = new Date('2024-06-18'); // Tuesday
      expect(result.getTime()).toBe(expectedTuesday.getTime());
    });

    it('should skip weekend when Friday leads to weekend', () => {
      const friday = new Date('2024-06-14'); // Friday
      const result = getNextWeekday(friday);
      const expectedMonday = new Date('2024-06-17'); // Monday (skips Sat & Sun)
      expect(result.getTime()).toBe(expectedMonday.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle daylight saving time transitions', () => {
      // This test ensures our date calculations work across DST boundaries
      const beforeDST = new Date('2024-03-09T10:00:00'); // Before DST in US
      const afterDST = addDays(beforeDST, 1);

      expect(getDaysDifference(beforeDST, afterDST)).toBe(1);
    });

    it('should handle different time zones consistently', () => {
      const utcDate = new Date('2024-06-15T12:00:00Z');
      const localDate = new Date(2024, 5, 15); // June 15, 2024 in local time

      // Both should format to the same date string
      expect(formatDateForCSV(utcDate)).toBe('2024-06-15');
      expect(formatDateForCSV(localDate)).toBe('2024-06-15');
    });

    it('should handle very large date differences', () => {
      const date1 = new Date('2020-01-01');
      const date2 = new Date('2024-01-01');
      const difference = getDaysDifference(date1, date2);

      // 4 years = approximately 1461 days (including leap year)
      expect(difference).toBe(1461);
    });

    it('should handle minimum and maximum dates', () => {
      const minDate = new Date(-8640000000000000); // Minimum JS date
      const maxDate = new Date(8640000000000000); // Maximum JS date

      expect(isValidDate(minDate)).toBe(true);
      expect(isValidDate(maxDate)).toBe(true);
    });
  });
});
