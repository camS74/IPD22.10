-- ============================================================
-- FP Data Long Format Table Setup for DBeaver
-- ============================================================
-- Based on fp_data.xlsx structure with 33,316 rows
-- This table stores sales data in long format (one row per month/type/metric)

DROP TABLE IF EXISTS fp_data_long;

CREATE TABLE fp_data_long (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'Actual' or 'Budget'
    salesrepname TEXT,
    customername TEXT,
    countryname TEXT,
    productgroup TEXT,
    material VARCHAR(50),
    process VARCHAR(50),
    values_type VARCHAR(20),    -- 'KGS', 'Amount', 'MoRM', etc.
    values NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_fp_data_long_year_month ON fp_data_long (year, month);
CREATE INDEX idx_fp_data_long_salesrep ON fp_data_long (salesrepname);
CREATE INDEX idx_fp_data_long_type ON fp_data_long (type);
CREATE INDEX idx_fp_data_long_values_type ON fp_data_long (values_type);
CREATE INDEX idx_fp_data_long_productgroup ON fp_data_long (productgroup);
CREATE INDEX idx_fp_data_long_country ON fp_data_long (countryname);

-- Create a composite index for common queries
CREATE INDEX idx_fp_data_long_composite ON fp_data_long (salesrepname, productgroup, year, month, type, values_type);

-- Add comments to the table and columns
COMMENT ON TABLE fp_data_long IS 'Sales data in long format - each row represents one measurement for a specific sales rep, product, month, and metric type';
COMMENT ON COLUMN fp_data_long.year IS 'Year of the data (e.g., 2019, 2020, etc.)';
COMMENT ON COLUMN fp_data_long.month IS 'Month name (e.g., January, February, etc.)';
COMMENT ON COLUMN fp_data_long.type IS 'Data type: Actual or Budget';
COMMENT ON COLUMN fp_data_long.salesrepname IS 'Sales representative name';
COMMENT ON COLUMN fp_data_long.customername IS 'Customer company name';
COMMENT ON COLUMN fp_data_long.countryname IS 'Country name';
COMMENT ON COLUMN fp_data_long.productgroup IS 'Product group category';
COMMENT ON COLUMN fp_data_long.material IS 'Material type (PE, BOPP, PET, etc.)';
COMMENT ON COLUMN fp_data_long.process IS 'Process type (Printed, Unprinted, etc.)';
COMMENT ON COLUMN fp_data_long.values_type IS 'Metric type: KGS (weight), Amount (currency), MoRM (margin), etc.';
COMMENT ON COLUMN fp_data_long.values IS 'The actual numerical value for the metric';

-- Create a view for easier querying with month numbers
CREATE OR REPLACE VIEW fp_data_with_month_num AS
SELECT 
    *,
    CASE month
        WHEN 'January' THEN 1
        WHEN 'February' THEN 2
        WHEN 'March' THEN 3
        WHEN 'April' THEN 4
        WHEN 'May' THEN 5
        WHEN 'June' THEN 6
        WHEN 'July' THEN 7
        WHEN 'August' THEN 8
        WHEN 'September' THEN 9
        WHEN 'October' THEN 10
        WHEN 'November' THEN 11
        WHEN 'December' THEN 12
        ELSE 0
    END as month_num
FROM fp_data_long
ORDER BY year, month_num, salesrepname, productgroup;

-- Sample queries for testing and validation
/*
-- Query 1: Check data distribution by year and type
SELECT year, type, COUNT(*) as record_count
FROM fp_data_long 
GROUP BY year, type 
ORDER BY year, type;

-- Query 2: Sales reps with most records
SELECT salesrepname, COUNT(*) as record_count
FROM fp_data_long 
GROUP BY salesrepname 
ORDER BY record_count DESC 
LIMIT 10;

-- Query 3: Product groups by revenue (Amount type)
SELECT productgroup, SUM(values) as total_amount
FROM fp_data_long 
WHERE values_type = 'Amount' AND type = 'Actual'
GROUP BY productgroup 
ORDER BY total_amount DESC;

-- Query 4: Monthly sales trends for a specific sales rep
SELECT year, month, values_type, SUM(values) as total_value
FROM fp_data_long 
WHERE salesrepname = 'Abraham Mathew' AND type = 'Actual'
GROUP BY year, month, values_type
ORDER BY year, month_num;
*/ 