# Excel Upload Template Guide

## Template Structure

Use this exact structure for your Excel files (based on the Albufeira format):

### Row Structure:
1. **Row 1**: `Resort`, `[Resort Name]`
2. **Row 2**: `Destination`, `[Destination Name]`
3. **Row 3**: Empty row
4. **Row 4**: `How many People`, `6-11 People`, ``, ``, `12+ People`
5. **Row 5**: `Months`, `2 Nights`, `3 Nights`, `4 Nights`, `2 Nights`, `3 Nights`, `4 Nights`
6. **Row 6+**: `[Month]`, `[Price]`, `[Price]`, `[Price]`, `[Price]`, `[Price]`, `[Price]`

### Pricing Section:
- Column A: Month names (January, February, March, etc.)
- Columns B-G: Prices for different night options
- Use "ON REQUEST" for unavailable periods
- Prices can include currency symbols (€ 85.00) or just numbers (85.00)

### Inclusions Section:
After pricing data, add:
- Empty rows
- Row with "Inclusions" in first column
- List inclusions starting with asterisk (*) in first column

## Valid Values

| Field | Valid Values | Notes |
|-------|-------------|-------|
| Resort | Any text | Will become the offer title |
| Destination | Benidorm, Albufeira, Algarve | Algarve maps to Albufeira |
| Months | January, February, March, April, May, June, July, August, September, October, November, December | Also accepts "Easter" |
| Prices | Numbers with or without € symbol | Use "ON REQUEST" for unavailable |
| Nights | 2, 3, 4 (or other numbers) | Extracted from header row |

## Example Structure

```
Resort,Albufeira,,,,,
Destination,Algarve,,,,,
,,,,,,
How many People,6-11 People,,,12+ People,,
Months,2 Nights,3 Nights,4 Nights,2 Nights,3 Nights,4 Nights
January,€ 85.00,€ 100.00,€ 119.00,€ 80.00,€ 96.00,€ 112.00
February,€ 85.00,€ 100.00,€ 119.00,€ 80.00,€ 96.00,€ 112.00
March,€ 110.00,€ 125.00,€ 140.00,€ 105.00,€ 120.00,€ 135.00
...
,,,,,,
Inclusions,,,,,,
* Return Private Airport Transfers,,,,,,
* Centrally located accommodation,,,,,,
* Meet and Greet meeting on arrival,,,,,,
```

## Important Rules

1. **Exact Format**: Follow the row structure exactly as shown
2. **Resort Info**: First two rows must contain resort and destination
3. **Pricing Header**: Must have "Months" in first column and night options in subsequent columns
4. **Month Names**: Use full month names (January, not Jan)
5. **Prices**: Can include € symbol or be plain numbers
6. **Inclusions**: Start with "Inclusions" row, then list with asterisks
7. **File Format**: Save as .xlsx or .csv

## Common Mistakes to Avoid

- ❌ Wrong row structure (resort info must be in rows 1-2)
- ❌ Missing "Months" header row
- ❌ Invalid month names
- ❌ Missing inclusions section
- ❌ Wrong destination names

## Template Files

- `offer-upload-template.csv` - Use this as your starting template
- Follow this exact structure for successful uploads