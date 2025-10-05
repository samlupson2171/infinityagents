import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { GET as getActivities } from '../../app/api/activities/route';
import { GET as getAdminActivities } from '../../app/api/admin/activities/route';
import { POST as uploadActivities } from '../../app/api/admin/activities/upload/route';
import { POST as createPackage } from '../../app/api/packages/route';
import { GET as getPackages } from '../../app/api/packages/route';
import User from '../../models/User';
import Activity from '../../models/Activity';
import ActivityPackage from '../../models/ActivityPackage';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Authentication and Authorization Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let travelAgent: any;
  let pendingUser: any;
  let testActivity: any;

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
    await Activity.deleteMany({});
    await ActivityPackage.deleteMany({});

    // Create test users with different roles and statuses
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

    travelAgent = await User.create({
      name: 'Travel Agent',
      companyName: 'Test Travel Agency',
      abtaPtsNumber: 'ABTA54321',
      contactEmail: 'agent@test.com',
      websiteAddress: 'https://agent.test.com',
      password: 'password123',
      role: 'agent',
      isApproved: true,
    });

    pendingUser = await User.create({
      name: 'Pending User',
      companyName: 'Pending Travel Co',
      abtaPtsNumber: 'ABTA99999',
      contactEmail: 'pending@test.com',
      websiteAddress: 'https://pending.test.com',
      password: 'password123',
      role: 'agent',
      isApproved: false,
    });

    // Create test activity
    testActivity = await Activity.create({
      name: 'Test Activity',
      category: 'show',
      location: 'Benidorm',
      pricePerPerson: 45.0,
      minPersons: 2,
      maxPersons: 50,
      availableFrom: new Date('2024-01-01'),
      availableTo: new Date('2024-12-31'),
      duration: '2 hours',
      description: 'Test activity for auth tests',
      isActive: true,
      createdBy: adminUser._id,
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      // Mock no session
      (getServerSession as any).mockResolvedValue(null);

      // Test activities endpoint
      const activitiesRequest = new NextRequest(
        'http://localhost:3000/api/activities'
      );
      const activitiesResponse = await getActivities(activitiesRequest);
      const activitiesResult = await activitiesResponse.json();

      expect(activitiesResponse.status).toBe(401);
      expect(activitiesResult.success).toBe(false);
      expect(activitiesResult.error.message).toContain(
        'Authentication required'
      );

      // Test packages endpoint
      const packagesRequest = new NextRequest(
        'http://localhost:3000/api/packages'
      );
      const packagesResponse = await getPackages(packagesRequest);
      const packagesResult = await packagesResponse.json();

      expect(packagesResponse.status).toBe(401);
      expect(packagesResult.success).toBe(false);
      expect(packagesResult.error.message).toContain('Authentication required');

      // Test admin endpoint
      const adminRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities'
      );
      const adminResponse = await getAdminActivities(adminRequest);
      const adminResult = await adminResponse.json();

      expect(adminResponse.status).toBe(401);
      expect(adminResult.success).toBe(false);
      expect(adminResult.error.message).toContain('Authentication required');
    });

    it('should reject requests from pending users', async () => {
      // Mock pending user session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: pendingUser._id.toString(),
          role: 'agent',
          status: 'pending',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Account approval required');
    });
  });

  describe('Role-Based Authorization', () => {
    it('should allow travel agents to access activity endpoints', async () => {
      // Mock travel agent session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: travelAgent._id.toString(),
          role: 'agent',
          status: 'approved',
        },
      });

      // Test activities access
      const activitiesRequest = new NextRequest(
        'http://localhost:3000/api/activities'
      );
      const activitiesResponse = await getActivities(activitiesRequest);
      const activitiesResult = await activitiesResponse.json();

      expect(activitiesResponse.status).toBe(200);
      expect(activitiesResult.success).toBe(true);
      expect(activitiesResult.data.activities).toBeDefined();

      // Test package creation
      const packageData = {
        name: 'Test Package',
        activities: [
          {
            activityId: testActivity._id,
            quantity: 1,
            subtotal: testActivity.pricePerPerson * 2,
          },
        ],
        numberOfPersons: 2,
        totalCost: testActivity.pricePerPerson * 2,
        status: 'draft',
      };

      const packageRequest = new NextRequest(
        'http://localhost:3000/api/packages',
        {
          method: 'POST',
          body: JSON.stringify(packageData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const packageResponse = await createPackage(packageRequest);
      const packageResult = await packageResponse.json();

      expect(packageResponse.status).toBe(201);
      expect(packageResult.success).toBe(true);
      expect(packageResult.data.name).toBe('Test Package');
    });

    it('should deny travel agents access to admin endpoints', async () => {
      // Mock travel agent session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: travelAgent._id.toString(),
          role: 'agent',
          status: 'approved',
        },
      });

      // Test admin activities access
      const adminRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities'
      );
      const adminResponse = await getAdminActivities(adminRequest);
      const adminResult = await adminResponse.json();

      expect(adminResponse.status).toBe(403);
      expect(adminResult.success).toBe(false);
      expect(adminResult.error.message).toContain('Admin access required');

      // Test CSV upload access
      const csvContent =
        'Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description\nTest,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Test';
      const formData = new FormData();
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', csvBlob, 'test.csv');

      const uploadRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const uploadResponse = await uploadActivities(uploadRequest);
      const uploadResult = await uploadResponse.json();

      expect(uploadResponse.status).toBe(403);
      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error.message).toContain('Admin access required');
    });

    it('should allow admins to access all endpoints', async () => {
      // Mock admin session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          status: 'approved',
        },
      });

      // Test admin activities access
      const adminRequest = new NextRequest(
        'http://localhost:3000/api/admin/activities'
      );
      const adminResponse = await getAdminActivities(adminRequest);
      const adminResult = await adminResponse.json();

      expect(adminResponse.status).toBe(200);
      expect(adminResult.success).toBe(true);
      expect(adminResult.data.activities).toBeDefined();

      // Test regular activities access
      const activitiesRequest = new NextRequest(
        'http://localhost:3000/api/activities'
      );
      const activitiesResponse = await getActivities(activitiesRequest);
      const activitiesResult = await activitiesResponse.json();

      expect(activitiesResponse.status).toBe(200);
      expect(activitiesResult.success).toBe(true);
      expect(activitiesResult.data.activities).toBeDefined();

      // Test CSV upload access
      const csvContent =
        'Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description\nAdmin Test,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Admin test activity';
      const formData = new FormData();
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('file', csvBlob, 'admin-test.csv');

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
      expect(uploadResult.summary.imported).toBe(1);
    });
  });

  describe('Package Ownership Authorization', () => {
    let userPackage: any;
    let otherUserPackage: any;
    let otherAgent: any;

    beforeEach(async () => {
      // Create another travel agent
      otherAgent = await User.create({
        name: 'Other Agent',
        companyName: 'Other Travel Agency',
        abtaPtsNumber: 'ABTA77777',
        contactEmail: 'other@test.com',
        websiteAddress: 'https://other.test.com',
        password: 'password123',
        role: 'agent',
        isApproved: true,
      });

      // Create packages for different users
      userPackage = await ActivityPackage.create({
        name: 'User Package',
        activities: [
          {
            activityId: testActivity._id,
            quantity: 1,
            subtotal: testActivity.pricePerPerson * 2,
          },
        ],
        numberOfPersons: 2,
        totalCost: testActivity.pricePerPerson * 2,
        createdBy: travelAgent._id,
        status: 'draft',
      });

      otherUserPackage = await ActivityPackage.create({
        name: 'Other User Package',
        activities: [
          {
            activityId: testActivity._id,
            quantity: 1,
            subtotal: testActivity.pricePerPerson * 3,
          },
        ],
        numberOfPersons: 3,
        totalCost: testActivity.pricePerPerson * 3,
        createdBy: otherAgent._id,
        status: 'draft',
      });
    });

    it('should only return packages owned by the authenticated user', async () => {
      // Mock travel agent session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: travelAgent._id.toString(),
          role: 'agent',
          status: 'approved',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/packages');
      const response = await getPackages(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.packages).toHaveLength(1);
      expect(result.data.packages[0].name).toBe('User Package');
      expect(result.data.packages[0]._id).toBe(userPackage._id.toString());
    });

    it('should prevent access to packages owned by other users', async () => {
      // This would be tested in the individual package endpoint
      // For now, we verify that the GET /packages endpoint only returns owned packages
      (getServerSession as any).mockResolvedValue({
        user: {
          id: otherAgent._id.toString(),
          role: 'agent',
          status: 'approved',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/packages');
      const response = await getPackages(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.packages).toHaveLength(1);
      expect(result.data.packages[0].name).toBe('Other User Package');
      expect(result.data.packages[0]._id).toBe(otherUserPackage._id.toString());
    });

    it('should allow admins to access all packages', async () => {
      // Mock admin session
      (getServerSession as any).mockResolvedValue({
        user: {
          id: adminUser._id.toString(),
          role: 'admin',
          status: 'approved',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/packages');
      const response = await getPackages(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      // Admin should see all packages or have different endpoint
      // This depends on the implementation - for now we test that admin has access
      expect(result.data.packages).toBeDefined();
    });
  });

  describe('Session Validation', () => {
    it('should handle invalid session data gracefully', async () => {
      // Mock invalid session
      (getServerSession as any).mockResolvedValue({
        user: { id: 'invalid-id', role: 'invalid-role' },
      });

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invalid session');
    });

    it('should handle missing user data in session', async () => {
      // Mock session without user
      (getServerSession as any).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Authentication required');
    });

    it('should validate user exists in database', async () => {
      // Mock session with non-existent user
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      (getServerSession as any).mockResolvedValue({
        user: { id: nonExistentUserId, role: 'agent', status: 'approved' },
      });

      const request = new NextRequest('http://localhost:3000/api/activities');
      const response = await getActivities(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('User not found');
    });
  });
});
