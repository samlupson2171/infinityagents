# Quote System Production Deployment Guide

This guide covers the deployment and configuration of the Enquiry Quoting System for production environments.

## Prerequisites

- MongoDB database with proper indexes
- Email service configuration (SMTP or service provider)
- Admin user accounts with proper permissions
- SSL certificates for secure email delivery

## 1. Database Migration

### Run Quote Schema Migration

The quote system requires a new collection and schema updates. Run the migration:

```bash
# Run the quote collection migration
npm run migrate:quotes

# Or run all migrations
npm run migrate
```

### Verify Database Schema

Ensure the following collections exist with proper indexes:

- `quotes` collection with indexes on:
  - `enquiryId` and `version`
  - `createdBy` and `createdAt`
  - `status` and `createdAt`
  - `emailDeliveryStatus`

- `enquiries` collection updated with quote-related fields:
  - `quotes` array field
  - `hasQuotes` boolean field
  - `quotesCount` number field
  - `latestQuoteDate` date field

### Database Indexes

```javascript
// Quotes collection indexes
db.quotes.createIndex({ "enquiryId": 1, "version": -1 })
db.quotes.createIndex({ "createdBy": 1, "createdAt": -1 })
db.quotes.createIndex({ "status": 1, "createdAt": -1 })
db.quotes.createIndex({ "emailDeliveryStatus": 1 })

// Enquiries collection additional indexes
db.enquiries.createIndex({ "hasQuotes": 1 })
db.enquiries.createIndex({ "latestQuoteDate": -1 })
```

## 2. Email Configuration

### Environment Variables

Add the following environment variables for quote email functionality:

```env
# Email Configuration for Quotes
QUOTE_EMAIL_FROM=quotes@infinityweekends.com
QUOTE_EMAIL_FROM_NAME=Infinity Weekends Quotes
QUOTE_EMAIL_REPLY_TO=support@infinityweekends.com

# Email Service Configuration
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Email Template Configuration
QUOTE_EMAIL_TEMPLATE_PATH=/templates/quote-email.html
COMPANY_LOGO_URL=https://your-domain.com/logo.png
COMPANY_WEBSITE_URL=https://infinityweekends.com
BOOKING_CALLBACK_URL=https://your-domain.com/api/booking/interest
```

### Email Template Customization

Customize the quote email template at `src/lib/email-templates/quote-email.html`:

1. Update company branding and colors
2. Modify the email layout to match your brand
3. Update contact information and legal disclaimers
4. Test email rendering across different email clients

### Email Delivery Testing

Test email delivery in production:

```bash
# Send test quote email
curl -X POST https://your-domain.com/api/admin/quotes/[quote-id]/send-test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@example.com"}'
```

## 3. Admin Dashboard Integration

### Route Configuration

Ensure the following admin routes are properly configured:

- `/admin/quotes` - Quote management interface
- `/admin/enquiries` - Enhanced enquiry management with quote integration
- `/admin/dashboard` - Updated dashboard with quote statistics

### Permission Configuration

Configure role-based access control:

```javascript
// Admin-only routes for quote management
const adminOnlyRoutes = [
  '/admin/quotes',
  '/admin/quotes/*',
  '/api/admin/quotes',
  '/api/admin/quotes/*'
];

// Ensure only admin users can access quote functionality
middleware.use('/admin/quotes', requireAdminRole);
middleware.use('/api/admin/quotes', requireAdminRole);
```

### Navigation Updates

Update the admin navigation to include quote management:

```javascript
// Add to admin navigation menu
const adminNavItems = [
  // ... existing items
  {
    name: 'Quotes',
    href: '/admin/quotes',
    icon: 'DocumentTextIcon',
    permission: 'admin'
  }
];
```

## 4. Security Configuration

### API Security

Ensure all quote-related API endpoints are properly secured:

- Authentication required for all quote operations
- Admin role verification for quote management
- Input validation and sanitization
- Rate limiting on email sending endpoints

### Data Protection

Configure data protection measures:

- Encrypt sensitive quote data in database
- Secure email template rendering
- Audit logging for all quote operations
- GDPR compliance for customer data

### Email Security

Implement email security best practices:

- SPF, DKIM, and DMARC records for email domain
- Secure email tracking without exposing sensitive data
- Email content sanitization
- Bounce and complaint handling

## 5. Monitoring and Analytics

### Performance Monitoring

Set up monitoring for quote system performance:

- Database query performance for quote operations
- Email delivery success rates
- API response times for quote endpoints
- Error rates and exception tracking

### Business Analytics

Configure analytics for quote system metrics:

- Quote creation and conversion rates
- Email open and click-through rates
- Average quote values and trends
- Customer response times

### Alerting

Set up alerts for critical issues:

- Failed email deliveries
- Database connection issues
- High error rates in quote operations
- Unusual quote creation patterns

## 6. Backup and Recovery

### Database Backup

Ensure quote data is included in backup procedures:

- Regular backups of quotes collection
- Point-in-time recovery capability
- Cross-region backup replication
- Backup verification and testing

### Email Backup

Configure email delivery logging and backup:

- Email delivery logs retention
- Failed email retry mechanisms
- Email template version control
- Email analytics data backup

## 7. Testing in Production

### Smoke Tests

Run smoke tests after deployment:

1. Create a test quote from an enquiry
2. Verify quote appears in admin dashboard
3. Send test quote email
4. Verify email delivery and tracking
5. Test quote editing and version history

### Load Testing

Perform load testing on quote system:

- Concurrent quote creation
- Bulk email sending
- Database performance under load
- API response times under stress

### User Acceptance Testing

Conduct UAT with admin users:

- Quote creation workflow
- Email template customization
- Dashboard analytics and reporting
- Search and filtering functionality

## 8. Go-Live Checklist

Before going live with the quote system:

- [ ] Database migrations completed successfully
- [ ] Email configuration tested and verified
- [ ] Admin dashboard integration deployed
- [ ] Security measures implemented and tested
- [ ] Monitoring and alerting configured
- [ ] Backup procedures verified
- [ ] User training completed
- [ ] Documentation updated
- [ ] Support procedures established
- [ ] Rollback plan prepared

## 9. Post-Deployment

### Monitoring

Monitor the system closely for the first 48 hours:

- Email delivery rates
- Database performance
- User adoption metrics
- Error rates and issues

### Support

Provide support for admin users:

- Training materials and documentation
- Support contact information
- Issue escalation procedures
- Feature request process

### Optimization

Continuously optimize the system:

- Database query performance
- Email template effectiveness
- User interface improvements
- Feature enhancements based on feedback

## Troubleshooting

### Common Issues

1. **Email Delivery Failures**
   - Check SMTP configuration
   - Verify DNS records (SPF, DKIM, DMARC)
   - Review email service provider logs
   - Check for blacklisted IP addresses

2. **Database Performance Issues**
   - Review query execution plans
   - Check index usage and effectiveness
   - Monitor connection pool usage
   - Consider query optimization

3. **Authentication Issues**
   - Verify JWT token configuration
   - Check role-based access control
   - Review session management
   - Validate API permissions

4. **UI/UX Issues**
   - Check browser compatibility
   - Verify responsive design
   - Test form validation
   - Review error handling

### Support Contacts

- Technical Support: tech-support@infinityweekends.com
- Database Issues: dba@infinityweekends.com
- Email Issues: email-admin@infinityweekends.com
- Security Issues: security@infinityweekends.com

## Conclusion

The quote system deployment requires careful attention to database migrations, email configuration, security, and monitoring. Follow this guide step-by-step and verify each component before proceeding to the next phase.

Regular monitoring and optimization will ensure the system continues to perform well and meet business requirements.