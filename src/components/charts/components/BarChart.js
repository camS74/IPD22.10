import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import UAEDirhamSymbol from '../../dashboard/UAEDirhamSymbol';
import './BarChart.css';

// Note: BarChart uses SVG UAEDirhamSymbol component, no font loading needed

// Helper function to get UAE symbol as data URL for ECharts rich text
const getUAESymbolImageDataURL = (color = '#222') => {
  const svg = `<svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

// Color scheme definitions (MUST MATCH ColumnConfigGrid.js exactly)
const colorSchemes = [
  { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
  { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
  { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
  { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
  { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
];
const salesVolumeColor = '#8e44ad'; // purple

// Debounce function to limit frequency of function calls
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// Global reference for chart export
window.mainBarChartInstance = null;

const BarChart = ({ data, periods, basePeriod }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [barPositions, setBarPositions] = useState([]);

  // Helper function to create period key that matches ChartContainer logic
  const createPeriodKey = (period) => {
    if (period.isCustomRange) {
      // For custom ranges, use the month field (which contains the CUSTOM_* ID)
      return `${period.year}-${period.month}-${period.type}`;
    } else {
      // For regular periods, use the standard format
      return `${period.year}-${period.month || 'Year'}-${period.type}`;
    }
  };


  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('BarChart received props:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      sampleData: data ? Object.entries(data).slice(0, 3) : [],
      periods,
      basePeriod,
      periodsLength: periods?.length,
      firstPeriod: periods?.[0],
      lastPeriod: periods?.[periods?.length - 1]
    });
  }

  // Find base period index and value
  const baseIndex = periods.findIndex(
    p => createPeriodKey(p) === basePeriod
  );
  const baseKey = basePeriod;
  const baseValue = data[baseKey]?.sales || 0;

  // Function to initialize chart
  const initChart = () => {
    if (!chartRef.current || !data || !periods || periods.length === 0) return;

    // Dispose previous instance if it exists
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Initializing chart with container dimensions:', {
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight
        });
      }
      
      const myChart = echarts.init(chartRef.current);
      chartInstance.current = myChart;
      
      // Store globally for export access
      window.mainBarChartInstance = myChart;

        if (process.env.NODE_ENV === 'development') {
          console.log('Rendering chart with data:', { data, periods, basePeriod });
        }
        
        const periodLabels = periods.map(period => {
          if (period.isCustomRange) {
            // For custom ranges, use displayName for clean display
            return `${period.year}-${period.displayName}-${period.type}`;
          } else if (period.month) {
            return `${period.year}-${period.month}-${period.type}`;
          }
          return `${period.year}-${period.type}`;
        });
        
        const seriesData = periods.map(period => {
          // Use the same key format as in ChartContainer
          const periodKey = createPeriodKey(period);
          const value = data[periodKey]?.sales || 0;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Period ${periodKey}: ${value}`);
          }
          return value;
        });

      // Sales Volume (row 7)
      const salesVolumeData = periods.map(period => {
        const periodKey = createPeriodKey(period);
        return data[periodKey]?.salesVolume || 0;
      });
        if (process.env.NODE_ENV === 'development') {
          console.log('Chart series data:', seriesData);
        }

      // Calculate % variance for each bar (sequential period comparison)
      const percentVariance = seriesData.map((value, idx) => {
        if (idx === 0) return null; // First period has no previous period to compare
        const prevValue = seriesData[idx - 1];
        if (prevValue === 0) return null;
        const pct = ((value - prevValue) / Math.abs(prevValue)) * 100;
        return pct;
      });

      // Get bar color for each column using the EXACT same logic as other components
      const barColors = periods.map((period, idx) => {
        if (period.customColor) {
          const scheme = colorSchemes.find(s => s.name === period.customColor);
          if (scheme) {
            return scheme.primary;
        }
        }
        
        // Default color assignment based on month/type (same as tables)
        if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
          return '#FF6B35'; // Orange (light red)
        } else if (period.month === 'January') {
          return '#FFD700'; // Yellow
        } else if (period.month === 'Year') {
          return '#288cfa'; // Blue
        } else if (period.type === 'Budget') {
          return '#2E865F'; // Green
        }
        
        // Default to blue
        return '#288cfa';
      });

      // Set option
      myChart.setOption({
        legend: {
          show: false // Disabled since we're not using legend anymore
        },
        grid: {
          left: '0%',
          right: '0%',
          bottom: 140,
          top: 25,
          containLabel: true
        },
    xAxis: {
      type: 'category',
            data: periodLabels,
          position: 'bottom',
            axisLabel: {
              rotate: 0,
            fontWeight: 'bold',
            fontSize: 18,
            color: '#000',
              formatter: function(value) {
                const parts = value.split('-');
                if (parts.length >= 3) {
                  const year = parts[0];
                  // Check if this is a custom range (contains more than 3 parts due to hyphen in displayName)
                  if (parts.length > 3) {
                    // For custom ranges like "2025-Jan-Apr-Actual"
                    // Reconstruct the displayName and type
                    const displayName = parts.slice(1, -1).join('-'); // "Jan-Apr"
                    const type = parts[parts.length - 1]; // "Actual"
                    return `${year}\n${displayName}\n${type}`;
                  } else {
                    // Regular periods like "2025-Q1-Actual"
                    const month = parts[1];
                    const type = parts[2];
                    if (month === 'Year') {
                      return `${year}\n\n${type}`;
                    } else {
                      return `${year}\n${month}\n${type}`;
                    }
                  }
                }
                return value;
              },
              margin: 30,
            },
            axisLine: {
              lineStyle: {
                color: '#000',
                width: 2
              }
            },
            axisTick: {
              alignWithLabel: true,
              length: 4,
              lineStyle: {
                color: '#ccc'
                }
              }
    },
        yAxis: [
          {
      type: 'value',
            show: false,
            scale: true,
            max: function(value) {
              return value.max * 1.15;
              }
      }
        ],
    series: [
      {
            name: '',
              data: seriesData,
        type: 'bar',
        barMaxWidth: '80%',
        barWidth: '80%',
        barCategoryGap: '0%',
        itemStyle: {
                color: function(params) {
                return barColors[params.dataIndex];
        }
      },
              label: {
                show: true,
                position: 'top',
              fontWeight: 'bold',
              fontSize: 18,
              color: '#222',
                formatter: function(params) {
                  const value = params.value;
                  if (value >= 1000000) {
                    const millions = (value / 1000000).toFixed(1);
                    return '{uae|} {num|' + millions + 'M}';
                  } else if (value >= 1000) {
                    const thousands = (value / 1000).toFixed(1);
                    return '{uae|} {num|' + thousands + 'K}';
                  }
                  return '{uae|} {num|' + value + '}';
                },
                rich: {
                  uae: {
                    width: 16,
                    height: 16,
                    lineHeight: 18,
                    padding: [-2, 4, 0, 0],
                    align: 'center',
                    verticalAlign: 'top',
                    backgroundColor: {
                      image: getUAESymbolImageDataURL('#222')
                    }
                  },
                  num: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#222',
                    verticalAlign: 'middle',
                    lineHeight: 18
                  }
                }
            },
            emphasis: {
              focus: 'series'
            },
            z: 2
          },
      // Custom % variance above each bar
      {
        name: 'Percent Difference',
        type: 'custom',
        renderItem: function(params, api) {
          const idx = api.value(0);
          const value = api.value(1);
          const pct = percentVariance[idx];
          if (pct === null || pct === undefined) return null;
          let color = '#888';
          if (pct > 0) color = '#2E865F';
          else if (pct < 0) color = '#dc3545';
          const x = api.coord([idx, value])[0];
          const y = api.coord([idx, value])[1];
          return {
            type: 'text',
            style: {
              text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
              fill: color,
              font: 'bold 16px sans-serif',
              textAlign: 'center',
              textVerticalAlign: 'bottom',
            },
            position: [x, y - 36],
          };
        },
        data: periods.map((_, idx) => [idx, seriesData[idx]]),
        z: 3
      },
        ],
        tooltip: {
          show: false, // Completely disable tooltips to prevent white panel
          trigger: 'none'
        },
        animation: false
      });

      // Force resize immediately and after a delay
      myChart.resize();
      setTimeout(() => {
        if (myChart && !myChart.isDisposed()) {
        myChart.resize();
        }
      }, 300);
      } catch (error) {
        console.error('Error rendering chart:', error);
        }
  };

  // Function to update bar positions using ECharts API
  const updateBarPositions = () => {
    if (!chartInstance.current || !periods || periods.length === 0) return;
    const myChart = chartInstance.current;
    const positions = periods.map((period, idx) => {
      // Use the same label as xAxis data
      let label;
      if (period.isCustomRange) {
        label = `${period.year}-${period.displayName}-${period.type}`;
      } else if (period.month) {
        label = `${period.year}-${period.month}-${period.type}`;
      } else {
        label = `${period.year}-${period.type}`;
      }
      // Get the x pixel position for the center of the bar
      const x = myChart.convertToPixel({ xAxisIndex: 0 }, label);
      return x;
    });
    setBarPositions(positions);
  };

  // Update bar positions after chart renders and on resize
  useEffect(() => {
    const handleUpdate = () => {
      updateBarPositions();
    };
    // Wait for chart to render
    setTimeout(handleUpdate, 400);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('resize', handleUpdate);
    };
  }, [data, periods, basePeriod]);

  useEffect(() => {
    // Initialize only the main chart
    const timer = setTimeout(() => {
      initChart();
    }, 300);

    // Add window resize listener with debounce
    const handleResize = debounce(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);

    // Force additional resize after component fully mounts
    const resizeTimer = setTimeout(() => {
      handleResize();
    }, 800);

    // Add a mutation observer to detect size changes in parent elements with debounce
    const debouncedResize = debounce(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    }, 100);
    
    const observer = new ResizeObserver(debouncedResize);
    
    if (chartRef.current) {
      observer.observe(chartRef.current.parentElement);
    }

    // Cleanup
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [data, periods, basePeriod]);

  return (
    <div className="bar-chart-container" style={{ 
      position: 'relative', 
      width: '100%', 
      height: '96vh', // Increased by 20% (was 80vh)
      minHeight: '720px', // Increased by 20% (was 600px)
      maxHeight: '1200px', // Increased by 20% (was 1000px)
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '0px',
      margin: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch'
    }}>
      {/* Title, subtitle, and legend in three stacked rows above the chart */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '24px',
        marginBottom: '12px',
        width: '100%'
      }}>
        <span style={{ fontSize: 28, fontWeight: 'bold', color: '#444', lineHeight: '36px', textAlign: 'center' }}>
          Sales and Volume
        </span>
        <span style={{ fontSize: 18, fontWeight: 'normal', color: '#888', lineHeight: '24px', textAlign: 'center', marginTop: 2 }}>
          (<UAEDirhamSymbol />)
        </span>
        <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666', lineHeight: '20px', textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
          % variance based on sequential period comparison (current vs previous period)
        </span>
      </div>
      {/* Chart area */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        {periods && periods.length > 0 
          ? <div 
              ref={chartRef} 
              className="bar-chart" 
              style={{ width: '100%', height: '100%' }} 
            />
          : (
            <div className="no-data-message" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#666',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              <div>
                <p>No periods visible in chart.</p>
                <p>Use the eye icons in Column Configuration to select which periods to display.</p>
              </div>
            </div>
          )
        }
        {/* Absolutely positioned value overlays using barPositions */}
        {barPositions.length === periods.length && (
          <>
            {/* Sales Volume row */}
            <div style={{
              position: 'absolute',
              left: 20,
              color: '#8e44ad',
              fontWeight: 'bold',
              fontSize: 18,
              bottom: 70
            }}>
              Sales Volume (MT)
            </div>
            {periods.map((period, idx) => {
              const periodKey = createPeriodKey(period);
              const value = data[periodKey]?.salesVolume || 0;
              const mtValue = Math.round(value / 1000);
              return (
                <div key={`salesvol-${idx}`}
                  style={{
                    position: 'absolute',
                    left: barPositions[idx] - 50, // Centered, adjust 50 for half width
                    width: 100,
                    textAlign: 'center',
                    color: '#8e44ad',
                    fontWeight: 'bold',
                    fontSize: 18,
                    bottom: 70 // Tighter spacing
                  }}
                >
                  {mtValue.toLocaleString()} MT
                </div>
              );
            })}
            {/* Sales per Kg row */}
            <div style={{
              position: 'absolute',
              left: 20,
              color: '#2E865F',
              fontWeight: 'bold',
              fontSize: 18,
              bottom: 30
            }}>
              Sales <UAEDirhamSymbol /> per Kg
            </div>
            {periods.map((period, idx) => {
              const periodKey = createPeriodKey(period);
              const salesValue = data[periodKey]?.sales || 0;
              const salesVolumeValue = data[periodKey]?.salesVolume || 0;
              let salesPerKg = 0;
              if (salesVolumeValue > 0) {
                salesPerKg = salesValue / salesVolumeValue;
              }
              return (
                <div key={`salespkg-${idx}`}
                  style={{
                    position: 'absolute',
                    left: barPositions[idx] - 50,
                    width: 100,
                    textAlign: 'center',
                    color: '#2E865F',
                    fontWeight: 'bold',
                    fontSize: 18,
                    bottom: 30 // More space between rows
                  }}
                >
                  {salesPerKg.toFixed(2)}
                </div>
              );
            })}
            {/* Production Volume row - REMOVED as requested */}
          </>
        )}
      </div>

    </div>
  );
};

export default BarChart;