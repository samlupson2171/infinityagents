import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Offer from '../Offer';

describe('Offer Model', () => {
  const creatorId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await Offer.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a valid offer with all required fields', async () => {
      const offerData = {
        title: 'Amazing Weekend Package',
        description:
          'A fantastic weekend getaway with all amenities included for your group.',
        inclusions: ['Accommodation', 'Breakfast', 'Airport transfers'],
        createdBy: creatorId,
      };

      const offer = new Offer(offerData);
      const savedOffer = await offer.save();

      expect(savedOffer._id).toBeDefined();
      expect(savedOffer.title).toBe(offerData.title);
      expect(savedOffer.description).toBe(offerData.description);
      expect(savedOffer.inclusions).toEqual(offerData.inclusions);
      expect(savedOffer.isActive).toBe(true);
      expect(savedOffer.createdBy).toEqual(creatorId);
    });

    it('should validate title length constraints', async () => {
      const baseOffer = {
        description: 'Valid description for the offer',
        inclusions: ['Accommodation'],
        createdBy: creatorId,
      };

      // Too short title
      const shortTitleOffer = new Offer({
        ...baseOffer,
        title: 'Hi',
      });
      await expect(shortTitleOffer.save()).rejects.toThrow();

      // Too long title
      const longTitleOffer = new Offer({
        ...baseOffer,
        title: 'A'.repeat(201),
      });
      await expect(longTitleOffer.save()).rejects.toThrow();

      // Valid title
      const validOffer = new Offer({
        ...baseOffer,
        title: 'Valid Offer Title',
      });
      await expect(validOffer.save()).resolves.toBeTruthy();
    });

    it('should validate description length constraints', async () => {
      const baseOffer = {
        title: 'Valid Offer Title',
        inclusions: ['Accommodation'],
        createdBy: creatorId,
      };

      // Too short description
      const shortDescOffer = new Offer({
        ...baseOffer,
        description: 'Short',
      });
      await expect(shortDescOffer.save()).rejects.toThrow();

      // Too long description
      const longDescOffer = new Offer({
        ...baseOffer,
        description: 'A'.repeat(2001),
      });
      await expect(longDescOffer.save()).rejects.toThrow();

      // Valid description
      const validOffer = new Offer({
        ...baseOffer,
        description: 'This is a valid description for the offer',
      });
      await expect(validOffer.save()).resolves.toBeTruthy();
    });

    it('should validate inclusions array', async () => {
      const baseOffer = {
        title: 'Valid Offer Title',
        description: 'Valid description for the offer',
        createdBy: creatorId,
      };

      // Empty inclusions array
      const emptyInclusionsOffer = new Offer({
        ...baseOffer,
        inclusions: [],
      });
      await expect(emptyInclusionsOffer.save()).rejects.toThrow();

      // Inclusions with too short items
      const shortInclusionOffer = new Offer({
        ...baseOffer,
        inclusions: ['AB'],
      });
      await expect(shortInclusionOffer.save()).rejects.toThrow();

      // Inclusions with too long items
      const longInclusionOffer = new Offer({
        ...baseOffer,
        inclusions: ['A'.repeat(201)],
      });
      await expect(longInclusionOffer.save()).rejects.toThrow();

      // Valid inclusions
      const validOffer = new Offer({
        ...baseOffer,
        inclusions: ['Accommodation', 'Meals', 'Transportation'],
      });
      await expect(validOffer.save()).resolves.toBeTruthy();
    });

    it('should require all mandatory fields', async () => {
      const requiredFields = [
        'title',
        'description',
        'inclusions',
        'createdBy',
      ];

      for (const field of requiredFields) {
        const offerData = {
          title: 'Valid Title',
          description: 'Valid description for the offer',
          inclusions: ['Accommodation'],
          createdBy: creatorId,
        };

        delete (offerData as any)[field];
        const offer = new Offer(offerData);

        await expect(offer.save()).rejects.toThrow();
      }
    });
  });

  describe('Instance Methods', () => {
    it('should activate an offer correctly', async () => {
      const offer = new Offer({
        title: 'Test Offer',
        description: 'Test description for the offer',
        inclusions: ['Accommodation'],
        isActive: false,
        createdBy: creatorId,
      });

      await offer.save();
      await offer.activate();

      expect(offer.isActive).toBe(true);
    });

    it('should deactivate an offer correctly', async () => {
      const offer = new Offer({
        title: 'Test Offer',
        description: 'Test description for the offer',
        inclusions: ['Accommodation'],
        isActive: true,
        createdBy: creatorId,
      });

      await offer.save();
      await offer.deactivate();

      expect(offer.isActive).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should find active offers correctly', async () => {
      const activeOffer = new Offer({
        title: 'Active Offer',
        description: 'Active offer description',
        inclusions: ['Accommodation'],
        isActive: true,
        createdBy: creatorId,
      });

      const inactiveOffer = new Offer({
        title: 'Inactive Offer',
        description: 'Inactive offer description',
        inclusions: ['Accommodation'],
        isActive: false,
        createdBy: creatorId,
      });

      await activeOffer.save();
      await inactiveOffer.save();

      const activeOffers = await Offer.findActiveOffers();

      expect(activeOffers).toHaveLength(1);
      expect(activeOffers[0].title).toBe('Active Offer');
    });

    it('should find offers by creator correctly', async () => {
      const creator1Id = new mongoose.Types.ObjectId();
      const creator2Id = new mongoose.Types.ObjectId();

      const offer1 = new Offer({
        title: 'Offer by Creator 1',
        description: 'Offer description',
        inclusions: ['Accommodation'],
        createdBy: creator1Id,
      });

      const offer2 = new Offer({
        title: 'Offer by Creator 2',
        description: 'Offer description',
        inclusions: ['Accommodation'],
        createdBy: creator2Id,
      });

      await offer1.save();
      await offer2.save();

      const creator1Offers = await Offer.findOffersByCreator(creator1Id);

      expect(creator1Offers).toHaveLength(1);
      expect(creator1Offers[0].title).toBe('Offer by Creator 1');
    });
  });
});
