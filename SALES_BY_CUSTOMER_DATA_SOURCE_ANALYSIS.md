# Sales by Customer - Data Source Analysis

**Date:** October 10, 2025  
**Status:** ✅ **DATABASE-BACKED**

---

## 🎯 **Quick Answer**

**YES** - Sales by Customer pages are **100% linked to DATABASE**, not Excel.

---

## 📊 **Data Source Summary**

| Component | Data Source | API Endpoint | Status |
|-----------|-------------|--------------|--------|
| **Sales by Customer Table** | Database | `/api/customers-db` | ✅ DB |
| | | `/api/sales-by-customer-db` | ✅ DB |
| **Sales by Sales Rep** | Database | `/api/sales-rep-complete-data` | ✅ DB |
| (includes customer data) | | `/api/customer-dashboard-universal` | ✅ DB |

---

## 📋 **Detailed Analysis**

### **1. Sales by Customer Table (New)**

**File:** `src/components/dashboard/SalesByCustomerTableNew.js`

#### **Data Fetching:**

**Line 121:** Fetch Customers List
```javascript
const response = await fetch(`http://localhost:3001/api/customers-db?division=${selectedDivision}`);
```
✅ **Database API** - No Excel involved

**Line 176:** Fetch Sales Data
```javascript
const response = await fetch('http://localhost:3001/api/sales-by-customer-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    division: selectedDivision,
    year: column.year,
    months: months,
    dataType: column.type || 'Actual'
  })
});
```
✅ **Database API** - Queries `fp_data_excel` table

#### **Database Table:**
- Uses `fp_data_excel` table for FP division
- Uses `sb_data_excel`, `tf_data_excel`, `hcm_data_excel` for other divisions
- Data comes from: **SQL Database queries**

#### **API Endpoints Used:**

1. **GET `/api/customers-db?division={division}`**
   - Returns list of unique customers
   - Source: Database table query
   - Example: `SELECT DISTINCT customername FROM fp_data_excel`

2. **POST `/api/sales-by-customer-db`**
   - Returns sales data per customer for specified period
   - Source: Database aggregated query
   - Example: 
     ```sql
     SELECT customername, SUM(values) as total_value
     FROM fp_data_excel
     WHERE division = ? AND year = ? AND month IN (?)
     GROUP BY customername
     ```

---

### **2. Sales by Customer Table (Old)**

**File:** `src/components/dashboard/SalesByCustomerTable.js`

**Status:** ⚠️ **MIXED - Transitioning**

**Line 12-13:**
```javascript
const { salesData } = useSalesData();  // ⚠️ Excel context
const { selectedDivision } = useExcelData();
```

**Line 22:** Also uses database for merge rules
```javascript
const response = await fetch('http://localhost:3001/api/confirmed-merges');
```

**Status:** 
- Still uses Excel context (`useSalesData`)
- But also integrates with database merge rules
- Being phased out in favor of `SalesByCustomerTableNew.js`

---

### **3. Sales by Sales Rep (Includes Customer Data)**

**File:** `src/components/dashboard/SalesBySaleRepTable.js`

#### **Data Fetching:**

**Line 1087:** Unified Batch API
```javascript
const response = await fetch('http://localhost:3001/api/sales-rep-complete-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    division: selectedDivision,
    salesRep: rep,
    periods
  })
});
```
✅ **Database API** - Returns complete data including customers

**Line 504:** Customer Dashboard API
```javascript
const response = await fetch('http://localhost:3001/api/customer-dashboard-universal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    division: selectedDivision,
    salesRep,
    periods
  })
});
```
✅ **Database API** - Universal endpoint for all divisions

---

## 🗂️ **Backend Database Structure**

### **Tables Used:**
```sql
-- FP Division
fp_data_excel (
  id SERIAL PRIMARY KEY,
  salesrepname VARCHAR,
  customername VARCHAR,  -- ✅ Customer data here
  countryname VARCHAR,
  productgroup VARCHAR,
  material VARCHAR,
  process VARCHAR,
  year INTEGER,
  month INTEGER,
  type VARCHAR,  -- Actual/Budget/Forecast
  values_type VARCHAR,  -- KGS/Amount
  values NUMERIC
)

-- Other Divisions (same structure)
sb_data_excel
tf_data_excel  
hcm_data_excel
```

### **Key Fields for Customers:**
- `customername` - Customer name
- `values` - Sales amount (when `values_type` = 'Amount')
- `salesrepname` - Associated sales rep
- `countryname` - Customer country
- `year`, `month`, `type` - Period filters

---

## 🔍 **How Customer Data Flows**

### **Data Flow Diagram:**

```
┌─────────────────────────────────────────────┐
│         SQL Server Database                 │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     fp_data_excel Table            │   │
│  │  (Imported from Excel monthly)     │   │
│  │                                    │   │
│  │  - salesrepname                    │   │
│  │  - customername  ← Customer data   │   │
│  │  - countryname                     │   │
│  │  - productgroup                    │   │
│  │  - values (Amount/KGS)             │   │
│  │  - year, month, type               │   │
│  └────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│        Node.js Backend Server               │
│         (Port 3001)                         │
│                                             │
│  API Endpoints:                             │
│  - GET /api/customers-db                    │
│  - POST /api/sales-by-customer-db          │
│  - POST /api/customer-dashboard-universal   │
│  - POST /api/sales-rep-complete-data       │
│                                             │
│  Service: UniversalSalesByCountryService.js │
│  Methods:                                   │
│  - getAllCustomers(division)               │
│  - getSalesByCustomer(...)                 │
│  - getCustomersBySalesRep(...)             │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│         React Frontend                      │
│                                             │
│  Components:                                │
│  - SalesByCustomerTableNew.js              │
│  - SalesBySaleRepTable.js                  │
│                                             │
│  Fetches data via fetch() API calls        │
│  Displays in tables with periods           │
└─────────────────────────────────────────────┘
```

---

## ✅ **Verification Evidence**

### **1. No Excel File References**
Searched entire codebase - **ZERO** references to:
- `fs.readFile` for customer Excel files
- `xlsx` library for customer data
- Excel file paths for customer data

### **2. All API Calls to Database**
Every customer data fetch uses:
```javascript
fetch('http://localhost:3001/api/...')
```
These endpoints query SQL database tables, not Excel files.

### **3. Database Migration Complete**
From audit logs and code:
- `SALES_BY_CUSTOMER_IMPLEMENTATION_SUMMARY.md` exists
- Database tables created and populated
- Excel data imported to database
- Frontend updated to use database APIs

---

## 📊 **Current Dashboard Layout**

**Dashboard.js** structure:
```javascript
<TabsComponent>
  <Tab label="KPI">
    <KPIExecutiveSummary />  // ✅ Database
  </Tab>
  <Tab label="P&L">
    <TableView />  // Uses Excel context (legacy)
  </Tab>
  <Tab label="Product Group">
    <ProductGroupTable />  // Uses Excel context (legacy)
  </Tab>
  <Tab label="Sales by Country">
    <SalesByCountryTable />  // ✅ Database
    <SalesCountryChart />  // ✅ Database
    <MapSwitcher />  // ✅ Database
  </Tab>
  <Tab label="Sales by Customer">
    <SalesByCustomerTableNew />  // ✅ Database
  </Tab>
  <Tab label="Sales by SaleRep">
    <SalesBySaleRepTable />  // ✅ Database (includes customers)
  </Tab>
</TabsComponent>
```

---

## 🎯 **Chart Pages for Customers**

### **No Dedicated Customer Chart Page**
Currently, there is **NO separate "Sales by Customer Chart"** page.

Customer data is visualized within:

1. **Sales by Customer Table** (line chart view)
   - Shows top 20 customers in table format
   - No dedicated chart visualization yet

2. **Sales by Sales Rep Reports**
   - Individual sales rep pages show customer breakdown
   - Uses table format with customer details
   - Includes mini charts for customer trends

### **Potential Future Enhancement:**
Could add a **"Sales by Customer Chart"** tab similar to "Sales by Country" with:
- Top Customers Bar Chart
- Customer Trend Lines
- Customer Comparison View

---

## 🔄 **Data Update Process**

### **Monthly Data Update:**

1. **Excel Export from ERP**
   - Sales team exports monthly data from ERP system
   - Format: Excel file with columns (SalesRep, Customer, Country, ProductGroup, etc.)

2. **Database Import**
   - Run PowerShell script: `transform fp excel to sql - FIXED.ps1`
   - Imports Excel data to `fp_data_excel` table
   - Validates and cleans data

3. **Frontend Auto-Update**
   - No code changes needed
   - Dashboard automatically queries new data
   - All customer data reflects latest imports

---

## ✅ **Summary**

| Aspect | Status | Details |
|--------|--------|---------|
| **Sales by Customer Table** | ✅ Database | 100% database-backed |
| **Customer API Endpoints** | ✅ Database | All use SQL queries |
| **Data Source** | ✅ Database | `fp_data_excel` table |
| **Excel Dependency** | ❌ None | No Excel files read at runtime |
| **Chart Pages** | ⚠️ N/A | No dedicated chart page yet |
| **Sales Rep Customer Data** | ✅ Database | Unified batch API |

---

## 🎯 **Key Takeaways**

1. ✅ **Sales by Customer is 100% database-backed**
2. ✅ **No Excel files are read at runtime**
3. ✅ **All data comes from SQL database queries**
4. ⚠️ **No dedicated chart page for customers yet** (only table view)
5. ✅ **Works for all divisions** (FP, SB, TF, HCM)
6. ✅ **Data updates automatically** when database is updated

---

## 📝 **Related Components**

### **Database-Backed (Modern):**
- ✅ Sales by Country Table
- ✅ Sales by Country Chart
- ✅ Sales by Country Map
- ✅ Sales by Customer Table (New)
- ✅ Sales by Sales Rep
- ✅ KPI Executive Summary

### **Excel-Backed (Legacy):**
- ⚠️ P&L Table (uses `useSalesData` context)
- ⚠️ Product Group Table (uses `useSalesData` context)

---

**Conclusion: Sales by Customer pages are fully database-backed with NO Excel dependency at runtime.** ✅




















