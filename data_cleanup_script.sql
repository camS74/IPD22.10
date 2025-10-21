-- ============================================================
-- Data Cleanup Script for FP Data
-- ============================================================
-- This script should be run after every data import to ensure
-- consistent data formatting and prevent whitespace issues

-- Start transaction for safety
BEGIN;

-- 1. TRIM all text columns to remove leading/trailing whitespace
UPDATE fp_data 
SET 
    month = TRIM(month),
    type = TRIM(type),
    salesrepname = TRIM(salesrepname),
    customername = TRIM(customername),
    countryname = TRIM(countryname),
    productgroup = TRIM(productgroup),
    material = TRIM(material),
    process = TRIM(process),
    values_type = TRIM(values_type)
WHERE 
    month != TRIM(month) OR
    type != TRIM(type) OR
    salesrepname != TRIM(salesrepname) OR
    customername != TRIM(customername) OR
    countryname != TRIM(countryname) OR
    productgroup != TRIM(productgroup) OR
    material != TRIM(material) OR
    process != TRIM(process) OR
    values_type != TRIM(values_type);

-- 2. Standardize case for type field (Budget/Actual)
UPDATE fp_data 
SET type = CASE 
    WHEN LOWER(TRIM(type)) = 'budget' THEN 'Budget'
    WHEN LOWER(TRIM(type)) = 'actual' THEN 'Actual'
    ELSE INITCAP(TRIM(type))
END
WHERE LOWER(TRIM(type)) IN ('budget', 'actual') AND type != CASE 
    WHEN LOWER(TRIM(type)) = 'budget' THEN 'Budget'
    WHEN LOWER(TRIM(type)) = 'actual' THEN 'Actual'
    ELSE INITCAP(TRIM(type))
END;

-- 3. Standardize month names (ensure proper capitalization)
UPDATE fp_data 
SET month = CASE 
    WHEN LOWER(TRIM(month)) = 'january' THEN 'January'
    WHEN LOWER(TRIM(month)) = 'february' THEN 'February'
    WHEN LOWER(TRIM(month)) = 'march' THEN 'March'
    WHEN LOWER(TRIM(month)) = 'april' THEN 'April'
    WHEN LOWER(TRIM(month)) = 'may' THEN 'May'
    WHEN LOWER(TRIM(month)) = 'june' THEN 'June'
    WHEN LOWER(TRIM(month)) = 'july' THEN 'July'
    WHEN LOWER(TRIM(month)) = 'august' THEN 'August'
    WHEN LOWER(TRIM(month)) = 'september' THEN 'September'
    WHEN LOWER(TRIM(month)) = 'october' THEN 'October'
    WHEN LOWER(TRIM(month)) = 'november' THEN 'November'
    WHEN LOWER(TRIM(month)) = 'december' THEN 'December'
    ELSE INITCAP(TRIM(month))
END
WHERE LOWER(TRIM(month)) IN (
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
);

-- 4. Remove any completely empty rows
DELETE FROM fp_data 
WHERE 
    (salesrepname IS NULL OR TRIM(salesrepname) = '') AND
    (customername IS NULL OR TRIM(customername) = '') AND
    (productgroup IS NULL OR TRIM(productgroup) = '') AND
    (values IS NULL OR values = 0);

-- 5. Update any NULL text fields to empty strings for consistency
UPDATE fp_data 
SET 
    salesrepname = COALESCE(salesrepname, ''),
    customername = COALESCE(customername, ''),
    countryname = COALESCE(countryname, ''),
    productgroup = COALESCE(productgroup, ''),
    material = COALESCE(material, ''),
    process = COALESCE(process, ''),
    values_type = COALESCE(values_type, '')
WHERE 
    salesrepname IS NULL OR
    customername IS NULL OR
    countryname IS NULL OR
    productgroup IS NULL OR
    material IS NULL OR
    process IS NULL OR
    values_type IS NULL;

-- 6. Ensure numeric values are properly formatted
UPDATE fp_data 
SET values = 0 
WHERE values IS NULL;

-- Report cleanup results
SELECT 
    'Data Cleanup Complete' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT salesrepname) as unique_sales_reps,
    COUNT(DISTINCT productgroup) as unique_product_groups,
    COUNT(DISTINCT type) as unique_types,
    COUNT(DISTINCT month) as unique_months
FROM fp_data;

-- Show sample of cleaned data
SELECT 
    'Sample Cleaned Data' as info,
    year, month, type, salesrepname, productgroup, values_type, values
FROM fp_data 
LIMIT 5;

-- Commit the changes
COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check for any remaining whitespace issues
SELECT 'Whitespace Check' as check_type, COUNT(*) as issues_found
FROM fp_data 
WHERE 
    month != TRIM(month) OR
    type != TRIM(type) OR
    salesrepname != TRIM(salesrepname) OR
    customername != TRIM(customername) OR
    countryname != TRIM(countryname) OR
    productgroup != TRIM(productgroup) OR
    material != TRIM(material) OR
    process != TRIM(process) OR
    values_type != TRIM(values_type);

-- Check type standardization
SELECT 'Type Standardization' as check_type, type, COUNT(*) as count
FROM fp_data 
GROUP BY type
ORDER BY type;

-- Check month standardization
SELECT 'Month Standardization' as check_type, month, LENGTH(month) as length, COUNT(*) as count
FROM fp_data 
GROUP BY month, LENGTH(month)
ORDER BY month;

-- Performance check - ensure indexes are still optimal
ANALYZE fp_data;