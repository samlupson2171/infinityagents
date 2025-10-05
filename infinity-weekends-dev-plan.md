# Infinity Weekends Training Website - Development Plan

## Project Overview

**Project Name**: Infinity Weekends Training & Information Website  
**Purpose**: Private resource for travel agencies with registration approval, training materials, and inquiry management  
**Tech Stack**: Next.js 14, MongoDB, NextAuth.js, Vercel, Tailwind CSS  
**Target Users**: Travel agencies with ABTA/PTS numbers  

## 1. Technical Architecture

### Frontend Framework
- **Next.js 14** with App Router for modern React development
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** for responsive, utility-first styling
- **React Hook Form** for form handling and validation
- **Zod** for schema validation

### Backend & Database
- **MongoDB Atlas** for cloud database hosting
- **Mongoose** for MongoDB object modeling
- **NextAuth.js** for authentication and session management
- **Vercel** for hosting and deployment
- **Nodemailer** for email notifications

### Key Integrations
- **MongoDB-Vercel Integration** for seamless database connection
- **Email Service** (SendGrid or Nodemailer with Gmail SMTP)
- **File Upload Service** (Vercel Blob or AWS S3 for media files)

## 2. Database Schema Design

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  companyName: String,
  abtaPtsNumber: String,
  contactEmail: String (unique),
  websiteAddress: String,
  isApproved: Boolean (default: false),
  role: String (enum: ['agent', 'admin']),
  createdAt: Date,
  updatedAt: Date,
  approvedBy: ObjectId (ref: Users),
  approvedAt: Date
}
```

### Offers Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  inclusions: [String],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId (ref: Users)
}
```

### Enquiries Collection
```javascript
{
  _id: ObjectId,
  leadName: String,
  tripType: String (enum: ['stag', 'hen', 'other']),
  agentEmail: String,
  resort: String,
  travelDate: Date,
  departureAirport: String,
  numberOfNights: Number,
  numberOfGuests: Number,
  eventsRequested: [String],
  accommodationType: String (enum: ['hotel', 'apartments']),
  boardType: String,
  budgetPerPerson: Number,
  status: String (enum: ['new', 'in-progress', 'completed']),
  createdAt: Date,
  updatedAt: Date,
  submittedBy: ObjectId (ref: Users)
}
```

### Training Materials Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  type: String (enum: ['video', 'blog', 'download']),
  contentUrl: String,
  fileUrl: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId (ref: Users)
}
```

### Contact Information Collection
```javascript
{
  _id: ObjectId,
  generalEnquiriesPhone: String,
  emergencyPhone: String,
  email: String,
  website: String,
  socialMediaLinks: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  updatedAt: Date,
  updatedBy: ObjectId (ref: Users)
}
```

## 3. User Flow & Authentication System

### Registration Process
1. **Public Registration Form** - Collects all required information
2. **Email Validation** - Verify email format and ABTA/PTS number format
3. **Pending Approval State** - User created but access restricted
4. **Admin Email Notification** - Automatic email to administrator
5. **Admin Approval Dashboard** - Review and approve/reject registrations
6. **Approval Email** - Notify user of approval status

### Authentication Flow
1. **NextAuth.js Setup** with credentials provider
2. **MongoDB session strategy** for persistent sessions
3. **Role-based access control** (admin vs agent)
4. **Protected routes** using Next.js middleware
5. **Session management** with automatic token refresh

## 4. Feature Implementation Breakdown

### 4.1 User Registration & Authentication

#### Registration Component (`/components/auth/RegisterForm.tsx`)
```typescript
interface RegistrationData {
  name: string;
  companyName: string;
  abtaPtsNumber: string;
  contactEmail: string;
  websiteAddress: string;
}
```

**Implementation Steps:**
1. Create registration form with validation
2. Implement ABTA/PTS number format validation
3. Check for duplicate email addresses
4. Create user with pending approval status
5. Send admin notification email
6. Display success message with next steps

#### Login System (`/api/auth/[...nextauth].js`)
```typescript
export const authOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Verify email/password
        // Check if user is approved
        // Return user object or null
      }
    })
  ],
  callbacks: {
    jwt: async ({ user, token }) => {
      // Add custom properties to token
    },
    session: async ({ session, token }) => {
      // Add user role and approval status to session
    }
  }
}
```

### 4.2 Admin Approval System

#### Admin Dashboard (`/app/admin/approvals/page.tsx`)
- List all pending registrations
- View registration details
- Approve/reject with comments
- Send approval/rejection emails
- User management interface

#### Approval API (`/api/admin/approve-user`)
```typescript
export async function POST(request: Request) {
  // Verify admin permissions
  // Update user approval status
  // Send email notification to user
  // Log approval action
}
```

### 4.3 Offers Display System

#### Offers Page (`/app/offers/page.tsx`)
- Display current active offers
- Rich text formatting for inclusions
- Responsive card layout
- Filter and search functionality

#### Offers Management (`/app/admin/offers/page.tsx`)
- CRUD operations for offers
- Rich text editor for descriptions
- Toggle active/inactive status
- Preview functionality

### 4.4 Enquiry System

#### Enquiry Form (`/components/enquiries/EnquiryForm.tsx`)
```typescript
interface EnquiryData {
  leadName: string;
  tripType: 'stag' | 'hen' | 'other';
  agentEmail: string;
  resort: string;
  travelDate: Date;
  departureAirport: string;
  numberOfNights: number;
  numberOfGuests: number;
  eventsRequested: string[];
  accommodationType: 'hotel' | 'apartments';
  boardType: string;
  budgetPerPerson: number;
}
```

#### Email Integration
- Auto-populate agent email from session
- Send enquiry to info@infinityweekends.co.uk
- Copy confirmation email to agent
- Store enquiry in database for tracking

### 4.5 Training Materials Section

#### Training Content Management
- Video upload and streaming capability
- Blog post editor with rich text
- File download system for promotional materials
- Category and tagging system
- Search and filter functionality

#### Content Types
1. **Video Training**
   - Upload to Vercel Blob or embed YouTube/Vimeo
   - Playback tracking
   - Closed captions support

2. **Blog Articles**
   - Rich text editor (TinyMCE or similar)
   - Image upload capability
   - SEO metadata

3. **Download Materials**
   - PDF brochures
   - Image assets
   - Marketing materials
   - File versioning

### 4.6 Contact Management

#### Contact Information Display
- Multiple phone numbers with purpose labels
- Email contact with direct mailto links
- Website and social media links
- Contact form for general inquiries

#### Admin Contact Management
- Update contact information
- Manage social media links
- Emergency contact procedures
- Contact form message handling

## 5. Content Management System (CMS)

### Admin Panel Structure
```
/admin/
├── dashboard/          # Overview & statistics
├── users/             # User management & approvals
├── offers/            # Manage current offers
├── enquiries/         # View and manage enquiries
├── training/          # Training content management
├── contact/           # Contact information updates
└── settings/          # Site configuration
```

### CMS Features
1. **Role-based Access Control**
   - Super admin (full access)
   - Content admin (content only)
   - Viewer (read-only)

2. **Content Editing**
   - WYSIWYG editor for rich content
   - Image upload and management
   - File organization system
   - Content versioning

3. **User Management**
   - Bulk approval actions
   - User activity logs
   - Export user data
   - Communication tools

## 6. Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup with Next.js 14 and TypeScript
- MongoDB connection and basic models
- NextAuth.js authentication setup
- Basic UI components and layout
- User registration and login functionality

### Phase 2: Core Features (Week 3-4)
- Admin approval system
- Offers display and management
- Enquiry form and email integration
- Basic admin dashboard
- User session management

### Phase 3: Content Management (Week 5-6)
- Training materials upload system
- Blog post creation and editing
- File management system
- Contact information management
- Advanced admin features

### Phase 4: Polish & Deployment (Week 7-8)
- UI/UX improvements
- Mobile responsiveness
- Performance optimization
- Testing and bug fixes
- Production deployment to Vercel

## 7. Security Considerations

### Data Protection
- Input validation on all forms
- SQL injection prevention with Mongoose
- XSS protection with proper sanitization
- File upload security and validation
- Rate limiting on API endpoints

### Authentication Security
- Strong password requirements
- Session timeout management
- CSRF protection
- Secure cookie configuration
- Account lockout after failed attempts

### Admin Security
- Multi-factor authentication for admins
- Audit logging for admin actions
- Secure file upload handling
- Role-based permission system
- IP whitelisting for admin access

## 8. Performance Optimization

### Frontend Optimization
- Next.js Image optimization for all images
- Code splitting and lazy loading
- Static generation for content pages
- Client-side caching strategies
- Bundle size optimization

### Backend Optimization
- MongoDB indexing strategy
- Connection pooling
- Caching for frequently accessed data
- Optimized database queries
- CDN for static assets

## 9. Deployment Configuration

### Vercel Setup
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb_uri",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url",
    "EMAIL_SERVER": "@email_server",
    "EMAIL_FROM": "@email_from"
  }
}
```

### Environment Variables
```env
# Database
MONGODB_URI=mongodb+srv://...
NODE_ENV=production

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Email Configuration
EMAIL_SERVER=smtp://username:password@smtp.gmail.com:587
EMAIL_FROM=noreply@infinityweekends.co.uk

# Admin Email
ADMIN_EMAIL=admin@infinityweekends.co.uk
ENQUIRY_EMAIL=info@infinityweekends.co.uk
```

## 10. Testing Strategy

### Unit Testing
- Component testing with Jest and React Testing Library
- API endpoint testing
- Database model validation
- Utility function testing

### Integration Testing
- Authentication flow testing
- Email sending functionality
- File upload processes
- Database operations

### End-to-End Testing
- User registration and approval process
- Complete enquiry submission flow
- Admin content management workflows
- Cross-browser compatibility testing

## 11. Maintenance & Support

### Regular Maintenance Tasks
- Security updates and patches
- Database backup and monitoring
- Performance monitoring and optimization
- Content updates and additions
- User support and troubleshooting

### Monitoring & Analytics
- Error tracking with Sentry
- Performance monitoring
- User activity analytics
- Email delivery tracking
- System uptime monitoring

## 12. Future Enhancements

### Potential Features
- Mobile app development
- Advanced search and filtering
- Real-time chat support
- Integration with booking systems
- Multi-language support
- Advanced reporting and analytics
- API for third-party integrations
- Automated email campaigns

### Scalability Considerations
- Database sharding strategies
- CDN implementation
- Microservices architecture migration
- Advanced caching solutions
- Load balancing configuration

## Estimated Timeline: 6-8 weeks
## Budget Estimate: Based on developer hours and third-party service costs
## Technical Requirements: Node.js 18+, Modern browser support, MongoDB Atlas account

---

This development plan provides a comprehensive roadmap for building the Infinity Weekends training website with all requested features, modern technology stack, and scalable architecture.