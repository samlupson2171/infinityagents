# Implementation Plan

- [x] 1. Project Setup and Foundation
  - Initialize Next.js 14 project with TypeScript and configure essential dependencies
  - Set up Tailwind CSS, ESLint, and Prettier configurations
  - Create basic project structure with components, pages, and API directories
  - Configure environment variables and basic MongoDB connection
  - _Requirements: 7.1, 7.4_

- [x] 2. Database Models and Schema Setup
  - Create Mongoose connection utility with proper error handling
  - Implement User model with validation for ABTA/PTS number format
  - Implement Offer model with required fields and relationships
  - Implement Enquiry model with enum validations for trip types and accommodation
  - Implement TrainingMaterial model with file URL handling
  - Implement ContactInfo model with social media links structure
  - Write unit tests for all model validations and methods
  - _Requirements: 1.1, 2.1, 3.1, 4.2, 5.1, 6.1_

- [x] 3. Authentication System Implementation
- [x] 3.1 NextAuth.js Configuration and Setup
  - Configure NextAuth.js with credentials provider and MongoDB adapter
  - Implement custom authorize function with email/password validation
  - Set up JWT and session callbacks with user role and approval status
  - Create authentication middleware for route protection
  - Write tests for authentication configuration and callbacks
  - _Requirements: 1.6, 7.3, 7.4_

- [x] 3.2 User Registration API and Logic
  - Create POST /api/auth/register endpoint with input validation
  - Implement duplicate email checking and ABTA/PTS format validation
  - Add user creation with pending approval status
  - Integrate admin notification email sending
  - Write API tests for registration endpoint with various input scenarios
  - _Requirements: 1.1, 1.2, 1.3, 2.1_

- [x] 3.3 Login System and Session Management
  - Implement login form component with React Hook Form and Zod validation
  - Create login API integration with proper error handling
  - Add session state management and user context provider
  - Implement logout functionality and session cleanup
  - Write component tests for login form and session management
  - _Requirements: 1.6, 7.4_

- [x] 4. User Registration Interface
- [x] 4.1 Registration Form Component
  - Create RegisterForm component with all required fields
  - Implement real-time validation for ABTA/PTS number format
  - Add form submission handling with loading states and error display
  - Create registration success page with approval process explanation
  - Write component tests for form validation and submission flows
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 4.2 Registration Page and Routing
  - Create registration page with proper layout and styling
  - Implement responsive design for mobile and desktop
  - Add navigation integration and public route configuration
  - Create registration confirmation page with next steps information
  - Write E2E tests for complete registration user journey
  - _Requirements: 1.1, 1.4_

- [x] 5. Admin Approval System
- [x] 5.1 Admin Approval API Endpoints
  - Create GET /api/admin/users/pending endpoint for pending registrations
  - Implement POST /api/admin/users/approve with email notification
  - Create POST /api/admin/users/reject with reason and email notification
  - Add admin authorization middleware for all admin endpoints
  - Write API tests for approval workflows and email integration
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5.2 Admin Dashboard Interface
  - Create ApprovalDashboard component displaying pending users
  - Implement user details modal with all registration information
  - Add approve/reject buttons with confirmation dialogs
  - Create user management interface for viewing and editing approved users
  - Write component tests for admin dashboard functionality
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 6. Offers Management System
- [x] 6.1 Offers API Implementation
  - Create GET /api/offers endpoint for public offer display
  - Implement POST /api/admin/offers for offer creation
  - Create PUT /api/admin/offers/[id] for offer updates
  - Add DELETE /api/admin/offers/[id] for offer removal
  - Write API tests for all CRUD operations and authorization
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6.2 Public Offers Display
  - Create OffersList component with responsive card layout
  - Implement OfferCard component showing title, description, and inclusions
  - Add filtering and search functionality for offers
  - Create empty state display when no active offers exist
  - Write component tests for offers display and filtering
  - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [x] 6.3 Admin Offers Management Interface
  - Create OffersManager component with CRUD operations
  - Implement offer creation form with rich text editor for descriptions
  - Add offer editing interface with active/inactive toggle
  - Create offer preview functionality before publishing
  - Write component tests for admin offers management workflows
  - _Requirements: 3.3, 3.4_

- [x] 7. Inquiry System Implementation
- [x] 7.1 Inquiry Submission API
  - Create POST /api/enquiries endpoint with comprehensive validation
  - Implement email integration sending to info@infinityweekends.co.uk
  - Add confirmation email sending to submitting agent
  - Create inquiry storage in database with agent reference
  - Write API tests for inquiry submission and email delivery
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [-] 7.2 Inquiry Form Interface
  - Create EnquiryForm component with all required fields
  - Implement auto-population of agent email from session
  - Add form validation with proper error messaging
  - Create inquiry confirmation page with submission details
  - Write component tests for form functionality and validation
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 7.3 Admin Inquiry Management
  - Create GET /api/admin/enquiries endpoint for inquiry listing
  - Implement PUT /api/admin/enquiries/[id] for status updates
  - Create EnquiriesManager component for admin inquiry view
  - Add inquiry status tracking and filtering capabilities
  - Write tests for admin inquiry management functionality
  - _Requirements: 4.6_

- [x] 8. Training Materials System
- [x] 8.1 Training Content API Implementation
  - Create GET /api/training endpoint for content listing
  - Implement POST /api/admin/training for content creation
  - Add PUT /api/admin/training/[id] for content updates
  - Create DELETE /api/admin/training/[id] for content removal
  - Implement POST /api/admin/training/upload for file handling
  - Write API tests for training content CRUD operations
  - _Requirements: 5.1, 5.2, 5.6_

- [-] 8.2 Training Content Display Interface
  - Create TrainingList component with categorized content display
  - Implement VideoPlayer component with secure streaming
  - Create BlogReader component with rich text formatting
  - Add DownloadManager component for secure file access
  - Write component tests for all training content types
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.3 Admin Training Content Management
  - Create TrainingManager component for content administration
  - Implement file upload interface with validation and progress
  - Add rich text editor for blog content creation
  - Create content preview functionality before publishing
  - Write tests for admin training content management workflows
  - _Requirements: 5.6_

- [x] 9. Contact Information System
- [x] 9.1 Contact Information API
  - Create GET /api/contact endpoint for contact information display
  - Implement PUT /api/admin/contact for contact updates
  - Add validation for phone numbers and social media URLs
  - Create contact information storage and retrieval logic
  - Write API tests for contact information management
  - _Requirements: 6.1, 6.4_

- [x] 9.2 Contact Information Display
  - Create ContactInfo component with formatted contact details
  - Implement clickable email links with mailto functionality
  - Add social media links with proper external link handling
  - Create responsive design for contact information display
  - Write component tests for contact information functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 10. Security Implementation
- [x] 10.1 Input Validation and Security Middleware
  - Implement comprehensive input validation using Zod schemas
  - Create XSS prevention middleware with proper sanitization
  - Add CSRF protection for all form submissions
  - Implement rate limiting middleware for API endpoints
  - Write security tests for validation and protection mechanisms
  - _Requirements: 7.1, 7.2, 7.6_

- [x] 10.2 File Upload Security
  - Implement file type and size validation for uploads
  - Add malicious file scanning and content validation
  - Create secure file storage with proper access controls
  - Implement file URL generation with expiration tokens
  - Write tests for file upload security and validation
  - _Requirements: 7.5_

- [x] 11. Email Integration System
  - Configure Nodemailer with SMTP settings and authentication
  - Create email template system for registration, approval, and notifications
  - Implement email sending utilities with error handling and retries
  - Add email delivery tracking and failure notification
  - Write tests for email functionality with mock SMTP server
  - _Requirements: 1.2, 2.1, 2.3, 2.4, 4.3, 4.4_

- [x] 12. Application Layout and Navigation
- [x] 12.1 Main Layout and Navigation Components
  - Create Layout component with header, navigation, and footer
  - Implement Navigation component with role-based menu items
  - Add responsive navigation with mobile hamburger menu
  - Create breadcrumb navigation for admin sections
  - Write component tests for layout and navigation functionality
  - _Requirements: All user interface requirements_

- [x] 12.2 Protected Route Implementation
  - Create ProtectedRoute wrapper component for authentication checking
  - Implement role-based route protection for admin sections
  - Add loading states during authentication verification
  - Create unauthorized access handling and redirection
  - Write tests for route protection and authorization logic
  - _Requirements: 7.3, 2.6_

- [x] 13. Error Handling and User Experience
- [x] 13.1 Error Boundary and Global Error Handling
  - Create ErrorBoundary component for React error catching
  - Implement global error handler for API responses
  - Add user-friendly error messages and recovery options
  - Create loading spinner and skeleton components
  - Write tests for error handling and recovery scenarios
  - _Requirements: All error handling aspects_

- [x] 13.2 Form Validation and User Feedback
  - Implement consistent form validation patterns across components
  - Create reusable validation hooks and error display components
  - Add success notifications and confirmation messages
  - Implement progressive form validation with real-time feedback
  - Write tests for form validation and user feedback systems
  - _Requirements: 1.1, 1.2, 4.2, 7.2_

- [x] 14. Testing Implementation
- [x] 14.1 Unit and Component Testing Setup
  - Configure Jest and React Testing Library for component testing
  - Write comprehensive tests for all React components
  - Create unit tests for utility functions and business logic
  - Implement API route testing with supertest
  - Add database model testing with test database setup
  - _Requirements: All functional requirements validation_

- [x] 14.2 Integration and E2E Testing
  - Configure Playwright for end-to-end testing
  - Write integration tests for complete user workflows
  - Create E2E tests for registration, approval, and content management
  - Implement cross-browser compatibility testing
  - Add performance testing for critical user journeys
  - _Requirements: All user story validation_

- [x] 15. Production Deployment Configuration
  - Configure Vercel deployment with environment variables
  - Set up MongoDB Atlas production database with proper indexing
  - Configure email service for production with proper authentication
  - Implement monitoring and logging for production environment
  - Create deployment scripts and CI/CD pipeline configuration
  - _Requirements: 7.1, 7.4_