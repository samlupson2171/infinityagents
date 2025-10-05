import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535, 'Invalid port number'),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  enableTLS: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const emailSettings = emailSettingsSchema.parse(body);

    // Create transporter with the provided settings
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPassword,
      },
      tls: {
        rejectUnauthorized: emailSettings.enableTLS,
      },
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const testEmailContent = {
      from: `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`,
      to: emailSettings.fromEmail, // Send test email to the from address
      subject: 'Test Email - Infinity Weekends Admin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Email Configuration Test</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>SMTP Host:</strong> ${emailSettings.smtpHost}</li>
              <li><strong>SMTP Port:</strong> ${emailSettings.smtpPort}</li>
              <li><strong>From Email:</strong> ${emailSettings.fromEmail}</li>
              <li><strong>From Name:</strong> ${emailSettings.fromName}</li>
              <li><strong>TLS Enabled:</strong> ${emailSettings.enableTLS ? 'Yes' : 'No'}</li>
            </ul>
          </div>
          <p>If you received this email, your email configuration is working properly!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from the Infinity Weekends Admin Panel<br>
            Test performed at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: `
        Email Configuration Test
        
        This is a test email to verify your SMTP configuration is working correctly.
        
        Configuration Details:
        - SMTP Host: ${emailSettings.smtpHost}
        - SMTP Port: ${emailSettings.smtpPort}
        - From Email: ${emailSettings.fromEmail}
        - From Name: ${emailSettings.fromName}
        - TLS Enabled: ${emailSettings.enableTLS ? 'Yes' : 'No'}
        
        If you received this email, your email configuration is working properly!
        
        This email was sent from the Infinity Weekends Admin Panel
        Test performed at: ${new Date().toLocaleString()}
      `,
    };

    await transporter.sendMail(testEmailContent);

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

    // Handle SMTP errors
    if (error.code === 'EAUTH') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SMTP_AUTH_ERROR',
            message: 'SMTP authentication failed. Please check your username and password.',
          },
        },
        { status: 400 }
      );
    }

    if (error.code === 'ECONNECTION') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SMTP_CONNECTION_ERROR',
            message: 'Could not connect to SMTP server. Please check your host and port settings.',
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