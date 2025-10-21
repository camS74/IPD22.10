# IPDash Project Data Analysis & Upload Mechanisms

## Overview

This document provides a comprehensive analysis of the IPDash project's data upload and management mechanisms for each division. The system uses a hybrid approach combining Excel file processing and SQL database operations.

## Project Architecture

### Frontend (React Application)
- **Port**: 3000
- **Main Framework**: React 19.1.0
- **Key Libraries**: 
  - `xlsx` (0.18.5) for Excel file processing
  - `antd` (5.25.1) for UI components
  - `echarts` for data visualization
  - `react-router-dom` for navigation

### Backend (Node.js/Express)
- **Port**: 3001
- **Framework**: Express 4.18.2
- **Database**: PostgreSQL
- **Key Libraries**:
  - `pg` (8.11.3) for PostgreSQL connection
  - `xlsx` (0.18.5) for server-side Excel processing
  - `cors` for cross-origin requests

## Data Upload Mechanisms by Division

### 1. Excel-Based Data Upload (Frontend Processing)

#### Division Data Sources:
- **Primary File**: `financials.xlsx` (served via `/api/financials.xlsx`)
- **Secondary File**: `Sales.xlsx` (served via `/api/sales.xlsx`)
- **Location**: `server/data/` directory

#### Excel Processing Flow:

1. **Data Loading** (`ExcelDataContext.js`):
   ```javascript
   // Loads Excel data from backend API
   const loadExcelData = async (url = '/api/financials.xlsx')
   ```
   - Fetches Excel file from backend API endpoint
   - Uses `XLSX.read()` to parse binary data
   - Converts each sheet to JSON format using `XLSX.utils.sheet_to_json()`
   - Each sheet represents a different division

2. **Division Management**:
   - **Sheet Names** = **Division Names**
   - Divisions are dynamically loaded from Excel sheet names
   - User can select division via `DivisionSelector` component
   - Default division: First sheet in the workbook

3. **Data Structure**:
   ```javascript
   // Excel data structure per division
   {
     "Division Name": [
       ["Headers", "Row", "Data"],  // Row 0: Headers
       ["Month", "Names", "Here"],   // Row 1: Month names
       ["Type", "Info", "Here"],    // Row 2: Data types
       ["Sales", "Data", "Values"]   // Row 3+: Actual data
     ]
   }
   ```

#### Sales Data Processing (`SalesDataContext.js`):
- Similar to financial data but focuses on sales metrics
- Supports sales representative configuration
- Handles product group extraction via `getUniqueProductGroups.js`
- Default division: `'FP-Product Group'`

### 2. SQL Database Upload (PostgreSQL)

#### Database Configuration:
- **Host**: localhost
- **Port**: 5432
- **Database**: postgres
- **User**: postgres
- **Password**: 654883 (from server/.env)

#### Main Table Structure (`fp_data`):
```sql
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
```

#### Data Import Process:

1. **Excel to CSV Conversion**:
   - Use `wide to long converter.html` tool for format transformation
   - Converts wide format Excel to long format CSV
   - Handles 33,316+ records efficiently

2. **Database Import Methods**:
   
   **Method A: Shell Script Import**
   ```bash
   # fp_data_import_to_sql.sh
   # 1. Backup existing data
   psql -c "COPY fp_data TO 'backup.csv' CSV HEADER;"
   # 2. Truncate table
   psql -c "TRUNCATE TABLE fp_data;"
   # 3. Import new data
   psql -c "\COPY fp_data FROM 'fp_data.csv' CSV HEADER;"
   ```
   
   **Method B: DBeaver GUI Import**
   - Right-click table → Import Data
   - Select Excel/CSV file
   - Map columns automatically
   - Execute import with validation

3. **Data Cleanup Process**:
   ```sql
   -- Automated cleanup via data_cleanup_script.sql
   -- Trims whitespace from all text columns
   -- Standardizes capitalization (Budget/Actual)
   -- Normalizes month names
   -- Removes empty records
   ```

#### Database Service Layer (`fpDataService.js`):
- **Purpose**: Abstraction layer for database operations
- **Key Methods**:
  - `getSalesReps()`: Get unique sales representatives
  - `getProductGroups()`: Get unique product groups
  - `getSalesData()`: Get sales data by filters
  - `getCustomersBySalesRep()`: Get customers by sales rep
  - `getYearlyBudget()`: Get budget data by year
  - `getSalesByCountry()`: Get sales data by country

## Division-Specific Data Handling

### Frontend Division Management:

1. **Division Selection**:
   - Radio button interface in `DivisionSelector.js`
   - Dynamically populated from Excel sheet names
   - State managed in `ExcelDataContext`

2. **Division Data Isolation**:
   - Each division has its own Excel sheet
   - Data is processed independently per division
   - Filtering and calculations are division-specific

3. **Configuration Management**:
   - Division-specific configurations stored in JSON files:
     - `standard-configs.json`: Column configurations
     - `sales-reps-config.json`: Sales rep groupings
     - `confirmed-merges.json`: Data merge confirmations

### Backend Division Support:

1. **API Endpoints by Division**:
   ```javascript
   // Division-agnostic endpoints
   GET /api/financials.xlsx    // All divisions in one file
   GET /api/sales.xlsx         // All sales divisions
   
   // Division-specific queries via parameters
   GET /api/fp/sales-data?division=FP
   GET /api/sales-reps-defaults?division=FP
   ```

2. **Database Queries**:
   - SQL queries filter by division-related fields
   - Product groups act as division identifiers
   - Sales representatives are division-specific

## Data Flow Summary

### Excel-Based Flow:
```
Excel Files (server/data/) 
    ↓ (HTTP API)
Frontend Context (ExcelDataContext/SalesDataContext)
    ↓ (Processing)
Division-Specific Components
    ↓ (Rendering)
Dashboard Tables/Charts
```

### SQL-Based Flow:
```
Excel Files (fp_data.xlsx)
    ↓ (Manual Import via DBeaver/Script)
PostgreSQL Database (fp_data table)
    ↓ (API Queries)
Backend Service (fpDataService.js)
    ↓ (REST API)
Frontend Components
    ↓ (Rendering)
Dashboard Views
```

## Key Files & Their Roles

### Data Files:
- `server/data/financials.xlsx`: Main financial data by division
- `server/data/Sales.xlsx`: Sales-specific data
- `server/data/fp_data.xlsx`: Database import source
- `fp_data.csv`: CSV format for database import

### Configuration Files:
- `server/data/standard-configs.json`: UI column configurations
- `server/data/sales-reps-config.json`: Sales rep groupings
- `server/data/confirmed-merges.json`: Data merge settings

### Processing Scripts:
- `fp_data_import_to_sql.sh`: Automated database import
- `data_cleanup_script.sql`: Post-import data cleaning
- `setup_fp_data_long_format.sql`: Database schema setup
- `wide to long converter.html`: Excel format converter

### Context Providers:
- `ExcelDataContext.js`: Excel file processing and division management
- `SalesDataContext.js`: Sales data processing and rep configuration
- `FilterContext.js`: Data filtering and column management

### Database Layer:
- `database/config.js`: PostgreSQL connection configuration
- `database/fpDataService.js`: Database query abstraction layer

## Upload Process for Each Division

### For Excel-Based Divisions:
1. **Prepare Data**: Ensure Excel file has proper sheet structure
2. **Upload File**: Place in `server/data/` directory
3. **Update API**: File automatically served via Express static routes
4. **Frontend Load**: Context providers automatically detect new sheets
5. **Division Selection**: Users can select new division from dropdown

### For SQL-Based Divisions:
1. **Prepare Data**: Convert Excel to long format using converter tool
2. **Database Import**: Use DBeaver or shell script to import CSV
3. **Data Cleanup**: Run cleanup script to standardize data
4. **API Integration**: Data automatically available via fpDataService
5. **Frontend Access**: Components query data via REST API

## Best Practices

### Data Quality:
- Always run cleanup scripts after database imports
- Validate data structure before uploading
- Maintain consistent naming conventions
- Regular backups before major imports

### Performance:
- Use database indexes for frequently queried fields
- Implement pagination for large datasets
- Cache frequently accessed Excel data
- Optimize SQL queries with proper WHERE clauses

### Maintenance:
- Monitor file sizes (Excel files can become large)
- Regular database maintenance and optimization
- Keep configuration files in sync across environments
- Document any schema changes

## Troubleshooting

### Common Issues:
1. **Whitespace in Data**: Run data cleanup script
2. **Missing Divisions**: Check Excel sheet names
3. **Database Connection**: Verify credentials in server/.env
4. **File Not Found**: Ensure files are in server/data/ directory
5. **CORS Issues**: Check backend CORS configuration

### Debug Steps:
1. Check browser console for frontend errors
2. Monitor backend logs for API errors
3. Verify database connectivity with test queries
4. Validate Excel file structure and format
5. Confirm environment variables are set correctly

This hybrid approach provides flexibility for different data sources while maintaining a consistent user experience across all divisions.