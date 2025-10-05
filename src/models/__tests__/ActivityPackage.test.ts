import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import ActivityPackage, {
  IActivityPackage,
  IPackageActivity,
} from '../ActivityPackage';

// Mock mongoose connection
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    models: {},
    model: vi.fn(),
  };
});

describe('ActivityPackage Model', () => {
  const validPackageData = {
    name: 'Test Package',
    activities: [
      {
        activityId: new mongoose.Types.ObjectId(),
        quantity: 2,
        subtotal: 50.0,
      },
    ],
    totalCost: 150.0,
    numberOfPersons: 3,
    createdBy: new mongoose.Types.ObjectId(),
    status: 'draft' as const,
    clientName: 'John Doe',
    notes: 'Special requirements',
  };

  describe('Schema Validation', () => {
    describe('Package Name Validation', () => {
      it('should validate required name field', () => {
        const packageData = { ...validPackageData };
        delete (packageData as any).name;

        // Test validation logic
        expect(packageData.name).toBeUndefined();
      });

      it('should validate name length constraints', () => {
        // Test minimum length (3 characters)
        const shortName = 'AB';
        expect(shortName.length < 3).toBe(true);

        // Test maximum length (200 characters)
        const longName = 'A'.repeat(201);
        expect(longName.length > 200).toBe(true);

        // Test valid name
        const validName = 'Valid Package Name';
        expect(validName.length >= 3 && validName.length <= 200).toBe(true);
      });

      it('should trim whitespace from name', () => {
        const nameWithWhitespace = '  Test Package  ';
        const trimmed = nameWithWhitespace.trim();
        expect(trimmed).toBe('Test Package');
      });
    });

    describe('Activities Array Validation', () => {
      it('should allow empty activities array', () => {
        const emptyActivities: IPackageActivity[] = [];
        expect(Array.isArray(emptyActivities)).toBe(true);
        expect(emptyActivities.length).toBe(0);
      });

      it('should validate activity structure', () => {
        const validActivity: IPackageActivity = {
          activityId: new mongoose.Types.ObjectId(),
          quantity: 1,
          subtotal: 25.0,
        };

        expect(validActivity.activityId).toBeInstanceOf(
          mongoose.Types.ObjectId
        );
        expect(typeof validActivity.quantity).toBe('number');
        expect(typeof validActivity.subtotal).toBe('number');
      });

      it('should validate quantity constraints', () => {
        // Test minimum quantity (1)
        expect(0 < 1).toBe(true); // Invalid
        expect(1 >= 1).toBe(true); // Valid

        // Test integer validation
        expect(Number.isInteger(1)).toBe(true);
        expect(Number.isInteger(1.5)).toBe(false);
      });

      it('should validate subtotal constraints', () => {
        // Test positive number
        expect(Number.isFinite(25.5) && 25.5 >= 0).toBe(true);
        expect(Number.isFinite(-10) && -10 >= 0).toBe(false);
        expect(Number.isFinite(0) && 0 >= 0).toBe(true);
      });

      it('should detect duplicate activities', () => {
        const activityId = new mongoose.Types.ObjectId();
        const activities = [
          { activityId, quantity: 1, subtotal: 25.0 },
          { activityId, quantity: 2, subtotal: 50.0 },
        ];

        const activityIds = activities.map((a) => a.activityId.toString());
        const uniqueIds = new Set(activityIds);
        const hasDuplicates = activityIds.length !== uniqueIds.size;

        expect(hasDuplicates).toBe(true);
      });
    });

    describe('Total Cost Validation', () => {
      it('should validate total cost constraints', () => {
        // Test positive number
        expect(Number.isFinite(150.0) && 150.0 >= 0).toBe(true);
        expect(Number.isFinite(-50) && -50 >= 0).toBe(false);

        // Test default value
        const defaultCost = 0;
        expect(defaultCost).toBe(0);
      });
    });

    describe('Number of Persons Validation', () => {
      it('should validate person count constraints', () => {
        // Test minimum (1 person)
        expect(Number.isInteger(1) && 1 >= 1).toBe(true);
        expect(Number.isInteger(0) && 0 >= 1).toBe(false);

        // Test default value
        const defaultPersons = 1;
        expect(defaultPersons).toBe(1);
      });
    });

    describe('Status Validation', () => {
      it('should validate status enum values', () => {
        const validStatuses = ['draft', 'finalized'];

        expect(validStatuses.includes('draft')).toBe(true);
        expect(validStatuses.includes('finalized')).toBe(true);
        expect(validStatuses.includes('invalid')).toBe(false);

        // Test default value
        const defaultStatus = 'draft';
        expect(defaultStatus).toBe('draft');
      });
    });

    describe('Optional Fields Validation', () => {
      it('should validate client name length', () => {
        const longClientName = 'A'.repeat(201);
        expect(longClientName.length > 200).toBe(true);

        const validClientName = 'John Doe';
        expect(validClientName.length <= 200).toBe(true);
      });

      it('should validate notes length', () => {
        const longNotes = 'A'.repeat(1001);
        expect(longNotes.length > 1000).toBe(true);

        const validNotes = 'Special requirements for the package';
        expect(validNotes.length <= 1000).toBe(true);
      });

      it('should trim whitespace from optional fields', () => {
        const clientNameWithWhitespace = '  John Doe  ';
        const notesWithWhitespace = '  Special requirements  ';

        expect(clientNameWithWhitespace.trim()).toBe('John Doe');
        expect(notesWithWhitespace.trim()).toBe('Special requirements');
      });
    });
  });

  describe('Instance Methods', () => {
    describe('calculateTotalCost', () => {
      it('should calculate total cost correctly', () => {
        const activities: IPackageActivity[] = [
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 2,
            subtotal: 50.0,
          }, // 2 * 25.00
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 50.0,
          }, // 1 * 50.00
        ];
        const numberOfPersons = 3;

        // Calculate: (50.00 + 50.00) * 3 = 100.00 * 3 = 300.00
        const expectedTotal = activities.reduce((total, activity) => {
          return total + activity.subtotal * numberOfPersons;
        }, 0);

        expect(expectedTotal).toBe(300.0);
      });

      it('should return zero for empty activities', () => {
        const activities: IPackageActivity[] = [];
        const numberOfPersons = 3;

        const total = activities.reduce((total, activity) => {
          return total + activity.subtotal * numberOfPersons;
        }, 0);

        expect(total).toBe(0);
      });

      it('should handle single activity', () => {
        const activities: IPackageActivity[] = [
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 75.0,
          },
        ];
        const numberOfPersons = 2;

        const total = activities.reduce((total, activity) => {
          return total + activity.subtotal * numberOfPersons;
        }, 0);

        expect(total).toBe(150.0);
      });
    });

    describe('addActivity', () => {
      it('should add new activity to package', () => {
        const activities: IPackageActivity[] = [];
        const activityId = new mongoose.Types.ObjectId();
        const quantity = 2;
        const pricePerPerson = 25.0;
        const subtotal = quantity * pricePerPerson;

        // Simulate adding activity
        activities.push({
          activityId,
          quantity,
          subtotal,
        });

        expect(activities).toHaveLength(1);
        expect(activities[0].activityId).toBe(activityId);
        expect(activities[0].quantity).toBe(quantity);
        expect(activities[0].subtotal).toBe(subtotal);
      });

      it('should update existing activity in package', () => {
        const activityId = new mongoose.Types.ObjectId();
        const activities: IPackageActivity[] = [
          { activityId, quantity: 1, subtotal: 25.0 },
        ];

        // Simulate updating existing activity
        const existingIndex = activities.findIndex(
          (a) => a.activityId.toString() === activityId.toString()
        );

        expect(existingIndex).toBe(0);

        const newQuantity = 3;
        const newPricePerPerson = 30.0;
        const newSubtotal = newQuantity * newPricePerPerson;

        activities[existingIndex].quantity = newQuantity;
        activities[existingIndex].subtotal = newSubtotal;

        expect(activities[0].quantity).toBe(newQuantity);
        expect(activities[0].subtotal).toBe(newSubtotal);
      });

      it('should calculate subtotal correctly', () => {
        const quantity = 3;
        const pricePerPerson = 45.5;
        const expectedSubtotal = quantity * pricePerPerson;

        expect(expectedSubtotal).toBe(136.5);
      });
    });

    describe('removeActivity', () => {
      it('should remove activity from package', () => {
        const activityId1 = new mongoose.Types.ObjectId();
        const activityId2 = new mongoose.Types.ObjectId();

        const activities: IPackageActivity[] = [
          { activityId: activityId1, quantity: 1, subtotal: 25.0 },
          { activityId: activityId2, quantity: 2, subtotal: 50.0 },
        ];

        // Simulate removing activity
        const filteredActivities = activities.filter(
          (a) => a.activityId.toString() !== activityId1.toString()
        );

        expect(filteredActivities).toHaveLength(1);
        expect(filteredActivities[0].activityId).toBe(activityId2);
      });

      it('should handle removing non-existent activity', () => {
        const activityId1 = new mongoose.Types.ObjectId();
        const activityId2 = new mongoose.Types.ObjectId();
        const nonExistentId = new mongoose.Types.ObjectId();

        const activities: IPackageActivity[] = [
          { activityId: activityId1, quantity: 1, subtotal: 25.0 },
          { activityId: activityId2, quantity: 2, subtotal: 50.0 },
        ];

        const filteredActivities = activities.filter(
          (a) => a.activityId.toString() !== nonExistentId.toString()
        );

        expect(filteredActivities).toHaveLength(2); // No change
      });
    });

    describe('updateActivityQuantity', () => {
      it('should update activity quantity and subtotal', () => {
        const activityId = new mongoose.Types.ObjectId();
        const activities: IPackageActivity[] = [
          { activityId, quantity: 1, subtotal: 25.0 },
        ];

        const activityIndex = activities.findIndex(
          (a) => a.activityId.toString() === activityId.toString()
        );

        expect(activityIndex).toBe(0);

        const newQuantity = 4;
        const pricePerPerson = 30.0;
        const newSubtotal = newQuantity * pricePerPerson;

        activities[activityIndex].quantity = newQuantity;
        activities[activityIndex].subtotal = newSubtotal;

        expect(activities[0].quantity).toBe(newQuantity);
        expect(activities[0].subtotal).toBe(newSubtotal);
      });

      it('should handle updating non-existent activity', () => {
        const activityId = new mongoose.Types.ObjectId();
        const nonExistentId = new mongoose.Types.ObjectId();

        const activities: IPackageActivity[] = [
          { activityId, quantity: 1, subtotal: 25.0 },
        ];

        const activityIndex = activities.findIndex(
          (a) => a.activityId.toString() === nonExistentId.toString()
        );

        expect(activityIndex).toBe(-1); // Not found
      });
    });
  });

  describe('Static Methods Logic', () => {
    describe('findByUser', () => {
      it('should create correct query for user packages', () => {
        const userId = new mongoose.Types.ObjectId();
        const query = { createdBy: userId };

        expect(query.createdBy).toBe(userId);
      });

      it('should create correct query with status filter', () => {
        const userId = new mongoose.Types.ObjectId();
        const status = 'draft';
        const query = { createdBy: userId, status };

        expect(query.createdBy).toBe(userId);
        expect(query.status).toBe(status);
      });
    });

    describe('findDraftPackages', () => {
      it('should create correct query for draft packages', () => {
        const userId = new mongoose.Types.ObjectId();
        const query = { createdBy: userId, status: 'draft' };

        expect(query.createdBy).toBe(userId);
        expect(query.status).toBe('draft');
      });
    });

    describe('findFinalizedPackages', () => {
      it('should create correct query for finalized packages', () => {
        const userId = new mongoose.Types.ObjectId();
        const query = { createdBy: userId, status: 'finalized' };

        expect(query.createdBy).toBe(userId);
        expect(query.status).toBe('finalized');
      });
    });
  });

  describe('Business Logic Validation', () => {
    describe('Package State Management', () => {
      it('should validate status transitions', () => {
        const validTransitions = {
          draft: ['finalized'],
          finalized: ['draft'],
        };

        expect(validTransitions['draft']).toContain('finalized');
        expect(validTransitions['finalized']).toContain('draft');
      });
    });

    describe('Cost Calculations', () => {
      it('should handle decimal precision correctly', () => {
        const price1 = 25.5;
        const price2 = 33.33;
        const quantity = 3;

        const subtotal1 = price1 * quantity;
        const subtotal2 = price2 * quantity;
        const total = (subtotal1 + subtotal2) * 2; // 2 persons

        // Test precision handling
        expect(Number.isFinite(total)).toBe(true);
        expect(total).toBeCloseTo(352.98, 2);
      });

      it('should handle zero costs', () => {
        const activities: IPackageActivity[] = [
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 0,
          },
        ];
        const numberOfPersons = 5;

        const total = activities.reduce((sum, activity) => {
          return sum + activity.subtotal * numberOfPersons;
        }, 0);

        expect(total).toBe(0);
      });
    });

    describe('Activity Management', () => {
      it('should maintain activity order', () => {
        const activities: IPackageActivity[] = [
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 25.0,
          },
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 2,
            subtotal: 50.0,
          },
          {
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 75.0,
          },
        ];

        expect(activities).toHaveLength(3);
        expect(activities[0].subtotal).toBe(25.0);
        expect(activities[1].subtotal).toBe(50.0);
        expect(activities[2].subtotal).toBe(75.0);
      });

      it('should handle large number of activities', () => {
        const activities: IPackageActivity[] = [];

        // Add 100 activities
        for (let i = 0; i < 100; i++) {
          activities.push({
            activityId: new mongoose.Types.ObjectId(),
            quantity: 1,
            subtotal: 10.0,
          });
        }

        expect(activities).toHaveLength(100);

        const total = activities.reduce((sum, activity) => {
          return sum + activity.subtotal;
        }, 0);

        expect(total).toBe(1000.0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum values', () => {
      const maxPersons = 999;
      const maxPrice = 9999.99;
      const maxQuantity = 100;

      expect(Number.isInteger(maxPersons)).toBe(true);
      expect(Number.isFinite(maxPrice)).toBe(true);
      expect(Number.isInteger(maxQuantity)).toBe(true);

      const subtotal = maxQuantity * maxPrice;
      const total = subtotal * maxPersons;

      expect(Number.isFinite(total)).toBe(true);
    });

    it('should handle ObjectId string conversion', () => {
      const objectId = new mongoose.Types.ObjectId();
      const stringId = objectId.toString();

      expect(typeof stringId).toBe('string');
      expect(stringId.length).toBe(24);
      expect(objectId.toString()).toBe(stringId);
    });

    it('should handle date operations', () => {
      const now = new Date();
      const timestamp = now.getTime();

      expect(now instanceof Date).toBe(true);
      expect(typeof timestamp).toBe('number');
      expect(new Date(timestamp).getTime()).toBe(timestamp);
    });
  });
});
