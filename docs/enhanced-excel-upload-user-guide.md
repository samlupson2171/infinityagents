# Enhanced Offers Excel Upload - User Guide

## Overview

The Enhanced Offers Excel Upload system provides intelligent parsing, validation, and import capabilities for resort pricing data. This guide will walk you through using all the features to successfully import your Excel data.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Preparing Your Excel File](#preparing-your-excel-file)
3. [Upload Process](#upload-process)
4. [Column Mapping](#column-mapping)
5. [Data Validation](#data-validation)
6. [Data Preview](#data-preview)
7. [Import Configuration](#import-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- Admin access to the Infinity Weekends system
- Excel file with resort pricing data
- Basic understanding of your data structure

### Accessing the Upload Interface

1. Log in to the admin panel
2. Navigate to **Admin > Offers**
3. Click the **Upload Excel** button
4. You'll see the Enhanced Excel Upload interface

## Preparing Your Excel File

### Supported File Formats

- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- Maximum file size: 10MB

### Recommended Data Structure

#### Option 1: Months in Rows
```
Month          | Hotel Price | Apartment Price | Villa Price
January        | €150        | €120           | €300
February       | €160        | €130           | €320
March          | €170        | €140           | €340
```

#### Option 2: Months in Columns
```
Accommodation  | Jan  | Feb  | Mar  | Apr
Hotel          | €150 | €160 | €170 | €180
Apartment      | €120 | €130 | €140 | €150
Villa          | €300 | €320 | €340 | €360
```

### Required Fields

- **Month**: Month names (January, Feb, Mar) or special periods (Easter, Peak Season)
- **Price**: Numeric values with optional currency symbols (€150, $200, 250)

### Optional Fields

- **Accommodation Type**: Hotel, Apartment, Villa, Resort, Self-Catering
- **Nights**: Number of nights (2, 3, 7)
- **Pax**: Number of people (2, 4, 6)
- **Inclusions**: Package inclusions (can be in separate section)
- **Currency**: EUR, GBP, USD
- **Special Period**: Easter, Peak Season, High Season

### Inclusions Format

Inclusions can be formatted in several ways:

#### Bullet Points
```
Package Includes:
• Daily breakfast
• Airport transfers
• Free WiFi
• Pool access
```

#### Numbered List
```
What's Included:
1. Breakfast buffet
2. Swimming pool
3. Fitness center
4. 24-hour reception
```

#### Plain Text
```
Inclusions:
Breakfast included
Airport pickup
Daily housekeeping
Complimentary WiFi
```

## Upload Process

### Step 1: File Upload

1. Click **Choose File** or drag and drop your Excel file
2. The system will automatically analyze your file structure
3. Wait for the analysis to complete (usually 2-5 seconds)

### Step 2: Smart Detection Results

The system will show:
- **Layout Type**: Months-in-rows, months-in-columns, or pricing matrix
- **Confidence Score**: How confident the system is about the detection
- **Detected Elements**: Resort name, currency, special periods
- **Suggestions**: Recommendations for improving your file

## Column Mapping

### Automatic Mapping

The system automatically suggests mappings based on:
- Column header names
- Data content analysis
- Pattern recognition
- Previous mapping templates

### Manual Mapping Options

#### Dropdown Interface
1. Each Excel column shows a dropdown menu
2. Select the appropriate system field
3. The system shows confidence levels and data types
4. Required fields are marked with *

#### Drag & Drop Interface
1. Switch to "Drag & Drop" mode
2. Drag system fields from the right panel
3. Drop them onto Excel columns on the left
4. Visual feedback shows mapping status

### Mapping Features

- **Confidence Indicators**: High (green), Medium (yellow), Low (red)
- **Data Type Detection**: Automatic detection of currency, numbers, text
- **Alternative Suggestions**: Multiple mapping options for ambiguous columns
- **Template Saving**: Save successful mappings for future use

### Using Mapping Templates

1. **Apply Suggestions**: Use the system's automatic suggestions
2. **Load Template**: Choose from saved templates
3. **Save Template**: Save your current mapping for reuse
4. **Template Management**: Edit, delete, or organize templates

## Data Validation

### Validation Levels

#### Field-Level Validation
- **Required Fields**: Month and Price must be present
- **Data Types**: Prices must be numbers, months must be valid
- **Format Validation**: Currency symbols, date formats
- **Range Validation**: Reasonable price ranges, night counts

#### Business Rules Validation
- **Pricing Completeness**: All month/accommodation combinations have prices
- **Price Consistency**: Prices are within reasonable ranges
- **Currency Consistency**: Single currency throughout the file
- **Duplicate Detection**: Identifies duplicate rows

### Validation Results

#### Error Types
- **Critical**: Must be fixed before import (missing required fields)
- **Error**: Should be fixed (invalid data formats)
- **Warning**: Recommended to review (unusual values)
- **Info**: Informational notices (suggestions for improvement)

#### Validation Report
- **Summary**: Total errors, warnings, and valid rows
- **Field Issues**: Which fields have problems
- **Detailed Errors**: Specific error messages with suggestions
- **Suggestions**: Actionable recommendations

## Data Preview

### Preview Modes

#### Table View
- Traditional spreadsheet-like display
- Sortable columns
- Filter by month, accommodation type
- Shows validation status for each row

#### Cards View
- Grouped by accommodation type
- Compact display of pricing information
- Easy to scan multiple options

#### Summary View
- High-level statistics
- Price ranges and coverage
- Data completeness metrics

### Preview Features

- **Filtering**: Filter by month, accommodation type, price range
- **Search**: Find specific data points
- **Validation Integration**: See errors and warnings inline
- **Sample Data**: Preview of how data will be imported

### Tabs

#### Pricing Data
- All pricing information
- Accommodation types and periods
- Price validation results

#### Inclusions
- Detected package inclusions
- Formatting and quality assessment
- Missing inclusions warnings

#### Metadata
- Resort information
- Data coverage statistics
- Currency and period detection

#### Validation
- Complete validation report
- Error details and suggestions
- Field-by-field analysis

## Import Configuration

### Import Options

#### Conflict Resolution
- **Skip Duplicates**: Don't import duplicate data
- **Update Existing**: Replace existing offers with new data
- **Create New**: Always create new offers

#### Data Processing
- **Validate Before Import**: Run full validation
- **Auto-fix Minor Issues**: Automatically correct common problems
- **Import Inclusions**: Include detected inclusions

### Import Process

1. **Review Configuration**: Check all settings
2. **Start Import**: Begin the import process
3. **Monitor Progress**: Real-time progress updates
4. **Review Results**: Import summary and any issues

## Troubleshooting

### Common Issues

#### File Upload Problems
**Issue**: File won't upload
**Solutions**:
- Check file size (max 10MB)
- Ensure file format is .xlsx or .xls
- Try saving file in Excel format again

#### Layout Detection Issues
**Issue**: Wrong layout detected
**Solutions**:
- Check month names are in standard format
- Ensure pricing data is numeric
- Remove merged cells and complex formatting

#### Mapping Problems
**Issue**: Columns not mapping correctly
**Solutions**:
- Use clear, descriptive column headers
- Check data consistency in columns
- Manually adjust mappings using dropdown

#### Validation Errors
**Issue**: Many validation errors
**Solutions**:
- Review error messages and suggestions
- Fix data in Excel and re-upload
- Use the validation report to identify patterns

### Error Messages

#### "No pricing data detected"
- Ensure prices are numbers, not text
- Check for currency symbols or formatting
- Verify month names are recognizable

#### "Required field missing"
- Map Month and Price columns
- Check that required data exists
- Review column mapping assignments

#### "Invalid month format"
- Use standard month names (January, Feb, Mar)
- Check for typos in month names
- Consider using special periods (Easter, Peak Season)

#### "Price format errors"
- Remove text from price cells
- Use consistent currency symbols
- Ensure decimal formatting is correct

## Best Practices

### Excel File Preparation

1. **Use Clear Headers**: "Month", "Price", "Hotel Rate" instead of "M", "P", "HR"
2. **Consistent Formatting**: Same currency symbol throughout
3. **Standard Month Names**: January, February, or Jan, Feb (not Jan., Feb.)
4. **Clean Data**: Remove empty rows, merged cells, complex formatting
5. **Single Sheet**: Put all data on one sheet

### Data Organization

1. **Logical Layout**: Group related data together
2. **Complete Data**: Fill in all required fields
3. **Consistent Types**: Same accommodation types throughout
4. **Reasonable Ranges**: Check prices are realistic

### Inclusions Best Practices

1. **Clear Section Headers**: "Package Includes", "What's Included"
2. **Consistent Formatting**: Use bullets or numbers consistently
3. **Descriptive Text**: "Daily breakfast" not just "Breakfast"
4. **Separate Sections**: Group by accommodation type if different

### Template Management

1. **Save Successful Mappings**: Create templates for reuse
2. **Descriptive Names**: "Resort Pricing 2024", "Hotel Rates Template"
3. **Regular Updates**: Update templates as data formats change
4. **Share Templates**: Use consistent templates across team

### Validation Strategy

1. **Fix Critical Errors First**: Address required field issues
2. **Review Warnings**: Check unusual values
3. **Use Suggestions**: Follow system recommendations
4. **Test Small Files**: Start with smaller datasets

## Advanced Features

### Mapping Templates

#### Creating Templates
1. Complete a successful mapping
2. Click "Save as Template"
3. Provide descriptive name and patterns
4. Template is saved for future use

#### Template Patterns
- Use patterns like "resort.*pricing" to auto-match files
- Templates suggest automatically based on column headers
- Most-used templates appear first

### Batch Processing

#### Multiple Files
1. Process similar files using same template
2. Consistent mapping across uploads
3. Bulk validation and import

#### Data Validation Rules

#### Custom Rules
- Add business-specific validation rules
- Configure acceptable price ranges
- Set required accommodation types

### Import History

#### Tracking
- All imports are logged with timestamps
- Track who imported what data
- Maintain audit trail

#### Rollback
- Undo imports if needed
- Restore previous data state
- Selective rollback options

## Support and Resources

### Getting Help

1. **Validation Messages**: Read error messages and suggestions carefully
2. **Preview Data**: Use preview to verify data before import
3. **Templates**: Use or create templates for consistent results
4. **Documentation**: Refer to this guide for detailed instructions

### Contact Support

If you encounter issues not covered in this guide:
- Contact the system administrator
- Provide the Excel file and error messages
- Include screenshots of the problem

### Training Resources

- Video tutorials (coming soon)
- Sample Excel files for practice
- Best practices workshops
- Regular system updates and improvements

---

## Quick Reference

### Supported Month Formats
- Full names: January, February, March
- Abbreviations: Jan, Feb, Mar
- Special periods: Easter, Peak Season, High Season, Off Season

### Supported Price Formats
- Numbers: 150, 200.50
- With currency: €150, $200, £250
- With commas: 1,500, 2,000.50

### Required Fields
- Month (required)
- Price (required)

### Optional Fields
- Accommodation Type
- Nights
- Pax
- Currency
- Inclusions
- Special Period

### File Limits
- Maximum size: 10MB
- Supported formats: .xlsx, .xls
- Maximum rows: 10,000 (recommended)

This guide covers all aspects of using the Enhanced Offers Excel Upload system. For the best results, follow the preparation guidelines and use the validation feedback to ensure clean, accurate data imports.