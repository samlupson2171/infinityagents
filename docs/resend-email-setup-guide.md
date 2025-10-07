# Resend Email Setup Guide

## Overview
This guide will help you set up Resend as your email service provider for the Infinity Weekends platform. Resend is a modern, reliable email API that's much easier to configure than traditional SMTP.

## Why Resend?
- ✅ **Simple Setup**: Just an API key, no complex SMTP configuration
- ✅ **High Deliverability**: Built for transactional emails
- ✅ **Reliable**: No authentication issues like with Microsoft 365
- ✅ **Free Tier**: 3,000 emails/month free
- ✅ **Great Analytics**: Track opens, clicks, and bounces
- ✅ **Modern API**: RESTful API with excellent documentation

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Sign Up" and create your account
3. Verify your email address

## Step 2: Get Your API Key

1. Once logged in, go to the **API Keys** section
2. Click "Create API Key"
3. Name it "Infinity Weekends Platform"
4. Select "Sending access" permissions
5. Copy the API key (starts with `re_`)

## Step 3: Set Up Your Domain (Recommended)

### Option A: Use Your Own Domain (Recommended for Production)
1. Go to **Domains** in your Resend dashboard
2. Click "Add Domain"
3. Enter your domain (e.g., `infinityweekends.co.uk`)
4. Add the DNS records shown to your domain provider
5. Wait for verification (usually takes a few minutes)

### Option B: Use Resend's Shared Domain (Quick Start)
- You can use `onboarding@resend.dev` for testing
- Not recommended for production use

## Step 4: Configure Environment Variables

Add these to your `.env.local` or `.env.production`:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Example Configuration:
```env
# Production Example
RESEND_API_KEY=re_AbCdEf123456789
RESEND_FROM_EMAIL=noreply@infinityweekends.co.uk

# Development/Testing Example  
RESEND_API_KEY=re_AbCdEf123456789
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## Step 5: Test Your Configuration

1. Restart your application
2. Go to **Admin → Settings → Email Settings**
3. Enter your "From" email and name
4. Click "Test Email with Resend"
5. Check your inbox for the test email

## Step 6: Verify Everything Works

Test these key email functions:
- **User Registration**: Register a new user and check for confirmation email
- **Admin Notifications**: Register should trigger admin notification
- **Quote Emails**: Create and send a quote to test quote functionality

## Troubleshooting

### Common Issues:

#### "Invalid API Key" Error
- Double-check your API key in the environment variables
- Make sure it starts with `re_`
- Ensure no extra spaces or characters

#### "Domain not verified" Error
- If using your own domain, ensure DNS records are properly configured
- Use `onboarding@resend.dev` for testing if domain verification is pending
- Check the Domains section in Resend dashboard for verification status

#### Emails Not Being Received
- Check spam/junk folders
- Verify the recipient email address is correct
- Check Resend dashboard for delivery status
- Ensure you're within your sending limits

#### Rate Limiting
- Free tier: 3,000 emails/month, 100 emails/day
- Paid plans have higher limits
- Check your usage in the Resend dashboard

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_AbCdEf123456789` |
| `RESEND_FROM_EMAIL` | Default sending email address | `noreply@yourdomain.com` |

## Resend Dashboard Features

- **Logs**: See all sent emails and their status
- **Analytics**: Track opens, clicks, and bounces  
- **Domains**: Manage your sending domains
- **API Keys**: Manage your API keys
- **Webhooks**: Set up event notifications (optional)

## Migration from SMTP

If you were previously using SMTP (like Microsoft 365), the migration is automatic:
1. Set up Resend as described above
2. The platform will automatically use Resend instead of SMTP
3. Old SMTP environment variables can be removed

## Pricing

- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Pro Plan**: $20/month for 50,000 emails
- **Business Plan**: $80/month for 100,000 emails

For most small to medium businesses, the free tier is sufficient to start.

## Support

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Resend Support**: Available through their dashboard
- **Status Page**: [status.resend.com](https://status.resend.com)

## Security Best Practices

1. **Keep API Keys Secret**: Never commit API keys to version control
2. **Use Environment Variables**: Store keys in `.env` files
3. **Rotate Keys Regularly**: Generate new API keys periodically
4. **Monitor Usage**: Keep an eye on your sending volume
5. **Verify Domains**: Use your own verified domain for production

## Next Steps

Once Resend is working:
1. Set up your own domain for professional emails
2. Configure webhooks for advanced tracking (optional)
3. Monitor your email analytics in the Resend dashboard
4. Consider upgrading to a paid plan as your volume grows

Your email system should now be much more reliable and easier to manage!