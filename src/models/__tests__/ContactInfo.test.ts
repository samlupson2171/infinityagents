import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import ContactInfo from '../ContactInfo';

describe('ContactInfo Model', () => {
  const updaterId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await ContactInfo.deleteMany({});
  });

  describe('Validation', () => {
    it('should create valid contact info with all required fields', async () => {
      const contactData = {
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        email: 'info@infinityweekends.co.uk',
        website: 'https://infinityweekends.co.uk',
        socialMediaLinks: {
          facebook: 'https://facebook.com/infinityweekends',
          instagram: 'https://instagram.com/infinityweekends',
          twitter: 'https://twitter.com/infinityweekends',
          linkedin: 'https://linkedin.com/company/infinityweekends',
        },
        updatedBy: updaterId,
      };

      const contactInfo = new ContactInfo(contactData);
      const savedContactInfo = await contactInfo.save();

      expect(savedContactInfo._id).toBeDefined();
      expect(savedContactInfo.generalEnquiriesPhone).toBe(
        contactData.generalEnquiriesPhone
      );
      expect(savedContactInfo.emergencyPhone).toBe(contactData.emergencyPhone);
      expect(savedContactInfo.email).toBe(contactData.email);
      expect(savedContactInfo.website).toBe(contactData.website);
      expect(savedContactInfo.socialMediaLinks.facebook).toBe(
        contactData.socialMediaLinks.facebook
      );
      expect(savedContactInfo.socialMediaLinks.instagram).toBe(
        contactData.socialMediaLinks.instagram
      );
      expect(savedContactInfo.socialMediaLinks.twitter).toBe(
        contactData.socialMediaLinks.twitter
      );
      expect(savedContactInfo.socialMediaLinks.linkedin).toBe(
        contactData.socialMediaLinks.linkedin
      );
      expect(savedContactInfo.updatedBy).toEqual(updaterId);
    });

    it('should validate UK phone number formats', async () => {
      const baseContact = {
        email: 'info@infinityweekends.co.uk',
        website: 'https://infinityweekends.co.uk',
        updatedBy: updaterId,
      };

      const validPhoneNumbers = [
        '+44 20 1234 5678',
        '020 1234 5678',
        '+44 1234 567890',
        '01234 567890',
        '+441234567890',
        '01234567890',
      ];

      const invalidPhoneNumbers = [
        '123',
        '+1 555 123 4567', // US format
        'not-a-phone',
        '+44 20 123', // Too short
        '+44 20 1234 5678 9012', // Too long
      ];

      for (const phone of validPhoneNumbers) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          generalEnquiriesPhone: phone,
          emergencyPhone: phone,
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      for (const phone of invalidPhoneNumbers) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          generalEnquiriesPhone: phone,
          emergencyPhone: '+44 20 1234 5678',
        });
        await expect(contactInfo.save()).rejects.toThrow();
      }
    });

    it('should validate email format', async () => {
      const baseContact = {
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        website: 'https://infinityweekends.co.uk',
        updatedBy: updaterId,
      };

      const validEmails = [
        'info@infinityweekends.co.uk',
        'contact@example.com',
        'test.email+tag@domain.org',
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
      ];

      for (const email of validEmails) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          email: email,
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      for (const email of invalidEmails) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          email: email,
        });
        await expect(contactInfo.save()).rejects.toThrow();
      }
    });

    it('should validate website URL format', async () => {
      const baseContact = {
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        email: 'info@infinityweekends.co.uk',
        updatedBy: updaterId,
      };

      const validUrls = [
        'https://infinityweekends.co.uk',
        'http://example.com',
        'https://subdomain.example.org',
      ];

      const invalidUrls = ['not-a-url', 'ftp://example.com', 'example.com'];

      for (const url of validUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          website: url,
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      for (const url of invalidUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          website: url,
        });
        await expect(contactInfo.save()).rejects.toThrow();
      }
    });

    it('should validate social media URLs', async () => {
      const baseContact = {
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        email: 'info@infinityweekends.co.uk',
        website: 'https://infinityweekends.co.uk',
        updatedBy: updaterId,
      };

      // Valid Facebook URLs
      const validFacebookUrls = [
        'https://facebook.com/infinityweekends',
        'https://www.facebook.com/infinityweekends',
        'http://facebook.com/infinityweekends',
      ];

      for (const url of validFacebookUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          socialMediaLinks: { facebook: url },
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      // Invalid Facebook URL
      const invalidFacebookContactInfo = new ContactInfo({
        ...baseContact,
        socialMediaLinks: { facebook: 'https://twitter.com/infinityweekends' },
      });
      await expect(invalidFacebookContactInfo.save()).rejects.toThrow();

      // Valid Instagram URLs
      const validInstagramUrls = [
        'https://instagram.com/infinityweekends',
        'https://www.instagram.com/infinityweekends',
        'http://instagram.com/infinityweekends',
      ];

      for (const url of validInstagramUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          socialMediaLinks: { instagram: url },
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      // Valid Twitter/X URLs
      const validTwitterUrls = [
        'https://twitter.com/infinityweekends',
        'https://www.twitter.com/infinityweekends',
        'https://x.com/infinityweekends',
        'https://www.x.com/infinityweekends',
      ];

      for (const url of validTwitterUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          socialMediaLinks: { twitter: url },
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }

      // Valid LinkedIn URLs
      const validLinkedInUrls = [
        'https://linkedin.com/in/infinityweekends',
        'https://www.linkedin.com/company/infinityweekends',
        'http://linkedin.com/in/infinityweekends',
      ];

      for (const url of validLinkedInUrls) {
        const contactInfo = new ContactInfo({
          ...baseContact,
          socialMediaLinks: { linkedin: url },
        });
        await expect(contactInfo.save()).resolves.toBeTruthy();
        await contactInfo.deleteOne();
      }
    });

    it('should allow empty social media links', async () => {
      const contactInfo = new ContactInfo({
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        email: 'info@infinityweekends.co.uk',
        website: 'https://infinityweekends.co.uk',
        socialMediaLinks: {},
        updatedBy: updaterId,
      });

      await expect(contactInfo.save()).resolves.toBeTruthy();
    });

    it('should require all mandatory fields', async () => {
      const requiredFields = [
        'generalEnquiriesPhone',
        'emergencyPhone',
        'email',
        'website',
        'updatedBy',
      ];

      for (const field of requiredFields) {
        const contactData = {
          generalEnquiriesPhone: '+44 20 1234 5678',
          emergencyPhone: '+44 20 1234 5679',
          email: 'info@infinityweekends.co.uk',
          website: 'https://infinityweekends.co.uk',
          updatedBy: updaterId,
        };

        delete (contactData as any)[field];
        const contactInfo = new ContactInfo(contactData);

        await expect(contactInfo.save()).rejects.toThrow();
      }
    });
  });

  describe('Instance Methods', () => {
    it('should update social media links correctly', async () => {
      const contactInfo = new ContactInfo({
        generalEnquiriesPhone: '+44 20 1234 5678',
        emergencyPhone: '+44 20 1234 5679',
        email: 'info@infinityweekends.co.uk',
        website: 'https://infinityweekends.co.uk',
        socialMediaLinks: {
          facebook: 'https://facebook.com/infinityweekends',
        },
        updatedBy: updaterId,
      });

      await contactInfo.save();

      await contactInfo.updateSocialMedia({
        instagram: 'https://instagram.com/infinityweekends',
        twitter: 'https://twitter.com/infinityweekends',
      });

      expect(contactInfo.socialMediaLinks.facebook).toBe(
        'https://facebook.com/infinityweekends'
      );
      expect(contactInfo.socialMediaLinks.instagram).toBe(
        'https://instagram.com/infinityweekends'
      );
      expect(contactInfo.socialMediaLinks.twitter).toBe(
        'https://twitter.com/infinityweekends'
      );
    });
  });

  describe('Static Methods', () => {
    it('should get contact info and create default if none exists', async () => {
      // Initially no contact info should exist
      const initialCount = await ContactInfo.countDocuments();
      expect(initialCount).toBe(0);

      // Get contact info should create default
      const contactInfo = await ContactInfo.getContactInfo();

      expect(contactInfo).toBeDefined();
      expect(contactInfo.generalEnquiriesPhone).toBe('+44 20 1234 5678');
      expect(contactInfo.emergencyPhone).toBe('+44 20 1234 5679');
      expect(contactInfo.email).toBe('info@infinityweekends.co.uk');
      expect(contactInfo.website).toBe('https://infinityweekends.co.uk');

      // Should now have one document
      const finalCount = await ContactInfo.countDocuments();
      expect(finalCount).toBe(1);

      // Calling again should return the same document
      const contactInfo2 = await ContactInfo.getContactInfo();
      expect(contactInfo2._id).toEqual(contactInfo._id);
    });

    it('should update contact info correctly', async () => {
      // Create initial contact info
      const initialContactInfo = new ContactInfo({
        generalEnquiriesPhone: '+44 20 1111 1111',
        emergencyPhone: '+44 20 2222 2222',
        email: 'old@example.com',
        website: 'https://old-website.com',
        updatedBy: updaterId,
      });
      await initialContactInfo.save();

      const newUpdaterId = new mongoose.Types.ObjectId();

      // Update contact info
      const updatedContactInfo = await ContactInfo.updateContactInfo(
        {
          generalEnquiriesPhone: '+44 20 3333 3333',
          email: 'new@example.com',
        },
        newUpdaterId
      );

      expect(updatedContactInfo).toBeDefined();
      expect(updatedContactInfo!.generalEnquiriesPhone).toBe(
        '+44 20 3333 3333'
      );
      expect(updatedContactInfo!.email).toBe('new@example.com');
      expect(updatedContactInfo!.emergencyPhone).toBe('+44 20 2222 2222'); // Should remain unchanged
      expect(updatedContactInfo!.website).toBe('https://old-website.com'); // Should remain unchanged
      expect(updatedContactInfo!.updatedBy).toEqual(newUpdaterId);
    });

    it('should create contact info if none exists when updating', async () => {
      const newUpdaterId = new mongoose.Types.ObjectId();

      // Update contact info when none exists
      const contactInfo = await ContactInfo.updateContactInfo(
        {
          generalEnquiriesPhone: '+44 20 5555 5555',
          emergencyPhone: '+44 20 6666 6666',
          email: 'new@example.com',
          website: 'https://new-website.com',
        },
        newUpdaterId
      );

      expect(contactInfo).toBeDefined();
      expect(contactInfo!.generalEnquiriesPhone).toBe('+44 20 5555 5555');
      expect(contactInfo!.emergencyPhone).toBe('+44 20 6666 6666');
      expect(contactInfo!.email).toBe('new@example.com');
      expect(contactInfo!.website).toBe('https://new-website.com');
      expect(contactInfo!.updatedBy).toEqual(newUpdaterId);

      // Should have exactly one document
      const count = await ContactInfo.countDocuments();
      expect(count).toBe(1);
    });
  });
});
