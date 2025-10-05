# Infinity Weekends - Deployment Guide

## Prerequisites

1. **GitHub Account** - Repository created and code pushed
2. **Vercel Account** - Sign up at vercel.com
3. **MongoDB Atlas** - Cloud database setup
4. **Email Service** - SMTP credentials for notifications

## Step 1: MongoDB Atlas Setup

1. Create a MongoDB Atlas account at mongodb.com
2. Create a new cluster (free tier is fine for development)
3. Create a database user with read/write permissions
4. Whitelist your IP addresses (or use 0.0.0.0/0 for all IPs)
5. Get your connection string (it should look like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/infinityweekends?retryWrites=true&w=majority
   ```

## Step 2: Vercel Deployment

### Option A: Deploy via Vercel Dashboard
1. Go to vercel.com and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy

### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

## Step 3: Environment Variables

Set these in your Vercel project settings:

### Required Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infinityweekends?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-super-secure-secret-key-here
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Email Configuration (Optional but recommended)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
QUOTE_EMAIL_FROM=quotes@yourdomain.com
QUOTE_EMAIL_FROM_NAME=Infinity Weekends
```

### Additional Configuration
```env
COMPANY_LOGO_URL=https://your-vercel-app.vercel.app/infinity-weekends-logo.png
COMPANY_WEBSITE_URL=https://your-vercel-app.vercel.app
BOOKING_CALLBACK_URL=https://your-vercel-app.vercel.app/api/booking/interest
```

## Step 4: Post-Deployment Setup

1. **Run Database Migrations**
   - Visit: `https://your-app.vercel.app/api/admin/system/migrate`
   - Or use the admin panel to run migrations

2. **Create Admin User**
   - Visit: `https://your-app.vercel.app/auth/register`
   - Register the first user (will need admin approval)
   - Manually set user role to 'admin' in MongoDB

3. **Test Core Features**
   - User registration/login
   - Admin dashboard access
   - Destination management
   - Quote system

## Step 5: Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed
5. Update NEXTAUTH_URL environment variable

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Check connection string format
   - Verify IP whitelist settings
   - Ensure database user has correct permissions

2. **NextAuth Errors**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Ensure all auth-related environment variables are set

3. **Build Errors**
   - Check for TypeScript errors: `npm run type-check`
   - Verify all dependencies are installed
   - Check for missing environment variables

4. **API Route Timeouts**
   - Vercel has a 10-second timeout for Hobby plan
   - Consider upgrading to Pro for longer timeouts
   - Optimize database queries

### Performance Optimization

1. **Database Indexing**
   - Run the database optimization script
   - Monitor query performance

2. **Image Optimization**
   - Use Next.js Image component
   - Consider using Vercel's image optimization

3. **Caching**
   - Implement Redis for session storage (optional)
   - Use Vercel's edge caching

## Monitoring

1. **Vercel Analytics** - Built-in performance monitoring
2. **Error Tracking** - Consider Sentry integration
3. **Database Monitoring** - MongoDB Atlas provides built-in monitoring

## Security Checklist

- [ ] Environment variables are properly set
- [ ] Database access is restricted
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] Admin routes are protected
- [ ] File upload validation is in place
- [ ] Rate limiting is configured

## Support

For deployment issues:
- Check Vercel documentation
- Review application logs in Vercel dashboard
- Test locally with production environment variables