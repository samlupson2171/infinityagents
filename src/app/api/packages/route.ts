import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ActivityPackage from '@/models/ActivityPackage';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

// GET /api/packages - Get user's packages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    };
    if (status && ['draft', 'finalized'].includes(status)) {
      query.status = status;
    }

    // Get packages with populated activity data
    const packages = await ActivityPackage.find(query)
      .populate({
        path: 'activities.activityId',
        model: Activity,
        select:
          'name category location pricePerPerson duration description isActive',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await ActivityPackage.countDocuments(query);

    // Transform the data to include activity details
    const transformedPackages = packages.map((pkg) => ({
      ...pkg,
      activities: pkg.activities.map((activity: any) => ({
        activityId: activity.activityId._id,
        activity: activity.activityId,
        quantity: activity.quantity,
        subtotal: activity.subtotal,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        packages: transformedPackages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch packages',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/packages - Create new package
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      activities,
      numberOfPersons,
      clientName,
      notes,
      status = 'draft',
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Package name must be at least 3 characters long',
          },
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(activities)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Activities must be an array',
          },
        },
        { status: 400 }
      );
    }

    if (!numberOfPersons || numberOfPersons < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Number of persons must be at least 1',
          },
        },
        { status: 400 }
      );
    }

    if (!['draft', 'finalized'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status must be either draft or finalized',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Validate that all activities exist and are active
    const activityIds = activities.map(
      (a: any) => new mongoose.Types.ObjectId(a.activityId)
    );
    const existingActivities = await Activity.find({
      _id: { $in: activityIds },
      isActive: true,
    });

    if (existingActivities.length !== activityIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'One or more activities are invalid or inactive',
          },
        },
        { status: 400 }
      );
    }

    // Validate activity data and calculate subtotals
    const validatedActivities = activities.map((activity: any) => {
      const existingActivity = existingActivities.find(
        (a: any) => a._id.toString() === activity.activityId
      );

      if (!existingActivity) {
        throw new Error(`Activity ${activity.activityId} not found`);
      }

      const quantity = parseInt(activity.quantity);
      if (!quantity || quantity < 1) {
        throw new Error('Activity quantity must be at least 1');
      }

      const subtotal = quantity * existingActivity.pricePerPerson;

      return {
        activityId: new mongoose.Types.ObjectId(activity.activityId),
        quantity,
        subtotal,
      };
    });

    // Create the package
    const packageData = {
      name: name.trim(),
      activities: validatedActivities,
      numberOfPersons: parseInt(numberOfPersons),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      status,
      ...(clientName && { clientName: clientName.trim() }),
      ...(notes && { notes: notes.trim() }),
    };

    const newPackage = new ActivityPackage(packageData);
    await newPackage.save();

    // Populate the activity data for response
    await newPackage.populate({
      path: 'activities.activityId',
      model: Activity,
      select:
        'name category location pricePerPerson duration description isActive',
    });

    // Transform response data
    const responsePackage = {
      ...newPackage.toObject(),
      activities: newPackage.activities.map((activity: any) => ({
        activityId: activity.activityId._id,
        activity: activity.activityId,
        quantity: activity.quantity,
        subtotal: activity.subtotal,
      })),
    };

    return NextResponse.json(
      {
        success: true,
        data: responsePackage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating package:', error);

    if (
      error instanceof Error &&
      error.message.includes('Activity') &&
      error.message.includes('not found')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create package',
        },
      },
      { status: 500 }
    );
  }
}
