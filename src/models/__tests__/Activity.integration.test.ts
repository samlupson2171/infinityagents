import { describe, it, expect, beforeEach } from 'vitest';
import Activity, { ActivityCategory, IActivity } from '../Activity';
import ActivityPackage from '../ActivityPackage';
import User from '../User';

describe('Activity Model - Integration Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create a test user for activities
    testUser = await User.create({
      name: 'Test Admin',
      companyName: 'Test Company',
      abtaPtsNumber: 'ABTA99999',
      contactEmail: 'admin-activity@test.com',
      websiteAddress: 'https://test-activity.com',
      password: 'password123',
      role: 'admin',
      isApproved: true,
    });
  });

  describe('Activity Creation and Validation', () => {
    it('should create a valid activity', async () => {
      const activityData = {
        name: 'Beach Excursion Test',
        category: ActivityCategory.EXCURSION,
        location: 'Benidorm',
        pricePerPerson: 25.5,
        minPersons: 2,
        maxPersons: 20,
        availableFrom: new Date('2025-06-01'),
        availableTo: new Date('2025-09-30'),
        duration: '4 hours',
        description:
          'A wonderful beach excursion with guided tour and refreshments.',
        createdBy: testUser._id,
      };

      const activity = await Activity.create(activityData);

      expect(activity.name).toBe(activityData.name);
      expect(activity.category).toBe(activityData.category);
      expect(activity.location).toBe(activityData.location);
      expect(activity.pricePerPerson).toBe(activityData.pricePerPerson);
      expect(activity.minPersons).toBe(activityData.minPersons);
      expect(activity.maxPersons).toBe(activityData.maxPersons);
      expect(activity.isActive).toBe(true);
      expect(activity.createdBy.toString()).toBe(testUser._id.toString());
    });

    it('should enforce required fields', async () => {
      const incompleteActivity = {
        name: 'Test Activity',
        // Missing required fields
      };

      await expect(Activity.create(incompleteActivity)).rejects.toThrow();
    });

    it('should validate category enum', async () => {
      const activityData = {
        name: 'Test Activity Enum',
        category: 'invalid-category',
        location: 'Test Location',
        pricePerPerson: 25,
        minPersons: 1,
        maxPersons: 10,
        availableFrom: new Date('2025-01-01'),
        availableTo: new Date('2025-12-31'),
        duration: '2 hours',
        description: 'Test description',
        createdBy: testUser._id,
      };

      await expect(Activity.create(activityData)).rejects.toThrow();
    });

    it('should validate price is positive', async () => {
      const activityData = {
        name: 'Test Activity Price',
        category: ActivityCategory.EXCURSION,
        location: 'Test Location',
        pricePerPerson: -10,
        minPersons: 1,
        maxPersons: 10,
        availableFrom: new Date('2025-01-01'),
        availableTo: new Date('2025-12-31'),
        duration: '2 hours',
        description: 'Test description',
        createdBy: testUser._id,
      };

      await expect(Activity.create(activityData)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let activity: IActivity;

    beforeEach(async () => {
      activity = await Activity.create({
        name: 'Test Activity Instance',
        category: ActivityCategory.EXCURSION,
        location: 'Test Location',
        pricePerPerson: 25,
        minPersons: 1,
        maxPersons: 10,
        availableFrom: new Date('2025-01-01'),
        availableTo: new Date('2025-12-31'),
        duration: '2 hours',
        description: 'Test description',
        createdBy: testUser._id,
      });
    });

    it('should check if activity is available', () => {
      expect(activity.isAvailable()).toBe(true);
    });

    it('should check if activity is valid for date range', () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-15');

      expect(activity.isValidForDates(startDate, endDate)).toBe(true);

      const invalidStartDate = new Date('2024-06-01');
      expect(activity.isValidForDates(invalidStartDate, endDate)).toBe(false);
    });

    it('should activate and deactivate activity', async () => {
      await activity.deactivate();
      expect(activity.isActive).toBe(false);

      await activity.activate();
      expect(activity.isActive).toBe(true);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test activities
      await Activity.create([
        {
          name: 'Beach Tour Static',
          category: ActivityCategory.EXCURSION,
          location: 'Benidorm',
          pricePerPerson: 25,
          minPersons: 1,
          maxPersons: 10,
          availableFrom: new Date('2025-01-01'),
          availableTo: new Date('2025-12-31'),
          duration: '2 hours',
          description: 'Beach tour description',
          createdBy: testUser._id,
          isActive: true,
        },
        {
          name: 'Mountain Hike Static',
          category: ActivityCategory.ADVENTURE,
          location: 'Albufeira',
          pricePerPerson: 35,
          minPersons: 2,
          maxPersons: 15,
          availableFrom: new Date('2025-01-01'),
          availableTo: new Date('2025-12-31'),
          duration: '6 hours',
          description: 'Mountain hiking adventure',
          createdBy: testUser._id,
          isActive: true,
        },
      ]);
    });

    it('should find active activities', async () => {
      const activities = await Activity.findActiveActivities();
      expect(activities.length).toBeGreaterThanOrEqual(2);
      expect(activities.every((a) => a.isActive)).toBe(true);
    });

    it('should find activities by location', async () => {
      const benidormActivities = await Activity.findByLocation('Benidorm');
      expect(benidormActivities.length).toBeGreaterThanOrEqual(1);
      expect(
        benidormActivities.every((a) =>
          a.location.toLowerCase().includes('benidorm')
        )
      ).toBe(true);
    });

    it('should find activities by category', async () => {
      const excursions = await Activity.findByCategory(
        ActivityCategory.EXCURSION
      );
      expect(excursions.length).toBeGreaterThanOrEqual(1);
      expect(
        excursions.every((a) => a.category === ActivityCategory.EXCURSION)
      ).toBe(true);
    });

    it('should find available activities for date range', async () => {
      const startDate = new Date('2025-06-01');
      const endDate = new Date('2025-06-15');

      const activities = await Activity.findAvailableForDates(
        startDate,
        endDate
      );
      expect(activities.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('ActivityPackage Model - Integration Tests', () => {
  let testUser: any;
  let testActivity1: any;
  let testActivity2: any;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      name: 'Test Agent Package',
      companyName: 'Test Company Package',
      abtaPtsNumber: 'ABTA88888',
      contactEmail: 'agent-package@test.com',
      websiteAddress: 'https://test-package.com',
      password: 'password123',
      role: 'agent',
      isApproved: true,
    });

    // Create test activities
    testActivity1 = await Activity.create({
      name: 'Beach Tour Package',
      category: ActivityCategory.EXCURSION,
      location: 'Benidorm',
      pricePerPerson: 25,
      minPersons: 1,
      maxPersons: 10,
      availableFrom: new Date('2025-01-01'),
      availableTo: new Date('2025-12-31'),
      duration: '2 hours',
      description: 'Beach tour description',
      createdBy: testUser._id,
    });

    testActivity2 = await Activity.create({
      name: 'Mountain Hike Package',
      category: ActivityCategory.ADVENTURE,
      location: 'Albufeira',
      pricePerPerson: 35,
      minPersons: 2,
      maxPersons: 15,
      availableFrom: new Date('2025-01-01'),
      availableTo: new Date('2025-12-31'),
      duration: '6 hours',
      description: 'Mountain hiking adventure',
      createdBy: testUser._id,
    });
  });

  describe('Package Creation', () => {
    it('should create a valid empty package', async () => {
      const packageData = {
        name: 'Summer Holiday Package Test',
        numberOfPersons: 4,
        createdBy: testUser._id,
      };

      const activityPackage = await ActivityPackage.create(packageData);

      expect(activityPackage.name).toBe(packageData.name);
      expect(activityPackage.numberOfPersons).toBe(packageData.numberOfPersons);
      expect(activityPackage.activities).toHaveLength(0);
      expect(activityPackage.totalCost).toBe(0);
      expect(activityPackage.status).toBe('draft');
      expect(activityPackage.createdBy.toString()).toBe(
        testUser._id.toString()
      );
    });

    it('should create a package with activities', async () => {
      const packageData = {
        name: 'Adventure Package Test',
        activities: [
          {
            activityId: testActivity1._id,
            quantity: 2,
            subtotal: 50, // 2 * 25
          },
          {
            activityId: testActivity2._id,
            quantity: 1,
            subtotal: 35, // 1 * 35
          },
        ],
        numberOfPersons: 2,
        createdBy: testUser._id,
      };

      const activityPackage = await ActivityPackage.create(packageData);

      expect(activityPackage.activities).toHaveLength(2);
      expect(activityPackage.totalCost).toBe(170); // (50 + 35) * 2 persons
    });
  });

  describe('Package Methods', () => {
    it('should add and remove activities correctly', async () => {
      const activityPackage = await ActivityPackage.create({
        name: 'Test Package Methods',
        numberOfPersons: 3,
        createdBy: testUser._id,
      });

      // Add activity
      activityPackage.addActivity(testActivity1._id, 2, 25);
      expect(activityPackage.activities).toHaveLength(1);
      expect(activityPackage.totalCost).toBe(150); // 50 * 3 persons

      // Remove activity
      activityPackage.removeActivity(testActivity1._id);
      expect(activityPackage.activities).toHaveLength(0);
      expect(activityPackage.totalCost).toBe(0);
    });

    it('should finalize and revert package status', async () => {
      const activityPackage = await ActivityPackage.create({
        name: 'Test Package Status',
        numberOfPersons: 2,
        createdBy: testUser._id,
      });

      expect(activityPackage.status).toBe('draft');

      await activityPackage.finalize();
      expect(activityPackage.status).toBe('finalized');

      await activityPackage.revertToDraft();
      expect(activityPackage.status).toBe('draft');
    });
  });
});
