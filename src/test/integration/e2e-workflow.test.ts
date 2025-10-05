import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Activity from '../../models/Activity';
import ActivityPackage from '../../models/ActivityPackage';
import User from '../../models/User';
import { parseActivitiesCSV } from '../../lib/csv-parser';

describe('Activities Module - End-to-End Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let testUser: any;

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
    await Activity.deleteMany({});
    await ActivityPackage.deleteMany({});
    await User.deleteMany({});

    // Create test users
    adminUser = await User.create({
      name: 'Admin User',
      companyName: 'Test Admin Company',
      abtaPtsNumber: 'ABTA12345',
      contactEmail: 'admin@test.com',
      websiteAddress: 'https://admin.test.com',
      password: 'password123',
      role: 'admin',
      isApproved: true,
    });

    testUser = await User.create({
      name: 'Test Agent',
      companyName: 'Test Travel Agency',
      abtaPtsNumber: 'ABTA54321',
      contactEmail: 'agent@test.com',
      websiteAddress: 'https://agent.test.com',
      password: 'password123',
      role: 'agent',
      isApproved: true,
    });
  });

  describe('Complete CSV Upload to Activity Display Workflow', () => {
    it('should handle complete workflow from CSV upload to activity search', async () => {
      // Step 1: Parse and validate CSV data
      const csvContent = `Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description
Flamenco Show,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Traditional Spanish flamenco performance
Beach Excursion,excursion,Albufeira,25.00,4,30,2024-03-01,2024-10-31,4 hours,Guided tour of beautiful beaches
City Walking Tour,cultural,Benidorm,15.00,6,25,2024-01-01,2024-12-31,3 hours,Historical city center exploration`;

      const parseResult = parseActivitiesCSV(csvContent);

      expect(parseResult.success).toBe(true);
      expect(parseResult.data).toHaveLength(3);
      expect(parseResult.errors).toHaveLength(0);

      // Step 2: Import activities to database
      const importedActivities = [];
      for (const activityData of parseResult.data) {
        try {
          const activity = await Activity.create({
            ...activityData,
            createdBy: adminUser._id,
          });
          importedActivities.push(activity);
        } catch (error) {
          // Handle duplicate or validation errors
          if (error.code === 11000) {
            // Update existing activity
            const existing = await Activity.findOneAndUpdate(
              { name: activityData.name, location: activityData.location },
              { ...activityData, createdBy: adminUser._id },
              { new: true }
            );
            if (existing) importedActivities.push(existing);
          }
        }
      }

      expect(importedActivities).toHaveLength(3);

      // Step 3: Verify activities are searchable
      const allActivities = await Activity.find({ isActive: true });
      expect(allActivities).toHaveLength(3);

      // Step 4: Test location-based filtering
      const benidormActivities = await Activity.find({
        location: 'Benidorm',
        isActive: true,
      });
      expect(benidormActivities).toHaveLength(2);
      expect(benidormActivities.map((a) => a.name)).toContain('Flamenco Show');
      expect(benidormActivities.map((a) => a.name)).toContain(
        'City Walking Tour'
      );

      // Step 5: Test category-based filtering
      const showActivities = await Activity.find({
        category: 'show',
        isActive: true,
      });
      expect(showActivities).toHaveLength(1);
      expect(showActivities[0].name).toBe('Flamenco Show');

      // Step 6: Test price range filtering
      const affordableActivities = await Activity.find({
        pricePerPerson: { $lte: 30 },
        isActive: true,
      });
      expect(affordableActivities).toHaveLength(2);
      expect(affordableActivities.map((a) => a.name)).toContain(
        'Beach Excursion'
      );
      expect(affordableActivities.map((a) => a.name)).toContain(
        'City Walking Tour'
      );
    });

    it('should handle CSV validation errors properly', async () => {
      const invalidCsvContent = `Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description
Invalid Activity,invalid_category,Benidorm,-10,5,2,invalid-date,2024-12-31,2 hours,Test activity
,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Missing name`;

      const parseResult = parseActivitiesCSV(invalidCsvContent);

      expect(parseResult.success).toBe(false);
      expect(parseResult.data).toHaveLength(0);
      expect(parseResult.errors.length).toBeGreaterThan(0);

      // Check that we have errors for both lines
      const line2Errors = parseResult.errors.filter((e) => e.line === 2);
      const line3Errors = parseResult.errors.filter((e) => e.line === 3);

      expect(line2Errors.length).toBeGreaterThan(0);
      expect(line3Errors.length).toBeGreaterThan(0);

      // Check that errors contain expected validation issues
      const allErrorMessages = parseResult.errors
        .map((e) => e.message)
        .join(' ');
      expect(allErrorMessages).toContain('category');
      expect(allErrorMessages).toContain('name');
    });
  });

  describe('End-to-End Package Building and Export Process', () => {
    beforeEach(async () => {
      // Create test activities
      await Activity.create([
        {
          name: 'Flamenco Show',
          category: 'show',
          location: 'Benidorm',
          pricePerPerson: 45.0,
          minPersons: 2,
          maxPersons: 50,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-12-31'),
          duration: '2 hours',
          description: 'Traditional Spanish flamenco performance',
          isActive: true,
          createdBy: adminUser._id,
        },
        {
          name: 'Beach Excursion',
          category: 'excursion',
          location: 'Albufeira',
          pricePerPerson: 25.0,
          minPersons: 4,
          maxPersons: 30,
          availableFrom: new Date('2024-03-01'),
          availableTo: new Date('2024-10-31'),
          duration: '4 hours',
          description: 'Guided tour of beautiful beaches',
          isActive: true,
          createdBy: adminUser._id,
        },
      ]);
    });

    it('should complete package building workflow', async () => {
      // Step 1: Get available activities
      const activities = await Activity.find({ isActive: true });
      expect(activities).toHaveLength(2);

      // Step 2: Build a package with selected activities
      const numberOfPersons = 4;
      const packageActivities = [
        {
          activityId: activities[0]._id,
          quantity: 1,
          subtotal: activities[0].pricePerPerson * 1, // 45 * 1 = 45 (per person cost)
        },
        {
          activityId: activities[1]._id,
          quantity: 1,
          subtotal: activities[1].pricePerPerson * 1, // 25 * 1 = 25 (per person cost)
        },
      ];

      // Total cost will be calculated by the model: (45 + 25) * 4 = 280
      const expectedTotalCost =
        (activities[0].pricePerPerson + activities[1].pricePerPerson) *
        numberOfPersons;

      // Step 3: Save the package (totalCost will be calculated by pre-save hook)
      const savedPackage = await ActivityPackage.create({
        name: 'Test Holiday Package',
        activities: packageActivities,
        numberOfPersons,
        totalCost: 0, // Will be recalculated by pre-save hook
        createdBy: testUser._id,
        status: 'draft',
        clientName: 'Test Client',
      });

      expect(savedPackage.name).toBe('Test Holiday Package');
      expect(savedPackage.totalCost).toBe(expectedTotalCost); // Should be (45 + 25) * 4 = 280
      expect(savedPackage.activities).toHaveLength(2);
      expect(savedPackage.status).toBe('draft');

      // Step 4: Retrieve saved packages for user
      const userPackages = await ActivityPackage.find({
        createdBy: testUser._id,
      });
      expect(userPackages).toHaveLength(1);
      expect(userPackages[0].name).toBe('Test Holiday Package');

      // Step 5: Update package (simulate editing)
      savedPackage.clientName = 'Updated Client Name';
      savedPackage.status = 'finalized';
      await savedPackage.save();

      const updatedPackage = await ActivityPackage.findById(savedPackage._id);
      expect(updatedPackage?.clientName).toBe('Updated Client Name');
      expect(updatedPackage?.status).toBe('finalized');

      // Step 6: Delete package
      await ActivityPackage.findByIdAndDelete(savedPackage._id);
      const deletedPackage = await ActivityPackage.findById(savedPackage._id);
      expect(deletedPackage).toBeNull();
    });

    it('should validate package activities availability', async () => {
      // Create an expired activity
      const expiredActivity = await Activity.create({
        name: 'Expired Activity',
        category: 'show',
        location: 'Benidorm',
        pricePerPerson: 30.0,
        minPersons: 2,
        maxPersons: 20,
        availableFrom: new Date('2023-01-01'),
        availableTo: new Date('2023-12-31'), // Expired
        duration: '1 hour',
        description: 'This activity has expired',
        isActive: true,
        createdBy: adminUser._id,
      });

      // Test availability checking
      expect(expiredActivity.isAvailable()).toBe(false);

      // Create package with expired activity
      const packageWithExpired = await ActivityPackage.create({
        name: 'Package with Expired Activity',
        activities: [
          {
            activityId: expiredActivity._id,
            quantity: 1,
            subtotal: expiredActivity.pricePerPerson * 2,
          },
        ],
        numberOfPersons: 2,
        totalCost: expiredActivity.pricePerPerson * 2,
        createdBy: testUser._id,
        status: 'draft',
      });

      // Validate package activities
      const packageToValidate = await ActivityPackage.findById(
        packageWithExpired._id
      ).populate('activities.activityId');

      let hasUnavailableActivities = false;
      for (const packageActivity of packageToValidate.activities) {
        const activity = packageActivity.activityId as any;
        if (!activity.isAvailable()) {
          hasUnavailableActivities = true;
          break;
        }
      }

      expect(hasUnavailableActivities).toBe(true);
    });

    it('should handle package cost calculations correctly', async () => {
      const activities = await Activity.find({ isActive: true });

      // Test different group sizes
      const testCases = [
        { persons: 2, expectedTotal: 45 * 2 + 25 * 2 }, // 90 + 50 = 140
        { persons: 4, expectedTotal: 45 * 4 + 25 * 4 }, // 180 + 100 = 280
        { persons: 6, expectedTotal: 45 * 6 + 25 * 6 }, // 270 + 150 = 420
      ];

      for (const testCase of testCases) {
        const packageActivities = activities.map((activity) => ({
          activityId: activity._id,
          quantity: 1,
          subtotal: activity.pricePerPerson, // Cost per person for this activity
        }));

        // Create and verify package
        const testPackage = await ActivityPackage.create({
          name: `Package for ${testCase.persons} persons`,
          activities: packageActivities,
          numberOfPersons: testCase.persons,
          totalCost: 0, // Will be calculated by pre-save hook
          createdBy: testUser._id,
          status: 'draft',
        });

        expect(testPackage.totalCost).toBe(testCase.expectedTotal);

        // Clean up
        await ActivityPackage.findByIdAndDelete(testPackage._id);
      }
    });
  });

  describe('Admin Management Workflows', () => {
    let testActivities: any[];

    beforeEach(async () => {
      testActivities = await Activity.create([
        {
          name: 'Test Activity 1',
          category: 'show',
          location: 'Benidorm',
          pricePerPerson: 45.0,
          minPersons: 2,
          maxPersons: 50,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-12-31'),
          duration: '2 hours',
          description: 'Test activity 1',
          isActive: true,
          createdBy: adminUser._id,
        },
        {
          name: 'Test Activity 2',
          category: 'excursion',
          location: 'Albufeira',
          pricePerPerson: 25.0,
          minPersons: 4,
          maxPersons: 30,
          availableFrom: new Date('2024-03-01'),
          availableTo: new Date('2024-10-31'),
          duration: '4 hours',
          description: 'Test activity 2',
          isActive: true,
          createdBy: adminUser._id,
        },
        {
          name: 'Inactive Activity',
          category: 'cultural',
          location: 'Benidorm',
          pricePerPerson: 20.0,
          minPersons: 1,
          maxPersons: 15,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-12-31'),
          duration: '3 hours',
          description: 'Inactive test activity',
          isActive: false,
          createdBy: adminUser._id,
        },
      ]);
    });

    it('should handle complete activity lifecycle management', async () => {
      // 1. Retrieve all activities (including inactive)
      const allActivities = await Activity.find({});
      expect(allActivities).toHaveLength(3);

      // 2. Filter active activities
      const activeActivities = await Activity.find({ isActive: true });
      expect(activeActivities).toHaveLength(2);

      // 3. Search activities by name
      const searchResults = await Activity.find({
        name: { $regex: 'Test Activity 1', $options: 'i' },
      });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Test Activity 1');

      // 4. Update activity
      const activityToUpdate = testActivities[0];
      activityToUpdate.pricePerPerson = 55.0;
      activityToUpdate.description = 'Updated description';
      await activityToUpdate.save();

      const updatedActivity = await Activity.findById(activityToUpdate._id);
      expect(updatedActivity?.pricePerPerson).toBe(55.0);
      expect(updatedActivity?.description).toBe('Updated description');

      // 5. Deactivate activity
      await Activity.findByIdAndUpdate(activityToUpdate._id, {
        isActive: false,
      });
      const deactivatedActivity = await Activity.findById(activityToUpdate._id);
      expect(deactivatedActivity?.isActive).toBe(false);

      // 6. Bulk operations - activate multiple activities
      const inactiveIds = await Activity.find({ isActive: false }).distinct(
        '_id'
      );
      await Activity.updateMany(
        { _id: { $in: inactiveIds } },
        { isActive: true }
      );

      const reactivatedActivities = await Activity.find({
        _id: { $in: inactiveIds },
      });
      expect(reactivatedActivities.every((a) => a.isActive)).toBe(true);

      // 7. Delete activity
      await Activity.findByIdAndDelete(testActivities[0]._id);
      const deletedActivity = await Activity.findById(testActivities[0]._id);
      expect(deletedActivity).toBeNull();

      // Verify remaining activities
      const remainingActivities = await Activity.find({});
      expect(remainingActivities).toHaveLength(2);
    });

    it('should handle activity validation and constraints', async () => {
      // Test duplicate prevention (name + location)
      const duplicateActivity = {
        name: 'Test Activity 1',
        category: 'show',
        location: 'Benidorm',
        pricePerPerson: 50.0,
        minPersons: 2,
        maxPersons: 50,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-12-31'),
        duration: '2 hours',
        description: 'Duplicate test activity',
        isActive: true,
        createdBy: adminUser._id,
      };

      await expect(Activity.create(duplicateActivity)).rejects.toThrow();

      // Test validation constraints
      const invalidActivity = {
        name: 'Invalid Activity',
        category: 'invalid_category',
        location: 'Test Location',
        pricePerPerson: -10, // Invalid negative price
        minPersons: 5,
        maxPersons: 2, // Invalid: max < min
        availableFrom: new Date('2024-12-31'),
        availableTo: new Date('2024-01-01'), // Invalid: end before start
        duration: '2 hours',
        description: 'Invalid test activity',
        isActive: true,
        createdBy: adminUser._id,
      };

      await expect(Activity.create(invalidActivity)).rejects.toThrow();
    });
  });

  describe('Authentication and Authorization Workflows', () => {
    it('should validate user roles and permissions', async () => {
      // Test admin user
      expect(adminUser.role).toBe('admin');
      expect(adminUser.isApproved).toBe(true);

      // Test travel agent user
      expect(testUser.role).toBe('agent');
      expect(testUser.isApproved).toBe(true);

      // Create pending user
      const pendingUser = await User.create({
        name: 'Pending User',
        companyName: 'Pending Travel Co',
        abtaPtsNumber: 'ABTA99999',
        contactEmail: 'pending@test.com',
        websiteAddress: 'https://pending.test.com',
        password: 'password123',
        role: 'agent',
        isApproved: false,
      });

      expect(pendingUser.isApproved).toBe(false);

      // Test package ownership
      const userPackage = await ActivityPackage.create({
        name: 'User Package',
        activities: [],
        numberOfPersons: 2,
        totalCost: 0,
        createdBy: testUser._id,
        status: 'draft',
      });

      const otherUserPackage = await ActivityPackage.create({
        name: 'Other User Package',
        activities: [],
        numberOfPersons: 3,
        totalCost: 0,
        createdBy: adminUser._id,
        status: 'draft',
      });

      // Verify package ownership filtering
      const testUserPackages = await ActivityPackage.find({
        createdBy: testUser._id,
      });
      expect(testUserPackages).toHaveLength(1);
      expect(testUserPackages[0].name).toBe('User Package');

      const adminUserPackages = await ActivityPackage.find({
        createdBy: adminUser._id,
      });
      expect(adminUserPackages).toHaveLength(1);
      expect(adminUserPackages[0].name).toBe('Other User Package');
    });

    it('should validate user data integrity', async () => {
      // Test unique constraints
      const duplicateUser = {
        name: 'Duplicate User',
        companyName: 'Duplicate Company',
        abtaPtsNumber: 'ABTA12345', // Same as adminUser
        contactEmail: 'duplicate@test.com',
        websiteAddress: 'https://duplicate.test.com',
        password: 'password123',
        role: 'agent',
        isApproved: false,
      };

      await expect(User.create(duplicateUser)).rejects.toThrow();

      // Test email uniqueness
      const duplicateEmailUser = {
        name: 'Duplicate Email User',
        companyName: 'Duplicate Email Company',
        abtaPtsNumber: 'ABTA88888',
        contactEmail: 'admin@test.com', // Same as adminUser
        websiteAddress: 'https://duplicate-email.test.com',
        password: 'password123',
        role: 'agent',
        isApproved: false,
      };

      await expect(User.create(duplicateEmailUser)).rejects.toThrow();
    });
  });
});
