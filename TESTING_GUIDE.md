# Product Performance Migration - Testing Guide

## Quick Testing Checklist

### 1. Open the Application
```
http://localhost:3000
```

### 2. Navigate to KPI Executive Summary
- **Step 1**: Make sure you're on the **FP (Flexible Packaging)** division
- **Step 2**: Click on the **"KPI Executive Summary"** tab

### 3. Check Browser Console (F12)
**Expected Console Messages:**
```
✅ Product performance data loaded from API
📊 Using API data for product performance
```

**If you see this, it means the API is working!**

### 4. Visual Verification

#### Look for the "📦 Product Performance" Section

**Should Display:**
- **Top Revenue Drivers**: Product names like "SHRINK FILM PRINTED", "SHRINK SLEEVES", etc.
- **Total Sales Volume**: ~707K kg with growth percentage
- **Selling Price**: ~11.82 AED/kg
- **MoRM**: Various values for different products

#### Process Categories Section
Should show cards like:
- **PRINTED**: With sales %, avg selling price, avg MoRM
- **UNPRINTED**: With sales %, avg selling price, avg MoRM

#### Material Categories Section  
Should show cards like:
- **PE**: With sales %, avg selling price, avg MoRM
- **NON PE**: With sales %, avg selling price, avg MoRM

### 5. Common Issues & Solutions

#### Issue 1: "📄 Using Excel data" in console
**Cause**: API is not responding or failed
**Solution**: 
1. Check backend server is running on port 3001
2. Check backend console for errors
3. Try: `node test-product-performance-api.js` to test API directly

#### Issue 2: No data showing
**Cause**: No period selected or base period not set
**Solution**:
1. Go to **Period Configuration**
2. Select at least one period
3. Click the ★ icon to set a base period

#### Issue 3: API errors in console
**Cause**: Database connection issue or server error
**Solution**:
1. Restart backend: Kill node processes and run `start-servers-win.ps1`
2. Check database is running: `psql -U postgres -d fp_database`
3. Verify table exists: `SELECT COUNT(*) FROM fp_data_excel;`

### 6. Expected Data (January 2025 Actual)

If everything is working correctly, you should see approximately:

| Metric | Value |
|--------|-------|
| Total Sales | 8.36M AED |
| Total Volume | 707K kg |
| Total MoRM | 3.43M AED |
| Top Product | SHRINK FILM PRINTED (2.17M AED) |
| #2 Product | SHRINK SLEEVES (1.60M AED) |
| #3 Product | LAMINATES (1.45M AED) |

### 7. Network Tab Check (F12 → Network)

**Look for this request:**
```
POST /api/fp/product-performance
Status: 200 OK
```

**Click on it and check:**
- **Request Payload**: Should show currentPeriod with year, months, type
- **Response**: Should have `success: true` and data with products array

### 8. Comparison with Excel

**To verify accuracy:**
1. Open your `Sales.xlsx` file
2. Go to `FP-Product Group` sheet
3. Find January 2025 Actual columns
4. Compare product sales values with dashboard
5. They should match exactly!

### 9. Test Different Periods

**Try these scenarios:**
1. **Single Month**: Select January 2025 Actual only
2. **Quarter**: Select Jan, Feb, Mar 2025
3. **Half Year**: Select Jan-Jun 2025
4. **Budget Data**: Select January 2025 Budget

**Each should load data correctly from the API.**

### 10. Test Other Divisions (Should Use Excel)

**Switch to:**
- **SB (Shopping Bags)** → Should still work with Excel data
- **TF (Thermoforming)** → Should still work with Excel data
- **HCM (Harwal)** → Should still work with Excel data

**Console should show:** "📄 Using Excel data for product performance"

## Troubleshooting Commands

### Test API Directly
```bash
node test-product-performance-api.js
```

### Check Database Connection
```bash
node -e "const {pool}=require('./server/database/config');pool.query('SELECT COUNT(*) FROM fp_data_excel').then(r=>{console.log('Records:',r.rows[0].count);pool.end()}).catch(e=>{console.error(e);pool.end()})"
```

### Restart Servers
```powershell
D:\IPD 9.10\start-servers-win.ps1
```

### View Backend Logs
Look at the backend server console window for:
- ✅ "✅ Product performance data retrieved successfully"
- ❌ Any red error messages

## Success Indicators

✅ **All Good!** If you see:
1. Product names displayed in dashboard
2. Sales values showing (not 0)
3. Console log: "📊 Using API data"
4. No red errors in console
5. Data matches your Excel file

❌ **Issue Detected** If you see:
1. All zeros in Product Performance section
2. Console errors (red text)
3. "Failed to fetch" errors
4. Network request fails (Status: 500 or 404)

## Contact Points

If you encounter issues, share:
1. **Screenshot** of the dashboard
2. **Browser console** errors (F12 → Console)
3. **Backend console** errors
4. **Network tab** showing the API request/response

This will help debug quickly!

---

## Quick Sanity Check

**Run this in PowerShell:**
```powershell
# Check if servers are running
Get-Process node -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, @{Label="Port/Path";Expression={$_.Path}}

# Test backend API
curl.exe -X POST http://localhost:3001/api/fp/product-performance -H "Content-Type: application/json" -d '{\"currentPeriod\":{\"year\":2025,\"months\":[\"January\"],\"type\":\"Actual\"}}'
```

If the curl command returns JSON with `"success":true`, the API is working!

---

Happy Testing! 🎉


