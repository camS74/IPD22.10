# 🎯 **SALES BY CUSTOMER - IMPLEMENTATION GUIDE**

## **📋 OVERVIEW**
This guide outlines the steps to complete the sales by customer functionality integration. The database backend and API endpoints are already implemented - this focuses on frontend integration and testing.

## **✅ COMPLETED WORK**

### **1. Database Integration (DONE)**
- **Universal API Endpoints Created:**
  - `/api/customers-db` - Get all customers for any division
  - `/api/sales-by-customer-db` - Get sales by customer for any division
  - `/api/customers-by-salesrep-db` - Get customers by sales rep for any division
  - `/api/customer-sales-data-db` - Get detailed customer sales data for any division

- **Database Service Methods Added:**
  - `getAllCustomers(division)` 
  - `getSalesByCustomer(division, salesRep, year, months, dataType)`
  - `getCustomersBySalesRep(division, salesRep)`
  - `getCustomerSalesData(division, customer, year, months, dataType)`

### **2. Frontend Component (DONE)**
- **New Component Created:** `src/components/dashboard/SalesByCustomerTableNew.js`
- **Uses database endpoints** instead of Excel data
- **Supports all divisions** (FP, HC, etc.)
- **Handles periods, sales reps, and filtering**

### **3. Data Import Issue (FIXED)**
- **Problem:** Excel import script was merging customers (28,492 → 10,667 rows)
- **Root Cause:** `GROUP BY` aggregation in `transform fp excel to sql.ps1`
- **Solution:** Created fixed scripts that preserve all rows without merging:
  - `transform fp excel to sql - FIXED.ps1`
  - `Refresh-FPDatabase - FIXED.cmd`

## **🎯 NEXT STEPS TO COMPLETE**

### **Step 1: Fix Data Import (CRITICAL)**
**⚠️ IMPORTANT:** Always use `.\start-servers-win.ps1` to restart servers, not anything else!

1. **Run the fixed import script:**
   ```powershell
   .\Refresh-FPDatabase - FIXED.cmd
   ```
   
2. **Verify import results:**
   - Should show **33,315 rows** imported (not 10,667)
   - QC report should show **PERFECT MATCH**
   - All customers preserved without merging

3. **Restart servers using the correct script:**
   ```powershell
   .\start-servers-win.ps1
   ```

### **Step 2: Integrate New Component into Dashboard**

1. **Locate the dashboard routing file:**
   - Find where `SalesByCustomerTable` is imported/used
   - Usually in main dashboard component or routing configuration

2. **Replace old component with new one:**
   ```javascript
   // OLD (Excel-based)
   import SalesByCustomerTable from './SalesByCustomerTable';
   
   // NEW (Database-driven)
   import SalesByCustomerTableNew from './SalesByCustomerTableNew';
   ```

3. **Update component usage:**
   ```javascript
   // Replace
   <SalesByCustomerTable />
   
   // With
   <SalesByCustomerTableNew />
   ```

### **Step 3: Test Customer Data Accuracy**

1. **Test API endpoints directly:**
   ```bash
   # Test customers for FP division
   curl "http://localhost:3001/api/customers-db?division=FP"
   
   # Test sales by customer for 2025-HY1-Actual
   curl -X POST "http://localhost:3001/api/sales-by-customer-db" \
     -H "Content-Type: application/json" \
     -d '{"division":"FP","year":2025,"months":[1,2,3,4,5,6],"dataType":"Actual"}'
   ```

2. **Verify customer counts:**
   - Should now show **131+ customers** for 2025-HY1-Actual (not 74)
   - All customers from Excel should be preserved

### **Step 4: Test Frontend Integration**

1. **Navigate to sales by customer page**
2. **Test different divisions:**
   - FP division
   - HC division (if available)
   - Other divisions

3. **Test different periods:**
   - 2025-HY1-Actual
   - 2025-HY1-Budget
   - Other periods

4. **Test sales rep filtering:**
   - Individual sales reps
   - Sales rep groups
   - All sales reps

### **Step 5: Optional - Fix Remaining SQL Error**

If you encounter `operator does not exist: text = integer` errors:

1. **Locate the error in:** `server/database/UniversalSalesByCountryService.js`
2. **Find methods with `year` parameter**
3. **Ensure `year` is cast to integer:**
   ```javascript
   // Fix this
   params = [salesRep, customer, year, monthNum, dataType, valueType];
   
   // To this
   params = [salesRep, customer, parseInt(year), monthNum, dataType, valueType];
   ```

## **📁 KEY FILES TO WORK WITH**

### **Backend:**
- `server/server.js` - Contains all customer API endpoints
- `server/database/UniversalSalesByCountryService.js` - Database service methods

### **Frontend:**
- `src/components/dashboard/SalesByCustomerTableNew.js` - New database-driven component
- `src/components/dashboard/SalesByCustomerTable.js` - Old Excel-based component (to replace)

### **Data Import:**
- `transform fp excel to sql - FIXED.ps1` - Fixed import script
- `Refresh-FPDatabase - FIXED.cmd` - Fixed batch file

### **Server Management:**
- `.\start-servers-win.ps1` - **ONLY use this to restart servers**

## **🚨 CRITICAL REMINDERS**

1. **ALWAYS use `.\start-servers-win.ps1` to restart servers**
2. **NEVER use other restart methods** (npm start, manual processes, etc.)
3. **Test data import first** before frontend integration
4. **Verify customer counts** match Excel after import

## **🔍 TESTING CHECKLIST**

- [ ] Data import shows 33,315 rows (not 10,667)
- [ ] QC report shows PERFECT MATCH
- [ ] API endpoints return correct customer counts
- [ ] Frontend component loads without errors
- [ ] Different divisions work correctly
- [ ] Different periods work correctly
- [ ] Sales rep filtering works correctly
- [ ] No SQL type casting errors

## **🎉 EXPECTED RESULTS**

After completion:
- **All 33,315 Excel rows** imported to database
- **All customers preserved** without merging
- **Sales by customer page** works for all divisions
- **Database-driven functionality** matches sales by product and sales by country
- **No more Excel dependency** for customer data

---

**The hard work is done - now it's just integration and testing!**
