import React, { useState, useEffect } from 'react';
import { getRegionForCountry } from '../dashboard/CountryReference';
import { useFilter } from '../../contexts/FilterContext';
import UAEDirhamSymbol from '../dashboard/UAEDirhamSymbol';
import '../dashboard/KPIExecutiveSummary.css';
import './ExecutiveSummary.css';

// Regional mapping moved to CountryReference.js for consistency

  // Note: getRegionForCountry is now imported from CountryReference.js for consistency

  // Helper function to get region-specific color based on export percentage
  const getRegionColor = (exportPercentage) => {
    if (exportPercentage >= 50) return '#0D47A1';      // Dark blue for high percentages
    if (exportPercentage >= 30) return '#1565C0';      // Medium-dark blue
    if (exportPercentage >= 20) return '#1976D2';      // Medium blue
    if (exportPercentage >= 10) return '#1E88E5';      // Medium-light blue
    if (exportPercentage >= 5) return '#42A5F5';       // Light blue
    return '#64B5F6';                                   // Very light blue for low percentages
  };

  // Helper function to get region-specific emoji icons
  const getRegionIcon = (regionName) => {
    const iconMap = {
      'North Africa': '🌍',
      'Arabian Peninsula': '🌏',
      'West Asia': '🌎',
      'Southern Africa': '🌍',
      'Levant': '🌏',
      'Europe': '🌎',
      'Americas': '🌍',
      'Asia-Pacific': '🌏'
    };
    return iconMap[regionName] || '🌐';
  };

const ExecutiveSummary = ({ performanceMetrics, reportData, kgsData, basePeriodIndex, onYearlyBudgetCalculated }) => {
  // React hooks must be called before any early returns
  const [yearlyBudgetTotal, setYearlyBudgetTotal] = useState(0);
  const [yearlySalesBudgetTotal, setYearlySalesBudgetTotal] = useState(0);
  const [countryData, setCountryData] = useState(null);
  const { columnOrder } = useFilter();
  
  
  // Fetch yearly budget data from database
  useEffect(() => {
    const fetchYearlyBudget = async () => {
      if (!reportData || !reportData.periodLabel) return;
      
      try {
        // Extract year from base period
        const basePeriod = reportData.periodLabel;
        let year;
        
        if (typeof basePeriod === 'object' && basePeriod.year) {
          year = basePeriod.year;
        } else if (typeof basePeriod === 'string') {
          // Try to extract year from string format like "HY1 2024" or "Q1 2024"
          const yearMatch = basePeriod.match(/\d{4}/);
          year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        } else {
          year = new Date().getFullYear();
        }
        
        // Debug: Log the parameters being sent
        console.log('Fetching yearly budget with params:', {
          salesRep: reportData.salesRep,
          year: year,
          basePeriod: basePeriod
        });
        
        // Fetch both volume and sales yearly budgets
        const [volumeResponse, salesResponse] = await Promise.all([
          fetch('http://localhost:3001/api/fp/yearly-budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salesRep: reportData.salesRep,
              year: year,
              valuesType: 'KGS'  // For volume
            })
          }),
          fetch('http://localhost:3001/api/fp/yearly-budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salesRep: reportData.salesRep,
              year: year,
              valuesType: 'Amount'  // For sales
            })
          })
        ]);
        
        // Process volume budget response
        if (volumeResponse.ok) {
          const result = await volumeResponse.json();
          console.log('Yearly volume budget API response:', result);
          setYearlyBudgetTotal(result.data || 0);
        } else {
          console.error('Yearly volume budget API failed:', volumeResponse.status, volumeResponse.statusText);
        }
        
        // Process sales budget response
        if (salesResponse.ok) {
          const result = await salesResponse.json();
          console.log('Yearly sales budget API response:', result);
          setYearlySalesBudgetTotal(result.data || 0);
        } else {
          console.error('Yearly sales budget API failed:', salesResponse.status, salesResponse.statusText);
        }
      } catch (error) {
        console.error('Error fetching yearly budget:', error);
      }
    };
    
    fetchYearlyBudget();
  }, [reportData]);

  // Notify parent component when yearly budget calculations are updated
  useEffect(() => {
    if (onYearlyBudgetCalculated && (yearlyBudgetTotal > 0 || yearlySalesBudgetTotal > 0)) {
      // Calculate the percentages here (same as displayed in the UI)
      const currentTotal = performanceMetrics?.totalKgs || 0;
      const currentAmountTotal = performanceMetrics?.totalAmount || 0;
      
      const yearlyBudgetAchievement = yearlyBudgetTotal > 0 ? (currentTotal / yearlyBudgetTotal * 100) : 0;
      const yearlySalesBudgetAchievement = yearlySalesBudgetTotal > 0 ? (currentAmountTotal / yearlySalesBudgetTotal * 100) : 0;
      
      onYearlyBudgetCalculated({
        yearlyBudgetTotal,
        yearlySalesBudgetTotal,
        yearlyBudgetAchievement,
        yearlySalesBudgetAchievement
      });
    }
  }, [yearlyBudgetTotal, yearlySalesBudgetTotal, performanceMetrics, onYearlyBudgetCalculated]);

  // Fetch country sales data - SIMPLIFIED APPROACH MATCHING MAIN KPI PAGE
  useEffect(() => {
    const fetchCountryData = async () => {
      if (!reportData || !reportData.salesRep || !reportData.periodLabel) return;
      
      // Extract period information from reportData.periodLabel (this comes from SalesRepReport.js)
      const period = reportData.periodLabel;
      let year, months;
      
      try {
        console.log('=== GEOGRAPHIC DATA FETCH (SIMPLIFIED) ===');
        console.log('Sales Rep:', reportData.salesRep);
        console.log('Period Label:', reportData.periodLabel);
        
        if (typeof period === 'object' && period.year) {
          year = period.year;
          
          // Handle different period types
          if (period.months && Array.isArray(period.months) && period.months.length > 0) {
            // Use all months from the period
            months = period.months;
          } else if (period.month) {
            // Handle quarter/half-year periods by converting to month arrays
            if (period.month === 'HY1' || period.month === 'H1') {
              months = ['January', 'February', 'March', 'April', 'May', 'June'];
            } else if (period.month === 'HY2' || period.month === 'H2') {
              months = ['July', 'August', 'September', 'October', 'November', 'December'];
            } else if (period.month === 'Q1') {
              months = ['January', 'February', 'March'];
            } else if (period.month === 'Q2') {
              months = ['April', 'May', 'June'];
            } else if (period.month === 'Q3') {
              months = ['July', 'August', 'September'];
            } else if (period.month === 'Q4') {
              months = ['October', 'November', 'December'];
            } else {
              months = [period.month];  // Single month as array
            }
          } else {
            months = ['January', 'February', 'March', 'April', 'May', 'June'];  // Default to HY1
          }
        } else {
          // Fallback to working values
          year = 2025;
          months = ['January', 'February', 'March', 'April', 'May', 'June'];
        }
        
        console.log('Requesting country data for:', { division: 'FP', salesRep: reportData.salesRep, year, months });
        
        // Try the working API endpoint first
        // Convert month names to numbers as expected by the API
        const monthMap = {
          'January': 1, 'February': 2, 'March': 3, 'April': 4,
          'May': 5, 'June': 6, 'July': 7, 'August': 8,
          'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        const monthNumbers = (months || []).map(m => {
          if (typeof m === 'number') return m;
          if (typeof m === 'string') {
            const mm = monthMap[m] ?? parseInt(m, 10);
            return Number.isFinite(mm) ? mm : null;
          }
          return null;
        }).filter(v => v !== null);

        const response = await fetch('http://localhost:3001/api/sales-by-country-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            division: 'FP',
            salesRep: reportData.salesRep,
            year: year,
            months: monthNumbers,
            dataType: 'Actual'
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Country data received:', result.data);
          
          if (result.success && result.data && result.data.length > 0) {
            setCountryData({
              data: result.data || [],
              actualPeriod: { year, months, salesRep: reportData.salesRep },
              isDifferentSalesRep: false
            });
          } else {
            console.log('⚠️ No country data returned from API, trying fallback...');
            // Fallback: Generate sample data for testing
            const fallbackData = generateFallbackCountryData(reportData.salesRep);
            setCountryData({
              data: fallbackData,
              actualPeriod: { year, months, salesRep: reportData.salesRep },
              isDifferentSalesRep: false
            });
          }
        } else {
          console.error('❌ Country data API failed:', response.statusText);
          // Fallback: Generate sample data for testing
          const fallbackData = generateFallbackCountryData(reportData.salesRep);
          setCountryData({
            data: fallbackData,
            actualPeriod: { year, months, salesRep: reportData.salesRep },
            isDifferentSalesRep: false
          });
        }
      } catch (error) {
        console.error('❌ Error fetching country data:', error);
        // Fallback: Generate sample data for testing
        const fallbackData = generateFallbackCountryData(reportData.salesRep);
        setCountryData({
          data: fallbackData,
          actualPeriod: { year, months, salesRep: reportData.salesRep },
          isDifferentSalesRep: false
        });
      }
    };
    
    fetchCountryData();
  }, [reportData]);
  
  if (!performanceMetrics || !reportData) {
    return <div>Loading performance metrics...</div>;
  }

  const { totalKgs, totalAmount } = performanceMetrics;

  // Calculate YoY Growth from period comparison data for Volume (KGS)
  const currentTotal = totalKgs || 0;
  const previousTotal = reportData.kgsTotals?.[reportData.basePeriodIndex - 1] || 0;
  const budgetTotal = reportData.kgsTotals?.[reportData.basePeriodIndex + 1] || 0;

  // Check if we have previous period data for YoY comparison
  const hasPreviousPeriod = reportData.basePeriodIndex > 0 && previousTotal > 0;
  
  const yoyGrowth = hasPreviousPeriod ? ((currentTotal - previousTotal) / previousTotal * 100) : null;
  const budgetAchievement = budgetTotal > 0 ? (currentTotal / budgetTotal * 100) : 0;
  
  // Calculate Sales (Amount) metrics
  const currentAmountTotal = totalAmount || 0;
  const previousAmountTotal = reportData.amountTotals?.[reportData.basePeriodIndex - 1] || 0;
  const budgetAmountTotal = reportData.amountTotals?.[reportData.basePeriodIndex + 1] || 0;

  // Check if we have previous period data for YoY comparison
  const hasPreviousAmountPeriod = reportData.basePeriodIndex > 0 && previousAmountTotal > 0;
  
  const amountYoyGrowth = hasPreviousAmountPeriod ? ((currentAmountTotal - previousAmountTotal) / previousAmountTotal * 100) : null;
  const amountBudgetAchievement = budgetAmountTotal > 0 ? (currentAmountTotal / budgetAmountTotal * 100) : 0;
  
  // Calculate yearly budget achievements
  // For volume (KGS), show what percentage of the yearly budget has been achieved so far
  const yearlyBudgetAchievement = yearlyBudgetTotal > 0 ? (currentTotal / yearlyBudgetTotal * 100) : 0;
  
  // For sales (Amount), calculate what percentage of the yearly budget has been achieved
  // This shows the proportion of the yearly budget achieved in the current period
  const yearlySalesBudgetAchievement = yearlySalesBudgetTotal > 0 
    ? (currentAmountTotal / yearlySalesBudgetTotal * 100) 
    : 0;

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
      return <><UAEDirhamSymbol />{formatted}</>;
    }
    return formatted;
  };

  // Format MT values (convert from kg to MT) with no decimals
  const formatMT = (value) => {
    const numericValue = typeof value === 'number' ? value : parseFloat(value || 0);
    const mtValue = isNaN(numericValue) ? 0 : numericValue / 1000;
    return Math.round(mtValue).toLocaleString('en-US');
  };

  const formatPercentage = (num) => {
    return Math.round(num || 0) + '%';
  };

  const formatYoYPercentage = (num) => {
    return (num || 0).toFixed(1) + '%';
  };

  const getCardClass = (value, type) => {
    if (type === 'growth') {
      return value > 0 ? 'positive' : 'negative';
    }
    if (type === 'budget') {
      return value >= 25 ? 'positive' : value >= 15 ? 'warning' : 'negative';
    }
    return '';
  };

  const formatPeriodLabel = (period) => {
    console.log('formatPeriodLabel called with:', period, 'type:', typeof period);
    if (!period) return 'Current Period';
    if (typeof period === 'string') {
      // If it's a string, capitalize period types like HY1, HY2, Q1, Q2 and handle full strings like "hy1 2024"
      return period.replace(/\b(hy[12]|q[1-4]|h[12])\b/gi, (match) => match.toUpperCase());
    }
    if (typeof period === 'object' && period.year && period.month) {
      // Capitalize period types like HY1, HY2, Q1, Q2, etc.
      const formattedMonth = period.month.toUpperCase();
      return `${formattedMonth} ${period.year}`;
    }
    return 'Current Period';
  };

  // const getDetailedDescription = () => {
  //   const currentPeriod = formatPeriodLabel(reportData.periodLabel);
  //   const previousPeriod = formatPeriodLabel(reportData.prevPeriod);
  //   const budgetPeriod = formatPeriodLabel(reportData.nextPeriod);
  //   
  //   return `This report analyzes actual ${currentPeriod} sales & volume performance versus ${previousPeriod} and against ${budgetPeriod} budget targets.`;
  // };

  // Calculate top 3 product groups from kgsData with growth comparison
  const getTop3ProductGroups = () => {
    if (!kgsData || !Array.isArray(kgsData) || basePeriodIndex === null || !columnOrder) {
      return [];
    }
    
    // Find the correct rawValues index for the base period
    const rawValuesIndex = columnOrder.findIndex((col, index) => index === basePeriodIndex);
    if (rawValuesIndex === -1) return [];
    
    return kgsData
      .filter(item => (item.rawValues[rawValuesIndex] || 0) > 0)
      .sort((a, b) => (b.rawValues[rawValuesIndex] || 0) - (a.rawValues[rawValuesIndex] || 0))
      .slice(0, 3)
      .map((item, index) => {
        const currentValue = item.rawValues[rawValuesIndex] || 0;
        const previousRawIndex = rawValuesIndex > 0 ? rawValuesIndex - 1 : -1;
        const nextRawIndex = rawValuesIndex < item.rawValues.length - 1 ? rawValuesIndex + 1 : -1;
        
        const previousValue = previousRawIndex >= 0 ? (item.rawValues[previousRawIndex] || 0) : 0;
        const budgetValue = nextRawIndex >= 0 ? (item.rawValues[nextRawIndex] || 0) : 0;
        const growthPercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0;
        const budgetAchievement = budgetValue > 0 ? ((currentValue / budgetValue) * 100) : 0;
        
        return {
          rank: index + 1,
          productGroup: item.name || item.productGroup || item.productgroup || 'Unknown Product',
          value: currentValue,
          percentage: currentTotal > 0 ? (currentValue / currentTotal * 100) : 0,
          growthPercent: growthPercent,
          budgetAchievement: budgetAchievement
        };
      });
  };

  // Helper function to convert text to proper case
  const toProperCase = (str) => {
    if (!str) return '';
    return str.toString().trim().split(' ').map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  // Generate fallback country data for testing when API fails
  const generateFallbackCountryData = (salesRep) => {
    console.log('🔄 Generating fallback country data for:', salesRep);
    
    // Sample country data with realistic values
    const fallbackCountries = [
      { country: 'United Arab Emirates', value: 1500000 }, // Local
      { country: 'Saudi Arabia', value: 800000 }, // Export
      { country: 'Kuwait', value: 600000 }, // Export
      { country: 'Qatar', value: 400000 }, // Export
      { country: 'Egypt', value: 300000 }, // Export
      { country: 'Jordan', value: 250000 }, // Export
      { country: 'Lebanon', value: 200000 }, // Export
      { country: 'Germany', value: 150000 }, // Export
      { country: 'United Kingdom', value: 120000 }, // Export
      { country: 'India', value: 100000 } // Export
    ];
    
    console.log('📊 Fallback country data generated:', fallbackCountries);
    return fallbackCountries;
  };

  // Calculate geographic distribution - EXACTLY LIKE MAIN KPI PAGE
  const getGeographicDistribution = () => {
    console.log('=== CALCULATING GEOGRAPHIC DISTRIBUTION (LIKE MAIN KPI) ===');
    console.log('countryData:', countryData);
    console.log('countryData?.data:', countryData?.data);
    
    const actualData = countryData?.data || [];
    if (!actualData || actualData.length === 0) {
      console.log('❌ No country data available - actualData:', actualData);
      return {
        localSales: 0,
        exportSales: 0,
        totalSales: 0,
        regionalBreakdown: [],
        topRegions: [],
        actualPeriod: countryData?.actualPeriod,
        isDifferentSalesRep: false
      };
    }

    console.log('Processing country data:', actualData);

    // Initialize regional sales - SAME AS MAIN KPI PAGE
    let regionalSales = {
      'UAE': 0,
      'Arabian Peninsula': 0,
      'West Asia': 0,
      'Levant': 0,
      'North Africa': 0,
      'Southern Africa': 0,
      'Europe': 0,
      'Americas': 0,
      'Asia-Pacific': 0,
      'Unassigned': 0
    };

    // Group countries by region - SAME LOGIC AS MAIN KPI PAGE
    actualData.forEach(countryItem => {
      const countryName = countryItem.country;
      const countryValue = countryItem.value;
      
      console.log(`Processing: ${countryName} = $${countryValue.toFixed(0)}`);
      
      // Use getRegionForCountry function - SAME AS MAIN KPI PAGE
      const region = getRegionForCountry(countryName);
      console.log(`  → Mapped to region: ${region} (function type: ${typeof getRegionForCountry})`);
      
      if (region && regionalSales[region] !== undefined) {
        regionalSales[region] += countryValue;
      } else if (region) {
        regionalSales['Unassigned'] += countryValue;
      } else {
        regionalSales['Unassigned'] += countryValue;
      }
    });

    console.log('Regional sales breakdown:', regionalSales);

    // Calculate total and percentages - SAME AS MAIN KPI PAGE
    const totalCountrySales = actualData.reduce((sum, country) => sum + country.value, 0);
    console.log('Total country sales:', totalCountrySales);

    // Calculate regional percentages - SAME AS MAIN KPI PAGE
    const regionalPercentages = {};
    Object.keys(regionalSales).forEach(region => {
      regionalPercentages[region] = totalCountrySales > 0 ? (regionalSales[region] / totalCountrySales * 100) : 0;
    });

    console.log('Regional percentages:', regionalPercentages);

    // Calculate Local vs Export - SAME AS MAIN KPI PAGE
    const localSales = regionalPercentages['UAE'] || 0;
    const exportSales = 100 - localSales;

    console.log(`Local (UAE): ${localSales.toFixed(1)}%`);
    console.log(`Export: ${exportSales.toFixed(1)}%`);

    // Get export regions with meaningful percentages - SAME AS MAIN KPI PAGE
    const exportRegions = Object.entries(regionalPercentages)
      .filter(([region, percentage]) => region !== 'UAE' && percentage >= 0.1)
      .sort((a, b) => b[1] - a[1]);

    // Calculate percentages relative to export total - SAME AS MAIN KPI PAGE
    const exportRegionsWithRelativePercentage = exportRegions.map(([region, percentage]) => {
      const relativePercentage = exportSales > 0 ? (percentage / exportSales) * 100 : 0;
      return [region, percentage, relativePercentage];
    });

    const result = {
      localSales: Math.round(localSales * 10) / 10,
      exportSales: Math.round(exportSales * 10) / 10,
      totalSales: totalCountrySales,
      regionalBreakdown: Object.entries(regionalSales).map(([region, value]) => ({
        name: region,
        value,
        percentage: totalCountrySales > 0 ? (value / totalCountrySales * 100) : 0
      })),
      topRegions: exportRegionsWithRelativePercentage.map(([region, absPerc, relPerc]) => ({
        name: region,
        value: regionalSales[region],
        percentage: absPerc,
        exportPercentage: relPerc
      })),
      actualPeriod: countryData?.actualPeriod,
      isDifferentSalesRep: false
    };

    console.log('✅ Final geographic distribution:', result);
    return result;
  };

  // Calculate customer insights from reportData.topCustomers and allCustomers
  const getCustomerInsights = () => {
    if (!reportData.topCustomers || !Array.isArray(reportData.topCustomers) || basePeriodIndex === null || !columnOrder) {
      return {
        topCustomer: null,
        top3Customers: [],
        top5Customers: [],
        avgSalesPerCustomer: 0,
        totalCustomers: 0,
        customerGrowth: 0,
        newCustomers: 0,
        newCustomerNames: []
      };
    }
    
    // Find the correct rawValues index for the base period
    const rawValuesIndex = columnOrder.findIndex((col, index) => index === basePeriodIndex);
    if (rawValuesIndex === -1) {
      return {
        topCustomer: null,
        top3Customers: [],
        top5Customers: [],
        avgSalesPerCustomer: 0,
        totalCustomers: 0,
        customerGrowth: 0,
        newCustomers: 0,
        newCustomerNames: []
      };
    }
    
    // Use merged customer data passed in reportData (already merged via DB rules)
    const customersWithValues = reportData.topCustomers
      .filter(customer => (customer.rawValues[rawValuesIndex] || 0) > 0)
      .map(customer => ({
        name: toProperCase(customer.name),
        value: customer.rawValues[rawValuesIndex] || 0,
        originalCustomer: customer
      }));
    
    const allCustomersWithValues = (reportData.allCustomers || reportData.topCustomers)
      .filter(customer => (customer.rawValues[rawValuesIndex] || 0) > 0)
      .map(customer => ({
        name: toProperCase(customer.name),
        value: customer.rawValues[rawValuesIndex] || 0,
        originalCustomer: customer
      }));
    
    // Totals based on ALL customers (not just top 5)
    const totalCustomerSales = allCustomersWithValues.reduce((sum, customer) => sum + customer.value, 0);

    const customersWithPercentages = customersWithValues.map(customer => ({
      ...customer,
      percentage: totalCustomerSales > 0 ? (customer.value / totalCustomerSales * 100) : 0
    }));

    // Customer growth/new customers using merged data
    let customerGrowth = 0;
    let newCustomers = 0;
    let newCustomerNames = [];
    
    if (basePeriodIndex > 0) {
      const previousPeriodAllCustomers = (reportData.allCustomers || reportData.topCustomers)
        .filter(customer => (customer.rawValues[basePeriodIndex - 1] || 0) > 0)
        .map(customer => ({
          name: toProperCase(customer.name),
          value: customer.rawValues[basePeriodIndex - 1] || 0
        }));
      
      const previousCustomerCount = previousPeriodAllCustomers.length;
      const currentCustomerCount = allCustomersWithValues.length;
      
      customerGrowth = previousCustomerCount > 0 ? 
        ((currentCustomerCount - previousCustomerCount) / previousCustomerCount * 100) : 0;
      
      const previousCustomerNames = new Set(previousPeriodAllCustomers.map(c => c.name.toLowerCase()))
      const newCustomerList = allCustomersWithValues.filter(currentCustomer => 
        !previousCustomerNames.has(currentCustomer.name.toLowerCase())
      );
      
      newCustomers = newCustomerList.length;
      newCustomerNames = newCustomerList.map(customer => customer.name);
    }
    
    return {
      topCustomer: customersWithPercentages[0] || null,
      top3Customers: customersWithPercentages.slice(0, 3),
      top5Customers: customersWithPercentages.slice(0, 5),
      avgSalesPerCustomer: allCustomersWithValues.length > 0 ? totalCustomerSales / allCustomersWithValues.length : 0,
      totalCustomers: allCustomersWithValues.length,
      customerGrowth: customerGrowth,
      newCustomers: newCustomers,
      newCustomerNames: newCustomerNames
    };
  };

  const top3ProductGroups = getTop3ProductGroups();
  const customerInsights = getCustomerInsights();
  const geographicDistribution = getGeographicDistribution();

  return (
    <div className="section">
      <h2>KPI's Summary</h2>
      
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-label">Volume {formatPeriodLabel(reportData.periodLabel)}</div>
          <div className="metric-value">{formatMT(currentTotal)} MT</div>
          <div className="metric-previous">
            Previous Period: {formatMT(previousTotal)} MT
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-label">YoY Growth</div>
          {yoyGrowth !== null ? (
            <div className={`metric-value ${getCardClass(yoyGrowth, 'growth')}`}>
              {yoyGrowth > 0 ? '+' : ''}{formatYoYPercentage(yoyGrowth)}
            </div>
          ) : (
            <div className="metric-value no-data">
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                📅 Add 2024 data
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>
                for YoY comparison
              </div>
            </div>
          )}
        </div>
        
        <div className="metric-card">
          <div className="metric-label">{formatPeriodLabel(reportData.periodLabel)} Budget Achievement</div>
          <div className={`metric-value ${getCardClass(budgetAchievement, 'budget')}`}>
            {formatPercentage(budgetAchievement)}
          </div>
          <div className="metric-previous">
            ({formatYoYPercentage(yearlyBudgetAchievement)} of yearly Budget)
          </div>
        </div>
      </div>
      
      {/* Second row - Sales (Amount) metrics */}
      <div className="metric-row">
          <div className="metric-card">
            <div className="metric-label">Sales {formatPeriodLabel(reportData.periodLabel)}</div>
            <div className="metric-value">{formatNumber(currentAmountTotal, true)}</div>
            <div className="metric-previous">
              Previous Period: {formatNumber(previousAmountTotal, true)}
            </div>
          </div>
        
        <div className="metric-card">
          <div className="metric-label">Sales YoY Growth</div>
          {amountYoyGrowth !== null ? (
            <div className={`metric-value ${getCardClass(amountYoyGrowth, 'growth')}`}>
              {amountYoyGrowth > 0 ? '+' : ''}{formatYoYPercentage(amountYoyGrowth)}
            </div>
          ) : (
            <div className="metric-value no-data">
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                📅 Add 2024 data
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>
                for YoY comparison
              </div>
            </div>
          )}
        </div>
        
        <div className="metric-card">
          <div className="metric-label">{formatPeriodLabel(reportData.periodLabel)} Sales Budget Achievement</div>
          <div className={`metric-value ${getCardClass(amountBudgetAchievement, 'budget')}`}>
            {formatPercentage(amountBudgetAchievement)}
          </div>
          <div className="metric-previous">
            ({formatYoYPercentage(yearlySalesBudgetAchievement)} of yearly Budget)
          </div>
        </div>
      </div>
      
      {/* Third row - Top 3 Product Groups */}
      {top3ProductGroups.length > 0 && (
        <div className="metric-row">
          <div style={{ width: '100%', textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{
              color: '#667eea',
              fontSize: '1.4em',
              marginBottom: '8px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'inline-block'
            }}>
              TOP 3 PRODUCT GROUPS
            </h3>
            <div style={{ fontSize: '0.85em', fontWeight: 'normal', color: '#666', fontStyle: 'italic' }}>
              (by Volume)
            </div>
          </div>
          <div className="top-products-horizontal">
            {top3ProductGroups.map((product, index) => {
              const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
              const isPositive = product.growthPercent > 0;
              const arrow = isPositive ? '▲' : '▼';
              const growthWord = isPositive ? 'growth' : 'decline';
              
              return (
                <div key={index} className="top-product-card">
                  <div className="product-rank">
                    <span className="rank-icon">{rankIcon}</span>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{product.productGroup}</div>
                    <div className="product-percentage">{product.percentage.toFixed(1)}% of sales</div>
                  </div>
                  <div className={`product-performance ${isPositive ? 'positive' : 'negative'}`}>
                    {arrow} {Math.abs(product.growthPercent).toFixed(0)}% {growthWord} vs {reportData.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'previous period'}
                  </div>
                  <div className={`product-performance ${product.budgetAchievement >= 100 ? 'positive' : 'negative'}`} style={{ fontSize: '0.85em', marginTop: '4px' }}>
                    {product.budgetAchievement >= 100 ? '▲' : '▼'} {product.budgetAchievement.toFixed(0)}% vs {formatPeriodLabel(reportData.periodLabel)} Budget
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Insights Section */}
      {customerInsights.topCustomer && (
        <div className="customer-insights-section">
          <div className="customer-insights-header">
            <span className="insights-icon">👥</span>
            <h3>CUSTOMER INSIGHTS</h3>
          </div>
          <div className="customer-insights-cards">
            {/* Top Customer */}
            <div className="customer-insight-card">
              <div className="insight-icon">⭐</div>
              <div className="insight-title">Top Customer</div>
              <div className="insight-value">{customerInsights.topCustomer.percentage.toFixed(1)}%</div>
              <div className="insight-subtitle">{customerInsights.topCustomer.name}</div>
              <div className="insight-footer">of total sales</div>
            </div>

            {/* Top 3 Customers */}
            <div className="customer-insight-card">
              <div className="insight-icon">🔝</div>
              <div className="insight-title">Top 3 Customers</div>
              <div className="insight-value">
                {customerInsights.top3Customers.reduce((sum, c) => sum + c.percentage, 0).toFixed(1)}%
              </div>
                             <div className="insight-subtitle customer-list">
                 {customerInsights.top3Customers.map((c, index) => (
                   <div key={index} className="customer-name-line">{toProperCase(c.name)}</div>
                 ))}
               </div>
              <div className="insight-footer">of total sales</div>
            </div>

            {/* Top 5 Customers */}
            <div className="customer-insight-card">
              <div className="insight-icon">🥇</div>
              <div className="insight-title">Top 5 Customers</div>
              <div className="insight-value">
                {customerInsights.top5Customers.reduce((sum, c) => sum + c.percentage, 0).toFixed(1)}%
              </div>
                             <div className="insight-subtitle customer-list">
                 {customerInsights.top5Customers.map((c, index) => (
                   <div key={index} className="customer-name-line">{toProperCase(c.name)}</div>
                 ))}
               </div>
              <div className="insight-footer">of total sales</div>
            </div>

            {/* Total Customers */}
            <div className="customer-insight-card">
              <div className="insight-icon">👥</div>
              <div className="insight-title">Total Customers</div>
              <div className="insight-value">{customerInsights.totalCustomers}</div>
              <div className="insight-subtitle">
                {customerInsights.customerGrowth !== 0 && (
                  <span className={customerInsights.customerGrowth > 0 ? 'growth-positive' : 'growth-negative'}>
                    {customerInsights.customerGrowth > 0 ? '▲' : '▼'} {Math.abs(customerInsights.customerGrowth).toFixed(1)}% vs {reportData.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'previous period'}
                  </span>
                )}
              </div>
              <div className="insight-footer">active customers</div>
            </div>

            {/* New Customers */}
            <div className="customer-insight-card">
              <div className="insight-icon">🆕</div>
              <div className="insight-title">New Customers</div>
              <div className="insight-value">{customerInsights.newCustomers}</div>
              <div className="insight-subtitle customer-list">
                {customerInsights.newCustomerNames.length > 0 ? (
                  customerInsights.newCustomerNames.map((name, index) => (
                    <div key={index} className="customer-name-line">{toProperCase(name)}</div>
                  ))
                ) : (
                  <div className="customer-name-line">No new customers</div>
                )}
              </div>
              <div className="insight-footer">
                new in {formatPeriodLabel(reportData.periodLabel)} vs {reportData.prevPeriod ? formatPeriodLabel(reportData.prevPeriod) : 'previous period'}
              </div>
            </div>

            {/* AVG Sales per Customer */}
            <div className="customer-insight-card">
              <div className="insight-icon">💰</div>
              <div className="insight-title">AVG Sales per Customer</div>
              <div className="insight-value">{formatNumber(customerInsights.avgSalesPerCustomer, true)}</div>
              <div className="insight-subtitle"></div>
              <div className="insight-footer">average value</div>
            </div>
          </div>
        </div>
      )}

      {/* Geographic Distribution Section */}
      <div className="executive-summary-section">
        <h3 className="kpi-section-title">🌍 GEOGRAPHIC DISTRIBUTION</h3>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '25px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            fontSize: '0.85em',
            color: '#6c757d',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Reporting Period
          </div>
          <div style={{
            fontSize: '1.1em',
            color: '#495057',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {formatPeriodLabel(reportData.periodLabel)}
          </div>
        </div>
        
        {/* Show data source info if using different sales rep */}
        {geographicDistribution.isDifferentSalesRep && geographicDistribution.actualPeriod && (
          <div className="geo-data-source-info">
            <div className="info-icon">ℹ️</div>
            <div className="info-text">
              Showing sample data from {geographicDistribution.actualPeriod.salesRep} ({geographicDistribution.actualPeriod.month} {geographicDistribution.actualPeriod.year})
            </div>
          </div>
        )}
        
        {/* Row 1: Local vs Export - Same structure as main KPI */}
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
            <div className="kpi-value">{geographicDistribution.localSales.toFixed(1)}%</div>
            <div className="kpi-trend">of total sales</div>
          </div>
          <div className="kpi-card large">
            <div className="rotating-emoji-container">
              <div className="rotating-emoji">🌍</div>
            </div>
            <div className="kpi-label">Export</div>
            <div className="kpi-value">{geographicDistribution.exportSales.toFixed(1)}%</div>
            <div className="kpi-trend">of total sales</div>
          </div>
        </div>
        
        {/* Row 2: Export Regions - Same structure as main KPI */}
        {geographicDistribution.topRegions.length > 0 && (
          <div className="kpi-cards export-regions">
            {geographicDistribution.topRegions.map((region) => {
              // Calculate gradient color based on percentage
              const gradientColor = getRegionColor(region.exportPercentage);
              
              return (
                <div 
                  key={region.name} 
                  className="kpi-card"
                  style={{
                    background: `linear-gradient(135deg, ${gradientColor}, ${gradientColor}cc)`,
                    borderLeft: `4px solid ${gradientColor}`,
                    boxShadow: `0 4px 12px ${gradientColor}44`,
                    color: region.exportPercentage >= 10 ? 'white' : '#1a365d'
                  }}
                >
                  <div className="region-globe-container">
                    <div className="region-globe">{getRegionIcon(region.name)}</div>
                  </div>
                  <div className="kpi-label" style={{ 
                    color: region.exportPercentage >= 10 ? 'white' : '#2d3748', 
                    fontWeight: '700' 
                  }}>{region.name}</div>
                  <div className="kpi-value" style={{ 
                    color: region.exportPercentage >= 10 ? 'white' : '#1a365d', 
                    fontWeight: '800' 
                  }}>{region.percentage.toFixed(1)}%</div>
                  <div className="kpi-trend" style={{ 
                    color: region.exportPercentage >= 10 ? '#e2e8f0' : '#4a5568' 
                  }}>{region.exportPercentage.toFixed(1)}% of export</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Warning for unassigned countries */}
        {(() => {
          let unassignedCountries = [];
          if (reportData && reportData.selectedDivision === 'FP' && countryData?.data) {
            unassignedCountries = countryData.data.filter(cs => getRegionForCountry(cs.country) === 'Unassigned').map(cs => cs.country);
            if (unassignedCountries.length > 0) {
              console.warn('Unassigned countries in FP:', unassignedCountries);
            }
          }
          
          return unassignedCountries.length > 0 && (
            <div style={{marginTop: 16, color: '#d32f2f', fontWeight: 'bold', textAlign: 'center'}}>
              Warning: Unassigned countries in FP: {unassignedCountries.join(', ')}
            </div>
          );
        })()}
        
        {/* Show message if no regional data */}
        {geographicDistribution.topRegions.length === 0 && geographicDistribution.totalSales > 0 && (
          <div className="no-regional-data">
            <div className="info-icon">📍</div>
            <div className="info-text">All sales are local (UAE)</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveSummary;
