import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../../models/User';
import Enquiry from '../../models/Enquiry';
import Quote from '../../models/Quote';

// Mock the email service for testing
vi.mock('../../lib/email', () => ({
  sendQuoteEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id',
  }),
}));

describe('Quote System - Core Workflow Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let testAgent: any;
  let testEnquiry: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

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
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    testEnquiry = await Enquiry.create({
      leadName: 'John Doe',
      tripType: 'other',
      agentEmail: 'agent@test.com',
      firstChoiceDestination: 'Benidorm',
      travelDate: futureDate,
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

  describe('Quote Creation and Management', () => {
    it('should create a quote successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const quoteData = {
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Benidorm Palace',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: futureDate,
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
    });

    it('should link quote to enquiry', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: futureDate,
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

      const updatedEnquiry = await Enquiry.findById(testEnquiry._id);
      expect(updatedEnquiry.hasQuotes).toBe(true);
      expect(updatedEnquiry.quotes).toHaveLength(1);
      expect(updatedEnquiry.quotesCount).toBe(1);
    });

    it('should validate quote data', async () => {
      // Test required fields validation
      const invalidQuote = {
        enquiryId: testEnquiry._id,
        // Missing required fields
        createdBy: adminUser._id,
      };

      await expect(Quote.create(invalidQuote)).rejects.toThrow();
    });

    it('should handle quote status transitions', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: futureDate,
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
    });
  });

  describe('Quote Search and Filtering', () => {
    beforeEach(async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 30);
      
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 60);

      // Create multiple quotes for testing
      await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'Customer 1',
        hotelName: 'Hotel 1',
        numberOfPeople: 2,
        numberOfRooms: 1,
        numberOfNights: 7,
        arrivalDate: futureDate1,
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
        enquiryId: testEnquiry._id,
        leadName: 'Customer 2',
        hotelName: 'Hotel 2',
        numberOfPeople: 6,
        numberOfRooms: 3,
        numberOfNights: 9,
        arrivalDate: futureDate2,
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

    it('should search quotes by customer name', async () => {
      const customerQuotes = await Quote.find({
        leadName: { $regex: 'Customer 1', $options: 'i' }
      });
      expect(customerQuotes).toHaveLength(1);
      expect(customerQuotes[0].leadName).toBe('Customer 1');
    });

    it('should filter quotes by status', async () => {
      const sentQuotes = await Quote.find({ status: 'sent' });
      expect(sentQuotes).toHaveLength(1);

      const draftQuotes = await Quote.find({ status: 'draft' });
      expect(draftQuotes).toHaveLength(1);
    });

    it('should filter quotes by price range', async () => {
      const expensiveQuotes = await Quote.find({
        totalPrice: { $gte: 2000 }
      });
      expect(expensiveQuotes).toHaveLength(1);
      expect(expensiveQuotes[0].totalPrice).toBe(4500);
    });

    it('should provide quote statistics', async () => {
      const totalQuotes = await Quote.countDocuments();
      const sentQuotes = await Quote.countDocuments({ status: 'sent' });
      const draftQuotes = await Quote.countDocuments({ status: 'draft' });

      expect(totalQuotes).toBe(2);
      expect(sentQuotes).toBe(1);
      expect(draftQuotes).toBe(1);

      // Calculate average quote value
      const quoteValues = await Quote.aggregate([
        { $group: { _id: null, avgPrice: { $avg: '$totalPrice' } } }
      ]);

      expect(quoteValues[0].avgPrice).toBe(2650); // (800 + 4500) / 2
    });
  });

  describe('Data Consistency', () => {
    it('should maintain enquiry-quote relationship consistency', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create quote
      const quote = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: futureDate,
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

    it('should handle multiple quotes for single enquiry', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create multiple quotes for the same enquiry
      const quote1 = await Quote.create({
        enquiryId: testEnquiry._id,
        leadName: 'John Doe',
        hotelName: 'Hotel Option 1',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 7,
        arrivalDate: futureDate,
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
        arrivalDate: futureDate,
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
});