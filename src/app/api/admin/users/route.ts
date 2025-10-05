import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactEmail: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(1, 'Company name is required'),
  websiteAddress: z.string().url('Valid website URL is required'),
  abtaPtsNumber: z.string().min(1, 'ABTA/PTS number is required'),
  role: z.enum(['agent', 'admin']).default('agent'),
  isApproved: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'approved', 'pending', or 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query based on status
    let query = {};
    if (status === 'approved') {
      query = { isApproved: true };
    } else if (status === 'pending') {
      query = { isApproved: false };
    }
    // 'all' or no status means no filter

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .populate('approvedBy', 'name contactEmail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch users',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    console.log('Received user data:', body);
    
    // Test ABTA/PTS format before validation
    const ABTA_PTS_REGEX = /^(ABTA|PTS)[A-Z0-9]{4,10}$/i;
    if (body.abtaPtsNumber && !ABTA_PTS_REGEX.test(body.abtaPtsNumber)) {
      console.error('Invalid ABTA/PTS format:', body.abtaPtsNumber);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ABTA_PTS',
            message: 'ABTA/PTS number must start with ABTA or PTS followed by 4-10 alphanumeric characters',
          },
        },
        { status: 400 }
      );
    }
    
    const userData = createUserSchema.parse(body);
    console.log('Validated user data:', userData);

    // Connect to database
    await connectDB();

    // Check if user with this email already exists
    const existingUser = await User.findOne({ contactEmail: userData.contactEmail });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Create new user (password will be hashed by the pre-save middleware)
    const userPayload = {
      ...userData,
      company: userData.companyName, // Map companyName to company field
      registrationStatus: 'approved', // Admin-created users are auto-approved
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Creating user with payload:', { ...userPayload, password: '[HIDDEN]' });
    
    const newUser = new User(userPayload);
    
    console.log('User model created, attempting to save...');
    await newUser.save();
    console.log('User saved successfully with ID:', newUser._id);

    // Return created user (without password)
    const createdUser = await User.findById(newUser._id).select('-password');

    return NextResponse.json({
      success: true,
      data: createdUser,
      message: 'User created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      console.error('Mongoose validation errors:', error.errors);
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        path: err.path,
        message: err.message,
        value: err.value
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MONGOOSE_VALIDATION_ERROR',
            message: 'Database validation failed',
            details: validationErrors,
          },
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyPattern, error.keyValue);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_KEY',
            message: 'A user with this email or ABTA/PTS number already exists',
            details: error.keyValue,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
