import React, { useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import './ProductGroupsAmountTable.css'; // Using dedicated CSS file

const ProductGroupsAmountTable = ({ amountData, rep }) => {
  const { columnOrder, basePeriodIndex } = useFilter();

  // Add UAE Dirham symbol font
  useEffect(() => {
    const style = document.createElement('style');
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
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Build extended columns structure (similar to SalesBySaleRepTable)
  const buildExtendedColumns = (columnOrder) => {
    if (!columnOrder || columnOrder.length === 0) return [];
    
    const extendedColumns = [];
    
    for (let i = 0; i < columnOrder.length; i++) {
      const col = columnOrder[i];
      extendedColumns.push({
        ...col,
        columnType: 'data',
        dataIndex: i
      });
      
      // Add delta column between consecutive data columns
      if (i < columnOrder.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          fromDataIndex: i,
          toDataIndex: i + 1
        });
      }
    }
    
    return extendedColumns;
  };

  const extendedColumns = buildExtendedColumns(columnOrder);

  // Check if a column is the base period column
  const isBasePeriodColumn = (columnIndex) => {
    if (basePeriodIndex === null) return false;
    const dataColumnIndex = extendedColumns.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
    return dataColumnIndex === basePeriodIndex;
  };

  // Get column header style - REMOVED ALL BACKGROUND COLORS
  const getColumnHeaderStyle = (col) => {
    if (col.type === 'Budget') {
      return { color: '#333' };
    } else if (col.type === 'Forecast') {
      return { color: '#f57c00' };
    } else {
      return { color: '#333' };
    }
  };

  // Enhanced format number for display with better visual presentation for amounts
  const formatValue = (value, includeSymbol = false) => {
    if (typeof value !== 'number') return value || '-';
    
    // Handle zero values
    if (value === 0) return includeSymbol ? <><span className="uae-symbol">&#x00EA;</span>0</> : '0';
    
    const absValue = Math.abs(value);
    let formattedNumber;
    let unit = '';
    
    // Format based on magnitude for better readability (amounts are typically larger)
    if (absValue >= 1000000) {
      formattedNumber = (value / 1000000).toFixed(1);
      unit = 'M';
    } else if (absValue >= 1000) {
      formattedNumber = (value / 1000).toFixed(1);
      unit = 'K';
    } else {
      formattedNumber = value.toFixed(0);
    }
    
    // Add thousands separator for the formatted number
    const parts = formattedNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const finalNumber = parts.join('.');
    
    const result = `${finalNumber}${unit}`;
    
    if (includeSymbol) {
      return <><span className="uae-symbol">&#x00EA;</span>{result}</>;
    }
    
    return result;
  };

  // Calculate column total
  const calculateColumnTotal = (data, columnIndex) => {
    // Map columnIndex to rawValues index (skip delta columns)
    const dataColumnIndex = extendedColumns.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
    
    const total = data.reduce((total, row) => {
      const arr = row.rawValues || row.values;
      if (!arr || dataColumnIndex >= arr.length) {
        return total;
      }
      const value = arr[dataColumnIndex];
      if (typeof value === 'number' && !isNaN(value)) {
        return total + value;
      }
      return total;
    }, 0);
    return total;
  };

  // Enhanced calculate delta for total row with better formatting
  const calculateTotalDelta = (data, fromIndex, toIndex) => {
    const fromTotal = calculateColumnTotal(data, fromIndex);
    const toTotal = calculateColumnTotal(data, toIndex);
    
    if (fromTotal === 0) return { arrow: '➖', value: '➖', color: '#6b7280' };
    
    const delta = ((toTotal - fromTotal) / fromTotal) * 100;
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '➖';
    const color = delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#6b7280';
    
    // Enhanced delta formatting
    const absDelta = Math.abs(delta);
    let formattedValue;
    
    if (absDelta >= 999.9) {
      formattedValue = '999+%';
    } else if (absDelta >= 99.99) {
      formattedValue = Math.round(absDelta) + '%';
    } else if (absDelta >= 10) {
      formattedValue = absDelta.toFixed(1) + '%';
    } else {
      formattedValue = absDelta.toFixed(2) + '%';
    }
    
    return { arrow, value: formattedValue, color };
  };

  // Filter out rows with all zero values
  const filterZeroRows = (data) => {
    return data.filter(row => {
      const hasPositiveValue = extendedColumns.some((col, colIndex) => {
        if (col.columnType === 'data') {
          const val = row.values[colIndex];
          
          if (typeof val === 'string') {
            const numValue = parseFloat(val);
            return !isNaN(numValue) && numValue > 0;
          }
          if (typeof val === 'number') {
            return !isNaN(val) && val > 0;
          }
        }
        return false;
      });
      return hasPositiveValue;
    });
  };

  // Filter out excluded product groups
  const filterExcludedGroups = (data) => {
    return data.filter(row => {
      if (!row.name) return true;
      const name = row.name.toString().trim().toLowerCase();
      // Exclude 'Services Charges' and 'Others' product groups
      return name !== 'services charges' && name !== 'others' && name !== 'other';
    });
  };

  // Render table header
  const renderTableHeader = () => (
    <thead>
      <tr className="main-header-row">
        <th className="product-header" rowSpan={3}>Product Groups</th>
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') {
            return <th key={`delta-${idx}`} rowSpan={3} style={getColumnHeaderStyle({ columnType: 'delta' })} className="delta-header">YoY<br />%</th>;
          }
          return <th key={`year-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.year}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') return null;
          return <th key={`month-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.isCustomRange ? col.displayName : col.month}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') return null;
          return <th key={`type-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.type}</th>;
        })}
      </tr>
    </thead>
  );

  if (!amountData || amountData.length === 0) {
    return (
      <div className="product-groups-amount-table">
        <h3>Product Groups - <span className="uae-symbol">&#x00EA;</span> Sales Comparison</h3>
        <div className="no-data">No data available for {rep}</div>
      </div>
    );
  }

  if (!columnOrder || columnOrder.length === 0) {
    return (
      <div className="product-groups-amount-table">
        <h3>Product Groups - <span className="uae-symbol">&#x00EA;</span> Sales Comparison</h3>
        <div className="no-data">Please select columns to view data.</div>
      </div>
    );
  }

  const filteredData = filterExcludedGroups(filterZeroRows(amountData));

  return (
    <div className="product-groups-amount-table">
      <h3>Product Groups - <span className="uae-symbol">&#x00EA;</span> Sales Comparison</h3>
      <table className="amount-comparison-table">
        {renderTableHeader()}
        <tbody>
          {filteredData.map(pg => (
            <tr key={pg.name} className="product-row">
              <td className="row-label product-name">{pg.name}</td>
              {extendedColumns.map((col, idx) => {
                if (col.columnType === 'delta') {
                  const val = pg.values[idx];
                  if (typeof val === 'object' && val !== null) {
                    // Enhanced object format with better styling
                    const deltaClass = val.arrow === '▲' ? 'delta-up' : val.arrow === '▼' ? 'delta-down' : '';
                    return (
                      <td key={idx} className={`metric-cell delta-cell ${deltaClass}`} style={{ color: val.color }}>
                        <span className="delta-arrow" style={{ fontSize: '12px' }}>{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Enhanced legacy string format with emoji support
                    let deltaClass = '';
                    let displayVal = val;
                    if (val.includes('▲') || val.includes('📈')) {
                      deltaClass = 'delta-up';
                      displayVal = val.replace('📈', '▲');
                    } else if (val.includes('▼') || val.includes('📉')) {
                      deltaClass = 'delta-down';
                      displayVal = val.replace('📉', '▼');
                    }
                    return <td key={idx} className={`metric-cell delta-cell ${deltaClass}`}>{displayVal}</td>;
                  }
                  return <td key={idx} className="metric-cell delta-cell">➖</td>;
                }
                // Use rawValues for data columns, fallback to values for delta columns
                const val = col.dataIndex !== undefined ? (pg.rawValues && pg.rawValues[col.dataIndex] !== undefined ? pg.rawValues[col.dataIndex] : pg.values[idx]) : pg.values[idx];
                return <td key={idx} className="metric-cell">{formatValue(val)}</td>;
              })}
            </tr>
          ))}
          {/* Total Row */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            {extendedColumns.map((col, idx) => {
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(filteredData, fromIndex, toIndex);
                  const deltaClass = delta.arrow === '▲' ? 'delta-up' : delta.arrow === '▼' ? 'delta-down' : '';
                  return (
                    <td key={`total-delta-${idx}`} className={`metric-cell delta-cell ${deltaClass}`} style={{ color: delta.color }}>
                      <span className="delta-arrow" style={{ fontSize: '12px' }}>{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(filteredData, idx);
              return <td key={`total-${idx}`} className="metric-cell total-value">{formatValue(totalValue, true)}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ProductGroupsAmountTable;