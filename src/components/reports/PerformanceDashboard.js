import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useFilter } from '../../contexts/FilterContext';
import BudgetAchievementChart from './BudgetAchievementChart';
import ProductGroupsKgsTable from './ProductGroupsKgsTable';
import ProductGroupsAmountTable from './ProductGroupsAmountTable';
import ProductGroupKeyFacts from './ProductGroupKeyFacts';
import CustomerKeyFacts from './CustomerKeyFactsNew';
import CustomersKgsTable from './CustomersKgsTable';
import CustomersAmountTable from './CustomersAmountTable';

const PerformanceDashboard = ({ reportData, kgsData, amountData, customerAmountData, rep, applySavedMergeRules, onStrategicFindingsCalculated, onCustomerFindingsCalculated }) => {
  const { columnOrder, basePeriodIndex } = useFilter();
  const yoyChartRef = useRef(null);
  const yoyChartInstance = useRef(null);
  const [activeTab, setActiveTab] = useState('yoy'); // 'yoy' | 'budget' | 'tables' | 'customers'
  const [customerData, setCustomerData] = useState({});
  const [customerKgsData, setCustomerKgsData] = useState([]);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [strategicFindings, setStrategicFindings] = useState(null);
  const [customerFindings, setCustomerFindings] = useState(null);

  // Handle strategic findings calculated by ProductGroupKeyFacts
  const handleFindingsCalculated = React.useCallback((findings) => {
    setStrategicFindings(findings);
    if (onStrategicFindingsCalculated) {
      onStrategicFindingsCalculated(findings);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle customer findings calculated by CustomerKeyFacts
  const handleCustomerFindingsCalculated = React.useCallback((findings) => {
    console.log('📊 Customer findings calculated:', findings);
    setCustomerFindings(findings);
    if (onCustomerFindingsCalculated) {
      onCustomerFindingsCalculated(findings);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build enhanced reportData with proper period information like SalesRepReport
  const enhancedReportData = React.useMemo(() => {
    if (!columnOrder || basePeriodIndex === null || !reportData) {
      return reportData;
    }

    const basePeriod = columnOrder[basePeriodIndex];
    const prevPeriod = basePeriodIndex > 0 ? columnOrder[basePeriodIndex - 1] : null;

    return {
      ...reportData,
      basePeriod,
      prevPeriod,
      basePeriodIndex,
      columnOrder
    };
  }, [columnOrder, basePeriodIndex, reportData]);

  // Fetch customer sales data for CustomerKeyFacts
  const fetchCustomerSalesData = async (column) => {
    if (!rep || !column) return;
    
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

      const response = await fetch('http://localhost:3001/api/sales-by-customer-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          division: 'FP', // Currently only FP division is supported
          salesRep: rep,
          year: column.year,
          months: months,
          dataType: column.type || 'Actual'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Use stable key per period selection
        const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
        setCustomerData(prev => ({
          ...prev,
          [columnKey]: result.data
        }));
      }
    } catch (err) {
      console.error('Failed to load customer sales data:', err);
    }
  };

  // Load customer sales data when columns change
  useEffect(() => {
    if (rep && columnOrder.length > 0) {
      setLoadingCustomerData(true);
      const fetchPromises = columnOrder.map(column => fetchCustomerSalesData(column));
      Promise.all(fetchPromises).finally(() => {
        setLoadingCustomerData(false);
      });
    }
  }, [rep, columnOrder]);

  // Transform customer data to kgs format for CustomerKeyFacts
  useEffect(() => {
    if (!customerData || Object.keys(customerData).length === 0 || !columnOrder || columnOrder.length === 0) {
      setCustomerKgsData([]);
      return;
    }

    const transformedData = [];
    
    // Get all unique customers across all periods
    const allCustomers = new Set();
    Object.values(customerData).forEach(periodData => {
      if (Array.isArray(periodData)) {
        periodData.forEach(item => {
          if (item.customer_name) {
            allCustomers.add(item.customer_name);
          }
        });
      }
    });

    // Transform each customer's data to match CustomerKeyFacts expected format
    allCustomers.forEach(customerName => {
      const rawValues = [];
      
      columnOrder.forEach(column => {
        const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
        const periodData = customerData[columnKey] || [];
        
        const customerData_item = periodData.find(item => item.customer_name === customerName);
        const kgs = customerData_item ? parseFloat(customerData_item.total_kgs) || 0 : 0;
        
        rawValues.push(kgs);
      });
      
      transformedData.push({
        name: customerName,
        rawValues: rawValues
      });
    });

    setCustomerKgsData(transformedData);
  }, [customerData, columnOrder]);

  useEffect(() => {
    const hasTop = reportData && reportData.topProducts && reportData.topProducts.length > 0;
    const hasKgs = Array.isArray(kgsData) && kgsData.length > 0;
    if (activeTab === 'yoy' && (hasTop || hasKgs)) {
      createYoYGrowthChart();
    } else {
      // Destroy chart when switching away
      if (yoyChartInstance.current) {
        yoyChartInstance.current.destroy();
        yoyChartInstance.current = null;
      }
    }

    return () => {
      // Cleanup charts on unmount or tab change
      if (yoyChartInstance.current) {
        yoyChartInstance.current.destroy();
        yoyChartInstance.current = null;
      }
    };
  }, [enhancedReportData, kgsData, activeTab]);

  const formatPeriodLabel = (period) => {
    if (typeof period === 'object' && period !== null) {
      const { type, year, month } = period;
      const result = `${month} ${year} ${type}`;
      return result;
    }
    return period;
  };

  const getPeriodComparisonTitle = () => {
    if (!enhancedReportData) return { currentName: 'Current Period', previousName: 'Previous Year' };
    
    const { currentPeriod, previousYearPeriod } = enhancedReportData;
    
    const currentName = formatPeriodLabel(currentPeriod);
    const previousName = formatPeriodLabel(previousYearPeriod);
    
    return { currentName, previousName };
  };

  const createYoYGrowthChart = () => {
    if (!yoyChartRef.current) return;

    // Destroy existing chart
    if (yoyChartInstance.current) {
      yoyChartInstance.current.destroy();
    }

    const ctx = yoyChartRef.current.getContext('2d');
    
    // Check if we have a previous period for YoY comparison
    const prevIndex = enhancedReportData.basePeriodIndex - 1;
    const hasPreviousPeriod = prevIndex >= 0 && enhancedReportData.columnOrder && enhancedReportData.columnOrder[prevIndex];
    
    if (!hasPreviousPeriod) {
      // Show message asking user to add previous year data
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📅 YoY Growth Analysis', ctx.canvas.width / 2, ctx.canvas.height / 2 - 40);
      
      ctx.font = '14px Arial';
      ctx.fillText('To calculate Year-over-Year growth, please add', ctx.canvas.width / 2, ctx.canvas.height / 2 - 10);
      ctx.fillText('previous year data to your period selection.', ctx.canvas.width / 2, ctx.canvas.height / 2 + 10);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#999';
      ctx.fillText('Go to Dashboard Selection → Add 2024 periods', ctx.canvas.width / 2, ctx.canvas.height / 2 + 35);
      
      return;
    }
    
    // Use full product group list from kgsData to avoid limiting to Top N
    // Fallback to enhancedReportData.topProducts only if kgsData is unavailable
    let rows = Array.isArray(kgsData) ? [...kgsData] : (enhancedReportData.topProducts || []);
    
    // Apply filtering rules: exclude specific product groups and zero values
    const excludedProductGroups = [
      'Service Charges', 'Services Charges', 'Others', 'Other', 
      'Miscellaneous', 'Service', 'Charges'
    ];
    
    // Keep only groups that have value in base period or previous period
    rows = rows.filter(pg => {
      const productGroup = pg.productGroup || pg.name || '';
      
      // Exclude specific product groups (case-insensitive)
      const isExcluded = excludedProductGroups.some(excluded => 
        productGroup.toLowerCase().includes(excluded.toLowerCase())
      );
      if (isExcluded) return false;
      
      const cur = pg.rawValues?.[enhancedReportData.basePeriodIndex] || 0;
      const prev = (enhancedReportData.basePeriodIndex > 0 ? (pg.rawValues?.[enhancedReportData.basePeriodIndex - 1] || 0) : 0);
      
      // Also check if product has any values across all periods to exclude completely empty ones
      const hasAnyValue = pg.rawValues?.some(val => (val || 0) > 0) || false;
      
      return hasAnyValue && ((cur > 0) || (prev > 0));
    });
    // Sort by current period value descending for readability
    rows.sort((a, b) => (b.rawValues?.[enhancedReportData.basePeriodIndex] || 0) - (a.rawValues?.[enhancedReportData.basePeriodIndex] || 0));
    if (!rows || rows.length === 0) return;

    const currentData = rows.map(pg => pg.rawValues[enhancedReportData.basePeriodIndex] || 0);
    const previousData = rows.map(pg => {
      return prevIndex >= 0 ? (pg.rawValues[prevIndex] || 0) : 0;
    });



    // Calculate YoY growth and build sortable entries
    const entries = rows.map((pg, index) => {
      const current = currentData[index];
      const previous = previousData[index];
      let percentage = 0;
      let mtDifference = 0;
      if (previous !== 0) {
        percentage = ((current - previous) / previous) * 100;
        mtDifference = (current - previous) / 1000;
      } else if (current !== 0) {
        // Avoid misleading 100%+ spikes when previous is zero
        percentage = 0;
        mtDifference = current / 1000;
      }
      const label = pg.productGroup || pg.name || '';
      return { label, percentage, mtDifference };
    });

    // Sort: positives descending, then negatives ascending (clean grouping)
    entries.sort((a, b) => {
      const aPos = a.percentage >= 0; const bPos = b.percentage >= 0;
      if (aPos && !bPos) return -1;
      if (!aPos && bPos) return 1;
      return aPos ? (b.percentage - a.percentage) : (a.percentage - b.percentage);
    });

    const labels = entries.map(e => e.label);
    const percentages = entries.map(e => e.percentage);

    // Calculate clean symmetric range with zero in middle
    const maxPos = Math.max(0, ...percentages);
    const minNeg = Math.min(0, ...percentages);
    const maxAbsValue = Math.max(Math.abs(maxPos), Math.abs(minNeg));
    const padding = Math.ceil(maxAbsValue * 0.2); // Clean percentage for padding
    
    // Create symmetric range around zero with round numbers
    const maxGrowth = Math.ceil((maxAbsValue + padding) / 100) * 100; // Round to nearest 100
    const minGrowth = -maxGrowth;

    // Dynamically size the canvas/container height based on number of bars
    const numBars = labels.length;
    // Increased height per bar for better visibility
    const perBar = numBars > 25 ? 35 : 45;
    const desiredHeightPx = Math.max(600, numBars * perBar + 150);
    const containerEl = yoyChartRef.current.parentElement;
    if (containerEl) {
      containerEl.style.height = desiredHeightPx + 'px';
    }
    // Ensure canvas fills the container
    yoyChartRef.current.style.height = '100%';
    yoyChartRef.current.style.width = '100%';

    yoyChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Year-over-Year Growth (%)',
          data: percentages,
          backgroundColor: (ctx) => {
            const v = ctx.raw || 0;
            // Enhanced color scheme for different performance ranges
            if (v >= 50) return '#059669'; // Exceptional growth - deep emerald
            if (v >= 20) return '#10b981'; // Strong growth - emerald
            if (v >= 10) return '#34d399'; // Good growth - light emerald
            if (v >= 0) return '#6ee7b7';  // Mild growth - very light emerald
            if (v >= -10) return '#fbbf24'; // Mild decline - yellow
            if (v >= -20) return '#f59e0b'; // Moderate decline - amber
            return '#ef4444'; // Strong decline - red
          },
          borderColor: (ctx) => {
            const v = ctx.raw || 0;
            if (v >= 50) return '#047857';
            if (v >= 20) return '#059669';
            if (v >= 10) return '#10b981';
            if (v >= 0) return '#34d399';
            if (v >= -10) return '#d97706';
            if (v >= -20) return '#f59e0b';
            return '#dc2626';
          },
          borderWidth: 2,
          barThickness: 32,
          categoryPercentage: 0.8,
          barPercentage: 0.8,
          borderRadius: 8,
          hoverBackgroundColor: (ctx) => {
            const v = ctx.raw || 0;
            // Slightly darker hover colors for better feedback
            if (v >= 50) return '#047857';
            if (v >= 20) return '#059669';
            if (v >= 10) return '#10b981';
            if (v >= 0) return '#34d399';
            if (v >= -10) return '#d97706';
            if (v >= -20) return '#d97706';
            return '#dc2626';
          }
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20, right: 250, bottom: 20, left: 20 } },
        elements: { bar: { borderSkipped: false } },
        scales: {
          x: {
            beginAtZero: true,
            min: minGrowth,
            max: maxGrowth,
            grid: {
              color: (ctx) => ctx.tick.value === 0 ? '#374151' : '#e5e7eb',
              lineWidth: (ctx) => ctx.tick.value === 0 ? 3 : 1,
              drawBorder: false
            },
            ticks: {
              color: '#374151',
              font: { size: 13, weight: '600' },
              callback: (value) => `${value}%`
            },
            title: {
              display: true,
              text: 'Year-over-Year Growth (%)',
              color: '#1f2937',
              font: { weight: 'bold', size: 15 },
              padding: { top: 15 }
            }
          },
          y: {
            offset: true,
            ticks: {
              autoSkip: false,
              maxTicksLimit: 200,
              color: '#1f2937',
              font: { size: 13, weight: '700' },
              padding: 10
            },
            title: {
              display: false
            }
          }
        },
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            padding: 20,
            titleFont: { size: 16, weight: 'bold' },
            bodyFont: { size: 15 },
            bodySpacing: 8,
            cornerRadius: 8,
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => {
                const v = context.parsed.x;
                const mt = entries[context.dataIndex].mtDifference;
                const mtText = (mt >= 0 ? '+' : '') + mt.toFixed(2) + ' MT';
                return [
                  'YoY Growth: ' + v.toFixed(1) + '%',
                  'Volume Impact: ' + mtText,
                  v >= 0 ? '✅ Positive Growth' : '⚠️ Decline'
                ];
              }
            }
          },
          datalabels: {
            display: true,
            color: '#111827',
            anchor: (ctx) => {
              const v = ctx.dataset.data[ctx.dataIndex] || 0;
              return v >= 0 ? 'end' : 'start';
            },
            align: (ctx) => {
              const v = ctx.dataset.data[ctx.dataIndex] || 0;
              return v >= 0 ? 'end' : 'start';
            },
            offset: 4,
            rotation: 0,
            clamp: false,
            clip: false,
            formatter: (v, ctx) => {
              const pct = v.toFixed(1);
              const mt = entries[ctx.dataIndex].mtDifference;
              const mtText = (mt >= 0 ? '+' : '') + mt.toFixed(1) + ' MT';
              return `${pct}% (${mtText})`;
            },
            font: { 
              weight: 'bold', 
              size: 13,
              family: 'Inter, system-ui, sans-serif',
              lineHeight: 1.2
            }
          }
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      },
      plugins: [ChartDataLabels]
    });
  };

  if (!reportData) {
    return <div>Loading performance dashboard...</div>;
  }


  
  return (
    <div className="section">
      <h2>Performance Dashboard</h2>
      <p className="tab-instructions">Click on the tabs below to switch between different performance views</p>

      <div className="tab-container">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'yoy' ? 'active' : ''}`}
            onClick={() => setActiveTab('yoy')}
          >
            📈<br />YoY Growth<br />by Product Group
          </button>
          <button
            className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            🎯<br />Budget Achievement<br />by Product Group
          </button>
          <button
            className={`tab-button ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            📊<br />Product Groups<br />Strategic Analysis
          </button>
          <button
            className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥<br />Customers<br />Performance Analysis
          </button>
        </div>

        {/* YoY Growth Tab */}
        <div className={`tab-content ${activeTab === 'yoy' ? 'active' : ''}`}>
          <h3 style={{
            margin: '15px 0 20px 0',
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: '600',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center'
          }}>
            {(() => {
              const { currentName, previousName } = getPeriodComparisonTitle();
              return `${currentName} vs ${previousName} Year-over-Year Growth by Category`;
            })()}
          </h3>
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '12px 20px',
            borderRadius: '12px',
            marginTop: '-10px',
            marginBottom: '20px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{
              margin: '0',
              fontStyle: 'italic',
              color: '#64748b',
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}>
              Hover over bars for detailed performance analysis • Labels show growth rate and volume impact
            </p>
          </div>
          <div className="chart-container">
            <canvas ref={yoyChartRef} id="yoyGrowthChart"></canvas>
          </div>
        </div>

        {/* Budget Achievement Tab */}
        <div className={`tab-content ${activeTab === 'budget' ? 'active' : ''}`}>
          <BudgetAchievementChart reportData={reportData} kgsData={kgsData} />
        </div>

        {/* Product Groups Performance Tab */}
        <div className={`tab-content ${activeTab === 'tables' ? 'active' : ''}`}>
          <ProductGroupsKgsTable kgsData={kgsData} rep={rep} />
          <ProductGroupsAmountTable amountData={amountData} rep={rep} />
          <ProductGroupKeyFacts kgsData={kgsData} amountData={amountData} rep={rep} onFindingsCalculated={handleFindingsCalculated} />
        </div>

        {/* Customers Performance Tab */}
        <div className={`tab-content ${activeTab === 'customers' ? 'active' : ''}`}>
          <CustomersKgsTable kgsData={kgsData} rep={rep} />
          <CustomersAmountTable customerAmountData={customerAmountData} />
          <CustomerKeyFacts rep={rep} amountRowsOverride={customerAmountData} onFindingsCalculated={handleCustomerFindingsCalculated} />
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;