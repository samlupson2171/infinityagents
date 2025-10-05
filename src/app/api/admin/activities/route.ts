import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import mongoose from 'mongoose';

// GET /api/admin/activities - Get all activities for admin management
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

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (category) {
      query.category = category;
    }

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    // Get activities with pagination
    const activities = await Activity.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments(query);

    // Get filter options
    const [categories, locations] = await Promise.all([
      Activity.distinct('category'),
      Activity.distinct('location'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          categories: categories.sort(),
          locations: locations.sort(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch activities',
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/activities - Create new activity
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
      isActive = true,
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
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

    if (
      !category ||
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

    if (
      !location ||
      typeof location !== 'string' ||
      location.trim().length < 2
    ) {
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

    if (!pricePerPerson || pricePerPerson < 0) {
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

    if (!minPersons || minPersons < 1) {
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

    if (!maxPersons || maxPersons < minPersons) {
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

    if (!availableFrom || !availableTo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Available from and to dates are required',
          },
        },
        { status: 400 }
      );
    }

    const fromDate = new Date(availableFrom);
    const toDate = new Date(availableTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format',
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

    if (
      !duration ||
      typeof duration !== 'string' ||
      duration.trim().length < 1
    ) {
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

    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length < 10
    ) {
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

    await connectToDatabase();

    // Check for duplicate activity (name + location)
    const existingActivity = await Activity.findOne({
      name: name.trim(),
      location: location.trim(),
    });

    if (existingActivity) {
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

    // Create the activity
    const activityData = {
      name: name.trim(),
      category: category.toLowerCase(),
      location: location.trim(),
      pricePerPerson: parseFloat(pricePerPerson),
      minPersons: parseInt(minPersons),
      maxPersons: parseInt(maxPersons),
      availableFrom: fromDate,
      availableTo: toDate,
      duration: duration.trim(),
      description: description.trim(),
      isActive: Boolean(isActive),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    };

    const newActivity = new Activity(activityData);
    await newActivity.save();

    // Populate creator info for response
    await newActivity.populate('createdBy', 'name email');

    return NextResponse.json(
      {
        success: true,
        data: newActivity,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating activity:', error);

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
          message: 'Failed to create activity',
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/activities - Bulk update activities
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { activityIds, operation, value } = body;

    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Activity IDs array is required',
          },
        },
        { status: 400 }
      );
    }

    if (
      !operation ||
      !['activate', 'deactivate', 'delete'].includes(operation)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Valid operation is required (activate, deactivate, delete)',
          },
        },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    const validIds = activityIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validIds.length !== activityIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid activity IDs provided',
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let result;
    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    switch (operation) {
      case 'activate':
        result = await Activity.updateMany(
          { _id: { $in: objectIds } },
          { $set: { isActive: true } }
        );
        break;

      case 'deactivate':
        result = await Activity.updateMany(
          { _id: { $in: objectIds } },
          { $set: { isActive: false } }
        );
        break;

      case 'delete':
        result = await Activity.deleteMany({ _id: { $in: objectIds } });
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        operation,
        affected: result.modifiedCount || result.deletedCount || 0,
        message: `Successfully ${operation}d ${result.modifiedCount || result.deletedCount || 0} activities`,
      },
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk operation',
        },
      },
      { status: 500 }
    );
  }
}
