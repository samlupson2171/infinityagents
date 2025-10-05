# Activities Module Requirements Document

## Introduction

The Activities Module is a comprehensive system that enables travel agents to search, browse, and manage activities for custom holiday packages. The system supports CSV-based activity uploads by administrators and provides agents with powerful tools to build and export activity packages with pricing calculations and branded PDF quotes.

## Requirements

### Requirement 1: CSV Activity Upload System

**User Story:** As an administrator, I want to upload activities via CSV files, so that I can efficiently manage large volumes of activity data.

#### Acceptance Criteria

1. WHEN an admin uploads a CSV file THEN the system SHALL validate the file format and required headers
2. WHEN the CSV contains valid data THEN the system SHALL import all activities to the database
3. WHEN the CSV contains invalid data THEN the system SHALL display validation errors with specific line numbers
4. WHEN an activity already exists (duplicate check by name + location) THEN the system SHALL update the existing record
5. IF the CSV file exceeds 10MB THEN the system SHALL reject the upload with an appropriate error message
6. WHEN the upload is successful THEN the system SHALL display a summary of imported/updated activities

### Requirement 2: Activity Data Management

**User Story:** As an administrator, I want to manage activity data with proper validation, so that agents have accurate and complete information.

#### Acceptance Criteria

1. WHEN storing activity data THEN the system SHALL validate all required fields (Activity, Category, Location, PricePerPerson, MinPersons, MaxPersons, AvailableFrom, AvailableTo, Duration, Description)
2. WHEN validating dates THEN the system SHALL ensure AvailableFrom is before AvailableTo
3. WHEN validating capacity THEN the system SHALL ensure MinPersons is less than or equal to MaxPersons
4. WHEN validating price THEN the system SHALL ensure PricePerPerson is a positive number
5. WHEN an activity is created THEN the system SHALL assign a unique identifier and timestamp

### Requirement 3: Activity Search and Filtering

**User Story:** As a travel agent, I want to search and filter activities by multiple criteria, so that I can quickly find relevant activities for my clients.

#### Acceptance Criteria

1. WHEN searching by keyword THEN the system SHALL search activity names and descriptions
2. WHEN filtering by destination THEN the system SHALL show only activities in the selected location
3. WHEN filtering by category THEN the system SHALL show only activities of the selected type
4. WHEN filtering by date range THEN the system SHALL show only activities available during the specified period
5. WHEN filtering by price range THEN the system SHALL show only activities within the specified price bounds
6. WHEN multiple filters are applied THEN the system SHALL combine all filters with AND logic
7. WHEN no activities match the criteria THEN the system SHALL display a "no results" message

### Requirement 4: Activity Detail Display

**User Story:** As a travel agent, I want to view comprehensive activity details, so that I can make informed decisions for my clients.

#### Acceptance Criteria

1. WHEN viewing an activity detail page THEN the system SHALL display all activity information (name, category, location, price, capacity, dates, duration, description)
2. WHEN the activity has availability constraints THEN the system SHALL clearly display minimum and maximum person requirements
3. WHEN the activity has date restrictions THEN the system SHALL display the available date range
4. WHEN viewing pricing THEN the system SHALL display the price per person in EUR
5. WHEN the activity is available THEN the system SHALL show an "Add to Package" button

### Requirement 5: Package Builder System

**User Story:** As a travel agent, I want to build activity packages by adding multiple activities, so that I can create comprehensive holiday offerings for clients.

#### Acceptance Criteria

1. WHEN adding an activity to a package THEN the system SHALL add it to the current package builder
2. WHEN viewing the package builder THEN the system SHALL display all selected activities with individual prices
3. WHEN calculating package total THEN the system SHALL multiply each activity price by the number of persons and sum all activities
4. WHEN removing an activity from the package THEN the system SHALL update the total cost automatically
5. WHEN the package is empty THEN the system SHALL display a message encouraging agents to add activities
6. WHEN the package contains activities THEN the system SHALL show options to save as draft or export as PDF

### Requirement 6: Package Management

**User Story:** As a travel agent, I want to save and manage activity packages, so that I can work on multiple client proposals simultaneously.

#### Acceptance Criteria

1. WHEN saving a package as draft THEN the system SHALL store the package with a unique identifier and timestamp
2. WHEN viewing saved packages THEN the system SHALL display a list of all draft packages with creation dates
3. WHEN loading a saved package THEN the system SHALL restore all selected activities and calculations
4. WHEN deleting a saved package THEN the system SHALL remove it permanently after confirmation
5. WHEN a package is saved THEN the system SHALL associate it with the current logged-in agent

### Requirement 7: PDF Export System

**User Story:** As a travel agent, I want to export activity packages as branded PDF quotes, so that I can provide professional proposals to clients.

#### Acceptance Criteria

1. WHEN exporting a package as PDF THEN the system SHALL generate a branded document with company logo and styling
2. WHEN the PDF is generated THEN it SHALL include all activity details (name, description, price, duration)
3. WHEN calculating totals THEN the PDF SHALL show individual activity costs and grand total
4. WHEN the PDF is created THEN it SHALL include agent contact information and company branding
5. WHEN the export is complete THEN the system SHALL provide a download link for the PDF file
6. IF the package is empty THEN the system SHALL prevent PDF export and display an error message

### Requirement 8: Activity Availability Validation

**User Story:** As a travel agent, I want the system to validate activity availability, so that I don't create packages with unavailable activities.

#### Acceptance Criteria

1. WHEN adding an activity to a package THEN the system SHALL check if the activity is currently available
2. WHEN an activity's availability period has expired THEN the system SHALL mark it as unavailable
3. WHEN viewing expired activities THEN the system SHALL display them with clear unavailable status
4. WHEN building a package with unavailable activities THEN the system SHALL warn the agent
5. WHEN exporting a package THEN the system SHALL validate all activities are still available

### Requirement 9: Admin Activity Management

**User Story:** As an administrator, I want to manage individual activities through the admin interface, so that I can maintain accurate activity data.

#### Acceptance Criteria

1. WHEN viewing the admin activities section THEN the system SHALL display all activities in a searchable table
2. WHEN editing an activity THEN the system SHALL provide a form with all editable fields
3. WHEN deleting an activity THEN the system SHALL remove it from all packages and confirm the action
4. WHEN deactivating an activity THEN the system SHALL mark it as unavailable but preserve historical data
5. WHEN bulk operations are needed THEN the system SHALL provide options to activate/deactivate multiple activities

### Requirement 10: Error Handling and User Feedback

**User Story:** As a user of the system, I want clear error messages and feedback, so that I understand what actions to take when issues occur.

#### Acceptance Criteria

1. WHEN a CSV upload fails THEN the system SHALL display specific error messages with line numbers
2. WHEN network requests fail THEN the system SHALL show user-friendly error messages
3. WHEN validation fails THEN the system SHALL highlight problematic fields with clear explanations
4. WHEN operations are successful THEN the system SHALL display confirmation messages
5. WHEN loading data THEN the system SHALL show appropriate loading indicators