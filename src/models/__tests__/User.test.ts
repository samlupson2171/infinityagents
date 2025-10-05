import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../User';

// Helper function to create valid user data
const createValidUserData = (overrides = {}) => ({
  name: 'John Doe',
  companyName: 'Travel Agency Ltd',
  abtaPtsNumber: 'ABTA12345',
  contactEmail: 'john@travelagency.com',
  websiteAddress: 'https://travelagency.com',
  password: 'password123',
  company: 'Travel Agency Ltd',
  consortia: 'Travel Consortium',
  ...overrides,
});

describe('User Model', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a valid user with all required fields', async () => {
      const userData = createValidUserData();

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.companyName).toBe(userData.companyName);
      expect(savedUser.abtaPtsNumber).toBe(userData.abtaPtsNumber);
      expect(savedUser.contactEmail).toBe(userData.contactEmail);
      expect(savedUser.websiteAddress).toBe(userData.websiteAddress);
      expect(savedUser.company).toBe(userData.company);
      expect(savedUser.consortia).toBe(userData.consortia);
      expect(savedUser.registrationStatus).toBe('pending');
      expect(savedUser.isApproved).toBe(false);
      expect(savedUser.role).toBe('agent');
      // Password should be hashed
      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('should require password field', async () => {
      const userData = createValidUserData();
      delete userData.password;

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/Password is required/);
    });

    it('should enforce minimum password length', async () => {
      const userData = createValidUserData({ password: '123' });

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(
        /Password must be at least 8 characters long/
      );
    });

    it('should validate ABTA number format correctly', async () => {
      // Test valid ABTA number
      const validUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA12345',
        contactEmail: 'valid@example.com',
      }));

      await expect(validUser.save()).resolves.toBeTruthy();
      await validUser.deleteOne();

      // Test invalid ABTA number
      const invalidUser = new User(createValidUserData({
        abtaPtsNumber: 'INVALID123',
        contactEmail: 'invalid@example.com',
      }));

      await expect(invalidUser.save()).rejects.toThrow();
    }, 10000);

    it('should validate PTS number format correctly', async () => {
      const validUser = new User(createValidUserData({
        abtaPtsNumber: 'PTS12345',
        contactEmail: 'pts@example.com',
      }));

      await expect(validUser.save()).resolves.toBeTruthy();
      await validUser.deleteOne();
    });

    it('should validate email format', async () => {
      // Test valid email
      const validUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA99999',
        contactEmail: 'valid@example.com',
      }));

      await expect(validUser.save()).resolves.toBeTruthy();
      await validUser.deleteOne();

      // Test invalid email
      const invalidUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA88888',
        contactEmail: 'invalid-email',
      }));

      await expect(invalidUser.save()).rejects.toThrow();
    });

    it('should validate website URL format', async () => {
      // Test valid URL
      const validUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA77777',
        contactEmail: 'url@example.com',
      }));

      await expect(validUser.save()).resolves.toBeTruthy();
      await validUser.deleteOne();

      // Test invalid URL
      const invalidUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA66666',
        contactEmail: 'url2@example.com',
        websiteAddress: 'not-a-url',
      }));

      await expect(invalidUser.save()).rejects.toThrow();
    });

    it('should enforce unique constraints on email and ABTA/PTS number', async () => {
      const userData = createValidUserData();

      const user1 = new User(userData);
      await user1.save();

      // Try to create another user with same email
      const user2 = new User(createValidUserData({ abtaPtsNumber: 'ABTA54321' }));
      await expect(user2.save()).rejects.toThrow();

      // Try to create another user with same ABTA number
      const user3 = new User(createValidUserData({
        contactEmail: 'different@email.com',
      }));
      await expect(user3.save()).rejects.toThrow();
    });

    it('should require all mandatory fields', async () => {
      const requiredFields = [
        'name',
        'companyName',
        'abtaPtsNumber',
        'contactEmail',
        'websiteAddress',
        'password',
        'company',
      ];

      for (const field of requiredFields) {
        const userData = createValidUserData();
        delete (userData as any)[field];
        const user = new User(userData);

        await expect(user.save()).rejects.toThrow();
      }
    });
  });

  describe('Password Methods', () => {
    it('should compare password correctly', async () => {
      const user = new User(createValidUserData());
      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = new User(createValidUserData());
      await user.save();

      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('should hash password on save', async () => {
      const user = new User(createValidUserData());
      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('should not rehash password if not modified', async () => {
      const user = new User(createValidUserData());
      await user.save();
      const originalHash = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const user = new User(createValidUserData());
      await user.save();
      const originalHash = user.password;

      user.password = 'newpassword123';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('newpassword123');

      const isMatch = await user.comparePassword('newpassword123');
      expect(isMatch).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    it('should approve a user correctly', async () => {
      const user = new User(createValidUserData());
      await user.save();
      const adminId = new mongoose.Types.ObjectId();

      await user.approve(adminId);

      expect(user.isApproved).toBe(true);
      expect(user.registrationStatus).toBe('approved');
      expect(user.approvedBy).toEqual(adminId);
      expect(user.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject a user correctly', async () => {
      const user = new User(createValidUserData({
        isApproved: true,
        registrationStatus: 'approved',
        approvedBy: new mongoose.Types.ObjectId(),
        approvedAt: new Date(),
      }));

      await user.save();
      await user.reject('Not qualified');

      expect(user.isApproved).toBe(false);
      expect(user.registrationStatus).toBe('rejected');
      expect(user.rejectionReason).toBe('Not qualified');
      expect(user.approvedBy).toBeUndefined();
      expect(user.approvedAt).toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    it('should find pending users correctly', async () => {
      const approvedUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA11111',
        contactEmail: 'approved@example.com',
        isApproved: true,
        registrationStatus: 'approved',
      }));

      const pendingUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA22222',
        contactEmail: 'pending@example.com',
        isApproved: false,
        registrationStatus: 'pending',
      }));

      await approvedUser.save();
      await pendingUser.save();

      const pendingUsers = await User.findPendingUsers();

      expect(pendingUsers).toHaveLength(1);
      expect(pendingUsers[0].contactEmail).toBe('pending@example.com');
    });

    it('should find approved users correctly', async () => {
      const approvedUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA11111',
        contactEmail: 'approved@example.com',
        isApproved: true,
        registrationStatus: 'approved',
      }));

      const pendingUser = new User(createValidUserData({
        abtaPtsNumber: 'ABTA22222',
        contactEmail: 'pending@example.com',
        isApproved: false,
        registrationStatus: 'pending',
      }));

      await approvedUser.save();
      await pendingUser.save();

      const approvedUsers = await User.findApprovedUsers();

      expect(approvedUsers).toHaveLength(1);
      expect(approvedUsers[0].contactEmail).toBe('approved@example.com');
    });
  });
});
