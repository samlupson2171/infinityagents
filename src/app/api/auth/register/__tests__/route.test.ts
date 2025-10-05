import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import User from '@/models/User';

// Mock the email functions
vi.mock('@/lib/email', () => ({
  sendAdminNotificationEmail: vi
    .fn()
    .mockResolvedValue({ messageId: 'test-admin-id' }),
  sendRegistrationConfirmationEmail: vi
    .fn()
    .mockResolvedValue({ messageId: 'test-user-id' }),
}));

// Mock the database connection
vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

describe('Registration API', () => {
  beforeEach(async () => {
    // Clear all users before each test
    await User.deleteMany({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validRegistrationData = {
    name: 'John Doe',
    companyName: 'Travel Agency Ltd',
    abtaPtsNumber: 'ABTA12345',
    contactEmail: 'john@travelagency.com',
    websiteAddress: 'https://www.travelagency.com',
    password: 'password123',
  };

  describe('Successful Registration', () => {
    it('should register a new user with valid data', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(validRegistrationData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Registration successful');
      expect(data.data.user.name).toBe(validRegistrationData.name);
      expect(data.data.user.contactEmail).toBe(
        validRegistrationData.contactEmail
      );
      expect(data.data.user.isApproved).toBe(false);
      expect(data.data.user.role).toBe('agent');
      expect(data.data.user).not.toHaveProperty('password');

      // Verify user was created in database
      const savedUser = await User.findOne({
        contactEmail: validRegistrationData.contactEmail,
      });
      expect(savedUser).toBeTruthy();
      expect(savedUser!.name).toBe(validRegistrationData.name);
      expect(savedUser!.isApproved).toBe(false);
    });

    it('should transform ABTA/PTS number to uppercase', async () => {
      const dataWithLowercase = {
        ...validRegistrationData,
        abtaPtsNumber: 'abta12345',
        contactEmail: 'lowercase@example.com',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(dataWithLowercase),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user.abtaPtsNumber).toBe('ABTA12345');
    });

    it('should transform email to lowercase', async () => {
      const dataWithUppercaseEmail = {
        ...validRegistrationData,
        contactEmail: 'JOHN@TRAVELAGENCY.COM',
        abtaPtsNumber: 'ABTA99999',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(dataWithUppercaseEmail),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.user.contactEmail).toBe('john@travelagency.com');
    });
  });

  describe('Validation Errors', () => {
    it('should reject registration with missing required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        // Missing other required fields
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(incompleteData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeInstanceOf(Array);
      expect(data.error.details.length).toBeGreaterThan(0);
    });

    it('should reject invalid ABTA/PTS number format', async () => {
      const invalidData = {
        ...validRegistrationData,
        abtaPtsNumber: 'INVALID123',
        contactEmail: 'invalid@example.com',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(
        data.error.details.some(
          (detail: any) =>
            detail.field === 'abtaPtsNumber' &&
            detail.message.includes('ABTA or PTS')
        )
      ).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const invalidData = {
        ...validRegistrationData,
        contactEmail: 'invalid-email',
        abtaPtsNumber: 'ABTA88888',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(
        data.error.details.some(
          (detail: any) =>
            detail.field === 'contactEmail' &&
            detail.message.includes('valid email')
        )
      ).toBe(true);
    });

    it('should reject invalid website URL', async () => {
      const invalidData = {
        ...validRegistrationData,
        websiteAddress: 'not-a-url',
        contactEmail: 'url@example.com',
        abtaPtsNumber: 'ABTA77777',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(
        data.error.details.some(
          (detail: any) => detail.field === 'websiteAddress'
        )
      ).toBe(true);
    });

    it('should reject short password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: '123',
        contactEmail: 'short@example.com',
        abtaPtsNumber: 'ABTA66666',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(
        data.error.details.some(
          (detail: any) =>
            detail.field === 'password' &&
            detail.message.includes('8 characters')
        )
      ).toBe(true);
    });
  });

  describe('Duplicate Registration Prevention', () => {
    it('should reject registration with existing email', async () => {
      // Create first user
      await new User(validRegistrationData).save();

      // Try to register with same email but different ABTA number
      const duplicateEmailData = {
        ...validRegistrationData,
        name: 'Jane Doe',
        abtaPtsNumber: 'ABTA54321',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(duplicateEmailData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMAIL_EXISTS');
      expect(data.error.message).toContain('email address already exists');
    });

    it('should reject registration with existing ABTA/PTS number', async () => {
      // Create first user
      await new User(validRegistrationData).save();

      // Try to register with same ABTA number but different email
      const duplicateAbtaData = {
        ...validRegistrationData,
        name: 'Jane Doe',
        contactEmail: 'jane@different.com',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(duplicateAbtaData),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ABTA_PTS_EXISTS');
      expect(data.error.message).toContain('ABTA/PTS number already exists');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should continue registration even if email sending fails', async () => {
      // Mock email functions to throw errors
      const { sendAdminNotificationEmail, sendRegistrationConfirmationEmail } =
        await import('@/lib/email');
      vi.mocked(sendAdminNotificationEmail).mockRejectedValue(
        new Error('Email service down')
      );
      vi.mocked(sendRegistrationConfirmationEmail).mockRejectedValue(
        new Error('Email service down')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            ...validRegistrationData,
            contactEmail: 'emailfail@example.com',
            abtaPtsNumber: 'ABTA55555',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Registration should still succeed even if emails fail
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify user was still created
      const savedUser = await User.findOne({
        contactEmail: 'emailfail@example.com',
      });
      expect(savedUser).toBeTruthy();
    });
  });
});
