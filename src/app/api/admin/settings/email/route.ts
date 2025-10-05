import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import mongoose from 'mongoose';
import { z } from 'zod';

// For now, we'll store settings in environment variables or a simple JSON file
// In production, you might want to use a database table for settings
const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535, 'Invalid port number'),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  enableTLS: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Connect to database
    await connectDB();

    // Get email settings from database
    const emailSettings = await Settings.getEmailSettings();

    // If no settings in database, return defaults from environment
    const defaultSettings = {
      smtpHost: emailSettings.smtpHost || process.env.SMTP_HOST || '',
      smtpPort: emailSettings.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: emailSettings.smtpUser || process.env.SMTP_USER || '',
      smtpPassword: emailSettings.smtpPassword || process.env.SMTP_PASSWORD || '',
      fromEmail: emailSettings.fromEmail || process.env.FROM_EMAIL || '',
      fromName: emailSettings.fromName || process.env.FROM_NAME || 'Infinity Weekends',
      enableTLS: emailSettings.enableTLS !== undefined ? emailSettings.enableTLS : (process.env.SMTP_TLS !== 'false'),
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings,
    });
  } catch (error: any) {
    console.error('Error fetching email settings:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email settings',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const emailSettings = emailSettingsSchema.parse(body);

    // Connect to database
    await connectDB();

    // Save email settings to database
    await Settings.setEmailSettings(emailSettings, new mongoose.Types.ObjectId(adminToken.sub));

    return NextResponse.json({
      success: true,
      message: 'Email settings saved successfully',
      data: emailSettings,
    });
  } catch (error: any) {
    console.error('Error saving email settings:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email settings',
            details: error.errors,
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
          message: 'Failed to save email settings',
        },
      },
      { status: 500 }
    );
  }
}