import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { sendTestEmail } from '@/lib/resend-email';
import { z } from 'zod';

const emailSettingsSchema = z.object({
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  // Optional SMTP fields for backward compatibility
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  enableTLS: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const emailSettings = emailSettingsSchema.parse(body);

    // Send test email using Resend
    await sendTestEmail({
      toEmail: emailSettings.fromEmail, // Send test email to the from address
      fromEmail: emailSettings.fromEmail,
      fromName: emailSettings.fromName,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);

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

    // Handle Resend API errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESEND_API_ERROR',
            message: 'Invalid Resend API key. Please check your RESEND_API_KEY environment variable.',
          },
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('domain')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESEND_DOMAIN_ERROR',
            message: 'Email domain not verified in Resend. Please verify your domain or use a verified sending address.',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EMAIL_TEST_ERROR',
          message: error.message || 'Failed to send test email',
        },
      },
      { status: 500 }
    );
  }
}