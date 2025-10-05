import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ActivityPackage from '@/models/ActivityPackage';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

// GET /api/packages/[id] - Get specific package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid package ID',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const packageDoc = await ActivityPackage.findOne({
      _id: new mongoose.Types.ObjectId(id),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    }).populate({
      path: 'activities.activityId',
      model: Activity,
      select:
        'name category location pricePerPerson duration description isActive',
    });

    if (!packageDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Package not found',
          },
        },
        { status: 404 }
      );
    }

    // Transform response data
    const responsePackage = {
      ...packageDoc.toObject(),
      activities: packageDoc.activities.map((activity: any) => ({
        activityId: activity.activityId._id,
        activity: activity.activityId,
        quantity: activity.quantity,
        subtotal: activity.subtotal,
      })),
    };

    return NextResponse.json({
      success: true,
      data: responsePackage,
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch package',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/packages/[id] - Update package
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid package ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, activities, numberOfPersons, clientName, notes, status } =
      body;

    await connectToDatabase();

    // Check if package exists and belongs to user
    const existingPackage = await ActivityPackage.findOne({
      _id: new mongoose.Types.ObjectId(id),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!existingPackage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Package not found',
          },
        },
        { status: 404 }
      );
    }

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3) {
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
    }

    if (activities !== undefined) {
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

      existingPackage.activities = validatedActivities;
    }

    if (numberOfPersons !== undefined) {
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
      existingPackage.numberOfPersons = parseInt(numberOfPersons);
    }

    if (status !== undefined) {
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
      existingPackage.status = status;
    }

    // Update other fields
    if (name !== undefined) {
      existingPackage.name = name.trim();
    }
    if (clientName !== undefined) {
      existingPackage.clientName = clientName ? clientName.trim() : undefined;
    }
    if (notes !== undefined) {
      existingPackage.notes = notes ? notes.trim() : undefined;
    }

    await existingPackage.save();

    // Populate the activity data for response
    await existingPackage.populate({
      path: 'activities.activityId',
      model: Activity,
      select:
        'name category location pricePerPerson duration description isActive',
    });

    // Transform response data
    const responsePackage = {
      ...existingPackage.toObject(),
      activities: existingPackage.activities.map((activity: any) => ({
        activityId: activity.activityId._id,
        activity: activity.activityId,
        quantity: activity.quantity,
        subtotal: activity.subtotal,
      })),
    };

    return NextResponse.json({
      success: true,
      data: responsePackage,
    });
  } catch (error) {
    console.error('Error updating package:', error);

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
          message: 'Failed to update package',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/packages/[id] - Delete package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid package ID',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deletedPackage = await ActivityPackage.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!deletedPackage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Package not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Package deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete package',
        },
      },
      { status: 500 }
    );
  }
}
