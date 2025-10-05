# Excel Upload Quick Reference

## 🚀 Quick Start

### 1. Prepare Your Excel File
- ✅ Use clear column headers: "Month", "Price", "Hotel Rate"
- ✅ Standard month names: January, Feb, Mar (not Jan., Feb.)
- ✅ Numeric prices: 150, €200, $250 (not "One Hundred Fifty")
- ✅ Single currency throughout
- ✅ Remove empty rows and merged cells

### 2. Upload Process
1. **Admin Panel** → **Offers** → **Upload Excel**
2. **Choose File** or drag & drop
3. Wait for **Smart Analysis** (2-5 seconds)
4. Review **Detection Results**

### 3. Column Mapping
- **Auto-suggestions** appear automatically
- **Green** = High confidence, **Yellow** = Medium, **Red** = Low
- **Required fields**: Month*, Price*
- **Save templates** for reuse

### 4. Validation & Preview
- Fix **Critical errors** (red) before importing
- Review **Warnings** (yellow) for data quality
- Use **Preview tabs**: Pricing, Inclusions, Metadata, Validation

### 5. Import
- Configure **conflict resolution**
- Click **Import Data**
- Monitor **progress**
- Review **results**

---

## 📋 Supported Formats

### Excel Layouts

#### Months in Rows ✅
```
Month     | Hotel | Apartment | Villa
January   | €150  | €120      | €300
February  | €160  | €130      | €320
```

#### Months in Columns ✅
```
Type      | Jan  | Feb  | Mar
Hotel     | €150 | €160 | €170
Apartment | €120 | €130 | €140
```

### Month Formats ✅
- **Full**: January, February, March
- **Short**: Jan, Feb, Mar
- **Special**: Easter, Peak Season, High Season

### Price Formats ✅
- **Numbers**: 150, 200.50
- **Currency**: €150, $200, £250
- **Formatted**: 1,500, 2,000.50

### Inclusions Formats ✅
```
Package Includes:          What's Included:         Inclusions:
• Daily breakfast          1. Breakfast buffet      Breakfast included
• Airport transfers        2. Swimming pool         Airport pickup
• Free WiFi               3. Fitness center        Daily housekeeping
```

---

## ⚠️ Common Issues & Solutions

### File Upload Problems
| Issue | Solution |
|-------|----------|
| File won't upload | Check size (max 10MB), format (.xlsx/.xls) |
| "File corrupted" | Re-save in Excel, remove complex formatting |
| Upload timeout | Reduce file size, check internet connection |

### Detection Issues
| Issue | Solution |
|-------|----------|
| Wrong layout detected | Use standard month names, check data structure |
| No pricing found | Ensure prices are numbers, not text |
| Missing resort name | Add resort name in sheet name or first cells |

### Mapping Problems
| Issue | Solution |
|-------|----------|
| Low confidence mapping | Use clearer column headers |
| Required field missing | Map Month and Price columns |
| Wrong data type | Check column content consistency |

### Validation Errors
| Error Code | Meaning | Fix |
|------------|---------|-----|
| `REQUIRED_FIELD_EMPTY` | Missing required data | Fill in Month/Price fields |
| `INVALID_PRICE_FORMAT` | Price not a number | Remove text from price cells |
| `INVALID_MONTH` | Month not recognized | Use standard month names |
| `NEGATIVE_PRICE` | Price below zero | Check price values |
| `MIXED_CURRENCIES` | Multiple currencies | Use single currency |

---

## 🎯 Best Practices

### Excel Preparation
- 📝 **Clear headers**: "Month" not "M", "Price" not "P"
- 🔢 **Consistent data**: Same format throughout columns
- 🧹 **Clean structure**: No merged cells, empty rows, or complex formatting
- 💰 **Single currency**: €, $, or £ throughout (not mixed)
- 📅 **Standard months**: January, Feb, Mar (avoid Jan., Feb.)

### Data Quality
- ✅ **Complete data**: Fill all required fields
- 🎯 **Reasonable prices**: Check for typos (€1500 not €15000)
- 📊 **Consistent types**: Same accommodation types throughout
- 📝 **Descriptive inclusions**: "Daily breakfast" not just "Breakfast"

### Template Usage
- 💾 **Save successful mappings** as templates
- 🏷️ **Use descriptive names**: "Resort Pricing 2024"
- 🔄 **Reuse templates** for similar files
- 👥 **Share templates** across team

---

## 🔧 Troubleshooting Checklist

### Before Upload
- [ ] File size under 10MB
- [ ] File format is .xlsx or .xls
- [ ] Month names are standard (January, Feb, Mar)
- [ ] Prices are numbers (150, €200, not "One Fifty")
- [ ] Single currency used throughout
- [ ] No merged cells or complex formatting

### During Mapping
- [ ] Month column mapped (required)
- [ ] Price column mapped (required)
- [ ] High confidence mappings (green indicators)
- [ ] Correct data types selected
- [ ] Template saved for reuse

### Before Import
- [ ] No critical errors (red)
- [ ] Warnings reviewed and acceptable
- [ ] Preview data looks correct
- [ ] Import settings configured
- [ ] Backup of existing data (if needed)

---

## 📞 Getting Help

### Self-Service
1. **Check validation messages** - they contain specific guidance
2. **Use preview tabs** - verify data before import
3. **Try templates** - use saved mappings
4. **Review this guide** - covers most common issues

### Contact Support
- 📧 Include the Excel file and error messages
- 📸 Provide screenshots of the problem
- 📝 Describe what you were trying to do
- 🕐 Mention when the issue occurred

---

## 📚 Additional Resources

- 📖 **Full User Guide**: `docs/enhanced-excel-upload-user-guide.md`
- 🔧 **Developer Guide**: `docs/enhanced-excel-upload-developer-guide.md`
- 📊 **Sample Files**: Available from system administrator
- 🎥 **Video Tutorials**: Coming soon

---

*Last updated: December 2024*