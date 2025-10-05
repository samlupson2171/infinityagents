import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkActivityAvailability,
  checkActivityAvailabilityForDateRange,
  checkActivityExpiringSoon,
  getExpiredActivities,
  getExpiringSoonActivities,
  validatePackageAvailability,
  validatePackageAvailabilityForDateRange,
  validatePackageCapacity,
  getActivityAvailabilityStatus,
  filterActivitiesByAvailability,
  sortActivitiesByAvailability,
} from '../availability-utils';
import { IActivity, ActivityCategory } from '@/models/Activity';
import { IActivityPackage } from '@/models/ActivityPackage';

// Mock data
const createMockActivity = (overrides: Partial<IActivity> = {}): IActivity =>
  ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Activity',
    category: ActivityCategory.EXCURSION,
    location: 'Test Location',
    pricePerPerson: 25.0,
    minPersons: 2,
    maxPersons: 20,
    availableFrom: new Date('2024-01-01'),
    availableTo: new Date('2024-12-31'),
    duration: '2 hours',
    description: 'Test description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: '507f1f77bcf86cd799439012',
    isAvailable: () => true,
    isValidForDates: () => true,
    ...overrides,
  }) as IActivity;

const createMockPackage = (
  overrides: Partial<IActivityPackage> = {}
): IActivityPackage =>
  ({
    _id: '507f1f77bcf86cd799439013',
    name: 'Test Package',
    activities: [
      {
        activityId: '507f1f77bcf86cd799439011',
        quantity: 1,
        subtotal: 25.0,
      },
    ],
    totalCost: 75.0,
    numberOfPersons: 3,
    createdBy: '507f1f77bcf86cd799439014',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'draft',
    calculateTotalCost: () => 75.0,
    addActivity: () => {},
    removeActivity: () => {},
    updateActivityQuantity: () => {},
    ...overrides,
  }) as IActivityPackage;

describe('Availability Utils', () => {
  const now = new Date('2024-06-15T10:00:00Z');

  describe('checkActivityAvailability', () => {
    it('should return available for active activity within date range', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-12-31'),
      });

      const result = checkActivityAvailability(activity, now);

      expect(result.isAvailable).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return unavailable for inactive activity', () => {
      const activity = createMockActivity({
        isActive: false,
      });

      const result = checkActivityAvailability(activity, now);

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe('Activity is currently inactive');
    });

    it('should return unavailable for activity not yet available', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-07-01'),
        availableTo: new Date('2024-12-31'),
      });

      const result = checkActivityAvailability(activity, now);

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe('Activity is not yet available');
      expect(result.availableFrom).toEqual(new Date('2024-07-01'));
    });

    it('should return unavailable for expired activity', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-05-31'),
      });

      const result = checkActivityAvailability(activity, now);

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe('Activity availability period has expired');
      expect(result.availableTo).toEqual(new Date('2024-05-31'));
    });
  });

  describe('checkActivityAvailabilityForDateRange', () => {
    it('should return available for date range within activity availability', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-12-31'),
      });

      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const result = checkActivityAvailabilityForDateRange(
        activity,
        startDate,
        endDate
      );

      expect(result.isAvailable).toBe(true);
    });

    it('should return unavailable for start date before activity availability', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-06-01'),
        availableTo: new Date('2024-12-31'),
      });

      const startDate = new Date('2024-05-01');
      const endDate = new Date('2024-06-30');

      const result = checkActivityAvailabilityForDateRange(
        activity,
        startDate,
        endDate
      );

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe(
        'Activity is not available for the requested start date'
      );
    });

    it('should return unavailable for end date after activity availability', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-06-30'),
      });

      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-07-31');

      const result = checkActivityAvailabilityForDateRange(
        activity,
        startDate,
        endDate
      );

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toBe(
        'Activity is not available for the requested end date'
      );
    });
  });

  describe('checkActivityExpiringSoon', () => {
    it('should return true for activity expiring within threshold', () => {
      const activity = createMockActivity({
        availableTo: new Date('2024-07-01'), // 16 days from now
      });

      const result = checkActivityExpiringSoon(activity, 30, now);

      expect(result).toBe(true);
    });

    it('should return false for activity expiring beyond threshold', () => {
      const activity = createMockActivity({
        availableTo: new Date('2024-08-01'), // 47 days from now
      });

      const result = checkActivityExpiringSoon(activity, 30, now);

      expect(result).toBe(false);
    });

    it('should return false for already expired activity', () => {
      const activity = createMockActivity({
        availableTo: new Date('2024-05-01'), // Already expired
      });

      const result = checkActivityExpiringSoon(activity, 30, now);

      expect(result).toBe(false);
    });
  });

  describe('getExpiredActivities', () => {
    it('should return only expired activities', () => {
      const activities = [
        createMockActivity({
          _id: '1',
          name: 'Active Activity',
          availableTo: new Date('2024-12-31'),
        }),
        createMockActivity({
          _id: '2',
          name: 'Expired Activity',
          availableTo: new Date('2024-05-01'),
        }),
        createMockActivity({
          _id: '3',
          name: 'Another Expired',
          availableTo: new Date('2024-04-01'),
        }),
      ];

      const expired = getExpiredActivities(activities, now);

      expect(expired).toHaveLength(2);
      expect(expired[0].name).toBe('Expired Activity');
      expect(expired[1].name).toBe('Another Expired');
    });
  });

  describe('getExpiringSoonActivities', () => {
    it('should return activities expiring within threshold', () => {
      const activities = [
        createMockActivity({
          _id: '1',
          name: 'Far Future Activity',
          availableTo: new Date('2024-12-31'),
        }),
        createMockActivity({
          _id: '2',
          name: 'Expiring Soon',
          availableTo: new Date('2024-07-01'),
        }),
        createMockActivity({
          _id: '3',
          name: 'Already Expired',
          availableTo: new Date('2024-05-01'),
        }),
      ];

      const expiringSoon = getExpiringSoonActivities(activities, 30, now);

      expect(expiringSoon).toHaveLength(1);
      expect(expiringSoon[0].name).toBe('Expiring Soon');
    });
  });

  describe('validatePackageAvailability', () => {
    it('should return valid for package with all available activities', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          isActive: true,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-12-31'),
        }),
      ];

      const packageData = createMockPackage();

      const result = validatePackageAvailability(packageData, activities, now);

      expect(result.isValid).toBe(true);
      expect(result.unavailableActivities).toHaveLength(0);
    });

    it('should return invalid for package with unavailable activities', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          name: 'Inactive Activity',
          isActive: false,
        }),
      ];

      const packageData = createMockPackage();

      const result = validatePackageAvailability(packageData, activities, now);

      expect(result.isValid).toBe(false);
      expect(result.unavailableActivities).toHaveLength(1);
      expect(result.unavailableActivities[0].activityName).toBe(
        'Inactive Activity'
      );
      expect(result.unavailableActivities[0].reason).toBe(
        'Activity is currently inactive'
      );
    });

    it('should handle missing activities', () => {
      const activities: IActivity[] = []; // No activities
      const packageData = createMockPackage();

      const result = validatePackageAvailability(packageData, activities, now);

      expect(result.isValid).toBe(false);
      expect(result.unavailableActivities).toHaveLength(1);
      expect(result.unavailableActivities[0].reason).toBe('Activity not found');
    });

    it('should include warnings for expiring activities', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          name: 'Expiring Activity',
          isActive: true,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-07-01'), // Expiring soon
        }),
      ];

      const packageData = createMockPackage();

      const result = validatePackageAvailability(packageData, activities, now);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Expiring Activity');
    });
  });

  describe('validatePackageCapacity', () => {
    it('should return valid for package within capacity limits', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          minPersons: 2,
          maxPersons: 20,
        }),
      ];

      const packageData = createMockPackage({
        numberOfPersons: 5,
      });

      const result = validatePackageCapacity(packageData, activities);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return invalid for package below minimum capacity', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          name: 'Group Activity',
          minPersons: 5,
          maxPersons: 20,
        }),
      ];

      const packageData = createMockPackage({
        numberOfPersons: 3,
      });

      const result = validatePackageCapacity(packageData, activities);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issue).toBe('Minimum 5 persons required');
    });

    it('should return invalid for package above maximum capacity', () => {
      const activities = [
        createMockActivity({
          _id: '507f1f77bcf86cd799439011',
          name: 'Small Group Activity',
          minPersons: 2,
          maxPersons: 8,
        }),
      ];

      const packageData = createMockPackage({
        numberOfPersons: 15,
      });

      const result = validatePackageCapacity(packageData, activities);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].issue).toBe('Maximum 8 persons allowed');
    });
  });

  describe('getActivityAvailabilityStatus', () => {
    it('should return inactive status for inactive activity', () => {
      const activity = createMockActivity({ isActive: false });

      const result = getActivityAvailabilityStatus(activity, now);

      expect(result.status).toBe('inactive');
      expect(result.message).toBe('Inactive');
      expect(result.className).toBe('bg-gray-100 text-gray-800');
    });

    it('should return upcoming status for future activity', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-07-01'),
        availableTo: new Date('2024-12-31'),
      });

      const result = getActivityAvailabilityStatus(activity, now);

      expect(result.status).toBe('upcoming');
      expect(result.message).toContain('Available from');
      expect(result.className).toBe('bg-blue-100 text-blue-800');
    });

    it('should return expired status for past activity', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-05-01'),
      });

      const result = getActivityAvailabilityStatus(activity, now);

      expect(result.status).toBe('expired');
      expect(result.message).toContain('Expired on');
      expect(result.className).toBe('bg-red-100 text-red-800');
    });

    it('should return expiring-soon status for activity expiring within 30 days', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-07-01'),
      });

      const result = getActivityAvailabilityStatus(activity, now);

      expect(result.status).toBe('expiring-soon');
      expect(result.message).toContain('Expires');
      expect(result.className).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return available status for currently available activity', () => {
      const activity = createMockActivity({
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-12-31'),
      });

      const result = getActivityAvailabilityStatus(activity, now);

      expect(result.status).toBe('available');
      expect(result.message).toBe('Available');
      expect(result.className).toBe('bg-green-100 text-green-800');
    });
  });

  describe('filterActivitiesByAvailability', () => {
    const activities = [
      createMockActivity({
        _id: '1',
        name: 'Available',
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-12-31'),
      }),
      createMockActivity({
        _id: '2',
        name: 'Inactive',
        isActive: false,
      }),
      createMockActivity({
        _id: '3',
        name: 'Expired',
        isActive: true,
        availableFrom: new Date('2024-01-01'),
        availableTo: new Date('2024-05-01'),
      }),
    ];

    it('should return all activities for "all" filter', () => {
      const result = filterActivitiesByAvailability(activities, 'all');
      expect(result).toHaveLength(3);
    });

    it('should return only available activities', () => {
      const result = filterActivitiesByAvailability(
        activities,
        'available',
        now
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Available');
    });

    it('should return only inactive activities', () => {
      const result = filterActivitiesByAvailability(
        activities,
        'inactive',
        now
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Inactive');
    });

    it('should return only expired activities', () => {
      const result = filterActivitiesByAvailability(activities, 'expired', now);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Expired');
    });
  });

  describe('sortActivitiesByAvailability', () => {
    it('should sort activities by availability priority', () => {
      const activities = [
        createMockActivity({
          _id: '1',
          name: 'Expired',
          isActive: true,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-05-01'),
        }),
        createMockActivity({
          _id: '2',
          name: 'Available',
          isActive: true,
          availableFrom: new Date('2024-01-01'),
          availableTo: new Date('2024-12-31'),
        }),
        createMockActivity({
          _id: '3',
          name: 'Inactive',
          isActive: false,
        }),
      ];

      const sorted = sortActivitiesByAvailability(activities, now);

      expect(sorted[0].name).toBe('Available'); // Available first
      expect(sorted[1].name).toBe('Inactive'); // Inactive second
      expect(sorted[2].name).toBe('Expired'); // Expired last
    });
  });
});
