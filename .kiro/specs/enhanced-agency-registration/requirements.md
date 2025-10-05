# Requirements Document

## Introduction

This feature enhances the existing agency registration process by adding missing form fields (company and consortia information), implementing email notifications for both agencies and admins, creating an admin moderation system, and establishing a contract management workflow. The system will provide a complete end-to-end process from initial registration through contract signing.

## Requirements

### Requirement 1

**User Story:** As an agency representative, I want to provide complete company information during registration, so that the admin has all necessary details to evaluate my application.

#### Acceptance Criteria

1. WHEN an agency accesses the registration form THEN the system SHALL display fields for company name and consortia affiliation
2. WHEN an agency submits the registration form without company name THEN the system SHALL display a validation error
3. WHEN an agency submits the registration form with all required fields THEN the system SHALL accept the submission
4. IF consortia field is left empty THEN the system SHALL still accept the submission as this field is optional

### Requirement 2

**User Story:** As an agency representative, I want to receive confirmation of my registration submission, so that I know my application has been received and is being processed.

#### Acceptance Criteria

1. WHEN an agency successfully submits their registration THEN the system SHALL send a confirmation email to the agency
2. WHEN the confirmation email is sent THEN it SHALL include a thank you message and notification that the team will be in touch
3. WHEN the email is sent THEN it SHALL be delivered within 5 minutes of form submission
4. IF email delivery fails THEN the system SHALL log the error and attempt retry up to 3 times

### Requirement 3

**User Story:** As an admin user, I want to be notified immediately when new agencies register, so that I can review and process applications promptly.

#### Acceptance Criteria

1. WHEN an agency successfully submits their registration THEN the system SHALL send notification emails to all admin users
2. WHEN the admin notification email is sent THEN it SHALL include the agency's complete registration details
3. WHEN the admin notification email is sent THEN it SHALL include direct links to the admin moderation interface
4. IF no admin users exist in the system THEN the system SHALL log a warning but continue processing

### Requirement 4

**User Story:** As an admin user, I want to review and moderate new agency registrations, so that I can ensure only legitimate agencies are approved for the platform.

#### Acceptance Criteria

1. WHEN an admin accesses the user management section THEN the system SHALL display pending agency registrations
2. WHEN an admin views a pending registration THEN the system SHALL display all submitted information including company and consortia details
3. WHEN an admin approves a registration THEN the system SHALL update the agency status to approved
4. WHEN an admin rejects a registration THEN the system SHALL update the agency status to rejected and optionally include rejection reason

### Requirement 5

**User Story:** As an approved agency, I want to receive notification of my approval with next steps, so that I can complete the onboarding process including contract signing.

#### Acceptance Criteria

1. WHEN an admin approves an agency registration THEN the system SHALL send an approval email to the agency
2. WHEN the approval email is sent THEN it SHALL include congratulations message and next steps
3. WHEN the approval email is sent THEN it SHALL include a secure link to the contract signing process
4. WHEN the agency clicks the contract link THEN the system SHALL redirect them to a login page if not authenticated

### Requirement 6

**User Story:** As an approved agency, I want to sign a contract digitally, so that I can complete the legal requirements to use the platform.

#### Acceptance Criteria

1. WHEN an approved agency accesses the contract link THEN the system SHALL display the current contract template
2. WHEN an agency views the contract THEN the system SHALL require them to scroll through the entire document
3. WHEN an agency agrees to the contract THEN the system SHALL require digital signature or acceptance confirmation
4. WHEN an agency completes contract signing THEN the system SHALL update their status to fully onboarded

### Requirement 7

**User Story:** As an admin user, I want to manage contract templates, so that I can update legal terms and ensure agencies sign the most current version.

#### Acceptance Criteria

1. WHEN an admin accesses the contract management section THEN the system SHALL display the current contract template
2. WHEN an admin updates the contract template THEN the system SHALL save a new version with timestamp
3. WHEN an admin updates the contract template THEN the system SHALL maintain version history of previous contracts
4. WHEN a new contract version is created THEN existing approved agencies SHALL continue using their signed version until they re-sign

### Requirement 8

**User Story:** As an admin user, I want to track the status of agency registrations and contract signings, so that I can monitor the onboarding pipeline and follow up as needed.

#### Acceptance Criteria

1. WHEN an admin views the agency management dashboard THEN the system SHALL display registration status for each agency
2. WHEN an admin views agency details THEN the system SHALL show registration date, approval date, and contract signing status
3. WHEN an admin views the dashboard THEN the system SHALL provide filtering options by status (pending, approved, contracted, rejected)
4. WHEN an admin views agency history THEN the system SHALL display all email communications and status changes with timestamps