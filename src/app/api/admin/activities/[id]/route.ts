import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

// GET /api/admin/activities/[id] - Get specific activity
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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity ID',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const activity = await Activity.findById(id).populate(
      'createdBy',
      'name email'
    );

    if (!activity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activity',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/activities/[id] - Update activity
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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      category,
      location,
      pricePerPerson,
      minPersons,
      maxPersons,
      availableFrom,
      availableTo,
      duration,
      description,
      isActive,
    } = body;

    await connectToDatabase();

    // Check if activity exists
    const existingActivity = await Activity.findById(id);

    if (!existingActivity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found',
          },
        },
        { status: 404 }
      );
    }

    // Validation for updated fields
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Activity name must be at least 3 characters long',
            },
          },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (category !== undefined) {
      if (
        ![
          'excursion',
          'show',
          'transport',
          'dining',
          'adventure',
          'cultural',
          'nightlife',
          'shopping',
        ].includes(category)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Valid category is required',
            },
          },
          { status: 400 }
        );
      }
      updates.category = category.toLowerCase();
    }

    if (location !== undefined) {
      if (typeof location !== 'string' || location.trim().length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Location must be at least 2 characters long',
            },
          },
          { status: 400 }
        );
      }
      updates.location = location.trim();
    }

    if (pricePerPerson !== undefined) {
      if (pricePerPerson < 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Price per person must be a positive number',
            },
          },
          { status: 400 }
        );
      }
      updates.pricePerPerson = parseFloat(pricePerPerson);
    }

    if (minPersons !== undefined) {
      if (minPersons < 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Minimum persons must be at least 1',
            },
          },
          { status: 400 }
        );
      }
      updates.minPersons = parseInt(minPersons);
    }

    if (maxPersons !== undefined) {
      const minValue = updates.minPersons || existingActivity.minPersons;
      if (maxPersons < minValue) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message:
                'Maximum persons must be greater than or equal to minimum persons',
            },
          },
          { status: 400 }
        );
      }
      updates.maxPersons = parseInt(maxPersons);
    }

    if (availableFrom !== undefined || availableTo !== undefined) {
      const fromDate = availableFrom
        ? new Date(availableFrom)
        : existingActivity.availableFrom;
      const toDate = availableTo
        ? new Date(availableTo)
        : existingActivity.availableTo;

      if (availableFrom && isNaN(fromDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid available from date format',
            },
          },
          { status: 400 }
        );
      }

      if (availableTo && isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid available to date format',
            },
          },
          { status: 400 }
        );
      }

      if (toDate <= fromDate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Available to date must be after available from date',
            },
          },
          { status: 400 }
        );
      }

      if (availableFrom) updates.availableFrom = fromDate;
      if (availableTo) updates.availableTo = toDate;
    }

    if (duration !== undefined) {
      if (typeof duration !== 'string' || duration.trim().length < 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Duration is required',
            },
          },
          { status: 400 }
        );
      }
      updates.duration = duration.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 10) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Description must be at least 10 characters long',
            },
          },
          { status: 400 }
        );
      }
      updates.description = description.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    // Check for duplicate if name or location is being updated
    if (updates.name || updates.location) {
      const checkName = updates.name || existingActivity.name;
      const checkLocation = updates.location || existingActivity.location;

      const duplicate = await Activity.findOne({
        _id: { $ne: id },
        name: checkName,
        location: checkLocation,
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message:
                'An activity with this name already exists in this location',
            },
          },
          { status: 400 }
        );
      }
    }

    // Update the activity
    const updatedActivity = await Activity.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: updatedActivity,
    });
  } catch (error) {
    console.error('Error updating activity:', error);

    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'An activity with this name already exists in this location',
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
          message: 'Failed to update activity',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/activities/[id] - Delete activity
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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity ID',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const deletedActivity = await Activity.findByIdAndDelete(id);

    if (!deletedActivity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Activity not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Activity deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete activity',
        },
      },
      { status: 500 }
    );
  }
}
