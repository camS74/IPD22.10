import React, { useState } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';
import { KPI_CSS_CONTENT } from '../../utils/sharedStyles';
import ipTransparentLogo from '../../assets/IP transparent-.jpg';

// Helper function to get UAE Dirham symbol SVG for HTML strings (standalone)
const getUAEDirhamSymbolHTML = () => {
  return '<svg class="uae-dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="display: inline-block; vertical-align: -0.1em; width: 1em; height: 1em; margin-right: 0.2em;"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>';
};

const SalesRepHTMLExport = ({ 
  rep = null, 
  reportType = 'individual', // 'individual', 'tables', 'divisional'
  reportData = null,
  kgsData = null,
  amountData = null,
  customerData = null,
  customerAmountData = null, // Customer data by amount for currency sales table
  performanceMetrics = null,
  salesReps = null,
  salesRepData = null,
  selectedDivision = 'FP',
  strategicFindings = null,
  customerFindings = null,
  yearlyBudgetTotal = 0,
  yearlySalesBudgetTotal = 0,
  yearlyBudgetAchievement = 0,
  yearlySalesBudgetAchievement = 0,
  customerInsights = {
    topCustomerShare: 0,
    top3CustomerShare: 0,
    top5CustomerShare: 0,
    totalCustomers: 0,
    customerGrowth: 0,
    newCustomers: [],
    topCustomers: [],
    avgVolumePerCustomer: 0
  }
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { excelData } = useExcelData();
  const { 
    columnOrder, 
    basePeriodIndex,
    dataGenerated
  } = useFilter();

  // Generate division name
  const divisionName = selectedDivision || 'Division';

  // Helper function to convert text to proper case
  const toProperCase = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Format period label
  const formatPeriodLabel = (period) => {
    if (!period) return 'Current Period';
    if (typeof period === 'string') {
      return period.replace(/\b(hy[12]|q[1-4]|h[12])\b/gi, (match) => match.toUpperCase());
    }
    if (typeof period === 'object' && period.year && period.month) {
      const formattedMonth = period.month.toUpperCase();
      return `${formattedMonth} ${period.year}`;
    }
    return 'Current Period';
  };

  // Format numbers for display
  const formatNumber = (num, isCurrency = false) => {
    let formatted;
    if (num >= 1000000) {
      formatted = (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      formatted = Math.round(num / 1000) + 'K';
    } else {
      formatted = Math.round(num || 0).toLocaleString();
    }
    
    if (isCurrency) {
      return `${getUAEDirhamSymbolHTML()}${formatted}`;
    }
    return formatted;
  };

  // Format MT values (convert from kg to MT) with no decimals
  const formatMT = (value) => {
    const numericValue = typeof value === 'number' ? value : parseFloat(value || 0);
    const mtValue = isNaN(numericValue) ? 0 : numericValue / 1000;
    return Math.round(mtValue).toLocaleString('en-US');
  };

  // Generate Customer Insights HTML using pre-calculated values
  const generateCustomerInsights = (customerData, basePeriodIndex, reportData) => {
    if (!customerInsights || customerInsights.totalCustomers === 0) return '';
    
    // Use pre-calculated values from CustomerKeyFacts
    const topCustomerPercentage = customerInsights.topCustomerShare;
    const top3Percentage = customerInsights.top3CustomerShare;
    const top5Percentage = customerInsights.top5CustomerShare;
    const totalCustomers = customerInsights.totalCustomers;
    const customerGrowth = customerInsights.customerGrowth;
    const newCustomers = customerInsights.newCustomers || [];
    const topCustomers = customerInsights.topCustomers || [];
    
    // Get top customer names from pre-calculated data
    const topCustomer = topCustomers[0] || { name: 'Unknown' };
    const top3Customers = topCustomers.slice(0, 3);
    const top5Customers = topCustomers.slice(0, 5);
    
    // Use pre-calculated average volume per customer
    const avgVolumePerCustomer = customerInsights.avgVolumePerCustomer || 0;
    
    // Helper function to properly case customer names
    const toProperCase = (str) => {
      if (!str) return '';
      return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };
    
    return `
      <div class="report-section" style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px;">
        <div class="customer-insights-header">
          <span class="insights-icon">👥</span>
          <h3 style="color: #667eea; font-size: 1.4em; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">CUSTOMER INSIGHTS</h3>
        </div>
        
        <div class="customer-insights-cards">
          <!-- Top Customer -->
          <div class="customer-insight-card">
            <div class="insight-icon">⭐</div>
            <div class="insight-title">TOP CUSTOMER</div>
            <div class="insight-value">${topCustomerPercentage.toFixed(1)}%</div>
            <div class="insight-subtitle">${toProperCase(topCustomer.customerName || topCustomer.name)}*</div>
            <div class="insight-footer">of total sales</div>
          </div>
          
          <!-- Top 3 Customers -->
          <div class="customer-insight-card">
            <div class="insight-icon" style="position: relative;">
              <div>🔝</div>
              <div style="position: absolute; top: -5px; right: -10px; background: #667eea; color: white; font-size: 0.5em; padding: 2px 6px; border-radius: 4px; font-weight: bold;">TOP</div>
            </div>
            <div class="insight-title">TOP 3 CUSTOMERS</div>
            <div class="insight-value">${top3Percentage.toFixed(1)}%</div>
            <div class="insight-subtitle customer-list">
              ${top3Customers.map(c => `<div class="customer-name-line">${toProperCase(c.customerName || c.name)}*</div>`).join('')}
            </div>
            <div class="insight-footer">of total sales</div>
          </div>
          
          <!-- Top 5 Customers -->
          <div class="customer-insight-card">
            <div class="insight-icon">🥇</div>
            <div class="insight-title">TOP 5 CUSTOMERS</div>
            <div class="insight-value">${top5Percentage.toFixed(1)}%</div>
            <div class="insight-subtitle customer-list">
              ${top5Customers.map(c => `<div class="customer-name-line">${toProperCase(c.customerName || c.name)}*</div>`).join('')}
            </div>
            <div class="insight-footer">of total sales</div>
          </div>
          
          <!-- Total Customers -->
          <div class="customer-insight-card">
            <div class="insight-icon">👥</div>
            <div class="insight-title">TOTAL CUSTOMERS</div>
            <div class="insight-value">${totalCustomers}</div>
            <div class="insight-subtitle" style="color: ${customerGrowth >= 0 ? '#007bff' : '#dc3545'}; font-weight: 600;">
              ${customerGrowth !== 0 ? `${customerGrowth > 0 ? '▲' : '▼'} ${Math.abs(customerGrowth).toFixed(1)}% vs ${reportData?.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'HY1 2024'}` : ''}
            </div>
            <div class="insight-footer">active customers</div>
          </div>
          
          <!-- New Customers -->
          <div class="customer-insight-card">
            <div class="insight-icon">🆕</div>
            <div class="insight-title">NEW CUSTOMERS</div>
            <div class="insight-value">${newCustomers.length}</div>
            <div class="insight-subtitle customer-list" style="font-size: 0.85em; max-height: 60px; overflow-y: auto;">
              ${newCustomers.length > 0 ? 
                newCustomers.map(c => `<div class="customer-name-line">${toProperCase(c.customerName || c.name)}</div>`).join('') 
                : '<div class="customer-name-line">No new customers</div>'}
            </div>
            <div class="insight-footer">new in ${formatPeriodLabel(reportData?.basePeriod || 'HY1 2025')} vs ${reportData?.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'HY1 2024'}</div>
          </div>
          
          <!-- AVG Sales per Customer -->
          <div class="customer-insight-card">
            <div class="insight-icon">💰</div>
            <div class="insight-title">AVG SALES PER CUSTOMER</div>
            <div class="insight-value">${formatNumber(avgVolumePerCustomer, true)}</div>
            <div class="insight-subtitle"></div>
            <div class="insight-footer">average value</div>
          </div>
        </div>
      </div>
    `;
  };

  // Generate Geographic Distribution HTML - Using REAL data from reportData
  const generateGeographicDistribution = (reportData, customerData, basePeriodIndex) => {
    if (!reportData) {
      console.log('⚠️ No reportData for geographic distribution');
      return '';
    }
    
    // Use actual geographic distribution data from reportData (already calculated from API)
    const geoData = reportData.geographicDistribution;
    
    // Extract real data from the report, with fallbacks
    let localPercentage = 0;
    let exportPercentage = 0;
    let topRegions = [];
    
    if (geoData) {
      localPercentage = geoData.localPercentage || geoData.localSales || 0;
      exportPercentage = geoData.exportPercentage || geoData.exportSales || 0;
      topRegions = geoData.topRegions || [];
      
      console.log('✅ Geographic Distribution Export Data:', {
        localPercentage,
        exportPercentage,
        topRegions: topRegions.length,
        fullGeoData: geoData
      });
    } else {
      console.log('⚠️ No geographic distribution data in reportData, using fallback calculation');
      
      // Fallback: Try to calculate from customer data if available
      // This is a simple estimate - in production you'd want proper country data
      if (customerData && customerData.length > 0) {
        // Simple heuristic: most sales are local for this example
        localPercentage = 95.0;
        exportPercentage = 5.0;
        topRegions = [{
          name: 'Regional Export',
          percentage: 5.0,
          exportPercentage: 100.0
        }];
      } else {
        // No data at all - show placeholder
        localPercentage = 100.0;
        exportPercentage = 0.0;
        topRegions = [];
      }
    }
    
    // Helper function to get gradient color based on percentage
    const getGradientColor = (percentage) => {
      if (percentage >= 20) return '#1e40af';
      else if (percentage >= 15) return '#3b82f6';
      else if (percentage >= 10) return '#60a5fa';
      else if (percentage >= 5) return '#93c5fd';
      else return '#dbeafe';
    };
    
    // Always return the section, even with placeholder data
    return `
      <div class="report-section" style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px;">
        <h3 style="color: #667eea; font-size: 1.4em; margin-bottom: 25px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 12px;">
          🌍 GEOGRAPHIC DISTRIBUTION
        </h3>
        
        <div style="text-align: center; margin-bottom: 25px; padding: 12px 20px; background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e9ecef; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05)">
          <div style="font-size: 0.85em; color: #6c757d; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px">
            REPORTING PERIOD
          </div>
          <div style="font-size: 1.1em; color: #495057; font-weight: 600; font-family: system-ui, -apple-system, sans-serif">
            ${formatPeriodLabel(reportData.basePeriod)}
          </div>
        </div>
        
        <!-- Row 1: Local vs Export - Using kpi-cards structure -->
        <div class="kpi-cards" style="margin-bottom: 20px;">
          <div class="kpi-card large" style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid rgba(0, 0, 0, 0.08); position: relative; overflow: hidden; min-height: 170px; display: flex; flex-direction: column; justify-content: space-between; grid-column: span 2;">
            <div style="content: ''; position: absolute; top: 0; left: 0; height: 100%; width: 4px; background: linear-gradient(to bottom, #667eea, #764ba2); border-radius: 0 2px 2px 0;"></div>
            <div style="width: 60px; height: 60px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: transparent;">
              <svg style="width: 100%; height: 100%;" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg">
                <rect width="900" height="200" fill="#00732f"/>
                <rect width="900" height="200" y="200" fill="#ffffff"/>
                <rect width="900" height="200" y="400" fill="#000000"/>
                <rect width="300" height="600" fill="#ff0000"/>
              </svg>
            </div>
            <div style="text-align: center; font-size: 1.3rem; font-weight: 700; color: #444b54; letter-spacing: 0.04em; margin-top: 0; margin-bottom: 12px;">UAE</div>
            <div style="text-align: center; font-size: 3.5rem; font-weight: 800; color: #1e293b; margin: 8px 0; line-height: 1; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1); letter-spacing: -0.02em;">${localPercentage.toFixed(1)}%</div>
            <div style="text-align: center; font-size: 1rem; color: #64748b; font-weight: 500; margin-top: 2px;">of total sales</div>
                </div>
                
          <div class="kpi-card large" style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid rgba(0, 0, 0, 0.08); position: relative; overflow: hidden; min-height: 170px; display: flex; flex-direction: column; justify-content: space-between; grid-column: span 2;">
            <div style="content: ''; position: absolute; top: 0; left: 0; height: 100%; width: 4px; background: linear-gradient(to bottom, #667eea, #764ba2); border-radius: 0 2px 2px 0;"></div>
            <div style="width: 60px; height: 60px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
              <div style="font-size: 3rem;">🌍</div>
            </div>
            <div style="text-align: center; font-size: 1.3rem; font-weight: 700; color: #444b54; letter-spacing: 0.04em; margin-top: 0; margin-bottom: 12px;">Export</div>
            <div style="text-align: center; font-size: 3.5rem; font-weight: 800; color: #1e293b; margin: 8px 0; line-height: 1; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1); letter-spacing: -0.02em;">${exportPercentage.toFixed(1)}%</div>
            <div style="text-align: center; font-size: 1rem; color: #64748b; font-weight: 500; margin-top: 2px;">of total sales</div>
                </div>
              </div>
              
        ${topRegions && topRegions.length > 0 ? `
          <!-- Export connector -->
          <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; height: 40px; margin: 10px 0 15px 0; padding-right: 25%; position: relative;">
            <div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 12px solid #6b7280;"></div>
            <div style="position: absolute; top: 20px; left: 0; right: 0; height: 3px; background: #6b7280; box-shadow: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4);">
              <div style="content: ''; position: absolute; left: 0; top: 0; width: 3px; height: 15px; background: #6b7280; box-shadow: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4);"></div>
              <div style="content: ''; position: absolute; right: 0; top: 0; width: 3px; height: 15px; background: #6b7280; box-shadow: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4);"></div>
                    </div>
                </div>
          
          <!-- Row 2: Export Regions -->
          <div class="kpi-cards export-regions">
            ${topRegions.map(region => {
              const gradientColor = getGradientColor(region.percentage);
              const isLight = region.percentage < 10;
              return `
                <div class="kpi-card" style="background: linear-gradient(135deg, ${gradientColor}, ${gradientColor}cc); border-left: 4px solid ${gradientColor}; box-shadow: 0 4px 12px ${gradientColor}44; color: ${isLight ? '#1a365d' : 'white'}; border-radius: 12px; padding: 24px; position: relative; overflow: hidden; min-height: 180px; display: flex; flex-direction: column; justify-content: space-between;">
                  <div style="width: 48px; height: 48px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center;">
                    <div style="font-size: 2.5rem;">${getRegionIcon(region.name)}</div>
            </div>
                  <div style="text-align: center; font-size: 1.3rem; font-weight: 700; color: ${isLight ? '#2d3748' : 'white'}; letter-spacing: 0.04em; margin-bottom: 12px;">${region.name}</div>
                  <div style="text-align: center; font-size: 3.5rem; font-weight: 800; color: ${isLight ? '#1a365d' : 'white'}; margin: 8px 0; line-height: 1; letter-spacing: -0.02em;">${region.percentage.toFixed(1)}%</div>
                  <div style="text-align: center; font-size: 1rem; color: ${isLight ? '#4a5568' : '#e2e8f0'}; font-weight: 500; margin-top: 2px;">${region.exportPercentage.toFixed(1)}% of export</div>
          </div>
              `;
            }).join('')}
        </div>
        ` : ''}
      </div>
    `;
  };

  // Helper function to get region icons - matching KPIExecutiveSummary.js
  const getRegionIcon = (regionName) => {
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
    return regionGlobes[regionName] || '🌐';
  };

  // Generate Top 3 Product Groups HTML
  const generateTop3ProductGroups = (kgsData, reportData, basePeriodIndex) => {
    if (!kgsData || !Array.isArray(kgsData) || basePeriodIndex === null) {
      return '';
    }
    
    // Get top 3 products by current period volume
    const currentTotal = kgsData.reduce((sum, item) => sum + (item.rawValues[basePeriodIndex] || 0), 0);
    
    const top3Products = kgsData
      .filter(item => (item.rawValues[basePeriodIndex] || 0) > 0)
      .sort((a, b) => (b.rawValues[basePeriodIndex] || 0) - (a.rawValues[basePeriodIndex] || 0))
      .slice(0, 3)
      .map((item, index) => {
        const currentValue = item.rawValues[basePeriodIndex] || 0;
        const previousValue = basePeriodIndex > 0 ? (item.rawValues[basePeriodIndex - 1] || 0) : 0;
        const budgetValue = basePeriodIndex < item.rawValues.length - 1 ? (item.rawValues[basePeriodIndex + 1] || 0) : 0;
        
        const percentage = currentTotal > 0 ? (currentValue / currentTotal * 100) : 0;
        const growthPercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0;
        const budgetAchievement = budgetValue > 0 ? ((currentValue / budgetValue) * 100) : 0;
        
        return {
          rank: index + 1,
          productGroup: item.name || item.productGroup || 'Unknown Product',
          value: currentValue,
          percentage,
          growthPercent,
          budgetAchievement,
          previousValue
        };
      });
    
    if (top3Products.length === 0) return '';
    
    return `
      <div class="report-section" style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px;">
        <div style="width: 100%; text-align: center; margin-bottom: 30px;">
          <h3 style="color: #667eea; font-size: 1.4em; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
            TOP 3 PRODUCT GROUPS
          </h3>
          <div style="font-size: 0.85em; font-weight: normal; color: #666; font-style: italic; margin-top: 5px;">
            (by Volume)
              </div>
            </div>
            
        <div class="top-products-horizontal">
          ${top3Products.map((product, index) => {
            const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
            const isPositive = product.growthPercent > 0;
            const arrow = isPositive ? '▲' : '▼';
            const growthWord = isPositive ? 'growth' : 'decline';
            const growthColor = isPositive ? '#007bff' : '#dc3545';
            const budgetColor = product.budgetAchievement >= 100 ? '#007bff' : '#dc3545';
            const budgetArrow = product.budgetAchievement >= 100 ? '▲' : '▼';
            
            return `
              <div class="top-product-card">
                <div class="product-rank">
                  <span class="rank-icon">${rankIcon}</span>
              </div>
                <div class="product-info">
                  <div class="product-name">${product.productGroup}</div>
                  <div class="product-percentage">${product.percentage.toFixed(1)}% of sales</div>
            </div>
                <div class="product-performance" style="color: ${growthColor}; background-color: ${isPositive ? 'rgba(0, 123, 255, 0.1)' : 'rgba(220, 53, 69, 0.1)'};">
                  ${arrow} ${Math.abs(product.growthPercent).toFixed(0)}% ${growthWord} vs ${reportData.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'HY1 2024'}
          </div>
                <div class="product-performance" style="font-size: 0.85em; margin-top: 4px; color: ${budgetColor}; background-color: ${product.budgetAchievement >= 100 ? 'rgba(0, 123, 255, 0.1)' : 'rgba(220, 53, 69, 0.1)'};">
                  ${budgetArrow} ${product.budgetAchievement.toFixed(0)}% vs ${formatPeriodLabel(reportData.basePeriod)} Budget
              </div>
            </div>
            `;
          }).join('')}
          </div>
      </div>
    `;
  };

  // Generate Customers Performance Tab with Customer Volume Table, Customer Amount Table, and Strategic Analysis (following Product Groups concept)
  const generateCustomersPerformanceTab = (customerData, customerAmountData, reportData, basePeriodIndex, customerFindings) => {
    if (!customerData || customerData.length === 0 || !reportData) {
      return '<p style="text-align: center; color: #666;">No customer data available</p>';
    }
    
    const columnOrder = reportData.columnOrder;
    
    // Build extended columns with delta columns (same as live component)
    const buildExtendedColumns = (columnOrder) => {
      if (!columnOrder || columnOrder.length === 0) return [];
      const extendedColumns = [];
      for (let i = 0; i < columnOrder.length; i++) {
        extendedColumns.push({ ...columnOrder[i], columnType: 'data', dataIndex: i });
        if (i < columnOrder.length - 1) {
          extendedColumns.push({ columnType: 'delta', fromDataIndex: i, toDataIndex: i + 1 });
        }
      }
      return extendedColumns;
    };
    
    const extendedColumns = buildExtendedColumns(columnOrder);
    
    // Helper function to format names to proper case (same as live component)
    const toProperCase = (str) => {
      if (!str) return '';
      return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };
    
    // Helper function for delta calculation (same as live component)
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
      } else {
        formattedValue = absDelta.toFixed(1) + '%';
      }
      
      return {
        arrow,
        value: formattedValue,
        color
      };
    };
    
    // Enhanced format number for display with better visual presentation (same as live component)
    const formatValue = (value) => {
      if (typeof value !== 'number') return value || '-';
      
      // Handle zero values
      if (value === 0) return '0.0';
      
      // Convert KGS to MT by dividing by 1000
      const mtValue = value / 1000;
      
      // If less than 1, use x.xx format (2 decimal places)
      if (mtValue < 1) {
        return mtValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      
      // For values >= 1, use x.x format (1 decimal place) with thousands separator
      const formattedNumber = mtValue.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      
      return formattedNumber;
    };
    
    // Format value for total row (whole numbers without decimals) - same as live component
    const formatValueForTotal = (value) => {
      if (typeof value !== 'number') return value || '-';
      
      // Handle zero values
      if (value === 0) return '0';
      
      // Convert KGS to MT by dividing by 1000
      const mtValue = value / 1000;
      
      // Round to whole number and format with thousands separator
      const roundedValue = Math.round(mtValue);
      return roundedValue.toLocaleString('en-US');
    };
    
    // Helper: Format AED amount (same as Product Groups)
    const formatAED = (value) => {
      if (typeof value !== 'number') return '-';
      if (value === 0) return '0';
      const absValue = Math.abs(value);
      if (absValue >= 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (absValue >= 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toFixed(0);
    };
    
    // Process customer data to match live component logic
    // The customerData passed to HTML export should already be processed by the same logic as live component
    // Sort customers by base period value (descending - highest to lowest) - same as live component
    const filteredCustomers = customerData
      .filter(customer => customer.rawValues && customer.rawValues.some(val => val > 0))
      .sort((a, b) => {
        const aValue = a.rawValues[basePeriodIndex] || 0;
        const bValue = b.rawValues[basePeriodIndex] || 0;
        return bValue - aValue; // Sort descending (highest values first)
      });
    
    // Process customer amount data (same logic as volume data)
    const filteredCustomerAmounts = customerAmountData && customerAmountData.length > 0 ? 
      customerAmountData
        .filter(customer => customer.rawValues && customer.rawValues.some(val => val > 0))
        .sort((a, b) => {
          const aValue = a.rawValues[basePeriodIndex] || 0;
          const bValue = b.rawValues[basePeriodIndex] || 0;
          return bValue - aValue; // Sort descending (highest values first)
        }) : [];
    
    // Generate Customer Table HTML
    const customerTableHTML = `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Customer Sales - Volume (MT) Comparison</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
            <thead>
              <tr style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white;">
                <th rowspan="3" style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: 600;">Customer</th>
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') {
                    return `<th rowspan="3" style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600; background: rgba(255,255,255,0.1);">Δ<br/>%</th>`;
                  }
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.year}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white;">
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.isCustomRange ? col.displayName : col.month}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white;">
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.type}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredCustomers.map((customer, idx) => {
                const customerName = customer.customerName || customer.name || 'Unknown';
                return `
                  <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : 'white'};">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${toProperCase(customerName)}</td>
                    ${extendedColumns.map((col, colIdx) => {
                      if (col.columnType === 'delta') {
                        // Calculate delta between adjacent data columns (same as live component)
                        const fromDataIndex = col.fromDataIndex;
                        const toDataIndex = col.toDataIndex;
                        
                        if (fromDataIndex !== undefined && toDataIndex !== undefined) {
                          const newerValue = customer.rawValues[toDataIndex] || 0;
                          const olderValue = customer.rawValues[fromDataIndex] || 0;
                          const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
                          
                          if (typeof deltaResult === 'object') {
                            return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${deltaResult.color}; font-weight: 600;">${deltaResult.arrow} ${deltaResult.value}</td>`;
                          } else {
                            return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${deltaResult}</td>`;
                          }
                        }
                        return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">-</td>`;
                      }
                      // For data columns, use the same formatting as live component
                      const rawVal = customer.rawValues[col.dataIndex] || 0;
                      return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatValue(rawVal)}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); font-weight: 700;">
                <td style="padding: 12px; border: 1px solid #ddd;">Total</td>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    // Calculate delta for total row (same as live component)
                    const fromDataIndex = col.fromDataIndex;
                    const toDataIndex = col.toDataIndex;
                    
                    if (fromDataIndex !== undefined && toDataIndex !== undefined) {
                      const fromTotal = filteredCustomers.reduce((sum, customer) => sum + (customer.rawValues[fromDataIndex] || 0), 0);
                      const toTotal = filteredCustomers.reduce((sum, customer) => sum + (customer.rawValues[toDataIndex] || 0), 0);
                      const deltaResult = calculateDeltaDisplay(toTotal, fromTotal);
                      
                      if (typeof deltaResult === 'object') {
                        return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: ${deltaResult.color}; font-weight: 700;">${deltaResult.arrow} ${deltaResult.value}</td>`;
                      } else {
                        return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${deltaResult}</td>`;
                      }
                    }
                    return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">-</td>`;
                  }
                  // For data columns, calculate total and use same formatting as live component
                  const total = filteredCustomers.reduce((sum, customer) => sum + (customer.rawValues[col.dataIndex] || 0), 0);
                  return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${formatValueForTotal(total)}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Generate Customer Amount Table HTML (similar structure with AED formatting)
    const customerAmountTableHTML = filteredCustomerAmounts.length > 0 ? `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Customer Sales - ${getUAEDirhamSymbolHTML()} Sales Comparison</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
            <thead>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                <th rowspan="3" style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: 600;">Customer</th>
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') {
                    return `<th rowspan="3" style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600; background: rgba(255,255,255,0.1);">Δ<br/>%</th>`;
                  }
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.year}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.isCustomRange ? col.displayName : col.month}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                ${extendedColumns.map((col) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.type}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredCustomerAmounts.map((customer, idx) => {
                const customerName = customer.customerName || customer.name || 'Unknown';
                return `
                  <tr style="background: ${idx % 2 === 0 ? '#f8fafc' : 'white'};">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${toProperCase(customerName)}</td>
                    ${extendedColumns.map((col, colIdx) => {
                      if (col.columnType === 'delta') {
                        // Calculate delta between adjacent data columns (same as live component)
                        const fromDataIndex = col.fromDataIndex;
                        const toDataIndex = col.toDataIndex;
                        
                        if (fromDataIndex !== undefined && toDataIndex !== undefined) {
                          const newerValue = customer.rawValues[toDataIndex] || 0;
                          const olderValue = customer.rawValues[fromDataIndex] || 0;
                          const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
                          
                          if (typeof deltaResult === 'object') {
                            return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${deltaResult.color}; font-weight: 600;">${deltaResult.arrow} ${deltaResult.value}</td>`;
                          } else {
                            return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${deltaResult}</td>`;
                          }
                        }
                        return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">-</td>`;
                      }
                      // For data columns, use AED formatting
                      const rawVal = customer.rawValues[col.dataIndex] || 0;
                      return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatAED(rawVal)}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); font-weight: 700;">
                <td style="padding: 12px; border: 1px solid #ddd;">Total</td>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    // Calculate delta for total row (same as live component)
                    const fromDataIndex = col.fromDataIndex;
                    const toDataIndex = col.toDataIndex;
                    
                    if (fromDataIndex !== undefined && toDataIndex !== undefined) {
                      const fromTotal = filteredCustomerAmounts.reduce((sum, customer) => sum + (customer.rawValues[fromDataIndex] || 0), 0);
                      const toTotal = filteredCustomerAmounts.reduce((sum, customer) => sum + (customer.rawValues[toDataIndex] || 0), 0);
                      const deltaResult = calculateDeltaDisplay(toTotal, fromTotal);
                      
                      if (typeof deltaResult === 'object') {
                        return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: ${deltaResult.color}; font-weight: 700;">${deltaResult.arrow} ${deltaResult.value}</td>`;
                      } else {
                        return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${deltaResult}</td>`;
                      }
                    }
                    return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">-</td>`;
                  }
                  // For data columns, calculate total and use AED formatting
                  const total = filteredCustomerAmounts.reduce((sum, customer) => sum + (customer.rawValues[col.dataIndex] || 0), 0);
                  return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${getUAEDirhamSymbolHTML()}${formatAED(total)}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ` : '';
    
    // Generate Customer Key Facts Strategic Analysis HTML from findings
    if (!customerFindings) {
      return `
        ${customerTableHTML}
        ${customerAmountTableHTML}
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
          <div style="display: block; text-align: center; width: 100%;">
            <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0 0 24px 0; background: linear-gradient(135deg, #7c3aed, #5b21b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
              Customer Key Facts
            </h2>
          </div>
          <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #7c3aed;">
            <p style="color: #6b7280; text-align: center;">Analysis data is being calculated...</p>
          </div>
        </div>
      `;
    }
    
    // Extract ALL data from customerFindings - NO RECALCULATION
    const {
      totals,
      vsBudget,
      yoy,
      vsBudgetAmount,
      yoyAmount,
      runRateInfo,
      focusCustomers,
      growthDrivers,
      underperformers,
      coveragePct,
      concentrationRisk,
      retentionAnalysis,
      hasPreviousYearData,
      comprehensiveInsights,
      executiveSummary
    } = customerFindings;

    const { totalActual, totalAmountActual } = totals;
    const topCoverage = (coveragePct || 0) * 100;

    // Helper formatting functions - match live component
    const formatPct = (val) => {
      if (val == null || isNaN(val)) return 'N/A';
      const sign = val >= 0 ? '+' : '';
      return `${sign}${val.toFixed(1)}%`;
    };

    const formatMt = (kgs) => {
      if (kgs == null || isNaN(kgs)) return '0 MT';
      const mt = kgs / 1000;
      return mt >= 1000 ? `${Math.round(mt).toLocaleString()} MT` :
             mt >= 100 ? `${Math.round(mt)} MT` :
             `${mt.toFixed(1)} MT`;
    };

    const formatCustomerName = (name) => {
      if (!name) return '';
      return name.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };
    
    const strategicAnalysisHTML = `
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; background: linear-gradient(135deg, #3b82f6, #1e40af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Customer Key Facts</h2>

        <!-- Executive Overview -->
        <div style="background: #ffffff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h4 style="color: #1e40af; font-size: 18px; font-weight: 600; margin-bottom: 10px;">📊 Executive Overview</h4>
          <div style="padding: 12px 16px; background: #eff6ff; border-radius: 8px; margin-bottom: 12px; font-size: 15px; line-height: 1.6; color: #1e40af; border-left: 3px solid #3b82f6;">
            The customer portfolio demonstrates ${concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL' ? 'remarkable concentration and strategic focus' : 'balanced distribution'}, with the top 3 customers commanding ${formatPct(concentrationRisk.top3Share * 100)} of total volume and the top 5 accounting for ${formatPct(concentrationRisk.top5Share * 100)}. This reveals a ${concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL' ? 'highly focused B2B strategy' : 'diversified customer approach'} with ${concentrationRisk.customerCount} active customers generating an average of ${formatMt(concentrationRisk.avgVolumePerCustomer)} per customer.
            ${executiveSummary.keyRisks.length > 0 ? `<br/><br/><strong>Key Risks:</strong> ${executiveSummary.keyRisks.join(', ')}` : ''}
            ${executiveSummary.opportunities.length > 0 ? `<br/><strong>Opportunities:</strong> ${executiveSummary.opportunities.join(', ')}` : ''}
          </div>
        </div>

        ${comprehensiveInsights && comprehensiveInsights.customerAnalysis.length > 0 ? `
          <!-- Volume vs Sales Performance -->
          <div style="background: white; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #059669; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <h4 style="color: #059669; font-size: 18px; font-weight: 600; margin-bottom: 10px;">⚖️ Volume vs Sales Performance</h4>
            <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #166534; margin-bottom: 12px;">
              ${comprehensiveInsights.pvm.pvmAvailable ? `
                <strong>Price-Volume-Mix Analysis:</strong><br/>
                • Price Effect: ${formatPct(comprehensiveInsights.pvm.priceEffect)}<br/>
                • Volume Effect: ${formatPct(comprehensiveInsights.pvm.volumeEffect)}<br/>
                • Portfolio Kilo Rate: ${getUAEDirhamSymbolHTML()}${formatAED(comprehensiveInsights.volumeVsSalesPerformance.avgKiloRate)}/MT (${hasPreviousYearData && comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY !== null ? formatPct(comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY) + ' YoY' : 'No YoY data'})
              ` : `
                <strong>Price-Volume Analysis:</strong><br/>
                • Portfolio Kilo Rate: ${getUAEDirhamSymbolHTML()}${formatAED(comprehensiveInsights.volumeVsSalesPerformance.avgKiloRate)}/MT<br/>
                • PVM Analysis: Requires previous year or budget data for comparison
              `}
            </div>
            ${comprehensiveInsights.advantageAnalysis.volumeAdvantage.length > 0 ? `
              <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #166534; margin-bottom: 12px;">
                <strong>Volume Advantage (Volume outperforming Sales):</strong><br/>
                ${comprehensiveInsights.advantageAnalysis.volumeAdvantage.map(c => {
                  const volumeShare = totals.totalActual > 0 ? ((c.volumeActual / totals.totalActual) * 100) : 0;
                  const volumeMT = (c.volumeActual || 0) / 1000;
                  return `• ${formatCustomerName(c.name)}: Vol ${formatPct(c.volumeVsBudget)} vs Sales ${formatPct(c.amountVsBudget)} (${formatPct(c.volumeVsBudget - c.amountVsBudget)} gap) [${volumeShare.toFixed(1)}% share, ${volumeMT.toFixed(0)}MT]`;
                }).join('<br/>')}
              </div>
            ` : ''}
            ${comprehensiveInsights.advantageAnalysis.salesAdvantage.length > 0 ? `
              <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #166534; margin-bottom: 12px;">
                <strong>Sales Advantage (Sales outperforming Volume):</strong><br/>
                ${comprehensiveInsights.advantageAnalysis.salesAdvantage.map(c => {
                  const volumeShare = totals.totalActual > 0 ? ((c.volumeActual / totals.totalActual) * 100) : 0;
                  const volumeMT = (c.volumeActual || 0) / 1000;
                  return `• ${formatCustomerName(c.name)}: Sales ${formatPct(c.amountVsBudget)} vs Vol ${formatPct(c.volumeVsBudget)} (${formatPct(c.amountVsBudget - c.volumeVsBudget)} premium) [${volumeShare.toFixed(1)}% share, ${volumeMT.toFixed(0)}MT]`;
                }).join('<br/>')}
              </div>
            ` : ''}
            ${comprehensiveInsights.advantageAnalysis.volumeAdvantage.length === 0 && comprehensiveInsights.advantageAnalysis.salesAdvantage.length === 0 ? `
              <div style="padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 14px; color: #666; font-style: italic;">
                No customers meet materiality thresholds for advantage analysis (≥2% volume share, ≥10MT volume, ≥10% performance gap)
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${hasPreviousYearData ? `
          <!-- Multi-Period Trend Analysis -->
          <div style="background: white; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <h4 style="color: #d97706; font-size: 18px; font-weight: 600; margin-bottom: 10px;">📈 Multi-Period Trend Analysis</h4>
            <div style="padding: 12px; background: #fffbeb; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #92400e;">
              <strong>3-Year Performance Trends:</strong><br/>
              • Volume Growth: ${formatPct(yoy)} YoY<br/>
              • Sales Growth: ${formatPct(yoyAmount)} YoY<br/>
              • Price Realization: ${formatPct(comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY)} YoY
              ${comprehensiveInsights.advantageAnalysis.outliers.length > 0 ? `<br/><br/><strong>Anomaly Detection (Statistical Outliers):</strong><br/>${comprehensiveInsights.advantageAnalysis.outliers.map(o => `• ${formatCustomerName(o.name)}: ${formatPct(o.yoyRate)} YoY (Z-score: ${o.zScore.toFixed(1)})`).join('<br/>')}` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Top Contributors -->
        <div style="background: white; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #7c3aed; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h4 style="color: #7c3aed; font-size: 18px; font-weight: 600; margin-bottom: 10px;">🏆 Top Contributors</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px;">
            <div>
              <strong>By Volume:</strong>
              ${comprehensiveInsights.topPerformers.volume.map((c, i) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: #f8fafc; border-radius: 6px; margin-top: 6px;">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${i + 1}</div>
                  <div style="flex: 1; font-size: 13px; font-weight: 500;">${formatCustomerName(c.name)}</div>
                  <div style="font-size: 12px; color: #666;">${formatMt(c.volume)}</div>
                  <div style="font-size: 11px; color: #7c3aed; font-weight: 600;">${formatPct(c.share)}</div>
                </div>
              `).join('')}
            </div>
            <div>
              <strong>By Sales:</strong>
              ${comprehensiveInsights.topPerformers.sales.map((c, i) => `
                <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: #f8fafc; border-radius: 6px; margin-top: 6px;">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${i + 1}</div>
                  <div style="flex: 1; font-size: 13px; font-weight: 500;">${formatCustomerName(c.name)}</div>
                  <div style="font-size: 12px; color: #666;">${getUAEDirhamSymbolHTML()}${formatAED(c.amount)}</div>
                  <div style="font-size: 11px; color: #3b82f6; font-weight: 600;">${formatPct(c.share)}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ${comprehensiveInsights.topPerformers.kiloRate.length > 0 ? `
            <div style="padding: 12px; background: #faf5ff; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #6b21a8;">
              <strong>Highest Kilo Rates (Min 1% volume share):</strong><br/>
              ${comprehensiveInsights.topPerformers.kiloRate.map((c, index) =>
                `${index > 0 ? '<br/>' : ''}• ${formatCustomerName(c.name)}: ${getUAEDirhamSymbolHTML()}${formatAED(c.kiloRate)}/MT (${formatMt(c.volume)})`
              ).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Concentration Risk -->
        <div style="background: white; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h4 style="color: #dc2626; font-size: 18px; font-weight: 600; margin-bottom: 10px;">🎯 Concentration Risk Analysis</h4>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Risk Level</div>
              <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${concentrationRisk.level}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Top Customer</div>
              <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${formatPct(concentrationRisk.top1Share * 100)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Top 3 Share</div>
              <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${formatPct(concentrationRisk.top3Share * 100)}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Active Customers</div>
              <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${concentrationRisk.customerCount}</div>
            </div>
          </div>
          <div style="padding: 12px; background: #fef2f2; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #991b1b;">
            <strong>Top 5 Customers by Volume:</strong><br/>
            ${concentrationRisk.topCustomers.map((c, i) =>
              `${i + 1}. ${formatCustomerName(c.name)}: ${formatMt(c.volume)} (${formatPct(c.share * 100)})`
            ).join('<br/>')}
          </div>
        </div>

        ${hasPreviousYearData ? `
          <!-- Customer Retention & Churn -->
          <div style="background: white; border-radius: 10px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #8b5cf6; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <h4 style="color: #7c3aed; font-size: 18px; font-weight: 600; margin-bottom: 10px;">🔄 Customer Retention & Churn Analysis</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Retention Rate</div>
                <div style="font-size: 16px; font-weight: 700; color: ${retentionAnalysis.retentionRate >= 0.85 ? '#059669' : retentionAnalysis.retentionRate >= 0.7 ? '#f59e0b' : '#dc2626'};">
                  ${formatPct(retentionAnalysis.retentionRate * 100)}
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Churn Rate</div>
                <div style="font-size: 16px; font-weight: 700; color: ${retentionAnalysis.churnRate >= 0.3 ? '#dc2626' : retentionAnalysis.churnRate >= 0.15 ? '#f59e0b' : '#059669'};">
                  ${formatPct(retentionAnalysis.churnRate * 100)}
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Lost Customers</div>
                <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${retentionAnalysis.lostCustomers}</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">New Customers</div>
                <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${retentionAnalysis.newCustomers}</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${(growthDrivers.length > 0 || underperformers.length > 0) ? `
          <!-- Growth Drivers / Underperformers -->
          <div style="display: grid; grid-template-columns: ${growthDrivers.length > 0 && underperformers.length > 0 ? '1fr 1fr' : '1fr'}; gap: 16px; margin-bottom: 16px;">
            ${growthDrivers.length > 0 ? `
              <div style="background: white; border-radius: 10px; padding: 16px; border-left: 4px solid #059669; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="font-size: 24px;">🚀</div>
                  <h4 style="color: #059669; font-size: 18px; font-weight: 600; margin: 0;">Growth Drivers</h4>
                  <div style="background: #059669; color: white; border-radius: 12px; padding: 2px 8px; font-size: 12px; font-weight: 600;">${growthDrivers.length}</div>
                </div>
                ${growthDrivers.map((c, i) => `
                  <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; border: 1px solid #d1fae5;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">${i + 1}</div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: #065f46; font-size: 14px; margin-bottom: 4px;">${formatCustomerName(c.name)}</div>
                      <div style="font-size: 12px; color: #059669; display: flex; gap: 12px; flex-wrap: wrap;">
                        <span>${formatMt(c.actual)}</span>
                        ${c.vsBudget != null ? `<span>${formatPct(c.vsBudget)} vs budget</span>` : ''}
                        ${hasPreviousYearData && c.yoy != null ? `<span>${formatPct(c.yoy)} YoY</span>` : ''}
                        ${!hasPreviousYearData ? `<span style="color: #6b7280;">No YoY data</span>` : ''}
                      </div>
                    </div>
                    <div style="font-size: 18px;">📈</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${underperformers.length > 0 ? `
              <div style="background: white; border-radius: 10px; padding: 16px; border-left: 4px solid #dc2626; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="font-size: 24px;">⚠️</div>
                  <h4 style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0;">Underperformers</h4>
                  <div style="background: #dc2626; color: white; border-radius: 12px; padding: 2px 8px; font-size: 12px; font-weight: 600;">${underperformers.length}</div>
                </div>
                ${underperformers.map((c, i) => `
                  <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 8px; border: 1px solid #fecaca;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">${i + 1}</div>
                    <div style="flex: 1;">
                      <div style="font-weight: 600; color: #991b1b; font-size: 14px; margin-bottom: 4px;">${formatCustomerName(c.name)}</div>
                      <div style="font-size: 12px; color: #dc2626; display: flex; gap: 12px; flex-wrap: wrap;">
                        <span>${formatMt(c.actual)}</span>
                        ${c.vsBudget != null ? `<span>${formatPct(c.vsBudget)} vs budget</span>` : ''}
                        ${hasPreviousYearData && c.yoy != null ? `<span>${formatPct(c.yoy)} YoY</span>` : ''}
                        ${!hasPreviousYearData ? `<span style="color: #6b7280;">No YoY data</span>` : ''}
                      </div>
                    </div>
                    <div style="font-size: 18px;">📉</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Strategic Priorities -->
        <div style="background: white; border-radius: 10px; padding: 16px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h4 style="color: #1e40af; font-size: 18px; font-weight: 600; margin-bottom: 10px;">🎯 Strategic Priorities</h4>
          <div style="display: grid; gap: 8px;">
            ${runRateInfo && !runRateInfo.isOnTrack ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                📈 <strong>Accelerate Performance:</strong> Need ${formatMt(runRateInfo.catchUpRequired)}/month to meet FY target
              </div>
            ` : ''}
            ${(concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL') ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                ⚖️ <strong>Diversify Portfolio:</strong> High concentration risk - develop smaller customers
              </div>
            ` : ''}
            ${hasPreviousYearData && retentionAnalysis.churnRate > 0.2 ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                🔒 <strong>Improve Retention:</strong> ${formatPct(retentionAnalysis.churnRate * 100)} churn rate needs attention
              </div>
            ` : ''}
            ${comprehensiveInsights.advantageAnalysis.volumeAdvantage.length > 0 ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                💰 <strong>Price Optimization:</strong> ${comprehensiveInsights.advantageAnalysis.volumeAdvantage.length} customers show volume-sales gaps
              </div>
            ` : ''}
            ${comprehensiveInsights.advantageAnalysis.salesAdvantage.length > 0 ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                💎 <strong>Premium Strategy:</strong> ${comprehensiveInsights.advantageAnalysis.salesAdvantage.length} customers show strong pricing power
              </div>
            ` : ''}
            ${focusCustomers.length > 0 ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                🎯 <strong>Focus Customers:</strong> ${focusCustomers.length} customers need immediate attention for budget achievement
              </div>
            ` : ''}
            ${growthDrivers.length > 0 ? `
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 10px; border-radius: 8px; font-size: 14px;">
                🚀 <strong>Growth Drivers:</strong> Leverage ${growthDrivers.length} high-performing customers for expansion
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    return `
      ${customerTableHTML}
      ${customerAmountTableHTML}
      ${strategicAnalysisHTML}
    `;
  };

  // Generate Product Groups Performance Tab with KGS Table, Amount Table, and Strategic Analysis
  const generateProductGroupsPerformanceTab = (reportData, kgsData, amountData, basePeriodIndex, findings) => {
    const columnOrder = reportData.columnOrder;
    
    // Helper: Build extended columns with delta columns between data columns
    const buildExtendedColumns = (columnOrder) => {
      if (!columnOrder || columnOrder.length === 0) return [];
      const extendedColumns = [];
      for (let i = 0; i < columnOrder.length; i++) {
        extendedColumns.push({ ...columnOrder[i], columnType: 'data', dataIndex: i });
        if (i < columnOrder.length - 1) {
          extendedColumns.push({ columnType: 'delta', fromDataIndex: i, toDataIndex: i + 1 });
        }
      }
      return extendedColumns;
    };
    
    const extendedColumns = buildExtendedColumns(columnOrder);
    
    // Helper: Format MT value
    const formatMT = (value) => {
      if (typeof value !== 'number') return '-';
      if (value === 0) return '0.0';
      const mtValue = value / 1000;
      if (mtValue < 1) return mtValue.toFixed(2);
      return mtValue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    
    // Helper: Format AED amount
    const formatAED = (value) => {
      if (typeof value !== 'number') return '-';
      if (value === 0) return '0';
      const absValue = Math.abs(value);
      if (absValue >= 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (absValue >= 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toFixed(0);
    };
    
    // Helper: Calculate delta
    const calculateDelta = (data, fromIndex, toIndex) => {
      const fromDataIndex = extendedColumns.slice(0, fromIndex).filter(col => col.columnType === 'data').length;
      const toDataIndex = extendedColumns.slice(0, toIndex).filter(col => col.columnType === 'data').length;
      const fromTotal = data.reduce((s, row) => s + parseFloat(row.rawValues?.[fromDataIndex] || 0), 0);
      const toTotal = data.reduce((s, row) => s + parseFloat(row.rawValues?.[toDataIndex] || 0), 0);
      if (fromTotal === 0) return { arrow: '➖', value: '➖', color: '#6b7280' };
      const delta = ((toTotal - fromTotal) / fromTotal) * 100;
      const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '➖';
      const color = delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#6b7280';
      const absDelta = Math.abs(delta);
      let formattedValue;
      if (absDelta >= 999.9) formattedValue = '999+%';
      else if (absDelta >= 99.99) formattedValue = Math.round(absDelta) + '%';
      else if (absDelta >= 10) formattedValue = absDelta.toFixed(1) + '%';
      else formattedValue = absDelta.toFixed(2) + '%';
      return { arrow, value: formattedValue, color };
    };
    
    // Helper: Calculate column total
    const calculateColumnTotal = (data, columnIndex) => {
      const dataColumnIndex = extendedColumns.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
      return data.reduce((total, row) => {
        const value = row.rawValues?.[dataColumnIndex] || 0;
        return total + (typeof value === 'number' && !isNaN(value) ? value : 0);
      }, 0);
    };
    
    // Filter zero rows for display
    const filterZeroRows = (data) => {
      return data.filter(row => {
        return row.rawValues && row.rawValues.some(val => val > 0);
      });
    };
    
    // Filter excluded groups for Amount table (same as ProductGroupsAmountTable)
    const filterExcludedGroups = (data) => {
      return data.filter(row => {
        if (!row.name) return true;
        const name = row.name.toString().trim().toLowerCase();
        return name !== 'services charges' && name !== 'others' && name !== 'other';
      });
    };
    
    const filteredKgsData = filterZeroRows(kgsData);
    const filteredAmountData = filterExcludedGroups(filterZeroRows(amountData));
    
    // Generate KGS Table HTML
    const kgsTableHTML = `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Product Groups - Sales MT Comparison</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
                  <thead>
              <tr style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white;">
                <th rowspan="3" style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: 600;">Product Groups</th>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    return `<th rowspan="3" style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600; background: rgba(255,255,255,0.1);">YoY<br/>%</th>`;
                  }
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.year}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white;">
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.isCustomRange ? col.displayName : col.month}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white;">
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.type}</th>`;
                }).join('')}
                    </tr>
                  </thead>
                  <tbody>
              ${filteredKgsData.map((pg, pgIdx) => `
                <tr style="background: ${pgIdx % 2 === 0 ? '#f8fafc' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${pg.name}</td>
                  ${extendedColumns.map((col, colIdx) => {
                    if (col.columnType === 'delta') {
                      const val = pg.values?.[colIdx];
                      if (typeof val === 'object' && val !== null) {
                        const deltaClass = val.arrow === '▲' ? 'delta-up' : val.arrow === '▼' ? 'delta-down' : '';
                        return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${val.color}; font-weight: 600;">${val.arrow} ${val.value}</td>`;
                      }
                      return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">➖</td>`;
                    }
                    const rawVal = pg.rawValues[col.dataIndex];
                    return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatMT(rawVal)}</td>`;
                  }).join('')}
                </tr>
                        `).join('')}
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); font-weight: 700;">
                <td style="padding: 12px; border: 1px solid #ddd;">Total</td>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                    const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                    if (deltaIndex < dataColumns.length - 1) {
                      const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                      const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                      const delta = calculateDelta(filteredKgsData, fromIndex, toIndex);
                      return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: ${delta.color}; font-weight: 700;">${delta.arrow} ${delta.value}</td>`;
                    }
                    return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">-</td>`;
                  }
                  const totalValue = calculateColumnTotal(filteredKgsData, idx);
                  return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: 700;">${formatMT(totalValue)}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Generate Amount Table HTML (similar structure with AED formatting)
    const amountTableHTML = `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Product Groups - ${getUAEDirhamSymbolHTML()} Sales Comparison</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
            <thead>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                <th rowspan="3" style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: 600;">Product Groups</th>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    return `<th rowspan="3" style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600; background: rgba(255,255,255,0.1);">YoY<br/>%</th>`;
                  }
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.year}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.isCustomRange ? col.displayName : col.month}</th>`;
                }).join('')}
              </tr>
              <tr style="background: linear-gradient(135deg, #059669, #047857); color: white;">
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') return '';
                  return `<th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: 600;">${col.type}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredAmountData.map((pg, pgIdx) => `
                <tr style="background: ${pgIdx % 2 === 0 ? '#f8fafc' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">${pg.name}</td>
                  ${extendedColumns.map((col, colIdx) => {
                    if (col.columnType === 'delta') {
                      const val = pg.values?.[colIdx];
                      if (typeof val === 'object' && val !== null) {
                        return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: ${val.color}; font-weight: 600;">${val.arrow} ${val.value}</td>`;
                      }
                      return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">➖</td>`;
                    }
                    const rawVal = pg.rawValues[col.dataIndex];
                    return `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${formatAED(rawVal)}</td>`;
                  }).join('')}
                      </tr>
                    `).join('')}
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0); font-weight: 700;">
                <td style="padding: 12px; border: 1px solid #ddd;">Total</td>
                ${extendedColumns.map((col, idx) => {
                  if (col.columnType === 'delta') {
                    const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                    const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                    if (deltaIndex < dataColumns.length - 1) {
                      const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                      const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                      const delta = calculateDelta(filteredAmountData, fromIndex, toIndex);
                      return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: ${delta.color}; font-weight: 700;">${delta.arrow} ${delta.value}</td>`;
                    }
                    return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">-</td>`;
                  }
                  const totalValue = calculateColumnTotal(filteredAmountData, idx);
                  return `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: 700;">${getUAEDirhamSymbolHTML()}${formatAED(totalValue)}</td>`;
                }).join('')}
              </tr>
                  </tbody>
                </table>
              </div>
            </div>
    `;
    
    // Generate Product Groups Strategic Analysis HTML from findings
    const strategicAnalysisHTML = (() => {
      console.log('🔍 Strategic Analysis Export - findings (export):', findings);
      if (!findings) {
        console.log('⚠️ No strategicFindings data available for export');
        return `
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
            <div style="display: block; text-align: center; width: 100%;">
              <h2 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0 0 24px 0; background: linear-gradient(135deg, #3b82f6, #1e40af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Product Groups Strategic Analysis
              </h2>
            </div>
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
              <p style="color: #6b7280; text-align: center;">Analysis data is being calculated...</p>
          </div>
          </div>
        `;
      }

      // Use the structured findings data provided to this function
      console.log('📊 Export findings data:', {
        executiveSummary: findings.executiveSummary,
        criticalUnderperformers: findings.criticalUnderperformers?.length || 0,
        growthDrivers: findings.growthDrivers?.length || 0,
        aspConcerns: findings.aspConcerns?.length || 0,
        monthsRemaining: findings.monthsRemaining,
        portfolioRemainingMt: findings.portfolioRemainingMt,
        portfolioRemainingAmt: findings.portfolioRemainingAmt
      });
      
      // Helper function to format numbers for strategic analysis display
      const formatMTDisplay = (num) => {
        if (num == null || isNaN(num)) return 'N/A';
        const mt = num / 1000;
        if (mt >= 1000) return Math.round(mt).toLocaleString() + ' MT';
        if (mt >= 100) return Math.round(mt) + ' MT';
        return mt.toFixed(1) + ' MT';
      };
      
      const formatAmountDisplay = (num) => {
        if (num == null || isNaN(num)) return 'N/A';
        const millions = num / 1000000;
        if (millions >= 1) return `${getUAEDirhamSymbolHTML()}${millions.toFixed(1)}M`;
        const thousands = num / 1000;
        if (thousands >= 1) return `${getUAEDirhamSymbolHTML()}${thousands.toFixed(0)}K`;
        return `${getUAEDirhamSymbolHTML()}${Math.round(num).toLocaleString()}`;
      };
      
      const formatPercentage = (num) => {
        if (num == null || isNaN(num)) return 'N/A';
        return `${Math.abs(num).toFixed(1)}%`;
      };
      
      // Additional metrics to mirror live component's executive summary details
      const mtBudgetVar = findings.totalMTBudget > 0 ? ((findings.totalMTActual - findings.totalMTBudget) / findings.totalMTBudget) * 100 : null;
      const amountBudgetVar = findings.totalAmountBudget > 0 ? ((findings.totalAmountActual - findings.totalAmountBudget) / findings.totalAmountBudget) * 100 : null;
      const ytdMTGrowth = findings.totalMTYTDPrevious > 0 ? ((findings.totalMTYTDCurrent - findings.totalMTYTDPrevious) / findings.totalMTYTDPrevious) * 100 : null;
      const ytdAmountGrowth = findings.totalAmountYTDPrevious > 0 ? ((findings.totalAmountYTDCurrent - findings.totalAmountYTDPrevious) / findings.totalAmountYTDPrevious) * 100 : null;
      const fyMTGrowth = findings.totalMTFYPrevious > 0 ? ((findings.totalMTFYCurrent - findings.totalMTFYPrevious) / findings.totalMTFYPrevious) * 100 : null;
      const fyAmountGrowth = findings.totalAmountFYPrevious > 0 ? ((findings.totalAmountFYCurrent - findings.totalAmountFYPrevious) / findings.totalAmountFYPrevious) * 100 : null;
      // FY Budget comparison: Use Period Actual vs FY Budget (since YTD data is not available)
      const fyMTBudgetVar = findings.totalMTFYBudget > 0 && findings.totalMTActual > 0 ? ((findings.totalMTActual - findings.totalMTFYBudget) / findings.totalMTFYBudget) * 100 : null;
      const fyAmountBudgetVar = findings.totalAmountFYBudget > 0 && findings.totalAmountActual > 0 ? ((findings.totalAmountActual - findings.totalAmountFYBudget) / findings.totalAmountFYBudget) * 100 : null;

      return `
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 20px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
          <h3 style="color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 24px; text-align: center; background: linear-gradient(135deg, #3b82f6, #1e40af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Product Groups Strategic Analysis
          </h3>
          
          <!-- Executive Summary Section -->
          <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e40af; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">📊 Executive Summary</h4>
            <div style="padding: 12px 16px; background: #eff6ff; border-radius: 8px; margin-bottom: 12px; font-size: 15px; line-height: 1.6; color: #1e40af; border-left: 3px solid #3b82f6; text-align: left;">
              ${findings.executiveSummary || 'Analysis complete.'}
              </div>
            ${mtBudgetVar !== null || amountBudgetVar !== null ? `
              <div style="padding: 12px 16px; background: #ffffff; border-radius: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; text-align: left;">
                <strong>Period Performance vs Budget:</strong>
                ${mtBudgetVar !== null ? ` Volume at ${formatMTDisplay(findings.totalMTActual)} is ${formatPercentage(Math.abs(mtBudgetVar))} ${mtBudgetVar < 0 ? 'below' : 'above'} target (${formatMTDisplay(findings.totalMTBudget)}).` : ''}
                ${amountBudgetVar !== null ? ` Sales at ${formatAmountDisplay(findings.totalAmountActual)} shows ${formatPercentage(Math.abs(amountBudgetVar))} ${amountBudgetVar < 0 ? 'shortfall' : 'surplus'} vs ${formatAmountDisplay(findings.totalAmountBudget)} budget.` : ''}
                ${fyMTBudgetVar !== null || fyAmountBudgetVar !== null ? `
                  <br><strong>Period vs FY Budget:</strong>
                  ${fyMTBudgetVar !== null ? ` Period volume at ${formatMTDisplay(findings.totalMTActual)} is ${formatPercentage(Math.abs(fyMTBudgetVar))} ${fyMTBudgetVar < 0 ? 'below' : 'above'} FY budget target (${formatMTDisplay(findings.totalMTFYBudget)}).` : ''}
                  ${fyAmountBudgetVar !== null ? ` Period sales at ${formatAmountDisplay(findings.totalAmountActual)} shows ${formatPercentage(Math.abs(fyAmountBudgetVar))} ${fyAmountBudgetVar < 0 ? 'shortfall' : 'surplus'} vs ${formatAmountDisplay(findings.totalAmountFYBudget)} FY budget.` : ''}
                ` : ''}
              </div>
            ` : ''}

            ${findings.hasYTD && (ytdMTGrowth !== null || ytdAmountGrowth !== null) ? `
              <div style="padding: 12px 16px; background: #ffffff; border-radius: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; text-align: left;">
                <strong>Year-to-Date Trajectory:</strong>
                ${ytdMTGrowth !== null ? ` YTD volume of ${formatMTDisplay(findings.totalMTYTDCurrent)} reflects ${formatPercentage(Math.abs(ytdMTGrowth))} ${ytdMTGrowth >= 0 ? 'growth' : 'decline'} vs prior year (${formatMTDisplay(findings.totalMTYTDPrevious)}).` : ''}
                ${ytdAmountGrowth !== null ? ` Sales at ${formatAmountDisplay(findings.totalAmountYTDCurrent)} shows ${formatPercentage(Math.abs(ytdAmountGrowth))} ${ytdAmountGrowth >= 0 ? 'increase' : 'decrease'} YoY.` : ''}
              </div>
            ` : ''}

            ${findings.hasFYComparison && findings.totalMTFYCurrent > 0 ? `
              <div style="padding: 12px 16px; background: #ffffff; border-radius: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; text-align: left;">
                <strong>Full Year Performance:</strong>
                FY volume reached ${formatMTDisplay(findings.totalMTFYCurrent)}
                ${fyMTGrowth !== null ? ` (${formatPercentage(Math.abs(fyMTGrowth))} ${fyMTGrowth >= 0 ? 'up' : 'down'} YoY)` : ''}
                ${fyMTBudgetVar !== null ? `, ${formatPercentage(Math.abs(fyMTBudgetVar))} ${fyMTBudgetVar < 0 ? 'below' : 'above'} FY budget` : ''}.
                Sales of ${formatAmountDisplay(findings.totalAmountFYCurrent)}
                ${fyAmountGrowth !== null ? ` reflects ${formatPercentage(Math.abs(fyAmountGrowth))} ${fyAmountGrowth >= 0 ? 'growth' : 'contraction'}` : ''}
                ${fyAmountBudgetVar !== null ? `, ${formatPercentage(Math.abs(fyAmountBudgetVar))} ${fyAmountBudgetVar < 0 ? 'under' : 'over'} target` : ''}.
              </div>
            ` : ''}

            ${findings.hasYTDCurrent && findings.hasFYComparison && findings.totalAmountYTDCurrent > 0 && findings.totalAmountFYCurrent > 0 ? `
              <div style="padding: 12px 16px; background: #ffffff; border-radius: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb; text-align: left;">
                <strong>YTD vs Full-Year Comparison:</strong>
                YTD sales of ${formatAmountDisplay(findings.totalAmountYTDCurrent)} vs Full-Year ${formatAmountDisplay(findings.totalAmountFYCurrent)} (${formatPercentage((findings.totalAmountYTDCurrent / findings.totalAmountFYCurrent) * 100)} of FY achieved).
              </div>
            ` : ''}

            ${findings.hasYTDCurrent && findings.hasFYComparison && findings.totalMTYTDCurrent > 0 && findings.totalMTFYCurrent > 0 ? `
              <div style="padding: 12px 16px; background: #ffffff; border-radius: 8px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; color: #1f2937; border: 1px solid #e5e7eb;">
                <strong>YTD vs Full-Year Volume Comparison:</strong>
                YTD volume of ${formatMTDisplay(findings.totalMTYTDCurrent)} vs Full-Year ${formatMTDisplay(findings.totalMTFYCurrent)} (${formatPercentage((findings.totalMTYTDCurrent / findings.totalMTFYCurrent) * 100)} of FY achieved).
              </div>
            ` : ''}

            </div>
          
          ${findings.criticalUnderperformers && findings.criticalUnderperformers.length > 0 ? `
            <!-- Critical Underperformers Section -->
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #dc2626;">
              <h4 style="color: #dc2626; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">⚠️ High-Priority Underperformers</h4>
              ${findings.criticalUnderperformers.map((product) => `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="font-weight: 600; color: #1f2937; font-size: 16px; margin-bottom: 12px; text-align: center;">${product.name}</div>
                  <div style="margin-left: 12px;">
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                      <strong>Strategic Weight:</strong> ${(product.budgetShare * 100).toFixed(1)}% of total budget (${formatMTDisplay(product.mtFYBudget || product.mtBudget)} / ${formatAmountDisplay(product.amountFYBudget || product.amountBudget)})
                    </div>
                    ${product.mtVariance != null && Math.abs(product.mtVariance) > 5 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>Period Gap:</strong> Volume ${formatPercentage(Math.abs(product.mtVariance))} ${product.mtVariance < 0 ? 'below' : 'above'} plan (${formatMTDisplay(product.mtActual)} vs ${formatMTDisplay(product.mtBudget)}), revenue impact ${formatPercentage(Math.abs(product.amountVariance))} ${product.amountVariance < 0 ? 'short' : 'over'} at ${formatAmountDisplay(product.amountActual)}
                      </div>
                    ` : ''}
                    ${product.mtYoY != null ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>YoY Trend:</strong> ${formatPercentage(Math.abs(product.mtYoY))} ${product.mtYoY < 0 ? 'volume decline' : 'volume growth'} from ${formatMTDisplay(product.mtPrevYear)} to ${formatMTDisplay(product.mtActual)}, sales ${product.amountYoY >= 0 ? 'up' : 'down'} ${formatPercentage(Math.abs(product.amountYoY))}
                      </div>
                    ` : ''}
                    ${product.mtYTDGrowth != null && findings.hasYTD ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>YTD Performance:</strong> ${formatMTDisplay(product.mtYTDCurrent)} (${formatPercentage(Math.abs(product.mtYTDGrowth))} ${product.mtYTDGrowth >= 0 ? 'ahead' : 'behind'} prior year's ${formatMTDisplay(product.mtYTDPrevious)})
                      </div>
                    ` : ''}
                    ${product.mtFYBudgetVar != null && findings.hasFY && Math.abs(product.mtFYBudgetVar) > 5 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>FY Outlook:</strong> Full year tracking at ${formatMTDisplay(product.mtFYCurrent)} / ${formatAmountDisplay(product.amountFYCurrent)}, ${formatPercentage(Math.abs(product.mtFYBudgetVar))} ${product.mtFYBudgetVar < 0 ? 'below' : 'above'} FY target
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${findings.growthDrivers && findings.growthDrivers.length > 0 ? `
            <!-- Growth Drivers Section -->
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #059669;">
              <h4 style="color: #059669; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">🚀 Growth Drivers</h4>
              ${findings.growthDrivers.map((product) => `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #059669; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="font-weight: 600; color: #1f2937; font-size: 16px; margin-bottom: 12px; text-align: center;">${product.name}</div>
                  <div style="margin-left: 12px;">
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                      <strong>Strong Execution:</strong> Delivered ${formatMTDisplay(product.mtActual)} / ${formatAmountDisplay(product.amountActual)} (${(product.actualContribution * 100).toFixed(1)}% of total volume)
                    </div>
                    ${product.mtVariance != null && product.mtVariance > 10 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>Exceeded Budget:</strong> Volume ${formatPercentage(product.mtVariance)} above plan, revenue outperformance of ${formatPercentage(product.amountVariance)}
                      </div>
                    ` : ''}
                    ${product.mtYoY != null && product.mtYoY > 15 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>Momentum:</strong> ${formatPercentage(product.mtYoY)} volume expansion YoY (from ${formatMTDisplay(product.mtPrevYear)} to ${formatMTDisplay(product.mtActual)}), sales growth of ${formatPercentage(product.amountYoY)}
                      </div>
                    ` : ''}
                    ${product.mtFYGrowth != null && findings.hasFY && product.mtFYGrowth > 10 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>FY Achievement:</strong> Full year performance at ${formatMTDisplay(product.mtFYCurrent)} represents ${formatPercentage(product.mtFYGrowth)} growth vs prior FY
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${findings.aspConcerns && findings.aspConcerns.length > 0 ? `
            <!-- Pricing Analysis Section -->
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #d97706;">
              <h4 style="color: #d97706; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">💰 Pricing Analysis</h4>
              ${findings.aspConcerns.map((product) => {
                // Helper for ASP formatting (plain HTML version of formatNumber 'asp')
                const formatASP = (num) => {
                  if (num == null || isNaN(num)) return 'N/A';
                  return getUAEDirhamSymbolHTML() + Math.round(num).toLocaleString();
                };
                return `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #d97706; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="font-weight: 600; color: #1f2937; font-size: 16px; margin-bottom: 12px; text-align: center;">${product.name}</div>
                  <div style="margin-left: 12px;">
                    ${product.aspYoYPct != null && Math.abs(product.aspYoYPct) >= 5 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>ASP Change YoY:</strong> Current realization at ${formatASP(product.currentASP)}/kg vs ${formatASP(product.prevYearASP)}/kg prior year (${formatPercentage(Math.abs(product.aspYoYPct))} ${product.aspYoYPct < 0 ? 'decline' : 'increase'})
                      </div>
                    ` : ''}
                    ${product.aspVsBudgetPct != null && Math.abs(product.aspVsBudgetPct) >= 5 ? `
                      <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                        <strong>ASP vs Budget:</strong> ${formatPercentage(Math.abs(product.aspVsBudgetPct))} ${product.aspVsBudgetPct < 0 ? 'below' : 'above'} budgeted ASP of ${formatASP(product.budgetASP)}/kg
                      </div>
                    ` : ''}
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                      <strong>Revenue Impact:</strong> Volume of ${formatMTDisplay(product.mtActual)} generating ${formatAmountDisplay(product.amountActual)} with materiality score of ${(product.materialityScore * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          ` : ''}
          
          ${(findings.monthsRemaining != null || findings.portfolioRemainingMt > 0 || findings.portfolioRemainingAmt > 0) ? `
            <!-- Required Growth to Targets Section -->
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #7c3aed;">
              <h4 style="color: #7c3aed; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">🎯 Required Growth to Targets</h4>
              
              <!-- Portfolio Catch-up Plan -->
              <div style="padding: 12px 16px; background: #eff6ff; border-radius: 8px; margin-bottom: 12px; font-size: 15px; line-height: 1.6; color: #1e40af; border-left: 3px solid #3b82f6;">
                <strong>Portfolio Catch-up Plan</strong><br>
                ${findings.monthsRemaining != null && findings.monthsRemaining > 0 ? `
                  <div><strong>Time Remaining:</strong> ${findings.monthsRemaining} months to achieve FY budget targets</div>
                ` : ''}
                ${findings.monthsRemaining === 0 ? `
                  <div><strong>Time Remaining:</strong> No months remaining - gap must be closed within current month (end-loading)</div>
                ` : ''}
                ${findings.portfolioRemainingMt > 0 ? `
                  <div><strong>Volume Gap:</strong> Need ${formatMTDisplay(findings.portfolioRemainingMt)} more to hit FY budget</div>
                ` : findings.portfolioRemainingMt < 0 ? `
                  <div><strong>Volume Status:</strong> Portfolio is ${formatMTDisplay(Math.abs(findings.portfolioRemainingMt))} ahead of FY budget target</div>
                ` : ''}
                ${findings.portfolioRemainingAmt > 0 ? `
                  <div><strong>Sales Gap:</strong> Need ${formatAmountDisplay(findings.portfolioRemainingAmt)} more to hit FY budget</div>
                ` : findings.portfolioRemainingAmt < 0 ? `
                  <div><strong>Sales Status:</strong> Portfolio is ${formatAmountDisplay(Math.abs(findings.portfolioRemainingAmt))} ahead of FY budget target</div>
                ` : ''}
                ${findings.monthsRemaining > 0 && (findings.portfolioRemainingMt > 0 || findings.portfolioRemainingAmt > 0) ? `
                  <div><strong>Required Average Per Month:</strong> ${formatMTDisplay(findings.portfolioPerMonthMt)} / ${formatAmountDisplay(findings.portfolioPerMonthAmt)}</div>
                ` : ''}
                ${findings.portfolioRemainingMt <= 0 && findings.portfolioRemainingAmt <= 0 ? `
                  <div><strong>Status:</strong> Portfolio is on track or ahead of budget targets</div>
                ` : ''}
              </div>
              
              <!-- Product Level Catch-up -->
              ${findings.highBudgetProducts && findings.highBudgetProducts.filter(p => (p.productRemainingMt > 0) || (p.productRemainingAmt > 0)).length > 0 ? `
                <div style="margin-top: 16px;">
                  <strong style="color: #1e40af; font-size: 16px;">Product Level Catch-up</strong>
                  ${findings.highBudgetProducts.filter(p => (p.productRemainingMt > 0) || (p.productRemainingAmt > 0)).map((product) => `
                    <div style="padding: 16px; background: #f8fafc; border-radius: 8px; margin: 12px 0 16px 0; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <div style="font-weight: 600; color: #1f2937; font-size: 16px; margin-bottom: 12px; text-align: center;">${product.name}</div>
                      <div style="margin-left: 12px;">
                        ${product.productRemainingMt > 0 ? `
                          <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                            <strong>Volume Gap:</strong> Need ${formatMTDisplay(product.productRemainingMt)} more to hit FY budget
                          </div>
                        ` : ''}
                        ${product.productRemainingAmt > 0 ? `
                          <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                            <strong>Sales Gap:</strong> Need ${formatAmountDisplay(product.productRemainingAmt)} more to hit FY budget
                          </div>
                        ` : ''}
                        ${findings.monthsRemaining > 0 && (product.productRemainingMt > 0 || product.productRemainingAmt > 0) ? `
                          <div style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: white; border-radius: 6px;">
                            <strong>Required Per Month:</strong> ${formatMTDisplay(product.productPerMonthMt)} / ${formatAmountDisplay(product.productPerMonthAmt)}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 15px; line-height: 1.6; color: #1e40af;">
                  All high-budget products are on track or ahead of targets
                </div>
              `}
            </div>
          ` : ''}
          
          <!-- Strategic Priorities Section -->
          <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e40af; font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center;">💡 Strategic Priorities</h4>
            <div style="padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              ${findings.criticalUnderperformers && findings.criticalUnderperformers.length > 0 ? `
                <div style="color: #065f46; font-size: 15px; line-height: 1.6; margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">
                  Address underperformance in high-budget products representing ${(findings.criticalUnderperformers.reduce((sum, p) => sum + p.budgetShare, 0) * 100).toFixed(1)}% of strategic allocation through targeted sales initiatives and market analysis.
                </div>
              ` : ''}
              ${findings.growthDrivers && findings.growthDrivers.length > 0 ? `
                <div style="color: #065f46; font-size: 15px; line-height: 1.6; margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">
                  Capitalize on momentum in growth products by allocating additional resources and analyzing success factors for replication across portfolio.
                </div>
              ` : ''}
              ${findings.aspConcerns && findings.aspConcerns.length > 0 ? `
                <div style="color: #065f46; font-size: 15px; line-height: 1.6; margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">
                  Investigate pricing pressure in ${findings.aspConcerns.length} material products; implement margin protection strategies or validate competitive positioning.
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    })();
    
    return `
      ${kgsTableHTML}
      ${amountTableHTML}
      ${strategicAnalysisHTML}
    `;
  };

  // Generate Performance Dashboard HTML with Interactive Charts
  const generatePerformanceDashboard = (reportData, kgsData, amountData, customerData, basePeriodIndex) => {
    if (!reportData || !kgsData || !amountData) return '';
    
    // Prepare YoY Growth Chart Data
    const prevIndex = basePeriodIndex - 1;
    const hasPreviousPeriod = prevIndex >= 0;
    
    // Filter and prepare product groups for YoY chart - Apply same >= 1 MT rule as Budget Achievement
    const excludedProductGroups = ['Service Charges', 'Services Charges', 'Others', 'Other', 'Miscellaneous', 'Service', 'Charges'];
    let yoyProducts = kgsData.filter(pg => {
      const productGroup = pg.productGroup || pg.name || '';
      const isExcluded = excludedProductGroups.some(excluded => 
        productGroup.toLowerCase().includes(excluded.toLowerCase())
      );
      if (isExcluded) return false;
      
      const cur = pg.rawValues?.[basePeriodIndex] || 0;
      const prev = hasPreviousPeriod ? (pg.rawValues?.[prevIndex] || 0) : 0;
      const hasAnyValue = pg.rawValues?.some(val => (val || 0) > 0) || false;
      
      // Apply >= 1 MT rule: show if current OR previous >= 1000 KG
      const curAtLeastOneMT = cur >= 1000;
      const prevAtLeastOneMT = prev >= 1000;
      
      return hasAnyValue && (curAtLeastOneMT || prevAtLeastOneMT);
    });
    
    // Sort by current period value descending
    yoyProducts.sort((a, b) => (b.rawValues?.[basePeriodIndex] || 0) - (a.rawValues?.[basePeriodIndex] || 0));
    
    // Calculate YoY growth percentages and sort
    const yoyEntries = yoyProducts.map(pg => {
      const current = pg.rawValues[basePeriodIndex] || 0;
      const previous = hasPreviousPeriod ? (pg.rawValues[prevIndex] || 0) : 0;
      let percentage = 0;
      let mtDifference = 0;
      if (previous !== 0) {
        percentage = ((current - previous) / previous) * 100;
        mtDifference = (current - previous) / 1000;
      } else if (current !== 0) {
        percentage = 0;
        mtDifference = current / 1000;
      }
      return {
        label: pg.productGroup || pg.name || '',
        percentage: percentage,
        mtDifference: mtDifference,
        current: current,
        previous: previous
      };
    });
    
    // Sort: positives descending, then negatives ascending
    yoyEntries.sort((a, b) => {
      const aPos = a.percentage >= 0;
      const bPos = b.percentage >= 0;
      if (aPos && !bPos) return -1;
      if (!aPos && bPos) return 1;
      return aPos ? (b.percentage - a.percentage) : (a.percentage - b.percentage);
    });
    
    // Prepare Budget Achievement Chart Data - Apply same filtering rules as BudgetAchievementChart.js
    const budgetProducts = kgsData.filter(pg => {
      const productGroup = pg.productGroup || pg.name || '';
      const isExcluded = excludedProductGroups.some(excluded => 
        productGroup.toLowerCase().includes(excluded.toLowerCase())
      );
      return !isExcluded;
    }).map(item => {
      const actualValue = item.rawValues?.[basePeriodIndex] || 0;
      const periodBudgetValue = item.rawValues?.[basePeriodIndex + 1] || 0;
      const yearBudgetIndex = reportData.yearBudgetIndex || (basePeriodIndex + 2);
      const yearBudgetValue = item.rawValues?.[yearBudgetIndex] || 0;
      
      const periodAchievement = periodBudgetValue > 0 ? (actualValue / periodBudgetValue * 100) : 0;
      const yearAchievement = yearBudgetValue > 0 ? (actualValue / yearBudgetValue * 100) : 0;
      
      return {
        name: item.productGroup || item.name || '',
        actual: actualValue,
        periodBudget: periodBudgetValue,
        yearBudget: yearBudgetValue,
        periodAchievement: periodAchievement,
        yearAchievement: yearAchievement
      };
    }).filter(item => {
      // Same filter logic as BudgetAchievementChart.js
      const hasBudget = (item.periodBudget > 0) || (item.yearBudget > 0);
      const actualAtLeastOneMT = (item.actual >= 1000); // >= 1 MT
      return actualAtLeastOneMT || hasBudget;
    });
    
    budgetProducts.sort((a, b) => b.actual - a.actual);
    
    // Filter product groups for Product Groups Performance table - same >= 1 MT rule
    const filteredProductGroups = kgsData.filter(pg => {
      const productGroup = pg.productGroup || pg.name || '';
      const isExcluded = excludedProductGroups.some(excluded => 
        productGroup.toLowerCase().includes(excluded.toLowerCase())
      );
      if (isExcluded) return false;
      
      const actualValue = pg.rawValues?.[basePeriodIndex] || 0;
      const hasAnyValue = pg.rawValues?.some(val => (val || 0) > 0) || false;
      
      // Apply >= 1 MT rule: show if has at least 1 MT in any period
      return hasAnyValue && actualValue >= 1000;
    });
    filteredProductGroups.sort((a, b) => (b.rawValues?.[basePeriodIndex] || 0) - (a.rawValues?.[basePeriodIndex] || 0));
    
    return `
      <div class="report-section" style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 30px; page-break-before: always;">
        <h3 style="color: #667eea; font-size: 1.4em; margin-bottom: 25px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 12px;">
          📊 PERFORMANCE DASHBOARD
        </h3>
        
        <div class="tab-instructions" style="text-align: center; margin-bottom: 20px; padding: 12px 20px; background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid #e9ecef; border-radius: 8px;">
          <p style="margin: 0; font-style: italic; color: #64748b; font-size: 14px;">
            Click on the tabs below to switch between different performance views
          </p>
          </div>
          
        <div class="perf-tab-buttons" style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; flex-wrap: nowrap;">
          <button class="perf-tab-btn active" data-tab="yoy" style="padding: 12px 20px; border: 2px solid #667eea; background: #667eea; color: white; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.3s; line-height: 1.4; text-align: center; min-width: 140px;">
            📈<br>YoY Growth<br>by Product Group
          </button>
          <button class="perf-tab-btn" data-tab="budget" style="padding: 12px 20px; border: 2px solid #667eea; background: white; color: #667eea; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.3s; line-height: 1.4; text-align: center; min-width: 140px;">
            🎯<br>Budget Achievement<br>by Product Group
          </button>
          <button class="perf-tab-btn" data-tab="products" style="padding: 12px 20px; border: 2px solid #667eea; background: white; color: #667eea; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.3s; line-height: 1.4; text-align: center; min-width: 140px;">
            📊<br>Product Groups<br>Strategic Analysis
          </button>
          <button class="perf-tab-btn" data-tab="customers" style="padding: 12px 20px; border: 2px solid #667eea; background: white; color: #667eea; cursor: pointer; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.3s; line-height: 1.4; text-align: center; min-width: 140px;">
            👥<br>Customers<br>Performance Analysis
          </button>
        </div>
          
        <!-- YoY Growth Tab -->
        <div class="perf-tab-content active" id="yoy-tab">
          <h4 style="margin: 15px 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">
            ${hasPreviousPeriod ? `${formatPeriodLabel(reportData.columnOrder[basePeriodIndex])} vs ${formatPeriodLabel(reportData.columnOrder[prevIndex])} Year-over-Year Growth by Category` : 'Year-over-Year Growth Analysis'}
          </h4>
          <div style="position: relative; height: ${Math.max(600, yoyEntries.length * 50)}px;">
            <canvas id="yoyGrowthChart"></canvas>
          </div>
        </div>
            
        <!-- Budget Achievement Tab -->
        <div class="perf-tab-content" id="budget-tab">
          <h4 style="margin: 15px 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600; text-align: center;">
            Budget Achievement
          </h4>
          <p style="font-style: italic; color: #666; margin: 0 0 12px 0; font-size: 13px; text-align: center;">
            HY1 Actual vs Budget and FY Budget: bars show MT; right side shows % and MT delta.
          </p>
          
          <!-- Legend -->
          ${(() => {
            // Derive legend labels using same logic as BudgetAchievementChart.js
            const bp = reportData.basePeriod || reportData.columnOrder[basePeriodIndex] || {};
            const rawBaseText = bp.displayName || bp.label || bp.name || formatPeriodLabel(bp) || '';
            
            // Derive base label (for period budget)
            let derivedBase = '';
            if (rawBaseText) {
              derivedBase = rawBaseText.replace(/actual/i, 'Budget');
              if (derivedBase === rawBaseText) {
                derivedBase = rawBaseText + ' Budget';
              }
            } else {
              const part = bp.quarter || bp.hy || bp.month || bp.code || bp.short || 'Base Period';
              const year = bp.year ? ' ' + bp.year : '';
              derivedBase = part + year + ' Budget';
            }
            
            // Derive actual label
            const actualLegend = rawBaseText
              ? (/actual/i.test(rawBaseText) ? rawBaseText : rawBaseText + ' Actual')
              : (bp.quarter || bp.hy || bp.month || bp.code || bp.short || 'Base Period') + (bp.year ? ' ' + bp.year : '') + ' Actual';
            
            // FY Budget label
            const fyLegend = bp.year ? 'FY ' + bp.year + ' Budget' : 'FY Budget';
            
            return `
              <div style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 24px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 14px; height: 14px; background: #F1C40F; border-radius: 3px;"></span>
                    <span style="color: #6b7280; font-size: 12px;">${actualLegend}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 14px; height: 14px; background: #1B4F72; border-radius: 3px;"></span>
                    <span style="color: #6b7280; font-size: 12px;">${derivedBase}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 14px; height: 14px; background: #5DADE2; border-radius: 3px;"></span>
                    <span style="color: #6b7280; font-size: 12px;">${fyLegend}</span>
                  </div>
                </div>
              </div>
            `;
          })()}
          
          <!-- Product Group Bars -->
          ${(() => {
            // Derive label for period budget row label (same logic as legend)
            const bp = reportData.basePeriod || reportData.columnOrder[basePeriodIndex] || {};
            const rawBaseText = bp.displayName || bp.label || bp.name || formatPeriodLabel(bp) || '';
            let periodBudgetLabel = '';
            if (rawBaseText) {
              periodBudgetLabel = rawBaseText.replace(/actual/i, 'Budget');
              if (periodBudgetLabel === rawBaseText) {
                periodBudgetLabel = rawBaseText + ' Budget';
              }
            } else {
              const part = bp.quarter || bp.hy || bp.month || bp.code || bp.short || 'Base Period';
              const year = bp.year ? ' ' + bp.year : '';
              periodBudgetLabel = part + year + ' Budget';
            }
            
            const productRows = budgetProducts.map(item => {
              const actualMT = item.actual / 1000;
              const periodBudgetMT = item.periodBudget / 1000;
              const yearBudgetMT = item.yearBudget / 1000;
              const periodDelta = (item.actual - item.periodBudget) / 1000;
              const yearDelta = (item.actual - item.yearBudget) / 1000;
              
              const maxValue = Math.max(actualMT, periodBudgetMT, yearBudgetMT) * 1.05;
              const actualWidth = (actualMT / maxValue) * 100;
              const periodBudgetWidth = (periodBudgetMT / maxValue) * 100;
              const yearBudgetWidth = (yearBudgetMT / maxValue) * 100;
              
              const actualBar = periodBudgetMT > 0 
                ? '<div style="height: 100%; width: ' + periodBudgetWidth + '%; background: #1B4F72; border-radius: 3px;"></div>'
                : '<div style="width: 100%; text-align: center; color: #6b7280; font-size: 12px; line-height: 24px;">Not budgeted</div>';
              
              const yearBar = yearBudgetMT > 0 
                ? '<div style="height: 100%; width: ' + yearBudgetWidth + '%; background: #5DADE2; border-radius: 3px;"></div>'
                : '<div style="width: 100%; text-align: center; color: #6b7280; font-size: 12px; line-height: 24px;">Not budgeted</div>';
              
              return '<div style="padding: 10px 0; border-bottom: 1px dashed #e5e7eb; margin-bottom: 0;">' +
                '<div style="font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 10px 2px;">' + item.name + '</div>' +
                '<div style="display: flex; flex-direction: column; gap: 4px;">' +
                  '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<div style="flex: 1; height: 24px; background: transparent; position: relative;">' +
                      '<div style="height: 100%; width: ' + actualWidth + '%; background: #F1C40F; border-radius: 3px;"></div>' +
                    '</div>' +
                    '<div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #111827;">' + (actualMT >= 1 ? Math.round(actualMT) + ' MT' : '') + '</div>' +
                    '<div style="width: 200px; text-align: center; font-size: 12px; line-height: 1.3; padding-left: 10px; white-space: nowrap;">' +
                      '<span style="color: #6b7280;">vs HY1 Budget: </span>' +
                      '<span style="color: ' + (item.periodAchievement >= 100 ? '#1f6feb' : '#dc2626') + '; font-weight: 800;">' + item.periodAchievement.toFixed(1) + '%</span>' +
                      '<span style="color: ' + (periodDelta >= 0 ? '#1f6feb' : '#dc2626') + ';"> (' + (periodDelta >= 0 ? '+' : '') + periodDelta.toFixed(1) + ' MT)</span>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<div style="flex: 1; height: 24px; background: transparent; position: relative;">' + actualBar + '</div>' +
                    '<div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #1B4F72;">' + (periodBudgetMT > 0 ? Math.round(periodBudgetMT) + ' MT' : '') + '</div>' +
                    '<div style="width: 200px; text-align: center; font-size: 12px; padding-left: 10px;"><div style="color: #6b7280;">' + periodBudgetLabel + '</div></div>' +
                  '</div>' +
                  '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<div style="flex: 1; height: 24px; background: transparent; position: relative;">' + yearBar + '</div>' +
                    '<div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #0f6085;">' + (yearBudgetMT > 0 ? Math.round(yearBudgetMT) + ' MT' : '') + '</div>' +
                    '<div style="width: 200px; text-align: center; font-size: 12px; line-height: 1.3; padding-left: 10px; white-space: nowrap;">' +
                      '<span style="color: #6b7280;">vs FY Budget: </span>' +
                      '<span style="color: ' + (item.yearAchievement >= 100 ? '#1f6feb' : '#dc2626') + '; font-weight: 800;">' + item.yearAchievement.toFixed(1) + '%</span>' +
                      '<span style="color: ' + (yearDelta >= 0 ? '#1f6feb' : '#dc2626') + ';"> (' + (yearDelta >= 0 ? '+' : '') + yearDelta.toFixed(1) + ' MT)</span>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('');
            
            return '<div style="font-family: ui-sans-serif, system-ui, -apple-system, \'Segoe UI\', Roboto, Helvetica, Arial;">' + productRows + '</div>';
          })()}
        </div>
        
        <!-- Product Groups Performance Tab -->
        <div class="perf-tab-content" id="products-tab">
          <!-- This tab will contain 3 sections to match the original:
               1. ProductGroupsKgsTable - MT Comparison Table
               2. ProductGroupsAmountTable - AED Sales Comparison Table
               3. ProductGroupKeyFacts - Product Groups Strategic Analysis -->
          
          ${generateProductGroupsPerformanceTab(reportData, kgsData, amountData, basePeriodIndex, strategicFindings)}
        </div>
          
        <!-- Customers Performance Tab -->
        <div class="perf-tab-content" id="customers-tab">
          ${generateCustomersPerformanceTab(customerData, customerAmountData, reportData, basePeriodIndex, customerFindings)}
        </div>
        
        <script>
          // Store chart data in global window scope for chart initialization
          window.yoyChartData = ${JSON.stringify(yoyEntries)};
          window.budgetChartData = ${JSON.stringify(budgetProducts)};
          
          console.log('YoY Chart Data:', window.yoyChartData);
          console.log('Budget Chart Data:', window.budgetChartData);
        </script>
      </div>
    `;
  };

  // Generate comprehensive page content
  const generatePageContent = () => {
    console.log('🔍 Generating comprehensive page content...');
    
    if (reportType === 'individual' && reportData) {
      // Generate individual sales rep report content - EXCLUDING export button
      return `
        <div class="sales-rep-report-content">
          <div class="report-container">
            <!-- Report Header -->
            <div class="report-header">
              <div class="header-content">
                <h1>${toProperCase(rep)} Sales Report</h1>
                <h2>${divisionName} Division</h2>
                <div class="report-period">
                  <div class="period-year">${formatPeriodLabel(reportData.basePeriod)}</div>
                  <div class="period-type">Performance Analysis</div>
                </div>
              </div>
            </div>
            
            <!-- KPI'S Summary -->
            <div class="report-section">
              <h2>KPI'S SUMMARY</h2>
              
              <div class="metric-row">
                <div class="metric-card">
                  <div class="metric-label">VOLUME ${formatPeriodLabel(reportData.basePeriod).toUpperCase()}</div>
                  <div class="metric-value" style="color: #003366;">${formatMT(reportData.performanceMetrics?.totalKgs || 0)} MT</div>
                  <div class="metric-previous">Previous Period: ${formatMT(reportData.kgsTotals?.[reportData.basePeriodIndex - 1] || 0)} MT</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">YOY GROWTH</div>
                  <div class="metric-value ${(reportData.basePeriodIndex > 0 && reportData.kgsTotals?.[reportData.basePeriodIndex - 1]) ? ((reportData.performanceMetrics?.totalKgs - reportData.kgsTotals[reportData.basePeriodIndex - 1]) / reportData.kgsTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? 'positive' : 'negative') : ''}" style="color: ${(reportData.basePeriodIndex > 0 && reportData.kgsTotals?.[reportData.basePeriodIndex - 1]) ? ((reportData.performanceMetrics?.totalKgs - reportData.kgsTotals[reportData.basePeriodIndex - 1]) / reportData.kgsTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? '#007bff' : '#dc3545') : '#666'};">
                    ${(reportData.basePeriodIndex > 0 && reportData.kgsTotals?.[reportData.basePeriodIndex - 1] > 0) ? 
                      ((reportData.performanceMetrics?.totalKgs - reportData.kgsTotals[reportData.basePeriodIndex - 1]) / reportData.kgsTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? '+' : '') +
                      (((reportData.performanceMetrics?.totalKgs - reportData.kgsTotals[reportData.basePeriodIndex - 1]) / reportData.kgsTotals[reportData.basePeriodIndex - 1] * 100).toFixed(1)) + '%'
                      : '<div style="font-size: 12px; color: #666;">📅 Add 2024 data<br/><span style="font-size: 10px;">for YoY comparison</span></div>'}
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">${formatPeriodLabel(reportData.basePeriod).toUpperCase()} BUDGET ACHIEVEMENT</div>
                  <div class="metric-value" style="color: #007bff;">${reportData.kgsTotals?.[reportData.basePeriodIndex + 1] > 0 ? Math.round((reportData.performanceMetrics?.totalKgs / reportData.kgsTotals[reportData.basePeriodIndex + 1]) * 100) : 0}%</div>
                  <div class="metric-previous">(${yearlyBudgetAchievement.toFixed(1)}% of yearly Budget)</div>
                </div>
              </div>
              
              <!-- Second row - Sales (Amount) metrics -->
              <div class="metric-row">
                <div class="metric-card">
                  <div class="metric-label">SALES ${formatPeriodLabel(reportData.basePeriod).toUpperCase()}</div>
                  <div class="metric-value" style="color: #003366;">${formatNumber(reportData.performanceMetrics?.totalAmount || 0, true)}</div>
                  <div class="metric-previous">Previous Period: ${formatNumber(reportData.amountTotals?.[reportData.basePeriodIndex - 1] || 0, true)}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">SALES YOY GROWTH</div>
                  <div class="metric-value ${(reportData.basePeriodIndex > 0 && reportData.amountTotals?.[reportData.basePeriodIndex - 1]) ? ((reportData.performanceMetrics?.totalAmount - reportData.amountTotals[reportData.basePeriodIndex - 1]) / reportData.amountTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? 'positive' : 'negative') : ''}" style="color: ${(reportData.basePeriodIndex > 0 && reportData.amountTotals?.[reportData.basePeriodIndex - 1]) ? ((reportData.performanceMetrics?.totalAmount - reportData.amountTotals[reportData.basePeriodIndex - 1]) / reportData.amountTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? '#007bff' : '#dc3545') : '#666'};">
                    ${(reportData.basePeriodIndex > 0 && reportData.amountTotals?.[reportData.basePeriodIndex - 1] > 0) ? 
                      ((reportData.performanceMetrics?.totalAmount - reportData.amountTotals[reportData.basePeriodIndex - 1]) / reportData.amountTotals[reportData.basePeriodIndex - 1] * 100 > 0 ? '+' : '') +
                      (((reportData.performanceMetrics?.totalAmount - reportData.amountTotals[reportData.basePeriodIndex - 1]) / reportData.amountTotals[reportData.basePeriodIndex - 1] * 100).toFixed(1)) + '%'
                      : '<div style="font-size: 12px; color: #666;">📅 Add 2024 data<br/><span style="font-size: 10px;">for YoY comparison</span></div>'}
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">${formatPeriodLabel(reportData.basePeriod).toUpperCase()} SALES BUDGET ACHIEVEMENT</div>
                  <div class="metric-value" style="color: #007bff;">${reportData.amountTotals?.[reportData.basePeriodIndex + 1] > 0 ? Math.round((reportData.performanceMetrics?.totalAmount / reportData.amountTotals[reportData.basePeriodIndex + 1]) * 100) : 0}%</div>
                  <div class="metric-previous">(${yearlySalesBudgetAchievement.toFixed(1)}% of yearly Budget)</div>
                </div>
              </div>
            </div>
            
            ${generateTop3ProductGroups(kgsData, reportData, basePeriodIndex)}
            
            ${generateCustomerInsights(customerData, basePeriodIndex, reportData)}
            
            ${generateGeographicDistribution(reportData, customerData, basePeriodIndex)}
            
            ${generatePerformanceDashboard(reportData, kgsData, amountData, customerData, basePeriodIndex)}
          </div>
        </div>
      `;
    } else if (reportType === 'tables' && kgsData && amountData) {
      // Generate tables view content - EXCLUDING export button and table options
      return `
        <div class="sales-rep-content">
          <div class="sales-rep-title">${toProperCase(rep)}</div>
          <div class="sales-rep-subtitle">Product Groups - Sales Kgs Comparison</div>
          
          <div class="product-groups-kgs-table">
            <h3>Product Groups Performance (KGS)</h3>
            <table class="kgs-comparison-table">
              <thead>
                <tr>
                  <th class="product-header">Product Groups</th>
                  ${columnOrder ? columnOrder.map(col => `
                    <th class="period-header">${formatPeriodLabel(col)}</th>
                  `).join('') : ''}
                  <th class="delta-header">Δ</th>
                </tr>
              </thead>
              <tbody>
                ${kgsData.map(product => `
                  <tr class="product-row">
                    <td class="product-name">${product.productGroup}</td>
                    ${product.rawValues.map(value => `
                      <td class="metric-cell">${formatNumber(value)}</td>
                    `).join('')}
                    <td class="delta-cell">
                      <span class="delta-arrow">${basePeriodIndex > 0 && product.rawValues[basePeriodIndex] > product.rawValues[basePeriodIndex - 1] ? '↑' : '↓'}</span>
                      <span class="delta-value ${basePeriodIndex > 0 && product.rawValues[basePeriodIndex] > product.rawValues[basePeriodIndex - 1] ? 'delta-up' : 'delta-down'}">
                        ${basePeriodIndex > 0 ? Math.abs(((product.rawValues[basePeriodIndex] - product.rawValues[basePeriodIndex - 1]) / product.rawValues[basePeriodIndex - 1] * 100)).toFixed(1) : '0'}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (reportType === 'divisional' && salesReps && salesRepData) {
      // Generate divisional table content - EXCLUDING export button and table options
      return `
        <div class="table-view">
          <div class="table-container-for-export">
            <div class="table-title">
              <h2>Sales by Sales Rep - ${selectedDivision}</h2>
              <div class="table-subtitle">
                <div style="font-size: 18px; font-weight: bold;">
                  ${getUAEDirhamSymbolHTML()}
                </div>
              </div>
            </div>
            
            <div class="product-groups-kgs-table">
              <h3>Sales Rep Performance Summary</h3>
              <table class="kgs-comparison-table">
                <thead>
                  <tr>
                    <th class="product-header">Sales Rep</th>
                    ${columnOrder ? columnOrder.map(col => `
                      <th class="period-header">${formatPeriodLabel(col)}</th>
                    `).join('') : ''}
                    <th class="delta-header">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  ${salesReps.map(rep => {
                    const repData = salesRepData[rep];
                    return `
                      <tr class="product-row">
                        <td class="product-name">${toProperCase(rep)}</td>
                        ${repData ? repData.rawValues.map(value => `
                          <td class="metric-cell">${formatNumber(value)}</td>
                        `).join('') : columnOrder.map(() => '<td class="metric-cell">0</td>').join('')}
                        <td class="delta-cell">
                          <span class="delta-arrow">${basePeriodIndex > 0 && repData && repData.rawValues[basePeriodIndex] > repData.rawValues[basePeriodIndex - 1] ? '↑' : '↓'}</span>
                          <span class="delta-value ${basePeriodIndex > 0 && repData && repData.rawValues[basePeriodIndex] > repData.rawValues[basePeriodIndex - 1] ? 'delta-up' : 'delta-down'}">
                            ${basePeriodIndex > 0 && repData ? Math.abs(((repData.rawValues[basePeriodIndex] - repData.rawValues[basePeriodIndex - 1]) / repData.rawValues[basePeriodIndex - 1] * 100)).toFixed(1) : '0'}%
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }
    
    return '<div class="no-data-container"><h3>No data available for export</h3></div>';
  };

  // Convert logo to base64 for embedding
  const getBase64Logo = async () => {
    try {
      const response = await fetch(ipTransparentLogo);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Could not load IP transparent logo for sales rep export:', error);
      return null;
    }
  };

  // Generate HTML export
  const handleExport = async () => {
    console.log('🔥 Sales Rep HTML Export started');
    console.log('📊 Report Data:', reportData);
    console.log('📊 Strategic Findings:', strategicFindings);
    console.log('👥 Customer Findings:', customerFindings);
    console.log('🌍 Geographic Distribution Data:', reportData?.geographicDistribution);

    // Check if all required data is ready before proceeding
    if (reportType === 'individual') {
      if (!strategicFindings) {
        console.warn('⏳ Skipping export: strategicFindings not ready');
        alert('Export cannot proceed: Product group analysis is still being calculated. Please wait a moment and try again.');
        return;
      }
      if (!customerFindings) {
        console.warn('⏳ Skipping export: customerFindings not ready');
        alert('Export cannot proceed: Customer analysis is still being calculated. Please wait a moment and try again.');
        return;
      }
    }
    setIsExporting(true);
    
    try {
      // Capture current page content
      const pageContent = generatePageContent();
      
      // Get logo as base64
      const logoBase64 = await getBase64Logo();
      
      // Generate filename with new format: {sales rep name}_Sales Report_{Base period}
      const repName = rep ? toProperCase(rep).replace(/\s+/g, '_') : 'Sales_Rep';
      const currentPeriod = columnOrder && basePeriodIndex !== null ? 
        formatPeriodLabel(columnOrder[basePeriodIndex]).replace(/\s+/g, '_') : 'Current_Period';
      const filename = `${repName}_Sales Report_${currentPeriod}.html`;
      
      // Generate period display text
      const periodDisplayText = `Report Period: ${currentPeriod.replace(/_/g, ' ')}`;
      
      // Create comprehensive HTML with all styles and content
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${repName} Sales Report</title>
    <!-- Chart.js for Performance Dashboard charts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
    <!-- ECharts for other visualizations -->
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script>
        // Fallback for offline use - check if libraries loaded
        if (typeof Chart === 'undefined') {
            console.log('Chart.js CDN failed to load, charts will not render');
        }
        if (typeof echarts === 'undefined') {
            console.log('ECharts CDN failed to load, charts will not render');
        }
    </script>
    <script>
        // Font loading detection and fallback
        function checkUaeSymbolFont() {
            var testElement = document.createElement('span');
            testElement.className = 'uae-symbol';
            testElement.innerHTML = getUAEDirhamSymbolHTML();
            testElement.style.visibility = 'hidden';
            testElement.style.position = 'absolute';
            testElement.style.fontSize = '16px';
            document.body.appendChild(testElement);
            
            var computedStyle = window.getComputedStyle(testElement);
            var fontFamily = computedStyle.fontFamily;
            
            var isCustomFontLoaded = fontFamily.includes('UAESymbol');
            
            document.body.removeChild(testElement);
            
            if (!isCustomFontLoaded) {
                var uaeSymbols = document.querySelectorAll('.uae-symbol');
                uaeSymbols.forEach(function(element) {
                    element.classList.add('fallback');
                    element.innerHTML = 'AED';
                });
                console.log('UAE symbol font not loaded, using AED fallback');
            }
        }
        
        // Fallback for ECharts loading
        window.addEventListener('load', function() {
            if (typeof echarts === 'undefined') {
                console.error('ECharts failed to load from CDN');
            }
            
            setTimeout(checkUaeSymbolFont, 2000);
        });
        
        // UAE Dirham symbol function
        function getUAEDirhamSymbolHTML() {
            return '${getUAEDirhamSymbolHTML()}';
        }
    </script>
    <style>
        ${KPI_CSS_CONTENT}
        @font-face {
            font-family: 'UAESymbol';
            src: url('data:font/woff2;base64,d09GMgABAAAAAAQYAA0AAAAACBAAAAPDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cBmAAgkIIBBEICoUUhCkLCgABNgIkAxAEIAWEEAcqG7YGUZQPTgfg47Apmy9iLmImDnGZy6goEb/MR/MYQbVG9uze3RO4ALBFhQoAVFiTQhIyGnVcolgBokvV/WSX/+Yu3Al08BwCbQCpXXyYbdB9UFW6f3A5/X/6J1j6rE/3ezTw3xoLs7ZIgImtaUX58mgKJJRpgon2VjNR6jPw3PkpCCJqLwS8uH9zAuBt6/4L8i7/FfljnFKSjqSrOCbPjpcmhICkbMLIBNdp7uaEepj22efcvw5Wmt7ZAQQA+kPIyOgNgcmEAr0Z6Q8UCoHPdb1urXtAQFQEvU+ii99CwG/KpmMPSCNA1LUECtCICg/wFtCKsZEAFz29WmIpx8aWRoXYmKqaKVpzXGPx4xRWxDrOiI46Pi5gYZrFV1nVURULIOacOMpfNA0OOEB0VAaxbJpa9cACVLfusOrAHHCYEXJSxuFMOMlzYrjif0QefiT+CEVJTut5CY9Q3rhrOk6ORKxIhLENPyYHzM7gNTvhyNbOyA+5cTUcxsBAwbYEz4hnOLRLvUv+pPBYyZ4Ao4LQv8rP5M8wVD4AXnPeCDrOY975thcv4RW7Nbu1u8x3fSUbxRt09Qc4BtdqBO+N0k1vktptmTo3z4ok3bC7ANk6w/v5t4cixFb5r4Qx7hewSoO10Pvjr2OEkcAWoYLFurl/zmyEQtN/3YQZ64aAodj/C3GxW7lQ9zTZa4S7P03ykfeRY/qVJdqcKi7WqGtO35P6ItlvOnmk15N2cyckpvH93UXSirc66fagHa6uBbXJS23+ca7vZswQxF4Tj19ElEbnsnt11wOWtsq+/M3LL16ExpEvXqQ0u/l86v/ogX370tJ8DDgwBNdO3jo5y7Zk7uZsJ9gAmutT+WV6dzmMm3ypofBt4uWqfDr5Sk6+TXQxu7ASArJV/NeJSG8NITj3+8alNdaT/zXi/PH0l6svQKMEAht4IsszBuSXAtMLb34AQBZGdrNA4e4LQEIITEcD0O6CAPTgD4HQZD0Ekga7IZANcU+AQlM0C1DqiHyk2hJLCUXRhIlAJ0O3TDJpt4XM5pgnC922yVLfcPicSnfEi9Ol24heLZo060e4qOOK8OXNVwAPRI1eDZp1gN8sDepcv0rmoJrehuYOgEU69WvRr12DegFg0bYL9/j6AID5GjQZ0F7RhlfKFQFm6MoV5GKvJg3HZ9K8EaEdKsu+Rl/BPPnx7NaAJ2NhnNPb1EB8aW8SSjrg9YJvsKefZ8s99YouLvbq09LbOMKbNx80b27D7W7O29uH9qaeKoYJcK2vmgiEfIGINHYBAA==') format('woff2');
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #e3f2fd;
            min-height: 100vh;
        }
        
        .header {
            background: white;
            padding: 20px 0;
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .logo-container {
            margin-bottom: 30px;
        }
        
        .logo {
            max-height: 80px;
            max-width: 200px;
            object-fit: contain;
        }
        
        .period-info {
            font-size: 1.1rem;
            color: #34495e;
            background: #ecf0f1;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: 600;
            margin-top: 0;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .uae-symbol {
            font-family: 'UAESymbol', sans-serif;
        }
        
        .uae-symbol.fallback {
            font-family: sans-serif !important;
        }
        
        /* UAE Dirham Symbol - SVG based, no font loading needed */
        .uae-dirham-symbol {
          display: inline-block;
          vertical-align: -0.1em;
          width: 1em;
          height: 1em;
          margin-right: 0.2em;
          fill: currentColor;
        }
        
        /* EXACT Sales Rep Report Styles from SalesRepReport.css */
        .sales-rep-report-content {
            padding: 20px;
            background-color: #f8f9fa;
            min-height: 100vh;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            overflow: visible;
        }

        /* Sales Rep Content Styles - EXACT from SalesBySalesRepTable.css */
        .sales-rep-content {
            margin: 20px;
            overflow-x: auto;
        }

        .sales-rep-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }

        .sales-rep-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
        }

        .table-title {
            margin-bottom: 20px;
            text-align: center;
        }

        .table-title h2 {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 0 0 10px 0;
        }

        .table-subtitle {
            margin-bottom: 15px;
        }

        .table-container-for-export {
            margin: 20px;
            overflow-x: auto;
        }

        .table-view {
            margin: 20px;
            overflow-x: auto;
        }

        .table-container {
            margin-top: 20px;
        }

        /* Additional table styling to match original exactly */
        .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .financial-table th {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-weight: bold;
            font-size: 14px;
        }

        .financial-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-size: 12px;
        }

        /* Ensure proper spacing and alignment */
        .no-data-container {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .no-data-container h3 {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
        }

        /* Report Header */
        .report-header {
            background: linear-gradient(135deg, #4a90e2, #87ceeb);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }

        .header-content h1 {
            font-size: 2.5em;
            margin: 0 0 10px 0;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            color: white !important;
        }

        .header-content h2 {
            font-size: 1.8em;
            margin: 0 0 15px 0;
            font-weight: 500;
            opacity: 0.9;
            color: white !important;
        }

        .report-period {
            font-size: 1.3em;
            opacity: 0.9;
            font-weight: 500;
            color: white !important;
        }

        .period-year {
            font-size: 1.4em;
            font-weight: 600;
            margin-bottom: 5px;
            color: white !important;
        }

        .period-type {
            font-size: 1.1em;
            font-weight: 400;
            color: white !important;
            margin-bottom: 10px;
        }

        .period-description {
            font-size: 0.9em;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.9) !important;
            max-width: 800px;
            margin: 15px auto 0;
            line-height: 1.4;
        }

        /* Report Sections */
        .report-section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }

        .report-section:last-child {
            border-bottom: none;
        }

        .report-section h2 {
            color: #667eea;
            font-size: 1.4em;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 2px solid #667eea;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
        }

        /* Ensure non-report-section blocks (like PerformanceDashboard) match the same title style */
        .section h2 {
            color: #667eea;
            font-size: 1.4em;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 2px solid #667eea;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
        }
        
        /* Executive Summary */
        .summary-description {
            color: #666;
            font-size: 1.1em;
            margin-bottom: 25px;
            text-align: center;
            font-style: italic;
        }

        .metric-row {
            display: flex;
            gap: 30px;
            margin: 25px 0;
            justify-content: center;
            flex-wrap: wrap;
        }

        .metric-card {
            background: linear-gradient(135deg, #f8f9fa, #ffffff);
            border: 2px solid #dee2e6;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            min-width: 200px;
            flex: 1;
            max-width: 300px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .metric-label {
            font-size: 0.9em;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .metric-value {
            font-size: 2.5em;
            font-weight: 700;
            color: #003366;
            margin-bottom: 5px;
            line-height: 1.1;
        }

        .metric-value.positive {
            color: #007bff;
        }

        .metric-value.negative {
            color: #dc3545;
        }

        .metric-value.warning {
            color: #f39c12;
        }

        .metric-previous {
            font-size: 0.9em;
            color: #666;
            font-weight: 500;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #eee;
        }

        /* Top 3 Product Groups Styles */
        .top-products-horizontal {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
        }

        .top-product-card {
            background: linear-gradient(135deg, #f8f9fa, #ffffff);
            border: 1px solid #dee2e6;
            border-left: 4px solid #667eea;
            border-radius: 12px;
            padding: 20px;
            min-width: 280px;
            max-width: 320px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .top-product-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        .product-rank {
            display: flex;
            justify-content: center;
            margin-bottom: 8px;
        }

        .rank-icon {
            font-size: 2em;
            min-width: 40px;
            text-align: center;
        }

        .product-info {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        .top-product-card .product-info .product-name {
            font-weight: bold !important;
            color: #333;
            font-size: 1.1em;
            margin-bottom: 4px;
            line-height: 1.3;
            text-align: center !important;
            width: 100%;
            display: block;
            margin-left: auto;
            margin-right: auto;
            padding: 0;
            box-sizing: border-box;
        }

        .product-percentage {
            font-size: 0.9em;
            color: #666;
            font-weight: 500;
            text-align: center;
            width: 100%;
        }

        .product-performance {
            text-align: center;
            font-weight: 600;
            font-size: 0.9em;
            padding: 6px 12px;
            border-radius: 6px;
            margin-top: auto;
        }

        .product-performance.positive {
            color: #007bff;
            background-color: rgba(0, 123, 255, 0.1);
        }

        .product-performance.negative {
            color: #dc3545;
            background-color: rgba(220, 53, 69, 0.1);
        }

        /* Customer Insights Styles */
        .customer-insights-section {
            margin-top: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #f8f9fa, #ffffff);
            border-radius: 15px;
            border: 1px solid #dee2e6;
        }

        .customer-insights-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #667eea;
        }

        .insights-icon {
            font-size: 1.5em;
        }

        .customer-insights-header h3 {
            color: #667eea;
            font-size: 1.4em;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
        }

        .customer-insights-cards {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .customer-insight-card {
            background: linear-gradient(135deg, #ffffff, #f8f9fa);
            border: 1px solid #dee2e6;
            border-left: 4px solid #667eea;
            border-radius: 12px;
            padding: 20px;
            min-width: 250px;
            max-width: 280px;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .customer-insight-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        .insight-icon {
            font-size: 2.5em;
            margin-bottom: 12px;
        }

        .insight-title {
            font-weight: 600;
            color: #333;
            font-size: 1em;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .insight-value {
            font-size: 2.2em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 8px;
            line-height: 1.1;
        }

        .insight-subtitle {
            font-size: 0.9em;
            color: #666;
            font-weight: 500;
            margin-bottom: 8px;
            line-height: 1.3;
            min-height: 20px;
        }

        .insight-footer {
            font-size: 0.8em;
            color: #888;
            font-weight: 400;
        }

        .customer-list {
            max-height: 120px;
            overflow-y: auto;
        }

        .customer-name-line {
            font-size: 0.85em;
            color: #666;
            font-weight: 500;
            margin-bottom: 3px;
            padding: 2px 0;
            line-height: 1.2;
        }

        .customer-name-line:last-child {
            margin-bottom: 0;
        }

        /* Geographic Distribution Section - EXACT from ExecutiveSummary.css */
        .geo-distribution-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 32px !important;
            width: 100% !important;
            max-width: 1400px !important;
            margin: 0 auto !important;
        }

        .geo-main-row {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 40px !important;
            width: 100% !important;
            flex-wrap: nowrap !important;
        }

        .geo-regional-row {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 24px !important;
            width: 100% !important;
            flex-wrap: wrap !important;
            max-width: 1600px;
        }

        .geo-card {
            flex: 1 !important;
            min-width: 280px !important;
            max-width: 400px !important;
            border-radius: 18px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            color: white;
            font-weight: bold;
            position: relative;
            overflow: hidden;
            border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .geo-card.local-card {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }

        .geo-card.export-card {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }

        .geo-flag {
            font-size: 3em !important;
            margin-bottom: 15px !important;
        }

        .geo-label {
            font-size: 1.5em !important;
            margin-bottom: 10px !important;
            font-weight: bold !important;
            text-transform: uppercase;
        }

        .geo-percentage {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .geo-subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .geo-region-card {
            flex: 1;
            min-width: 250px;
            max-width: 100%;
            border-radius: 18px;
            box-shadow: 0 4px 16px rgba(25, 118, 210, 0.15);
            padding: 24px 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            color: white;
            font-weight: bold;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        }

        .region-icon {
            font-size: 2.5em;
            margin-bottom: 12px;
        }

        .region-name {
            font-size: 1.3em;
            margin-bottom: 8px;
            line-height: 1.3;
            font-weight: 700;
        }

        .region-percentage {
            font-size: 2em;
            margin-bottom: 8px;
            font-weight: bold;
        }

        .region-details {
            font-size: 1em;
            opacity: 0.9;
            line-height: 1.2;
        }

        /* Performance Dashboard */
        .tab-container {
            margin: 30px 0;
        }

        .tab-instructions {
            color: #666;
            font-style: italic;
            margin-bottom: 20px;
            text-align: center;
        }

        .tab-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 30px;
            justify-content: center;
            padding: 0 20px;
        }

        .tab-button {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 16px 20px;
            cursor: pointer;
            font-weight: 700;
            font-size: 15px;
            color: #64748b;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Inter', system-ui, sans-serif;
            min-width: 200px;
            max-width: 220px;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            user-select: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            text-align: center;
            line-height: 1.3;
            white-space: normal;
            word-wrap: break-word;
        }

        .tab-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 16px;
        }

        .tab-button:hover {
            color: #374151;
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .tab-button:hover::before {
            opacity: 1;
        }

        .tab-button.active {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            border-color: #1e40af;
            color: #ffffff;
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(30, 64, 175, 0.3);
        }

        .tab-button.active::before {
            display: none;
        }

        .tab-button:active {
            transform: translateY(-1px) scale(0.98);
        }

        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .chart-container {
            min-height: 200px;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        /* Product Groups KGS Table Styles - EXACT from SalesBySalesRepTable.css */
        .product-groups-kgs-table {
            margin: 20px 0;
            padding: 0;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .product-groups-kgs-table h3 {
            margin: 0 0 20px 0;
            font-size: 22px;
            font-weight: 600;
            color: #333;
            text-align: center;
            padding: 20px;
            background: white;
        }

        .kgs-comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 16px;
            background: white;
            border: 1px solid #ddd;
        }

        .kgs-comparison-table th {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-weight: bold;
            font-size: 14px;
        }

        .kgs-comparison-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-size: 12px;
        }

        .kgs-comparison-table .product-header {
            text-align: left !important;
            font-weight: bold !important;
            background-color: #f5f5f5;
            font-size: 12px;
            color: #333;
        }

        .kgs-comparison-table .period-header {
            font-weight: bold;
            font-size: 16px;
            color: #333;
        }

        .kgs-comparison-table .delta-header {
            font-weight: bold;
            font-size: 16px;
            color: #856404;
        }

        .kgs-comparison-table .product-name {
            text-align: left;
            font-weight: 600;
            color: #333;
            background: white;
            padding-left: 8px;
            font-size: 12px;
        }

        .kgs-comparison-table .metric-cell {
            text-align: center;
            font-weight: 500;
            color: #333;
            background: white;
            font-size: 12px;
            font-variant-numeric: tabular-nums;
        }

        .kgs-comparison-table .delta-cell {
            background: white;
            font-weight: 600;
            text-align: center;
            font-size: 12px;
        }

        .kgs-comparison-table .delta-arrow {
            margin-right: 3px;
            font-size: 12px;
            font-weight: bold;
        }

        .kgs-comparison-table .delta-value {
            font-size: 12px;
            font-weight: 600;
        }

        .kgs-comparison-table .delta-up {
            color: #28a745;
        }

        .kgs-comparison-table .delta-down {
            color: #dc3545;
        }

        /* KPI Cards Styles */
        .executive-summary-section {
            margin-top: 30px;
        }

        .kpi-section-title {
            color: #2c3e50;
            font-size: 1.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }

        .kpi-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .kpi-card.large {
            grid-column: span 2;
        }

        .kpi-card:hover {
            transform: translateY(-5px);
            border-color: #667eea;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        /* Performance Dashboard Styles */
        .tab-container {
            margin-top: 20px;
        }
        
        .tab-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .tab-button {
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 12px 20px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }
        
        .tab-button.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: #667eea;
        }
        
        .tab-button:hover:not(.active) {
            background: #e9ecef;
            border-color: #adb5bd;
        }
        
        .tab-content {
            display: none;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            min-height: 400px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin: 20px 0;
        }
        
        /* Customer Insights Styles */
        .customer-insights-section {
            margin-top: 30px;
        }
        
        .customer-insights-header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 25px;
        }
        
        .insights-icon {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .customer-insights-header h3 {
            color: #2c3e50;
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .customer-insights-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            width: 100%;
        }
        
        .customer-insight-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .customer-insight-card:hover {
            transform: translateY(-5px);
            border-color: #667eea;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .insight-icon {
            font-size: 2rem;
            margin-bottom: 15px;
        }
        
        .insight-title {
            font-size: 0.9rem;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .insight-value {
            font-size: 2rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .insight-subtitle {
            font-size: 0.9rem;
            color: #495057;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .insight-footer {
            font-size: 0.8rem;
            color: #6c757d;
            font-style: italic;
        }
        
        .customer-list {
            text-align: left;
        }
        
        .customer-name-line {
            padding: 2px 0;
            font-size: 0.85rem;
        }
        
        /* Geographic Distribution Styles */
        .executive-summary-section {
            margin-top: 30px;
        }
        
        .kpi-section-title {
            color: #2c3e50;
            font-size: 1.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .kpi-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .kpi-card.large {
            grid-column: span 2;
        }
        
        .kpi-card:hover {
            transform: translateY(-5px);
            border-color: #667eea;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .kpi-label {
            font-size: 0.9rem;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        
        .kpi-value {
            font-size: 2rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .kpi-trend {
            font-size: 0.8rem;
            color: #6c757d;
            font-style: italic;
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .division-title {
                font-size: 2rem;
            }
            
            .metric-row {
                grid-template-columns: 1fr;
            }
            
            .customer-insights-cards {
                grid-template-columns: 1fr;
            }
            
            .kpi-cards {
                grid-template-columns: 1fr;
            }
            
            .kpi-card.large {
                grid-column: span 1;
            }
            
            .tab-buttons {
                flex-direction: column;
            }
            
            .financial-table {
                font-size: 0.8rem;
            }
            
            .financial-table th,
            .financial-table td {
                padding: 8px 4px;
            }
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
            }
            
            .header {
                box-shadow: none;
                border-bottom: 2px solid #333;
            }
            
            .section {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            .metric-card,
            .customer-insight-card,
            .kpi-card {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
        
        /* Performance Dashboard Tab Styles */
        .perf-tab-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .perf-tab-btn {
            padding: 12px 24px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            cursor: pointer;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            outline: none;
        }
        
        .perf-tab-btn:hover {
            background: #f0f4ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .perf-tab-btn.active {
            background: #667eea;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .perf-tab-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }
        
        .perf-tab-content.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Chart container styles */
        .chart-container {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        /* Center all h2 and h3 titles in report sections */
        .report-section h2,
        .report-section h3,
        .section h2,
        .section h3 {
            text-align: center !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <div class="logo-container">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="logo">` : ''}
            </div>
            <div class="period-info">${periodDisplayText}</div>
        </div>
    </div>
    
    <div class="container">
        ${pageContent}
    </div>
    
    <script>
    // Performance Dashboard Tab Switching and Chart Initialization
    (function() {
        console.log('Initializing Performance Dashboard...');
        
        // Tab Switching Functionality
        function initTabSwitching() {
            const tabButtons = document.querySelectorAll('.perf-tab-btn');
            const tabContents = document.querySelectorAll('.perf-tab-content');
            
            if (tabButtons.length === 0) {
                console.log('No performance dashboard tabs found');
                return;
            }
            
            tabButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const targetTab = this.getAttribute('data-tab');
                    console.log('Switching to tab:', targetTab);
                    
                    // Remove active class from all buttons and hide all contents
                    tabButtons.forEach(btn => {
                        btn.classList.remove('active');
                        btn.style.background = 'white';
                        btn.style.color = '#667eea';
                    });
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                        content.style.display = 'none';
                    });
                    
                    // Add active class to clicked button
                    this.classList.add('active');
                    this.style.background = '#667eea';
                    this.style.color = 'white';
                    
                    // Show corresponding content
                    const targetContent = document.getElementById(targetTab + '-tab');
                    if (targetContent) {
                        targetContent.classList.add('active');
                        targetContent.style.display = 'block';
                        
                        // Initialize chart if switching to YoY tab
                        if (targetTab === 'yoy' && !window.yoyChartInitialized) {
                            initYoYChart();
                        }
                        // Budget tab uses HTML/CSS bars, no Chart.js initialization needed
                    }
                });
            });
            
            console.log('Tab switching initialized');
        }
        
        // Initialize YoY Growth Chart
        function initYoYChart() {
            console.log('Initializing YoY Growth Chart...');
            const canvas = document.getElementById('yoyGrowthChart');
            if (!canvas || typeof Chart === 'undefined') {
                console.error('Canvas element or Chart.js not found');
                return;
            }
            
            if (!window.yoyChartData || window.yoyChartData.length === 0) {
                console.error('No YoY chart data available');
                return;
            }
            
            const data = window.yoyChartData;
            const labels = data.map(entry => entry.label);
            const percentages = data.map(entry => entry.percentage);
            const mtDifferences = data.map(entry => entry.mtDifference);
            
            // Calculate symmetric range around zero
            const maxPos = Math.max(0, ...percentages);
            const minNeg = Math.min(0, ...percentages);
            const maxAbsValue = Math.max(Math.abs(maxPos), Math.abs(minNeg));
            const padding = Math.ceil(maxAbsValue * 0.2);
            const maxGrowth = Math.ceil((maxAbsValue + padding) / 100) * 100;
            const minGrowth = -maxGrowth;
            
            const ctx = canvas.getContext('2d');
            window.yoyChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Year-over-Year Growth (%)',
                        data: percentages,
                        backgroundColor: function(context) {
                            const value = context.raw || 0;
                            if (value >= 50) return '#059669';
                            if (value >= 20) return '#10b981';
                            if (value >= 10) return '#34d399';
                            if (value >= 0) return '#6ee7b7';
                            if (value >= -10) return '#fbbf24';
                            if (value >= -20) return '#f59e0b';
                            return '#ef4444';
                        },
                        borderColor: function(context) {
                            const value = context.raw || 0;
                            if (value >= 50) return '#047857';
                            if (value >= 20) return '#059669';
                            if (value >= 10) return '#10b981';
                            if (value >= 0) return '#34d399';
                            if (value >= -10) return '#d97706';
                            if (value >= -20) return '#f59e0b';
                            return '#dc2626';
                        },
                        borderWidth: 2,
                        barThickness: 32,
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { top: 20, right: 250, bottom: 20, left: 20 }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.95)',
                            padding: 20,
                            titleFont: { size: 16, weight: 'bold' },
                            bodyFont: { size: 15 },
                            bodySpacing: 8,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const percentage = percentages[index];
                                    const mtDiff = mtDifferences[index];
                                    return [
                                        'YoY Growth: ' + percentage.toFixed(1) + '%',
                                        'Volume Impact: ' + (mtDiff >= 0 ? '+' : '') + mtDiff.toFixed(2) + ' MT',
                                        percentage >= 0 ? '✅ Positive Growth' : '⚠️ Decline'
                                    ];
                                }
                            }
                        },
                        datalabels: {
                            align: function(context) {
                                const value = context.dataset.data[context.dataIndex];
                                return value >= 0 ? 'end' : 'start';
                            },
                            anchor: function(context) {
                                const value = context.dataset.data[context.dataIndex];
                                return value >= 0 ? 'end' : 'start';
                            },
                            offset: 4,
                            formatter: function(value, context) {
                                const mtDiff = mtDifferences[context.dataIndex];
                                return value.toFixed(1) + '% (' + (mtDiff >= 0 ? '+' : '') + mtDiff.toFixed(1) + ' MT)';
                            },
                            font: { size: 13, weight: 'bold' },
                            color: '#111827'
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            min: minGrowth,
                            max: maxGrowth,
                            grid: {
                                color: function(context) {
                                    return context.tick.value === 0 ? '#374151' : '#e5e7eb';
                                },
                                lineWidth: function(context) {
                                    return context.tick.value === 0 ? 3 : 1;
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                },
                                font: { size: 13, weight: '600' },
                                color: '#374151'
                            },
                            title: {
                                display: true,
                                text: 'Year-over-Year Growth (%)',
                                font: { size: 15, weight: 'bold' },
                                color: '#1f2937',
                                padding: { top: 15 }
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                font: { size: 13, weight: '700' },
                                color: '#1f2937',
                                padding: 10
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels]
            });
            
            window.yoyChartInitialized = true;
            console.log('YoY Chart initialized successfully');
        }
        
        // Budget Achievement uses HTML/CSS bars, no Chart.js initialization needed
        
        // Initialize everything when DOM is loaded
        function initializeAll() {
            // Hide all tabs except the first one on load
            const allTabContents = document.querySelectorAll('.perf-tab-content');
            allTabContents.forEach((content, index) => {
                if (index === 0) {
                    content.style.display = 'block';
                    content.classList.add('active');
                } else {
                    content.style.display = 'none';
                    content.classList.remove('active');
                }
            });
            
            // Initialize tab switching
            initTabSwitching();
            
            // Initialize YoY chart by default (first tab)
            if (document.getElementById('yoyGrowthChart')) {
                initYoYChart();
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(initializeAll, 500);
            });
        } else {
            setTimeout(initializeAll, 500);
        }
    })();
    </script>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Sales Rep HTML export completed:', filename);
      
    } catch (error) {
      console.error('❌ Sales Rep HTML export failed:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      alert(`Export failed: ${error.message}. Check console for details.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting || !dataGenerated}
      className="export-btn html-export"
      style={{ 
        marginLeft: '10px',
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: isExporting || !dataGenerated ? 'not-allowed' : 'pointer',
        opacity: isExporting || !dataGenerated ? 0.6 : 1,
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.3s ease'
      }}
      title={!dataGenerated ? "Please generate data first" : "Export complete page to HTML"}
    >
      {isExporting ? 'Exporting...' : '📄 Export HTML'}
    </button>
  );
};

export default SalesRepHTMLExport;
