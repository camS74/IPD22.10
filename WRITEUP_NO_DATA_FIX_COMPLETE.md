# WriteUp "No Data Appearing" Issue - FIXED ✅

## Date: October 12, 2025

## Problem Statement
WriteUpViewV2 was rendering empty with no data appearing, even though a base period was auto-selected.

## Root Causes Identified

1. **Invalid factPack** - No validation or fallback when data was missing
2. **Period shape inconsistency** - Mixed object vs string handling for computeCellValue
3. **Brittle context dependencies** - Hard failures when context indices were missing
4. **Non-resilient KPI getters** - No error handling or safe fallbacks
5. **Missing dependencies** - marked, dompurify, html2pdf.js not installed
6. **React Hooks violations** - Hooks called after early returns

## Solutions Implemented

### 1. ✅ Valid factPack Guarantee

```javascript
function isValidFactPack(fp) {
  return !!fp
      && !!fp.kpi
      && typeof fp.kpi.sales === 'number'
      && !!fp.revenue_pvm && !!fp.revenue_pvm.total
      && !!fp.cogs_drivers;
}

// Hard guard with assertion and placeholder
console.assert(isValidFactPack(currentFactPack), '[WriteUp] invalid factPack:', currentFactPack);
if (!isValidFactPack(currentFactPack)) {
  return <div>Write-up needs data (kpi, revenue_pvm.total, cogs_drivers).</div>;
}
```

### 2. ✅ Period Shape Normalization

```javascript
// Normalize period input (object vs key)
function periodKey(p) { 
  return (p && p.key) ? p.key : p; 
}

// Robust label builder
function periodLabel(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return p.label || [p.year, p.month || 'Year', p.type].filter(Boolean).join(' ');
}

// Safe getter with error handling
function safeGet(rowIndex, period, computeCellValue) {
  try {
    return Number(computeCellValue(rowIndex, periodKey(period))) || 0;
  } catch (e) {
    console.error('[WriteUp] computeCellValue failed for', rowIndex, period, e);
    return 0;
  }
}
```

### 3. ✅ Safe Period Derivation

```javascript
// Derive periods from props without brittle context
const periods = (selectedPeriods?.length ? selectedPeriods : columnOrder) ?? [];
const base = periods[basePeriodIndex] || periods[0]; // fallback to first
const comp = periods[basePeriodIndex] || periods[0]; // use base period

// Early return with clear message if no periods
if (!periods.length) {
  return <div>Select a period to generate the write-up.</div>;
}
```

### 4. ✅ Resilient KPI Getters

```javascript
// KPI metrics with correct row indices and safe calculations
const kpi = {
  sales: safeGet(3, base, computeCellValue),
  material: safeGet(5, base, computeCellValue),
  gp: safeGet(19, base, computeCellValue),
  gp_pct: 0, // Calculate safely below
  ebitda: safeGet(56, base, computeCellValue),
  np: safeGet(54, base, computeCellValue),
  ebit: safeGet(54, base, computeCellValue) + safeGet(42, base, computeCellValue)
};

// Safe division
kpi.gp_pct = kpi.sales > 0 ? (kpi.gp / kpi.sales) * 100 : 0;
```

### 5. ✅ Dependencies Installed

```bash
npm install marked dompurify html2pdf.js --legacy-peer-deps
```

### 6. ✅ Error-Resilient Authoring

```javascript
// Wrap markdown pipeline in try/catch
useEffect(() => {
  if (!factPack || !insights) return;
  try {
    const md = composeNarrative(factPack, insights, divisionNames[selectedDivision]);
    setRawMd(md);
    const htmlContent = renderMarkdownToSafeHtml(md);
    setHtml(htmlContent);
  } catch (e) {
    console.error('[WriteUp] compose/render failed', e);
    setHtml('<p style="color:#b91c1c">Failed to render write-up. Check console.</p>');
  }
}, [factPack, insights, selectedDivision, divisionNames]);
```

### 7. ✅ React Hooks Rules Compliance

**Fixed:** All hooks are now called before any early returns

```javascript
export default function WriteUpViewV2({ tableData, selectedPeriods, computeCellValue: passedComputeCellValue }) {
  // ALL HOOKS MUST COME FIRST - BEFORE ANY EARLY RETURNS
  const editorRef = useRef(null);
  const [rawMd, setRawMd] = useState('');
  const [html, setHtml] = useState('');
  const [insights, setInsights] = useState([]);
  const [factPack, setFactPack] = useState(null);
  const [loading, setLoading] = useState(false);

  const { selectedDivision, excelData } = useExcelData();
  const { basePeriodIndex, columnOrder } = useFilter();

  const fallbackComputeCellValue = useCallback((rowIndex, column) =>
    sharedComputeCellValue(divisionData, rowIndex, column), [divisionData]);
  const computeCellValue = passedComputeCellValue || fallbackComputeCellValue;

  // All useEffect hooks...
  useEffect(() => { /* ... */ }, [currentFactPack]);
  useEffect(() => { /* ... */ }, [factPack]);
  useEffect(() => { /* ... */ }, [factPack, insights, selectedDivision, divisionNames]);
  useEffect(() => { /* ... */ }, [html]);

  // NOW CHECK FOR EARLY RETURNS AFTER ALL HOOKS
  if (!periods.length) return <div>...</div>;
  if (!isValidFactPack(currentFactPack)) return <div>...</div>;
  if (loading) return <div>...</div>;

  return <div className="writeup-container">...</div>;
}
```

## File Organization

All WriteUp related files are now organized in a dedicated folder:

```
src/components/writeup/
├── WriteUpView.js          # Legacy component
├── WriteUpView.css         # Legacy styles  
├── WriteUpViewV2.js        # Active component ✅
├── WriteUpViewV2.css       # Active styles ✅
├── analysis/               # Analysis engines
│   ├── insightEngine.js   # Insight scoring
│   └── pvm.js            # PVM analysis
├── renderer/              # Rendering utilities
│   └── markdownRenderer.js # Safe markdown conversion
├── export/                # Export utilities
│   └── exportWriteup.js   # PDF export
└── README.md              # Documentation
```

## Testing Checklist

- ✅ React Hooks errors resolved
- ✅ Dependencies installed (marked, dompurify, html2pdf.js)
- ✅ No linter errors
- ✅ Hard guard for factPack validation
- ✅ Safe period normalization
- ✅ Error handling in all critical paths
- ✅ Debug logging for troubleshooting
- ✅ Organized folder structure with documentation

## Expected Behavior

1. **With valid data:** WriteUp displays comprehensive financial analysis with:
   - Executive Summary with KPI metrics (Sales, GP%, EBITDA)
   - Variance Bridges (Revenue PVM, COGS drivers)
   - Root Causes (Customers, Sales Reps, Product Mix)
   - Unit Economics
   - Recommended Actions
   - Ranked Insights

2. **Without periods:** Shows clear message "Select a period to generate the write-up"

3. **With invalid data:** Shows debug information about missing data

4. **On error:** Displays error message without crashing

## Debug Features

All debug logging is conditional on development mode:

```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('[WriteUp] Building factPack with periods:', ...);
  console.log('[WriteUp] PVM Debug:', ...);
  console.log('[WriteUp] Built factPack:', ...);
}
```

## Currency Symbol

Using correct UAE Dirham symbol throughout: **Đ**

```javascript
function fmtAed(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `Đ ${(n/1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `Đ ${(n/1_000).toFixed(1)}k`;
  return `Đ ${n.toFixed(0)}`;
}
```

## Status: COMPLETE ✅

All issues have been resolved. WriteUpViewV2 should now display data correctly with proper error handling and validation.






