# 📊 Customer Insights Migration Analysis

## 🎯 Current Status

### **Customer Insights in KPI Executive Summary**
**Location**: `src/components/dashboard/KPIExecutiveSummary.js` (lines 807-833)

**Current Implementation**: ✅ **Loading from Excel**
- Reads from Excel sheet: `{Division}-Customers` (e.g., `FP-Customers`)
- Parses Excel data structure with headers at rows 0-2 (year, month, type)
- Customer names start at row 3, column 0
- Aggregates sales values for the selected period
- Calculates:
  - Top Customer % (highest percentage)
  - Top 3 Customers % (sum of top 3)
  - Top 5 Customers % (sum of top 5)
  - Average Sales Per Customer

---

## 🔍 Customer Merging System - DEEP DIVE

### **1. Database Structure**

**Table**: `customer_merge_rules`

```sql
CREATE TABLE customer_merge_rules (
  id SERIAL PRIMARY KEY,
  sales_rep VARCHAR(255) NOT NULL,
  division VARCHAR(100) NOT NULL,
  merged_customer_name VARCHAR(500) NOT NULL,
  original_customers JSONB NOT NULL,  -- Array of original customer names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sales_rep, division, merged_customer_name)
);
```

**Key Points**:
- Each sales rep can have multiple merge rules
- Each merge rule combines multiple `original_customers` into one `merged_customer_name`
- `original_customers` is stored as JSONB array: `["Customer A", "Customer B", "Customer C"]`
- Division-specific (FP, IP, etc.)
- Active/inactive flag for soft deletion

---

### **2. Backend Service**

**File**: `server/database/CustomerMergeRulesService.js`

**Key Methods**:

1. **`addMergeRule(salesRep, division, mergeRule)`**
   - Adds or updates a single merge rule
   - Uses `ON CONFLICT` to update existing rules
   - Does NOT delete other rules

2. **`saveMergeRules(salesRep, division, mergeRules)`**
   - REPLACES ALL rules for a sales rep
   - Uses transaction (BEGIN/COMMIT/ROLLBACK)
   - Deletes all existing rules first, then inserts new ones

3. **`getMergeRules(salesRep, division)`**
   - Retrieves all active merge rules for a sales rep
   - Returns array of rules with `mergedName` and `originalCustomers`

4. **`deleteMergeRule(salesRep, division, mergedCustomerName)`**
   - Deletes a specific merge rule

5. **`getAllMergeRulesForDivision(division)`**
   - Admin view: gets all merge rules for a division

---

### **3. How Merging Works - Step by Step**

#### **Step 1: Fetch Customer Data from Database**
```javascript
// API: POST /api/sales-by-customer-db
const customerSalesData = await UniversalSalesByCountryService.getSalesByCustomer(
  division,    // 'FP'
  salesRep,    // 'SOFIANE SALAH' or null for all
  year,        // 2025
  months,      // [1, 2, 3, 4, 5, 6]
  dataType     // 'Actual' or 'Budget'
);
```

**Returns**: Array of customers with their sales values
```javascript
[
  { customer: 'ABC Company', value: 50000 },
  { customer: 'ABC Co.', value: 30000 },
  { customer: 'ABC Corporation', value: 20000 },
  { customer: 'XYZ Ltd', value: 15000 }
]
```

#### **Step 2: Fetch Merge Rules**
```javascript
// API: GET /api/customer-merge-rules/get?salesRep=SOFIANE SALAH&division=FP
const mergeRules = await CustomerMergeRulesService.getMergeRules(salesRep, division);
```

**Returns**: Array of merge rules
```javascript
[
  {
    mergedName: 'ABC Company Group',
    originalCustomers: ['ABC Company', 'ABC Co.', 'ABC Corporation'],
    isActive: true
  }
]
```

#### **Step 3: Apply Merge Rules**
```javascript
// Function: applySavedMergeRules()
// Location: Multiple files (SalesBySaleRepTable.js, CustomersKgsTable.js, CustomerKeyFactsNew.js)

const processedCustomers = [];
const processed = new Set();

// For each merge rule
mergeRules.forEach(rule => {
  // Find matching customers (case-insensitive)
  const existingCustomers = customers.filter(c => 
    rule.originalCustomers.some(orig => 
      c.name.toLowerCase().trim() === orig.toLowerCase().trim()
    )
  );
  
  if (existingCustomers.length > 1) {
    // MERGE: Combine multiple customers into one
    const mergedCustomer = {
      name: rule.mergedName + '*',  // Add asterisk to show it's merged
      value: existingCustomers.reduce((sum, c) => sum + c.value, 0),
      originalCustomers: existingCustomers.map(c => c.name)
    };
    processedCustomers.push(mergedCustomer);
    existingCustomers.forEach(c => processed.add(c.name));
  } else if (existingCustomers.length === 1) {
    // RENAME: Only one customer exists, use merged name
    const singleCustomer = { ...existingCustomers[0] };
    singleCustomer.name = rule.mergedName + '*';
    processedCustomers.push(singleCustomer);
    processed.add(existingCustomers[0].name);
  }
});

// Add remaining unprocessed customers
customers.forEach(customer => {
  if (!processed.has(customer.name)) {
    processedCustomers.push(customer);
  }
});
```

**Result After Merging**:
```javascript
[
  { customer: 'ABC Company Group*', value: 100000 },  // Merged from 3 customers
  { customer: 'XYZ Ltd', value: 15000 }                // Unmerged
]
```

---

### **4. Where Merging is Applied**

1. **Sales by Sales Rep Table** (`SalesBySaleRepTable.js`)
   - Main customer table with period columns
   - Shows merged customers with asterisk (*)
   - Allows editing merge rules (add/remove customers)

2. **Customer KGS Table** (`CustomersKgsTable.js`)
   - KGS (weight) data by customer
   - Applies same merge rules

3. **Customer Key Facts** (`CustomerKeyFactsNew.js`)
   - Customer performance metrics
   - Top customers analysis

4. **Sales Rep Report** (`SalesRepReport.js`)
   - PDF/HTML export
   - Includes merged customer data

---

### **5. User Interface for Merging**

**Location**: `src/components/dashboard/SalesBySaleRepTable.js`

**Features**:
- ✅ View merged customers (marked with *)
- ✅ Create new merge groups
- ✅ Edit existing merge groups (add/remove customers)
- ✅ Delete merge groups
- ✅ Save to database
- ✅ Real-time updates

**UI Components**:
- Merge button for each customer row
- Modal dialog for selecting customers to merge
- Edit button for existing merged groups
- Delete button for merged groups

---

## 📋 Migration Plan for Customer Insights

### **Current State**:
```javascript
// KPIExecutiveSummary.js - Lines 807-833
const customerSheetName = selectedDivision.replace(/-.*$/, '') + '-Customers';
const customerData = salesData[customerSheetName] || [];  // ❌ From Excel
```

### **Target State**:
```javascript
// Fetch from database with merge rules applied
const customerInsightsData = await fetchCustomerInsightsFromDB(
  selectedDivision,
  basePeriod.year,
  basePeriod.months,
  basePeriod.type
);
```

---

## 🎯 Key Insights for Migration

### **1. Merge Rules MUST Be Applied**
- Customer Insights should show **merged** customer data
- This ensures consistency with Sales by Sales Rep tables
- Example: If "ABC Company" + "ABC Co." are merged, they should appear as one customer in insights

### **2. Division-Wide Aggregation**
- Customer Insights is for the **entire division**, not per sales rep
- Need to aggregate ALL sales reps' customers
- Apply merge rules from ALL sales reps in the division

### **3. Calculation Requirements**
```javascript
// For each customer (after merging):
1. Total Sales Value
2. Percentage of Total Division Sales
3. Sort by percentage (descending)
4. Calculate:
   - Top Customer % (highest)
   - Top 3 Customers % (sum of top 3)
   - Top 5 Customers % (sum of top 5)
   - Average Sales Per Customer
   - Total Number of Customers
```

### **4. Merge Rule Complexity**
- **Scenario 1**: Sales Rep A merges "ABC Co." + "ABC Company" → "ABC Group"
- **Scenario 2**: Sales Rep B has "ABC Co." as separate customer
- **Question**: How to handle division-wide merging?

**Recommended Approach**:
- Apply merge rules **per sales rep** first
- Then aggregate across all sales reps
- If multiple sales reps have the same merged name, combine them
- If same customer name appears in different sales reps (unmerged), keep separate

---

## 🔧 Implementation Strategy

### **Option 1: Create New API Endpoint** (RECOMMENDED)
```javascript
// POST /api/customer-insights-db
{
  division: 'FP',
  year: 2025,
  months: [1, 2, 3, 4, 5, 6],
  dataType: 'Actual'
}

// Returns:
{
  success: true,
  data: {
    customers: [
      { name: 'ABC Company Group*', value: 100000, percent: 25.5, isMerged: true },
      { name: 'XYZ Ltd', value: 75000, percent: 19.1, isMerged: false },
      ...
    ],
    topCustomer: '25.5%',
    top3Customer: '60.2%',
    top5Customer: '78.9%',
    avgSalesPerCustomer: 12500,
    totalCustomers: 45
  }
}
```

### **Option 2: Use Existing Endpoint + Frontend Processing**
- Use `/api/sales-by-customer-db` with `salesRep: null` (all reps)
- Fetch merge rules for all sales reps
- Apply merging logic in frontend
- Calculate insights metrics

---

## 📊 Database Query Strategy

### **Step 1: Get All Customers for Division**
```sql
SELECT 
  customername,
  SUM(values) as total_value
FROM fp_data_excel
WHERE year = 2025
  AND month IN (1, 2, 3, 4, 5, 6)
  AND type = 'Actual'
  AND values_type = 'AMOUNT'
GROUP BY customername
ORDER BY total_value DESC;
```

### **Step 2: Get All Merge Rules for Division**
```sql
SELECT 
  sales_rep,
  merged_customer_name,
  original_customers
FROM customer_merge_rules
WHERE division = 'FP'
  AND is_active = true;
```

### **Step 3: Apply Merge Rules**
- For each merge rule, find matching customers
- Combine their values
- Mark as merged (add asterisk)

---

## ✅ Summary

### **What I Understood**:

1. **Customer Merge Rules System**:
   - Stored in `customer_merge_rules` table
   - Each rule maps multiple `original_customers` → one `merged_customer_name`
   - Per sales rep, per division
   - Applied when displaying customer data

2. **How Merging Works**:
   - Fetch raw customer data from database
   - Fetch merge rules for sales rep(s)
   - Apply rules: combine matching customers, sum their values
   - Mark merged customers with asterisk (*)
   - Add unprocessed customers as-is

3. **Current Customer Insights**:
   - Loads from Excel: `{Division}-Customers` sheet
   - Calculates top customer metrics
   - Does NOT currently apply merge rules (because it's Excel-based)

4. **Migration Challenge**:
   - Need to fetch customer data from database
   - Apply merge rules from ALL sales reps (division-wide)
   - Calculate same metrics as Excel version
   - Ensure consistency with Sales by Sales Rep tables

---

## 🚀 Next Steps

1. **Confirm Approach**: Should Customer Insights show merged customers?
2. **Decide on API**: New endpoint or use existing + frontend processing?
3. **Handle Division-Wide Merging**: How to combine merge rules from multiple sales reps?
4. **Implement Backend Service**: Create method to get division-wide customer insights
5. **Update Frontend**: Replace Excel logic with API calls
6. **Test with Real Data**: Verify calculations match Excel

---

**Ready to proceed with implementation once you confirm the approach!** 🎯























