import { Resend } from 'resend';
import { Logger, EmailDeliveryError } from '@/lib/server-error-handling';

// Initialize Resend client
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new EmailDeliveryError('Resend API key is not configured. Please set RESEND_API_KEY environment variable.');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Verify Resend configuration
export async function verifyResendConfig(): Promise<boolean> {
  try {
    const resendClient = getResendClient();
    // Test the API key by making a simple request
    await resendClient.domains.list();
    Logger.info('Resend email service configuration verified successfully');
    return true;
  } catch (error) {
    Logger.error('Resend email service configuration verification failed', error);
    return false;
  }
}

// Enhanced email validation
function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateEmailData(data: any): void {
  if (!data.to || !validateEmailAddress(data.to)) {
    throw new EmailDeliveryError('Invalid recipient email address');
  }
  if (!data.subject || data.subject.trim().length === 0) {
    throw new EmailDeliveryError('Email subject is required');
  }
  if (!data.html && !data.text) {
    throw new EmailDeliveryError('Email content (HTML or text) is required');
  }
}

// Enhanced retry mechanism for email delivery
async function sendEmailWithRetry(
  emailData: any,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resendClient = getResendClient();
      const result = await resendClient.emails.send(emailData);
      console.log(`Email sent successfully on attempt ${attempt}:`, result.data?.id);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Email delivery attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Retrying email delivery in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  console.error(`Email delivery failed after ${maxRetries} attempts:`, lastError);
  throw lastError || new Error('Email delivery failed after all retries');
}

// Enhanced admin notification email for new agency registrations
export async function sendAdminNotificationEmail(data: {
  userName: string;
  companyName: string;
  contactEmail: string;
  abtaPtsNumber: string;
  websiteAddress: string;
  consortia?: string;
  userId: string;
}) {
  // Import User model dynamically to avoid circular dependencies
  const { default: User } = await import('@/models/User');
  
  try {
    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('contactEmail name');
    
    if (adminUsers.length === 0) {
      console.warn('No admin users found in the system for notification');
      return null;
    }

    const subject = 'New Agency Registration - Approval Required';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const adminDashboardUrl = `${baseUrl}/admin/dashboard`;
    const userManagementUrl = `${baseUrl}/admin/users`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0; font-size: 28px;">Infinity Weekends</h1>
          <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Admin Notification</p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #856404; margin-top: 0; display: flex; align-items: center;">
            <span style="margin-right: 10px;">🔔</span> New Agency Registration
          </h2>
          <p style="margin-bottom: 0; font-size: 16px; line-height: 1.6;">
            A new agency has registered and requires your approval to access the training platform.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 10px;">
            📋 Agency Registration Details
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; font-weight: bold; width: 160px; color: #495057; border-bottom: 1px solid #e9ecef;">Contact Name:</td>
              <td style="padding: 12px 0; color: #212529; border-bottom: 1px solid #e9ecef;">${data.userName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057; border-bottom: 1px solid #e9ecef;">Company:</td>
              <td style="padding: 12px 0; color: #212529; border-bottom: 1px solid #e9ecef;">${data.companyName}</td>
            </tr>
            ${data.consortia ? `
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057; border-bottom: 1px solid #e9ecef;">Consortia:</td>
              <td style="padding: 12px 0; color: #212529; border-bottom: 1px solid #e9ecef;">${data.consortia}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057; border-bottom: 1px solid #e9ecef;">Email:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                <a href="mailto:${data.contactEmail}" style="color: #007bff; text-decoration: none;">${data.contactEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057; border-bottom: 1px solid #e9ecef;">ABTA/PTS Number:</td>
              <td style="padding: 12px 0; color: #212529; border-bottom: 1px solid #e9ecef; font-family: monospace; background-color: #e9ecef; padding: 8px; border-radius: 4px;">${data.abtaPtsNumber}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057; border-bottom: 1px solid #e9ecef;">Website:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                <a href="${data.websiteAddress}" target="_blank" style="color: #007bff; text-decoration: none;">${data.websiteAddress}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #495057;">User ID:</td>
              <td style="padding: 12px 0; color: #6c757d; font-family: monospace; font-size: 12px;">${data.userId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 25px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #0056b3;">⚡ Quick Actions</h3>
          <p style="margin-bottom: 20px; line-height: 1.6;">
            Review and moderate this registration using the admin dashboard:
          </p>
          <div style="text-align: center;">
            <a href="${userManagementUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px 10px 0; font-weight: bold;">
              👥 Review Registration
            </a>
            <a href="${adminDashboardUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px 10px 0; font-weight: bold;">
              📊 Admin Dashboard
            </a>
          </div>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
          <p style="margin: 5px 0;">This is an automated notification from the Infinity Weekends Training Platform.</p>
          <p style="margin: 5px 0;">Registration submitted on ${new Date().toLocaleDateString('en-GB', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} Infinity Weekends. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send email to all admin users
    const emailPromises = adminUsers.map(async (admin) => {
      const emailData = {
        from: `Infinity Weekends <${process.env.RESEND_FROM_EMAIL || 'noreply@infinityweekends.co.uk'}>`,
        to: [admin.contactEmail],
        subject,
        html,
      };

      try {
        const result = await sendEmailWithRetry(emailData, 3, 1000);
        console.log(`Admin notification email sent to ${admin.contactEmail}:`, result.data?.id);
        return { success: true, email: admin.contactEmail, messageId: result.data?.id };
      } catch (error) {
        console.error(`Failed to send admin notification email to ${admin.contactEmail}:`, error);
        return { success: false, email: admin.contactEmail, error: (error as Error).message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.length - successful;

    console.log(`Admin notification emails: ${successful} sent successfully, ${failed} failed`);
    
    return {
      totalAdmins: adminUsers.length,
      successful,
      failed,
      results: results.map(result => result.status === 'fulfilled' ? result.value : { success: false, error: (result.reason as Error).message })
    };

  } catch (error) {
    console.error('Failed to send admin notification emails:', error);
    throw error;
  }
}

// Enhanced agency registration confirmation email
export async function sendRegistrationConfirmationEmail(data: {
  userName: string;
  userEmail: string;
  companyName: string;
  consortia?: string;
}) {
  const subject = 'Registration Confirmation - Infinity Weekends Training Platform';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007bff; margin: 0; font-size: 28px;">Infinity Weekends</h1>
        <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Training Platform</p>
      </div>
      
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 25px;">
        Registration Confirmation ✅
      </h2>
      
      <p style="font-size: 16px; line-height: 1.6;">Dear ${data.userName},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Thank you for registering with the Infinity Weekends Training Platform. We have successfully received your registration for <strong>${data.companyName}</strong>${data.consortia ? ` (${data.consortia})` : ''}.
      </p>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #856404; display: flex; align-items: center;">
          <span style="margin-right: 8px;">⏳</span> What Happens Next?
        </h3>
        <p style="margin-bottom: 0; line-height: 1.6;">
          Your account is currently pending approval. Our team will review your registration details and you will receive an email notification once your account has been approved. This process typically takes 1-2 business days.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px; color: #495057; margin: 0;">
          Thank you for choosing Infinity Weekends as your travel partner.
        </p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
        <p style="margin: 5px 0;">This is an automated message from the Infinity Weekends Training Platform.</p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Infinity Weekends. All rights reserved.</p>
      </div>
    </div>
  `;

  const emailData = {
    from: `Infinity Weekends <${process.env.RESEND_FROM_EMAIL || 'noreply@infinityweekends.co.uk'}>`,
    to: [data.userEmail],
    subject,
    html,
  };

  try {
    const result = await sendEmailWithRetry(emailData, 3, 1000);
    console.log('Agency registration confirmation email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('Failed to send agency registration confirmation email after retries:', error);
    throw error;
  }
}

// Enhanced approval notification email with contract link
export async function sendApprovalNotificationEmail(data: {
  userName: string;
  userEmail: string;
  companyName: string;
  consortia?: string;
  userId: string;
}) {
  const subject = 'Account Approved - Contract Signing Required - Infinity Weekends';

  // Generate secure contract access token
  const { generateContractAccessToken, createContractAccessUrl } = await import('./contract-tokens');
  const contractToken = generateContractAccessToken(data.userId, data.userEmail);
  const contractUrl = createContractAccessUrl(contractToken);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007bff; margin: 0; font-size: 28px;">Infinity Weekends</h1>
        <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Training Platform</p>
      </div>
      
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #155724; margin-top: 0; display: flex; align-items: center;">
          <span style="margin-right: 10px;">🎉</span> Congratulations! Your Account Has Been Approved
        </h2>
        <p style="margin-bottom: 0; font-size: 16px; line-height: 1.6;">
          Great news! Your registration for <strong>${data.companyName}</strong>${data.consortia ? ` (${data.consortia})` : ''} has been approved by our team.
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6;">Dear ${data.userName},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">
        Welcome to the Infinity Weekends partner network! We're excited to have you join our community of trusted travel professionals.
      </p>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #856404; display: flex; align-items: center;">
          <span style="margin-right: 8px;">📋</span> Important: Contract Signing Required
        </h3>
        <p style="margin-bottom: 15px; line-height: 1.6;">
          Before you can access the training platform and resources, you need to review and sign our partner agreement. This is a quick digital process that ensures we're both aligned on our partnership terms.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${contractUrl}" 
             style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
            📝 Review & Sign Contract
          </a>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #856404; text-align: center;">
          <strong>⏰ This link expires in 7 days</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px; color: #495057; margin: 0;">
          Thank you for choosing Infinity Weekends as your travel partner.
        </p>
        <p style="font-size: 14px; color: #6c757d; margin: 10px 0 0 0;">
          We look forward to a successful partnership!
        </p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
        <p style="margin: 5px 0;">This is an automated message from the Infinity Weekends Training Platform.</p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Infinity Weekends. All rights reserved.</p>
      </div>
    </div>
  `;

  const emailData = {
    from: `Infinity Weekends <${process.env.RESEND_FROM_EMAIL || 'noreply@infinityweekends.co.uk'}>`,
    to: [data.userEmail],
    subject,
    html,
  };

  try {
    const result = await sendEmailWithRetry(emailData, 3, 1000);
    console.log('Enhanced approval notification email with contract link sent:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
      contractToken,
      contractUrl,
    };
  } catch (error) {
    console.error('Failed to send enhanced approval notification email:', error);
    throw error;
  }
}

// User rejection notification email
export async function sendRejectionNotificationEmail(data: {
  userName: string;
  userEmail: string;
  companyName: string;
  reason?: string;
}) {
  const subject = 'Registration Update - Infinity Weekends Training Platform';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007bff; margin: 0; font-size: 28px;">Infinity Weekends</h1>
        <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Training Platform</p>
      </div>
      
      <h2 style="color: #333; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
        Registration Update
      </h2>
      
      <p>Dear ${data.userName},</p>
      
      <p>Thank you for your interest in the Infinity Weekends Training Platform for ${data.companyName}.</p>
      
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #721c24;">Registration Status</h3>
        <p>Unfortunately, we are unable to approve your registration at this time.</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      
      <p>If you believe this is an error or would like to discuss your registration, please contact us:</p>
      <ul>
        <li>Email: info@infinityweekends.co.uk</li>
        <li>Phone: [General Enquiries Number]</li>
      </ul>
      
      <p>We appreciate your interest in working with Infinity Weekends.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
        <p>This is an automated message from the Infinity Weekends Training Platform.</p>
      </div>
    </div>
  `;

  const emailData = {
    from: `Infinity Weekends <${process.env.RESEND_FROM_EMAIL || 'noreply@infinityweekends.co.uk'}>`,
    to: [data.userEmail],
    subject,
    html,
  };

  try {
    const result = await sendEmailWithRetry(emailData, 3, 1000);
    console.log('Rejection notification email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('Failed to send rejection notification email:', error);
    throw error;
  }
}

// Test email function for admin settings
export async function sendTestEmail(data: {
  toEmail: string;
  fromEmail: string;
  fromName: string;
}) {
  const subject = 'Test Email - Infinity Weekends Admin';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f97316;">Email Configuration Test</h2>
      <p>This is a test email to verify your Resend configuration is working correctly.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Configuration Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Service:</strong> Resend</li>
          <li><strong>From Email:</strong> ${data.fromEmail}</li>
          <li><strong>From Name:</strong> ${data.fromName}</li>
          <li><strong>To Email:</strong> ${data.toEmail}</li>
        </ul>
      </div>
      <p>If you received this email, your Resend email configuration is working properly!</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 14px;">
        This email was sent from the Infinity Weekends Admin Panel<br>
        Test performed at: ${new Date().toLocaleString()}
      </p>
    </div>
  `;

  const emailData = {
    from: `${data.fromName} <${data.fromEmail}>`,
    to: [data.toEmail],
    subject,
    html,
  };

  // Validate email data before sending
  validateEmailData({
    to: data.toEmail,
    subject,
    html
  });

  try {
    const result = await sendEmailWithRetry(emailData, 3, 1000);
    console.log('Test email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('Failed to send test email:', error);
    throw error;
  }
}

// Export the verification function for backward compatibility
export const verifyEmailConfig = verifyResendConfig;