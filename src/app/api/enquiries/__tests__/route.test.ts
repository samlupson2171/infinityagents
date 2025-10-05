import { NextRequest } from 'next/server';
import { POST } from '../route';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import {
  sendEnquiryNotificationEmail,
  sendEnquiryConfirmationEmail,
} from '@/lib/email';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Enquiry');
jest.mock('@/lib/email');
jest.mock('next-auth/jwt');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockSendEnquiryNotificationEmail =
  sendEnquiryNotificationEmail as jest.MockedFunction<
    typeof sendEnquiryNotificationEmail
  >;
const mockSendEnquiryConfirmationEmail =
  sendEnquiryConfirmationEmail as jest.MockedFunction<
    typeof sendEnquiryConfirmationEmail
  >;

// Mock Enquiry constructor
const mockEnquirySave = jest.fn();
const mockEnquiryPopulate = jest.fn();
const MockEnquiry = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'enquiry-id',
  save: mockEnquirySave,
  populate: mockEnquiryPopulate,
}));
(Enquiry as any) = MockEnquiry;

describe('/api/enquiries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockEnquirySave.mockResolvedValue(true);
    mockEnquiryPopulate.mockResolvedValue(true);
    mockSendEnquiryNotificationEmail.mockResolvedValue(undefined as any);
    mockSendEnquiryConfirmationEmail.mockResolvedValue(undefined as any);
  });

  describe('POST', () => {
    const validEnquiryData = {
      leadName: 'John Smith',
      tripType: 'stag',
      resort: 'Ibiza',
      travelDate: '2024-06-15',
      departureAirport: 'London Heathrow',
      numberOfNights: 3,
      numberOfGuests: 12,
      eventsRequested: ['Boat Party', 'Club Entry'],
      accommodationType: 'hotel',
      boardType: 'Half Board',
      budgetPerPerson: 500,
    };

    it('should create enquiry successfully for approved user', async () => {
      // Mock approved user token
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.enquiryId).toBe('enquiry-id');
      expect(MockEnquiry).toHaveBeenCalledWith({
        ...validEnquiryData,
        travelDate: new Date('2024-06-15'),
        agentEmail: 'agent@test.com',
        submittedBy: 'user-id',
        status: 'new',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockEnquirySave).toHaveBeenCalled();
      expect(mockEnquiryPopulate).toHaveBeenCalledWith(
        'submittedBy',
        'name companyName contactEmail'
      );
    });

    it('should send notification and confirmation emails', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      // Mock populated user data
      mockEnquiryPopulate.mockImplementation(() => {
        return {
          submittedBy: {
            name: 'Agent Name',
            companyName: 'Test Company',
            contactEmail: 'agent@test.com',
          },
        };
      });

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSendEnquiryNotificationEmail).toHaveBeenCalledWith({
        enquiryId: 'enquiry-id',
        leadName: 'John Smith',
        tripType: 'stag',
        resort: 'Ibiza',
        travelDate: new Date('2024-06-15'),
        departureAirport: 'London Heathrow',
        numberOfNights: 3,
        numberOfGuests: 12,
        eventsRequested: ['Boat Party', 'Club Entry'],
        accommodationType: 'hotel',
        boardType: 'Half Board',
        budgetPerPerson: 500,
        agentName: 'Agent Name',
        agentCompany: 'Test Company',
        agentEmail: 'agent@test.com',
      });

      expect(mockSendEnquiryConfirmationEmail).toHaveBeenCalledWith({
        enquiryId: 'enquiry-id',
        leadName: 'John Smith',
        tripType: 'stag',
        resort: 'Ibiza',
        travelDate: new Date('2024-06-15'),
        agentName: 'Agent Name',
        agentEmail: 'agent@test.com',
      });
    });

    it('should still create enquiry if email sending fails', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      mockSendEnquiryNotificationEmail.mockRejectedValue(
        new Error('Email service down')
      );
      mockSendEnquiryConfirmationEmail.mockRejectedValue(
        new Error('Email service down')
      );

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockEnquirySave).toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetToken.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 for unapproved user', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: false,
      });

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PENDING_APPROVAL');
    });

    it('should return 400 for invalid request data', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const invalidData = {
        leadName: '', // Empty lead name
        tripType: 'invalid', // Invalid trip type
        numberOfGuests: 0, // Invalid number of guests
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should validate future travel date', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const pastDateData = {
        ...validEnquiryData,
        travelDate: '2020-01-01', // Past date
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(pastDateData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate number ranges', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const invalidRangeData = {
        ...validEnquiryData,
        numberOfNights: 0, // Below minimum
        numberOfGuests: 100, // Above maximum
        budgetPerPerson: -100, // Negative budget
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(invalidRangeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate required fields', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const incompleteData = {
        leadName: 'John Smith',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle enum validation for trip type and accommodation', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const invalidEnumData = {
        ...validEnquiryData,
        tripType: 'invalid-type',
        accommodationType: 'invalid-accommodation',
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(invalidEnumData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      mockEnquirySave.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(validEnquiryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle empty events requested array', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-id',
        email: 'agent@test.com',
        role: 'agent',
        isApproved: true,
      });

      const dataWithoutEvents = {
        ...validEnquiryData,
        eventsRequested: [],
      };

      const request = new NextRequest('http://localhost/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(dataWithoutEvents),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });
});
