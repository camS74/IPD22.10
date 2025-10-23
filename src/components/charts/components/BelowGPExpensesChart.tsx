import React from 'react';
import ReactECharts from 'echarts-for-react';
import UAEDirhamSymbol from '../../dashboard/UAEDirhamSymbol';

// Helper function to get UAE symbol as data URL for ECharts rich text
const getUAESymbolImageDataURL = (color = '#222') => {
  const svg = `<svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

// Below Gross Profit Expenses ledger items and their positions
// These need to match the actual row positions in your table data
const BELOW_GP_LEDGERS = {
  SELLING_EXPENSES: { label: 'Selling expenses', rowIndex: 31 },
  TRANSPORTATION: { label: 'Transportation', rowIndex: 32 },
  ADMINISTRATION: { label: 'Administration', rowIndex: 40 },
  BANK_INTEREST: { label: 'Bank interest', rowIndex: 42 },
  TOTAL_BELOW_GP_EXPENSES: { label: 'Total Below GP Expenses', rowIndex: 52 },
};

// Color scheme definitions (MUST MATCH ColumnConfigGrid.js exactly)
const colorSchemes = [
  { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
  { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
  { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
  { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
  { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
];

// Default fallback colors in order
const defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];

// Get all ledger items except the total
const ledgerItems = Object.values(BELOW_GP_LEDGERS).filter(item => 
  item !== BELOW_GP_LEDGERS.TOTAL_BELOW_GP_EXPENSES);

// Add a simple helper to format values in the way that matches your screenshot
const formatAsReadableNumber = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '0.00';
  
  // Convert to string with 2 decimal places
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getDynamicFontSize = (periodCount: number) => {
  if (periodCount <= 2) return 14;
  if (periodCount <= 4) return 12;
  return 10;
};

const BelowGPExpensesChart = ({ tableData, selectedPeriods, computeCellValue, style }) => {
  // If no periods selected or no compute function, show empty state
  if (!selectedPeriods || selectedPeriods.length === 0 || typeof computeCellValue !== 'function') {
    console.error('BelowGPExpensesChart: Missing required props');
    
    return (
      <div className="modern-margin-gauge-panel" style={{ marginTop: 60, padding: 20, textAlign: 'center' }}>
        <h2 className="modern-gauge-heading">Below Gross Profit Expenses</h2>
        <p>No data available. Please select a period.</p>
      </div>
    );
  }

  // Limit to 5 periods max
  const periodsToUse = selectedPeriods.slice(0, 5);
  const dynamicFontSize = getDynamicFontSize(periodsToUse.length);




  // Extract data for all ledgers across all periods
  const ledgersData = {};
  const periodTotals = {};

  // Initialize data structure
  ledgerItems.forEach(ledger => {
    ledgersData[ledger.label] = { label: ledger.label, values: {} };
  });

  // Process each period
  periodsToUse.forEach((period, periodIndex) => {
    try {
      // Create a readable period name 
      const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
      let periodTotal = 0;

      // Process each ledger for this period
      ledgerItems.forEach(ledger => {
        try {
          // Get the base amount - using the default behavior
          const amount = computeCellValue(ledger.rowIndex, period);
          
          // Get values needed for calculations
          // Row 3 is Sales
          const salesValue = computeCellValue(3, period);
          // Row 7 is Sales Volume (kg)
          const salesVolumeValue = computeCellValue(7, period);
          

          
          // Calculate percent of sales exactly as in TableView.js
          let percentOfSales = 0;
          if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
            percentOfSales = (amount / salesValue) * 100;
          }
          
          // Calculate per kg value exactly as in TableView.js
          let perKgValue = 0;
          if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
            perKgValue = amount / salesVolumeValue;
          }
          


          // Store the values in our data structure
          const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
          const validPercentOfSales = typeof percentOfSales === 'number' && !isNaN(percentOfSales) ? percentOfSales : 0;
          const validPerKg = typeof perKgValue === 'number' && !isNaN(perKgValue) ? perKgValue : 0;
          
          ledgersData[ledger.label].values[periodName] = {
            amount: validAmount,
            percentOfSales: validPercentOfSales,
            perKg: validPerKg
          };
          
          // Add to period totals
          periodTotal += validAmount;
        } catch (err) {
          console.error(`Error extracting data for ${ledger.label} in period ${periodName}:`, err);
          ledgersData[ledger.label].values[periodName] = {
            amount: 0,
            percentOfSales: 0,
            perKg: 0
          };
        }
      });

      // Store the totals for this period
      periodTotals[periodName] = {
        amount: periodTotal,
        percentOfSales: 0,
        perKg: 0
      };

      // Also get the actual totals from the dedicated row
      try {
        const actualTotal = computeCellValue(BELOW_GP_LEDGERS.TOTAL_BELOW_GP_EXPENSES.rowIndex, period);
        
        // Get values needed for calculations
        // Row 3 is Sales
        const salesValue = computeCellValue(3, period);
        // Row 7 is Sales Volume (kg)
        const salesVolumeValue = computeCellValue(7, period);
        
        // Calculate percent of sales for the total
        let totalPercentOfSales = 0;
        if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
          totalPercentOfSales = (actualTotal / salesValue) * 100;
        }
        
        // Calculate per kg value for the total
        let totalPerKgValue = 0;
        if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
          totalPerKgValue = actualTotal / salesVolumeValue;
        }
        

        
        // Use the actual values if available, otherwise use our calculated ones
        if (typeof actualTotal === 'number' && !isNaN(actualTotal)) {
          periodTotals[periodName].amount = actualTotal;
        }
        periodTotals[periodName].percentOfSales = totalPercentOfSales;
        periodTotals[periodName].perKg = totalPerKgValue;
      } catch (err) {
        console.error(`Error getting totals for period ${periodName}:`, err);
      }
    } catch (err) {
      console.error(`Error processing period ${period.year} ${period.month} ${period.type}:`, err);
    }
  });

  // Sort ledgers by the average amount across periods (descending)
  const ledgersList = Object.values(ledgersData);
  ledgersList.sort((a, b) => {
    const aAvg = Object.values(a.values).reduce((sum, val) => sum + (val.amount || 0), 0) / Object.values(a.values).length;
    const bAvg = Object.values(b.values).reduce((sum, val) => sum + (val.amount || 0), 0) / Object.values(b.values).length;
    return bAvg - aAvg;
  });

  // Get sorted labels and period names
  const ledgerLabels = ledgersList.map(ledger => ledger.label);
  const periodNames = periodsToUse.map(period => 
    `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`
  );

  // Prepare series for each period
  const series = periodsToUse.map((period, index) => {
    const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
    
    // Get color based on period's customColor or fallback to default (same as other components)
    let color;
    if (period.customColor) {
      const scheme = colorSchemes.find(s => s.name === period.customColor);
      if (scheme) {
        color = scheme.primary;
      }
    } else {
      // Default color assignment based on month/type (same as tables)
      if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
        color = '#FF6B35'; // Orange (light red)
      } else if (period.month === 'January') {
        color = '#FFD700'; // Yellow
      } else if (period.month === 'Year') {
        color = '#288cfa'; // Blue
      } else if (period.type === 'Budget') {
        color = '#2E865F'; // Green
    } else {
      color = defaultColors[index % defaultColors.length];
      }
    }
    
    // Function to determine if a color is dark (for text contrast)
    const isColorDark = (hexColor) => {
      // Convert hex to RGB
      const r = parseInt(hexColor.substring(1, 3), 16);
      const g = parseInt(hexColor.substring(3, 5), 16);
      const b = parseInt(hexColor.substring(5, 7), 16);
      // Calculate brightness (perceived luminance)
      return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
    };
    
    // Determine text color based on background color
    const textColor = isColorDark(color) ? '#fff' : '#333';
    
    return {
      name: periodName,
      type: 'bar',
      stack: 'total',
      hoverLayerThreshold: Infinity, // Disable hover layer
      label: {
        show: true,
        position: 'inside',
        formatter: params => {
          // Show all metrics - amount, % of sales, and per kg
          const data = ledgersList.find(l => l.label === params.name)?.values[periodName];
          if (!data) return '';

          // Format values with appropriate precision
          const millionsValue = (data.amount / 1000000).toFixed(2);
          const percentValue = data.percentOfSales.toFixed(1);
          const perKgValue = data.perKg.toFixed(1);

          return '{uae|} ' + millionsValue + 'M\n\n' + percentValue + '%/Sls\n\n{uae|} ' + perKgValue + '/kg';
        },
        fontSize: dynamicFontSize,
        fontWeight: 'bold',
        color: textColor,
        backgroundColor: 'transparent',
        padding: [2, 4],
        borderRadius: 0,
        textBorderWidth: 0,
        shadowBlur: 0,
        lineHeight: 12,
        align: 'center',
        verticalAlign: 'middle',
        rich: {
          uae: {
            width: 10,
            height: 10,
            lineHeight: 12,
            padding: [-1, 2, 0, 0],
            align: 'center',
            verticalAlign: 'top',
            backgroundColor: {
              image: getUAESymbolImageDataURL(textColor)
            }
          }
        }
      },
      emphasis: {
        focus: 'series',
        blurScope: 'coordinateSystem',
        label: {
          fontSize: 11,
          fontWeight: 'bold'
        }
      },
      data: ledgerLabels.map(label => {
        const ledger = ledgersList.find(l => l.label === label);
        return ledger?.values[periodName]?.amount || 0;
      }),
      itemStyle: {
        color: color,
        borderRadius: [0, 2, 2, 0]
      },
      barWidth: '80%',
      barGap: '20%',
      barCategoryGap: '30%'
    };
  });

  // Format amounts in millions consistently
  const formatMillions = value => {
    return `${(value / 1000000).toFixed(2)}M`;
  };

  // Format percentage values
  const formatPercent = value => {
    return `${(Number(value) || 0).toFixed(1)}%/Sls`;
  };

  // Format per kg values
  const formatPerKg = value => {
    return `${(Number(value) || 0).toFixed(1)} per kg`;
  };

  // Format for tooltip values with bold styling
  const formatTooltipValue = value => {
    const millions = (value / 1000000).toFixed(2);
    return `<span style="font-weight:bold;font-size:14px">${millions}M</span>`;
  };

  // Create ECharts option with improved styling
  const option = {
    tooltip: { trigger: 'none', show: false },
    legend: {
      data: periodNames,
      type: 'scroll',
      top: 0,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666'
      },
      pageIconColor: '#888',
      pageTextStyle: {
        color: '#888'
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '3%', 
      top: '40px',
      containLabel: true
    },
    xAxis: {
      show: true,
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        show: false
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#eee',
          type: 'dashed'
        }
      },
      axisPointer: {
        show: false // Disable axis pointer
      }
    },
    yAxis: {
      type: 'category',
      data: ledgerLabels,
      axisLabel: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#444',
        padding: [0, 20, 0, 0], // Add padding to right side
        formatter: value => {
          // If text is too long, truncate and add ellipsis
          if (value.length > 25) {
            return value.substring(0, 22) + '...';
          }
          return value;
        },
        rich: {
          // Rich text styling for multi-line labels
          a: {
            fontWeight: 'bold',
            fontSize: 13,
            color: '#444',
            lineHeight: 20
          }
        }
      },
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    series: series
  };

  // Format a summary for each period's total
  const renderTotals = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-around', 
        alignItems: 'flex-end', 
        gap: '5px', 
        marginTop: 20,
        marginBottom: 0,
        width: '100%',
      }}>
        {periodsToUse.map((period, idx) => {
          // Move all variable declarations here for each card
          const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
          const totals = periodTotals[periodName] || { amount: 0, percentOfSales: 0, perKg: 0 };
          const formattedMillions = (totals.amount / 1000000).toFixed(2);
          const formattedPercent = totals.percentOfSales.toFixed(1);
          const formattedPerKg = totals.perKg.toFixed(1);
          let color;
          if (period.customColor) {
            const scheme = colorSchemes.find(s => s.name === period.customColor);
            if (scheme) {
              color = scheme.primary;
            }
          } else {
            // Default color assignment based on month/type (same as tables)
            if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
              color = '#FF6B35'; // Orange (light red)
            } else if (period.month === 'January') {
              color = '#FFD700'; // Yellow
            } else if (period.month === 'Year') {
              color = '#288cfa'; // Blue
            } else if (period.type === 'Budget') {
              color = '#2E865F'; // Green
          } else {
            color = defaultColors[idx % defaultColors.length];
            }
          }
          const isColorDark = (hexColor: string) => {
            const r = parseInt(hexColor.substring(1, 3), 16);
            const g = parseInt(hexColor.substring(3, 5), 16);
            const b = parseInt(hexColor.substring(5, 7), 16);
            return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
          };
          const textColor = isColorDark(color) ? '#fff' : '#333';
          return (
            <React.Fragment key={period.year + period.month + period.type}>
              {/* Card */}
              <div style={{
                padding: '12px 10px',
                borderRadius: '6px',
                backgroundColor: color,
                border: `1px solid ${color}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                minWidth: '150px',
                maxWidth: '180px',
                flex: '1',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.07)';
              }}>
                <div style={{ fontSize: 14, color: textColor, fontWeight: 500, marginTop: 8 }}>{periodName}</div>
                <div style={{ fontWeight: 'bold', fontSize: 22, color: textColor, marginTop: 8 }}>
                  <UAEDirhamSymbol style={{ color: textColor, fontSize: 22 }} /> {formattedMillions}M
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  width: '100%',
                  padding: '0 8px',
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: textColor,
                  marginTop: 8
                }}>
                  <div>{formattedPercent}%/Sls</div>
                  <div><UAEDirhamSymbol style={{ color: textColor, fontSize: 12 }} /> {formattedPerKg}/kg</div>
                </div>
              </div>
              {/* Variance badge between cards */}
              {idx < periodsToUse.length - 1 && (() => {
                // Calculate variance vs next card
                const nextPeriod = periodsToUse[idx + 1];
                const nextPeriodName = `${nextPeriod.year} ${nextPeriod.isCustomRange ? nextPeriod.displayName : (nextPeriod.month || '')} ${nextPeriod.type}`;
                const nextTotals = periodTotals[nextPeriodName] || { amount: 0 };
                let variance = null;
                if (totals.amount !== 0) {
                  variance = ((nextTotals.amount - totals.amount) / Math.abs(totals.amount)) * 100;
                }
                let badgeColor = '#888', arrow = '–';
                if (variance !== null && !isNaN(variance)) {
                  if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                  else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                }
                return (
                  <div style={{
                    alignSelf: 'center',
                    margin: '0 2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 40,
                    width: 40,
                    height: 60,
                    justifyContent: 'center',
                  }}>
                    {variance === null || isNaN(variance) ? (
                      <span style={{ color: '#888', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>0%</span>
                    ) : (
                      <>
                        <span style={{ fontSize: 22, fontWeight: 'bold', color: badgeColor, lineHeight: 1 }}>{arrow}</span>
                        <span style={{ fontSize: 18, fontWeight: 'bold', color: badgeColor, lineHeight: 1.1 }}>{Math.abs(variance).toFixed(1)}</span>
                        <span style={{ fontSize: 16, fontWeight: 'bold', color: badgeColor, lineHeight: 1.1 }}>%</span>
                      </>
                    )}
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', minWidth: 0, ...style }}>
      <h2 className="modern-gauge-heading">Below Gross Profit Expenses</h2>
      <ReactECharts
        option={option}
        style={{ width: '100%', minWidth: 0, height: 483 }}
        notMerge={true}
        lazyUpdate={true}
        theme={undefined}
      />
      {renderTotals()}
    </div>
  );
};

export default BelowGPExpensesChart; 