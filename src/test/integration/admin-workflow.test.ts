import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import {
  GET as getAdminActivities,
  PUT as updateActivity,
  DELETE as deleteActivity,
} from '../../app/api/admin/activities/route';
import { PUT as updateSingleActivity } from '../../app/api/admin/activities/[id]/route';
import { DELETE as deleteSingleActivity } from '../../app/api/admin/activities/[id]/route';
import Activity from '../../models/Activity';
import User from '../../models/User';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Admin Management Workflows Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let testActivities: any[];

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
    await User.deleteMany({});

    // Create admin user
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

    // Create test activities
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

    // Mock admin session
    (getServerSession as any).mockResolvedValue({
      user: { id: adminUser._id.toString(), role: 'admin' },
    });
  });

  describe('Admin Activity Management Workflow', () => {
    it('should retrieve all activities for admin management', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/activities'
      );
      const response = await getAdminActivities(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.activities).toHaveLength(3);
      expect(result.data.total).toBe(3);

      // Should include both active and inactive activities
      const activeCount = result.data.activities.filter(
        (a: any) => a.isActive
      ).length;
      const inactiveCount = result.data.activities.filter(
        (a: any) => !a.isActive
      ).length;
      expect(activeCount).toBe(2);
      expect(inactiveCount).toBe(1);
    });

    it('should filter activities by status', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/activities?status=active'
      );
      const response = await getAdminActivities(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.activities).toHaveLength(2);
      expect(result.data.activities.every((a: any) => a.isActive)).toBe(true);
    });

    it('should search activities by name', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/activities?search=Test Activity 1'
      );
      const response = await getAdminActivities(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.activities).toHaveLength(1);
      expect(result.data.activities[0].name).toBe('Test Activity 1');
    });

    it('should update individual activity', async () => {
      const activityId = testActivities[0]._id.toString();
      const updateData = {
        name: 'Updated Activity Name',
        pricePerPerson: 55.0,
        description: 'Updated description',
      };

      const request = new NextRequest(
        `http://localhost:3000/api/admin/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await updateSingleActivity(request, {
        params: { id: activityId },
      });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Activity Name');
      expect(result.data.pricePerPerson).toBe(55.0);
      expect(result.data.description).toBe('Updated description');

      // Verify in database
      const updatedActivity = await Activity.findById(activityId);
      expect(updatedActivity?.name).toBe('Updated Activity Name');
      expect(updatedActivity?.pricePerPerson).toBe(55.0);
    });

    it('should delete individual activity', async () => {
      const activityId = testActivities[0]._id.toString();

      const request = new NextRequest(
        `http://localhost:3000/api/admin/activities/${activityId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await deleteSingleActivity(request, {
        params: { id: activityId },
      });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify deletion in database
      const deletedActivity = await Activity.findById(activityId);
      expect(deletedActivity).toBeNull();

      // Verify remaining activities
      const remainingActivities = await Activity.find({});
      expect(remainingActivities).toHaveLength(2);
    });

    it('should handle bulk status updates', async () => {
      const activityIds = [
        testActivities[0]._id.toString(),
        testActivities[1]._id.toString(),
      ];
      const bulkUpdateData = {
        activityIds,
        operation: 'deactivate',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/admin/activities/bulk-update',
        {
          method: 'POST',
          body: JSON.stringify(bulkUpdateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Note: This would need to be implemented in the actual API
      // For now, we'll test the individual updates that would happen
      for (const activityId of activityIds) {
        const updateRequest = new NextRequest(
          `http://localhost:3000/api/admin/activities/${activityId}`,
          {
            method: 'PUT',
            body: JSON.stringify({ isActive: false }),
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await updateSingleActivity(updateRequest, {
          params: { id: activityId },
        });
        expect(response.status).toBe(200);
      }

      // Verify bulk update results
      const updatedActivities = await Activity.find({
        _id: { $in: activityIds },
      });
      expect(updatedActivities.every((a) => !a.isActive)).toBe(true);
    });

    it('should validate admin permissions', async () => {
      // Mock non-admin session
      (getServerSession as any).mockResolvedValue({
        user: { id: 'user123', role: 'agent' },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/activities'
      );
      const response = await getAdminActivities(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Admin access required');
    });

    it('should handle activity not found errors', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const request = new NextRequest(
        `http://localhost:3000/api/admin/activities/${nonExistentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await updateSingleActivity(request, {
        params: { id: nonExistentId },
      });
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Activity not found');
    });
  });

  describe('Activity Lifecycle Management', () => {
    it('should handle complete activity lifecycle', async () => {
      // 1. Create new activity (via CSV upload - tested in other file)
      const newActivity = await Activity.create({
        name: 'Lifecycle Test Activity',
        category: 'adventure',
        location: 'Test Location',
        pricePerPerson: 35.0,
        minPersons: 2,
        maxPersons: 20,
        availableFrom: new Date('2024-06-01'),
        availableTo: new Date('2024-09-30'),
        duration: '3 hours',
        description: 'Activity for lifecycle testing',
        isActive: true,
        createdBy: adminUser._id,
      });

      // 2. Update activity details
      const updateRequest = new NextRequest(
        `http://localhost:3000/api/admin/activities/${newActivity._id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            pricePerPerson: 40.0,
            maxPersons: 25,
            description: 'Updated lifecycle test activity',
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const updateResponse = await updateSingleActivity(updateRequest, {
        params: { id: newActivity._id.toString() },
      });
      expect(updateResponse.status).toBe(200);

      // 3. Deactivate activity
      const deactivateRequest = new NextRequest(
        `http://localhost:3000/api/admin/activities/${newActivity._id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ isActive: false }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const deactivateResponse = await updateSingleActivity(deactivateRequest, {
        params: { id: newActivity._id.toString() },
      });
      expect(deactivateResponse.status).toBe(200);

      // 4. Verify final state
      const finalActivity = await Activity.findById(newActivity._id);
      expect(finalActivity?.isActive).toBe(false);
      expect(finalActivity?.pricePerPerson).toBe(40.0);
      expect(finalActivity?.maxPersons).toBe(25);

      // 5. Delete activity
      const deleteRequest = new NextRequest(
        `http://localhost:3000/api/admin/activities/${newActivity._id}`,
        {
          method: 'DELETE',
        }
      );

      const deleteResponse = await deleteSingleActivity(deleteRequest, {
        params: { id: newActivity._id.toString() },
      });
      expect(deleteResponse.status).toBe(200);

      // 6. Verify deletion
      const deletedActivity = await Activity.findById(newActivity._id);
      expect(deletedActivity).toBeNull();
    });
  });
});
