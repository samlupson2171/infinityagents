# Excel Import System for Offers

## Overview

The new Excel import system allows you to easily import offers from Excel files (.xlsx, .xls) or CSV files. The system provides:

- **File Preview**: See the structure of your Excel file before importing
- **Column Mapping**: Map Excel columns to database fields
- **Validation**: Automatic validation of data before import
- **Batch Processing**: Import multiple offers at once
- **Error Reporting**: Detailed feedback on any issues

## How to Use

### Step 1: Access the Import System

1. Start the development server: `npm run dev`
2. Login as admin: `admin@infinityweekends.co.uk` / `admin123`
3. Navigate to **Admin Dashboard** → **Offers Management**
4. Click on the **"Upload Excel"** tab

### Step 2: Upload Your Excel File

1. Drag and drop your Excel file or click to select
2. Supported formats: `.xlsx`, `.xls`, `.csv`
3. The system will automatically preview the file structure

### Step 3: Configure Import Settings

#### Sheet Selection
- If your Excel file has multiple sheets, select the one containing offer data

#### Header Row
- Specify which row contains the column headers (usually row 0)

#### Column Mapping
- Map each Excel column to the corresponding database field:
  - **Destination**: Location/resort name (e.g., "Benidorm")
  - **Title**: Offer title (e.g., "Benidorm Stag & Hen Packages")
  - **Description**: Detailed description of the offer
  - **Month**: Month or season (e.g., "January", "Summer")
  - **Accommodation**: Hotel/accommodation type
  - **Duration**: Number of days/nights
  - **Price**: Cost per person or total cost
  - **Inclusions**: What's included (comma-separated)
  - **Exclusions**: What's not included (comma-separated)

### Step 4: Preview and Import

1. Review the sample data preview
2. Adjust column mappings if needed
3. Click **"Import Offers"** to process the file

### Step 5: Review Results

The system will show:
- **Total Processed**: Number of rows processed
- **Created**: New offers added
- **Updated**: Existing offers modified
- **Failed**: Rows that couldn't be processed
- **Warnings**: Non-critical issues
- **Errors**: Critical problems that prevented import

## Excel File Format Guidelines

### Required Columns
Your Excel file should include these essential columns:

| Column | Description | Example |
|--------|-------------|---------|
| Destination | Resort/location name | "Benidorm" |
| Title | Offer name | "Stag & Hen Packages" |
| Description | Offer details | "Ultimate party packages..." |
| Price | Cost amount | "299" or "£299" |

### Optional Columns
| Column | Description | Example |
|--------|-------------|---------|
| Month | Season/month | "January", "Summer" |
| Accommodation | Hotel type | "4-star hotel", "Apartment" |
| Duration | Length of stay | "7", "7 days", "7 nights" |
| Inclusions | What's included | "Flights, Hotel, Transfers" |
| Exclusions | What's excluded | "Meals, Insurance" |

### Data Format Tips

#### Pricing
- Numbers: `299`, `1250.50`
- With currency: `£299`, `€1250`, `$500`
- The system automatically removes currency symbols

#### Duration
- Numbers: `7`, `14`
- With text: `7 days`, `14 nights`, `1 week`
- The system extracts the number automatically

#### Inclusions/Exclusions
- Use commas, semicolons, or bullet points to separate items
- Example: `"Flights, Hotel, Transfers, Welcome drink"`
- Example: `"• Airport transfers • 4-star accommodation • Breakfast"`

#### Months
- Full names: `January`, `February`
- Abbreviations: `Jan`, `Feb`
- The system normalizes month names automatically

## Example Excel Structure

```
| Destination | Title              | Month    | Accommodation | Duration | Price | Inclusions                    |
|-------------|-------------------|----------|---------------|----------|-------|-------------------------------|
| Benidorm    | Stag Packages     | January  | 4-star hotel  | 7 days   | 299   | Flights, Hotel, Transfers     |
| Benidorm    | Stag Packages     | February | 4-star hotel  | 7 days   | 349   | Flights, Hotel, Transfers     |
| Benidorm    | Hen Packages      | January  | Apartment     | 5 days   | 249   | Accommodation, Welcome drink  |
```

## Troubleshooting

### Common Issues

#### "No valid offers found"
- Check that required columns (Destination, Title, Price) have data
- Ensure price values are numeric or contain recognizable currency

#### "Failed to parse Excel file"
- Verify the file isn't corrupted
- Try saving as a new Excel file
- Check for special characters in column headers

#### "Column mapping errors"
- Ensure all required fields are mapped
- Check that column names match your Excel headers

### Best Practices

1. **Clean Data**: Remove empty rows and ensure consistent formatting
2. **Test Small**: Start with a few rows to test the mapping
3. **Backup**: Keep a backup of your original Excel file
4. **Review**: Always review the import results before proceeding

## Advanced Features

### Bulk Updates
- If an offer with the same title and destination exists, it will be updated
- New offers are created for unique title/destination combinations

### Error Recovery
- Failed imports don't affect successful ones
- You can fix issues and re-import the same file

### Column Flexibility
- The system recognizes common column name variations
- "Dest", "Location", "City" all map to "Destination"
- "Cost", "Rate", "Amount" all map to "Price"

## API Endpoints

For developers who want to integrate programmatically:

### Preview File
```
POST /api/admin/offers/upload
Content-Type: multipart/form-data

{
  "file": [Excel file],
  "action": "preview"
}
```

### Import File
```
POST /api/admin/offers/upload
Content-Type: multipart/form-data

{
  "file": [Excel file],
  "action": "import",
  "sheetName": "Sheet1",
  "headerRow": "0",
  "columnMapping": "{\"Destination\":\"destination\",\"Title\":\"title\"}"
}
```

## Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify your Excel file format matches the guidelines
3. Try with a smaller test file first
4. Contact support with the specific error message and sample data

---

**Ready to import your offers?** Follow the steps above to get started with the new Excel import system!