# Requirements Document

## Introduction

The Enhanced Offers Excel Upload feature will allow administrators to upload comprehensive resort pricing data via Excel files. Each Excel file will contain detailed pricing information for a specific destination, including monthly pricing based on number of nights and pax (people), along with package inclusions. The system needs to intelligently parse these Excel files and extract structured data for storage in the offers database.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to upload Excel files containing resort pricing data, so that I can efficiently manage offer pricing for multiple destinations without manual data entry.

#### Acceptance Criteria

1. WHEN an administrator uploads an Excel file THEN the system SHALL validate the file format (xlsx, xls)
2. WHEN the file is valid THEN the system SHALL extract the resort name from the file or sheet
3. WHEN parsing the Excel THEN the system SHALL identify months in the first column or header row
4. WHEN processing pricing data THEN the system SHALL extract prices based on nights (2, 3, 4+) and pax combinations
5. WHEN the file contains package inclusions THEN the system SHALL extract the inclusions list from the bottom section
6. IF the file structure is invalid THEN the system SHALL provide clear error messages indicating what needs to be corrected

### Requirement 2

**User Story:** As an administrator, I want the system to automatically detect and parse different Excel layouts, so that I don't need to reformat existing supplier Excel files.

#### Acceptance Criteria

1. WHEN the system encounters different Excel layouts THEN it SHALL attempt to auto-detect the structure
2. WHEN months are in rows THEN the system SHALL parse pricing data horizontally
3. WHEN months are in columns THEN the system SHALL parse pricing data vertically
4. WHEN pricing headers contain "nights" or "pax" information THEN the system SHALL extract this metadata
5. WHEN accommodation types are specified (Hotel, Self-Catering) THEN the system SHALL group pricing accordingly
6. IF multiple sheets exist THEN the system SHALL allow sheet selection or process all relevant sheets

### Requirement 3

**User Story:** As an administrator, I want to preview the parsed data before importing, so that I can verify the extraction accuracy and make corrections if needed.

#### Acceptance Criteria

1. WHEN an Excel file is uploaded THEN the system SHALL display a preview of extracted data
2. WHEN showing the preview THEN the system SHALL display resort name, pricing structure, and inclusions
3. WHEN pricing data is parsed THEN the system SHALL show a structured table with months, nights, pax, and prices
4. WHEN inclusions are found THEN the system SHALL display them as a formatted list
5. IF parsing errors occur THEN the system SHALL highlight problematic data with suggestions
6. WHEN the preview is satisfactory THEN the administrator SHALL be able to proceed with import

### Requirement 4

**User Story:** As an administrator, I want to map Excel columns to system fields, so that I can handle variations in Excel file formats from different suppliers.

#### Acceptance Criteria

1. WHEN the system detects unmapped columns THEN it SHALL provide a column mapping interface
2. WHEN mapping columns THEN the administrator SHALL be able to assign Excel columns to system fields
3. WHEN common patterns are detected THEN the system SHALL suggest automatic mappings
4. WHEN custom mappings are created THEN the system SHALL save them for future use with similar files
5. IF required fields are not mapped THEN the system SHALL prevent import and show validation errors
6. WHEN mappings are complete THEN the system SHALL update the preview with mapped data

### Requirement 5

**User Story:** As an administrator, I want the system to handle complex pricing structures with multiple accommodation types and pax variations, so that I can accurately represent all pricing options.

#### Acceptance Criteria

1. WHEN processing pricing data THEN the system SHALL support multiple accommodation types (Hotel, Self-Catering, Apartment, etc.)
2. WHEN extracting prices THEN the system SHALL handle different pax counts (2, 4, 6, 8+ people)
3. WHEN nights vary THEN the system SHALL support 2, 3, 4, 5+ night options
4. WHEN special periods exist (Easter, Peak Season) THEN the system SHALL preserve these as distinct pricing periods
5. IF pricing cells are merged THEN the system SHALL apply the price to all applicable combinations
6. WHEN prices are missing THEN the system SHALL mark them as unavailable rather than zero

### Requirement 6

**User Story:** As an administrator, I want the system to extract and structure package inclusions from the Excel file, so that customers can see what's included in each offer.

#### Acceptance Criteria

1. WHEN inclusions are listed in the Excel THEN the system SHALL extract them as individual items
2. WHEN inclusions use bullet points or numbering THEN the system SHALL clean the formatting
3. WHEN inclusions are in a separate section THEN the system SHALL identify and parse this section
4. WHEN inclusions vary by accommodation type THEN the system SHALL associate them correctly
5. IF inclusions contain special formatting (bold, italics) THEN the system SHALL preserve important emphasis
6. WHEN inclusions are extracted THEN the system SHALL validate they are meaningful (not empty or placeholder text)

### Requirement 7

**User Story:** As an administrator, I want comprehensive error handling and validation, so that I can identify and fix data issues before they affect the live system.

#### Acceptance Criteria

1. WHEN validation errors occur THEN the system SHALL provide specific error messages with row/column references
2. WHEN data is missing THEN the system SHALL indicate which required fields are empty
3. WHEN prices are invalid THEN the system SHALL highlight problematic values and suggest corrections
4. WHEN duplicate data is detected THEN the system SHALL offer merge or replace options
5. IF the import fails THEN the system SHALL provide a detailed error report
6. WHEN warnings exist THEN the system SHALL allow the administrator to proceed with acknowledgment

### Requirement 8

**User Story:** As an administrator, I want to track import history and changes, so that I can audit pricing updates and revert if necessary.

#### Acceptance Criteria

1. WHEN an import is completed THEN the system SHALL log the import details (file, user, timestamp)
2. WHEN offers are updated THEN the system SHALL track what changed (prices, inclusions, etc.)
3. WHEN viewing import history THEN the administrator SHALL see a list of all imports with status
4. WHEN an import needs to be reverted THEN the system SHALL provide rollback functionality
5. IF conflicts arise THEN the system SHALL show what would be overwritten before proceeding
6. WHEN imports are successful THEN the system SHALL provide a summary of changes made