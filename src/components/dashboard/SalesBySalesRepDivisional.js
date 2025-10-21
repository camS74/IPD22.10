import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { useExcelData } from '../../contexts/ExcelDataContext';
import SalesRepHTMLExport from './SalesRepHTMLExport';
import UAEDirhamSymbol from './UAEDirhamSymbol';
import './SalesByCustomerTableNew.css'; // Reuse the same CSS

/**
 * Sales by Sales Rep Divisional - Duplicated from Sales by Customer
 * Shows sales rep performance data instead of customer data
 */

const SalesBySalesRepDivisional = () => {
  const { columnOrder, dataGenerated, basePeriodIndex: contextBasePeriodIndex } = useFilter();
  const { selectedDivision } = useExcelData();
  const tableRef = useRef(null);

  const [hideBudgetForecast, setHideBudgetForecast] = useState(false);

  const [salesReps, setSalesReps] = useState([]);                 // final labels for sales reps
  const [salesRepData, setSalesRepData] = useState({});           // raw API rows per columnKey
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

  // Calculate column widths
  const columnWidths = useMemo(() => {
    const totalDataColumns = dataColumnsOnly.length;
    const totalDeltaColumns = extendedColumns.length - totalDataColumns;
    const totalColumns = 1 + totalDataColumns + totalDeltaColumns; // 1 for sales rep column

    const salesRepColumnWidth = 20; // 20% for sales rep name
    const remainingWidth = 80; // 80% for data columns
    const dataColumnWidth = remainingWidth / totalDataColumns;

    return {
      salesRep: salesRepColumnWidth,
      value: dataColumnWidth * 0.7, // 70% of data column for value
      percent: dataColumnWidth * 0.3, // 30% of data column for percentage
      delta: dataColumnWidth * 0.5, // 50% of data column for delta
      totalColumns
    };
  }, [dataColumnsOnly, extendedColumns]);


  // Fetch sales rep data - simplified approach
  const fetchSalesRepData = useCallback(async () => {
    if (!dataGenerated || !selectedDivision) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1) Load individual sales reps for this division
      const salesRepsResponse = await fetch(`http://localhost:3001/api/sales-reps-universal?division=${encodeURIComponent(selectedDivision)}`);
      const salesRepsData = await salesRepsResponse.json();
      if (!salesRepsData.success) {
        throw new Error(salesRepsData.message || 'Failed to fetch sales reps list');
      }
      const allSalesReps = (salesRepsData.data || []).filter(Boolean);

      // Build normalization map: normalized -> canonical display name from API
      const normalizedToCanonical = new Map();
      allSalesReps.forEach(r => normalizedToCanonical.set(norm(r), r));

      // 2) Load grouping rules for this division
      const groupsResponse = await fetch(`http://localhost:3001/api/sales-rep-groups-universal?division=${encodeURIComponent(selectedDivision)}`);
      const groupsPayload = await groupsResponse.json();
      const rawGroups = (groupsPayload && groupsPayload.success && groupsPayload.data) ? groupsPayload.data : {};

      // Resolve group members to canonical names (avoid case/spacing mismatches)
      const groups = {};
      Object.keys(rawGroups).forEach(groupName => {
        const members = Array.isArray(rawGroups[groupName]) ? rawGroups[groupName] : [];
        const resolved = Array.from(new Set(
          members
            .filter(Boolean)
            .map(m => normalizedToCanonical.get(norm(m)) || m)
        ));
        groups[groupName] = resolved;
      });

      // 3) Build displayed entities: group names first, then any reps not in a group
      const groupedMembersNormalized = new Set(
        Object.values(groups).flat().map(n => norm(n))
      );
      const standaloneReps = allSalesReps.filter(r => !groupedMembersNormalized.has(norm(r)));
      const displayEntities = [...Object.keys(groups), ...standaloneReps];

      setSalesReps(displayEntities);
      
      // ULTRA-OPTIMIZED: Single super-fast API call for ALL data at once
      const salesRepDataMap = {};
      
      try {
        // Get all unique sales reps (including group members)
        const allSalesReps = new Set();
        displayEntities.forEach(entityName => {
          const members = Array.isArray(groups[entityName]) && groups[entityName].length > 0
            ? groups[entityName]
            : [entityName];
          members.forEach(member => allSalesReps.add(member));
        });

        // Single ULTRA-FAST API call for all data
        console.log('🚀 Making ULTRA-FAST API call with:', {
          division: selectedDivision,
          salesRepsCount: allSalesReps.size,
          columnsCount: dataColumnsOnly.length
        });
        
        const response = await fetch('http://localhost:3001/api/sales-rep-divisional-ultra-fast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division: selectedDivision,
            salesReps: Array.from(allSalesReps),
            columns: dataColumnsOnly.map(column => ({
              year: column.year,
              month: column.month,
              type: column.type || 'Actual',
              columnKey: getColumnKey(column)
            }))
          })
        });
        
        console.log('🚀 ULTRA-FAST API response status:', response.status);

        const result = await response.json();
        
        console.log('🚀 ULTRA-FAST API result:', result);
        console.log('🚀 ULTRA-FAST data keys:', Object.keys(result.data || {}));
        const sampleEntries = Object.entries(result.data || {}).slice(0, 3);
        console.log('🚀 ULTRA-FAST sample data:', sampleEntries);
        sampleEntries.forEach(([salesRep, data]) => {
          console.log(`   - ${salesRep}:`, data);
        });
        
        if (result.success && result.data) {
          // Process the ultra-fast response
          const ultraFastData = result.data;
          
          // Organize data by column and entity
          dataColumnsOnly.forEach(column => {
            const columnKey = getColumnKey(column);
            salesRepDataMap[columnKey] = {};
            
            displayEntities.forEach(entityName => {
              const members = Array.isArray(groups[entityName]) && groups[entityName].length > 0
                ? groups[entityName]
                : [entityName];
              
              // Sum across all members of the group
              let groupTotal = 0;
              members.forEach(member => {
                const memberData = ultraFastData[member]?.[columnKey];
                if (memberData && typeof memberData === 'number') {
                  groupTotal += memberData;
                }
              });
              
              if (entityName === 'Sojy & Direct Sales' && columnKey.includes('2025-HY1')) {
                console.log(`🔍 Processing "${entityName}" for ${columnKey}:`, {
                  members,
                  groupTotal,
                  memberDetails: members.map(m => ({
                    name: m,
                    data: ultraFastData[m]?.[columnKey],
                    fullData: ultraFastData[m]
                  }))
                });
              }
              
              salesRepDataMap[columnKey][entityName] = { sales: groupTotal };
            });
          });
        } else {
          throw new Error(result.message || 'Ultra-fast API call failed');
        }
      } catch (err) {
        console.error('Ultra-fast API call failed, falling back to batch calls:', err);
        
        // Fallback to original approach if batch API fails
        const dataPromises = displayEntities.map(async (entityName) => {
          const salesRepData = {};
          const members = Array.isArray(groups[entityName]) && groups[entityName].length > 0
            ? groups[entityName]
            : [entityName];
          
          for (const column of dataColumnsOnly) {
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
              const monthMap = { 'January':1,'February':2,'March':3,'April':4,'May':5,'June':6,'July':7,'August':8,'September':9,'October':10,'November':11,'December':12 };
              months = [monthMap[column.month] || 1];
            }
            
            try {
              let groupTotal = 0;
              for (const member of members) {
                const response = await fetch('http://localhost:3001/api/sales-by-customer-db', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    division: selectedDivision,
                    salesRep: member,
                    year: column.year,
                    months,
                    dataType: column.type || 'Actual'
                  })
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                  groupTotal += result.data.reduce((sum, customer) => sum + (customer.value || 0), 0);
                }
              }
              salesRepData[getColumnKey(column)] = { sales: groupTotal };
            } catch (err) {
              console.warn(`Error fetching data for entity ${entityName}, period ${column.year}-${column.month}-${column.type}:`, err);
              salesRepData[getColumnKey(column)] = { sales: 0 };
            }
          }
          
          return { salesRep: entityName, data: salesRepData };
        });
        
        const results = await Promise.all(dataPromises);
        
        // Organize fallback data by column
        dataColumnsOnly.forEach(column => {
          const columnKey = getColumnKey(column);
          salesRepDataMap[columnKey] = {};
          
          results.forEach(({ salesRep, data }) => {
            salesRepDataMap[columnKey][salesRep] = data[columnKey] || { sales: 0 };
          });
        });
      }
      
      setSalesRepData(salesRepDataMap);
      
    } catch (err) {
      console.error('Error fetching sales rep data:', err);
      setError('Failed to fetch sales rep data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [dataGenerated, selectedDivision, columnsKey, dataColumnsOnly]);

  // Load data when dependencies change
  useEffect(() => {
    fetchSalesRepData();
  }, [fetchSalesRepData]);

  // Get sales rep value for a specific column
  const getSalesRepValue = useCallback((salesRep, column) => {
    const key = getColumnKey(column);
    const columnData = salesRepData[key];
    if (!columnData || !columnData[salesRep]) return 0;
    return columnData[salesRep].sales || 0;
  }, [salesRepData]);

  // Calculate delta between two values
  const calculateDelta = (newerValue, olderValue) => {
    if (olderValue === 0) {
      return newerValue > 0 ? 100 : newerValue < 0 ? -100 : 0;
    }
    return ((newerValue - olderValue) / Math.abs(olderValue)) * 100;
  };

  // Format delta for display
  const formatDelta = (delta) => {
    if (isNaN(delta)) return '—';
    if (delta === 0) return '0.0%';
    const sign = delta > 0 ? '+' : '';
    const formatted = Math.abs(delta) >= 100 ? Math.round(delta) : delta.toFixed(1);
    return `${sign}${formatted}%`;
  };

  // Format percentage for display
  const formatPercentage = (percentage) => {
    if (isNaN(percentage) || percentage === null || percentage === undefined) return '0.0%';
    return `${percentage.toFixed(1)}%`;
  };

  // Get delta color
  const getDeltaColor = (delta) => {
    if (isNaN(delta)) return '#666666';
    if (delta === 'NEW') return '#28a745'; // Green for new data
    if (delta === 0) return '#666666'; // Gray for no change
    return delta > 0 ? '#0066cc' : '#cc0000'; // Blue for positive, red for negative
  };

  // Color schemes for different periods
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

  // Check if column is base period (unused but kept for potential future use)
  // const isBasePeriodColumn = (dataIdx) => {
  //   return dataIdx === effectiveBasePeriodIndex;
  // };

  // Sort sales reps by base period value (descending) and filter out those below 5000 or negative
  const sortedSalesReps = useMemo(() => {
    if (dataColumnsOnly.length === 0) return salesReps;
    
    const baseColumn = dataColumnsOnly[effectiveBasePeriodIndex];
    if (!baseColumn) return salesReps;
    
    // Filter out sales reps with total below 5000 or negative
    const filteredSalesReps = salesReps.filter(salesRep => {
      const totalValue = getSalesRepValue(salesRep, baseColumn);
      return totalValue >= 5000; // Only show if total is 5000 or above
    });
    
    return filteredSalesReps.sort((a, b) => {
      // "Others" should always be at the end
      if (a.toLowerCase().includes('others')) return 1;
      if (b.toLowerCase().includes('others')) return -1;
      
      const valueA = getSalesRepValue(a, baseColumn);
      const valueB = getSalesRepValue(b, baseColumn);
      return valueB - valueA; // Descending order
    });
  }, [salesReps, dataColumnsOnly, effectiveBasePeriodIndex, getSalesRepValue]);

  // Calculate summary data - include ALL sales reps in totals (even hidden ones)
  const summaryData = useMemo(() => {
    const summary = {};
    
    dataColumnsOnly.forEach(column => {
      const key = getColumnKey(column);
      // const columnData = salesRepData[key] || {}; // unused
      
      let totalSales = 0;
      let salesRepsWithData = 0;
      
      // Calculate total for ALL sales reps (including hidden ones) for accurate totals
      salesReps.forEach(salesRep => {
        const value = getSalesRepValue(salesRep, column);
        totalSales += value; // include all (even below threshold) in totals
        if (value > 0) salesRepsWithData++;
      });
      
      summary[key] = {
        totalSales,
        salesRepsWithData
      };
    });
    
    return { summary };
  }, [dataColumnsOnly, getSalesRepValue, salesReps]);

  if (loading) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Sales Rep - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <div className="loading-spinner"></div>
          <p>⚡ Loading sales rep data with ultra-fast optimization...</p>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Using single SQL query for maximum performance
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Sales Rep - {selectedDivision}</h2>
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
          <h2>Sales by Sales Rep - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', marginBottom: '20px' }}>🚧 Coming Soon</h3>
            <p style={{ color: '#888', fontSize: '16px' }}>
              Sales by Sales Rep for {selectedDivision} division is currently under development.
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
          <h2>Sales by Sales Rep - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>Please generate data using the filters to view Sales by Sales Rep.</p>
        </div>
      </div>
    );
  }

  // ---------- render ----------
  return (
    <div className="table-view">
      <div ref={tableRef} className="table-container-for-export">
        <div className="table-title">
          <h2>Sales by Sales Rep - {selectedDivision}</h2>
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
            
            {/* Export Button */}
            <div style={{ marginLeft: '20px' }}>
              <SalesRepHTMLExport 
                reportType="divisional"
                salesReps={salesReps}
                salesRepData={salesRepData}
                yearlyBudgetTotal={0}
                yearlySalesBudgetTotal={0}
                yearlyBudgetAchievement={0}
                yearlySalesBudgetAchievement={0}
                customerInsights={{
                  topCustomerShare: 0,
                  top3CustomerShare: 0,
                  top5CustomerShare: 0,
                  totalCustomers: 0,
                  customerGrowth: 0,
                  newCustomers: [],
                  topCustomers: [],
                  avgVolumePerCustomer: 0
                }}
              />
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="sales-by-customer-table">
            <colgroup>
              <col style={{ width: `${columnWidths.salesRep}%` }}/>
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
                <th className="empty-header" rowSpan="4">Sales Rep</th>
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
              {sortedSalesReps.map((salesRep, salesRepIndex) => {
                const isLastSalesRep = salesRepIndex === sortedSalesReps.length - 1;
                return (
                  <tr key={`salesrep-${salesRepIndex}-${salesRep.replace(/\s+/g, '-')}`}>
                    <td className={`row-label customer-name-cell ${isLastSalesRep ? 'thick-border-bottom' : ''}`} title={salesRep}>
                      {toProperCase(salesRep)}
                    </td>
                    {extendedColumns.map((column, columnIndex) => {
                      if (column.columnType === 'delta') {
                        const fromValue = getSalesRepValue(salesRep, column.fromColumn);
                        const toValue = getSalesRepValue(salesRep, column.toColumn);
                        const delta = calculateDelta(toValue, fromValue);
                        return (
                          <td
                            key={`delta-${columnIndex}`}
                            className={`metric-cell ${isLastSalesRep ? 'thick-border-bottom' : ''}`}
                            style={{
                              backgroundColor: '#f8f9fa',
                              color: getDeltaColor(delta),
                              fontWeight: 'bold',
                              textAlign: 'center',
                              padding: '8px 4px'
                            }}
                          >
                            {formatDelta(delta)}
                          </td>
                        );
                      }
                      
                       const value = getSalesRepValue(salesRep, column);
                       const totalSales = summaryData.summary[getColumnKey(column)]?.totalSales || 0;
                       const percentage = totalSales > 0 ? (value / totalSales) * 100 : 0;
                      
                      return (
                        <React.Fragment key={`data-${columnIndex}`}>
                          <td
                            className={`metric-cell ${isLastSalesRep ? 'thick-border-bottom' : ''}`}
                            style={{
                              backgroundColor: getCellBackgroundColor(column),
                              textAlign: 'right',
                              padding: '8px 4px'
                            }}
                            >
                             {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </td>
                            <td
                              className={`metric-cell ${isLastSalesRep ? 'thick-border-bottom' : ''}`}
                              style={{
                                backgroundColor: getCellBackgroundColor(column),
                                textAlign: 'right',
                                padding: '8px 4px'
                              }}
                            >
                             {formatPercentage(percentage)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Summary rows */}
              {summaryData.summary && Object.keys(summaryData.summary).length > 0 && (
                <>
                  <tr>
                    <td className="row-label summary-label total-sales-label" style={{ backgroundColor: '#0D47A1', color: 'white', fontWeight: 'bold' }}>
                      Total Sales
                    </td>
                    {extendedColumns.map((column, idx) => {
                      if (column.columnType === 'delta') {
                        const fromKey = getColumnKey(column.fromColumn);
                        const toKey = getColumnKey(column.toColumn);
                        const fromData = summaryData.summary[fromKey];
                        const toData = summaryData.summary[toKey];
                        const fromTotal = fromData?.totalSales || 0;
                        const toTotal = toData?.totalSales || 0;
                        const delta = calculateDelta(toTotal, fromTotal);
                        return (
                          <td key={`total-delta-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}>
                            {formatDelta(delta)}
                          </td>
                        );
                      }
                      const key = getColumnKey(column);
                      const data = summaryData.summary[key];
                      return (
                        <td key={`total-${idx}`} className="metric-cell summary-cell" style={{ backgroundColor: '#0D47A1', color: 'white', fontWeight: 'bold' }} colSpan={2}>
                          {(data?.totalSales || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
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

export default SalesBySalesRepDivisional;