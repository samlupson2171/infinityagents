# Requirements Document

## Introduction

The Enquiry Quoting System enables administrators to create and send professional quotes in response to customer enquiries. When an enquiry is received through the system, administrators can fill out a comprehensive quote form with all necessary details including accommodation, pricing, inclusions, and activities. Once finalized, the system automatically saves the quote to the enquiry record and sends a branded email to the originating agent with a clear call-to-action for booking.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to create quotes for received enquiries, so that I can provide detailed pricing and package information to potential customers.

#### Acceptance Criteria

1. WHEN an administrator views an enquiry THEN the system SHALL display a "Create Quote" button
2. WHEN the administrator clicks "Create Quote" THEN the system SHALL open a quote creation form
3. WHEN the quote form is displayed THEN the system SHALL pre-populate available enquiry information
4. WHEN the administrator fills out the quote form THEN the system SHALL validate all required fields before allowing submission

### Requirement 2

**User Story:** As an administrator, I want to capture comprehensive quote details including lead information, accommodation, and pricing, so that I can provide complete package information to customers.

#### Acceptance Criteria

1. WHEN creating a quote THEN the system SHALL require the following fields: Lead Name, Hotel Name, Number of People, Number of Rooms, Number of Nights, Arrival Date
2. WHEN creating a quote THEN the system SHALL provide a checkbox for "Is it a super package?"
3. WHEN creating a quote THEN the system SHALL provide a text area for "What's Included List"
4. WHEN creating a quote THEN the system SHALL provide a yes/no option for "Transfer included"
5. WHEN creating a quote THEN the system SHALL provide a text area for "Activities included"
6. WHEN creating a quote THEN the system SHALL require a "Total Price" field with currency validation

### Requirement 3

**User Story:** As an administrator, I want to save quotes and associate them with their corresponding enquiries, so that I can maintain a complete record of customer interactions.

#### Acceptance Criteria

1. WHEN an administrator finalizes a quote THEN the system SHALL save the quote data to the database
2. WHEN a quote is saved THEN the system SHALL associate it with the original enquiry record
3. WHEN viewing an enquiry THEN the system SHALL display any associated quotes
4. WHEN multiple quotes exist for an enquiry THEN the system SHALL display them in chronological order
5. WHEN a quote is saved THEN the system SHALL record the creation timestamp and administrator who created it

### Requirement 4

**User Story:** As an administrator, I want the system to automatically send branded quote emails to agents, so that customers receive professional communications with clear next steps.

#### Acceptance Criteria

1. WHEN a quote is finalized THEN the system SHALL automatically send an email to the agent who submitted the original enquiry
2. WHEN sending a quote email THEN the system SHALL use branded email templates with company styling
3. WHEN sending a quote email THEN the system SHALL include all quote details in a professional format
4. WHEN sending a quote email THEN the system SHALL include a prominent "I'd like to book" call-to-action button
5. WHEN the email is sent THEN the system SHALL log the email delivery status
6. IF email delivery fails THEN the system SHALL notify the administrator and provide retry options

### Requirement 5

**User Story:** As an administrator, I want to edit and update existing quotes, so that I can make adjustments based on customer feedback or changing requirements.

#### Acceptance Criteria

1. WHEN viewing a saved quote THEN the system SHALL provide an "Edit Quote" option
2. WHEN editing a quote THEN the system SHALL pre-populate the form with existing quote data
3. WHEN saving an edited quote THEN the system SHALL maintain version history
4. WHEN a quote is updated THEN the system SHALL optionally send an updated quote email to the agent
5. WHEN viewing quote history THEN the system SHALL display all versions with timestamps and change indicators

### Requirement 6

**User Story:** As an agent, I want to receive professional quote emails with clear booking options, so that I can easily proceed with reservations for my customers.

#### Acceptance Criteria

1. WHEN receiving a quote email THEN the agent SHALL see a professional, branded email design
2. WHEN viewing the quote email THEN the agent SHALL see all quote details clearly formatted
3. WHEN the agent wants to book THEN the system SHALL provide a prominent "I'd like to book" button
4. WHEN clicking the booking button THEN the system SHALL direct the agent to the appropriate booking process
5. WHEN the quote email is opened THEN the system SHALL track email engagement for administrative reporting