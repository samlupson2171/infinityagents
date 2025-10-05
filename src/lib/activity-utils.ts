import Activity, { IActivity } from '../models/Activity';
import { ActivityCSVRow } from './csv-parser';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingActivity?: IActivity;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{
    row: ActivityCSVRow;
    error: string;
  }>;
}

/**
 * Check if an activity already exists based on name and location
 */
export async function checkForDuplicate(
  name: string,
  location: string
): Promise<DuplicateCheckResult> {
  try {
    // Escape special regex characters and create case-insensitive exact match
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const existingActivity = await Activity.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }, // Case-insensitive exact match
      location: { $regex: new RegExp(`^${escapedLocation}$`, 'i') }, // Case-insensitive exact match
    });

    return {
      isDuplicate: !!existingActivity,
      existingActivity: existingActivity || undefined,
    };
  } catch (error) {
    console.error('Error checking for duplicate activity:', error);
    return { isDuplicate: false };
  }
}

/**
 * Import activities from CSV data, handling duplicates by updating existing records
 */
export async function importActivities(
  csvData: ActivityCSVRow[],
  createdBy: string
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    updated: 0,
    errors: [],
  };

  for (const row of csvData) {
    try {
      const duplicateCheck = await checkForDuplicate(row.name, row.location);

      const activityData = {
        name: row.name,
        category: row.category,
        location: row.location,
        pricePerPerson: row.pricePerPerson,
        minPersons: row.minPersons,
        maxPersons: row.maxPersons,
        availableFrom: row.availableFrom,
        availableTo: row.availableTo,
        duration: row.duration,
        description: row.description,
        isActive: true,
        createdBy,
      };

      if (duplicateCheck.isDuplicate && duplicateCheck.existingActivity) {
        // Update existing activity
        await Activity.findByIdAndUpdate(
          duplicateCheck.existingActivity._id,
          {
            ...activityData,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true }
        );
        result.updated++;
      } else {
        // Create new activity
        await Activity.create(activityData);
        result.created++;
      }
    } catch (error) {
      result.errors.push({
        row,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  return result;
}

/**
 * Validate activity availability for a given date range
 */
export function isActivityAvailableForDates(
  activity: IActivity,
  startDate: Date,
  endDate: Date
): boolean {
  return (
    activity.isActive &&
    activity.availableFrom <= startDate &&
    activity.availableTo >= endDate
  );
}

/**
 * Calculate total cost for activities in a package
 */
export function calculatePackageCost(
  activities: Array<{ pricePerPerson: number; quantity: number }>,
  numberOfPersons: number
): number {
  return activities.reduce((total, activity) => {
    return (
      total + activity.pricePerPerson * activity.quantity * numberOfPersons
    );
  }, 0);
}

/**
 * Generate a unique package name if one is not provided
 */
export function generatePackageName(clientName?: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

  if (clientName) {
    return `${clientName} Package - ${timestamp} - ${randomSuffix}`;
  }

  return `Activity Package - ${timestamp} - ${randomSuffix}`;
}

/**
 * Validate that all activities in a package are still available
 */
export async function validatePackageActivities(
  activityIds: string[]
): Promise<{
  valid: boolean;
  unavailableActivities: string[];
}> {
  try {
    const activities = await Activity.find({
      _id: { $in: activityIds },
      isActive: false,
    }).select('_id name');

    const unavailableActivities = activities.map((activity) => activity.name);

    return {
      valid: unavailableActivities.length === 0,
      unavailableActivities,
    };
  } catch (error) {
    console.error('Error validating package activities:', error);
    return {
      valid: false,
      unavailableActivities: [],
    };
  }
}

/**
 * Get unique locations from all activities for filter dropdown
 */
export async function getUniqueLocations(): Promise<string[]> {
  try {
    const locations = await Activity.distinct('location', { isActive: true });
    return locations.sort();
  } catch (error) {
    console.error('Error fetching unique locations:', error);
    return [];
  }
}

/**
 * Get activity statistics for admin dashboard
 */
export async function getActivityStatistics(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
  byLocation: Record<string, number>;
}> {
  try {
    const [total, active, inactive, categoryStats, locationStats] =
      await Promise.all([
        Activity.countDocuments(),
        Activity.countDocuments({ isActive: true }),
        Activity.countDocuments({ isActive: false }),
        Activity.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
        Activity.aggregate([
          { $group: { _id: '$location', count: { $sum: 1 } } },
        ]),
      ]);

    const byCategory: Record<string, number> = {};
    categoryStats.forEach((stat: any) => {
      byCategory[stat._id] = stat.count;
    });

    const byLocation: Record<string, number> = {};
    locationStats.forEach((stat: any) => {
      byLocation[stat._id] = stat.count;
    });

    return {
      total,
      active,
      inactive,
      byCategory,
      byLocation,
    };
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      byCategory: {},
      byLocation: {},
    };
  }
}
