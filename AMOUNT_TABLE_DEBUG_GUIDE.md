# Customer Amount Table Debugging Guide

## Problem
The "Customer Sales - Đ Sales Comparison" table in the live version is showing zeros or volume figures instead of AMOUNT data, while the HTML export shows correct values.

## Data Flow

### 1. Backend API (`/api/customer-dashboard-amount`)
- **Location**: `server/server.js` lines 928-999
- **What it does**: Fetches AMOUNT data from database
- **Key line**: Line 971 - `getCustomerSalesDataByValueType(division, salesRep, customer, 'AMOUNT', year, month, type)`
- **Returns**: 
  ```javascript
  {
    success: true,
    data: {
      customers: ["CUSTOMER A", "CUSTOMER B"],  // Array of names
      dashboardData: {
        "CUSTOMER A": {
          "2025-HY1-Actual": 1234567,  // AMOUNT value
          "2024-HY1-Actual": 987654
        }
      }
    }
  }
  ```

### 2. Frontend Component (`CustomersAmountTable.js`)
- **Location**: `src/components/reports/CustomersAmountTable.js`
- **What it does**: Fetches data from API and transforms it
- **Transformation** (lines 149-164):
  ```javascript
  const transformedData = result.data.customers.map(customerName => {
    const rawValues = [];
    columnOrder.forEach(col => {
      const periodKey = `${col.year}-${col.month}-${col.type}`;
      const customerData = result.data.dashboardData[customerName];
      const value = customerData && customerData[periodKey] ? customerData[periodKey] : 0;
      rawValues.push(value);
    });
    return { name: customerName, rawValues };
  });
  ```

### 3. HTML Export (`SalesRepHTMLExport.js`)
- **Location**: `src/components/dashboard/SalesRepHTMLExport.js` lines 571-579
- **What it does**: Uses pre-processed `customerAmountData` prop
- **Data source**: Comes from `SalesRepReport.js` which calls the same API and applies merge rules

## Debug Steps

### Step 1: Check Backend Console
Look for this log when the page loads:
```
🔍 DEBUG - First customer data: {
  customer: 'CUSTOMER NAME',
  data: {
    '2025-HY1-Actual': 1234567,  // <-- Should be AMOUNT values, NOT volume
    '2024-HY1-Actual': 987654
  }
}
```

**If values are zeros or volume figures**: The backend is returning wrong data
**If values are correct AMOUNT**: The issue is in frontend transformation

### Step 2: Check Frontend Console
Look for these logs when the page loads:
```
🔍 CustomersAmountTable useEffect called with: { rep: '...', columnOrderLength: 5, basePeriodIndex: 2 }
🔍 Starting to fetch amount data...
🔍 Raw API response: { customersCount: 7, firstCustomer: 'CUSTOMER A', dashboardDataKeys: [...] }
🔍 Transformed data: { firstCustomer: {...}, rawValues: [0, 0, 1234567, ...] }
🔍 CRITICAL DEBUG - Full transformation for first customer: {
  customerName: 'CUSTOMER A',
  dashboardDataForCustomer: { '2025-HY1-Actual': 1234567, ... },
  periodKeys: ['2023-HY1-Actual', '2024-HY1-Actual', '2025-HY1-Actual', ...],
  extractedValues: [0, 0, 1234567, ...]
}
```

**Key Questions**:
1. Does `dashboardDataForCustomer` contain the correct AMOUNT values?
2. Do the `periodKeys` match the keys in `dashboardDataForCustomer`?
3. Are the `extractedValues` correctly extracting non-zero values?

## Common Issues

### Issue 1: Period Key Mismatch
**Symptom**: Backend has data but frontend extracts zeros
**Cause**: The `periodKey` constructed by frontend doesn't match backend keys
**Example**:
- Frontend constructs: `"2025-HY1-Actual"`
- Backend returns: `"2025-HY1 -Actual"` (extra space)

### Issue 2: Column Order Format
**Symptom**: First columns are zero, last columns have data
**Cause**: `columnOrder` has wrong structure
**Check**: 
```javascript
columnOrder.map(col => ({
  year: col.year,        // Should be: "2025"
  month: col.month,      // Should be: "HY1" or have months: [1,2,3,4,5,6]
  type: col.type         // Should be: "Actual"
}))
```

### Issue 3: Backend Returns Volume Data
**Symptom**: Values match volume table exactly
**Cause**: Backend `getCustomerSalesDataByValueType` is called with 'KGS' instead of 'AMOUNT'
**Check**: Line 971 in `server/server.js` should say `'AMOUNT'`

## Next Steps

1. **Refresh the page**
2. **Open both consoles**:
   - Frontend console (browser DevTools)
   - Backend console (terminal where server is running)
3. **Copy all logs** that contain:
   - `🔍 DEBUG - First customer data`
   - `🔍 CRITICAL DEBUG - Full transformation`
4. **Share the logs** so we can identify the exact issue

## Expected Correct Output

### Backend Console:
```
✅ Retrieved customer AMOUNT data for 7 customers
🔍 DEBUG - First customer data: {
  customer: 'AL GHURAIR FOODS LLC',
  data: {
    '2023-HY1-Actual': 0,
    '2024-HY1-Actual': 1847234,
    '2025-HY1-Actual': 2124567,
    '2025-HY1-Budget': 2000000,
    '2025-FY-Budget': 4000000
  }
}
```

### Frontend Console:
```
🔍 CRITICAL DEBUG - Full transformation for first customer: {
  customerName: 'AL GHURAIR FOODS LLC',
  dashboardDataForCustomer: {
    '2023-HY1-Actual': 0,
    '2024-HY1-Actual': 1847234,
    '2025-HY1-Actual': 2124567,
    '2025-HY1-Budget': 2000000,
    '2025-FY-Budget': 4000000
  },
  periodKeys: [
    '2023-HY1-Actual',
    '2024-HY1-Actual',
    '2025-HY1-Actual',
    '2025-HY1-Budget',
    '2025-FY-Budget'
  ],
  extractedValues: [0, 1847234, 2124567, 2000000, 4000000]
}
```

**The extractedValues should match the dashboardDataForCustomer values!**

