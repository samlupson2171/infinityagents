import nodemailer from 'nodemailer';
import { Logger, EmailDeliveryError } from '@/lib/server-error-handling';

// Email configuration with enhanced error handling
let transporter: nodemailer.Transporter | null = null;

function createTransporter(): nodemailer.Transporter {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new EmailDeliveryError('Email configuration is incomplete. Missing SMTP settings.');
  }

  const port = parseInt(process.env.SMTP_PORT || '587');
  const isMicrosoft365 = process.env.SMTP_HOST?.includes('office365.com') || process.env.SMTP_HOST?.includes('outlook.com');
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    requireTLS: port === 587, // Force STARTTLS for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Microsoft 365 specific configuration
    tls: isMicrosoft365 ? {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    } : undefined,
    // Enhanced configuration for better reliability
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    // Connection timeout
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

// Verify transporter configuration with enhanced logging
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    await transporterInstance.verify();
    Logger.info('Email server configuration verified successfully');
    return true;
  } catch (error) {
    Logger.error('Email server configuration verification failed', error);
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
  mailOptions: any,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully on attempt ${attempt}:`, info.messageId);
      return info;
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
          <img src="${baseUrl}/infinity-weekends-logo.png" 
               alt="Infinity Weekends Logo" 
               style="max-width: 200px; height: auto; margin-bottom: 10px;" />
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
        
        <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #495057;">📝 Next Steps</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Review the agency's credentials and website</li>
            <li>Verify the ABTA/PTS number if required</li>
            <li>Approve or reject the registration with optional comments</li>
            <li>The agency will be automatically notified of your decision</li>
          </ol>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6;">
            <strong>⏰ Response Time:</strong> Please review this registration within 2 business days to maintain good customer service standards.
          </p>
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
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: admin.contactEmail,
        subject,
        html,
      };

      try {
        const info = await sendEmailWithRetry(mailOptions, 3, 1000);
        console.log(`Admin notification email sent to ${admin.contactEmail}:`, info.messageId);
        return { success: true, email: admin.contactEmail, messageId: info.messageId };
      } catch (error) {
        console.error(`Failed to send admin notification email to ${admin.contactEmail}:`, error);
        return { success: false, email: admin.contactEmail, error: (error as Error).message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.length - successful;

    console.log(`Admin notification emails: ${successful} sent successfully, ${failed} failed`);
    
    if (failed > 0) {
      console.warn('Some admin notification emails failed to send:', 
        results.filter(result => result.status === 'fulfilled' && !result.value.success)
          .map(result => result.status === 'fulfilled' ? result.value : null)
          .filter(Boolean)
      );
    }

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

// Enhanced agency registration confirmation email with retry mechanism
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
        <img src="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/infinity-weekends-logo.png" 
             alt="Infinity Weekends Logo" 
             style="max-width: 200px; height: auto; margin-bottom: 10px;" />
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
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #495057;">📋 Registration Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 120px; color: #495057;">Name:</td>
            <td style="padding: 8px 0; color: #212529;">${data.userName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #495057;">Company:</td>
            <td style="padding: 8px 0; color: #212529;">${data.companyName}</td>
          </tr>
          ${data.consortia ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #495057;">Consortia:</td>
            <td style="padding: 8px 0; color: #212529;">${data.consortia}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
            <td style="padding: 8px 0; color: #212529;">${data.userEmail}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #0056b3;">🎯 Once Approved, You'll Have Access To:</h3>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Exclusive training materials and educational resources</li>
          <li>Current offers and promotional packages</li>
          <li>Professional inquiry submission system</li>
          <li>Direct contact with our specialist team</li>
          <li>Partner support and assistance</li>
        </ul>
      </div>
      
      <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #495057;">📞 Need Help?</h3>
        <p style="margin-bottom: 10px; line-height: 1.6;">
          If you have any questions or need immediate assistance, please don't hesitate to contact us:
        </p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Email:</strong> <a href="mailto:info@infinityweekends.co.uk" style="color: #007bff;">info@infinityweekends.co.uk</a></li>
          <li><strong>Phone:</strong> [General Enquiries Number]</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px; color: #495057; margin: 0;">
          Thank you for choosing Infinity Weekends as your travel partner.
        </p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; text-align: center;">
        <p style="margin: 5px 0;">This is an automated message from the Infinity Weekends Training Platform.</p>
        <p style="margin: 5px 0;">If you did not register for this account, please ignore this email.</p>
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Infinity Weekends. All rights reserved.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.userEmail,
    subject,
    html,
  };

  try {
    const info = await sendEmailWithRetry(mailOptions, 3, 1000);
    console.log('Agency registration confirmation email sent successfully:', info.messageId);
    return info;
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
        <img src="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/infinity-weekends-logo.png" 
             alt="Infinity Weekends Logo" 
             style="max-width: 200px; height: auto; margin-bottom: 10px;" />
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
      
      <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #0056b3;">🚀 What Happens After Contract Signing?</h3>
        <p style="margin-bottom: 15px; line-height: 1.6;">
          Once you've signed the contract, you'll immediately gain access to:
        </p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>📚 Exclusive Training Materials:</strong> Comprehensive destination guides and sales resources</li>
          <li><strong>🎯 Current Offers & Promotions:</strong> Real-time access to our latest packages and deals</li>
          <li><strong>📝 Professional Inquiry System:</strong> Streamlined booking and quote request process</li>
          <li><strong>📞 Direct Support Access:</strong> Priority contact with our specialist team</li>
          <li><strong>🤝 Partner Resources:</strong> Marketing materials and partnership support</li>
        </ul>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #495057;">📋 Your Registration Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; font-weight: bold; width: 140px; color: #495057; border-bottom: 1px solid #e9ecef;">Name:</td>
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
            <td style="padding: 12px 0; color: #212529; border-bottom: 1px solid #e9ecef;">${data.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; font-weight: bold; color: #495057;">Status:</td>
            <td style="padding: 12px 0; color: #28a745; font-weight: bold;">✅ Approved - Contract Pending</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f1f3f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #495057;">❓ Need Help?</h3>
        <p style="margin-bottom: 10px; line-height: 1.6;">
          If you have any questions about the contract or need assistance with the signing process:
        </p>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>Email:</strong> <a href="mailto:info@infinityweekends.co.uk" style="color: #007bff;">info@infinityweekends.co.uk</a></li>
          <li><strong>Phone:</strong> [General Enquiries Number]</li>
        </ul>
      </div>
      
      <div style="background-color: #e2e3e5; border: 1px solid #d1d3d4; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #383d41;">🔒 Security Notice</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
          The contract signing link above is secure and personalized for your account. If you didn't request this approval or believe this email was sent in error, please contact us immediately. Do not share this link with others.
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
        <p style="margin: 5px 0;">Approved on ${new Date().toLocaleDateString('en-GB', { 
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

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.userEmail,
    subject,
    html,
  };

  try {
    const info = await sendEmailWithRetry(mailOptions, 3, 1000);
    console.log('Enhanced approval notification email with contract link sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.userEmail,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Rejection notification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send rejection notification email:', error);
    throw error;
  }
}

// Enquiry notification email for Infinity Weekends
export async function sendEnquiryNotificationEmail(data: {
  enquiryId: string;
  leadName: string;
  tripType: 'stag' | 'hen' | 'other';
  firstChoiceDestination: string;
  secondChoiceDestination?: string;
  thirdChoiceDestination?: string;
  resort?: string;
  travelDate: Date;
  departureAirport: string;
  numberOfNights: number;
  numberOfGuests: number;
  eventsRequested: string[];
  accommodationType: 'hotel' | 'apartments';
  boardType: string;
  budgetPerPerson: number;
  additionalNotes?: string;
  agentName: string;
  agentCompany: string;
  agentEmail: string;
}) {
  const adminEmail = 'info@infinityweekends.co.uk';
  const subject = `New Enquiry - ${data.leadName} (${data.tripType.toUpperCase()})`;

  const formatTripType = (type: string) => {
    switch (type) {
      case 'stag':
        return 'Stag Do';
      case 'hen':
        return 'Hen Do';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        New Enquiry Received
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #495057;">Enquiry Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 200px; vertical-align: top;">Enquiry ID:</td>
            <td style="padding: 8px 0;">${data.enquiryId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Lead Name:</td>
            <td style="padding: 8px 0;">${data.leadName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Trip Type:</td>
            <td style="padding: 8px 0;">${formatTripType(data.tripType)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Destination Preferences:</td>
            <td style="padding: 8px 0;">
              1st Choice: ${data.firstChoiceDestination}
              ${data.secondChoiceDestination ? `<br>2nd Choice: ${data.secondChoiceDestination}` : ''}
              ${data.thirdChoiceDestination ? `<br>3rd Choice: ${data.thirdChoiceDestination}` : ''}
            </td>
          </tr>
          ${
            data.resort
              ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Specific Resort:</td>
            <td style="padding: 8px 0;">${data.resort}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Travel Date:</td>
            <td style="padding: 8px 0;">${formatDate(data.travelDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Departure Airport:</td>
            <td style="padding: 8px 0;">${data.departureAirport}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Duration:</td>
            <td style="padding: 8px 0;">${data.numberOfNights} night${data.numberOfNights !== 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Number of Guests:</td>
            <td style="padding: 8px 0;">${data.numberOfGuests}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Accommodation:</td>
            <td style="padding: 8px 0;">${data.accommodationType === 'hotel' ? 'Hotel' : 'Apartments'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Board Type:</td>
            <td style="padding: 8px 0;">${data.boardType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Budget per Person:</td>
            <td style="padding: 8px 0;">£${data.budgetPerPerson.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Total Budget:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #007bff;">£${(data.budgetPerPerson * data.numberOfGuests).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      ${
        data.eventsRequested.length > 0
          ? `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">Events Requested</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${data.eventsRequested.map((event) => `<li>${event}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }

      ${
        data.additionalNotes
          ? `
      <div style="background-color: #e2e3e5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #383d41;">Additional Notes</h3>
        <p style="margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
      </div>
      `
          : ''
      }

      <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0c5460;">Agent Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 120px;">Agent:</td>
            <td style="padding: 4px 0;">${data.agentName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Company:</td>
            <td style="padding: 4px 0;">${data.agentCompany}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Email:</td>
            <td style="padding: 4px 0;"><a href="mailto:${data.agentEmail}">${data.agentEmail}</a></td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
        <p>This enquiry was submitted through the Infinity Weekends Training Platform.</p>
        <p>Please respond to the agent directly at ${data.agentEmail}</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: adminEmail,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Enquiry notification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send enquiry notification email:', error);
    throw error;
  }
}

// Enquiry confirmation email for agents
export async function sendEnquiryConfirmationEmail(data: {
  enquiryId: string;
  leadName: string;
  tripType: 'stag' | 'hen' | 'other';
  firstChoiceDestination: string;
  secondChoiceDestination?: string;
  thirdChoiceDestination?: string;
  resort?: string;
  travelDate: Date;
  agentName: string;
  agentEmail: string;
}) {
  const subject = `Enquiry Confirmation - ${data.leadName} (${data.tripType.toUpperCase()})`;

  const formatTripType = (type: string) => {
    switch (type) {
      case 'stag':
        return 'Stag Do';
      case 'hen':
        return 'Hen Do';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
        Enquiry Submitted Successfully ✅
      </h2>
      
      <p>Dear ${data.agentName},</p>
      
      <p>Thank you for submitting an enquiry through the Infinity Weekends Training Platform. We have received your request and will respond as soon as possible.</p>
      
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #155724;">📋 Enquiry Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 140px;">Enquiry ID:</td>
            <td style="padding: 4px 0;">${data.enquiryId}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Lead Name:</td>
            <td style="padding: 4px 0;">${data.leadName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Trip Type:</td>
            <td style="padding: 4px 0;">${formatTripType(data.tripType)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Destinations:</td>
            <td style="padding: 4px 0;">
              1st: ${data.firstChoiceDestination}
              ${data.secondChoiceDestination ? `, 2nd: ${data.secondChoiceDestination}` : ''}
              ${data.thirdChoiceDestination ? `, 3rd: ${data.thirdChoiceDestination}` : ''}
            </td>
          </tr>
          ${
            data.resort
              ? `
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Resort:</td>
            <td style="padding: 4px 0;">${data.resort}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Travel Date:</td>
            <td style="padding: 4px 0;">${formatDate(data.travelDate)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">⏰ What Happens Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Our team will review your enquiry within 24 hours</li>
          <li>We'll prepare a detailed quote based on your requirements</li>
          <li>You'll receive a response directly to this email address</li>
          <li>We may contact you for additional information if needed</li>
        </ul>
      </div>
      
      <p>If you have any urgent questions or need to make changes to this enquiry, please contact us:</p>
      <ul>
        <li>Email: info@infinityweekends.co.uk</li>
        <li>Phone: [General Enquiries Number]</li>
        <li>Emergency: [Emergency Number]</li>
      </ul>
      
      <p>Thank you for choosing Infinity Weekends for your client's travel needs.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
        <p>This is an automated confirmation from the Infinity Weekends Training Platform.</p>
        <p>Please keep this email for your records. Reference ID: ${data.enquiryId}</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.agentEmail,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Enquiry confirmation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send enquiry confirmation email:', error);
    throw error;
  }
}

// Quote email template for sending quotes to clients
export async function sendQuoteEmail(data: {
  quoteId: string;
  quoteReference: string;
  leadName: string;
  agentEmail: string;
  agentName?: string;
  agentCompany?: string;
  hotelName: string;
  numberOfPeople: number;
  numberOfRooms: number;
  numberOfNights: number;
  arrivalDate: Date;
  isSuperPackage: boolean;
  whatsIncluded: string;
  transferIncluded: boolean;
  activitiesIncluded?: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  version: number;
}) {
  const subject = `Your Quote from Infinity Weekends - ${data.quoteReference}`;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const bookingUrl = `${baseUrl}/booking/interest?quote=${data.quoteId}`;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTripType = (type: string) => {
    switch (type) {
      case 'stag':
        return 'Stag Do';
      case 'hen':
        return 'Hen Do';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <img src="${baseUrl}/infinity-weekends-logo.png" 
             alt="Infinity Weekends Logo" 
             style="max-width: 300px; height: auto; margin-bottom: 15px;" />
        <h1 style="color: #007bff; margin: 0; font-size: 36px; font-weight: bold;">Infinity Weekends</h1>
        <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 16px; font-style: italic;">Your Perfect Weekend Getaway Awaits</p>
      </div>

      <!-- Quote Header -->
      <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
        <h2 style="margin: 0 0 10px 0; font-size: 28px;">Your Personalized Quote</h2>
        <p style="margin: 0; font-size: 18px; opacity: 0.9;">Quote Reference: <strong>${data.quoteReference}</strong></p>
        ${data.version > 1 ? `<p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">Version ${data.version} - Updated Quote</p>` : ''}
      </div>

      <!-- Personal Greeting -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 22px;">Dear ${data.leadName},</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #495057; margin-bottom: 0;">
          Thank you for your interest in Infinity Weekends! We're excited to present you with a tailored quote for your upcoming getaway. Our team has carefully crafted this package to ensure you have an unforgettable experience.
        </p>
      </div>

      <!-- Trip Summary -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          🏨 Your Trip Summary
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 140px;">Hotel:</td>
                <td style="padding: 8px 0; color: #212529; font-weight: 600;">${data.hotelName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Arrival Date:</td>
                <td style="padding: 8px 0; color: #212529;">${formatDate(data.arrivalDate)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Duration:</td>
                <td style="padding: 8px 0; color: #212529;">${data.numberOfNights} night${data.numberOfNights !== 1 ? 's' : ''}</td>
              </tr>
            </table>
          </div>
          <div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 140px;">Group Size:</td>
                <td style="padding: 8px 0; color: #212529;">${data.numberOfPeople} people</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Rooms:</td>
                <td style="padding: 8px 0; color: #212529;">${data.numberOfRooms} room${data.numberOfRooms !== 1 ? 's' : ''}</td>
              </tr>
              ${data.isSuperPackage ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Package Type:</td>
                <td style="padding: 8px 0; color: #dc3545; font-weight: bold;">⭐ Super Package</td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>
      </div>

      <!-- What's Included -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 20px; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          ✅ What's Included
        </h3>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 15px;">
          <p style="font-size: 16px; line-height: 1.8; color: #212529; margin: 0; white-space: pre-wrap;">${data.whatsIncluded}</p>
        </div>
        
        <!-- Additional Features -->
        <div style="margin-top: 20px;">
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${data.transferIncluded ? `
            <span style="background-color: #d4edda; color: #155724; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid #c3e6cb;">
              🚐 Transfer Included
            </span>
            ` : ''}
            ${data.isSuperPackage ? `
            <span style="background-color: #fff3cd; color: #856404; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid #ffeaa7;">
              ⭐ Super Package
            </span>
            ` : ''}
          </div>
        </div>

        ${data.activitiesIncluded ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
          <h4 style="margin: 0 0 10px 0; color: #0056b3; font-size: 16px;">🎯 Activities & Experiences</h4>
          <p style="margin: 0; color: #495057; line-height: 1.6;">${data.activitiesIncluded}</p>
        </div>
        ` : ''}
      </div>

      <!-- Pricing -->
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
        <h3 style="margin: 0 0 15px 0; font-size: 24px;">💰 Total Package Price</h3>
        <div style="font-size: 48px; font-weight: bold; margin: 20px 0;">${data.formattedPrice}</div>
        <div style="font-size: 18px; opacity: 0.9; margin-bottom: 15px;">
          ${(data.totalPrice / data.numberOfPeople).toLocaleString('en-GB', {
            style: 'currency',
            currency: data.currency
          })} per person
        </div>
        <p style="margin: 0; font-size: 14px; opacity: 0.8;">
          Based on ${data.numberOfPeople} people sharing ${data.numberOfRooms} room${data.numberOfRooms !== 1 ? 's' : ''}
        </p>
      </div>

      <!-- Call to Action -->
      <div style="background-color: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;">
        <h3 style="color: #333; margin-top: 0; font-size: 22px;">Ready to Book Your Adventure?</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #495057; margin-bottom: 25px;">
          This quote is valid for 7 days. Don't miss out on this amazing opportunity to create unforgettable memories!
        </p>
        
        <a href="${bookingUrl}" 
           style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); transition: all 0.3s ease;">
          🎉 I'd Like to Book This!
        </a>
        
        <p style="margin: 20px 0 0 0; font-size: 14px; color: #6c757d;">
          Click the button above to express your interest and start the booking process
        </p>
      </div>

      <!-- Contact Information -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 20px; border-bottom: 2px solid #6f42c1; padding-bottom: 10px;">
          📞 Questions? We're Here to Help!
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">Get in Touch</h4>
            <p style="margin: 5px 0; color: #212529;">
              <strong>📧 Email:</strong> <a href="mailto:info@infinityweekends.co.uk" style="color: #007bff; text-decoration: none;">info@infinityweekends.co.uk</a>
            </p>
            <p style="margin: 5px 0; color: #212529;">
              <strong>📱 Phone:</strong> [Phone Number]
            </p>
          </div>
          <div>
            <h4 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">Your Agent</h4>
            ${data.agentName ? `<p style="margin: 5px 0; color: #212529;"><strong>Name:</strong> ${data.agentName}</p>` : ''}
            ${data.agentCompany ? `<p style="margin: 5px 0; color: #212529;"><strong>Company:</strong> ${data.agentCompany}</p>` : ''}
            <p style="margin: 5px 0; color: #212529;">
              <strong>📧 Email:</strong> <a href="mailto:${data.agentEmail}" style="color: #007bff; text-decoration: none;">${data.agentEmail}</a>
            </p>
          </div>
        </div>
      </div>

      <!-- Why Choose Us -->
      <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; font-size: 20px; text-align: center;">🌟 Why Choose Infinity Weekends?</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🏆</div>
            <h4 style="margin: 0 0 5px 0; font-size: 14px;">Expert Planning</h4>
            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Years of experience creating perfect getaways</p>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">💯</div>
            <h4 style="margin: 0 0 5px 0; font-size: 14px;">Best Value</h4>
            <p style="margin: 0; font-size: 12px; opacity: 0.9;">Competitive prices with premium experiences</p>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; margin-bottom: 8px;">🤝</div>
            <h4 style="margin: 0 0 5px 0; font-size: 14px;">24/7 Support</h4>
            <p style="margin: 0; font-size: 12px; opacity: 0.9;">We're here whenever you need us</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #343a40; color: white; padding: 25px; border-radius: 12px; text-align: center;">
        <h3 style="margin: 0 0 15px 0; font-size: 18px;">Thank You for Choosing Infinity Weekends!</h3>
        <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.8;">
          We can't wait to help you create memories that will last a lifetime.
        </p>
        <div style="border-top: 1px solid #495057; padding-top: 15px; margin-top: 15px;">
          <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">
            Quote generated on ${new Date().toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">
            This quote is valid for 7 days from the date of issue.
          </p>
          <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">
            © ${new Date().getFullYear()} Infinity Weekends. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.agentEmail,
    subject,
    html,
  };

  try {
    validateEmailData(mailOptions);
    const info = await sendEmailWithRetry(mailOptions, 3, 1000);
    console.log(`Quote email sent successfully to ${data.agentEmail}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      quoteReference: data.quoteReference,
    };
  } catch (error) {
    console.error('Failed to send quote email:', error);
    throw new EmailDeliveryError(`Failed to send quote email: ${(error as Error).message}`);
  }
}

// Quote update notification email
export async function sendQuoteUpdateEmail(data: {
  quoteId: string;
  quoteReference: string;
  leadName: string;
  agentEmail: string;
  agentName?: string;
  agentCompany?: string;
  hotelName: string;
  totalPrice: number;
  currency: string;
  formattedPrice: string;
  version: number;
  previousVersion: number;
  changesDescription?: string;
}) {
  const subject = `Updated Quote from Infinity Weekends - ${data.quoteReference} (v${data.version})`;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const bookingUrl = `${baseUrl}/booking/interest?quote=${data.quoteId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; background-color: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <img src="${baseUrl}/infinity-weekends-logo.png" 
             alt="Infinity Weekends Logo" 
             style="max-width: 250px; height: auto; margin-bottom: 15px;" />
        <h1 style="color: #007bff; margin: 0; font-size: 32px; font-weight: bold;">Infinity Weekends</h1>
        <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 14px;">Quote Update Notification</p>
      </div>

      <!-- Update Notice -->
      <div style="background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #212529; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <h2 style="margin: 0 0 10px 0; font-size: 24px;">📝 Quote Updated</h2>
        <p style="margin: 0; font-size: 16px; font-weight: 600;">
          Quote Reference: <strong>${data.quoteReference}</strong>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">
          Version ${data.version} (Updated from v${data.previousVersion})
        </p>
      </div>

      <!-- Personal Greeting -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 20px;">Dear ${data.leadName},</h3>
        <p style="font-size: 16px; line-height: 1.6; color: #495057; margin-bottom: 0;">
          We've updated your quote based on your requirements. Please review the changes below and let us know if you have any questions.
        </p>
      </div>

      <!-- Changes Summary -->
      ${data.changesDescription ? `
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #17a2b8;">
        <h3 style="color: #333; margin-top: 0; font-size: 18px;">📋 What's Changed</h3>
        <p style="font-size: 15px; line-height: 1.6; color: #495057; margin: 0; white-space: pre-wrap;">${data.changesDescription}</p>
      </div>
      ` : ''}

      <!-- Updated Pricing -->
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <h3 style="margin: 0 0 15px 0; font-size: 22px;">💰 Updated Price</h3>
        <div style="font-size: 42px; font-weight: bold; margin: 15px 0;">${data.formattedPrice}</div>
        <p style="margin: 0; font-size: 14px; opacity: 0.8;">
          Hotel: ${data.hotelName}
        </p>
      </div>

      <!-- Call to Action -->
      <div style="background-color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;">
        <h3 style="color: #333; margin-top: 0; font-size: 20px;">Ready to Proceed?</h3>
        <p style="font-size: 15px; line-height: 1.6; color: #495057; margin-bottom: 20px;">
          If you're happy with the updated quote, click below to express your interest!
        </p>
        
        <a href="${bookingUrl}" 
           style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
          🎉 I'd Like to Book This!
        </a>
      </div>

      <!-- Contact Information -->
      <div style="background-color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="color: #333; margin-top: 0; font-size: 18px;">📞 Questions About the Changes?</h3>
        <p style="margin: 10px 0; color: #495057;">
          <strong>📧 Email:</strong> <a href="mailto:info@infinityweekends.co.uk" style="color: #007bff; text-decoration: none;">info@infinityweekends.co.uk</a>
        </p>
        ${data.agentName ? `<p style="margin: 10px 0; color: #495057;"><strong>Your Agent:</strong> ${data.agentName}</p>` : ''}
        <p style="margin: 10px 0; color: #495057;">
          <strong>Agent Email:</strong> <a href="mailto:${data.agentEmail}" style="color: #007bff; text-decoration: none;">${data.agentEmail}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #343a40; color: white; padding: 20px; border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px;">
          Thank you for your patience as we perfect your getaway!
        </p>
        <div style="border-top: 1px solid #495057; padding-top: 10px; margin-top: 10px;">
          <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">
            Quote updated on ${new Date().toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style="margin: 5px 0; font-size: 12px; opacity: 0.7;">
            © ${new Date().getFullYear()} Infinity Weekends. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data.agentEmail,
    subject,
    html,
  };

  try {
    validateEmailData(mailOptions);
    const info = await sendEmailWithRetry(mailOptions, 3, 1000);
    console.log(`Quote update email sent successfully to ${data.agentEmail}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      quoteReference: data.quoteReference,
    };
  } catch (error) {
    console.error('Failed to send quote update email:', error);
    throw new EmailDeliveryError(`Failed to send quote update email: ${(error as Error).message}`);
  }
}