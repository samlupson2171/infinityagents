import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Enquiry from '../Enquiry';

describe('Enquiry Model', () => {
  const submitterId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await Enquiry.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a valid enquiry with all required fields', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const enquiryData = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@travelagency.com',
        resort: 'Ibiza Resort',
        travelDate: futureDate,
        departureAirport: 'London Heathrow',
        numberOfNights: 3,
        numberOfGuests: 12,
        eventsRequested: ['Club entry', 'Boat party'],
        accommodationType: 'hotel' as const,
        boardType: 'Half Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const enquiry = new Enquiry(enquiryData);
      const savedEnquiry = await enquiry.save();

      expect(savedEnquiry._id).toBeDefined();
      expect(savedEnquiry.leadName).toBe(enquiryData.leadName);
      expect(savedEnquiry.tripType).toBe(enquiryData.tripType);
      expect(savedEnquiry.agentEmail).toBe(enquiryData.agentEmail);
      expect(savedEnquiry.resort).toBe(enquiryData.resort);
      expect(savedEnquiry.travelDate).toEqual(enquiryData.travelDate);
      expect(savedEnquiry.departureAirport).toBe(enquiryData.departureAirport);
      expect(savedEnquiry.numberOfNights).toBe(enquiryData.numberOfNights);
      expect(savedEnquiry.numberOfGuests).toBe(enquiryData.numberOfGuests);
      expect(savedEnquiry.eventsRequested).toEqual(enquiryData.eventsRequested);
      expect(savedEnquiry.accommodationType).toBe(
        enquiryData.accommodationType
      );
      expect(savedEnquiry.boardType).toBe(enquiryData.boardType);
      expect(savedEnquiry.budgetPerPerson).toBe(enquiryData.budgetPerPerson);
      expect(savedEnquiry.status).toBe('new');
      expect(savedEnquiry.submittedBy).toEqual(submitterId);
    });

    it('should validate trip type enum values', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const validTripTypes = ['stag', 'hen', 'other'];
      for (const tripType of validTripTypes) {
        const enquiry = new Enquiry({
          ...baseEnquiry,
          tripType: tripType as any,
        });
        await expect(enquiry.save()).resolves.toBeTruthy();
        await enquiry.deleteOne();
      }

      const invalidEnquiry = new Enquiry({
        ...baseEnquiry,
        tripType: 'invalid' as any,
      });
      await expect(invalidEnquiry.save()).rejects.toThrow();
    });

    it('should validate accommodation type enum values', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const validAccommodationTypes = ['hotel', 'apartments'];
      for (const accommodationType of validAccommodationTypes) {
        const enquiry = new Enquiry({
          ...baseEnquiry,
          accommodationType: accommodationType as any,
        });
        await expect(enquiry.save()).resolves.toBeTruthy();
        await enquiry.deleteOne();
      }

      const invalidEnquiry = new Enquiry({
        ...baseEnquiry,
        accommodationType: 'invalid' as any,
      });
      await expect(invalidEnquiry.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const validStatuses = ['new', 'in-progress', 'completed'];
      for (const status of validStatuses) {
        const enquiry = new Enquiry({
          ...baseEnquiry,
          status: status as any,
        });
        await expect(enquiry.save()).resolves.toBeTruthy();
        await enquiry.deleteOne();
      }

      const invalidEnquiry = new Enquiry({
        ...baseEnquiry,
        status: 'invalid' as any,
      });
      await expect(invalidEnquiry.save()).rejects.toThrow();
    });

    it('should validate travel date is in the future', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      // Past date should fail
      const pastDateEnquiry = new Enquiry({
        ...baseEnquiry,
        travelDate: pastDate,
      });
      await expect(pastDateEnquiry.save()).rejects.toThrow();

      // Future date should succeed
      const futureDateEnquiry = new Enquiry({
        ...baseEnquiry,
        travelDate: futureDate,
      });
      await expect(futureDateEnquiry.save()).resolves.toBeTruthy();
    });

    it('should validate numeric constraints', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        submittedBy: submitterId,
      };

      // Test numberOfNights constraints
      const invalidNightsEnquiry = new Enquiry({
        ...baseEnquiry,
        numberOfNights: 0,
        numberOfGuests: 10,
        budgetPerPerson: 500,
      });
      await expect(invalidNightsEnquiry.save()).rejects.toThrow();

      // Test numberOfGuests constraints
      const invalidGuestsEnquiry = new Enquiry({
        ...baseEnquiry,
        numberOfNights: 3,
        numberOfGuests: 0,
        budgetPerPerson: 500,
      });
      await expect(invalidGuestsEnquiry.save()).rejects.toThrow();

      // Test budgetPerPerson constraints
      const invalidBudgetEnquiry = new Enquiry({
        ...baseEnquiry,
        numberOfNights: 3,
        numberOfGuests: 10,
        budgetPerPerson: 25,
      });
      await expect(invalidBudgetEnquiry.save()).rejects.toThrow();

      // Valid values should work
      const validEnquiry = new Enquiry({
        ...baseEnquiry,
        numberOfNights: 3,
        numberOfGuests: 10,
        budgetPerPerson: 500,
      });
      await expect(validEnquiry.save()).resolves.toBeTruthy();
    });

    it('should validate email format', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const invalidEmails = ['invalid-email', '@example.com', 'test@'];
      for (const email of invalidEmails) {
        const enquiry = new Enquiry({
          ...baseEnquiry,
          agentEmail: email,
        });
        await expect(enquiry.save()).rejects.toThrow();
      }

      const validEnquiry = new Enquiry({
        ...baseEnquiry,
        agentEmail: 'valid@example.com',
      });
      await expect(validEnquiry.save()).resolves.toBeTruthy();
    });

    it('should validate events requested array', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      // Too short event
      const shortEventEnquiry = new Enquiry({
        ...baseEnquiry,
        eventsRequested: ['A'],
      });
      await expect(shortEventEnquiry.save()).rejects.toThrow();

      // Too long event
      const longEventEnquiry = new Enquiry({
        ...baseEnquiry,
        eventsRequested: ['A'.repeat(101)],
      });
      await expect(longEventEnquiry.save()).rejects.toThrow();

      // Valid events
      const validEnquiry = new Enquiry({
        ...baseEnquiry,
        eventsRequested: ['Club entry', 'Boat party', 'Restaurant booking'],
      });
      await expect(validEnquiry.save()).resolves.toBeTruthy();
    });
  });

  describe('Instance Methods', () => {
    it('should update status correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const enquiry = new Enquiry({
        leadName: 'John Smith',
        tripType: 'stag',
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel',
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      });

      await enquiry.save();
      expect(enquiry.status).toBe('new');

      await enquiry.updateStatus('in-progress');
      expect(enquiry.status).toBe('in-progress');

      await enquiry.updateStatus('completed');
      expect(enquiry.status).toBe('completed');
    });
  });

  describe('Static Methods', () => {
    it('should find enquiries by status correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const newEnquiry = new Enquiry({ ...baseEnquiry, status: 'new' });
      const inProgressEnquiry = new Enquiry({
        ...baseEnquiry,
        status: 'in-progress',
      });

      await newEnquiry.save();
      await inProgressEnquiry.save();

      const newEnquiries = await Enquiry.findByStatus('new');
      expect(newEnquiries).toHaveLength(1);
      expect(newEnquiries[0].status).toBe('new');

      const inProgressEnquiries = await Enquiry.findByStatus('in-progress');
      expect(inProgressEnquiries).toHaveLength(1);
      expect(inProgressEnquiries[0].status).toBe('in-progress');
    });

    it('should find enquiries by agent correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const agent1Id = new mongoose.Types.ObjectId();
      const agent2Id = new mongoose.Types.ObjectId();

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
      };

      const enquiry1 = new Enquiry({ ...baseEnquiry, submittedBy: agent1Id });
      const enquiry2 = new Enquiry({ ...baseEnquiry, submittedBy: agent2Id });

      await enquiry1.save();
      await enquiry2.save();

      const agent1Enquiries = await Enquiry.findByAgent(agent1Id);
      expect(agent1Enquiries).toHaveLength(1);
      expect(agent1Enquiries[0].submittedBy).toEqual(agent1Id);
    });

    it('should find recent enquiries correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const baseEnquiry = {
        leadName: 'John Smith',
        tripType: 'stag' as const,
        agentEmail: 'agent@example.com',
        resort: 'Test Resort',
        travelDate: futureDate,
        departureAirport: 'Test Airport',
        numberOfNights: 3,
        numberOfGuests: 10,
        accommodationType: 'hotel' as const,
        boardType: 'Full Board',
        budgetPerPerson: 500,
        submittedBy: submitterId,
      };

      const recentEnquiry = new Enquiry(baseEnquiry);
      await recentEnquiry.save();

      const oldEnquiry = new Enquiry({
        ...baseEnquiry,
        leadName: 'Old Lead',
        agentEmail: 'old@example.com',
      });

      // Create the old enquiry with the old date directly
      const oldEnquiryDoc = await Enquiry.create({
        ...baseEnquiry,
        leadName: 'Old Lead',
        agentEmail: 'old@example.com',
        createdAt: oldDate,
      });

      const recentEnquiries = await Enquiry.findRecentEnquiries(30);
      expect(recentEnquiries).toHaveLength(1);
      expect(recentEnquiries[0].leadName).toBe('John Smith');
    });
  });
});
