# 🚀 Infinity Weekends Training Website - Launch Guide

This guide will walk you through setting up and launching the Infinity Weekends Training Website locally and in production.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- **MongoDB Atlas account** (for database) - [Sign up here](https://www.mongodb.com/atlas)
- **Vercel account** (for deployment) - [Sign up here](https://vercel.com/)

## 🛠️ Step 1: Project Setup

### 1.1 Clone and Install Dependencies

```bash
# Navigate to your project directory
cd your-project-directory

# Install dependencies
npm install

# Or if you prefer yarn
yarn install
```

### 1.2 Verify Installation

```bash
# Check if all dependencies are installed correctly
npm list --depth=0
```

## 🔧 Step 2: Environment Configuration

### 2.1 Create Environment Files

Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

### 2.2 Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infinity-weekends?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here-make-it-long-and-random

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### 2.3 Environment Variables Explanation

| Variable | Description | How to Get |
|----------|-------------|------------|
| `MONGODB_URI` | MongoDB connection string | Create cluster in MongoDB Atlas |
| `NEXTAUTH_URL` | Your app URL | `http://localhost:3000` for local |
| `NEXTAUTH_SECRET` | JWT secret key | Generate random string (32+ chars) |
| `SMTP_HOST` | Email server host | Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | Gmail: `587` |
| `SMTP_USER` | Your email address | Your Gmail address |
| `SMTP_PASS` | Email password | Gmail App Password |
| `BLOB_READ_WRITE_TOKEN` | File storage token | Vercel Blob storage token |

## 🗄️ Step 3: Database Setup

### 3.1 MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster**
   - Click "Create a New Cluster"
   - Choose the free tier (M0)
   - Select a region close to you
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password
   - Set role to "Atlas Admin" or "Read and write to any database"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
   - For production, add your server's IP address

5. **Get Connection String**
   - Go to "Clusters" and click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `infinity-weekends`

### 3.2 Database Initialization

The database will be automatically initialized when you first run the application. The models will create the necessary collections.

## 📧 Step 4: Email Configuration

### 4.1 Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**
   - Go to Google Account > Security > App passwords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASS`

### 4.2 Alternative Email Providers

You can also use:
- **SendGrid**: Professional email service
- **Mailgun**: Transactional email service
- **AWS SES**: Amazon's email service

Update the SMTP settings accordingly in your `.env.local` file.

## 🔐 Step 5: Security Configuration

### 5.1 Generate NextAuth Secret

```bash
# Generate a random secret
openssl rand -base64 32
```

Use the output as your `NEXTAUTH_SECRET`.

### 5.2 File Storage Setup (Vercel Blob)

1. **Create Vercel Account**
   - Sign up at [Vercel](https://vercel.com/)

2. **Create Blob Store**
   - Go to your Vercel dashboard
   - Navigate to Storage > Create Database
   - Choose "Blob" storage
   - Create the store

3. **Get Access Token**
   - In your blob store settings
   - Generate a read/write token
   - Add it to `BLOB_READ_WRITE_TOKEN`

## 🚀 Step 6: Launch Development Server

### 6.1 Start the Development Server

```bash
# Start the development server
npm run dev

# Or with yarn
yarn dev
```

### 6.2 Access the Application

Open your browser and navigate to:
- **Main Application**: http://localhost:3000
- **Login Page**: http://localhost:3000/auth/login
- **Registration**: http://localhost:3000/auth/register

## 👤 Step 7: Create Admin User

### 7.1 Register First User

1. Go to http://localhost:3000/auth/register
2. Fill out the registration form with your details
3. Use a valid ABTA/PTS number format (e.g., "ABTA12345" or "PTS67890")

### 7.2 Manually Approve and Set as Admin

Since this is the first user, you'll need to manually set them as admin in the database:

```javascript
// Connect to your MongoDB database using MongoDB Compass or CLI
// Find your user document and update it:

db.users.updateOne(
  { contactEmail: "your-email@example.com" },
  { 
    $set: { 
      isApproved: true,
      role: "admin",
      approvedAt: new Date()
    }
  }
)
```

### 7.3 Alternative: Use MongoDB Compass

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using your MongoDB URI
3. Navigate to `infinity-weekends` database > `users` collection
4. Find your user document
5. Edit the document to set:
   - `isApproved: true`
   - `role: "admin"`
   - `approvedAt: [current date]`

## 🧪 Step 8: Testing

### 8.1 Run Unit Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### 8.2 Run E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## 🌐 Step 9: Production Deployment

### 9.1 Prepare for Production

1. **Update Environment Variables**
   ```env
   NEXTAUTH_URL=https://your-domain.com
   # Keep other variables the same but use production values
   ```

2. **Build the Application**
   ```bash
   npm run build
   ```

3. **Test Production Build Locally**
   ```bash
   npm run start
   ```

### 9.2 Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel**
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all your environment variables

### 9.3 Alternative Deployment Options

- **Netlify**: Similar to Vercel
- **Railway**: Good for full-stack apps
- **DigitalOcean App Platform**: More control
- **AWS Amplify**: If using AWS ecosystem

## 🔍 Step 10: Verification and Testing

### 10.1 Test Core Functionality

1. **User Registration Flow**
   - Register a new travel agent
   - Check email notifications
   - Admin approval process

2. **Admin Functions**
   - Login as admin
   - Approve/reject users
   - Manage offers
   - View enquiries

3. **Agent Functions**
   - Login as approved agent
   - View offers
   - Submit enquiries
   - Access training materials

### 10.2 Test Email Functionality

1. Register a new user
2. Check if admin notification email is sent
3. Approve the user
4. Check if approval email is sent to user
5. Submit an enquiry
6. Check if enquiry emails are sent

## 🛠️ Step 11: Maintenance and Monitoring

### 11.1 Regular Maintenance

- **Database Backups**: Set up automated backups in MongoDB Atlas
- **Security Updates**: Regularly update dependencies
- **Performance Monitoring**: Use Vercel Analytics or similar tools

### 11.2 Monitoring

- **Error Tracking**: Consider adding Sentry for error tracking
- **Analytics**: Add Google Analytics or similar
- **Uptime Monitoring**: Use services like UptimeRobot

## 🆘 Troubleshooting

### Common Issues and Solutions

1. **Database Connection Issues**
   ```
   Error: MongooseError: Operation `users.findOne()` buffering timed out
   ```
   - Check your MongoDB URI
   - Verify network access settings in MongoDB Atlas
   - Ensure your IP is whitelisted

2. **Email Not Sending**
   ```
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```
   - Use App Password instead of regular password for Gmail
   - Check SMTP settings
   - Verify 2FA is enabled for Gmail

3. **NextAuth Errors**
   ```
   [next-auth][error][JWT_SESSION_ERROR]
   ```
   - Check NEXTAUTH_SECRET is set
   - Verify NEXTAUTH_URL matches your domain
   - Clear browser cookies and try again

4. **Build Errors**
   ```
   Type error: Cannot find module
   ```
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript configuration
   - Verify all imports are correct

### Getting Help

- **Documentation**: Check Next.js, NextAuth.js, and MongoDB documentation
- **Community**: Stack Overflow, GitHub Issues
- **Support**: Contact the development team

## 🎉 Success!

If you've followed all steps correctly, you should now have:

- ✅ A fully functional Infinity Weekends Training Website
- ✅ User registration and admin approval system
- ✅ Offers management system
- ✅ Enquiry submission system
- ✅ Email notifications working
- ✅ Secure authentication and authorization
- ✅ Production-ready deployment

## 📞 Support

If you encounter any issues during setup, please check:

1. All environment variables are correctly set
2. Database connection is working
3. Email configuration is correct
4. All dependencies are installed

For additional support, refer to the project documentation or contact the development team.

---

**Happy Launching! 🚀**