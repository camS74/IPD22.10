-- SQL Query to check 2025-HY1-Actual customers in DBeaver
-- This will show you exactly what's in the database for FP division

-- Query 1: Count unique customers in 2025-HY1-Actual
SELECT COUNT(DISTINCT customername) as customer_count
FROM fp_data_excel
WHERE year = 2025
AND month IN (1, 2, 3, 4, 5, 6)
AND type = 'Actual'
AND customername IS NOT NULL
AND TRIM(customername) != '';

-- Query 2: Show all customers with their sales values (same as your Excel)
SELECT 
    customername,
    SUM(values) as total_value
FROM fp_data_excel
WHERE year = 2025
AND month IN (1, 2, 3, 4, 5, 6)
AND type = 'Actual'
AND UPPER(values_type) = 'AMOUNT'
AND customername IS NOT NULL
AND TRIM(customername) != ''
GROUP BY customername
ORDER BY total_value DESC;

-- Query 3: Get the grand total (should match your Excel total)
SELECT SUM(values) as grand_total
FROM fp_data_excel
WHERE year = 2025
AND month IN (1, 2, 3, 4, 5, 6)
AND type = 'Actual'
AND UPPER(values_type) = 'AMOUNT';

-- Query 4: Count total records (not unique customers)
SELECT COUNT(*) as total_records
FROM fp_data_excel
WHERE year = 2025
AND month IN (1, 2, 3, 4, 5, 6)
AND type = 'Actual'
AND UPPER(values_type) = 'AMOUNT'
AND customername IS NOT NULL
AND TRIM(customername) != '';







