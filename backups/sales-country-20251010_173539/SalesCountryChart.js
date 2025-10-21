import React, { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Filter, Globe, TrendingUp, Users, MapPin } from 'lucide-react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';
import '../charts/components/SalesCountryMapChart.css';

const SalesCountryChart = () => {
  const { selectedDivision } = useExcelData(); // Get selectedDivision from same context as Dashboard
  const { columnOrder, basePeriodIndex, dataGenerated } = useFilter();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);

  // Set default selected period to base period when data loads
  useEffect(() => {
    console.log('📅 Chart: Period selection effect:', { columnOrderLength: columnOrder.length, basePeriodIndex });
    if (columnOrder.length > 0 && basePeriodIndex !== null) {
      console.log('🎯 Chart: Setting base period index:', basePeriodIndex);
      setSelectedPeriodIndex(basePeriodIndex);
    } else if (columnOrder.length > 0) {
      console.log('🎯 Chart: Setting default period index: 0');
      setSelectedPeriodIndex(0);
    }
  }, [columnOrder, basePeriodIndex]);
  const [panelData, setPanelData] = useState({ localSales: 0, exportSales: 0, regionalData: {} });
  
  // State for database data
  const [countries, setCountries] = useState([]);
  const [countryData, setCountryData] = useState({});
  
  // State for hiding Budget/Forecast columns (same as table)
  const [hideBudgetForecast, setHideBudgetForecast] = useState(false);


  // Color scheme definitions (same as ColumnConfigGrid)
  const colorSchemes = [
    { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
    { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
    { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
    { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
    { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
  ];

  // Get period colors using the EXACT same logic as ColumnConfigGrid
  const getPeriodColor = (column) => {
    if (column.customColor) {
      const scheme = colorSchemes.find(s => s.name === column.customColor);
      if (scheme) {
        return scheme.primary;
      }
    }
    
    // Default to blue if no custom color (same as ColumnConfigGrid)
    const defaultScheme = colorSchemes[0]; // blue
    return defaultScheme.primary;
  };

  // Fetch countries from database
  const fetchCountries = async () => {
    if (!selectedDivision) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/countries-db?division=${selectedDivision}`);
      const result = await response.json();
      
      if (result.success) {
        // Extract unique country names (deduplicate)
        const countryNames = [...new Set(result.data.map(item => item.country))];
        setCountries(countryNames);
      }
    } catch (err) {
      console.error('Failed to load countries:', err);
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

  // Helper function to get country sales amount for a specific period
  const getCountrySalesAmount = (countryName, column) => {
    if (!selectedDivision) return 0;
    
    const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
    const columnData = countryData[columnKey] || [];
    
    const countryDataItem = columnData.find(item => 
      item.country.toLowerCase() === countryName.toLowerCase()
    );
    
    return countryDataItem ? countryDataItem.value : 0;
  };

  // Helper function to get total sales for a specific period
  const getTotalSalesForPeriod = (column) => {
    const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
    const columnData = countryData[columnKey] || [];
    return columnData.reduce((sum, item) => sum + (item.value || 0), 0);
  };

  // Get country percentage for specific period  
  const getCountryPercentage = (countryName, column) => {
    const countrySales = getCountrySalesAmount(countryName, column);
    const totalSales = getTotalSalesForPeriod(column);
    
    if (totalSales === 0) return 0;
    return (countrySales / totalSales) * 100;
  };

  // Load countries when division changes
  useEffect(() => {
    fetchCountries();
  }, [selectedDivision]);

  // Load sales data when columns change
  useEffect(() => {
    if (selectedDivision && columnOrder.length > 0) {
      columnOrder.forEach(column => {
        fetchSalesData(column);
      });
    }
  }, [selectedDivision, columnOrder]);

  // Process data for chart visualization
  useEffect(() => {
    if (!countries || countries.length === 0 || !selectedDivision || !dataGenerated || columnOrder.length === 0) {
      setChartData(null);
      return;
    }

    setLoading(true);

    // Filter columns based on user preferences (same as table)
    const filteredColumns = columnOrder.filter(col => {
      if (hideBudgetForecast && (col.type === 'Budget' || col.type === 'Forecast')) return false;
      return true;
    });

    if (filteredColumns.length === 0) {
      setChartData(null);
      setLoading(false);
      return;
    }

    // Calculate total percentage for each country across all periods to rank them
    const countryTotals = {};
    countries.forEach(countryName => {
      let total = 0;
      filteredColumns.forEach(column => {
        const percentage = getCountryPercentage(countryName, column);
        total += percentage;
      });
      countryTotals[countryName] = total;
    });

    // Sort countries by their total percentage across all periods and get top 10
    const topCountries = countries
      .sort((a, b) => countryTotals[b] - countryTotals[a])
      .slice(0, 10);

    // Prepare chart data - Countries on X-axis, Periods as series
    const categories = topCountries; // Countries on X-axis

    // Create series data for filtered periods - colors based on period content
    const allSeries = filteredColumns.map((column) => {
      const periodName = column.isCustomRange 
        ? `${column.year} ${column.displayName} ${column.type}` 
        : `${column.year} ${column.month} ${column.type}`;
      
      const data = topCountries.map(country => {
        const percentage = getCountryPercentage(country, column);
        const roundedPercentage = Math.round(percentage * 10) / 10; // Round to 1 decimal place
        return roundedPercentage;
      });

      return {
        name: periodName,
        type: 'bar',
        data: data,
        column, // Store column for button color matching
        itemStyle: {
          color: getPeriodColor(column) // Color based on period content, not position
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontSize: 10,
          color: '#333'
        }
      };
    });

    setChartData({
      categories,
      allSeries,
      topCountries,
      totalPeriods: filteredColumns.length,
      filteredColumns
    });
    setLoading(false);
  }, [countries, countryData, selectedDivision, columnOrder, dataGenerated, hideBudgetForecast]);

  // Set default selected period to base period when data loads
  useEffect(() => {
    if (chartData && chartData.filteredColumns && basePeriodIndex !== null) {
      // Find the index in filteredColumns that corresponds to the base period
      const basePeriodColumn = columnOrder[basePeriodIndex];
      if (basePeriodColumn) {
        const filteredIndex = chartData.filteredColumns.findIndex(filteredCol => 
          filteredCol.year === basePeriodColumn.year && 
          filteredCol.month === basePeriodColumn.month && 
          filteredCol.type === basePeriodColumn.type
        );
        
        if (filteredIndex !== -1) {
          setSelectedPeriodIndex(filteredIndex);
        } else {
          // If base period is filtered out, default to first available period
          setSelectedPeriodIndex(0);
        }
      }
    } else if (chartData && chartData.filteredColumns && chartData.filteredColumns.length > 0) {
      // If no base period is set, default to first available period
      setSelectedPeriodIndex(0);
    }
  }, [chartData, basePeriodIndex, columnOrder]);

  // Calculate panel data when period changes
  useEffect(() => {
    if (!chartData || !chartData.filteredColumns || !chartData.topCountries) {
      return;
    }

    const currentPeriod = chartData.filteredColumns[selectedPeriodIndex];
    if (!currentPeriod) return;

    // Calculate Local vs Export Sales for the selected period
    let localSales = 0;
    let exportSales = 0;
    
    chartData.topCountries.forEach(country => {
      const percentage = getCountryPercentage(country, currentPeriod);
      if (country.toLowerCase().includes('united arab emirates') || country.toLowerCase().includes('uae')) {
        localSales += percentage;
      } else {
        exportSales += percentage;
      }
    });

    // Regional mapping
    const regionMapping = {
      'GCC': ['United Arab Emirates', 'UAE', 'Kingdom Of Saudi Arabia', 'Saudi Arabia', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'],
      'Levant': ['Jordan', 'Lebanon', 'Syria', 'Palestine'],
      'North Africa': ['Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco'],
      'South Africa': ['South Africa'],
      'Europe': ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Czech Republic'],
      'Americas': ['United States', 'USA', 'Canada', 'Mexico', 'Brazil', 'Argentina'],
      'Asia': ['India', 'China', 'Japan', 'South Korea', 'Singapore', 'Malaysia', 'Thailand', 'Indonesia'],
      'Others': []
    };

    // Calculate regional breakdown
    const regionalData = {};
    Object.keys(regionMapping).forEach(region => {
      regionalData[region] = 0;
    });

    chartData.topCountries.forEach(country => {
      const percentage = getCountryPercentage(country, currentPeriod);
      let assigned = false;
      
      for (const [region, countries] of Object.entries(regionMapping)) {
        if (region !== 'Others' && countries.some(c => 
          country.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(country.toLowerCase())
        )) {
          regionalData[region] += percentage;
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        regionalData['Others'] += percentage;
      }
    });

    setPanelData({
      localSales: Math.round(localSales * 10) / 10,
      exportSales: Math.round(exportSales * 10) / 10,
      regionalData
    });
  }, [chartData, selectedPeriodIndex]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current || !chartData || !chartData.allSeries || chartData.allSeries.length === 0) return;

    // Dispose previous chart instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    // Initialize new chart
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    // Get current period data
    const currentSeries = chartData.allSeries[selectedPeriodIndex];
    const currentPeriodName = currentSeries ? currentSeries.name : 'No Data';

    const option = {
      title: {
        text: `Top 10 Countries - ${currentPeriodName}`,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#2c3e50'
        },
        padding: [10, 0, 0, 0]
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: function(params) {
          const param = Array.isArray(params) ? params[0] : params;
          return `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${param.axisValue}</div>
                  <div style="margin: 4px 0;">
                    ${param.marker} ${param.seriesName}: <strong>${param.value.toFixed(1)}%</strong>
                  </div>`;
        }
      },
      legend: {
        show: false  // Hide legend since we're showing one period at a time
      },
      grid: {
        left: '20%',
        right: '15%',
        bottom: '8%',
        top: '60px',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        show: false,  // Hide X-axis completely
        min: 0
      },
      yAxis: {
        type: 'category',
        data: chartData.categories,
        axisLabel: {
          interval: 0,
          fontSize: 11,
          color: '#555',
          fontWeight: '500',
          margin: 10
        },
        axisTick: {
          alignWithLabel: true,
          length: 6
        },
        axisLine: {
          lineStyle: {
            color: '#ccc',
            width: 1
          }
        },
        splitLine: {
          show: false
        }
      },
      series: [{
        ...currentSeries,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          fontSize: 12,
          color: '#333',
          fontWeight: '600',
          distance: 8
        },
        barMaxWidth: 35,
        barCategoryGap: '20%',
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        }
      }],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          xAxisIndex: 0
        }
      ],
    };

    console.log('Chart option:', option);
    console.log('Chart series:', option.series);
    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [chartData, selectedPeriodIndex]);

  // Check if we have data to display
  if (!dataGenerated) {
    return (
      <div className="sales-country-map-container">
        <div className="empty-state">
          <h3>📊 Sales by Country Chart</h3>
          <p>Please select columns and click the Generate button to view the sales by country chart.</p>
        </div>
      </div>
    );
  }

  // Show "Coming Soon" for non-FP divisions
  if (selectedDivision !== 'FP') {
    return (
      <div className="sales-country-map-container">
        <div className="empty-state">
          <h3>📊 Sales by Country Chart - {selectedDivision}</h3>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', marginBottom: '20px' }}>🚧 Coming Soon</h3>
            <p style={{ color: '#888', fontSize: '16px' }}>
              Sales by Country Chart for {selectedDivision} division is currently under development.
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
              The database table <code>{selectedDivision.toLowerCase()}_data_excel</code> has been created and is ready for data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sales-country-map-container">
        <div className="empty-state">
          <h3>📊 Loading Chart Data...</h3>
          <p>Processing sales data for visualization...</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="sales-country-map-container">
        <div className="empty-state">
          <h3>📊 No Data Available</h3>
          <p>No sales data found for the selected division. Please check your data source.</p>
        </div>
      </div>
    );
  }

      return (
    <div className="sales-country-map-container" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Chart Options */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          marginBottom: '20px',
          padding: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        {/* Hide Budget & Forecast Option */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #f1f3f4 0%, #e8eaed 100%)',
            borderRadius: '8px',
            border: '1px solid #dadce0'
          }}
        >
          <Filter size={16} color="#5f6368" />
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#3c4043',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none'
          }}>
            <input 
              type="checkbox" 
              checked={hideBudgetForecast} 
              onChange={(e) => setHideBudgetForecast(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#1976d2'
              }}
            />
            <span>Hide Budget & Forecast</span>
          </label>
        </motion.div>

        {/* Period Buttons Selector */}
        <AnimatePresence>
          {chartData && chartData.allSeries && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'center',
                flex: '1'
              }}
            >
              {chartData.allSeries.map((series, index) => {
                const column = series.column; // Get column from series
                const periodName = column.isCustomRange 
                  ? `${column.year} ${column.displayName}` 
                  : `${column.year} ${column.month}`;
                
                // Use the EXACT same color that was calculated for the chart
                const buttonColor = series.itemStyle.color;
                const isSelected = selectedPeriodIndex === index;
                
                return (
                  <motion.button
                    key={index}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPeriodIndex(index)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: buttonColor,
                      color: (buttonColor === '#FFD700' || buttonColor === '#FF6B35') ? '#000' : '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: isSelected 
                        ? `0 6px 20px ${buttonColor}60, 0 0 0 3px rgba(255,255,255,0.9)` 
                        : `0 3px 10px ${buttonColor}40`,
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <motion.span
                      style={{ position: 'relative', zIndex: 1 }}
                      animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
                    >
                      {periodName}
                    </motion.span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content Layout */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="chart-layout"
      >
        {/* Chart Container */}
        <motion.div 
          className="chart-main"
          whileHover={{ 
            scale: 1.02,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div 
            ref={chartRef}
            style={{
              width: '100%',
              height: '600px',
              border: 'none',
              borderRadius: '12px',
              backgroundColor: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          />
          {/* Chart Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              position: 'absolute',
              top: '15px',
              left: '20px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#1976d2" />
              <span style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#2c3e50',
                background: 'rgba(255,255,255,0.9)',
                padding: '4px 8px',
                borderRadius: '6px',
                backdropFilter: 'blur(10px)'
              }}>
                Top Countries Performance
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Panels */}
        <div className="chart-panels">
          {/* Local vs Export Sales Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ 
            scale: 1.03, 
            y: -4,
            boxShadow: '0 12px 28px rgba(0,0,0,0.12)'
          }}
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '16px',
            border: '1px solid #e9ecef',
            boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '180px',
            width: '100%'
          }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Globe size={18} color="#2E865F" />
              <h5 style={{ 
                margin: '0', 
                color: '#2c3e50', 
                fontSize: '16px', 
                fontWeight: '600'
              }}>
                Local vs Export Sales
              </h5>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ 
                  scale: 1.05, 
                  x: 8,
                  boxShadow: '0 8px 24px rgba(46, 134, 95, 0.2)'
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 18px',
                  background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)',
                  borderRadius: '12px',
                  border: '1px solid #c3e6c3',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} color="#2E865F" />
                  <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>Local Sales</span>
                </div>
                <motion.span 
                  key={panelData.localSales}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  style={{ 
                    fontWeight: '700', 
                    color: '#2E865F', 
                    fontSize: '18px',
                    background: 'rgba(46, 134, 95, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {panelData.localSales}%
                </motion.span>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ 
                  scale: 1.05, 
                  x: 8,
                  boxShadow: '0 8px 24px rgba(25, 118, 210, 0.2)'
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 18px',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%)',
                  borderRadius: '12px',
                  border: '1px solid #bbdefb',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="#1976d2" />
                  <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>Export Sales</span>
                </div>
                <motion.span 
                  key={panelData.exportSales}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  style={{ 
                    fontWeight: '700', 
                    color: '#1976d2', 
                    fontSize: '18px',
                    background: 'rgba(25, 118, 210, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {panelData.exportSales}%
                </motion.span>
              </motion.div>
            </div>
          </motion.div>

          {/* Regional Breakdown Panel */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ 
              scale: 1.03, 
              y: -4,
              boxShadow: '0 12px 28px rgba(0,0,0,0.12)'
            }}
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderRadius: '16px',
              border: '1px solid #e9ecef',
              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '280px',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Users size={18} color="#FF6B35" />
              <h5 style={{ 
                margin: '0', 
                color: '#2c3e50', 
                fontSize: '16px', 
                fontWeight: '600'
              }}>
                Sales by Region
              </h5>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(panelData.regionalData)
                .filter(([region, value]) => value > 0)
                .sort(([,a], [,b]) => b - a)
                .map(([region, percentage], index) => {
                  const regionEmojis = {
                    'GCC': '🏜️',
                    'Levant': '🏛️',
                    'North Africa': '🏺',
                    'South Africa': '🦁',
                    'Europe': '🏰',
                    'Americas': '🗽',
                    'Asia': '🏯',
                    'Others': '🌐'
                  };
                  
                  return (
                    <motion.div 
                      key={region}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ 
                        scale: 1.08, 
                        x: 12,
                        boxShadow: '0 6px 20px rgba(255, 107, 53, 0.2)',
                        backgroundColor: 'rgba(255, 107, 53, 0.05)'
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                        borderRadius: '10px',
                        border: '1px solid #dee2e6',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{regionEmojis[region]}</span>
                        <span style={{ 
                          fontWeight: '600', 
                          color: '#495057', 
                          fontSize: '13px'
                        }}>
                          {region}
                        </span>
                      </div>
                      <motion.span 
                        key={percentage}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        style={{ 
                          fontWeight: '700', 
                          color: '#2c3e50', 
                          fontSize: '14px',
                          background: 'rgba(255, 107, 53, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {Math.round(percentage * 10) / 10}%
                      </motion.span>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default SalesCountryChart;