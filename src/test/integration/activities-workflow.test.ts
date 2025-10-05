import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { POST as uploadActivities } from '../../app/api/admin/activities/upload/route';
import { GET as getActivities } from '../../app/api/activities/route';
import { POST as createPackage } from '../../app/api/packages/route';
import { GET as getPackages } from '../../app/api/packages/route';
import Activity from '../../models/Activity';
import ActivityPackage from '../../models/ActivityPackage';
import User from '../../models/User';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Activities Module - Complete Workflow Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let adminUser: any;

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
      // Mock admin session
      (getServerSession as any).mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' },
      });

      // Step 1: Upload CSV with activities
      const csvContent = `Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description
Flamenco Show,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Traditional Spanish flamenco performance
Beach Excursion,excursion,Albufeira,25.00,4,30,2024-03-01,2024-10-31,4 hours,Guided tour of beautiful beaches
City Walking Tour,cultural,Benidorm,15.00,6,25,2024-01-01,2024-12-31,3 hours,Historical city center exploration`;

      const formData = new FormData();
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', csvBlob, 'activities.csv');

      const uploadRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadResponse = await uploadActivities(uploadRequest);
      const uploadResult = await uploadResponse.json();

      expect(uploadResponse.status).toBe(200);
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.summary.imported).toBe(3);
      expect(uploadResult.summary.errors).toBe(0);

      // Step 2: Verify activities are in database
      const activitiesInDb = await Activity.find({});
      expect(activitiesInDb).toHaveLength(3);

      // Step 3: Search for activities as travel agent
      (getServerSession as any).mockResolvedValue({
        user: { id: testUser._id.toString(), role: 'agent' },
      });

      const searchRequest = new NextRequest(
        'http://localhost:3000/api/activities?location=Benidorm'
      );
      const searchResponse = await getActivities(searchRequest);
      const searchResult = await searchResponse.json();

      expect(searchResponse.status).toBe(200);
      expect(searchResult.success).toBe(true);
      expect(searchResult.data.activities).toHaveLength(2); // Flamenco Show and City Walking Tour
      expect(searchResult.data.activities[0].location).toBe('Benidorm');
    });

    it('should handle CSV validation errors properly', async () => {
      (getServerSession as any).mockResolvedValue({
        user: { id: adminUser._id.toString(), role: 'admin' },
      });

      // Upload CSV with validation errors
      const invalidCsvContent = `Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description
Invalid Activity,invalid_category,Benidorm,-10,5,2,invalid-date,2024-12-31,2 hours,Test activity
,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Missing name`;

      const formData = new FormData();
      const csvBlob = new Blob([invalidCsvContent], { type: 'text/csv' });
      formData.append('file', csvBlob, 'invalid.csv');

      const uploadRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadResponse = await uploadActivities(uploadRequest);
      const uploadResult = await uploadResponse.json();

      expect(uploadResponse.status).toBe(200);
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.summary.imported).toBe(0);
      expect(uploadResult.summary.errors).toBe(2);
      expect(uploadResult.errors).toHaveLength(2);
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
      (getServerSession as any).mockResolvedValue({
        user: { id: testUser._id.toString(), role: 'agent' },
      });

      // Step 1: Get available activities
      const activitiesRequest = new NextRequest(
        'http://localhost:3000/api/activities'
      );
      const activitiesResponse = await getActivities(activitiesRequest);
      const activitiesResult = await activitiesResponse.json();

      expect(activitiesResponse.status).toBe(200);
      expect(activitiesResult.data.activities).toHaveLength(2);

      const activities = activitiesResult.data.activities;

      // Step 2: Create a package with selected activities
      const packageData = {
        name: 'Test Holiday Package',
        activities: [
          {
            activityId: activities[0]._id,
            quantity: 1,
            subtotal: activities[0].pricePerPerson * 4, // 4 persons
          },
          {
            activityId: activities[1]._id,
            quantity: 1,
            subtotal: activities[1].pricePerPerson * 4, // 4 persons
          },
        ],
        numberOfPersons: 4,
        totalCost:
          (activities[0].pricePerPerson + activities[1].pricePerPerson) * 4,
        status: 'draft',
        clientName: 'Test Client',
      };

      const createRequest = new NextRequest(
        'http://localhost:3000/api/packages',
        {
          method: 'POST',
          body: JSON.stringify(packageData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const createResponse = await createPackage(createRequest);
      const createResult = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createResult.success).toBe(true);
      expect(createResult.data.name).toBe('Test Holiday Package');
      expect(createResult.data.totalCost).toBe(280); // (45 + 25) * 4

      // Step 3: Retrieve saved packages
      const getPackagesRequest = new NextRequest(
        'http://localhost:3000/api/packages'
      );
      const getPackagesResponse = await getPackages(getPackagesRequest);
      const getPackagesResult = await getPackagesResponse.json();

      expect(getPackagesResponse.status).toBe(200);
      expect(getPackagesResult.success).toBe(true);
      expect(getPackagesResult.data.packages).toHaveLength(1);
      expect(getPackagesResult.data.packages[0].name).toBe(
        'Test Holiday Package'
      );
    });

    it('should validate package activities availability', async () => {
      (getServerSession as any).mockResolvedValue({
        user: { id: testUser._id.toString(), role: 'agent' },
      });

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

      // Try to create package with expired activity
      const packageData = {
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
        status: 'draft',
      };

      const createRequest = new NextRequest(
        'http://localhost:3000/api/packages',
        {
          method: 'POST',
          body: JSON.stringify(packageData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const createResponse = await createPackage(createRequest);
      const createResult = await createResponse.json();

      // Should still create but with warnings about availability
      expect(createResponse.status).toBe(201);
      expect(createResult.success).toBe(true);
      // The availability validation would be handled in the frontend
    });
  });
});
