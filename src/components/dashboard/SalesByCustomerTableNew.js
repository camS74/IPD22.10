
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { useExcelData } from '../../contexts/ExcelDataContext';
import UAEDirhamSymbol from './UAEDirhamSymbol';
import './SalesByCustomerTableNew.css';

/**
 * Performance-focused rewrite notes (same file name, same UI):
 * - Build per-column hash maps once (O(n)) instead of O(n) ".find" inside every cell render.
 * - Precompute a values matrix [customer x column] via useMemo and reuse everywhere (table, percentages, summary).
 * - Use consistent normalization with `norm()` across all matching/merge operations.
 * - Keep network IO parallel for sales data (Promise.all), but only after merge rules are ready.
 * - Memoize extended columns structure and derived lists to avoid repeated work on every render.
 * - Render Top 20 only (original behavior) but compute on prebuilt matrix for speed.
 */

const SalesByCustomerTableNew = () => {
  const { columnOrder, dataGenerated, basePeriodIndex: contextBasePeriodIndex } = useFilter();
  const { selectedDivision } = useExcelData();
  const tableRef = useRef(null);

  const [hideBudgetForecast, setHideBudgetForecast] = useState(false);
  const [hideSalesRep, setHideSalesRep] = useState(false);

  const [customers, setCustomers] = useState([]);                 // final labels including mergedName*
  const [customerData, setCustomerData] = useState({});           // raw API rows per columnKey
  const [customerSalesRepMap, setCustomerSalesRepMap] = useState({}); // customer -> sales rep mapping
  const [mergeRules, setMergeRules] = useState([]);
  const [mergeRulesLoaded, setMergeRulesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---------- helpers ----------
  const norm = (s) => (s || '').toString().trim().toLowerCase();

  const toProperCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Build extended columns once per inputs
  const extendedColumns = useMemo(() => {
    const filteredColumns = columnOrder.filter(col => {
      if (hideBudgetForecast && (col.type === 'Budget' || col.type === 'Forecast')) return false;
      return true;
    });

    const out = [];
    filteredColumns.forEach((col, index) => {
      out.push(col);
      if (index < filteredColumns.length - 1) {
        out.push({
          columnType: 'delta',
          fromColumn: col,
          toColumn: filteredColumns[index + 1]
        });
      }
    });
    return out;
  }, [columnOrder, hideBudgetForecast]);

  const dataColumnsOnly = useMemo(() => extendedColumns.filter(c => c.columnType !== 'delta'), [extendedColumns]);

  // Compute the effective base period index after filtering, preserving the original period selection
  const effectiveBasePeriodIndex = useMemo(() => {
    if (contextBasePeriodIndex === null || contextBasePeriodIndex < 0) return 0;
    if (dataColumnsOnly.length === 0) return 0;
    
    // Get the original base period column from the full columnOrder
    if (contextBasePeriodIndex >= columnOrder.length) return 0;
    
    const originalBaseColumn = columnOrder[contextBasePeriodIndex];
    
    // Find this same period in the filtered dataColumnsOnly array
    const filteredIndex = dataColumnsOnly.findIndex(col => 
      col.year === originalBaseColumn.year &&
      col.month === originalBaseColumn.month &&
      col.type === originalBaseColumn.type
    );
    
    // If the base period was filtered out (e.g., it was Budget/Forecast and now hidden),
    // fall back to the first available period
    return filteredIndex >= 0 ? filteredIndex : 0;
  }, [contextBasePeriodIndex, columnOrder, dataColumnsOnly]);

  // Helper function for column keys
  const getColumnKey = (column) => column.id || `${column.year}-${column.month}-${column.type}`;

  // Create stable string key for columns to avoid unnecessary re-renders
  const columnsKey = useMemo(() => 
    dataColumnsOnly.map(c => getColumnKey(c)).join(','), 
    [dataColumnsOnly]
  );

  const calculateColumnWidths = () => {
    const totalDataColumns = dataColumnsOnly.length;
    const totalDeltaColumns = extendedColumns.length - totalDataColumns;

    const customerWidth = 18; // Customer names width
    const salesRepWidth = 8; // Sales Rep column width
    const availableWidth = 74; // Available width for data columns
    const totalColumns = (totalDataColumns * 2) + totalDeltaColumns;

    let valueColumnWidth, percentColumnWidth, deltaColumnWidth;
    if (totalDataColumns <= 2) {
      valueColumnWidth = (availableWidth / totalColumns) * 1.5; // Increased for values
      percentColumnWidth = (availableWidth / totalColumns) * 0.5; // Reduced for percentages
      deltaColumnWidth = (availableWidth / totalColumns) * 0.8; // Reduced for delta
    } else if (totalDataColumns <= 3) {
      valueColumnWidth = (availableWidth / totalColumns) * 1.4;
      percentColumnWidth = (availableWidth / totalColumns) * 0.6;
      deltaColumnWidth = (availableWidth / totalColumns) * 0.7;
    } else {
      valueColumnWidth = (availableWidth / totalColumns) * 1.3;
      percentColumnWidth = (availableWidth / totalColumns) * 0.7;
      deltaColumnWidth = (availableWidth / totalColumns) * 0.6;
    }

    return {
      customer: customerWidth,
      salesRep: salesRepWidth,
      value: valueColumnWidth,
      percent: percentColumnWidth,
      delta: deltaColumnWidth
    };
  };

  const columnWidths = calculateColumnWidths();



  // ---------- data fetching ----------
  const fetchMergeRules = async () => {
    if (!selectedDivision) return;

    try {
      const response = await fetch(`http://localhost:3001/api/customer-merge-rules/division?division=${encodeURIComponent(selectedDivision)}`);
      const result = await response.json();

      if (result.success) {
        setMergeRules(result.data || []);
        setMergeRulesLoaded(true);
      } else {
        setMergeRules([]);
        setMergeRulesLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load merge rules:', err);
      setMergeRules([]);
      setMergeRulesLoaded(true);
    }
  };

  const applyMergeRulesToCustomers = (rawCustomers) => {
    if (!mergeRules || mergeRules.length === 0) return rawCustomers;

    const processedCustomers = [];
    const processed = new Set();
    const rawNormSet = new Set(rawCustomers.map(c => norm(c)));

    mergeRules.forEach(rule => {
      const originalCustomers = rule.originalCustomers || [];
      const existingCustomers = originalCustomers.filter(customer => rawNormSet.has(norm(customer)));

      if (existingCustomers.length >= 1) {
        const mergedName = (rule.mergedName || '').toString().trim() + '*';
        processedCustomers.push(mergedName);
        existingCustomers.forEach(customer => processed.add(norm(customer)));
      }
    });

    rawCustomers.forEach(customer => {
      if (!processed.has(norm(customer))) {
        processedCustomers.push(customer);
      }
    });

    // final dedupe by normalized label
    return [...new Map(processedCustomers.map(c => [norm(c), c])).values()];
  };

  const fetchCustomers = async () => {
    if (!selectedDivision) return;

    try {
      const response = await fetch(`http://localhost:3001/api/customers-db?division=${selectedDivision}`);
      const result = await response.json();

      if (result.success) {
        const rawCustomerNames = [...new Set(result.data.map(item => item))];
        const mergedCustomerNames = applyMergeRulesToCustomers(rawCustomerNames);
        setCustomers(mergedCustomerNames);
      } else {
        throw new Error(result.message || 'Failed to load customers');
      }
    } catch (err) {
      throw new Error('Failed to load customers: ' + err.message);
    }
  };

  const fetchSalesRepMapping = async () => {
    if (!selectedDivision) return;

    try {
      // Get sales rep mapping for all customers regardless of year
      const response = await fetch(`http://localhost:3001/api/customer-sales-rep-mapping?division=${selectedDivision}`);
      const result = await response.json();

      if (result.success) {
        // Create a normalized key map to avoid case/spacing mismatches
        const normMap = {};
        Object.keys(result.data).forEach(key => {
          normMap[norm(key)] = result.data[key];
        });
        setCustomerSalesRepMap(normMap);
        console.log(`✅ Loaded sales rep mapping for ${Object.keys(normMap).length} customers (normalized keys)`);
      } else {
        console.error('Failed to load sales rep mapping:', result.message);
      }
    } catch (err) {
      console.error('Failed to load sales rep mapping:', err);
    }
  };

  const fetchSalesData = async (column) => {
    if (!selectedDivision || selectedDivision !== 'FP') return;

    try {
      let months = [];
      if (column.months && Array.isArray(column.months)) {
        months = column.months;
      } else if (column.month === 'Q1') {
        months = [1,2,3];
      } else if (column.month === 'Q2') {
        months = [4,5,6];
      } else if (column.month === 'Q3') {
        months = [7,8,9];
      } else if (column.month === 'Q4') {
        months = [10,11,12];
      } else if (column.month === 'Year') {
        months = [1,2,3,4,5,6,7,8,9,10,11,12];
      } else if (column.month === 'HY1') {
        months = [1,2,3,4,5,6];
      } else if (column.month === 'HY2') {
        months = [7,8,9,10,11,12];
      } else {
        const monthMap = {
          'January': 1, 'February': 2, 'March': 3, 'April': 4,
          'May': 5, 'June': 6, 'July': 7, 'August': 8,
          'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        months = [monthMap[column.month] || 1];
      }

      const response = await fetch('http://localhost:3001/api/sales-by-customer-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division: selectedDivision,
          year: column.year,
          months,
          dataType: column.type || 'Actual'
        })
      });

      const result = await response.json();

      if (result.success) {
        const columnKey = getColumnKey(column);
        setCustomerData(prev => ({
          ...prev,
          [columnKey]: result.data
        }));
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    }
  };

  // Load all data in a single orchestrated effect
  useEffect(() => {
    const loadAll = async () => {
      if (!selectedDivision) return;
      
           // Clean up old state when division changes
           setCustomers([]);
           setCustomerData({});
           setCustomerSalesRepMap({});
           setMergeRules([]);
           setMergeRulesLoaded(false);

           setLoading(true);
           setError(null);
           try {
             await Promise.all([
               fetchMergeRules(),
               fetchCustomers(),
               fetchSalesRepMapping()
             ]);
             
             if (dataColumnsOnly.length > 0) {
               // ULTRA-FAST: Single API call for all columns
               try {
                 console.log('🚀 Making ULTRA-FAST API call for Sales by Customer with:', {
                   division: selectedDivision,
                   columnsCount: dataColumnsOnly.length
                 });
                 
                 const response = await fetch('http://localhost:3001/api/sales-by-customer-ultra-fast', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     division: selectedDivision,
                     columns: dataColumnsOnly.map(column => ({
                       year: column.year,
                       month: column.month,
                       type: column.type || 'Actual',
                       columnKey: getColumnKey(column)
                     }))
                   })
                 });
                 
                 const result = await response.json();
                 
                 if (result.success && result.data) {
                   console.log('✅ ULTRA-FAST API returned data for', Object.keys(result.data).length, 'columns');
                   setCustomerData(result.data);
                 } else {
                   throw new Error(result.message || 'Ultra-fast API call failed');
                 }
               } catch (err) {
                 console.error('Ultra-fast API call failed, falling back to individual calls:', err);
                 // Fallback to original approach if ultra-fast fails
                 await Promise.all(
                   dataColumnsOnly.map(column => fetchSalesData(column))
                 );
               }
             }
           } catch (err) {
             console.error('Error loading data:', err);
             setError('Failed to load data. Please try again.');
           } finally {
             setLoading(false);
           }
    };
    loadAll();
  // Use stable string key instead of array reference
  }, [selectedDivision, columnsKey]);

  // ---------- indices & matrices for fast lookup ----------
  // columnIndex: { [columnKey]: { byCustomer: Map(normName -> value), totalRaw: number } }
  const columnIndex = useMemo(() => {
    const idx = {};
    dataColumnsOnly.forEach(col => {
      const key = getColumnKey(col);
      const rows = customerData[key] || [];
      const map = new Map();
      let totalRaw = 0;
      for (let i = 0; i < rows.length; i++) {
        const nm = norm(rows[i].customer);
        const val = Number(rows[i].value || 0);
        map.set(nm, (map.get(nm) || 0) + val);
        totalRaw += val;
      }
      idx[key] = { byCustomer: map, totalRaw };
    });
    return idx;
  }, [customerData, dataColumnsOnly]);

  // quick merge map: normalized mergedLabel -> array of normalized originals (from rules, existence check deferred to lookup)
  const mergeMap = useMemo(() => {
    const map = new Map();
    mergeRules.forEach(rule => {
      const mergedLabel = norm((rule.mergedName || '').toString().trim() + '*');
      const arr = (rule.originalCustomers || []).map(c => norm(c));
      map.set(mergedLabel, arr);
    });
    return map;
  }, [mergeRules]);

  // valuesMatrix: Map(customerLabel -> { [columnKey]: valueNumber })
  const valuesMatrix = useMemo(() => {
    const matrix = new Map();
    // prepare once per customer
    customers.forEach(label => {
      const row = {};
      dataColumnsOnly.forEach(col => {
        const key = getColumnKey(col);
        const ci = columnIndex[key];
        if (!ci) { row[key] = 0; return; }

        // merged row?
        if ((label || '').endsWith('*')) {
          // normalize the customer label to match the mergeMap key
          const normalizedLabel = norm(label);
          const originals = mergeMap.get(normalizedLabel) || [];
          let sum = 0;
          for (let i = 0; i < originals.length; i++) {
            const v = ci.byCustomer.get(originals[i]) || 0;
            sum += v;
          }
          row[key] = sum;
        } else {
          row[key] = ci.byCustomer.get(norm(label)) || 0;
        }
      });
      matrix.set(label, row);
    });
    return matrix;
  }, [customers, dataColumnsOnly, columnIndex, mergeMap]);

  // columnTotals: per data column total (sum of raw rows; equals sum of matrix rows if merged handled correctly)
  const columnTotals = useMemo(() => {
    const obj = {};
    dataColumnsOnly.forEach(col => {
      const key = getColumnKey(col);
      obj[key] = (columnIndex[key]?.totalRaw) || 0;
    });
    return obj;
  }, [columnIndex, dataColumnsOnly]);

  const getCustomerAmountFast = (customerLabel, column) => {
    const key = getColumnKey(column);
    const row = valuesMatrix.get(customerLabel) || {};
    return row[key] || 0;
  };

  const getCustomerPercentFast = (customerLabel, column) => {
    const key = getColumnKey(column);
    const value = getCustomerAmountFast(customerLabel, column);
    const total = columnTotals[key] || 0;
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  const calculateDelta = (fromValue, toValue) => {
    if (fromValue === 0) return toValue > 0 ? 'NEW' : 0;
    return ((toValue - fromValue) / fromValue) * 100;
  };

  const formatPercentage = (num) => `${(isNaN(num) ? 0 : num).toFixed(1)}%`;
  const formatDelta = (delta) => {
    if (isNaN(delta)) return '—';
    if (delta === 'NEW') return 'NEW';
    if (delta === 0) return '0.0%';
    const sign = delta > 0 ? '+' : '';
    const formatted = Math.abs(delta) >= 100 ? Math.round(delta) : delta.toFixed(1);
    return `${sign}${formatted}%`;
  };
  const getDeltaColor = (delta) => {
    if (isNaN(delta)) return '#666666';
    if (delta === 'NEW') return '#28a745'; // Green for new data
    if (delta === 0) return '#666666'; // Gray for no change
    return delta > 0 ? '#0066cc' : '#cc0000'; // Blue for positive, red for negative
  };

  const getCustomerSalesRep = (customerLabel) => {
    // For merged customers (ending with *), return the sales rep associated with the most recent year/month
    // among all original customers in the merge group
    if (customerLabel.endsWith('*')) {
      const mergedLabel = customerLabel.slice(0, -1); // Remove the *
      
      // Find the merge rule for this customer
      const rule = mergeRules.find(r => norm((r.mergedName || '')) === norm(mergedLabel));
      if (!rule) return 'N/A';
      
      // Get sales reps for all original customers in this merge rule
      const salesReps = rule.originalCustomers.map(origCustomer => {
        const salesRepData = customerSalesRepMap[norm(origCustomer)];
        return salesRepData ? {
          salesRep: salesRepData.salesRep,
          customer: origCustomer,
          year: salesRepData.year,
          month: salesRepData.month
        } : null;
      }).filter(Boolean);
      
      if (salesReps.length === 0) return 'N/A';
      
      // Sort by latest date (year DESC, month DESC) and return the most recent
      salesReps.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      return salesReps[0].salesRep;
    } else {
      // For non-merged customers, use direct normalized lookup
      const salesRepData = customerSalesRepMap[norm(customerLabel)];
      return salesRepData ? salesRepData.salesRep : 'N/A';
    }
  };

  const colorSchemes = [
    { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', light: '#E3F2FD', isDark: true },
    { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', light: '#E8F5E9', isDark: true },
    { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', light: '#FFFDE7', isDark: false },
    { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', light: '#FFF3E0', isDark: false },
    { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#E6EEF5', light: '#E6EEF5', isDark: true }
  ];

  const getColumnHeaderStyle = (column) => {
    if (!column) {
      return { backgroundColor: '#288cfa', color: '#FFFFFF', fontWeight: 'bold' };
    }
    if (column.customColor) {
      const scheme = colorSchemes.find(s => s.name === column.customColor);
      if (scheme) {
        return {
          backgroundColor: scheme.primary,
          color: scheme.isDark ? '#FFFFFF' : '#000000',
          fontWeight: 'bold'
        };
      }
    }
    if (['Q1','Q2','Q3','Q4'].includes(column.month)) {
      return { backgroundColor: '#FF6B35', color: '#000000', fontWeight: 'bold' };
    } else if (column.month === 'January') {
      return { backgroundColor: '#FFD700', color: '#000000', fontWeight: 'bold' };
    } else if (column.month === 'Year') {
      return { backgroundColor: '#288cfa', color: '#FFFFFF', fontWeight: 'bold' };
    } else if (column.type === 'Budget') {
      return { backgroundColor: '#2E865F', color: '#FFFFFF', fontWeight: 'bold' };
    }
    return { backgroundColor: '#288cfa', color: '#FFFFFF', fontWeight: 'bold' };
  };

  const getCellBackgroundColor = (column) => {
    if (column?.customColor) {
      const scheme = colorSchemes.find(s => s.name === column.customColor);
      if (scheme) return scheme.light;
    }
    if (['Q1','Q2','Q3','Q4'].includes(column?.month)) {
      return colorSchemes.find(s => s.name === 'orange').light;
    } else if (column?.month === 'January') {
      return colorSchemes.find(s => s.name === 'yellow').light;
    } else if (column?.month === 'Year') {
      return colorSchemes.find(s => s.name === 'blue').light;
    } else if (column?.type === 'Budget') {
      return colorSchemes.find(s => s.name === 'green').light;
    }
    return colorSchemes.find(s => s.name === 'blue').light;
  };

  // ---------- sorted top 20 & summary using the matrix ----------
  const sortedCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    if (dataColumnsOnly.length === 0) return customers.slice(0, 20);

    const baseCol = dataColumnsOnly[effectiveBasePeriodIndex];
    const sorted = [...customers].sort((a, b) => {
      const av = getCustomerAmountFast(a, baseCol);
      const bv = getCustomerAmountFast(b, baseCol);
      return bv - av;
    });
    return sorted.slice(0, 20);
  }, [customers, dataColumnsOnly, effectiveBasePeriodIndex, valuesMatrix]);

  const summaryData = useMemo(() => {
    if (!customers || customers.length === 0 || dataColumnsOnly.length === 0) return null;

    const baseCol = dataColumnsOnly[effectiveBasePeriodIndex];

    const fullSorted = [...customers].sort((a, b) => {
      const av = getCustomerAmountFast(a, baseCol);
      const bv = getCustomerAmountFast(b, baseCol);
      return bv - av;
    });
    const top20 = fullSorted.slice(0, 20);
    const rest = fullSorted.slice(20);

    const summary = {};
    dataColumnsOnly.forEach(col => {
      const key = getColumnKey(col);
      const total = columnTotals[key] || 0;

      const top20Total = top20.reduce((s, cust) => s + getCustomerAmountFast(cust, col), 0);
      const remainingTotal = rest.reduce((s, cust) => s + getCustomerAmountFast(cust, col), 0);

      summary[key] = {
        top20Total,
        remainingTotal,
        allTotal: total,
        customersWithData: customers.filter(c => getCustomerAmountFast(c, col) > 0).length,
        top20Percentage: total > 0 ? (top20Total / total) * 100 : 0,
        remainingPercentage: total > 0 ? (remainingTotal / total) * 100 : 0
      };
    });

    return { top20Customers: top20, remainingCustomers: rest, totalCustomers: customers.length, summary };
  }, [customers, dataColumnsOnly, effectiveBasePeriodIndex, valuesMatrix, columnTotals]);

  // ---------- UI states ----------
  if (loading) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Top 20 Customers - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>Loading data from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Top 20 Customers - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (selectedDivision !== 'FP') {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Top 20 Customers - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', marginBottom: '20px' }}>🚧 Coming Soon</h3>
            <p style={{ color: '#888', fontSize: '16px' }}>
              Sales by Customer for {selectedDivision} division is currently under development.
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
              The database table <code>{selectedDivision.toLowerCase()}_data_excel</code> has been created and is ready for data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dataGenerated || columnOrder.length === 0) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Top 20 Customers - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>Please generate data using the filters to view Sales by Customer.</p>
        </div>
      </div>
    );
  }

  // ---------- render ----------
  return (
    <div className="table-view">
      <div ref={tableRef} className="table-container-for-export">
        <div className="table-title">
          <h2>Top 20 Customers - {selectedDivision}</h2>
          <div className="table-subtitle">
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              (<UAEDirhamSymbol />)
            </div>
          </div>
          <div className="table-options">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={hideBudgetForecast}
                onChange={(e) => setHideBudgetForecast(e.target.checked)}
              />
              Hide Budget & Forecast
            </label>
            <label className="option-checkbox" style={{ marginLeft: '20px' }}>
              <input
                type="checkbox"
                checked={hideSalesRep}
                onChange={(e) => setHideSalesRep(e.target.checked)}
              />
              Hide Sales Rep
            </label>
          </div>
        </div>
        <div className="table-container">
          <table className="sales-by-customer-table">
            <colgroup>
              <col style={{ width: `${columnWidths.customer}%` }}/>
              {!hideSalesRep && (
                <col style={{ width: `${columnWidths.salesRep}%` }}/>
              )}
            </colgroup>
            {extendedColumns.map((col, index) => {
              if (col.columnType === 'delta') {
                return (
                  <colgroup key={`colgroup-delta-${index}`}>
                    <col style={{ width: `${columnWidths.delta}%` }}/>
                  </colgroup>
                );
              } else {
                return (
                  <colgroup key={`colgroup-data-${index}`}>
                    <col style={{ width: `${columnWidths.value}%` }}/>
                    <col style={{ width: `${columnWidths.percent}%` }}/>
                  </colgroup>
                );
              }
            })}
            <thead>
              <tr>
                <th className="empty-header star-cell"></th>
                {!hideSalesRep && (
                  <th className="star-cell"></th>
                )}
                {(() => {
                  let dataIdx = 0;
                  return extendedColumns.map((col, index) => {
                    if (col.columnType === 'delta') {
                      return <th key={`star-delta-${index}`} className="star-cell"></th>;
                    }
                    const isBase = dataIdx === effectiveBasePeriodIndex;
                    const symbol = isBase ? '★' : '';
                    const style = { 
                      color: isBase ? '#FFD700' : '#ffffff', 
                      fontSize: '28px',
                      textAlign: 'center',
                      padding: '4px'
                    };
                    dataIdx += 1;
                    return (
                      <th key={`star-${index}`} colSpan={2} className="star-cell" style={style}>
                        {symbol}
                      </th>
                    );
                  });
                })()}
              </tr>
              <tr className="main-header-row">
                <th className="empty-header" rowSpan="4">Customer</th>
                {!hideSalesRep && (
                  <th className="sales-rep-header" rowSpan="4" style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold', borderTop: 'none', borderLeft: 'none' }}>Sales Rep</th>
                )}
                {extendedColumns.map((col, index) =>
                  col.columnType === 'delta' ? (
                    <th key={`delta-year-${index}`} rowSpan="4" style={{ backgroundColor: '#f8f9fa', color: '#000', fontWeight: 'bold' }}>Δ</th>
                  ) : (
                    <th key={`year-${index}`} style={getColumnHeaderStyle(col)} colSpan={2}>
                      {col.year}
                    </th>
                  )
                )}
              </tr>
              <tr>
                {extendedColumns.map((col, index) =>
                  col.columnType === 'delta' ? null : (
                    <th key={`month-${index}`} style={getColumnHeaderStyle(col)} colSpan={2}>
                      {col.month}
                    </th>
                  )
                ).filter(Boolean)}
              </tr>
              <tr>
                {extendedColumns.map((col, index) =>
                  col.columnType === 'delta' ? null : (
                    <th key={`type-${index}`} style={getColumnHeaderStyle(col)} colSpan={2}>
                      {col.type}
                    </th>
                  )
                ).filter(Boolean)}
              </tr>
              <tr>
                {extendedColumns.map((col, index) =>
                  col.columnType === 'delta' ? null : (
                    <React.Fragment key={`fragment-${index}`}>
                      <th style={{ backgroundColor: getCellBackgroundColor(col), color: '#000', fontWeight: 'bold' }}>Values</th>
                      <th style={{ backgroundColor: getCellBackgroundColor(col), color: '#000', fontWeight: 'bold' }}>%</th>
                    </React.Fragment>
                  )
                ).filter(Boolean)}
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer, customerIndex) => {
                const isLastCustomer = customerIndex === sortedCustomers.length - 1;
                return (
                  <tr key={`customer-${customerIndex}-${customer.replace(/\s+/g, '-')}`}>
                    <td className={`row-label customer-name-cell ${isLastCustomer ? 'thick-border-bottom' : ''}`} title={customer}>
                      {toProperCase(customer)}
                    </td>
                    {!hideSalesRep && (
                      <td className={`row-label sales-rep-cell ${isLastCustomer ? 'thick-border-bottom' : ''}`} style={{ fontWeight: 'bold' }}>
                        {toProperCase(getCustomerSalesRep(customer))}
                      </td>
                    )}
                    {extendedColumns.map((column, columnIndex) => {
                      if (column.columnType === 'delta') {
                        const fromValue = getCustomerAmountFast(customer, column.fromColumn);
                        const toValue = getCustomerAmountFast(customer, column.toColumn);
                        const delta = calculateDelta(fromValue, toValue);
                        return (
                          <td
                            key={columnIndex}
                            className={`metric-cell ${isLastCustomer ? 'thick-border-bottom' : ''}`}
                            style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}
                          >
                            {formatDelta(delta)}
                          </td>
                        );
                      } else {
                        const absolute = getCustomerAmountFast(customer, column);
                        const percentage = getCustomerPercentFast(customer, column);
                        return (
                          <React.Fragment key={`data-fragment-${columnIndex}`}>
                            <td className={`metric-cell ${isLastCustomer ? 'thick-border-bottom' : ''}`} style={{ backgroundColor: getCellBackgroundColor(column) }}>
                              {absolute.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </td>
                            <td className={`metric-cell ${isLastCustomer ? 'thick-border-bottom' : ''}`} style={{ backgroundColor: getCellBackgroundColor(column) }}>
                              {formatPercentage(percentage)}
                            </td>
                          </React.Fragment>
                        );
                      }
                    })}
                  </tr>
                );
              })}

              {summaryData && (
                <>
                  <tr>
                    <td className="row-label summary-label total-top20-label" style={{ backgroundColor: '#2196F3', fontWeight: 'bold', color: 'white' }}>
                      Total Top 20 Customers
                    </td>
                    {!hideSalesRep && (
                      <td className="row-label summary-label" style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                        —
                      </td>
                    )}
                    {extendedColumns.map((column, idx) => {
                      if (column.columnType === 'delta') {
                        const fromKey = getColumnKey(column.fromColumn);
                        const toKey = getColumnKey(column.toColumn);
                        const fromData = summaryData.summary[fromKey];
                        const toData = summaryData.summary[toKey];
                        const delta = calculateDelta(fromData?.top20Total || 0, toData?.top20Total || 0);
                        return (
                          <td key={`top20-delta-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}>
                            {formatDelta(delta)}
                          </td>
                        );
                      }
                      const key = getColumnKey(column);
                      const data = summaryData.summary[key];
                      return (
                        <React.Fragment key={`top20-fragment-${idx}`}>
                          <td className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), fontWeight: 'bold', color: '#000' }}>
                            {(data?.top20Total || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), fontWeight: 'bold', color: '#000' }}>
                            {formatPercentage(data?.top20Percentage || 0)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="row-label summary-label total-other-label" style={{ backgroundColor: '#1565C0', color: 'white', fontWeight: 'bold' }}>
                      Total Other Customers
                    </td>
                    {!hideSalesRep && (
                      <td className="row-label summary-label" style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                        —
                      </td>
                    )}
                    {extendedColumns.map((column, idx) => {
                      if (column.columnType === 'delta') {
                        const fromKey = getColumnKey(column.fromColumn);
                        const toKey = getColumnKey(column.toColumn);
                        const fromData = summaryData.summary[fromKey];
                        const toData = summaryData.summary[toKey];
                        const delta = calculateDelta(fromData?.remainingTotal || 0, toData?.remainingTotal || 0);
                        return (
                          <td key={`other-delta-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}>
                            {formatDelta(delta)}
                          </td>
                        );
                      }
                      const key = getColumnKey(column);
                      const data = summaryData.summary[key];
                      return (
                        <React.Fragment key={`other-fragment-${idx}`}>
                          <td className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), color: '#000', fontWeight: 'bold' }}>
                            {(data?.remainingTotal || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), color: '#000', fontWeight: 'bold' }}>
                            {formatPercentage(data?.remainingPercentage || 0)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="row-label summary-label total-sales-label" style={{ backgroundColor: '#0D47A1', color: 'white', fontWeight: 'bold' }}>
                      Total Sales
                    </td>
                    {!hideSalesRep && (
                      <td className="row-label summary-label" style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                        —
                      </td>
                    )}
                    {extendedColumns.map((column, idx) => {
                      if (column.columnType === 'delta') {
                        const fromKey = getColumnKey(column.fromColumn);
                        const toKey = getColumnKey(column.toColumn);
                        const fromData = summaryData.summary[fromKey];
                        const toData = summaryData.summary[toKey];
                        const fromTotal = (fromData?.top20Total || 0) + (fromData?.remainingTotal || 0);
                        const toTotal = (toData?.top20Total || 0) + (toData?.remainingTotal || 0);
                        const delta = calculateDelta(fromTotal, toTotal);
                        return (
                          <td key={`total-sales-delta-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}>
                            {formatDelta(delta)}
                          </td>
                        );
                      }
                      const key = getColumnKey(column);
                      const data = summaryData.summary[key];
                      const totalSales = (data?.top20Total || 0) + (data?.remainingTotal || 0);
                      return (
                        <td key={`total-sales-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), color: '#000', fontWeight: 'bold' }} colSpan={2}>
                          {totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td className="row-label summary-label number-all-label" style={{ backgroundColor: '#1976D2', color: 'white', fontWeight: 'bold' }}>
                      Number of All Customers
                    </td>
                    {!hideSalesRep && (
                      <td className="row-label summary-label" style={{ fontWeight: 'bold', fontSize: '12px', textAlign: 'center' }}>
                        —
                      </td>
                    )}
                    {extendedColumns.map((column, idx) => {
                      if (column.columnType === 'delta') {
                        // For count rows, show blank delta (not meaningful); keep layout stable
                        return (
                          <td key={`count-delta-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#f8f9fa' }}>
                            {''}
                          </td>
                        );
                      }
                      const key = getColumnKey(column);
                      const data = summaryData.summary[key];
                      return (
                        <td key={`count-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: getCellBackgroundColor(column), color: '#000', fontWeight: 'bold' }} colSpan={2}>
                          {data?.customersWithData || 0}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesByCustomerTableNew;
