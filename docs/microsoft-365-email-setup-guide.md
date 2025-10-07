# Microsoft 365 Email Setup Guide

## Overview
This guide covers the best practices for setting up Microsoft 365 email with your Infinity Weekends application. There are several approaches depending on your security requirements and setup preferences.

## Option 1: App Passwords (Recommended for Basic Setup)

### Prerequisites
- Microsoft 365 Business account
- Multi-factor authentication (MFA) enabled on your account

### Steps:
1. **Enable App Passwords in Microsoft 365:**
   - Go to https://account.microsoft.com/security
   - Sign in with your Microsoft 365 account
   - Navigate to "Security" → "Advanced security options"
   - Under "App passwords", click "Create a new app password"
   - Name it "Infinity Weekends Platform" 
   - Copy the generated password (you'll only see it once)

2. **Configure Environment Variables:**
```env
# Microsoft 365 SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-app-password-here
SMTP_SECURE=false
```

## Option 2: OAuth 2.0 (Recommended for Production)

### Prerequisites
- Azure AD App Registration
- Microsoft Graph API permissions

### Steps:
1. **Register Application in Azure AD:**
   - Go to https://portal.azure.com
   - Navigate to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "Infinity Weekends Email Service"
   - Supported account types: "Accounts in this organizational directory only"
   - Click "Register"

2. **Configure API Permissions:**
   - In your app registration, go to "API permissions"
   - Click "Add a permission" → "Microsoft Graph" → "Application permissions"
   - Add: `Mail.Send`
   - Click "Grant admin consent"

3. **Create Client Secret:**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Email Service Secret"
   - Expires: Choose appropriate duration
   - Copy the secret value

4. **Environment Variables:**
```env
# OAuth 2.0 Configuration
AZURE_CLIENT_ID=your-application-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
EMAIL_FROM=your-email@yourdomain.com
```

## Option 3: SMTP with Modern Authentication (Hybrid Approach)

### Configuration:
```env
# Modern Auth SMTP
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_AUTH_METHOD=XOAUTH2
```

## Recommended Settings for Each Option

### Option 1 - App Passwords (Easiest Setup)
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=info@infinityweekends.co.uk
SMTP_PASS=your-16-character-app-password
SMTP_SECURE=false
```

### Common Microsoft 365 SMTP Settings:
- **Host:** smtp.office365.com
- **Port:** 587 (recommended) or 25
- **Security:** STARTTLS (not SSL)
- **Authentication:** Required

## Testing Your Configuration

1. **Using the Admin Panel:**
   - Go to Admin → Settings → Email Settings
   - Enter your configuration
   - Click "Test Email" to verify

2. **Manual Testing:**
```bash
# Test SMTP connection
telnet smtp.office365.com 587
```

## Troubleshooting Common Issues

### Issue 1: Authentication Failed
**Solution:** Ensure MFA is enabled and you're using an app password, not your regular password.

### Issue 2: Connection Timeout
**Solution:** Check firewall settings and ensure port 587 is open.

### Issue 3: "Less Secure Apps" Error
**Solution:** Microsoft 365 doesn't use "less secure apps" - use app passwords or OAuth 2.0.

### Issue 4: Relay Access Denied
**Solution:** Ensure you're authenticating with the correct credentials.

## Security Best Practices

1. **Use App Passwords:** Never use your main account password
2. **Enable MFA:** Required for app password generation
3. **Rotate Passwords:** Regularly update app passwords
4. **Monitor Usage:** Check email sending logs regularly
5. **Use OAuth 2.0:** For production environments

## Rate Limits

Microsoft 365 has the following limits:
- **Recipients per day:** 10,000
- **Messages per minute:** 30
- **Recipients per message:** 500

## Environment File Example

Create a `.env.production` file with:
```env
# Microsoft 365 Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=info@infinityweekends.co.uk
SMTP_PASS=your-app-password-here
SMTP_SECURE=false

# Email Display Settings
EMAIL_FROM_NAME=Infinity Weekends
EMAIL_FROM_ADDRESS=info@infinityweekends.co.uk
```

## Next Steps

1. Choose your preferred option (App Passwords recommended for quick setup)
2. Configure your Microsoft 365 account accordingly
3. Update your environment variables
4. Test the configuration using the admin panel
5. Monitor email delivery and logs

## Support

If you encounter issues:
1. Check Microsoft 365 admin center for any service issues
2. Verify your account has the necessary permissions
3. Test with a simple email client first
4. Check application logs for detailed error messages