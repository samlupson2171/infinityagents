# Activities Module User Guide

## Overview

The Activities Module allows travel agents to search, browse, and manage activities for custom holiday packages. Administrators can upload and manage activity data via CSV files, while travel agents can build personalized packages for their clients.

## Getting Started

### For Administrators

#### 1. Accessing the Admin Panel
- Login with your admin credentials
- Navigate to **Admin Dashboard** → **Activities**

#### 2. Uploading Activities via CSV

**CSV Format Requirements:**
- File must be in CSV format (.csv)
- Maximum file size: 10MB
- Required columns (exact names):
  - `Activity` - Name of the activity
  - `Category` - One of: excursion, show, transport, dining, adventure, cultural, nightlife, shopping
  - `Location` - City or region name
  - `PricePerPerson` - Numeric value (e.g., 45.00)
  - `MinPersons` - Minimum group size (integer)
  - `MaxPersons` - Maximum group size (integer)
  - `AvailableFrom` - Start date (YYYY-MM-DD format)
  - `AvailableTo` - End date (YYYY-MM-DD format)
  - `Duration` - Activity duration (e.g., "2 hours", "Half day")
  - `Description` - Detailed description (10-2000 characters)

**Sample CSV Row:**
```csv
Activity,Category,Location,PricePerPerson,MinPersons,MaxPersons,AvailableFrom,AvailableTo,Duration,Description
Flamenco Show,show,Benidorm,45.00,2,50,2024-01-01,2024-12-31,2 hours,Traditional Spanish flamenco performance with live music
```

**Upload Process:**
1. Click **Upload Activities** button
2. Drag and drop your CSV file or click to browse
3. Review validation results
4. Confirm import if no errors

**Validation Rules:**
- Activity names must be unique per location
- Prices must be positive numbers
- Min persons must be ≤ Max persons
- Available from date must be before available to date
- All required fields must be filled

#### 3. Managing Individual Activities

**View All Activities:**
- Use the search bar to find specific activities
- Filter by status (Active/Inactive)
- Sort by name, location, or creation date

**Edit Activities:**
- Click the edit icon next to any activity
- Modify fields as needed
- Save changes

**Bulk Operations:**
- Select multiple activities using checkboxes
- Use bulk actions to activate/deactivate multiple items

**Delete Activities:**
- Click the delete icon next to an activity
- Confirm deletion (this action cannot be undone)

### For Travel Agents

#### 1. Searching Activities

**Access the Activities Page:**
- Navigate to **Activities** from the main menu

**Search Options:**
- **Text Search:** Enter activity names or keywords
- **Location Filter:** Select specific destinations
- **Category Filter:** Choose activity types
- **Price Range:** Set minimum and maximum prices
- **Date Range:** Filter by availability dates

**Search Tips:**
- Use multiple filters to narrow results
- Search is case-insensitive
- Results update automatically as you type

#### 2. Building Activity Packages

**Adding Activities to Package:**
1. Browse or search for activities
2. Click **Add to Package** on desired activities
3. View your package in the Package Builder sidebar

**Package Builder Features:**
- **View Selected Activities:** See all added activities with details
- **Adjust Quantities:** Change number of each activity
- **Set Group Size:** Specify number of persons
- **Real-time Pricing:** Total cost updates automatically
- **Remove Activities:** Click X to remove unwanted items

**Saving Packages:**
1. Click **Save as Draft** to save for later
2. Enter package name and client details
3. Add optional notes

#### 3. Managing Saved Packages

**View Saved Packages:**
- Navigate to **Packages** from the main menu
- See all your draft and finalized packages

**Package Actions:**
- **Load:** Restore package to Package Builder for editing
- **Edit:** Modify package details
- **Finalize:** Mark package as complete
- **Export PDF:** Generate professional quote (coming soon)
- **Delete:** Remove package permanently

#### 4. Understanding Activity Information

**Activity Details Include:**
- **Name & Description:** What the activity involves
- **Category:** Type of activity (show, excursion, etc.)
- **Location:** Where it takes place
- **Price:** Cost per person in EUR
- **Group Size:** Minimum and maximum participants
- **Duration:** How long the activity lasts
- **Availability:** Date range when activity is available

**Availability Indicators:**
- ✅ **Available:** Activity is currently bookable
- ⚠️ **Expiring Soon:** Activity expires within 30 days
- ❌ **Expired:** Activity is no longer available

## Best Practices

### For Administrators

**CSV Upload Tips:**
- Always backup your data before large uploads
- Test with a small sample file first
- Use the validation error CSV as a reference for common mistakes
- Keep activity names descriptive but concise
- Ensure descriptions are detailed enough for agents to sell effectively

**Data Management:**
- Regularly review and update activity availability dates
- Deactivate rather than delete activities to preserve package history
- Use consistent location naming (e.g., always "Benidorm" not "benidorm")
- Monitor activity performance and update pricing accordingly

### For Travel Agents

**Package Building Tips:**
- Consider client preferences when selecting activities
- Mix different activity types for variety
- Check group size requirements match your client's needs
- Verify all activities are available for travel dates
- Save packages as drafts while working with clients
- Use descriptive package names for easy identification

**Client Communication:**
- Always confirm activity availability before finalizing bookings
- Explain any group size restrictions to clients
- Provide detailed activity descriptions
- Consider seasonal availability when planning trips

## Troubleshooting

### Common CSV Upload Issues

**"Activity name is required"**
- Ensure the Activity column is not empty
- Check for extra commas that might shift columns

**"Invalid category"**
- Use only these categories: excursion, show, transport, dining, adventure, cultural, nightlife, shopping
- Check spelling and use lowercase

**"Price must be positive"**
- Ensure price values are numbers without currency symbols
- Use decimal point (.) not comma (,) for decimals

**"Invalid date format"**
- Use YYYY-MM-DD format (e.g., 2024-12-31)
- Ensure dates are valid (no February 30th, etc.)

**"Duplicate activity"**
- Activity names must be unique within the same location
- Either use different names or update the existing activity

### Common Search Issues

**"No activities found"**
- Try broader search terms
- Remove some filters
- Check if activities exist for selected location/dates

**"Package total seems wrong"**
- Verify the number of persons is set correctly
- Check individual activity quantities
- Remember: Total = (Activity Price × Quantity × Number of Persons)

### Performance Tips

**For Large Datasets:**
- Use specific filters to narrow results
- Search by location first, then add other filters
- Consider using pagination for very large result sets

## Support

If you encounter issues not covered in this guide:

1. **Check System Status:** Ensure you have a stable internet connection
2. **Clear Browser Cache:** Sometimes cached data causes display issues
3. **Try Different Browser:** Test in Chrome, Firefox, or Safari
4. **Contact Support:** Reach out to your system administrator

## Sample Data Files

The following sample files are available for testing:

- **`activities-sample.csv`** - 20 realistic activities for testing uploads
- **`activities-validation-errors.csv`** - Examples of common validation errors
- **`activities-large-dataset.csv`** - 30+ activities for performance testing

These files can be found in the `src/test/sample-data/` directory and are perfect for learning the system or training new users.

## Security Notes

- Never share your login credentials
- Always log out when finished, especially on shared computers
- Report any suspicious activity to your administrator
- CSV files may contain sensitive pricing information - handle accordingly

---

*This guide covers version 1.0 of the Activities Module. Features and interfaces may change in future updates.*