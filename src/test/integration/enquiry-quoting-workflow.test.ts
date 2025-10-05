import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../../models/User';
import Enquiry from '../../models/Enquiry';
import Quote from '../../models/Quote';
import { sendQuoteEmail } from '../../lib/email';

// Mock the email service for testing
vi.mock('../../lib/email', () => ({
  sendQuoteEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  }),
}));

describe('Enquiry Quoting System - End-to-End Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let testAgent: any;
  let testEnquiry: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Disconnect existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Enquiry.deleteMany({});
    await Quote.deleteMany({});

    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      companyName: 'Test Admin Company',
      company: 'Test Admin Company',
      abtaPtsNumber: 'ABTA12345',
      contactEmail: 'admin@test.com',
      websiteAddress: 'https://admin.test.com',
      password: 'password123',
      role: 'admin',
      isApproved: true,
      registrationStatus: 'approved',
    });

    testAgent = await User.create({
      name: 'Test Agent',
      companyName: 'Test Travel Agency',
      company: 'Test Travel Agency',
      abtaPtsNumber: 'ABTA54321',
      contactEmail: 'agent@test.com',
      websiteAddress: 'https://agent.test.com',
      password: 'password123',
      role: 'agent',
      isApproved: true,
      registrationStatus: 'approved',
    });

    // Create test enquiry
    testEnquiry = await Enquiry.create({
      leadName: 'John Doe',
      tripType: 'other',
      agentEmail: 'agent@test.com',
      firstChoiceDestination: 'Benidorm',
      travelDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      departureAirport: 'Manchester',
      numberOfNights: 7,
      numberOfGuests: 4,
      eventsRequested: ['nightclub', 'restaurant'],
      accommodationType: 'hotel',
      boardType: 'all-inclusive',
      budgetPerPerson: 500,
      additionalNotes: 'Close to beach, family-friendly',
      submittedBy: testAgent._id,
      status: 'new',
    });
  });

  describe('Complete Quote Creation to Email Delivery Workflow', () => {
    it('should handle complete quote workflow from creation to email delivery', async () => {
      // Step 1: Admin views enquiry and creates quote
      const enquiry = await Enquiry.findById(testEnquiry._id);
      expect(enquiry).toBeTruthy();
      expect(enquiry.status).toBe('pending');

      // Step 2: Create comprehensive quote
      const quoteData = {
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Benidorm Palace',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isSuperPackage: true,
        whatsIncluded: 'All meals, drinks, entertainment, transfers',
        transferIncluded: true,
        activitiesIncluded: 'Flamenco show, beach excursion, city tour',
        totalPrice: 2800,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
      };

      const createdQuote = await Quote.create(quoteData);

      expect(createdQuote).toBeTruthy();
      expect(createdQuote.enquiryId.toString()).toBe(testEnquiry._id.toString());
      expect(createdQuote.leadName).toBe('John Doe');
      expect(createdQuote.totalPrice).toBe(2800);
      expect(createdQuote.version).toBe(1);
      expect(createdQuote.status).toBe('draft');

      // Step 3: Update enquiry with quote reference
      await Enquiry.findByIdAndUpdate(testEnquiry._id, {
        $push: { quotes: createdQuote._id },
        hasQuotes: true,
        latestQuoteDate: createdQuote.createdAt,
        quotesCount: 1,
      });

      const updatedEnquiry = await Enquiry.findById(testEnquiry._id);
      expect(updatedEnquiry.hasQuotes).toBe(true);
      expect(updatedEnquiry.quotes).toHaveLength(1);
      expect(updatedEnquiry.quotesCount).toBe(1);

      // Step 4: Send quote email
      const emailResult = await sendQuoteEmail(createdQuote._id.toString());
      expect(emailResult.success).toBe(true);
      expect(emailResult.messageId).toBe('test-message-id');

      // Step 5: Update quote with email status
      await Quote.findByIdAndUpdate(createdQuote._id, {
        emailSent: true,
        emailSentAt: new Date(),
        emailDeliveryStatus: 'delivered',
        emailMessageId: emailResult.messageId,
        status: 'sent',
      });

      const finalQuote = await Quote.findById(createdQuote._id);
      expect(finalQuote.emailSent).toBe(true);
      expect(finalQuote.emailDeliveryStatus).toBe('delivered');
      expect(finalQuote.status).toBe('sent');
      expect(finalQuote.emailMessageId).toBe('test-message-id');
    });

    it('should handle quote editing and version history', async () => {
      // Create initial quote
      const initialQuote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Benidorm Palace',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isSuperPackage: false,
        whatsIncluded: 'Accommodation only',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1800,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'sent',
        version: 1,
      });

      // Create updated version
      const updatedQuote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Benidorm Palace',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isSuperPackage: true,
        whatsIncluded: 'All meals, drinks, entertainment, transfers',
        transferIncluded: true,
        activitiesIncluded: 'Flamenco show, beach excursion',
        totalPrice: 2800,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'updated',
        version: 2,
      });

      // Verify version history
      const allVersions = await Quote.find({ enquiryId: testEnquiry._id })
        .sort({ version: 1 });

      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].version).toBe(1);
      expect(allVersions[0].totalPrice).toBe(1800);
      expect(allVersions[0].isSuperPackage).toBe(false);

      expect(allVersions[1].version).toBe(2);
      expect(allVersions[1].totalPrice).toBe(2800);
      expect(allVersions[1].isSuperPackage).toBe(true);

      // Get latest version
      const latestQuote = await Quote.findOne({ enquiryId: testEnquiry._id })
        .sort({ version: -1 });

      expect(latestQuote.version).toBe(2);
      expect(latestQuote.status).toBe('updated');
    });

    it('should handle multiple quotes for single enquiry', async () => {
      // Create multiple quotes for the same enquiry
      const quote1 = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Option 1',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Basic package',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1500,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'sent',
      });

      const quote2 = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Option 2',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: true,
        whatsIncluded: 'Premium package with all inclusions',
        transferIncluded: true,
        activitiesIncluded: 'Multiple activities included',
        totalPrice: 3200,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'sent',
      });

      // Update enquiry with multiple quotes
      await Enquiry.findByIdAndUpdate(testEnquiry._id, {
        $push: { quotes: { $each: [quote1._id, quote2._id] } },
        hasQuotes: true,
        quotesCount: 2,
        latestQuoteDate: quote2.createdAt,
      });

      // Verify enquiry has multiple quotes
      const enquiryWithQuotes = await Enquiry.findById(testEnquiry._id)
        .populate('quotes');

      expect(enquiryWithQuotes.quotes).toHaveLength(2);
      expect(enquiryWithQuotes.quotesCount).toBe(2);
      expect(enquiryWithQuotes.hasQuotes).toBe(true);

      // Verify quotes can be retrieved by enquiry
      const enquiryQuotes = await Quote.find({ enquiryId: testEnquiry._id })
        .sort({ createdAt: -1 });

      expect(enquiryQuotes).toHaveLength(2);
      expect(enquiryQuotes[0].hotelName).toBe('Hotel Option 2');
      expect(enquiryQuotes[1].hotelName).toBe('Hotel Option 1');
    });
  });

  describe('Quote Validation and Business Rules', () => {
    it('should validate quote data integrity', async () => {
      // Test required fields validation
      const invalidQuote = {
        enquiryId: testEnquiry._id,
        // Missing required fields
        createdBy: adminUser._id,
      };

      await expect(Quote.create(invalidQuote)).rejects.toThrow();

      // Test date validation (arrival date in past)
      const pastDateQuote = {
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2020-01-01'), // Past date
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
      };

      await expect(Quote.create(pastDateQuote)).rejects.toThrow();

      // Test price validation (negative price)
      const negativePriceQuote = {
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: -100, // Negative price
        currency: 'GBP',
        createdBy: adminUser._id,
      };

      await expect(Quote.create(negativePriceQuote)).rejects.toThrow();
    });

    it('should validate enquiry-quote relationships', async () => {
      // Test quote creation with non-existent enquiry
      const nonExistentEnquiryId = new mongoose.Types.ObjectId();
      
      const quoteWithInvalidEnquiry = {
        enquiryId: nonExistentEnquiryId,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
      };

      // This should succeed at model level but fail at business logic level
      const quote = await Quote.create(quoteWithInvalidEnquiry);
      expect(quote).toBeTruthy();

      // Verify enquiry doesn't exist
      const enquiry = await Enquiry.findById(nonExistentEnquiryId);
      expect(enquiry).toBeNull();
    });

    it('should handle quote status transitions correctly', async () => {
      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
      });

      expect(quote.status).toBe('draft');

      // Transition to sent
      quote.status = 'sent';
      quote.emailSent = true;
      quote.emailSentAt = new Date();
      await quote.save();

      expect(quote.status).toBe('sent');
      expect(quote.emailSent).toBe(true);

      // Transition to updated
      quote.status = 'updated';
      quote.totalPrice = 1200;
      await quote.save();

      expect(quote.status).toBe('updated');
      expect(quote.totalPrice).toBe(1200);
    });
  });

  describe('Admin Dashboard Integration', () => {
    beforeEach(async () => {
      // Create multiple enquiries and quotes for dashboard testing
      const enquiry1 = await Enquiry.create({
        leadName: 'Customer 1',
        tripType: 'stag',
        agentEmail: 'agent@test.com',
        firstChoiceDestination: 'Benidorm',
        travelDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        departureAirport: 'Manchester',
        numberOfNights: 7,
        numberOfGuests: 2,
        eventsRequested: ['nightclub'],
        accommodationType: 'hotel',
        boardType: 'half-board',
        budgetPerPerson: 400,
        submittedBy: testAgent._id,
        status: 'new',
      });

      const enquiry2 = await Enquiry.create({
        leadName: 'Customer 2',
        tripType: 'hen',
        agentEmail: 'agent@test.com',
        firstChoiceDestination: 'Albufeira',
        travelDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        departureAirport: 'London Gatwick',
        numberOfNights: 9,
        numberOfGuests: 6,
        eventsRequested: ['spa', 'restaurant'],
        accommodationType: 'hotel',
        boardType: 'all-inclusive',
        budgetPerPerson: 750,
        submittedBy: testAgent._id,
        status: 'new',
      });

      // Create quotes for these enquiries
      await Quote.create({
        enquiryId: enquiry1._id,
        leadName: 'Customer 1',
        hotelName: 'Hotel 1',
        numberOfPeople: 2,
        numberOfRooms: 1,
        numberOfNights: 7,
        arrivalDate: new Date('2024-07-01'),
        isSuperPackage: false,
        whatsIncluded: 'Basic package',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 800,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'sent',
        emailSent: true,
        emailDeliveryStatus: 'delivered',
      });

      await Quote.create({
        enquiryId: enquiry2._id,
        leadName: 'Customer 2',
        hotelName: 'Hotel 2',
        numberOfPeople: 6,
        numberOfRooms: 3,
        numberOfNights: 9,
        arrivalDate: new Date('2024-08-01'),
        isSuperPackage: true,
        whatsIncluded: 'Premium package',
        transferIncluded: true,
        activitiesIncluded: 'Multiple activities',
        totalPrice: 4500,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
        emailSent: false,
      });
    });

    it('should provide quote statistics and metrics', async () => {
      // Get quote statistics
      const totalQuotes = await Quote.countDocuments();
      const sentQuotes = await Quote.countDocuments({ status: 'sent' });
      const draftQuotes = await Quote.countDocuments({ status: 'draft' });
      const emailsSent = await Quote.countDocuments({ emailSent: true });

      expect(totalQuotes).toBe(2);
      expect(sentQuotes).toBe(1);
      expect(draftQuotes).toBe(1);
      expect(emailsSent).toBe(1);

      // Calculate conversion metrics
      const enquiriesWithQuotes = await Enquiry.countDocuments({ hasQuotes: true });
      const totalEnquiries = await Enquiry.countDocuments();
      const conversionRate = (enquiriesWithQuotes / totalEnquiries) * 100;

      expect(totalEnquiries).toBe(3); // testEnquiry + 2 new ones
      expect(enquiriesWithQuotes).toBe(2);
      expect(conversionRate).toBeCloseTo(66.67, 1);

      // Get average quote value
      const quoteValues = await Quote.aggregate([
        { $group: { _id: null, avgPrice: { $avg: '$totalPrice' } } }
      ]);

      expect(quoteValues[0].avgPrice).toBe(2650); // (800 + 4500) / 2
    });

    it('should support quote search and filtering', async () => {
      // Search by customer name
      const customerQuotes = await Quote.find({
        leadName: { $regex: 'Customer 1', $options: 'i' }
      });
      expect(customerQuotes).toHaveLength(1);
      expect(customerQuotes[0].leadName).toBe('Customer 1');

      // Filter by status
      const sentQuotes = await Quote.find({ status: 'sent' });
      expect(sentQuotes).toHaveLength(1);

      // Filter by price range
      const expensiveQuotes = await Quote.find({
        totalPrice: { $gte: 2000 }
      });
      expect(expensiveQuotes).toHaveLength(1);
      expect(expensiveQuotes[0].totalPrice).toBe(4500);

      // Filter by date range
      const recentQuotes = await Quote.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      expect(recentQuotes).toHaveLength(2);

      // Filter by email status
      const unsentQuotes = await Quote.find({ emailSent: false });
      expect(unsentQuotes).toHaveLength(1);
      expect(unsentQuotes[0].status).toBe('draft');
    });

    it('should handle quote export functionality', async () => {
      // Get all quotes with enquiry details for export
      const quotesForExport = await Quote.find({})
        .populate('enquiryId')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });

      expect(quotesForExport).toHaveLength(2);

      // Verify populated data
      const quote1 = quotesForExport.find(q => q.leadName === 'Customer 1');
      expect(quote1.enquiryId.leadName).toBe('Customer 1');
      expect(quote1.createdBy.name).toBe('Admin User');

      // Simulate CSV export data structure
      const exportData = quotesForExport.map(quote => ({
        quoteId: quote._id.toString(),
        customerName: quote.leadName,
        hotelName: quote.hotelName,
        destination: quote.enquiryId.firstChoiceDestination,
        numberOfPeople: quote.numberOfPeople,
        totalPrice: quote.totalPrice,
        currency: quote.currency,
        status: quote.status,
        emailSent: quote.emailSent,
        createdAt: quote.createdAt.toISOString(),
        createdBy: quote.createdBy.name,
      }));

      expect(exportData).toHaveLength(2);
      expect(exportData[0]).toHaveProperty('quoteId');
      expect(exportData[0]).toHaveProperty('customerName');
      expect(exportData[0]).toHaveProperty('totalPrice');
    });
  });

  describe('Email System Integration', () => {
    it('should handle email delivery status tracking', async () => {
      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
      });

      // Initial state
      expect(quote.emailSent).toBe(false);
      expect(quote.emailDeliveryStatus).toBe('pending');

      // Simulate email sending
      const emailResult = await sendQuoteEmail(quote._id.toString());
      expect(emailResult.success).toBe(true);

      // Update quote with email status
      await Quote.findByIdAndUpdate(quote._id, {
        emailSent: true,
        emailSentAt: new Date(),
        emailDeliveryStatus: 'delivered',
        emailMessageId: emailResult.messageId,
        status: 'sent',
      });

      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.emailSent).toBe(true);
      expect(updatedQuote.emailDeliveryStatus).toBe('delivered');
      expect(updatedQuote.emailMessageId).toBe('test-message-id');
    });

    it('should handle email delivery failures', async () => {
      // Mock email failure
      vi.mocked(sendQuoteEmail).mockResolvedValueOnce({
        success: false,
        error: 'Email delivery failed',
      });

      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
      });

      // Attempt to send email
      const emailResult = await sendQuoteEmail(quote._id.toString());
      expect(emailResult.success).toBe(false);
      expect(emailResult.error).toBe('Email delivery failed');

      // Update quote with failure status
      await Quote.findByIdAndUpdate(quote._id, {
        emailSent: false,
        emailDeliveryStatus: 'failed',
        status: 'draft', // Keep as draft since email failed
      });

      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.emailSent).toBe(false);
      expect(updatedQuote.emailDeliveryStatus).toBe('failed');
      expect(updatedQuote.status).toBe('draft');
    });

    it('should support email retry functionality', async () => {
      // Create quote with failed email
      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
        status: 'draft',
        emailSent: false,
        emailDeliveryStatus: 'failed',
      });

      // Reset mock to success for retry
      vi.mocked(sendQuoteEmail).mockResolvedValueOnce({
        success: true,
        messageId: 'retry-message-id',
      });

      // Retry email sending
      const retryResult = await sendQuoteEmail(quote._id.toString());
      expect(retryResult.success).toBe(true);

      // Update quote with successful retry
      await Quote.findByIdAndUpdate(quote._id, {
        emailSent: true,
        emailSentAt: new Date(),
        emailDeliveryStatus: 'delivered',
        emailMessageId: retryResult.messageId,
        status: 'sent',
      });

      const updatedQuote = await Quote.findById(quote._id);
      expect(updatedQuote.emailSent).toBe(true);
      expect(updatedQuote.emailDeliveryStatus).toBe('delivered');
      expect(updatedQuote.emailMessageId).toBe('retry-message-id');
      expect(updatedQuote.status).toBe('sent');
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain enquiry-quote relationship consistency', async () => {
      // Create quote
      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: new Date('2024-06-15'),
        isSuperPackage: false,
        whatsIncluded: 'Test inclusions',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        createdBy: adminUser._id,
      });

      // Update enquiry with quote reference
      await Enquiry.findByIdAndUpdate(testEnquiry._id, {
        $push: { quotes: quote._id },
        hasQuotes: true,
        quotesCount: 1,
        latestQuoteDate: quote.createdAt,
      });

      // Verify relationship
      const enquiryWithQuote = await Enquiry.findById(testEnquiry._id)
        .populate('quotes');

      expect(enquiryWithQuote.quotes).toHaveLength(1);
      expect(enquiryWithQuote.quotes[0]._id.toString()).toBe(quote._id.toString());
      expect(enquiryWithQuote.hasQuotes).toBe(true);
      expect(enquiryWithQuote.quotesCount).toBe(1);

      // Test quote deletion and cleanup
      await Quote.findByIdAndDelete(quote._id);

      // Update enquiry to remove quote reference
      await Enquiry.findByIdAndUpdate(testEnquiry._id, {
        $pull: { quotes: quote._id },
        $inc: { quotesCount: -1 },
      });

      // Update hasQuotes flag if no quotes remain
      const updatedEnquiry = await Enquiry.findById(testEnquiry._id);
      if (updatedEnquiry.quotesCount === 0) {
        updatedEnquiry.hasQuotes = false;
        updatedEnquiry.latestQuoteDate = undefined;
        await updatedEnquiry.save();
      }

      const finalEnquiry = await Enquiry.findById(testEnquiry._id);
      expect(finalEnquiry.quotes).toHaveLength(0);
      expect(finalEnquiry.hasQuotes).toBe(false);
      expect(finalEnquiry.quotesCount).toBe(0);
      expect(finalEnquiry.latestQuoteDate).toBeUndefined();
    });

    it('should handle concurrent quote operations', async () => {
      // Simulate concurrent quote creation for same enquiry
      const quotePromises = Array.from({ length: 3 }, (_, index) =>
        Quote.create({
          enquiryId: testEnquiry._id,
          leadName: 'John Doe',
          hotelName: `Hotel Option ${index + 1}`,
          numberOfPeople: 4,
          numberOfRooms: 2,
          numberOfNights: 7,
          arrivalDate: new Date('2024-06-15'),
          isSuperPackage: false,
          whatsIncluded: `Package ${index + 1}`,
          transferIncluded: false,
          activitiesIncluded: '',
          totalPrice: 1000 + (index * 500),
          currency: 'GBP',
          createdBy: adminUser._id,
        })
      );

      const createdQuotes = await Promise.all(quotePromises);
      expect(createdQuotes).toHaveLength(3);

      // Verify all quotes were created successfully
      const allQuotes = await Quote.find({ enquiryId: testEnquiry._id });
      expect(allQuotes).toHaveLength(3);

      // Verify unique hotel names
      const hotelNames = allQuotes.map(q => q.hotelName);
      expect(new Set(hotelNames).size).toBe(3);
    });
  });
});