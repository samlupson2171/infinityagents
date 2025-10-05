import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE } from '../route';
import { requireAdmin } from '@/lib/auth-middleware';
import { getServerSession } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth-middleware');
vi.mock('next-auth');
vi.mock('@/lib/csv-parser');
vi.mock('@/lib/activity-utils');

const mockRequireAdmin = requireAdmin as Mock;
const mockGetServerSession = getServerSession as Mock;

describe('/api/admin/activities/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth by default
    mockRequireAdmin.mockResolvedValue(undefined);
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id' },
    });
  });

  describe('POST /api/admin/activities/upload', () => {
    it('should reject requests without admin authorization', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const formData = new FormData();
      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should reject requests without user session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const formData = new FormData();
      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests without file', async () => {
      const formData = new FormData();
      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NO_FILE');
    });

    it('should reject non-CSV files', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      formData.append('file', file);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('should reject files larger than 10MB', async () => {
      const formData = new FormData();
      // Create a mock file that reports size > 10MB
      const largeFile = new File(['x'.repeat(100)], 'large.csv', {
        type: 'text/csv',
      });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB
      formData.append('file', largeFile);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should reject empty CSV files', async () => {
      const formData = new FormData();
      const emptyFile = new File([''], 'empty.csv', { type: 'text/csv' });
      formData.append('file', emptyFile);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMPTY_FILE');
    });

    it('should handle CSV parsing errors', async () => {
      // Mock CSV parser to return errors
      const { parseActivitiesCSV } = await import('@/lib/csv-parser');
      (parseActivitiesCSV as Mock).mockReturnValue({
        success: false,
        data: [],
        errors: [
          {
            line: 1,
            field: 'headers',
            value: '',
            message: 'Missing required headers',
          },
        ],
        summary: { totalRows: 0, validRows: 0, errorRows: 0 },
      });

      const formData = new FormData();
      const csvContent = 'invalid,csv,headers\ndata,data,data';
      const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.data.errors).toHaveLength(1);
    });

    it('should successfully process valid CSV file', async () => {
      // Mock successful CSV parsing
      const { parseActivitiesCSV } = await import('@/lib/csv-parser');
      (parseActivitiesCSV as Mock).mockReturnValue({
        success: true,
        data: [
          {
            name: 'Beach Tour',
            category: 'excursion',
            location: 'Benidorm',
            pricePerPerson: 25,
            minPersons: 2,
            maxPersons: 20,
            availableFrom: new Date('2025-06-01'),
            availableTo: new Date('2025-09-30'),
            duration: '4 hours',
            description: 'Beach tour activity',
          },
        ],
        errors: [],
        summary: { totalRows: 1, validRows: 1, errorRows: 0 },
      });

      // Mock successful import
      const { importActivities } = await import('@/lib/activity-utils');
      (importActivities as Mock).mockResolvedValue({
        created: 1,
        updated: 0,
        errors: [],
      });

      const formData = new FormData();
      const csvContent =
        'name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description\nBeach Tour,excursion,Benidorm,25,2,20,2025-06-01,2025-09-30,4 hours,Beach tour activity';
      const file = new File([csvContent], 'valid.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.created).toBe(1);
      expect(data.data.summary.validRows).toBe(1);
    });

    it('should handle partial success with validation errors', async () => {
      // Mock CSV parsing with some valid and some invalid data
      const { parseActivitiesCSV } = await import('@/lib/csv-parser');
      (parseActivitiesCSV as Mock).mockReturnValue({
        success: false, // Overall parsing failed due to errors
        data: [
          {
            name: 'Valid Activity',
            category: 'excursion',
            location: 'Benidorm',
            pricePerPerson: 25,
            minPersons: 2,
            maxPersons: 20,
            availableFrom: new Date('2025-06-01'),
            availableTo: new Date('2025-09-30'),
            duration: '4 hours',
            description: 'Valid activity',
          },
        ],
        errors: [
          { line: 3, field: 'name', value: '', message: 'Name is required' },
        ],
        summary: { totalRows: 2, validRows: 1, errorRows: 1 },
      });

      // Mock successful import for valid data
      const { importActivities } = await import('@/lib/activity-utils');
      (importActivities as Mock).mockResolvedValue({
        created: 1,
        updated: 0,
        errors: [],
      });

      const formData = new FormData();
      const csvContent =
        'name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description\nValid Activity,excursion,Benidorm,25,2,20,2025-06-01,2025-09-30,4 hours,Valid activity\n,excursion,Benidorm,25,2,20,2025-06-01,2025-09-30,4 hours,Invalid activity';
      const file = new File([csvContent], 'partial.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-Status for partial success
      expect(data.success).toBe(true); // Still successful because some data was imported
      expect(data.data.summary.created).toBe(1);
      expect(data.data.summary.errorRows).toBe(1);
      expect(data.data.errors).toHaveLength(1);
    });

    it('should handle import errors', async () => {
      // Mock successful CSV parsing
      const { parseActivitiesCSV } = await import('@/lib/csv-parser');
      (parseActivitiesCSV as Mock).mockReturnValue({
        success: true,
        data: [
          {
            name: 'Test Activity',
            category: 'excursion',
            location: 'Benidorm',
            pricePerPerson: 25,
            minPersons: 2,
            maxPersons: 20,
            availableFrom: new Date('2025-06-01'),
            availableTo: new Date('2025-09-30'),
            duration: '4 hours',
            description: 'Test activity',
          },
        ],
        errors: [],
        summary: { totalRows: 1, validRows: 1, errorRows: 0 },
      });

      // Mock import failure
      const { importActivities } = await import('@/lib/activity-utils');
      (importActivities as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const formData = new FormData();
      const csvContent =
        'name,category,location,pricePerPerson,minPersons,maxPersons,availableFrom,availableTo,duration,description\nTest Activity,excursion,Benidorm,25,2,20,2025-06-01,2025-09-30,4 hours,Test activity';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest(
        'http://localhost/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('IMPORT_ERROR');
    });
  });

  describe('Unsupported HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should return 405 for PUT requests', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
