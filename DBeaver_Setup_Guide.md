# DBeaver Setup Guide for FP Data Import

## Overview
This guide will help you create a PostgreSQL table in DBeaver and import the data from `fp_data.xlsx` file (33,316 rows).

## 📋 Prerequisites
- DBeaver installed and connected to PostgreSQL database
- fp_data.xlsx file ready (already in long format - perfect!)
- Admin access to create tables and import data

## 🗃️ File Analysis Summary
**fp_data.xlsx Structure:**
- **Rows:** 33,316 records + 1 header row
- **Columns:** 11 columns
- **Format:** Already in long format (no conversion needed!)

**Columns:**
1. `Year` (number) - 2019, 2020, etc.
2. `Month` (text) - "January", "February", etc. (note: some have trailing spaces)
3. `Type` (text) - "Actual" or "Budget"
4. `salesrepname` (text) - Sales representative names
5. `customername` (text) - Customer company names
6. `countryname` (text) - Country names
7. `productgroup` (text) - Product categories
8. `material` (text) - Material types (PE, BOPP, etc.)
9. `process` (text) - Process types (Printed, Unprinted, etc.)
10. `values_type` (text) - Metric types (KGS, Amount, MoRM, etc.)
11. `values` (number) - The actual values/measurements

## 🚀 Step-by-Step Setup

### Step 1: Create the Database Table

1. **Open DBeaver** and connect to your PostgreSQL database
2. **Open SQL Editor** (Ctrl+Shift+Enter or click SQL icon)
3. **Run the table creation script:**
   - Copy and paste the contents of `setup_fp_data_long_format.sql`
   - Execute the script (Ctrl+Enter)
   - This will create the `fp_data_long` table with proper indexes and comments

### Step 2: Convert Excel to CSV (Optional but Recommended)

**Option A: Use the Wide to Long Converter (Already Done!)**
- Your fp_data.xlsx is already in long format, so no conversion needed
- Just export it as CSV from Excel: File → Save As → CSV

**Option B: Direct Excel Import**
- DBeaver can import directly from Excel files
- Skip to Step 3 if using this method

### Step 3: Import Data using DBeaver

1. **Right-click** on the `fp_data_long` table in DBeaver
2. **Select** "Import Data"
3. **Choose** data source:
   - For CSV: Select "CSV" and browse to your CSV file
   - For Excel: Select "Excel" and browse to fp_data.xlsx
4. **Configure import settings:**
   - **Sheet:** Select "Sheet1"
   - **Header:** Check "First line contains column names"
   - **Encoding:** UTF-8
5. **Map columns** (DBeaver should auto-detect):
   ```
   Excel Column    →  Database Column
   Year           →  year
   Month          →  month
   Type           →  type
   salesrepname   →  salesrepname
   customername   →  customername
   countryname    →  countryname
   productgroup   →  productgroup
   material       →  material
   process        →  process
   values_type    →  values_type
   values         →  values
   ```
6. **Skip columns:** Leave `id`, `created_at`, `updated_at` unchecked (auto-generated)
7. **Start import** and wait for completion

### Step 4: Verify Import

Run these queries to verify the import was successful:

```sql
-- Check total records (should be 33,316)
SELECT COUNT(*) as total_records FROM fp_data_long;

-- Check sample data
SELECT * FROM fp_data_long LIMIT 10;

-- Check data distribution
SELECT year, type, COUNT(*) as record_count
FROM fp_data_long 
GROUP BY year, type 
ORDER BY year, type;
```

### Step 5: Data Cleanup (Run after Import)

Execute the cleanup script from `import_fp_data.sql`:

```sql
-- Remove trailing spaces from month names
UPDATE fp_data_long 
SET month = TRIM(month) 
WHERE month != TRIM(month);

-- Ensure consistent case for type field
UPDATE fp_data_long 
SET type = INITCAP(type) 
WHERE type != INITCAP(type);
```

## 📊 Useful Queries for Analysis

### Basic Statistics
```sql
-- Data summary
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT year) as unique_years,
    COUNT(DISTINCT salesrepname) as unique_salesreps,
    COUNT(DISTINCT productgroup) as unique_productgroups,
    MIN(year) as earliest_year,
    MAX(year) as latest_year
FROM fp_data_long;
```

### Sales Rep Performance
```sql
-- Top sales reps by amount
SELECT salesrepname, SUM(values) as total_amount
FROM fp_data_long 
WHERE values_type = 'Amount' AND type = 'Actual'
GROUP BY salesrepname 
ORDER BY total_amount DESC 
LIMIT 10;
```

### Monthly Trends
```sql
-- Monthly sales trend for 2024
SELECT month, SUM(values) as monthly_total
FROM fp_data_with_month_num
WHERE year = 2024 AND values_type = 'Amount' AND type = 'Actual'
GROUP BY month, month_num
ORDER BY month_num;
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Import fails with encoding errors:**
   - Save Excel file as CSV with UTF-8 encoding
   - Or use "Import Data" → "Excel" instead of CSV

2. **Month names have trailing spaces:**
   - Run the cleanup query from Step 5

3. **Wrong data types:**
   - Ensure Year column is mapped to INTEGER
   - Ensure values column is mapped to NUMERIC

4. **Performance issues:**
   - The indexes are automatically created
   - If still slow, run: `ANALYZE fp_data_long;`

## ✅ Success Indicators

Your import is successful when:
- ✅ Table contains 33,316 records
- ✅ All years from 2019 onwards are present
- ✅ Both 'Actual' and 'Budget' types exist
- ✅ Sales rep names are properly imported
- ✅ Numeric values are correctly stored

## 🔗 Integration with Application

Once imported, this data will be compatible with:
- The existing Dashboard application
- Sales by Sales Rep component
- Master Data component
- All charts and reports

The long format is actually much better for analysis and reporting than the wide format! 