import React, { useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import UAEDirhamSymbol from '../dashboard/UAEDirhamSymbol';

const CustomersAmountTable = ({ customerAmountData }) => {
  const { columnOrder, basePeriodIndex } = useFilter();

  // Dispatch event to notify CustomerKeyFacts that amount data is ready
  useEffect(() => {
    if (customerAmountData && customerAmountData.length > 0) {
      window.dispatchEvent(new CustomEvent('customersAmountTable:dataReady', {
        detail: {
          rows: customerAmountData,
          columnOrder: columnOrder
        }
      }));
    }
  }, [customerAmountData, columnOrder]);

  // Helper function to convert text to proper case
  const toProperCase = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to calculate delta display
  const calculateDeltaDisplay = (newerValue, olderValue) => {
    if (typeof newerValue !== 'number' || typeof olderValue !== 'number') {
      return '-';
    }
    
    if (olderValue === 0) {
      return newerValue > 0 ? { arrow: '🆕', value: 'NEW', color: '#059669' } : '-';
    }
    
    const delta = ((newerValue - olderValue) / olderValue) * 100;
    const absDelta = Math.abs(delta);
    
    let arrow, color;
    if (delta > 0) {
      arrow = '▲';
      color = '#059669';
    } else if (delta < 0) {
      arrow = '▼';
      color = '#dc2626';
    } else {
      arrow = '➖';
      color = '#6b7280';
    }
    
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

  // Helper function to build extended columns with delta columns
  const buildExtendedColumns = (columnOrder) => {
    if (!columnOrder || columnOrder.length === 0) return [];
    const extendedColumns = [];
    for (let i = 0; i < columnOrder.length; i++) {
      extendedColumns.push({ ...columnOrder[i], columnType: 'data', dataIndex: i });
      if (i < columnOrder.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          fromDataIndex: i,
          toDataIndex: i + 1,
          year: columnOrder[i].year,
          month: columnOrder[i].month,
          type: 'Δ'
        });
      }
    }
    return extendedColumns;
  };

  // Helper function to format AED amount
  const formatAED = (value) => {
    if (typeof value !== 'number') return '-';
    if (value === 0) return '0';
    const absValue = Math.abs(value);
    if (absValue >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (absValue >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toFixed(0);
  };

  // Helper function to format value for total row
  const formatValueForTotal = (value) => {
    if (typeof value !== 'number') return value || '-';
    if (value === 0) return '0';
    return formatAED(value);
  };

  // Use the customerAmountData prop directly (same as HTML export)
  if (!customerAmountData || customerAmountData.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        <div>No customer amount data available</div>
      </div>
    );
  }
  
  console.log('🔍 CustomersAmountTable rendering with data:', {
    customerCount: customerAmountData.length,
    firstCustomer: customerAmountData[0]?.name,
    firstCustomerValues: customerAmountData[0]?.rawValues,
    isAmountData: customerAmountData[0]?.rawValues?.some(val => val > 1000), // AMOUNT values are typically > 1000
    sampleValues: customerAmountData.slice(0, 3).map(c => ({ name: c.name, values: c.rawValues })),
    // CRITICAL: Check if this is actually AMOUNT or KGS data
    dataTypeCheck: customerAmountData[0]?.rawValues?.map(val => val > 1000 ? 'AMOUNT' : 'KGS').join(', '),
    // COMPARE WITH VOLUME TABLE VALUES
    firstCustomerVolumeValues: customerAmountData[0]?.rawValues,
    // If these values match the volume table exactly, then it's KGS data being passed as AMOUNT
  });

  const extendedColumns = buildExtendedColumns(columnOrder);
  
  // Process customer amount data (EXACT SAME LOGIC AS HTML EXPORT)
  const filteredCustomers = customerAmountData && customerAmountData.length > 0 ? 
    customerAmountData
      .filter(customer => customer.rawValues && customer.rawValues.some(val => val > 0))
      .sort((a, b) => {
        const aValue = a.rawValues[basePeriodIndex] || 0;
        const bValue = b.rawValues[basePeriodIndex] || 0;
        return bValue - aValue; // Sort descending (highest values first)
      }) : [];

  return (
    <div style={{ marginBottom: '40px' }}>
      <h3 style={{ 
        color: '#1e293b', 
        fontSize: '20px', 
        fontWeight: '700', 
        marginBottom: '20px'
      }}>
        Customer Sales - <UAEDirhamSymbol /> Sales Comparison
      </h3>
      
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          background: 'white' 
        }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)', 
              color: 'white' 
            }}>
              <th rowSpan="3" style={{ 
                padding: '12px', 
                textAlign: 'left', 
                border: '1px solid #ddd', 
                fontWeight: '600' 
              }}>
                Customer
              </th>
              {extendedColumns.map((col, index) => {
                if (col.columnType === 'delta') {
                  return (
                    <th key={index} rowSpan="3" style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      border: '1px solid #ddd', 
                      fontWeight: '600',
                      background: 'rgba(255,255,255,0.1)'
                    }}>
                      Δ<br/>%
                    </th>
                  );
                }
                return (
                  <th key={index} style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    border: '1px solid #ddd', 
                    fontWeight: '600' 
                  }}>
                    {col.year}
                  </th>
                );
              })}
            </tr>
            <tr style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)', 
              color: 'white' 
            }}>
              {extendedColumns.map((col, index) => {
                if (col.columnType === 'delta') return null;
                return (
                  <th key={index} style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    border: '1px solid #ddd', 
                    fontWeight: '600' 
                  }}>
                    {col.month}
                  </th>
                );
              })}
            </tr>
            <tr style={{ 
              background: 'linear-gradient(135deg, #059669, #047857)', 
              color: 'white' 
            }}>
              {extendedColumns.map((col, index) => {
                if (col.columnType === 'delta') return null;
                return (
                  <th key={index} style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    border: '1px solid #ddd', 
                    fontWeight: '600' 
                  }}>
                    {col.type}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer, idx) => (
              <tr key={idx} style={{ 
                background: idx % 2 === 0 ? '#f8fafc' : 'white' 
              }}>
                <td style={{ 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  fontWeight: '500',
                  textAlign: 'left'
                }}>
                  {toProperCase(String(customer.name || ''))}
                </td>
                {extendedColumns.map((col, colIdx) => {
                  if (col.columnType === 'delta') {
                    const newerValue = customer.rawValues[col.toDataIndex] || 0;
                    const olderValue = customer.rawValues[col.fromDataIndex] || 0;
                    const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
                    
                    return (
                      <td key={colIdx} style={{ 
                        padding: '10px', 
                        border: '1px solid #ddd', 
                        textAlign: 'center',
                        color: deltaResult.color || '#6b7280'
                      }}>
                        {deltaResult.arrow} {deltaResult.value}
                      </td>
                    );
                  }
                  
                  const value = customer.rawValues[col.dataIndex] || 0;
                  return (
                    <td key={colIdx} style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      textAlign: 'center' 
                    }}>
                      {formatAED(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* Total Row */}
            <tr style={{ 
              background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', 
              fontWeight: '700' 
            }}>
              <td style={{ 
                padding: '10px', 
                border: '1px solid #ddd', 
                fontWeight: '600',
                textAlign: 'left'
              }}>
                Total
              </td>
              {extendedColumns.map((col, colIdx) => {
                if (col.columnType === 'delta') {
                  const totalNewer = filteredCustomers.reduce((sum, customer) => 
                    sum + (customer.rawValues[col.toDataIndex] || 0), 0);
                  const totalOlder = filteredCustomers.reduce((sum, customer) => 
                    sum + (customer.rawValues[col.fromDataIndex] || 0), 0);
                  const deltaResult = calculateDeltaDisplay(totalNewer, totalOlder);
                  
                  return (
                    <td key={colIdx} style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      textAlign: 'center',
                      color: deltaResult.color || '#6b7280'
                    }}>
                      {deltaResult.arrow} {deltaResult.value}
                    </td>
                  );
                }
                
                const total = filteredCustomers.reduce((sum, customer) => 
                  sum + (customer.rawValues[col.dataIndex] || 0), 0);
                return (
                  <td key={colIdx} style={{ 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    textAlign: 'center' 
                  }}>
                    {formatValueForTotal(total)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersAmountTable;