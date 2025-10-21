import React, { useRef, useState, useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { useExcelData } from '../../contexts/ExcelDataContext';
import './SalesByCountryTable.css';

const SalesByCountryTable = () => {
  const { columnOrder, dataGenerated } = useFilter();
  
  // Read selected division from global context (dashboard radio buttons)
  const { selectedDivision } = useExcelData();
  const tableRef = useRef(null);

  // Load UAE Dirham symbol font
  useEffect(() => {
    // Check if style already exists to prevent duplicates
    const existingStyle = document.getElementById('uae-symbol-style');
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.id = 'uae-symbol-style';
    style.textContent = `
      @font-face {
        font-family: 'UAESymbol';
        src: url('/assets/font.woff2') format('woff2'),
             url('/assets/font.woff') format('woff'),
             url('/assets/font.ttf') format('truetype');
      }
      .uae-symbol {
        font-family: 'UAESymbol', sans-serif;
        margin-right: 5px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const styleToRemove = document.getElementById('uae-symbol-style');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  // State for hiding Budget/Forecast columns
  const [hideBudgetForecast, setHideBudgetForecast] = useState(false);
  
  // State for database data
  const [countries, setCountries] = useState([]);
  const [countryData, setCountryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Base period index (from standard-config)
  const [basePeriodIndex, setBasePeriodIndex] = useState(null);

  // Create extended columns with delta columns, with optional Budget/Forecast filtering
  const createExtendedColumns = () => {
    // Filter columns based on user preferences
    const filteredColumns = columnOrder.filter(col => {
      if (hideBudgetForecast && (col.type === 'Budget' || col.type === 'Forecast')) return false;
      return true;
    });
    
    const extendedColumns = [];
    
    filteredColumns.forEach((col, index) => {
      extendedColumns.push(col);
      
      // Add delta column after each period (except the last one)
      if (index < filteredColumns.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          fromColumn: col,
          toColumn: filteredColumns[index + 1]
        });
      }
    });
    
    return extendedColumns;
  };

  const extendedColumns = createExtendedColumns();

  // Calculate optimal column widths based on number of periods
  const calculateColumnWidths = () => {
    const dataColumns = extendedColumns.filter(c => c.columnType !== 'delta');
    const deltaColumns = extendedColumns.filter(c => c.columnType === 'delta');
    const totalDataColumns = dataColumns.length;
    const totalDeltaColumns = deltaColumns.length;
    
    // Base widths (in percentages of available space)
    const countryWidth = 20; // 20% for country column
    const availableWidth = 80; // 80% for data columns
    
    // Calculate total columns: each data period = 2 columns (value + %) + delta columns
    const totalColumns = (totalDataColumns * 2) + totalDeltaColumns;
    
    // Dynamic width calculation based on actual column count
    let valueColumnWidth, percentColumnWidth, deltaColumnWidth;
    
    if (totalDataColumns <= 2) {
      // 1-2 periods: wider columns
      valueColumnWidth = (availableWidth / totalColumns) * 1.4; // Wider for values
      percentColumnWidth = (availableWidth / totalColumns) * 0.6; // Narrower for %
      deltaColumnWidth = (availableWidth / totalColumns) * 1.2; // Adequate for delta
    } else if (totalDataColumns <= 3) {
      // 3 periods: balanced columns
      valueColumnWidth = (availableWidth / totalColumns) * 1.3; // Slightly wider for values
      percentColumnWidth = (availableWidth / totalColumns) * 0.7; // Balanced for %
      deltaColumnWidth = (availableWidth / totalColumns) * 1.0; // Balanced for delta
    } else {
      // 4-5 periods: more compact but proportional
      valueColumnWidth = (availableWidth / totalColumns) * 1.2; // Values get priority
      percentColumnWidth = (availableWidth / totalColumns) * 0.8; // Adequate for %
      deltaColumnWidth = (availableWidth / totalColumns) * 1.0; // Adequate for delta
    }
    
    return {
      country: countryWidth,
      value: valueColumnWidth,
      percent: percentColumnWidth,
      delta: deltaColumnWidth
    };
  };

  const columnWidths = calculateColumnWidths();

  // Load base period index once
  React.useEffect(() => {
    const loadBasePeriodIndex = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/standard-config/basePeriodIndex');
        const json = await res.json();
        if (json && json.success) {
          setBasePeriodIndex(json.data);
        }
      } catch (e) {
        // ignore, default no star
      }
    };
    loadBasePeriodIndex();
  }, []);

  // Fetch countries from database
  const fetchCountries = async () => {
    if (!selectedDivision) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch for all divisions (FP, SB, TF, HCM)
      const response = await fetch(`http://localhost:3001/api/countries-db?division=${selectedDivision}`);
      const result = await response.json();
      
      if (result.success) {
        // Extract unique country names (deduplicate)
        const countryNames = [...new Set(result.data.map(item => item.country))];
        setCountries(countryNames);
      } else {
        setError(result.message || 'Failed to load countries');
      }
    } catch (err) {
      setError('Failed to load countries: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales data for a specific period
  const fetchSalesData = async (column) => {
    if (!selectedDivision) return;
    
    // Only fetch data for FP division
    if (selectedDivision !== 'FP') {
      return;
    }
    
    try {
      // Convert column to months array
      let months = [];
    if (column.months && Array.isArray(column.months)) {
        months = column.months;
      } else if (column.month === 'Q1') {
        months = [1, 2, 3];
      } else if (column.month === 'Q2') {
        months = [4, 5, 6];
      } else if (column.month === 'Q3') {
        months = [7, 8, 9];
      } else if (column.month === 'Q4') {
        months = [10, 11, 12];
      } else if (column.month === 'Year') {
        months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      } else if (column.month === 'HY1') {
        months = [1, 2, 3, 4, 5, 6];
      } else if (column.month === 'HY2') {
        months = [7, 8, 9, 10, 11, 12];
      } else {
        // Convert month name to number
        const monthMap = {
          'January': 1, 'February': 2, 'March': 3, 'April': 4,
          'May': 5, 'June': 6, 'July': 7, 'August': 8,
          'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        months = [monthMap[column.month] || 1];
      }

      const response = await fetch('http://localhost:3001/api/sales-by-country-db', {
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

      const result = await response.json();
      
      if (result.success) {
        // Use stable key per period selection (id from standard configs)
        const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
        setCountryData(prev => ({
          ...prev,
          [columnKey]: result.data
        }));
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    }
  };

  // Load countries when division changes
  React.useEffect(() => {
    fetchCountries();
  }, [selectedDivision]);

  // Load sales data when columns change
  React.useEffect(() => {
    if (selectedDivision && columnOrder.length > 0) {
      columnOrder.forEach(column => {
        if (!hideBudgetForecast || (column.type !== 'Budget' && column.type !== 'Forecast')) {
          fetchSalesData(column);
        }
      });
    }
  }, [selectedDivision, columnOrder, hideBudgetForecast]);

  // Color schemes for consistent styling across all tables (EXACT same as Product Group)
  const colorSchemes = [
    { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', light: '#E3F2FD', isDark: true },
    { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', light: '#E8F5E9', isDark: true },
    { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', light: '#FFFDE7', isDark: false },
    { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', light: '#FFF3E0', isDark: false },
    { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#E6EEF5', light: '#E6EEF5', isDark: true }
  ];

  // Function to get column style based on the column configuration (EXACT same as Product Group)
  const getColumnHeaderStyle = (column) => {
    if (!column) {
      return { 
        backgroundColor: '#288cfa', 
        color: '#FFFFFF',
        fontWeight: 'bold'
      };
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
    
    // Default color assignment based on month/type (EXACT same as Product Group)
    if (column.month === 'Q1' || column.month === 'Q2' || column.month === 'Q3' || column.month === 'Q4') {
      // Orange header → dark text
      return { backgroundColor: '#FF6B35', color: '#000000', fontWeight: 'bold' };
    } else if (column.month === 'January') {
      // Yellow header → dark text
      return { backgroundColor: '#FFD700', color: '#000000', fontWeight: 'bold' };
    } else if (column.month === 'Year') {
      return { backgroundColor: '#288cfa', color: '#FFFFFF', fontWeight: 'bold' };
    } else if (column.type === 'Budget') {
      return { backgroundColor: '#2E865F', color: '#FFFFFF', fontWeight: 'bold' };
    }
    
    // Default to blue
    return { backgroundColor: '#288cfa', color: '#FFFFFF', fontWeight: 'bold' };
  };

  // Match Product Group: light background per data column
  const getCellBackgroundColor = (column) => {
    if (column?.customColor) {
      const scheme = colorSchemes.find(s => s.name === column.customColor);
      if (scheme) return scheme.light;
    }
    if (column?.month === 'Q1' || column?.month === 'Q2' || column?.month === 'Q3' || column?.month === 'Q4') {
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

  // Get country sales amount for a specific period
  const getCountrySalesAmount = (countryName, column) => {
    if (!selectedDivision) return 0;
    
    const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
    const columnData = countryData[columnKey] || [];
    
    const countryDataItem = columnData.find(item => 
      item.country.toLowerCase() === countryName.toLowerCase()
    );
    
    return countryDataItem ? countryDataItem.value : 0;
  };

  // Compute percentage of total Amount for the period
  const getCountryValue = (countryName, column) => {
    const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
    const columnData = countryData[columnKey] || [];
    const total = columnData.reduce((sum, item) => sum + (item.value || 0), 0);
    const value = getCountrySalesAmount(countryName, column);
    if (total === 0) return 0;
    return (value / total) * 100;
  };

  // Calculate delta between two periods
  const calculateDelta = (fromValue, toValue) => {
    if (fromValue === 0) return toValue > 0 ? 100 : 0;
    return ((toValue - fromValue) / fromValue) * 100;
  };

  // Format percentage xx.x%
  const formatPercentage = (num) => `${(isNaN(num) ? 0 : num).toFixed(1)}%`;

  // Delta helpers
  const formatDelta = (delta) => {
    if (isNaN(delta) || delta === 0) return '';
    const sign = delta > 0 ? '+' : '';
    const formatted = delta < 0 ? delta.toFixed(1) : (Math.abs(delta) >= 100 ? Math.round(delta) : delta.toFixed(1));
    return `${sign}${formatted}%`;
  };
  const getDeltaColor = (delta) => {
    if (isNaN(delta) || delta === 0) return '#000000';
    return delta > 0 ? '#0066cc' : '#cc0000';
  };

  const getColumnKey = (column) => column.id || `${column.year}-${column.month}-${column.type}`;

  // Compute sorted countries based on base period absolute value (descending)
  const sortedCountries = React.useMemo(() => {
    if (!countries || countries.length === 0) return [];
    
    // Get filtered data columns (excluding delta columns)
    const dataColumnsOnly = extendedColumns.filter(c => c.columnType !== 'delta');
    
    // Determine the effective base period index
    let effectiveBasePeriodIndex = basePeriodIndex;
    
    // If base period index is invalid or out of range, use the first available period
    if (effectiveBasePeriodIndex === null || effectiveBasePeriodIndex < 0 || effectiveBasePeriodIndex >= dataColumnsOnly.length) {
      effectiveBasePeriodIndex = 0; // Default to first period
    }
    
    // Ensure we have at least one data column to sort by
    if (dataColumnsOnly.length === 0) {
      return countries;
    }
    
    const baseColumn = dataColumnsOnly[effectiveBasePeriodIndex];
    const baseKey = getColumnKey(baseColumn);
    const colData = countryData[baseKey] || [];
    const countryToAmount = new Map(colData.map(item => [item.country?.toLowerCase?.() || '', item.value || 0]));
    
    const sorted = [...countries].sort((a, b) => {
      const av = countryToAmount.get(a.toLowerCase()) || 0;
      const bv = countryToAmount.get(b.toLowerCase()) || 0;
      return bv - av; // Sort descending (highest values first)
    });
    
    // Debug logging removed for production
    
    return sorted;
  }, [countries, extendedColumns, basePeriodIndex, countryData]);

  // Show loading state
  if (loading) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Country - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>Loading data from database...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Country - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  // Show "Coming Soon" for non-FP divisions
  if (selectedDivision !== 'FP') {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Country - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', marginBottom: '20px' }}>🚧 Coming Soon</h3>
            <p style={{ color: '#888', fontSize: '16px' }}>
              Sales by Country for {selectedDivision} division is currently under development.
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
              The database table <code>{selectedDivision.toLowerCase()}_data_excel</code> has been created and is ready for data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no data generated or no columns
  if (!dataGenerated || columnOrder.length === 0) {
    return (
      <div className="table-view">
        <div className="table-title">
          <h2>Sales by Country - {selectedDivision}</h2>
        </div>
        <div className="table-empty-state">
          <p>Please generate data using the filters to view Sales by Country.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-view">
      <div ref={tableRef} className="table-container-for-export">
        <div className="table-title">
          <h2>Sales by Country - {selectedDivision}</h2>
          <div className="table-subtitle">(<span className="uae-symbol">&#x00EA;</span>)</div>
          <div className="table-options">
            <label className="option-checkbox">
              <input 
                type="checkbox" 
                checked={hideBudgetForecast} 
                onChange={(e) => setHideBudgetForecast(e.target.checked)}
              />
              Hide Budget & Forecast
            </label>
          </div>
        </div>
        <div className="table-container">
          <table className="sales-by-country-table">
          {/* Column Groups for dynamic width control */}
          <colgroup>
            <col style={{ width: `${columnWidths.country}%` }}/>
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
              {/* Star row indicating base period */}
              <tr>
                <th className="empty-header star-cell"></th>
                {(() => {
                  // Render a cell above each data column pair; empty above delta
                  let dataIdx = 0;
                  return extendedColumns.map((col, index) => {
                    if (col.columnType === 'delta') {
                      return (
                        <th key={`star-delta-${index}`} className="star-cell"></th>
                      );
                    }
                    const isBase = basePeriodIndex !== null && dataIdx === basePeriodIndex;
                    const cell = (
                      <th key={`star-${index}`} colSpan={2} className="star-cell" style={{ color: isBase ? '#FFD700' : '#ffffff', fontSize: '28px' }}>
                        {isBase ? '★' : '★'}
                      </th>
                    );
                    dataIdx += 1;
                    return cell;
                  });
                })()}
              </tr>
              <tr className="main-header-row">
                <th className="empty-header" rowSpan="4">Country</th>
              {extendedColumns.map((col, index) => (
                col.columnType === 'delta' ? (
                    <th key={`delta-year-${index}`} rowSpan="4" style={{ backgroundColor: '#f8f9fa', color: '#000', fontWeight: 'bold' }}>Δ</th>
                ) : (
                  <th
                    key={`year-${index}`}
                    style={getColumnHeaderStyle(col)}
                    colSpan={2}
                  >
                    {col.year}
                  </th>
                )
              ))}
            </tr>
            <tr>
              {extendedColumns.map((col, index) => (
                col.columnType === 'delta' ? null : (
                  <th
                    key={`month-${index}`}
                    style={getColumnHeaderStyle(col)}
                    colSpan={2}
                  >
                      {col.month}
                  </th>
                )
              )).filter(Boolean)}
            </tr>
            <tr>
              {extendedColumns.map((col, index) => (
                col.columnType === 'delta' ? null : (
                  <th 
                    key={`type-${index}`}
                    style={getColumnHeaderStyle(col)}
                    colSpan={2}
                  >
                    {col.type}
                  </th>
                )
              )).filter(Boolean)}
            </tr>
            <tr>
              {extendedColumns.map((col, index) => (
                col.columnType === 'delta' ? null : (
                  <React.Fragment key={`fragment-${index}`}>
                    <th style={{ backgroundColor: getCellBackgroundColor(col), color: '#000', fontWeight: 'bold' }}>Values</th>
                    <th style={{ backgroundColor: getCellBackgroundColor(col), color: '#000', fontWeight: 'bold' }}>%</th>
                  </React.Fragment>
                )
              )).filter(Boolean)}
            </tr>
          </thead>
            <tbody>
              {sortedCountries.map((country, countryIndex) => (
                <tr key={`country-${countryIndex}-${country.replace(/\s+/g, '-')}`}>
                  <td className="row-label">{country}</td>
                  {extendedColumns.map((column, columnIndex) => {
                    if (column.columnType === 'delta') {
                      const fromValue = getCountryValue(country, column.fromColumn);
                      const toValue = getCountryValue(country, column.toColumn);
                      const delta = calculateDelta(fromValue, toValue);
                      
                    return (
                        <td key={columnIndex} className="metric-cell" style={{ backgroundColor: '#f8f9fa', color: getDeltaColor(delta), fontWeight: 'bold' }}>
                          {formatDelta(delta)}
                      </td>
                    );
                  } else {
                      const percentage = getCountryValue(country, column);
                    // render Values and % cells for each data column
                    const columnKey = getColumnKey(column);
                    const columnData = countryData[columnKey] || [];
                    const absolute = (columnData.find(item => item.country.toLowerCase() === country.toLowerCase())?.value) || 0;
                    return (
                      <React.Fragment key={`data-fragment-${columnIndex}`}>
                        <td className="metric-cell" style={{ backgroundColor: getCellBackgroundColor(column) }}>
                          {absolute.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="metric-cell" style={{ backgroundColor: getCellBackgroundColor(column) }}>
                          {formatPercentage(percentage)}
                      </td>
                      </React.Fragment>
                    );
                  }
                })}
              </tr>
            ))}
            {/* Totals row per period (percentage) */}
            {(() => {
              const totalsPct = {};
              const dataColumns = extendedColumns.filter(c => c.columnType !== 'delta');
              dataColumns.forEach(col => {
                const key = getColumnKey(col);
                const sumPct = countries.reduce((sum, country) => sum + getCountryValue(country, col), 0);
                totalsPct[key] = sumPct;
              });
              const totalRowBg = '#E6EEF5';
              return (
                <tr>
                  <td className="row-label total-label">Total</td>
                  {extendedColumns.map((column, idx) => {
                    if (column.columnType === 'delta') {
                      const fromKey = getColumnKey(column.fromColumn);
                      const toKey = getColumnKey(column.toColumn);
                      
                      // Calculate total absolute amounts for each period
                      const fromColumnData = countryData[fromKey] || [];
                      const toColumnData = countryData[toKey] || [];
                      const fromTotalAmount = fromColumnData.reduce((sum, item) => sum + (item.value || 0), 0);
                      const toTotalAmount = toColumnData.reduce((sum, item) => sum + (item.value || 0), 0);
                      
                      // Calculate delta based on absolute amounts (same as individual countries)
                      const delta = calculateDelta(fromTotalAmount, toTotalAmount);
                      return (
                        <td key={`total-delta-${idx}`} className="metric-cell total-cell" style={{ color: getDeltaColor(delta) }}>
                          {formatDelta(delta)}
                        </td>
                      );
                    }
                    const key = getColumnKey(column);
                    const columnData = countryData[key] || [];
                    const totalAmount = columnData.reduce((sum, item) => sum + (item.value || 0), 0);
                    const totalPct = totalsPct[key] || 0;
                    return (
                      <React.Fragment key={`total-fragment-${idx}`}>
                        <td className="metric-cell total-cell">
                          {totalAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="metric-cell total-cell">
                          {formatPercentage(totalPct)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};

export default SalesByCountryTable; 