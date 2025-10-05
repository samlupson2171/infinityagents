import { IActivity } from '@/models/Activity';
import { IActivityPackage } from '@/models/ActivityPackage';

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  availableFrom?: Date;
  availableTo?: Date;
}

export interface PackageAvailabilityCheck {
  isValid: boolean;
  unavailableActivities: {
    activityId: string;
    activityName: string;
    reason: string;
  }[];
  warnings: string[];
}

/**
 * Check if an activity is currently available
 */
export function checkActivityAvailability(
  activity: IActivity,
  checkDate?: Date
): AvailabilityCheck {
  const now = checkDate || new Date();

  // Check if activity is active
  if (!activity.isActive) {
    return {
      isAvailable: false,
      reason: 'Activity is currently inactive',
    };
  }

  // Check if current date is within availability range
  if (now < activity.availableFrom) {
    return {
      isAvailable: false,
      reason: 'Activity is not yet available',
      availableFrom: activity.availableFrom,
    };
  }

  if (now > activity.availableTo) {
    return {
      isAvailable: false,
      reason: 'Activity availability period has expired',
      availableTo: activity.availableTo,
    };
  }

  return {
    isAvailable: true,
  };
}

/**
 * Check if an activity is available for a specific date range
 */
export function checkActivityAvailabilityForDateRange(
  activity: IActivity,
  startDate: Date,
  endDate: Date
): AvailabilityCheck {
  // Check if activity is active
  if (!activity.isActive) {
    return {
      isAvailable: false,
      reason: 'Activity is currently inactive',
    };
  }

  // Check if the requested date range is within the activity's availability period
  if (startDate < activity.availableFrom) {
    return {
      isAvailable: false,
      reason: 'Activity is not available for the requested start date',
      availableFrom: activity.availableFrom,
    };
  }

  if (endDate > activity.availableTo) {
    return {
      isAvailable: false,
      reason: 'Activity is not available for the requested end date',
      availableTo: activity.availableTo,
    };
  }

  return {
    isAvailable: true,
  };
}

/**
 * Check if an activity will expire soon (within specified days)
 */
export function checkActivityExpiringSoon(
  activity: IActivity,
  daysThreshold: number = 30,
  checkDate?: Date
): boolean {
  const now = checkDate || new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(now.getDate() + daysThreshold);

  return activity.availableTo <= thresholdDate && activity.availableTo > now;
}

/**
 * Get activities that have expired
 */
export function getExpiredActivities(
  activities: IActivity[],
  checkDate?: Date
): IActivity[] {
  const now = checkDate || new Date();
  return activities.filter((activity) => activity.availableTo < now);
}

/**
 * Get activities that are expiring soon
 */
export function getExpiringSoonActivities(
  activities: IActivity[],
  daysThreshold: number = 30,
  checkDate?: Date
): IActivity[] {
  return activities.filter((activity) =>
    checkActivityExpiringSoon(activity, daysThreshold, checkDate)
  );
}

/**
 * Validate package availability - check all activities in a package
 */
export function validatePackageAvailability(
  packageData: IActivityPackage,
  activities: IActivity[],
  checkDate?: Date
): PackageAvailabilityCheck {
  const unavailableActivities: PackageAvailabilityCheck['unavailableActivities'] =
    [];
  const warnings: string[] = [];

  for (const packageActivity of packageData.activities) {
    const activity = activities.find(
      (a) => a._id.toString() === packageActivity.activityId.toString()
    );

    if (!activity) {
      unavailableActivities.push({
        activityId: packageActivity.activityId.toString(),
        activityName: 'Unknown Activity',
        reason: 'Activity not found',
      });
      continue;
    }

    const availabilityCheck = checkActivityAvailability(activity, checkDate);

    if (!availabilityCheck.isAvailable) {
      unavailableActivities.push({
        activityId: activity._id.toString(),
        activityName: activity.name,
        reason: availabilityCheck.reason || 'Activity is not available',
      });
    } else {
      // Check for warnings (expiring soon)
      if (checkActivityExpiringSoon(activity, 30, checkDate)) {
        warnings.push(
          `Activity "${activity.name}" expires on ${activity.availableTo.toLocaleDateString()}`
        );
      }
    }
  }

  return {
    isValid: unavailableActivities.length === 0,
    unavailableActivities,
    warnings,
  };
}

/**
 * Validate package availability for a specific date range
 */
export function validatePackageAvailabilityForDateRange(
  packageData: IActivityPackage,
  activities: IActivity[],
  startDate: Date,
  endDate: Date
): PackageAvailabilityCheck {
  const unavailableActivities: PackageAvailabilityCheck['unavailableActivities'] =
    [];
  const warnings: string[] = [];

  for (const packageActivity of packageData.activities) {
    const activity = activities.find(
      (a) => a._id.toString() === packageActivity.activityId.toString()
    );

    if (!activity) {
      unavailableActivities.push({
        activityId: packageActivity.activityId.toString(),
        activityName: 'Unknown Activity',
        reason: 'Activity not found',
      });
      continue;
    }

    const availabilityCheck = checkActivityAvailabilityForDateRange(
      activity,
      startDate,
      endDate
    );

    if (!availabilityCheck.isAvailable) {
      unavailableActivities.push({
        activityId: activity._id.toString(),
        activityName: activity.name,
        reason:
          availabilityCheck.reason ||
          'Activity is not available for the requested dates',
      });
    }
  }

  return {
    isValid: unavailableActivities.length === 0,
    unavailableActivities,
    warnings,
  };
}

/**
 * Check if a package has capacity constraints that might affect booking
 */
export function validatePackageCapacity(
  packageData: IActivityPackage,
  activities: IActivity[]
): {
  isValid: boolean;
  issues: {
    activityId: string;
    activityName: string;
    issue: string;
    minPersons: number;
    maxPersons: number;
    requestedPersons: number;
  }[];
} {
  const issues: any[] = [];

  for (const packageActivity of packageData.activities) {
    const activity = activities.find(
      (a) => a._id.toString() === packageActivity.activityId.toString()
    );

    if (!activity) continue;

    const requestedPersons = packageData.numberOfPersons;

    if (requestedPersons < activity.minPersons) {
      issues.push({
        activityId: activity._id.toString(),
        activityName: activity.name,
        issue: `Minimum ${activity.minPersons} persons required`,
        minPersons: activity.minPersons,
        maxPersons: activity.maxPersons,
        requestedPersons,
      });
    }

    if (requestedPersons > activity.maxPersons) {
      issues.push({
        activityId: activity._id.toString(),
        activityName: activity.name,
        issue: `Maximum ${activity.maxPersons} persons allowed`,
        minPersons: activity.minPersons,
        maxPersons: activity.maxPersons,
        requestedPersons,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Get availability status for display
 */
export function getActivityAvailabilityStatus(
  activity: IActivity,
  checkDate?: Date
): {
  status: 'available' | 'expired' | 'inactive' | 'upcoming' | 'expiring-soon';
  message: string;
  className: string;
} {
  const now = checkDate || new Date();

  if (!activity.isActive) {
    return {
      status: 'inactive',
      message: 'Inactive',
      className: 'bg-gray-100 text-gray-800',
    };
  }

  if (now < activity.availableFrom) {
    return {
      status: 'upcoming',
      message: `Available from ${activity.availableFrom.toLocaleDateString()}`,
      className: 'bg-blue-100 text-blue-800',
    };
  }

  if (now > activity.availableTo) {
    return {
      status: 'expired',
      message: `Expired on ${activity.availableTo.toLocaleDateString()}`,
      className: 'bg-red-100 text-red-800',
    };
  }

  if (checkActivityExpiringSoon(activity, 30, now)) {
    return {
      status: 'expiring-soon',
      message: `Expires ${activity.availableTo.toLocaleDateString()}`,
      className: 'bg-yellow-100 text-yellow-800',
    };
  }

  return {
    status: 'available',
    message: 'Available',
    className: 'bg-green-100 text-green-800',
  };
}

/**
 * Filter activities by availability status
 */
export function filterActivitiesByAvailability(
  activities: IActivity[],
  status:
    | 'all'
    | 'available'
    | 'expired'
    | 'inactive'
    | 'upcoming'
    | 'expiring-soon',
  checkDate?: Date
): IActivity[] {
  if (status === 'all') {
    return activities;
  }

  return activities.filter((activity) => {
    const availabilityStatus = getActivityAvailabilityStatus(
      activity,
      checkDate
    );
    return availabilityStatus.status === status;
  });
}

/**
 * Sort activities by availability priority (available first, then expiring soon, etc.)
 */
export function sortActivitiesByAvailability(
  activities: IActivity[],
  checkDate?: Date
): IActivity[] {
  const statusPriority = {
    available: 1,
    'expiring-soon': 2,
    upcoming: 3,
    inactive: 4,
    expired: 5,
  };

  return [...activities].sort((a, b) => {
    const statusA = getActivityAvailabilityStatus(a, checkDate).status;
    const statusB = getActivityAvailabilityStatus(b, checkDate).status;

    const priorityA = statusPriority[statusA];
    const priorityB = statusPriority[statusB];

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority, sort by availability end date (soonest first for expiring)
    if (statusA === 'expiring-soon' && statusB === 'expiring-soon') {
      return a.availableTo.getTime() - b.availableTo.getTime();
    }

    // Default to alphabetical by name
    return a.name.localeCompare(b.name);
  });
}
