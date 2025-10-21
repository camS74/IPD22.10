import React, { useState, useEffect } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useSalesData } from '../../contexts/SalesDataContext';
import { useFilter } from '../../contexts/FilterContext';
import { computeCellValue } from '../../utils/computeCellValue';
import FinancialPerformance from './components/FinancialPerformance';
import CustomerInsights from './components/CustomerInsights';
import ErrorBoundary from './components/ErrorBoundary';
import { formatAEDSymbol, formatAEDPerKg, formatAEDLarge } from './utils/CurrencyFormatters';
import './KPIExecutiveSummary.css';

const divisionNames = {
  'FP': 'Flexible Packaging',
  'SB': 'Shopping Bags',
  'TF': 'Thermoforming Products',
  'HCM': 'Harwal Container Manufacturing'
};



const KPIExecutiveSummary = () => {
  const { excelData, selectedDivision } = useExcelData();
  const { salesData } = useSalesData();
  const { columnOrder, basePeriodIndex, dataGenerated } = useFilter();
  
  // State for API-based product performance data
  const [productPerformanceData, setProductPerformanceData] = useState(null);
  const [loadingProductData, setLoadingProductData] = useState(false);
  const [productPerformanceError, setProductPerformanceError] = useState(null);
  
  // State for API-based geographic distribution data
  const [geographicData, setGeographicData] = useState(null);
  const [loadingGeographicData, setLoadingGeographicData] = useState(false);
  const [geographicDataError, setGeographicDataError] = useState(null);
  
  // State for API-based customer insights data
  const [customerInsightsData, setCustomerInsightsData] = useState(null);
  const [loadingCustomerInsights, setLoadingCustomerInsights] = useState(false);
  const [customerInsightsError, setCustomerInsightsError] = useState(null);
  
  
  // Fetch product performance data from API for FP division
  useEffect(() => {
    let abortController = new AbortController();
    
    const fetchProductPerformance = async () => {
      // Only use API for FP division
      const divisionCode = (selectedDivision ?? '').replace(/-.*$/, '');
      if (divisionCode !== 'FP') {
        setProductPerformanceData(null);
        setProductPerformanceError(null);
        return;
      }
      
      setLoadingProductData(true);
      setProductPerformanceError(null);
      
      try {
        // Check if we have the required data for API call
        const hasValidColumnOrder = Array.isArray(columnOrder) && columnOrder.length > 0;
        const hasValidBasePeriod = basePeriodIndex != null && basePeriodIndex < columnOrder.length;
        const hasValidMonths = columnOrder[basePeriodIndex]?.months && Array.isArray(columnOrder[basePeriodIndex].months);
        
        if (!hasValidColumnOrder || !hasValidBasePeriod || !hasValidMonths) {
          console.log('📦 Product performance: Data not ready yet, skipping API call');
          return;
        }
        
        // Create comparison period: same period from previous year
        const currentPeriodData = columnOrder[basePeriodIndex];
        const comparisonPeriod = currentPeriodData ? {
          year: currentPeriodData.year - 1, // Previous year
          months: currentPeriodData.months, // Same months
          type: currentPeriodData.type       // Same type
        } : null;
        
        const response = await fetch('/api/fp/product-performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPeriod: {
              year: currentPeriodData?.year,
              months: currentPeriodData?.months,
              type: currentPeriodData?.type
            },
            comparisonPeriod: comparisonPeriod
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ Product performance data loaded successfully');
          setProductPerformanceData(result.data);
        } else {
          throw new Error(result.message || 'API returned unsuccessful response');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('📦 Error fetching product performance:', error);
          setProductPerformanceError(error.message);
          setProductPerformanceData(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingProductData(false);
        }
      }
    };
    
    // Add a small delay to prevent rapid API calls during state changes
    const timeoutId = setTimeout(fetchProductPerformance, 100);
    
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [selectedDivision, columnOrder, basePeriodIndex]);

  // Fetch geographic distribution data from API for FP division
  useEffect(() => {
    let abortController = new AbortController();
    
    const fetchGeographicDistribution = async () => {
      // Only use API for FP division
      const divisionCode = (selectedDivision ?? '').replace(/-.*$/, '');
      if (divisionCode !== 'FP') {
        setGeographicData(null);
        setGeographicDataError(null);
        return;
      }
      
      setLoadingGeographicData(true);
      setGeographicDataError(null);
      
      try {
        // Check if we have the required data for API call
        const hasValidColumnOrder = Array.isArray(columnOrder) && columnOrder.length > 0;
        const hasValidBasePeriod = basePeriodIndex != null && basePeriodIndex < columnOrder.length;
        const hasValidMonths = columnOrder[basePeriodIndex]?.months && Array.isArray(columnOrder[basePeriodIndex].months);
        
        if (!hasValidColumnOrder || !hasValidBasePeriod || !hasValidMonths) {
          console.log('🌍 Geographic distribution: Data not ready yet, skipping API call', {
            hasValidColumnOrder,
            hasValidBasePeriod,
            hasValidMonths,
            columnOrderLength: columnOrder?.length,
            basePeriodIndex
          });
          return;
        }
        
        // Convert month names to integers
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIntegers = columnOrder[basePeriodIndex].months.map(month => monthNames.indexOf(month) + 1);
        
        // Validate month integers
        if (monthIntegers.some(month => month === 0)) {
          throw new Error('Invalid month names provided. Please use standard month names (January, February, etc.)');
        }
        
        console.log('🌍 Fetching geographic distribution with params:', {
          division: 'FP',
          year: columnOrder[basePeriodIndex].year,
          months: monthIntegers,
          monthNames: columnOrder[basePeriodIndex].months,
          type: columnOrder[basePeriodIndex].type,
          basePeriodData: columnOrder[basePeriodIndex]
        });
        
        const response = await fetch('/api/geographic-distribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division: 'FP',
            year: columnOrder[basePeriodIndex].year,
            months: monthIntegers,
            type: columnOrder[basePeriodIndex].type,
            includeComparison: true
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🌍 Server error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          // Validate that we have meaningful data
          if (result.data.totalSales > 0) {
            console.log('✅ Geographic distribution data loaded successfully:', {
              totalSales: result.data.totalSales,
              countriesCount: result.data.countrySales?.length || 0
            });
            setGeographicData(result.data);
          } else {
            console.warn('⚠️ Geographic distribution API returned zero total sales');
            setGeographicDataError('No sales data found for the selected period');
          }
        } else {
          throw new Error(result.message || 'API returned unsuccessful response');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('🌍 Error fetching geographic distribution:', error);
          setGeographicDataError(error.message);
          setGeographicData(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingGeographicData(false);
        }
      }
    };
    
    // Add a small delay to prevent rapid API calls during state changes
    const timeoutId = setTimeout(fetchGeographicDistribution, 100);
    
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [selectedDivision, columnOrder, basePeriodIndex]);
  
  // Fetch customer insights data from API for FP division
  useEffect(() => {
    let abortController = new AbortController();
    
    const fetchCustomerInsights = async () => {
      // Only use API for FP division
      const divisionCode = (selectedDivision ?? '').replace(/-.*$/, '');
      if (divisionCode !== 'FP') {
        setCustomerInsightsData(null);
        setCustomerInsightsError(null);
        return;
      }
      
      setLoadingCustomerInsights(true);
      setCustomerInsightsError(null);
      
      try {
        // Check if we have the required data for API call
        const hasValidColumnOrder = Array.isArray(columnOrder) && columnOrder.length > 0;
        const hasValidBasePeriod = basePeriodIndex != null && basePeriodIndex < columnOrder.length;
        const hasValidMonths = columnOrder[basePeriodIndex]?.months && Array.isArray(columnOrder[basePeriodIndex].months);
        
        if (!hasValidColumnOrder || !hasValidBasePeriod || !hasValidMonths) {
          console.log('👥 Customer insights: Data not ready yet, skipping API call');
          return;
        }
        
        // Convert month names to integers
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIntegers = columnOrder[basePeriodIndex].months.map(month => monthNames.indexOf(month) + 1);
        
        // Validate month integers
        if (monthIntegers.some(month => month === 0)) {
          throw new Error('Invalid month names provided. Please use standard month names (January, February, etc.)');
        }
        
        const response = await fetch('/api/customer-insights-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division: 'FP',
            year: columnOrder[basePeriodIndex].year,
            months: monthIntegers,
            type: columnOrder[basePeriodIndex].type
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ Customer insights data loaded successfully');
          setCustomerInsightsData(result.data);
        } else {
          throw new Error(result.message || 'API returned unsuccessful response');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('👥 Error fetching customer insights:', error);
          setCustomerInsightsError(error.message);
          setCustomerInsightsData(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingCustomerInsights(false);
        }
      }
    };
    
    // Add a small delay to prevent rapid API calls during state changes
    const timeoutId = setTimeout(fetchCustomerInsights, 100);
    
    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [selectedDivision, columnOrder, basePeriodIndex]);
  
  // Enhanced defensive checks
  if (!dataGenerated || !Array.isArray(columnOrder) || columnOrder.length === 0) {
    return <div className="kpi-error-state">Please select periods in the Period Configuration and click Generate to view data.</div>;
  }
  
  // Check if this is a non-FP division and show database notification
  const divisionCode = (selectedDivision ?? '').replace(/-.*$/, '');
  if (divisionCode !== 'FP') {
    return (
      <div className="kpi-error-state">
        <h3>📊 Database Integration Required</h3>
        <p>This division ({divisionCode}) requires database integration to display KPI data.</p>
        <p>Only FP division is currently connected to the database.</p>
        <p>Please contact the development team to enable database connectivity for {divisionCode} division.</p>
      </div>
    );
  }
  
  if (basePeriodIndex == null || basePeriodIndex >= columnOrder.length) {
    return <div className="kpi-error-state">No base period selected. Please select a base period (★) in the Period Configuration.</div>;
  }
  
  const basePeriod = columnOrder[basePeriodIndex];
  if (!basePeriod) {
    return <div className="kpi-error-state">Invalid base period. Please select a valid period.</div>;
  }
  
  
  if (!basePeriod.months || !Array.isArray(basePeriod.months)) {
    return <div className="kpi-error-state">Base period configuration is incomplete. Please reconfigure your periods.</div>;
  }

  const divisionData = excelData[selectedDivision];
  const basePeriodName = basePeriod ? `${basePeriod.year} ${basePeriod.isCustomRange ? basePeriod.displayName : (basePeriod.month || '')} ${basePeriod.type}`.trim() : '';
  const comparisonPeriod = basePeriodIndex > 0 ? columnOrder[basePeriodIndex - 1] : null;
  const comparisonPeriodName = comparisonPeriod ? `${comparisonPeriod.year} ${comparisonPeriod.isCustomRange ? comparisonPeriod.displayName : (comparisonPeriod.month || '')} ${comparisonPeriod.type}`.trim() : '';
  // Financials
  const get = (row, col) => computeCellValue(divisionData, row, col);
  const sales = get(3, basePeriod);
  const grossProfit = get(19, basePeriod);
  const netProfit = get(54, basePeriod);
  const ebitda = get(56, basePeriod);
  const salesPrev = comparisonPeriod ? get(3, comparisonPeriod) : null;
  const grossProfitPrev = comparisonPeriod ? get(19, comparisonPeriod) : null;
  const netProfitPrev = comparisonPeriod ? get(54, comparisonPeriod) : null;
  const ebitdaPrev = comparisonPeriod ? get(56, comparisonPeriod) : null;
  const growth = (curr, prev) => {
    // Show growth if we have valid previous data from API (year-over-year comparison)
    if (!prev || prev === 0) return '';
    const rawGrowthPercent = (curr - prev) / Math.abs(prev) * 100;
    const growthPercent = rawGrowthPercent < 0 ? rawGrowthPercent.toFixed(1) : rawGrowthPercent.toFixed(0);
    const isPositive = rawGrowthPercent > 0;
    const arrow = isPositive ? '▲' : '▼';
    const direction = isPositive ? 'Growth' : 'Decline';
    return (
      <span>
        <span className={isPositive ? 'arrow-positive' : 'arrow-negative'}>{arrow} {Math.abs(parseFloat(growthPercent))}%</span> {direction}
      </span>
    );
  };
  
  // Product Performance - Use API data for FP, Excel for others
  let productSales = [];
  let productKgs = [];
  let productMoRM = [];
  
  if (productPerformanceData && !loadingProductData) {
    // Use API data for FP division
    
    productPerformanceData.products.forEach(product => {
      productSales.push({ 
        name: product.name, 
        value: product.sales || 0, 
        material: product.material, 
        process: product.process,
        prevValue: product.sales_prev || 0
      });
      
      productKgs.push({ 
        name: product.name, 
        value: product.kgs || 0, 
        material: product.material, 
        process: product.process,
        prevValue: product.kgs_prev || 0
      });
      
      productMoRM.push({ 
        name: product.name, 
        value: product.morm || 0, 
        material: product.material, 
        process: product.process,
        prevValue: product.morm_prev || 0
      });
    });
    
  } else {
    // No data available - either loading or error
    // FP division should only use database APIs, no Excel fallback
  }
  
  // Calculate KPIs
  productSales.sort((a, b) => b.value - a.value);
  const totalProductSales = productSales.reduce((sum, p) => sum + p.value, 0);
  
  // Calculate growth for each product to find top performers in growth
  const productGrowth = [];
  // Use API comparison data - the API fetches year-over-year comparison regardless of columnOrder
  if (productSales.length > 0) {
    productSales.forEach(product => {
      // For API data, use the prevValue if available
      let prevSales = 0;
      
      if (productPerformanceData && !loadingProductData) {
        // Use API data with previous values (year-over-year comparison)
        prevSales = product.prevValue || 0;
      }
      
      if (prevSales > 0) {
        const growthPercent = ((product.value - prevSales) / prevSales) * 100;
        productGrowth.push({ 
          name: product.name, 
          growth: growthPercent, 
          currentSales: product.value,
          prevSales: prevSales 
        });
      }
    });
  }
  
  productGrowth.sort((a, b) => b.growth - a.growth);
  
  // Top 3 Product Groups by Sales Value, showing their Growth %
  const top3ProductsBySales = productSales.slice(0, 3);
  
  // For each top product by sales, find their growth % and sales percentage
  const top3ProductsWithGrowth = top3ProductsBySales.map(product => {
    const growthData = productGrowth.find(g => g.name === product.name);
    const growthPercent = growthData ? growthData.growth : 0;
    const salesPercent = totalProductSales > 0 ? (product.value / totalProductSales * 100) : 0;
    
    
    return {
      name: product.name,
      sales: product.value,
      salesPercent: salesPercent,
      growth: growthPercent
    };
  });
  
  // Keep sales ranking order - DO NOT sort by growth
  // top3ProductsWithGrowth is already in correct order (by sales %)
  
  // Render as 3 separate lines with bigger emojis
  const topProductGroupDisplay = (
    <div>
      {top3ProductsWithGrowth.map((p, index) => {
        const isPositive = p.growth > 0;
        const arrow = isPositive ? '▲' : '▼';
        const growthWord = isPositive ? 'growth' : 'decline';
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        return (
          <div key={index} style={{ 
            marginBottom: '12px', 
            display: 'flex', 
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: index < 2 ? '1px solid rgba(102, 126, 234, 0.1)' : 'none'
          }}>
            <span style={{ 
              fontSize: '1.8em', 
              marginRight: '12px',
              minWidth: '32px',
              textAlign: 'center'
            }}>{rankIcon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '600', 
                marginBottom: '4px',
                fontSize: '1.05em'
              }}>{p.name}</div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '0.9em'
              }}>
                <span>{p.salesPercent.toFixed(1)}% of sales</span>
                <span className={isPositive ? 'arrow-positive' : 'arrow-negative'}>
                  {arrow} {p.growth < 0 ? Math.abs(p.growth).toFixed(1) : Math.abs(p.growth).toFixed(0)}% {growthWord}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
  
  const totalKgs = productKgs.reduce((sum, p) => sum + p.value, 0);
  const totalMoRM = productMoRM.reduce((sum, p) => sum + p.value, 0);
  const totalSalesForAvg = productSales.reduce((sum, p) => sum + p.value, 0);
  const avgSellingPrice = totalKgs > 0 ? totalSalesForAvg / totalKgs : 0;
  const avgMoRM = totalKgs > 0 ? totalMoRM / totalKgs : 0;
  
  
  // Calculate previous period values for growth
  // API fetches year-over-year comparison data, so we don't need to check columnOrder
  const getPreviousPeriodData = (dataType) => {
    // Use API data if available - it already includes previous year data
    if (productPerformanceData && !loadingProductData) {
      const products = productPerformanceData.products || [];
      return products.reduce((total, product) => {
        if (dataType === 'kgs') return total + (product.kgs_prev || 0);
        if (dataType === 'sales') return total + (product.sales_prev || 0);
        if (dataType === 'morm') return total + (product.morm_prev || 0);
        return total;
      }, 0);
    }
    
    return 0;
  };
  
  const totalKgsPrev = getPreviousPeriodData('kgs');
  const totalSalesPrev = getPreviousPeriodData('sales');
  const totalMoRMPrev = getPreviousPeriodData('morm');
  const avgSellingPricePrev = totalKgsPrev > 0 ? totalSalesPrev / totalKgsPrev : 0;
  const avgMoRMPrev = totalKgsPrev > 0 ? totalMoRMPrev / totalKgsPrev : 0;
  
  // Calculate Process and Material category breakdowns
  const getProcessCategories = () => {
    // Use API data only for FP division
    if (productPerformanceData && !loadingProductData) {
      return productPerformanceData.processCategories || {};
    }
    
    // No Excel fallback for FP division - database only
    return {};
  };
  
  const getMaterialCategories = () => {
    // Use API data only for FP division
    if (productPerformanceData && !loadingProductData) {
      return productPerformanceData.materialCategories || {};
    }
    
    // No Excel fallback for FP division - database only
    return {};
  };
  
  const processCategories = getProcessCategories();
  const materialCategories = getMaterialCategories();
  
  
  const formatKgs = (kgs) => {
    const mt = kgs / 1000; // Convert kg to metric tons
    if (mt >= 1000000) return (mt / 1000000).toFixed(1) + 'M MT';
    if (mt >= 1000) return (mt / 1000).toFixed(1) + 'K MT';
    if (mt >= 1) return mt.toFixed(0) + ' MT';
    return kgs.toLocaleString() + ' kg'; // For very small values, keep kg
  };
  
  
  // Geographic Distribution - Use API data for FP, Excel for others
  let regionalPercentages = {};
  let localSales = 0;
  let exportSales = 0;
  let exportRegionsWithRelativePercentage = [];
  let smallRegions = []; // Store small regions for Others category tooltip

   if (geographicData && !loadingGeographicData) {
     // Use API data
     const countrySales = geographicData.countrySales || [];
     const regionalSales = geographicData.regionalSales || {};
     const totalCountrySales = geographicData.totalSales || 0;
    regionalPercentages = geographicData.regionalPercentages || {};
    localSales = geographicData.localPercentage || 0;
    exportSales = geographicData.exportPercentage || 0;
    
    // Get regions with meaningful percentages (excluding UAE and < 0.1%)
    const significantRegions = Object.entries(regionalPercentages)
      .filter(([region, percentage]) => region !== 'UAE' && percentage >= 0.1)
      .sort((a, b) => b[1] - a[1]);
    
    // Get small regions (< 0.1%) and group them into "Others"
    smallRegions = Object.entries(regionalPercentages)
      .filter(([region, percentage]) => region !== 'UAE' && percentage > 0 && percentage < 0.1);
    
    const othersPercentage = smallRegions.reduce((sum, [, percentage]) => sum + percentage, 0);
    
    // Create export regions array with Others category if needed
    const exportRegions = [...significantRegions];
    if (othersPercentage > 0) {
      exportRegions.push(['Others', othersPercentage]);
    }

    // Calculate percentages relative to export total
    exportRegionsWithRelativePercentage = exportRegions.map(([region, percentage]) => {
      const relativePercentage = exportSales > 0 ? (percentage / exportSales) * 100 : 0;
      return [region, percentage, relativePercentage];
    });
  } else {
    // No data available - either loading or error
    // FP division should only use database APIs, no Excel fallback
  }
  
  // Customer Insights
  let avgSalesPerCustomer = 0;
  let customerSales = [];
  
  if (customerInsightsData && !loadingCustomerInsights) {
    // Use API data with merge rules applied
    avgSalesPerCustomer = customerInsightsData.avgSalesPerCustomer;
    customerSales = customerInsightsData.customers || [];
    
  } else {
    // No data available - either loading or error
    // FP division should only use database APIs, no Excel fallback
  }

  // Render - Updated formatting v2.0 
  return (
    <div className="kpi-dashboard" key="kpi-dashboard-v2">
      <h2>
        Executive Summary – {divisionNames[selectedDivision.replace(/-.*$/, '')] || selectedDivision}
      </h2>
      <div>
        <span>{basePeriodName}</span>
      </div>
      <div>
        <span className="kpi-period-vs">Vs</span>
      </div>
      <div>
        <span>{comparisonPeriodName}</span>
      </div>
      {/* Financial Performance */}
      <div className="kpi-section financial-performance-section">
        <ErrorBoundary>
          <FinancialPerformance 
            sales={sales}
            salesPrev={salesPrev}
            grossProfit={grossProfit}
            grossProfitPrev={grossProfitPrev}
            netProfit={netProfit}
            netProfitPrev={netProfitPrev}
            ebitda={ebitda}
            ebitdaPrev={ebitdaPrev}
          />
        </ErrorBoundary>
      </div>
      {/* Product Performance */}
      <div className="kpi-section product-performance-section">
        <h3 className="kpi-section-title">📦 Product Performance</h3>
        
        {/* Loading State */}
        {loadingProductData && (
          <div className="kpi-cards">
            <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
              <div className="kpi-icon">⏳</div>
              <div className="kpi-label">Loading Product Performance Data...</div>
              <div className="kpi-value">Please wait</div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {productPerformanceError && !loadingProductData && (
          <div className="kpi-cards">
            <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
              <div className="kpi-icon">⚠️</div>
              <div className="kpi-label">Product Performance Error</div>
              <div className="kpi-value">{productPerformanceError}</div>
              <div className="kpi-trend">Please try refreshing or check server logs</div>
            </div>
          </div>
        )}
        
        {/* Row 1: Top Revenue Drivers - Full Width */}
        <div className="kpi-cards">
          <div className="kpi-card revenue-drivers" style={{ gridColumn: '1 / -1', minHeight: 'auto' }}>
            <div className="kpi-icon">🏆</div>
            <div className="kpi-label">Top Revenue Drivers</div>
            <div className="kpi-value">{topProductGroupDisplay}</div>
          </div>
        </div>
        
        {/* Row 2: Total Sales Volume + Selling Price + MoRM */}
        <div className="kpi-cards">
          <div className="kpi-card"><div className="kpi-icon">📊</div><div className="kpi-label">Total Sales Volume</div><div className="kpi-value">{formatKgs(totalKgs)}</div><div className="kpi-trend">{growth(totalKgs, totalKgsPrev)}</div></div>
          <div className="kpi-card"><div className="kpi-icon">⚡</div><div className="kpi-label">Selling Price</div><div className="kpi-value">{formatAEDPerKg(avgSellingPrice)}</div><div className="kpi-trend">{growth(avgSellingPrice, avgSellingPricePrev)}</div></div>
          <div className="kpi-card"><div className="kpi-icon">🎯</div><div className="kpi-label">MoRM</div><div className="kpi-value">{formatAEDPerKg(avgMoRM)}</div><div className="kpi-trend">{growth(avgMoRM, avgMoRMPrev)}</div></div>
        </div>
        
        {/* Row 3: Process Categories - Dynamic sizing based on number of categories */}
        <div className="kpi-cards category-cards">
          {Object.entries(processCategories)
            .filter(([categoryName, data]) => categoryName.toUpperCase() !== 'OTHERS')
            .map(([categoryName, data], index) => {
            const sellingPrice = data.kgs > 0 ? data.sales / data.kgs : 0;
            const morm = data.kgs > 0 ? data.morm / data.kgs : 0;
            
            // Calculate % of Sales
            const totalSales = Object.values(processCategories).reduce((sum, cat) => sum + cat.sales, 0);
            const salesPercentage = totalSales > 0 ? (data.sales / totalSales * 100) : 0;
            
            // Calculate Growth % (real calculation using previous year same period)
            let salesGrowth = 0;
            let priceGrowth = 0;
            let mormGrowth = 0;
            
            // Define previous period: same period type but previous year
            // e.g., if HY1 2025, then previous period is HY1 2024
            const previousYear = basePeriod.year - 1;
            
            // Convert month names to numbers for comparison with Excel data
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNumbers = basePeriod.months.map(month => monthNames.indexOf(month) + 1);
            
            const previousPeriod = {
              year: previousYear,
              months: monthNumbers, // Use month numbers instead of names
              type: basePeriod.type
            };
            
            if (previousPeriod && productPerformanceData) {
              // Use API data for growth calculations (already includes previous period data)
              let prevSales = 0;
              let prevKgs = 0;
              let prevMorm = 0;
              
              // Aggregate previous period data from API for this category
              productPerformanceData.products.forEach(product => {
                if (categoryName === product.process) {
                  prevSales += product.sales_prev || 0;
                  prevKgs += product.kgs_prev || 0;
                  prevMorm += product.morm_prev || 0;
                }
              });
              
              // Calculate growth percentages
              if (prevSales > 0) {
                salesGrowth = ((data.sales - prevSales) / prevSales) * 100;
              }
              if (prevKgs > 0) {
                const prevSellingPrice = prevSales / prevKgs;
                const currentSellingPrice = data.kgs > 0 ? data.sales / data.kgs : 0;
                priceGrowth = prevSellingPrice > 0 ? ((currentSellingPrice - prevSellingPrice) / prevSellingPrice) * 100 : 0;
              }
              if (prevKgs > 0) {
                const prevMormPerKg = prevMorm / prevKgs;
                const currentMormPerKg = data.kgs > 0 ? data.morm / data.kgs : 0;
                mormGrowth = prevMormPerKg > 0 ? ((currentMormPerKg - prevMormPerKg) / prevMormPerKg) * 100 : 0;
              }
              
              // Round to 1 decimal place
              salesGrowth = Math.round(salesGrowth * 10) / 10;
              priceGrowth = Math.round(priceGrowth * 10) / 10;
              mormGrowth = Math.round(mormGrowth * 10) / 10;
              
            }
            
            const salesArrow = salesGrowth > 0 ? '▲' : '▼';
            const priceArrow = priceGrowth > 0 ? '▲' : '▼';
            const mormArrow = mormGrowth > 0 ? '▲' : '▼';
            
            return (
              <div key={`process-${categoryName}`} className="kpi-card">
                <div className="kpi-label category-highlight">{categoryName.toUpperCase()}</div>
                <div className="kpi-value">
                  <div>
                    % of Sales: {salesPercentage.toFixed(0)}%
                    <span className={`${salesGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{salesArrow} {Math.abs(salesGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{salesGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                  <div>
                    AVG Selling Price: {formatAEDPerKg(sellingPrice)}
                    <span className={`${priceGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{priceArrow} {Math.abs(priceGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{priceGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                  <div>
                    AVG MoRM: {formatAEDPerKg(morm)}
                    <span className={`${mormGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{mormArrow} {Math.abs(mormGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{mormGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Row 4: Material Categories - Dynamic sizing based on number of categories */}
        <div className="kpi-cards category-cards">
          {Object.entries(materialCategories)
            .filter(([categoryName, data]) => categoryName.toUpperCase() !== 'OTHERS')
            .map(([categoryName, data], index) => {
            const sellingPrice = data.kgs > 0 ? data.sales / data.kgs : 0;
            const morm = data.kgs > 0 ? data.morm / data.kgs : 0;
            
            // Calculate % of Sales
            const totalSales = Object.values(materialCategories).reduce((sum, cat) => sum + cat.sales, 0);
            const salesPercentage = totalSales > 0 ? (data.sales / totalSales * 100) : 0;
            
            // Calculate Growth % (real calculation using previous year same period)
            let salesGrowth = 0;
            let priceGrowth = 0;
            let mormGrowth = 0;
            
            // Define previous period: same period type but previous year
            // e.g., if HY1 2025, then previous period is HY1 2024
            const previousYear = basePeriod.year - 1;
            
            // Convert month names to numbers for comparison with Excel data
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNumbers = basePeriod.months.map(month => monthNames.indexOf(month) + 1);
            
            const previousPeriod = {
              year: previousYear,
              months: monthNumbers, // Use month numbers instead of names
              type: basePeriod.type
            };
            
            if (previousPeriod && productPerformanceData) {
              // Use API data for growth calculations (already includes previous period data)
              let prevSales = 0;
              let prevKgs = 0;
              let prevMorm = 0;
              
              // Aggregate previous period data from API for this category
              productPerformanceData.products.forEach(product => {
                if (categoryName === product.material) {
                  prevSales += product.sales_prev || 0;
                  prevKgs += product.kgs_prev || 0;
                  prevMorm += product.morm_prev || 0;
                }
              });
              
              // Calculate growth percentages
              if (prevSales > 0) {
                salesGrowth = ((data.sales - prevSales) / prevSales) * 100;
              }
              if (prevKgs > 0) {
                const prevSellingPrice = prevSales / prevKgs;
                const currentSellingPrice = data.kgs > 0 ? data.sales / data.kgs : 0;
                priceGrowth = prevSellingPrice > 0 ? ((currentSellingPrice - prevSellingPrice) / prevSellingPrice) * 100 : 0;
              }
              if (prevKgs > 0) {
                const prevMormPerKg = prevMorm / prevKgs;
                const currentMormPerKg = data.kgs > 0 ? data.morm / data.kgs : 0;
                mormGrowth = prevMormPerKg > 0 ? ((currentMormPerKg - prevMormPerKg) / prevMormPerKg) * 100 : 0;
              }
              
              // Round to 1 decimal place
              salesGrowth = Math.round(salesGrowth * 10) / 10;
              priceGrowth = Math.round(priceGrowth * 10) / 10;
              mormGrowth = Math.round(mormGrowth * 10) / 10;
              
            }
            
            const salesArrow = salesGrowth > 0 ? '▲' : '▼';
            const priceArrow = priceGrowth > 0 ? '▲' : '▼';
            const mormArrow = mormGrowth > 0 ? '▲' : '▼';
            
            return (
              <div key={`material-${categoryName}`} className="kpi-card">
                <div className="kpi-label category-highlight">{categoryName.toUpperCase()}</div>
                <div className="kpi-value">
                  <div>
                    % of Sales: {salesPercentage.toFixed(0)}%
                    <span className={`${salesGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{salesArrow} {Math.abs(salesGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{salesGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                  <div>
                    AVG Selling Price: {formatAEDPerKg(sellingPrice)}
                    <span className={`${priceGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{priceArrow} {Math.abs(priceGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{priceGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                  <div>
                    AVG MoRM: {formatAEDPerKg(morm)}
                    <span className={`${mormGrowth > 0 ? 'arrow-positive' : 'arrow-negative'} growth-indicator`}>{mormArrow} {Math.abs(mormGrowth).toFixed(1)}%</span>
                    <div className="kpi-trend">{mormGrowth > 0 ? 'Growth' : 'Decline'} </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Geographic Distribution */}
      <div className="kpi-section geographic-distribution-section">
        <h3 className="kpi-section-title">🌍 Geographic Distribution</h3>
        
        {/* Loading State */}
        {loadingGeographicData && (
          <div className="kpi-cards">
            <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
              <div className="kpi-icon">⏳</div>
              <div className="kpi-label">Loading Geographic Data...</div>
              <div className="kpi-value">Please wait</div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {geographicDataError && !loadingGeographicData && (
          <div className="kpi-cards">
            <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
              <div className="kpi-icon">⚠️</div>
              <div className="kpi-label">Geographic Data Error</div>
              <div className="kpi-value">{geographicDataError}</div>
              <div className="kpi-trend">Please try refreshing or check server logs</div>
            </div>
          </div>
        )}
        
        {/* Data Display - Only show if we have valid data */}
        {geographicData && !loadingGeographicData && !geographicDataError && (
          <>
            {/* Row 1: Local vs Export - Always centered with 2 equal cards */}
            <div className="kpi-cards">
              <div className="kpi-card large">
                <div className="uae-icon-container">
                  {/* Embedded UAE Flag SVG */}
                  <svg className="uae-icon" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
                    <rect width="900" height="200" fill="#00732f"/>
                    <rect width="900" height="200" y="200" fill="#ffffff"/>
                    <rect width="900" height="200" y="400" fill="#000000"/>
                    <rect width="300" height="600" fill="#ff0000"/>
                  </svg>
                </div>
                <div className="kpi-label">UAE</div>
                <div className="kpi-value">{localSales.toFixed(1)}%</div>
                <div className="kpi-trend">of total sales</div>
              </div>
              <div className="kpi-card large">
                <div className="rotating-emoji-container">
                  <div className="rotating-emoji">🌍</div>
                </div>
                <div className="kpi-label">Export</div>
                <div className="kpi-value">{exportSales.toFixed(1)}%</div>
                <div className="kpi-trend">of total sales</div>
              </div>
            </div>
        
        {/* Visual connector from Export card to regional cards */}
        {exportRegionsWithRelativePercentage.length > 0 && (
          <div className="export-connector">
            <div className="export-connector__arrow" />
            <div className="export-connector__bracket" />
          </div>
        )}
        {exportRegionsWithRelativePercentage.length > 0 && (
          <div className="kpi-cards export-regions">
            {exportRegionsWithRelativePercentage.map(([regionName, absolutePercentage, relativePercentage], index) => {
              // Use different globe emojis for different regions
              const regionGlobes = {
                'Arabian Peninsula': '🌍', // Africa/Europe view (Middle East visible)
                'West Asia': '🌍', // Africa/Europe view (Middle East visible)
                'Southern Africa': '🌍', // Africa/Europe view
                'Levant': '🌍', // Africa/Europe view (Middle East visible)
                'North Africa': '🌍', // Africa/Europe view
                'Europe': '🌍', // Africa/Europe view
                'Americas': '🌎', // Americas view
                'Asia-Pacific': '🌏', // Asia/Australia view
                'Unassigned': '🌐', // Generic globe
                'Others': '🌐' // Generic globe for small regions
              };

              // Calculate gradient color based on percentage - ENHANCED VERSION
              const getGradientColor = (percentage) => {
                // Use distinct colors for different percentage ranges
                if (percentage >= 20) {
                  return '#1e40af'; // Deep blue for high percentages (20%+)
                } else if (percentage >= 15) {
                  return '#3b82f6'; // Medium blue (15-20%)
                } else if (percentage >= 10) {
                  return '#60a5fa'; // Light blue (10-15%)
                } else if (percentage >= 5) {
                  return '#93c5fd'; // Lighter blue (5-10%)
                } else {
                  return '#dbeafe'; // Very light blue (0-5%)
                }
              };

              const gradientColor = getGradientColor(absolutePercentage);
              
              return (
                <div 
                  key={regionName} 
                  className="kpi-card"
                  style={{
                    background: `linear-gradient(135deg, ${gradientColor}, ${gradientColor}cc)`,
                    borderLeft: `4px solid ${gradientColor}`,
                    boxShadow: `0 4px 12px ${gradientColor}44`,
                    color: absolutePercentage >= 10 ? 'white' : '#1a365d' // White text for darker backgrounds
                  }}
                >
                  <div className="region-globe-container">
                    <div className="region-globe">{regionGlobes[regionName] || '🌐'}</div>
                  </div>
                  <div className="kpi-label" style={{ 
                    color: absolutePercentage >= 10 ? 'white' : '#2d3748', 
                    fontWeight: '700' 
                  }}>{regionName}</div>
                  <div className="kpi-value" style={{ 
                    color: absolutePercentage >= 10 ? 'white' : '#1a365d', 
                    fontWeight: '800' 
                  }}>{absolutePercentage.toFixed(1)}%</div>
                  <div className="kpi-trend" style={{ 
                    color: absolutePercentage >= 10 ? '#e2e8f0' : '#4a5568' 
                  }}>{relativePercentage.toFixed(1)}% of export</div>
                  {geographicData?.regionalGrowth && geographicData.regionalGrowth[regionName] !== undefined && regionName !== 'Others' && (
                    <div className="kpi-growth" style={{ 
                      color: geographicData.regionalGrowth[regionName] >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '14px',
                      fontWeight: '700',
                      marginTop: '2px'
                    }}>
                      <span style={{ fontWeight: '900' }}>
                        {geographicData.regionalGrowth[regionName] >= 0 ? '↑' : '↓'} {Math.abs(geographicData.regionalGrowth[regionName]).toFixed(1)}%
                      </span>
                      <div style={{ 
                        fontSize: '10px', 
                        fontWeight: '400',
                        color: absolutePercentage >= 10 ? '#e2e8f0' : '#666',
                        marginTop: '2px'
                      }}>
                        {geographicData.regionalGrowth[regionName] >= 0 ? 'Growth' : 'Decline'}                       </div>
                    </div>
                  )}
                  {regionName === 'Others' && smallRegions.length > 0 && (
                    <div className="kpi-tooltip" style={{ 
                      fontSize: '10px', 
                      color: absolutePercentage >= 10 ? '#e2e8f0' : '#666', 
                      marginTop: '2px',
                      fontStyle: 'italic'
                    }}>
                      Includes: {smallRegions.map(([name]) => name).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
       {/* Customer Insights */}
       <div className="kpi-section customer-insights-section">
         <h3 className="kpi-section-title">👥 Customer Insights</h3>
         
         {/* Loading State */}
         {loadingCustomerInsights && (
           <div className="kpi-cards">
             <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
               <div className="kpi-icon">⏳</div>
               <div className="kpi-label">Loading Customer Insights Data...</div>
               <div className="kpi-value">Please wait</div>
             </div>
           </div>
         )}
         
         {/* Error State */}
         {customerInsightsError && !loadingCustomerInsights && (
           <div className="kpi-cards">
             <div className="kpi-card large" style={{ gridColumn: '1 / -1' }}>
               <div className="kpi-icon">⚠️</div>
               <div className="kpi-label">Customer Insights Error</div>
               <div className="kpi-value">{customerInsightsError}</div>
               <div className="kpi-trend">Please try refreshing or check server logs</div>
             </div>
           </div>
         )}
         
         {/* Data Display - Only show if we have valid data */}
         {customerInsightsData && !loadingCustomerInsights && !customerInsightsError && (
           <ErrorBoundary>
             <CustomerInsights customerSales={customerSales} avgSalesPerCustomer={avgSalesPerCustomer} />
           </ErrorBoundary>
         )}
       </div>
    </div>
  );
};

export default KPIExecutiveSummary;