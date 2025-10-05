# Implementation Plan

- [x] 1. Enhance User model and database schema
  - Extend existing User model with company, consortia, and registration status fields
  - Create database migration to add new fields to existing users collection
  - Update user validation schemas to include new required fields
  - _Requirements: 1.1, 1.2, 1.3, 8.2_

- [x] 2. Create Contract data models and database collections
  - [x] 2.1 Implement ContractTemplate model with versioning support
    - Create ContractTemplate schema with version control fields
    - Implement methods for creating new versions and managing active templates
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [x] 2.2 Implement ContractSignature model for tracking signed contracts
    - Create ContractSignature schema linking users to contract versions
    - Include signature data, timestamps, and audit trail fields
    - _Requirements: 6.3, 6.4, 8.2_

- [x] 3. Enhance registration form with additional fields
  - [x] 3.1 Update RegisterForm component with company and consortia fields
    - Add company name field as required input
    - Add consortia field as optional input with validation
    - Update form validation to handle new fields
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 3.2 Update registration API endpoint to handle new fields
    - Modify POST /api/auth/register to accept company and consortia data
    - Update server-side validation for new fields
    - Ensure backward compatibility with existing registration flow
    - _Requirements: 1.3, 1.4_

- [x] 4. Implement email notification system for registrations
  - [x] 4.1 Create agency confirmation email template and service
    - Design HTML email template for agency registration confirmation
    - Implement email sending logic with retry mechanism
    - Add email delivery error handling and logging
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 4.2 Create admin notification email template and service
    - Design HTML email template for admin notifications with registration details
    - Implement logic to send notifications to all admin users
    - Include direct links to admin moderation interface in emails
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Build admin agency management interface
  - [x] 5.1 Create AgencyManagement dashboard component
    - Build filterable list view of pending agency registrations
    - Display complete registration information including new fields
    - Implement status filtering (pending, approved, rejected, contracted)
    - _Requirements: 4.1, 4.2, 8.1, 8.3_
  
  - [x] 5.2 Implement agency approval and rejection functionality
    - Add approve/reject buttons with confirmation dialogs
    - Create API endpoints for approval and rejection actions
    - Include optional comments/reasons for admin actions
    - _Requirements: 4.3, 4.4, 8.4_

- [x] 6. Create approval notification system
  - [x] 6.1 Implement approval email with contract link
    - Design approval email template with congratulations and next steps
    - Generate secure, time-limited tokens for contract access
    - Include contract signing link in approval emails
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.2 Create contract access authentication flow
    - Implement token validation for contract access links
    - Redirect unauthenticated users to login with return URL
    - Handle expired or invalid contract tokens gracefully
    - _Requirements: 5.4, 6.1_

- [ ] 7. Build contract signing interface
  - [x] 7.1 Create contract display and signing component
    - Build scrollable contract viewer with progress tracking
    - Implement digital signature capture or checkbox acceptance
    - Add contract reading completion validation
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 7.2 Implement contract signing API and status updates
    - Create API endpoint for recording contract signatures
    - Update user status to "contracted" upon successful signing
    - Store signature data with audit trail information
    - _Requirements: 6.4, 8.2_

- [x] 8. Develop admin contract template management
  - [x] 8.1 Create ContractTemplateManager component
    - Build rich text editor interface for contract content
    - Implement version history display with comparison features
    - Add template activation and deactivation controls
    - _Requirements: 7.1, 7.3_
  
  - [x] 8.2 Implement contract template API endpoints
    - Create endpoints for CRUD operations on contract templates
    - Implement version control logic for template updates
    - Add validation for template content and metadata
    - _Requirements: 7.2, 7.4_

- [x] 9. Add comprehensive error handling and validation
  - [x] 9.1 Implement client-side validation for all new forms
    - Add real-time validation for registration form fields
    - Create validation for contract signing requirements
    - Implement user-friendly error messages and recovery guidance
    - _Requirements: 1.2, 6.2, 6.3_
  
  - [x] 9.2 Add server-side error handling and logging
    - Implement comprehensive error handling for all new API endpoints
    - Add detailed logging for email delivery failures and retries
    - Create error monitoring for contract signing process
    - _Requirements: 2.4, 3.4_

- [x] 10. Integrate with existing admin dashboard and navigation
  - [x] 10.1 Add agency management to admin navigation
    - Update admin navigation to include agency management section
    - Add pending registration count badges to navigation
    - Integrate with existing admin authentication and authorization
    - _Requirements: 4.1, 8.1_
  
  - [x] 10.2 Update admin dashboard with agency statistics
    - Add agency registration metrics to admin dashboard
    - Display pending approvals count and recent activity
    - Create quick action buttons for common admin tasks
    - _Requirements: 8.1, 8.3_

- [ ]* 11. Write comprehensive tests for new functionality
  - [ ]* 11.1 Create unit tests for enhanced registration flow
    - Test form validation with new fields
    - Test email notification service functionality
    - Test contract template versioning logic
    - _Requirements: All requirements_
  
  - [ ]* 11.2 Write integration tests for admin workflows
    - Test complete agency approval workflow
    - Test contract signing end-to-end process
    - Test email delivery and notification systems
    - _Requirements: All requirements_
  
  - [ ]* 11.3 Add E2E tests for complete agency onboarding
    - Test full flow from registration to contract signing
    - Test admin moderation and approval process
    - Test error scenarios and recovery mechanisms
    - _Requirements: All requirements_