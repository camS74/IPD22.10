import React, { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

// Helper function to load UAE Symbol font
const loadUAESymbolFont = () => {
  if (typeof document === 'undefined') return;
  
  // Check if font is already loaded
  const existingStyle = document.getElementById('uae-symbol-font-style');
  if (existingStyle) return;
  
  // Create and inject font-face style
  const style = document.createElement('style');
  style.id = 'uae-symbol-font-style';
  style.textContent = `
    @font-face {
      font-family: 'UAESymbol';
      src: url('/fonts/font.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    .uae-symbol {
      font-family: 'UAESymbol', sans-serif;
    }
  `;
  document.head.appendChild(style);
};

// Manufacturing cost ledger items and their positions
// These need to match the actual row positions in your table data
const MANUFACTURING_LEDGERS = {
  LABOUR: { label: 'Labour', rowIndex: 9 }, // Updated with correct row index
  DEPRECIATION: { label: 'Depreciation', rowIndex: 10 }, // Updated with correct row index
  ELECTRICITY: { label: 'Electricity', rowIndex: 12 }, // Updated with correct row index  
  OTHER_OVERHEADS: { label: 'Others Mfg. Overheads', rowIndex: 13 }, // Updated with correct row index
  TOTAL_DIRECT_COST: { label: 'Total Actual Direct Cost', rowIndex: 14 }, // Updated with correct row index
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
const ledgerItems = Object.values(MANUFACTURING_LEDGERS).filter(item => 
  item !== MANUFACTURING_LEDGERS.TOTAL_DIRECT_COST);

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

const ManufacturingCostChart = ({ tableData, selectedPeriods, computeCellValue, basePeriod, style }) => {
  // Load UAE Symbol font
  useEffect(() => {
    loadUAESymbolFont();
  }, []);


  // Debug initial props
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    console.group('ManufacturingCostChart - Initial Props');
    console.log('tableData:', tableData);
    console.log('selectedPeriods:', selectedPeriods);
    console.log('computeCellValue function available:', typeof computeCellValue === 'function');
    console.log('Number of selected periods:', selectedPeriods?.length || 0);
    console.log('Style prop:', style);
    console.groupEnd();
    }
  }, [tableData, selectedPeriods, computeCellValue, style]);

  // If no periods selected or no compute function, show empty state
  if (!selectedPeriods || selectedPeriods.length === 0 || typeof computeCellValue !== 'function') {
    if (process.env.NODE_ENV === 'development') {
    console.error('ManufacturingCostChart: Missing required props');
    }
    
    return (
      <div className="modern-margin-gauge-panel" style={{ marginTop: 30, padding: 20, textAlign: 'center' }}>
        <h2 className="modern-gauge-heading">Manufacturing Cost</h2>
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

  // FIRST: Calculate all period names that will be used
  const allPeriodNames = periodsToUse.map(period => {
    const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
    

    
    return periodName;
  });
  


  // Initialize data structure for ALL periods and ledgers
  ledgerItems.forEach(ledger => {
    ledgersData[ledger.label] = { label: ledger.label, values: {} };
    // Initialize ALL periods for this ledger
    allPeriodNames.forEach(periodName => {
      ledgersData[ledger.label].values[periodName] = {
        amount: 0,
        percentOfSales: 0,
        perKg: 0
      };
    });
  });

  // ENSURE ALL PERIODS GET PROCESSED - Initialize all period totals first
  // Initialize all periods in totals
  allPeriodNames.forEach(periodName => {
    periodTotals[periodName] = {
      amount: 0,
      percentOfSales: 0,
      perKg: 0
    };
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
          if (process.env.NODE_ENV === 'development') {
          console.error(`Error extracting data for ${ledger.label} in period ${periodName}:`, err);
          }
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
        const actualTotal = computeCellValue(MANUFACTURING_LEDGERS.TOTAL_DIRECT_COST.rowIndex, period);
        
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
        if (process.env.NODE_ENV === 'development') {
        console.error(`Error getting totals for period ${periodName}:`, err);
        }
      }
    } catch (err) {
      const errorPeriodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
      if (process.env.NODE_ENV === 'development') {
      console.error(`Error processing period ${errorPeriodName}:`, err);
      }
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
  // Use the pre-calculated period names to ensure all 5 periods appear
  const periodNames = allPeriodNames;
  


    // No need for max series logic since we show all labels inside bars

  // Prepare series for each period
  const series = periodsToUse.map((period, index) => {
    const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
    
    // Get color based on period's customColor or fallback to default
    let color;
    if (period.customColor) {
      const scheme = colorSchemes.find(s => s.name === period.customColor);
      if (scheme) {
        color = scheme.primary;
      }
    } else {
      if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
        color = '#FF6B35';
      } else if (period.month === 'January') {
        color = '#FFD700';
      } else if (period.month === 'Year') {
        color = '#288cfa';
      } else if (period.type === 'Budget') {
        color = '#2E865F';
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
          
          return [
            `Đ ${millionsValue}M`,
            '', // Add empty line for spacing
            `${percentValue}%/Sls`,
            '', // Add empty line for spacing
            `Đ ${perKgValue}/kg`
          ].join('\n');
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
        verticalAlign: 'middle'
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
    series: series.map(s => ({
      ...s,
      label: {
        ...s.label,
        fontSize: dynamicFontSize
      }
    }))
  };

  // Helper function to create period key for matching base period
  const createPeriodKey = (period) => {
    if (period.isCustomRange) {
      return `${period.year}-${period.month}-${period.type}`;
    } else {
      return `${period.year}-${period.month || 'Year'}-${period.type}`;
    }
  };

  // Find base period for variance calculation
  const basePeriodObj = basePeriod ? periodsToUse.find(p => createPeriodKey(p) === basePeriod) : null;
  const basePeriodName = basePeriodObj 
    ? `${basePeriodObj.year} ${basePeriodObj.isCustomRange ? basePeriodObj.displayName : (basePeriodObj.month || '')} ${basePeriodObj.type}`
    : null;
  const baseIndex = basePeriodObj ? periodsToUse.findIndex(p => createPeriodKey(p) === createPeriodKey(basePeriodObj)) : -1;
  const baseTotals = basePeriodName ? periodTotals[basePeriodName] : null;
  const baseAmount = baseTotals ? baseTotals.amount : 0;

  // Format a summary for each period's total
  const renderTotals = () => {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-around', 
        marginTop: 20,
        gap: '5px'
      }}>
        {periodsToUse.map((period, index) => {
          const periodName = `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`;
          const totals = periodTotals[periodName] || { amount: 0, percentOfSales: 0, perKg: 0 };
          // Format values with proper decimal places
          const formattedMillions = (totals.amount / 1000000).toFixed(2);
          const formattedPercent = totals.percentOfSales.toFixed(1);
          const formattedPerKg = totals.perKg.toFixed(1);
          // Get color for period (same logic as above)
          let color;
          if (period.customColor) {
            const scheme = colorSchemes.find(s => s.name === period.customColor);
            if (scheme) {
              color = scheme.primary;
            }
          } else {
            if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
              color = '#FF6B35';
            } else if (period.month === 'January') {
              color = '#FFD700';
            } else if (period.month === 'Year') {
              color = '#288cfa';
            } else if (period.type === 'Budget') {
              color = '#2E865F';
            } else {
              color = defaultColors[index % defaultColors.length];
            }
          }
          const isColorDark = (hexColor) => {
            const r = parseInt(hexColor.substring(1, 3), 16);
            const g = parseInt(hexColor.substring(3, 5), 16);
            const b = parseInt(hexColor.substring(5, 7), 16);
            return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
          };
          const textColor = isColorDark(color) ? '#fff' : '#333';
          return (
            <React.Fragment key={periodName}>
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
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
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
                  <span className="uae-symbol">&#x00EA;</span> {formattedMillions}M
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
                  <div><span className="uae-symbol">&#x00EA;</span> {formattedPerKg}/kg</div>
                </div>
              </div>
              {/* Variance badge between cards - sequential period comparison */}
              {index < periodsToUse.length - 1 && (() => {
                // Calculate variance for the NEXT period vs current period
                const nextPeriod = periodsToUse[index + 1];
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
      <h2 className="modern-gauge-heading">Manufacturing Cost</h2>
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

export default ManufacturingCostChart;