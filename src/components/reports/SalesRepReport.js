import React, { useEffect, useState } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { useSalesRepReports } from '../../contexts/SalesRepReportsContext';
import ReportHeader from './ReportHeader';
import ExecutiveSummary from './ExecutiveSummary';
import PerformanceDashboard from './PerformanceDashboard';
import SalesRepHTMLExport from '../dashboard/SalesRepHTMLExport';
// Removed PeriodComparison and ExportActions per request
import './SalesRepReport.css';

const SalesRepReport = ({ 
  rep, 
  selectedDivision,
  getProductGroupsForSalesRep, 
  fetchCustomerDashboardData, 
  preparePeriods, 
  buildExtendedColumns, 
  processCustomerData,
  applySavedMergeRules
}) => {
  const { columnOrder, basePeriodIndex } = useFilter();
  const { getReportData, isCached } = useSalesRepReports();
  const [kgsData, setKgsData] = useState([]);
  const [amountData, setAmountData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [customerAmountData, setCustomerAmountData] = useState([]); // Customer data by AMOUNT for insights
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [usedCache, setUsedCache] = useState(false);
  const [strategicFindings, setStrategicFindings] = useState(null);
  const [customerFindings, setCustomerFindings] = useState(null);
  const [yearlyBudgetTotals, setYearlyBudgetTotals] = useState({ 
    yearlyBudgetTotal: 0, 
    yearlySalesBudgetTotal: 0,
    yearlyBudgetAchievement: 0,
    yearlySalesBudgetAchievement: 0
  });
  const [customerInsights, setCustomerInsights] = useState({
    topCustomerShare: 0,
    top3CustomerShare: 0,
    top5CustomerShare: 0,
    totalCustomers: 0,
    customerGrowth: 0,
    newCustomers: [],
    topCustomers: [],
    avgVolumePerCustomer: 0
  });

  // Handler to capture strategic findings from PerformanceDashboard
  const handleStrategicFindings = React.useCallback((findings) => {
    console.log('📊 Product Group Strategic findings calculated:', findings);
    setStrategicFindings(findings);
  }, []);

  // Handler to capture customer findings from PerformanceDashboard (still needed for other components)
  const handleCustomerFindings = React.useCallback((findings) => {
    console.log('📊 Customer findings calculated:', findings);
    setCustomerFindings(findings);
  }, []);

  // Handler to capture yearly budget totals from ExecutiveSummary
  const handleYearlyBudgetCalculated = React.useCallback((totals) => {
    console.log('📊 Yearly budget totals calculated:', totals);
    setYearlyBudgetTotals(totals);
  }, []);

  // Calculate customer insights from reportData (same logic as ExecutiveSummary)
  const calculateCustomerInsights = React.useCallback(() => {
    if (!reportData?.topCustomers || !Array.isArray(reportData.topCustomers) || basePeriodIndex === null || !columnOrder) {
      return {
        topCustomerShare: 0,
        top3CustomerShare: 0,
        top5CustomerShare: 0,
        totalCustomers: 0,
        customerGrowth: 0,
        newCustomers: [],
        topCustomers: [],
        avgVolumePerCustomer: 0
      };
    }

    // Find the correct rawValues index for the base period
    const rawValuesIndex = columnOrder.findIndex((col, index) => index === basePeriodIndex);
    if (rawValuesIndex === -1) {
      return {
        topCustomerShare: 0,
        top3CustomerShare: 0,
        top5CustomerShare: 0,
        totalCustomers: 0,
        customerGrowth: 0,
        newCustomers: [],
        topCustomers: [],
        avgVolumePerCustomer: 0
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

    const totalCustomerSales = allCustomersWithValues.reduce((sum, customer) => sum + customer.value, 0);
    const customersWithPercentages = customersWithValues.map(customer => ({
      ...customer,
      percentage: totalCustomerSales > 0 ? (customer.value / totalCustomerSales) * 100 : 0
    }));

    // Calculate customer growth and new customers
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
      customerGrowth = previousCustomerCount > 0 ? 
        ((allCustomersWithValues.length - previousCustomerCount) / previousCustomerCount) * 100 : 0;

      const previousCustomerNames = new Set(previousPeriodAllCustomers.map(c => c.name.toLowerCase()));
      const newCustomerList = allCustomersWithValues.filter(customer => 
        !previousCustomerNames.has(customer.name.toLowerCase())
      );
      newCustomers = newCustomerList.length;
      newCustomerNames = newCustomerList.map(customer => customer.name);
    }

    return {
      topCustomerShare: customersWithPercentages[0]?.percentage || 0,
      top3CustomerShare: customersWithPercentages.slice(0, 3).reduce((sum, c) => sum + c.percentage, 0),
      top5CustomerShare: customersWithPercentages.slice(0, 5).reduce((sum, c) => sum + c.percentage, 0),
      totalCustomers: allCustomersWithValues.length,
      customerGrowth: customerGrowth,
      newCustomers: newCustomerNames,
      topCustomers: customersWithPercentages.slice(0, 5),
      avgVolumePerCustomer: allCustomersWithValues.length > 0 ? totalCustomerSales / allCustomersWithValues.length : 0
    };
  }, [reportData, basePeriodIndex, columnOrder]);

  // Update customer insights when reportData changes
  React.useEffect(() => {
    if (reportData && basePeriodIndex !== null && columnOrder) {
      const insights = calculateCustomerInsights();
      setCustomerInsights(insights);
    }
  }, [calculateCustomerInsights]);

  const toProperCase = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Fetch customer data by AMOUNT (for Customer Insights percentage calculations)
  const fetchCustomerAmountData = async (salesRep, periods, division = 'FP') => {
    try {
      console.log(`🔍 Fetching customer AMOUNT data for sales rep: ${salesRep}`);
      
      const response = await fetch('http://localhost:3001/api/customer-dashboard-amount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          division,
          salesRep,
          periods
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Retrieved customer AMOUNT data for ${salesRep}`);
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch customer amount data');
      }
    } catch (error) {
      console.error(`❌ Error fetching customer AMOUNT data:`, error);
      // Return empty data structure as fallback
      return { customers: [], dashboardData: {} };
    }
  };

  // Fetch data for the report
  useEffect(() => {
    const fetchReportData = async () => {
      if (!rep || !columnOrder || columnOrder.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // TRY CACHE FIRST - ULTRA-FAST!
        const cachedReportData = getReportData(rep);
        
        if (cachedReportData && isCached) {
          console.log(`⚡ Loading ${rep} report from CACHE - instant!`);
          setUsedCache(true);
          
          // Process cached data into the format expected by the report
          // Convert from ultra-fast format to component format
          const kgsResult = processedCachedDataToProductGroups(cachedReportData.kgs, columnOrder);
          const amountResult = processedCachedDataToProductGroups(cachedReportData.amount, columnOrder);
          
          // Process customer data
          const processedCustomers = processCachedCustomers(cachedReportData.customers, columnOrder, basePeriodIndex);
          
          // For cached data, we need to fetch AMOUNT customer data separately
          // since cached data only contains KGS customer data
          console.log('📦 Using cached data, fetching AMOUNT customer data separately...');
          
          // Fetch AMOUNT customer data for cached reports
          const customerAmountResult = await fetchCustomerAmountData(rep, preparePeriods(columnOrder), selectedDivision);
          const { customers: processedCustomersAmount } = await applySavedMergeRules(
            rep,
            selectedDivision,
            customerAmountResult.customers,
            customerAmountResult.dashboardData,
            extendedColumns
          );
          
          // Sort customers by amount
          if (basePeriodIndex != null && basePeriodIndex >= 0) {
            processedCustomersAmount.sort((a, b) => {
              const aValue = a.rawValues[basePeriodIndex] || 0;
              const bValue = b.rawValues[basePeriodIndex] || 0;
              return bValue - aValue;
            });
          }
          
        setKgsData(kgsResult);
        setAmountData(amountResult);
        setCustomerData(processedCustomers);
        setCustomerAmountData(processedCustomersAmount); // Use AMOUNT data
        
        console.log('🔍 DEBUG - customerAmountData set to:', {
          count: processedCustomersAmount.length,
          firstCustomer: processedCustomersAmount[0]?.name,
          firstCustomerValues: processedCustomersAmount[0]?.rawValues,
          isAmountData: processedCustomersAmount[0]?.rawValues?.some(val => val > 1000) // AMOUNT values are typically > 1000
        });
          
          // Generate report data with AMOUNT-based customers for insights
          generateReportData(kgsResult, amountResult, processedCustomers, processedCustomersAmount);
          setLoading(false);
          return;
        }

        // FALLBACK: Fetch via API if not cached
        console.log(`📡 Loading ${rep} report from API (cache miss)`);
        setUsedCache(false);

        // Fetch all necessary data
        const [kgsResult, amountResult] = await Promise.all([
          getProductGroupsForSalesRep(rep, 'KGS', columnOrder),
          getProductGroupsForSalesRep(rep, 'Amount', columnOrder)
        ]);

        // Fetch customer data (KGS for table display)
        const { customers, dashboardData } = await fetchCustomerDashboardData(rep, preparePeriods(columnOrder));
        const extendedColumns = buildExtendedColumns(columnOrder);
        
        // Use DB merge rules to build merged customers (consistent with tables)
        const { customers: processedCustomers } = await applySavedMergeRules(
          rep,
          selectedDivision,
          customers,
          dashboardData,
          extendedColumns
        );

        // Sort customers by base period volume
        if (basePeriodIndex != null && basePeriodIndex >= 0) {
          // Use basePeriodIndex directly
          processedCustomers.sort((a, b) => {
            const aValue = a.rawValues[basePeriodIndex] || 0;
            const bValue = b.rawValues[basePeriodIndex] || 0;
            return bValue - aValue;
          });
        }

        // ALSO fetch customer data by AMOUNT for Customer Insights percentage calculations
        const customerAmountResult = await fetchCustomerAmountData(rep, preparePeriods(columnOrder), selectedDivision);
        
        const { customers: processedCustomersAmount } = await applySavedMergeRules(
          rep,
          selectedDivision,
          customerAmountResult.customers,
          customerAmountResult.dashboardData,
          extendedColumns
        );

        // Sort customers by amount
        if (basePeriodIndex != null && basePeriodIndex >= 0) {
          processedCustomersAmount.sort((a, b) => {
            const aValue = a.rawValues[basePeriodIndex] || 0;
            const bValue = b.rawValues[basePeriodIndex] || 0;
            return bValue - aValue;
          });
        }

        setKgsData(kgsResult);
        setAmountData(amountResult);
        setCustomerData(processedCustomers);
        setCustomerAmountData(processedCustomersAmount);

        console.log('🔍 DEBUG - customerAmountData set to (API path):', {
          count: processedCustomersAmount.length,
          firstCustomer: processedCustomersAmount[0]?.name,
          firstCustomerValues: processedCustomersAmount[0]?.rawValues,
          isAmountData: processedCustomersAmount[0]?.rawValues?.some(val => val > 1000) // AMOUNT values are typically > 1000
        });

        // Generate report data with AMOUNT-based customers for insights
        generateReportData(kgsResult, amountResult, processedCustomers, processedCustomersAmount);

      } catch (error) {
        console.error('Error fetching report data:', error);
        setError('Failed to load report data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [rep, columnOrder, basePeriodIndex, isCached]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Helper to convert cached data to product groups format
  const processedCachedDataToProductGroups = (cachedData, columnOrder) => {
    // cachedData structure: { columnKey: { productGroup: value } }
    // Need to convert to: [{ name: productGroup, values: [...] }]
    
    const productGroupMap = {};
    
    // Collect all product groups
    Object.values(cachedData).forEach(columnData => {
      Object.keys(columnData).forEach(pg => {
        if (!productGroupMap[pg]) {
          productGroupMap[pg] = [];
        }
      });
    });
    
    // Build values array for each product group
    return Object.keys(productGroupMap).map(pgName => {
      const values = [];
      columnOrder.forEach((column) => {
        const columnKey = `${column.year}-${column.month}-${column.type || 'Actual'}`;
        const value = cachedData[columnKey]?.[pgName] || 0;
        values.push(value);
      });
      return {
        name: pgName,
        values,
        rawValues: values
      };
    });
  };
  
  // Helper to process cached customers
  const processCachedCustomers = (cachedCustomers, columnOrder, basePeriodIndex) => {
    // cachedCustomers: [{ name, columnKey, kgs, amount }]
    // Need to group by customer and build values array
    
    const customerMap = {};
    
    cachedCustomers.forEach(item => {
      if (!customerMap[item.name]) {
        customerMap[item.name] = {
          name: item.name,
          rawValues: new Array(columnOrder.length).fill(0)
        };
      }
      
      // Find column index
      const columnIndex = columnOrder.findIndex(col => 
        `${col.year}-${col.month}-${col.type || 'Actual'}` === item.columnKey
      );
      
      if (columnIndex >= 0) {
        customerMap[item.name].rawValues[columnIndex] = item.amount || 0;
      }
    });
    
    // Convert to array and sort
    const customers = Object.values(customerMap);
    
    if (basePeriodIndex != null && basePeriodIndex >= 0) {
      customers.sort((a, b) => {
        const aValue = a.rawValues[basePeriodIndex] || 0;
        const bValue = b.rawValues[basePeriodIndex] || 0;
        return bValue - aValue;
      });
    }
    
    return customers;
  };

  // Generate comprehensive report data
  const generateReportData = async (kgsData, amountData, customerData, customerAmountData = null) => {
    if (!columnOrder || basePeriodIndex === null) {
      return;
    }
    
    // Use AMOUNT-based customer data for insights if available, otherwise fall back to KGS
    const customersForInsights = customerAmountData || customerData;

    const basePeriod = columnOrder[basePeriodIndex];
    const prevPeriod = basePeriodIndex > 0 ? columnOrder[basePeriodIndex - 1] : null;
    const nextPeriod = basePeriodIndex < columnOrder.length - 1 ? columnOrder[basePeriodIndex + 1] : null;

    // Find the index of the full-year budget column for the same year (robust detection)
    const yearBudgetIndex = columnOrder.findIndex(col => {
      if (col.type !== 'Budget') return false;
      const sameYear = col.year === basePeriod.year;
      const isYearByMonth = typeof col.month === 'string' && col.month.toLowerCase() === 'year';
      const isYearByName = typeof col.displayName === 'string' && col.displayName.toLowerCase().includes('year');
      const isFullRange = Array.isArray(col.months) && col.months.length >= 12;
      return sameYear && (isYearByMonth || isYearByName || isFullRange);
    });

    // Calculate totals and key metrics
    const kgsTotals = calculateTotals(kgsData);
    const amountTotals = calculateTotals(amountData);
    
    // Generate insights and findings
    const insights = generateInsights(kgsData, amountData, customerData);
    
    const topProducts = getTopPerformers(kgsData, basePeriodIndex);
    
    // Fetch geographic distribution data from API
    let geographicDistribution = null;
    try {
      const monthMap = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
      };
      
      const months = basePeriod.months ? basePeriod.months.map(m => 
        typeof m === 'number' ? m : monthMap[m] || 1
      ) : [1, 2, 3, 4, 5, 6];
      
      const requestBody = {
        division: selectedDivision,
        salesRep: rep,
        year: basePeriod.year,
        months: months,
        dataType: 'Actual'
      };
      
      console.log('🌍 Fetching geographic distribution for:', requestBody);
      
      const response = await fetch('http://localhost:3001/api/sales-by-country-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🌍 Geographic API response:', result);
        if (result.success && result.data && result.data.length > 0) {
          // Calculate geographic distribution from country data
          geographicDistribution = calculateGeographicDistribution(result.data);
          console.log('✅ Calculated geographic distribution:', geographicDistribution);
        } else {
          console.log('⚠️ No data in geographic API response');
        }
      } else {
        console.log('❌ Geographic API response not OK:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching geographic distribution:', error);
    }
    
    const reportData = {
      basePeriod,
      basePeriodIndex,
      prevPeriod,
      nextPeriod,
      columnOrder, // pass through for fallback logic
      yearBudgetIndex,
      kgsTotals,
      amountTotals,
      insights,
      topProducts,
      topCustomers: customersForInsights.slice(0, 5), // Top 5 AMOUNT-based customers for insights
      allCustomers: customersForInsights, // All AMOUNT-based customers for insights
      topCustomersKgs: customerData.slice(0, 5), // Top 5 KGS-based customers for table display
      allCustomersKgs: customerData, // All KGS-based customers for table display
      performanceMetrics: calculatePerformanceMetrics(kgsData, amountData),
      periodLabel: basePeriod,
      salesRep: rep,
      geographicDistribution: geographicDistribution // Add geographic data
    };
    
    setReportData(reportData);
  };
  
  // Calculate geographic distribution from country data
  const calculateGeographicDistribution = (countryData) => {
    const regionalSales = {
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
    
    // Helper function to get region - simplified version
    const getRegionForCountry = (countryName) => {
      const normalized = countryName.toLowerCase().trim();
      if (normalized.includes('uae') || normalized.includes('emirates')) return 'UAE';
      if (normalized.includes('saudi') || normalized.includes('kuwait') || normalized.includes('qatar') || normalized.includes('bahrain') || normalized.includes('oman')) return 'Arabian Peninsula';
      if (normalized.includes('jordan') || normalized.includes('lebanon') || normalized.includes('syria') || normalized.includes('palestine') || normalized.includes('israel')) return 'Levant';
      if (normalized.includes('egypt') || normalized.includes('libya') || normalized.includes('tunisia') || normalized.includes('algeria') || normalized.includes('morocco')) return 'North Africa';
      if (normalized.includes('turkey') || normalized.includes('iran') || normalized.includes('iraq') || normalized.includes('yemen')) return 'West Asia';
      if (normalized.includes('south africa') || normalized.includes('kenya') || normalized.includes('ethiopia') || normalized.includes('nigeria')) return 'Southern Africa';
      if (normalized.includes('uk') || normalized.includes('united kingdom') || normalized.includes('germany') || normalized.includes('france') || normalized.includes('italy') || normalized.includes('spain')) return 'Europe';
      if (normalized.includes('usa') || normalized.includes('united states') || normalized.includes('canada') || normalized.includes('mexico') || normalized.includes('brazil')) return 'Americas';
      if (normalized.includes('india') || normalized.includes('china') || normalized.includes('japan') || normalized.includes('korea') || normalized.includes('australia') || normalized.includes('singapore')) return 'Asia-Pacific';
      return 'Unassigned';
    };
    
    // Group countries by region
    countryData.forEach(country => {
      const region = getRegionForCountry(country.country);
      if (regionalSales[region] !== undefined) {
        regionalSales[region] += country.value || 0;
      } else {
        regionalSales['Unassigned'] += country.value || 0;
      }
    });
    
    const totalSales = countryData.reduce((sum, c) => sum + (c.value || 0), 0);
    
    // Calculate percentages
    const regionalPercentages = {};
    Object.keys(regionalSales).forEach(region => {
      regionalPercentages[region] = totalSales > 0 ? (regionalSales[region] / totalSales * 100) : 0;
    });
    
    const localPercentage = regionalPercentages['UAE'] || 0;
    const exportPercentage = 100 - localPercentage;
    
    // Get top export regions
    const exportRegions = Object.entries(regionalPercentages)
      .filter(([region, percentage]) => region !== 'UAE' && percentage >= 0.1)
      .sort((a, b) => b[1] - a[1]);
    
    const topRegions = exportRegions.map(([region, percentage]) => {
      const exportPerc = exportPercentage > 0 ? (percentage / exportPercentage) * 100 : 0;
      return {
        name: region,
        percentage: percentage,
        exportPercentage: exportPerc,
        value: regionalSales[region]
      };
    });
    
    return {
      localPercentage: Math.round(localPercentage * 10) / 10,
      exportPercentage: Math.round(exportPercentage * 10) / 10,
      localSales: Math.round(localPercentage * 10) / 10,
      exportSales: Math.round(exportPercentage * 10) / 10,
      topRegions: topRegions,
      regionalBreakdown: Object.entries(regionalSales).map(([region, value]) => ({
        name: region,
        value,
        percentage: totalSales > 0 ? (value / totalSales * 100) : 0
      }))
    };
  };

  // Calculate totals for a dataset
  const calculateTotals = (data) => {
    if (!data || !columnOrder) return {};
    
    const totals = {};
    columnOrder.forEach((col, index) => {
      const total = data.reduce((sum, item) => {
        const value = item.rawValues[index] || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
      totals[index] = total;
    });
    return totals;
  };

  // Get top performing products
  const getTopPerformers = (data, baseIndex) => {
    if (!data || baseIndex === null) {
      return [];
    }
    
    const filtered = data.filter(item => {
      const value = item.rawValues[baseIndex] || 0;
      return value > 0;
    });
    
    const sorted = filtered.sort((a, b) => (b.rawValues[baseIndex] || 0) - (a.rawValues[baseIndex] || 0));
    const top5 = sorted.slice(0, 5);
    
    return top5;
  };

  // Generate insights based on data analysis
  const generateInsights = (kgsData, amountData, customerData) => {
    const insights = [];
    
    if (basePeriodIndex !== null && basePeriodIndex > 0) {
      // YoY Growth Analysis
      const currentKgs = calculateTotals(kgsData)[basePeriodIndex] || 0;
      const prevKgs = calculateTotals(kgsData)[basePeriodIndex - 1] || 0;
      
      if (prevKgs > 0) {
        const growth = ((currentKgs - prevKgs) / prevKgs) * 100;
        insights.push({
          type: growth > 0 ? 'positive' : 'negative',
          title: `${growth > 0 ? 'Growth' : 'Decline'} in Sales Volume`,
          description: `${Math.abs(growth).toFixed(1)}% ${growth > 0 ? 'increase' : 'decrease'} compared to previous period`
        });
      }
    }

    // Top product analysis
    const topProduct = getTopPerformers(kgsData, basePeriodIndex)[0];
    if (topProduct) {
      // Use basePeriodIndex directly
      const productValue = topProduct.rawValues[basePeriodIndex] || 0;
      insights.push({
        type: 'info',
        title: 'Top Performing Product',
        description: `${topProduct.productGroup} leads with ${productValue.toLocaleString()} KGS`
      });
    }

    // Customer concentration
    if (customerData.length > 0) {
      // Use basePeriodIndex directly
      const topCustomerValue = customerData[0]?.rawValues[basePeriodIndex] || 0;
      const totalCustomerValue = customerData.reduce((sum, customer) => 
        sum + (customer.rawValues[basePeriodIndex] || 0), 0);
      
      if (totalCustomerValue > 0) {
        const concentration = (topCustomerValue / totalCustomerValue) * 100;
        insights.push({
          type: concentration > 50 ? 'warning' : 'info',
          title: 'Customer Concentration',
          description: `Top customer represents ${concentration.toFixed(1)}% of total sales`
        });
      }
    }

    return insights;
  };

  // Calculate performance metrics
  const calculatePerformanceMetrics = (kgsData, amountData) => {
    if (!columnOrder || basePeriodIndex === null) return {};

    // Use basePeriodIndex directly - it already corresponds to the correct column index
    const kgsTotal = calculateTotals(kgsData)[basePeriodIndex] || 0;
    const amountTotal = calculateTotals(amountData)[basePeriodIndex] || 0;
    
    return {
      totalKgs: kgsTotal,
      totalAmount: amountTotal,
      avgPricePerKg: kgsTotal > 0 ? amountTotal / kgsTotal : 0,
      productCount: kgsData.filter(item => (item.rawValues[basePeriodIndex] || 0) > 0).length,
      customerCount: customerData.filter(customer => (customer.rawValues[basePeriodIndex] || 0) > 0).length
    };
  };

  if (loading) {
    return (
      <div className="sales-rep-report-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Generating comprehensive report for {toProperCase(rep)}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-rep-report-content">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Report</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="sales-rep-report-content">
        <div className="no-data-container">
          <div className="no-data-icon">📊</div>
          <h3>No Data Available</h3>
          <p>Please select periods to generate the report for {toProperCase(rep)}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-rep-report-content">
      {usedCache && (
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#d4edda',
          borderLeft: '4px solid #28a745',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#155724'
        }}>
          ⚡ <strong>Ultra-Fast Mode:</strong> Report loaded instantly from cache!
        </div>
      )}
      
      {/* Export Button */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        <SalesRepHTMLExport 
          rep={rep}
          reportType="individual"
          reportData={reportData}
          kgsData={kgsData}
          amountData={amountData}
          customerData={customerData}
          customerAmountData={customerAmountData}
          performanceMetrics={reportData?.performanceMetrics}
          selectedDivision={selectedDivision}
          strategicFindings={strategicFindings}
          customerFindings={customerFindings}
          yearlyBudgetTotal={yearlyBudgetTotals.yearlyBudgetTotal}
          yearlySalesBudgetTotal={yearlyBudgetTotals.yearlySalesBudgetTotal}
          yearlyBudgetAchievement={yearlyBudgetTotals.yearlyBudgetAchievement}
          yearlySalesBudgetAchievement={yearlyBudgetTotals.yearlySalesBudgetAchievement}
          customerInsights={customerInsights}
        />
      </div>
      
      <div className="report-container">
        <ReportHeader 
          rep={rep} 
          basePeriod={reportData.basePeriod}
          toProperCase={toProperCase}
        />
        
        <ExecutiveSummary 
          performanceMetrics={reportData.performanceMetrics}
          reportData={reportData}
          kgsData={kgsData}
          basePeriodIndex={basePeriodIndex}
          onYearlyBudgetCalculated={handleYearlyBudgetCalculated}
        />
        
        <PerformanceDashboard 
          reportData={reportData}
          kgsData={kgsData}
          amountData={amountData}
          customerAmountData={customerAmountData}
          rep={rep}
          applySavedMergeRules={applySavedMergeRules}
          onStrategicFindingsCalculated={handleStrategicFindings}
          onCustomerFindingsCalculated={handleCustomerFindings}
        />
        
        {/* Removed ProductPerformanceTable to avoid overlapping the chart */}
        
        {/* Key Insights section removed per request */}
        
        {/* Top Customer Performance section removed per request */}
        
        {/* Period comparison and Export actions removed */}
      </div>
    </div>
  );
};

export default SalesRepReport;
