import React, { useEffect, useState } from 'react';
import TabsComponent, { Tab } from './TabsComponent';
import { useFilter } from '../../contexts/FilterContext';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useSalesData } from '../../contexts/SalesDataContext';
import { useSalesRepReports } from '../../contexts/SalesRepReportsContext';
import SalesRepReport from '../reports/SalesRepReport';
import SalesRepHTMLExport from './SalesRepHTMLExport';
import UAEDirhamSymbol from './UAEDirhamSymbol';
import './SalesBySalesRepTable.css'; // Use dedicated CSS file

// Component to display and manage saved merged groups
const MergedGroupsDisplay = ({ salesRep, division, onGroupDeleted, onGroupEdit }) => {
  const [savedGroups, setSavedGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedGroups();
  }, [salesRep, division]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedGroups = async () => {
    if (!salesRep || !division) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/customer-merge-rules/get?salesRep=${encodeURIComponent(salesRep)}&division=${encodeURIComponent(division)}`);
      const result = await response.json();
      
      if (result.success) {
        setSavedGroups(result.data);
      } else {
        setSavedGroups([]);
      }
    } catch (error) {
      console.error('Error loading saved groups:', error);
      setSavedGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (mergedName) => {
    if (!window.confirm(`Are you sure you want to delete the group "${mergedName}"?`)) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/customer-merge-rules/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesRep,
          division,
          mergedCustomerName: mergedName
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload groups and refresh parent data
        loadSavedGroups();
        if (onGroupDeleted) {
          onGroupDeleted();
        }
        console.log('✅ Group deleted successfully!');
      } else {
        console.error(`❌ Failed to delete group: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ marginTop: '20px', padding: '15px', textAlign: 'center' }}>
        Loading saved groups...
      </div>
    );
  }

  if (savedGroups.length === 0) {
    return null; // Don't show anything if no groups
  }

  return (
    <div style={{
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '5px'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
        📊 Saved Customer Groups ({savedGroups.length})
      </h4>
      {savedGroups.map((group, index) => (
        <div key={index} style={{
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#2c3e50' }}>
              {toProperCase(group.mergedName)}
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Original customers: {group.originalCustomers.map(customer => toProperCase(customer)).join(', ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onGroupEdit && onGroupEdit(group)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => handleDeleteGroup(group.mergedName)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};



// Helper function to convert month names to numbers
const getMonthNumber = (monthName) => {
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  return months[monthName] || '01';
};

// Helper function to get months for a given period
const getMonthsForPeriod = (period) => {
  const monthMap = {
    'Q1': ['January', 'February', 'March'],
    'Q2': ['April', 'May', 'June'],
    'Q3': ['July', 'August', 'September'],
    'Q4': ['October', 'November', 'December'],
    'HY1': ['January', 'February', 'March', 'April', 'May', 'June'],
    'HY2': ['July', 'August', 'September', 'October', 'November', 'December'],
    'Year': ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']
  };
  return monthMap[period] || [period];
};

// Helper function for delta calculation
const calculateDeltaDisplay = (newerValue, olderValue) => {
  if (!isNaN(newerValue) && !isNaN(olderValue)) {
    let deltaPercent;
    
    if (olderValue === 0) {
      deltaPercent = newerValue > 0 ? Infinity : newerValue < 0 ? -Infinity : 0;
    } else {
      deltaPercent = ((newerValue - olderValue) / Math.abs(olderValue)) * 100;
    }
    
    // Format based on value range
    let formattedDelta;
    if (deltaPercent === Infinity || deltaPercent === -Infinity) {
      formattedDelta = '∞';
    } else if (Math.abs(deltaPercent) > 99.99) {
      formattedDelta = Math.round(deltaPercent);
    } else {
      formattedDelta = deltaPercent.toFixed(1);
    }
    
    if (deltaPercent > 0) {
      return {
        arrow: '▲',
        value: deltaPercent === Infinity ? formattedDelta : `${formattedDelta}%`,
        color: '#288cfa'
      };
    } else if (deltaPercent < 0) {
      return {
        arrow: '▼',
        value: deltaPercent === -Infinity ? formattedDelta : `${Math.abs(formattedDelta)}%`,
        color: '#dc3545'
      };
    } else {
      return {
        arrow: '',
        value: '0.0%',
        color: 'black'
      };
    }
  }
  return '-';
};

// Helper function to format names to proper case (Xxxx Xxxx)
const toProperCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Helper function to prepare periods from column order
const preparePeriods = (columnOrder) => {
    const periods = [];
    
    columnOrder.forEach(col => {
      let monthsToInclude = [];
      
      if (col.months && Array.isArray(col.months)) {
        // Custom range - use all months in the range
        monthsToInclude = col.months;
      } else {
      // Handle quarters and standard periods using helper function
      monthsToInclude = getMonthsForPeriod(col.month);
      }
      
      // Add each month as a separate period for backend aggregation
      monthsToInclude.forEach(monthName => {
        periods.push({
          year: col.year,
          month: getMonthNumber(monthName),
          type: col.type || 'Actual',
          originalColumn: col // Keep reference to original column for grouping
        });
      });
    });
    
  return periods;
};

// Helper function to fetch dashboard data from API
const fetchDashboardData = async (salesRep, variable, periods, selectedDivision = 'FP') => {
  if (selectedDivision === 'FP') {
    // Use real FP data from PostgreSQL
    const response = await fetch('http://localhost:3001/api/fp/sales-rep-dashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        salesRep,
        valueTypes: [variable], // Use original case to match database
        periods
      })
    });
    
    if (!response.ok) {
      console.error('Failed to fetch dashboard data:', response.status);
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } else {
    // Generate placeholder data for SB/TF/HCM divisions
    return generatePlaceholderDashboardData(salesRep, variable, periods, selectedDivision);
  }
};

// Helper function to generate placeholder dashboard data for non-FP divisions
const generatePlaceholderDashboardData = (salesRep, variable, periods, division) => {
  // Define product groups for each division
  const divisionProductGroups = {
    'SB': ['Stretch Films', 'Shrink Films', 'Agricultural Films', 'Barrier Films'],
    'TF': ['Technical Films', 'Barrier Films', 'Specialty Films', 'Industrial Films'],
    'HCM': ['Hygiene Films', 'Medical Films', 'Pharmaceutical', 'Safety Films']
  };
  
  const productGroups = divisionProductGroups[division] || ['Product Group 1', 'Product Group 2', 'Product Group 3'];
  
  // Generate realistic placeholder data
  const dashboardData = {};
  
  productGroups.forEach(pg => {
    dashboardData[pg] = {};
    dashboardData[pg][variable] = {};
    
    periods.forEach(period => {
      const { year, month, type } = period;
      const key = `${year}-${month}-${type}`;
      
      // Generate random but realistic values
      const baseValue = variable === 'KGS' ? 
        Math.floor(Math.random() * 50000) + 10000 : // 10K-60K KGS
        Math.floor(Math.random() * 500000) + 100000; // 100K-600K Amount
      
      // Add some variation based on sales rep name for consistency
      const repVariation = salesRep.length * 1000;
      const pgVariation = pg.length * 500;
      
      dashboardData[pg][variable][key] = baseValue + repVariation + pgVariation;
    });
  });
  
  return {
    productGroups,
    dashboardData,
    isPlaceholder: true
  };
};
    
// Helper function to build extended columns structure
const buildExtendedColumns = (columnOrder) => {
    const extendedColumns = [];
  
    columnOrder.forEach((col, index) => {
      extendedColumns.push({
        ...col,
        columnType: 'data',
        label: `${col.year}-${col.isCustomRange ? col.displayName : col.month}-${col.type}`
      });
      
      // Add delta column after each data column (except the last one)
      if (index < columnOrder.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          label: 'Delta'
        });
      }
    });
    
  return extendedColumns;
};

// Helper function to aggregate monthly data for a column
const aggregateColumnData = (pgName, variable, col, dashboardData) => {
          try {
            const year = col.year;
            const type = col.type || 'Actual';
            let aggregatedValue = 0;
            
            // Determine which months to aggregate based on column configuration
            let monthsToAggregate = [];
            
            if (col.months && Array.isArray(col.months)) {
              // Custom range - use all months in the range
              monthsToAggregate = col.months;
            } else {
      // Handle quarters and standard periods using helper function
      monthsToAggregate = getMonthsForPeriod(col.month);
            }
            
            // Sum values for all months in the period
            monthsToAggregate.forEach(monthName => {
              const month = getMonthNumber(monthName);
              const key = `${year}-${month}-${type}`;
              const monthValue = dashboardData[pgName]?.[variable]?.[key] || 0;
              
              if (typeof monthValue === 'number') {
                aggregatedValue += monthValue;
              }
            });
    
    return aggregatedValue;
  } catch (error) {
    // Error extracting sales data
    return 0;
  }
};

// Helper function to sort product groups with "Others" at the end
const sortProductGroups = (productGroups) => {
  return productGroups.sort((a, b) => {
    // If 'a' is "Others", it should come after 'b'
    if (a.toLowerCase() === 'others') return 1;
    // If 'b' is "Others", it should come after 'a'
    if (b.toLowerCase() === 'others') return -1;
    // For all other cases, maintain alphabetical order
    return a.localeCompare(b);
  });
};





// Helper function to process data for a single product group
const processProductGroupData = (pgName, variable, extendedColumns, dashboardData) => {
  const values = [];
  const dataValues = []; // Store only data values for delta calculation
  
  // First pass: process all data columns
  for (let idx = 0; idx < extendedColumns.length; idx++) {
    const col = extendedColumns[idx];
    
    if (col.columnType === 'data') {
      const aggregatedValue = aggregateColumnData(pgName, variable, col, dashboardData);
            
            // Format as comma-separated integer without decimals
            const formattedValue = Math.round(aggregatedValue).toLocaleString();
            dataValues.push(aggregatedValue); // Store raw value for delta calculation
            values.push(formattedValue);
        }
      }
      
      // Second pass: insert delta calculations
      const finalValues = [];
      let dataIndex = 0;
      
      for (let idx = 0; idx < extendedColumns.length; idx++) {
        const col = extendedColumns[idx];
        
        if (col.columnType === 'data') {
          finalValues.push(values[dataIndex]);
          dataIndex++;
        } else if (col.columnType === 'delta') {
          // Calculate delta between adjacent data columns
          // dataIndex points to the next data column (newer)
          // dataIndex-1 points to the previous data column (older)
          const newerDataIndex = dataIndex;
          const olderDataIndex = dataIndex - 1;
          
          if (olderDataIndex >= 0 && newerDataIndex < dataValues.length) {
            const newerValue = dataValues[newerDataIndex];
            const olderValue = dataValues[olderDataIndex];
            
        const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
        finalValues.push(deltaResult);
          } else {
            finalValues.push('-');
          }
        }
      }
      
      return {
        name: toProperCase(pgName), // Format product group name to proper case
        values: finalValues,
        rawValues: dataValues // Store raw numeric values for total calculations
      };
};

// Main function to fetch actual product groups and sales data from fp_data for each sales rep
const getProductGroupsForSalesRep = async (salesRep, variable, columnOrder, selectedDivision = 'FP') => {
  try {
    // Safety check for columnOrder
    if (!columnOrder || columnOrder.length === 0) {
      return [];
    }
    
    // Step 1: Prepare periods from columnOrder
    const periods = preparePeriods(columnOrder);
    
    // Step 2: Fetch data from API
    const { productGroups, dashboardData } = await fetchDashboardData(salesRep, variable, periods, selectedDivision);
    
    // Step 3: Sort product groups with "Others" at the end
    const sortedProductGroups = sortProductGroups(productGroups);
    
    // Step 4: Build extended columns structure
    const extendedColumns = buildExtendedColumns(columnOrder);
    
    // Step 5: Process data for each product group
    const processedResult = sortedProductGroups.map((pgName) => 
      processProductGroupData(pgName, variable, extendedColumns, dashboardData)
    );
    
    return processedResult;
    
  } catch (error) {
    // Error fetching product groups for sales rep
    // Return fallback structure
    return [{
      name: 'No Product Groups Found',
      values: columnOrder ? new Array(columnOrder.length * 2 - 1).fill('-') : []
    }];
  }
};

// Helper function to fetch customer dashboard data from API - UNIVERSAL
const fetchCustomerDashboardData = async (salesRep, periods, selectedDivision = 'FP') => {
  try {
    console.log(`🔍 Fetching customer dashboard data for sales rep: ${salesRep} in division: ${selectedDivision}`);
    
    // Use universal endpoint for all divisions
    const response = await fetch('http://localhost:3001/api/customer-dashboard-universal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        division: selectedDivision,
        salesRep,
        periods
      })
    });
    
    if (!response.ok) {
      console.error('Failed to fetch customer dashboard data:', response.status);
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Retrieved customer dashboard data for ${salesRep} in ${selectedDivision}`);
      return result.data;
    } else {
      console.warn(`⚠️ API returned error, falling back to placeholder data:`, result.message);
      return generatePlaceholderCustomerData(salesRep, periods, selectedDivision);
    }
  } catch (error) {
    console.error(`❌ Error fetching customer dashboard data for ${salesRep}:`, error);
    console.log(`🔄 Falling back to placeholder data for ${selectedDivision}`);
    return generatePlaceholderCustomerData(salesRep, periods, selectedDivision);
  }
};

// Helper function to generate placeholder customer data for non-FP divisions
const generatePlaceholderCustomerData = (salesRep, periods, division) => {
  // Generate customer names based on division
  const divisionCustomers = {
    'SB': ['Industrial Corp A', 'Packaging Solutions B', 'AgriTech Industries', 'Stretch Film Co', 'Barrier Solutions Ltd'],
    'TF': ['Technical Films Inc', 'Advanced Materials Co', 'Specialty Products Ltd', 'Industrial Tech Corp', 'Barrier Tech Solutions'],
    'HCM': ['MedTech Industries', 'Healthcare Solutions', 'Pharma Packaging Co', 'Medical Films Ltd', 'Safety Products Inc']
  };
  
  const customers = divisionCustomers[division] || ['Customer A', 'Customer B', 'Customer C', 'Customer D', 'Customer E'];
  
  // Generate realistic placeholder data
  const dashboardData = {};
  
  customers.forEach(customer => {
    dashboardData[customer] = {};
    
    periods.forEach(period => {
      const { year, month, type } = period;
      const key = `${year}-${month}-${type}`;
      
      // Generate random but realistic KGS values
      const baseValue = Math.floor(Math.random() * 30000) + 5000; // 5K-35K KGS
      
      // Add some variation based on sales rep and customer name for consistency
      const repVariation = salesRep.length * 500;
      const customerVariation = customer.length * 200;
      
      dashboardData[customer][key] = baseValue + repVariation + customerVariation;
    });
  });
  
  return {
    customers,
    dashboardData,
    isPlaceholder: true
  };
};

// Helper function to aggregate customer monthly data for a column
const aggregateCustomerColumnData = (customerName, col, dashboardData) => {
  try {
    const year = col.year;
    const type = col.type || 'Actual';
    let aggregatedValue = 0;
    
    // Determine which months to aggregate based on column configuration
    let monthsToAggregate = [];
    
    if (col.months && Array.isArray(col.months)) {
      // Custom range - use all months in the range
      monthsToAggregate = col.months;
    } else {
      // Handle quarters and standard periods using helper function
      monthsToAggregate = getMonthsForPeriod(col.month);
    }
    
    // Sum values for all months in the period
    monthsToAggregate.forEach(monthName => {
      const month = getMonthNumber(monthName);
      const key = `${year}-${month}-${type}`;
      const monthValue = dashboardData[customerName]?.[key] || 0;
      
      if (typeof monthValue === 'number') {
        aggregatedValue += monthValue;
      }
    });
    
    return aggregatedValue;
  } catch (error) {
    // Error extracting sales data
    return 0;
  }
};

// Customer merge rules are now handled entirely through manual database-based grouping



// Load and apply saved merge rules from database
const applySavedMergeRules = async (salesRep, division, customers, dashboardData, extendedColumns) => {
  try {
    const response = await fetch(`http://localhost:3001/api/customer-merge-rules/get?salesRep=${encodeURIComponent(salesRep)}&division=${encodeURIComponent(division)}`);
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      console.log(`✅ Found ${result.data.length} saved merge rules for ${salesRep}`);
      console.log('📋 Available customers:', customers);
      console.log('📋 Saved merge rules:', result.data);
  
  const processedCustomers = [];
  const mergedGroups = [];
  const processed = new Set();
  
      // Apply saved merge rules
      result.data.forEach((rule) => {
        const originalCustomers = rule.originalCustomers;
        
        // Check if all customers in the rule still exist (case-insensitive comparison)
        const existingCustomers = originalCustomers.filter(customer => {
          // Try exact match first
          if (customers.includes(customer)) return true;
          
          // Try case-insensitive match
          const lowerCustomer = customer.toLowerCase().trim();
          return customers.some(c => c.toLowerCase().trim() === lowerCustomer);
        });
        
        const missingCustomers = originalCustomers.filter(customer => {
          const lowerCustomer = customer.toLowerCase().trim();
          return !customers.some(c => c.toLowerCase().trim() === lowerCustomer);
        });
        
        console.log(`🔍 Processing rule "${rule.mergedName}":`, {
          originalCustomers,
          existingCustomers,
          found: existingCustomers.length,
          missingCustomers,
          allCustomers: customers
        });
        
        if (existingCustomers.length > 1) {
          // All customers exist, apply the merge
          existingCustomers.forEach(customer => processed.add(customer));
          
          // Also add the original customer names to processed set (case-insensitive)
          originalCustomers.forEach(originalCustomer => {
            const matchingCustomer = customers.find(c => 
              c.toLowerCase().trim() === originalCustomer.toLowerCase().trim()
            );
            if (matchingCustomer) {
              processed.add(matchingCustomer);
            }
          });
          
          mergedGroups.push(existingCustomers);
          const mergedCustomer = processMergedCustomerGroup(existingCustomers, extendedColumns, dashboardData, rule.mergedName);
          processedCustomers.push(mergedCustomer);
        } else if (existingCustomers.length === 1) {
          // Only one customer exists, but use the merged name if specified
          processed.add(existingCustomers[0]);
          const singleCustomer = processCustomerData(existingCustomers[0], extendedColumns, dashboardData);
          // Update the display name to use the merged name
          if (rule.mergedName) {
            singleCustomer.name = toProperCase(rule.mergedName) + '*';
            singleCustomer.originalName = rule.mergedName;
          }
          processedCustomers.push(singleCustomer);
          console.log(`⚠️ Only one customer found for merge rule "${rule.mergedName}", using merged name`);
        }
      });
      
      // Add remaining unprocessed customers as single customers
      customers.forEach(customer => {
        if (!processed.has(customer)) {
          console.log(`➕ Adding unprocessed customer: "${customer}"`);
          const singleCustomer = processCustomerData(customer, extendedColumns, dashboardData);
      processedCustomers.push(singleCustomer);
        } else {
          console.log(`✅ Customer already processed: "${customer}"`);
    }
      });
  
  return {
    customers: processedCustomers,
    mergedGroups: mergedGroups
  };
    }
    
    // No saved rules found, return all customers as individual entries
    console.log(`ℹ️ No saved merge rules found for ${salesRep}, showing all customers individually`);
    const individualCustomers = customers.map(customer => 
      processCustomerData(customer, extendedColumns, dashboardData)
    );
    
    return {
      customers: individualCustomers,
      mergedGroups: []
    };
    
  } catch (error) {
    console.error('Error loading saved merge rules:', error);
    console.log('Showing all customers individually due to error');
    const individualCustomers = customers.map(customer => 
      processCustomerData(customer, extendedColumns, dashboardData)
    );
    
    return {
      customers: individualCustomers,
      mergedGroups: []
    };
  }
};

// Manual customer grouping system only - no automatic matching

// Process a group of merged customers
const processMergedCustomerGroup = (customerGroup, extendedColumns, dashboardData, customMergedName = null) => {
  // Use custom merged name if provided, otherwise use the longest/most specific name as the display name
  const displayName = customMergedName || customerGroup.reduce((longest, current) => 
    current.length > longest.length ? current : longest
  );
  
  const values = [];
  const dataValues = [];
  
  // First pass: process all data columns by aggregating across all customers in group
  for (let idx = 0; idx < extendedColumns.length; idx++) {
    const col = extendedColumns[idx];
    
    if (col.columnType === 'data') {
      let aggregatedValue = 0;
      
      // Sum values from all customers in the group
      customerGroup.forEach(customerName => {
        const value = aggregateCustomerColumnData(customerName, col, dashboardData);
        if (typeof value === 'number') {
          aggregatedValue += value;
        }
      });
      
      dataValues.push(aggregatedValue);
      values.push(aggregatedValue);
    }
  }
  
  // Second pass: insert delta calculations
  const finalValues = [];
  let dataIndex = 0;
  
  for (let idx = 0; idx < extendedColumns.length; idx++) {
    const col = extendedColumns[idx];
    
    if (col.columnType === 'data') {
      finalValues.push(values[dataIndex]);
      dataIndex++;
    } else if (col.columnType === 'delta') {
      // Calculate delta between adjacent data columns
      const newerDataIndex = dataIndex;
      const olderDataIndex = dataIndex - 1;
      
      if (olderDataIndex >= 0 && newerDataIndex < dataValues.length) {
        const newerValue = dataValues[newerDataIndex];
        const olderValue = dataValues[olderDataIndex];
        
        const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
        finalValues.push(deltaResult);
      } else {
        finalValues.push('-');
      }
    }
  }

  return {
    name: toProperCase(displayName) + '*', // Add asterisk to indicate merge
    originalName: displayName,
    values: finalValues,
    rawValues: dataValues,
    mergedCustomers: customerGroup, // Keep track of original names
    isMerged: true
  };
};

// Helper function to process data for a single customer
const processCustomerData = (customerName, extendedColumns, dashboardData) => {
  const values = [];
  const dataValues = []; // Store only data values for delta calculation
  
  // First pass: process all data columns
  for (let idx = 0; idx < extendedColumns.length; idx++) {
    const col = extendedColumns[idx];
    
    if (col.columnType === 'data') {
      const value = aggregateCustomerColumnData(customerName, col, dashboardData);
      dataValues.push(value); // Store raw value for delta calculation
      values.push(value);
    }
  }
  
  // Second pass: insert delta calculations
  const finalValues = [];
  let dataIndex = 0;
  
  for (let idx = 0; idx < extendedColumns.length; idx++) {
    const col = extendedColumns[idx];
    
    if (col.columnType === 'data') {
      finalValues.push(values[dataIndex]);
      dataIndex++;
    } else if (col.columnType === 'delta') {
      // Calculate delta between adjacent data columns
      const newerDataIndex = dataIndex;
      const olderDataIndex = dataIndex - 1;
      
      if (olderDataIndex >= 0 && newerDataIndex < dataValues.length) {
        const newerValue = dataValues[newerDataIndex];
        const olderValue = dataValues[olderDataIndex];
        
        const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
        finalValues.push(deltaResult);
      } else {
        finalValues.push('-');
      }
    }
  }

  // Format customer name for display while keeping original for data queries
  const displayName = toProperCase(customerName);

  return {
    name: displayName, // Use formatted name for display
    originalName: customerName, // Keep original for potential future data queries
    values: finalValues,
    rawValues: dataValues // Store raw numeric values for total calculations
  };
};

// Removed unused helper functions

// Removed unused getCustomersForSalesRep function

// Removed unused getConfirmedMerges function - was not being used

const SalesBySaleRepTable = () => {
  const { dataGenerated, columnOrder } = useFilter();
  const { selectedDivision } = useExcelData();
  const { defaultReps, salesRepGroups, loadSalesRepConfig } = useSalesData();
  const { preloadAllReports, loading: reportsLoading } = useSalesRepReports();
  const [activeTab, setActiveTab] = useState(null);

  // Ensure sales rep config is loaded for the current division
  useEffect(() => {
    if (selectedDivision) {
      loadSalesRepConfig(false, selectedDivision);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]); // loadSalesRepConfig removed from dependencies to prevent loop

  // Pre-load ALL sales rep reports when Report tab is opened
  useEffect(() => {
    if (activeTab === 'report' && selectedDivision && columnOrder && columnOrder.length > 0) {
      const allReps = getFilteredReps();
      if (allReps.length > 0 && !reportsLoading) {
        console.log('🚀 Report tab activated, pre-loading ALL sales rep data in background...');
        preloadAllReports(selectedDivision, allReps, columnOrder);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDivision, columnOrder]);

  // Handle tab change
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
  };

  // Check if division is selected
  if (!selectedDivision) {
    return (
      <div className="sales-rep-table-container">
        <div className="table-empty-state">
          <h3>Sales by Sales Rep</h3>
          <p>Please select a division to view sales representative data.</p>
        </div>
      </div>
    );
  }

  // Division status information
  const divisionStatus = {
    'FP': { 
      status: 'active', 
      database: 'fp_data_excel PostgreSQL', 
      message: 'Live data from PostgreSQL database' 
    },
    'SB': { 
      status: 'placeholder', 
      database: 'sb_data PostgreSQL', 
      message: 'Will connect to sb_data PostgreSQL table when implemented' 
    },
    'TF': { 
      status: 'placeholder', 
      database: 'tf_data PostgreSQL', 
      message: 'Will connect to tf_data PostgreSQL table when implemented' 
    },
    'HCM': { 
      status: 'placeholder', 
      database: 'hcm_data PostgreSQL', 
      message: 'Will connect to hcm_data PostgreSQL table when implemented' 
    }
  };

  const currentStatus = divisionStatus[selectedDivision] || { status: 'unknown', database: 'Unknown', message: 'Division not recognized' };

  // Simple loading check - if no sales reps loaded yet, show loading
  const isLoading = !defaultReps && !salesRepGroups;
  
  if (isLoading) return (
    <div className="sales-rep-table-container">
      <div className="table-empty-state">Loading sales rep data...</div>
    </div>
  );
  
  if (!defaultReps || defaultReps.length === 0) return (
    <div className="sales-rep-table-container">
      <div className="table-empty-state">
        <h3>Sales by Sales Rep - {selectedDivision} Division</h3>
        <p>No sales reps configured for {selectedDivision} division.</p>
        <p>Please configure sales reps in Master Data tab.</p>
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: currentStatus.status === 'active' ? '#d4edda' : '#fff3cd',
          border: currentStatus.status === 'active' ? '1px solid #c3e6cb' : '1px solid #ffeaa7',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>📊 Data Source:</strong> {currentStatus.database}<br/>
          <strong>📝 Status:</strong> {currentStatus.message}
        </div>
      </div>
    </div>
  );

  if (!dataGenerated) {
    return (
      <div className="sales-rep-table-container">
        <h3 className="table-title">Sales Rep Product Group Table - {selectedDivision} Division</h3>
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: currentStatus.status === 'active' ? '#d4edda' : '#fff3cd',
          border: currentStatus.status === 'active' ? '1px solid #c3e6cb' : '1px solid #ffeaa7',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>📊 Data Source:</strong> {currentStatus.database}<br/>
          <strong>📝 Status:</strong> {currentStatus.message}
        </div>
        <div className="table-empty-state">
          <p>Please select columns and click the Generate button to view sales rep product group data.</p>
        </div>
      </div>
    );
  }

  // Filter out sales reps that are already part of a group
  const getFilteredReps = () => {
    // If no groups exist, just return all default reps
    if (!salesRepGroups || Object.keys(salesRepGroups).length === 0) {
      return defaultReps || [];
    }

    // Create a set of all sales reps that are members of any group
    const groupMembers = new Set();
    Object.values(salesRepGroups).forEach(members => {
      members.forEach(member => groupMembers.add(member));
    });

    // Get all group names
    const groupNames = Object.keys(salesRepGroups);

    // Return only reps that are not members of any group
    const filteredReps = defaultReps.filter(rep => !groupMembers.has(rep));
    
    // Add all group names to the filtered list
    return [...filteredReps, ...groupNames];
  };

  return (
    <div className="sales-rep-table-container">
      <TabsComponent defaultActiveTab={1} onTabChange={handleTabChange}>
        <Tab key="tables" label="Tables">
          <div className="tables-tab-content">
            <TabsComponent>
              {getFilteredReps().map(rep => {
                return (
                  <Tab key={rep} label={toProperCase(rep)}>
                    <SalesRepTabContent rep={rep} />
                  </Tab>
                );
              })}
            </TabsComponent>
          </div>
        </Tab>
        <Tab key="report" label="Report">
          <div className="report-tab-content">
            {reportsLoading && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                🚀 Loading all sales rep reports in background... This will make switching between reports super fast!
              </div>
            )}
            <TabsComponent>
              {getFilteredReps().map(rep => {
                return (
                  <Tab key={rep} label={toProperCase(rep)}>
                    <SalesRepReportContent rep={rep} />
                  </Tab>
                );
              })}
            </TabsComponent>
          </div>
        </Tab>
      </TabsComponent>
    </div>
  );
};

// Component to display static product group structure for each tab
const SalesRepTabContent = ({ rep }) => {
  const { columnOrder, basePeriodIndex } = useFilter();
  const { selectedDivision } = useExcelData();
  const [kgsData, setKgsData] = useState([]);
  const [amountData, setAmountData] = useState([]);
  const [mormData, setMormData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  
  // State for hiding Budget/Forecast columns
  const [hideBudgetForecast, setHideBudgetForecast] = useState(false);

  // State for customer grouping
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  
  // State for editing existing groups
  const [editingGroup, setEditingGroup] = useState(null);
  const [customersToRemove, setCustomersToRemove] = useState(new Set());
  
  // State for subtle visual feedback
  const [operationFeedback, setOperationFeedback] = useState(null);

  // Show subtle feedback that auto-disappears
  const showFeedback = (message, type = 'success') => {
    setOperationFeedback({ message, type });
    setTimeout(() => setOperationFeedback(null), 3000); // Auto-clear after 3 seconds
  };

    const fetchData = async () => {
      if (!rep || !columnOrder || columnOrder.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // OPTIMIZED: Use new unified batch API endpoint for better performance
        const periods = preparePeriods(columnOrder);
        const response = await fetch('http://localhost:3001/api/sales-rep-complete-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            division: selectedDivision,
            salesRep: rep,
            periods
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          // Process the unified data response
          const { productGroups, customers, dashboardData, customerData } = result.data;
          
          // Build extended columns structure
          const extendedColumns = buildExtendedColumns(columnOrder);
          
          // Process product group data for each value type
          const processProductGroupsForValueType = (valueType) => {
            const sortedProductGroups = sortProductGroups(productGroups);
            return sortedProductGroups.map((pgName) => {
              const values = [];
              const dataValues = [];
              
              // Process data columns
              for (let idx = 0; idx < extendedColumns.length; idx++) {
                const col = extendedColumns[idx];
                
                if (col.columnType === 'data') {
                  const periodKey = `${col.year}-${col.month}-${col.type}`;
                  const value = dashboardData[pgName]?.[valueType]?.[periodKey] || 0;
                  dataValues.push(value);
                  values.push(value);
                }
              }
              
              // Insert delta calculations
              const finalValues = [];
              let dataIndex = 0;
              
              for (let idx = 0; idx < extendedColumns.length; idx++) {
                const col = extendedColumns[idx];
                
                if (col.columnType === 'data') {
                  finalValues.push(values[dataIndex]);
                  dataIndex++;
                } else if (col.columnType === 'delta') {
                  const newerDataIndex = dataIndex;
                  const olderDataIndex = dataIndex - 1;
                  
                  if (olderDataIndex >= 0 && newerDataIndex < dataValues.length) {
                    const newerValue = dataValues[newerDataIndex];
                    const olderValue = dataValues[olderDataIndex];
                    const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
                    finalValues.push(deltaResult);
                  } else {
                    finalValues.push('-');
                  }
                }
              }
              
              return {
                name: pgName,
                values: finalValues,
                rawValues: dataValues
              };
            });
          };
          
          // Process customer data
          const processedCustomers = customers.map(customerName => {
            const values = [];
            const dataValues = [];
            
            // Process data columns
            for (let idx = 0; idx < extendedColumns.length; idx++) {
              const col = extendedColumns[idx];
              
              if (col.columnType === 'data') {
                const periodKey = `${col.year}-${col.month}-${col.type}`;
                const value = customerData[customerName]?.[periodKey] || 0;
                dataValues.push(value);
                values.push(value);
              }
            }
            
            // Insert delta calculations
            const finalValues = [];
            let dataIndex = 0;
            
            for (let idx = 0; idx < extendedColumns.length; idx++) {
              const col = extendedColumns[idx];
              
              if (col.columnType === 'data') {
                finalValues.push(values[dataIndex]);
                dataIndex++;
              } else if (col.columnType === 'delta') {
                const newerDataIndex = dataIndex;
                const olderDataIndex = dataIndex - 1;
                
                if (olderDataIndex >= 0 && newerDataIndex < dataValues.length) {
                  const newerValue = dataValues[newerDataIndex];
                  const olderValue = dataValues[olderDataIndex];
                  const deltaResult = calculateDeltaDisplay(newerValue, olderValue);
                  finalValues.push(deltaResult);
                } else {
                  finalValues.push('-');
                }
              }
            }
            
            return {
              name: customerName,
              originalName: customerName,
              values: finalValues,
              rawValues: dataValues,
              isMerged: false
            };
          });
          
          // Apply saved merge rules to customer data
          const { customers: finalCustomerData } = await applySavedMergeRules(rep, selectedDivision, processedCustomers, null, extendedColumns);
          
          // Sort customers by base period volume (highest to lowest)
          if (basePeriodIndex != null && basePeriodIndex >= 0) {
            finalCustomerData.sort((a, b) => {
              const aValue = a.rawValues[basePeriodIndex] || 0;
              const bValue = b.rawValues[basePeriodIndex] || 0;
              return bValue - aValue; // Sort descending (highest first)
            });
          }

          // Set all data at once
          setKgsData(processProductGroupsForValueType('KGS'));
          setAmountData(processProductGroupsForValueType('Amount'));
          setMormData(processProductGroupsForValueType('MoRM'));
          setCustomerData(finalCustomerData);
          
          console.log(`✅ Loaded complete data for ${rep} using optimized batch API`);
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching data with batch API, falling back to individual calls:', error);
        
        // Fallback to original individual API calls
        try {
          const [kgsResult, amountResult, mormResult] = await Promise.all([
            getProductGroupsForSalesRep(rep, 'KGS', columnOrder, selectedDivision),
            getProductGroupsForSalesRep(rep, 'Amount', columnOrder, selectedDivision),
            getProductGroupsForSalesRep(rep, 'MoRM', columnOrder, selectedDivision)
          ]);

          const { customers, dashboardData } = await fetchCustomerDashboardData(rep, preparePeriods(columnOrder), selectedDivision);
          const extendedColumns = buildExtendedColumns(columnOrder);
          
          const { customers: processedResult } = await applySavedMergeRules(rep, selectedDivision, customers, dashboardData, extendedColumns);
          
          if (basePeriodIndex != null && basePeriodIndex >= 0) {
            processedResult.sort((a, b) => {
              const aValue = a.rawValues[basePeriodIndex] || 0;
              const bValue = b.rawValues[basePeriodIndex] || 0;
              return bValue - aValue;
            });
          }

          setKgsData(kgsResult);
          setAmountData(amountResult);
          setMormData(mormResult);
          setCustomerData(processedResult);
          
          console.log(`⚠️ Used fallback individual API calls for ${rep}`);
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          setError('Failed to load data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, [rep, columnOrder, basePeriodIndex, selectedDivision, hideBudgetForecast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle customer selection
  const handleCustomerSelect = (customerName) => {
    console.log('🔘 Customer selected:', customerName);
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerName)) {
        newSet.delete(customerName);
        console.log('➖ Removed from selection:', customerName);
      } else {
        newSet.add(customerName);
        console.log('➕ Added to selection:', customerName);
      }
      console.log('📋 Current selection:', Array.from(newSet));
      return newSet;
    });
  };

  // Handle editing an existing group
  const handleEditGroup = (group) => {
    console.log('✏️ Editing group:', group);
    setEditingGroup(group);
    setSelectedCustomers(new Set());
    setCustomersToRemove(new Set());
    setNewGroupName('');
    // Edit mode activated silently - no intrusive notifications
  };

  // Handle removing a customer from the group
  const handleRemoveCustomer = (customerName) => {
    console.log('🗑️ Removing customer from group:', customerName);
    setCustomersToRemove(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerName)) {
        newSet.delete(customerName);
        console.log('↩️ Undoing removal:', customerName);
      } else {
        newSet.add(customerName);
        console.log('✂️ Marked for removal:', customerName);
      }
      console.log('📋 Customers to remove:', Array.from(newSet));
      return newSet;
    });
  };

  // Handle saving edit (add/remove customers to/from existing group)
  const handleSaveEdit = async () => {
    if (!editingGroup) return;
    
    if (selectedCustomers.size === 0 && customersToRemove.size === 0) {
      console.log('No changes to save');
      return;
    }

    console.log('💾 Saving edits for group:', editingGroup.mergedName);
    console.log('👥 Adding customers:', Array.from(selectedCustomers));
    console.log('🗑️ Removing customers:', Array.from(customersToRemove));

    try {
      // Start with existing customers
      let updatedCustomers = [...editingGroup.originalCustomers];
      
      // Remove customers marked for removal
      updatedCustomers = updatedCustomers.filter(customer => !customersToRemove.has(customer));
      
      // Add new customers (avoid duplicates)
      const allCustomers = [...new Set([...updatedCustomers, ...Array.from(selectedCustomers)])];
      
      // Validate that we still have at least one customer
      if (allCustomers.length === 0) {
        console.log('Cannot remove all customers from a group');
        return;
      }
      
      // Check if there are any changes
      if (allCustomers.length === editingGroup.originalCustomers.length && 
          selectedCustomers.size === 0 && customersToRemove.size === 0) {
        console.log('No changes made to the group');
        return;
      }

      const mergeRule = {
        mergedName: editingGroup.mergedName,
        originalCustomers: allCustomers,
        isActive: true
      };

      console.log('📤 Sending updated merge rule:', mergeRule);

      const response = await fetch('http://localhost:3001/api/customer-merge-rules/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesRep: rep,
          division: selectedDivision,
          mergeRule
        }),
      });

      const result = await response.json();
      console.log('📥 Server response:', result);

      if (result.success) {
        // Reset editing state
        setEditingGroup(null);
        setSelectedCustomers(new Set());
        setCustomersToRemove(new Set());
        setNewGroupName('');
        
        console.log('🔄 Refreshing data to show updated group...');
        // Refresh data to show the updated group
        fetchData();
        
        const addedCount = selectedCustomers.size;
        const removedCount = customersToRemove.size;
        let message = `Group "${editingGroup.mergedName}" updated`;
        if (addedCount > 0 && removedCount > 0) {
          message += ` (+${addedCount}, -${removedCount})`;
        } else if (addedCount > 0) {
          message += ` (+${addedCount})`;
        } else if (removedCount > 0) {
          message += ` (-${removedCount})`;
        }
        showFeedback(message, 'success');
        console.log(`✅ ${message}`);
      } else {
        console.error(`❌ Failed to update group: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingGroup(null);
    setSelectedCustomers(new Set());
    setCustomersToRemove(new Set());
    setNewGroupName('');
  };

  // Handle creating a new group
  const handleCreateGroup = async () => {
    if (selectedCustomers.size < 2) {
      console.log('Need at least 2 customers to create a group');
      return;
    }

    if (!newGroupName.trim()) {
      console.log('Group name is required');
      return;
    }

    console.log('🏗️ Creating group:', newGroupName.trim());
    console.log('👥 Selected customers:', Array.from(selectedCustomers));

    try {
      const mergeRule = {
        mergedName: newGroupName.trim(),
        originalCustomers: Array.from(selectedCustomers),
        isActive: true
      };

      console.log('📤 Sending merge rule:', mergeRule);

      const response = await fetch('http://localhost:3001/api/customer-merge-rules/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesRep: rep,
          division: selectedDivision,
          mergeRule
        }),
      });

      const result = await response.json();
      console.log('📥 Server response:', result);

      if (result.success) {
        // Reset selection and UI
        setSelectedCustomers(new Set());
        setNewGroupName('');
        
        console.log('🔄 Refreshing data to show new group...');
        // Refresh data to show the new group
        fetchData();
        
        showFeedback(`Group "${newGroupName.trim()}" created`, 'success');
        console.log('✅ Group created successfully!');
      } else {
        console.error(`❌ Failed to create group: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };
  
  // Create extended columns with delta columns, with optional Budget/Forecast filtering
  const createExtendedColumns = () => {
    // Filter columns based on user preferences
    const filteredColumns = columnOrder.filter(col => {
      if (hideBudgetForecast && (col.type === 'Budget' || col.type === 'Forecast')) return false;
      return true;
    });
    
  const extendedColumns = [];
    
    filteredColumns.forEach((col, index) => {
    extendedColumns.push({
      ...col,
      columnType: 'data',
      label: `${col.year}-${col.isCustomRange ? col.displayName : col.month}-${col.type}`
    });
    
      // Add delta column after each data column (except the last one)
      if (index < filteredColumns.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          label: 'Delta'
        });
      }
    });
    
    return extendedColumns;
  };

  const extendedColumns = createExtendedColumns();
  
  // Helper functions for styling and formatting
  const getColumnHeaderStyle = (col) => {
    if (col.columnType === 'delta') {
      return { backgroundColor: '#f5f5f5', color: '#666' };
    }
    
    // Map color names to CSS custom properties (same as ColumnConfigGrid)
    if (col.customColor) {
      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${col.customColor}-primary`).trim();
      const text = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${col.customColor}-text`).trim();
      
      if (primary && text) {
        return { 
          backgroundColor: primary,
          color: text
        };
      }
    }
    
    // Default to blue if no custom color
    return {
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-blue-primary').trim(),
      color: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-blue-text').trim()
    };
  };
  
  // Removed unused getCellStyle function

  // Check if a column is the base period
  const isBasePeriodColumn = (colIndex) => {
    if (basePeriodIndex === null || basePeriodIndex === undefined) return false;
    
    // Count data columns up to this index
    const dataColumnsBeforeThis = extendedColumns.slice(0, colIndex).filter(col => col.columnType === 'data').length;
    return dataColumnsBeforeThis === basePeriodIndex;
  };

  // Calculate totals for a specific column across all product groups or customers
  const calculateColumnTotal = (data, columnIndex, extendedCols) => {
    // Map columnIndex to rawValues index (skip delta columns)
    const dataColumnIndex = extendedCols.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
    
    const total = data.reduce((total, row) => {
      const arr = row.rawValues || row.values;
      if (!arr || dataColumnIndex >= arr.length) {
        return total;
      }
      const value = arr[dataColumnIndex];
      if (typeof value === 'number' && !isNaN(value)) {
        return total + value;
      }
      return total;
    }, 0);
    return total;
  };

  // Format number for display
  const formatValue = (value, variable) => {
    if (typeof value !== 'number') return value || '-';
    
    if (variable === 'Amount') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else if (variable === 'MoRM') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  };

  const formatTotalValue = (value, variable) => {
    if (variable === 'Amount') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else if (variable === 'MoRM') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  };

  // Calculate delta for total row
  const calculateTotalDelta = (data, fromIndex, toIndex, extendedCols) => {
    const fromTotal = calculateColumnTotal(data, fromIndex, extendedCols);
    const toTotal = calculateColumnTotal(data, toIndex, extendedCols);
    
    if (fromTotal === 0) return { arrow: '', value: '', color: 'black' };
    
    const delta = ((toTotal - fromTotal) / fromTotal) * 100;
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '';
    const color = delta > 0 ? '#288cfa' : delta < 0 ? '#dc3545' : 'black';
    
    // Format delta based on range: -99.99% to +99.9% should have decimals, outside should not
    const absDelta = Math.abs(delta);
    let formattedValue;
    
    if (absDelta >= 99.99) {
      // Outside range: no decimals
      formattedValue = Math.round(absDelta) + '%';
    } else {
      // Within range: with decimals
      formattedValue = absDelta.toFixed(1) + '%';
    }
    
    return { arrow, value: formattedValue, color };
  };
  
  // Helper function to filter out rows with all zero values
  const filterZeroRows = (data) => {
    return data.filter(row => {
      // Check if ANY data column (Actual OR Budget) has a positive value
      const hasPositiveValue = extendedColumns.some((col, colIndex) => {
        if (col.columnType === 'data') {
          const val = row.values[colIndex];
          
          if (typeof val === 'string') {
            // Handle string values - check if it's a positive number
            const numValue = parseFloat(val);
            return !isNaN(numValue) && numValue > 0;
          }
          if (typeof val === 'number') {
            // Handle numeric values - check if it's positive
            return !isNaN(val) && val > 0;
          }
        }
        return false;
      });
      return hasPositiveValue;
    });
  };
  

  
  const hiddenAmountColumnIndices = new Set(); // No columns hidden for now
  
  // Custom header rendering for tables
  const renderAmountHeaderWithBlanks = () => (
    <thead>
      {/* Star Indicator Row */}
      <tr>
        <th className="product-header star-cell"></th>
        <th className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></th>
        {extendedColumns.map((col, idx) => {
          if (hiddenAmountColumnIndices.has(idx)) {
            return <th key={`star-blank-${idx}`} className="star-cell"></th>;
          }
          if (col.columnType === 'delta') {
            return <th key={`star-delta-${idx}`} className="star-cell"></th>;
          }
          return (
            <th 
              key={`star-${idx}`} 
              className="star-cell"
              style={{ 
                color: isBasePeriodColumn(idx) ? '#FFD700' : 'transparent',
                fontSize: '32px'
              }}
            >
              {isBasePeriodColumn(idx) ? '★' : ''}
            </th>
          );
        })}
      </tr>
      <tr className="main-header-row">
        <th className="product-header" rowSpan={3}>Product Groups</th>
        <th className="spacer-col" rowSpan={3} style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></th>
        {extendedColumns.map((col, idx) => {
          if (hiddenAmountColumnIndices.has(idx)) {
            return <th key={`blank-${idx}`} className="amount-table-blank-cell"></th>;
          }
          if (col.columnType === 'delta') {
            return <th key={`delta-${idx}`} rowSpan={3} style={getColumnHeaderStyle({ columnType: 'delta' })} className="delta-header">Difference</th>;
          }
          return <th key={`year-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.year}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (hiddenAmountColumnIndices.has(idx)) return <th key={`blank2-${idx}`} className="amount-table-blank-cell"></th>;
          if (col.columnType === 'delta') return null;
          return <th key={`month-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.isCustomRange ? col.displayName : col.month}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (hiddenAmountColumnIndices.has(idx)) return <th key={`blank3-${idx}`} className="amount-table-blank-cell"></th>;
          if (col.columnType === 'delta') return null;
          return <th key={`type-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.type}</th>;
        })}
      </tr>
    </thead>
  );
  
  // Check loading state
  if (loading) {
    return (
      <div className="sales-rep-content">
        <div className="sales-rep-title">{rep}</div>
        <div className="table-empty-state">Loading data...</div>
      </div>
    );
  }

  // Check error state
  if (error) {
    return (
      <div className="sales-rep-content">
        <div className="sales-rep-title">{rep}</div>
        <div className="table-empty-state" style={{ color: '#d84315' }}>{error}</div>
      </div>
    );
  }

  // Check if columnOrder is available
  if (!columnOrder || columnOrder.length === 0) {
    return (
      <div className="sales-rep-content">
        <div className="sales-rep-title">{rep}</div>
        <div className="table-empty-state">Please select columns to view data.</div>
      </div>
    );
  }
  
  return (
    <div className="sales-rep-content">
      <div className="sales-rep-title">{rep}</div>
      
      {/* Subtle feedback notification */}
      {operationFeedback && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          backgroundColor: operationFeedback.type === 'success' ? '#d4edda' : '#f8d7da',
          color: operationFeedback.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${operationFeedback.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          {operationFeedback.type === 'success' ? '✅' : '❌'} {operationFeedback.message}
        </div>
      )}
      
      <div className="table-options">
        <label className="option-checkbox">
          <input 
            type="checkbox" 
            checked={hideBudgetForecast} 
            onChange={(e) => setHideBudgetForecast(e.target.checked)}
          />
          Hide Budget & Forecast
        </label>
        
        {/* Export Button */}
        <div style={{ marginLeft: '20px' }}>
          <SalesRepHTMLExport 
            rep={rep}
            reportType="tables"
            kgsData={kgsData}
            amountData={amountData}
            customerData={customerData}
            selectedDivision={selectedDivision}
            yearlyBudgetTotal={0}
            yearlySalesBudgetTotal={0}
            yearlyBudgetAchievement={0}
            yearlySalesBudgetAchievement={0}
            customerInsights={{
              topCustomerShare: 0,
              top3CustomerShare: 0,
              top5CustomerShare: 0,
              totalCustomers: 0,
              customerGrowth: 0,
              newCustomers: [],
              topCustomers: [],
              avgVolumePerCustomer: 0
            }}
          />
        </div>
      </div>
      <div className="sales-rep-subtitle">Product Groups - Sales Kgs Comparison</div>
      <table className="financial-table">
        {renderAmountHeaderWithBlanks()}
        <tbody>
          {filterZeroRows(kgsData).map(pg => (
            <tr key={pg.name} className="product-header-row">
              <td className="row-label product-header">{pg.name}</td>
              <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
              {extendedColumns.map((col, idx) => {
                if (hiddenAmountColumnIndices.has(idx)) return <td key={`blank-${idx}`} className="amount-table-blank-cell"></td>;
                const val = pg.values[idx];
                if (col.columnType === 'delta') {
                  if (typeof val === 'object' && val !== null) {
                    // New object format with color and arrow
                    return (
                      <td key={idx} className="metric-cell delta-cell" style={{ color: val.color }}>
                        <span className="delta-arrow">{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Legacy string format
                    let deltaClass = '';
                    if (val.includes('▲')) deltaClass = 'delta-up';
                    else if (val.includes('▼')) deltaClass = 'delta-down';
                    return <td key={idx} className={`metric-cell ${deltaClass}`}>{val}</td>;
                  }
                  return <td key={idx} className="metric-cell">{val || '-'}</td>;
                }
                return <td key={idx} className="metric-cell">{formatValue(val, 'KGS')}</td>;
              })}
            </tr>
          ))}
          {/* Total Row for KGS */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <td key={`total-blank-${idx}`} className="amount-table-blank-cell"></td>;
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(filterZeroRows(kgsData), fromIndex, toIndex, extendedColumns);
                  return (
                    <td key={`total-delta-${idx}`} className="metric-cell delta-cell" style={{ color: delta.color }}>
                      <span className="delta-arrow">{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(filterZeroRows(kgsData), idx, extendedColumns);
              return <td key={`total-${idx}`} className="metric-cell">{formatTotalValue(totalValue, 'KGS')}</td>;
            })}
          </tr>
        </tbody>
      </table>
      <div className="table-separator" />
      <div className="sales-rep-subtitle">Product Groups - <UAEDirhamSymbol /> Sales Amount Comparison</div>
      <table className="financial-table">
        {renderAmountHeaderWithBlanks()}
        <tbody>
          {filterZeroRows(amountData).map(pg => (
            <tr key={pg.name} className="product-header-row">
              <td className="row-label product-header">{pg.name}</td>
              <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
              {extendedColumns.map((col, idx) => {
                if (hiddenAmountColumnIndices.has(idx)) return <td key={`blank-${idx}`} className="amount-table-blank-cell"></td>;
                const val = pg.values[idx];
                if (col.columnType === 'delta') {
                  if (typeof val === 'object' && val !== null) {
                    // New object format with color and arrow
                    return (
                      <td key={idx} className="metric-cell delta-cell" style={{ color: val.color }}>
                        <span className="delta-arrow">{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Legacy string format
                    let deltaClass = '';
                    if (val.includes('▲')) deltaClass = 'delta-up';
                    else if (val.includes('▼')) deltaClass = 'delta-down';
                    return <td key={idx} className={`metric-cell ${deltaClass}`}>{val}</td>;
                  }
                  return <td key={idx} className="metric-cell">{val || '-'}</td>;
                }
                return <td key={idx} className="metric-cell">{formatValue(val, 'Amount')}</td>;
              })}
            </tr>
          ))}
          {/* Total Row for Amount */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <td key={`total-blank-${idx}`} className="amount-table-blank-cell"></td>;
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(filterZeroRows(amountData), fromIndex, toIndex, extendedColumns);
                  return (
                    <td key={`total-delta-${idx}`} className="metric-cell delta-cell" style={{ color: delta.color }}>
                      <span className="delta-arrow">{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(filterZeroRows(amountData), idx, extendedColumns);
              return <td key={`total-${idx}`} className="metric-cell">{formatTotalValue(totalValue, 'Amount')}</td>;
            })}
          </tr>
        </tbody>
      </table>
      <div className="table-separator" />
      <div className="sales-rep-subtitle">Product Groups - <UAEDirhamSymbol /> Margin over RM Comparison</div>
      <table className="financial-table">
        {renderAmountHeaderWithBlanks()}
        <tbody>
          {filterZeroRows(mormData).map(pg => (
            <tr key={pg.name} className="product-header-row">
              <td className="row-label product-header">{pg.name}</td>
              <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
              {extendedColumns.map((col, idx) => {
                if (hiddenAmountColumnIndices.has(idx)) return <td key={`blank-${idx}`} className="amount-table-blank-cell"></td>;
                const val = pg.values[idx];
                if (col.columnType === 'delta') {
                  if (typeof val === 'object' && val !== null) {
                    // New object format with color and arrow
                    return (
                      <td key={idx} className="metric-cell delta-cell" style={{ color: val.color }}>
                        <span className="delta-arrow">{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Legacy string format
                    let deltaClass = '';
                    if (val.includes('▲')) deltaClass = 'delta-up';
                    else if (val.includes('▼')) deltaClass = 'delta-down';
                    return <td key={idx} className={`metric-cell ${deltaClass}`}>{val}</td>;
                  }
                  return <td key={idx} className="metric-cell">{val || '-'}</td>;
                }
                return <td key={idx} className="metric-cell">{formatValue(val, 'MoRM')}</td>;
              })}
            </tr>
          ))}
          {/* Total Row for MoRM */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <td key={`total-blank-${idx}`} className="amount-table-blank-cell"></td>;
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(filterZeroRows(mormData), fromIndex, toIndex, extendedColumns);
                  return (
                    <td key={`total-delta-${idx}`} className="metric-cell delta-cell" style={{ color: delta.color }}>
                      <span className="delta-arrow">{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(filterZeroRows(mormData), idx, extendedColumns);
              return <td key={`total-${idx}`} className="metric-cell">{formatTotalValue(totalValue, 'MoRM')}</td>;
            })}
          </tr>
        </tbody>
      </table>
      <div className="table-separator" />
      <div className="sales-rep-subtitle">Customers - Sales Kgs Comparison</div>
      <table className="financial-table">
        <thead>
          {/* Star Indicator Row */}
          <tr>
            <th className="product-header star-cell"></th>
            <th className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></th>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) {
                return <th key={`star-blank-${idx}`} className="star-cell"></th>;
              }
              if (col.columnType === 'delta') {
                return <th key={`star-delta-${idx}`} className="star-cell"></th>;
              }
              return (
                <th 
                  key={`star-${idx}`} 
                  className="star-cell"
                  style={{ 
                    textAlign: 'center', 
                    padding: '4px',
                    fontSize: '32px',
                    color: isBasePeriodColumn(idx) ? '#FFD700' : 'transparent'
                  }}
                >
                  {isBasePeriodColumn(idx) ? '★' : ''}
                </th>
              );
            })}
          </tr>
          <tr className="main-header-row">
            <th className="product-header" rowSpan={3}>Customers</th>
            <th className="spacer-col" rowSpan={3} style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></th>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) {
                return <th key={`blank-${idx}`} className="amount-table-blank-cell"></th>;
              }
              if (col.columnType === 'delta') {
                return <th key={`delta-${idx}`} rowSpan={3} style={getColumnHeaderStyle({ columnType: 'delta' })} className="delta-header">Difference</th>;
              }
              return <th key={`year-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.year}</th>;
            })}
          </tr>
          <tr className="main-header-row">
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <th key={`blank2-${idx}`} className="amount-table-blank-cell"></th>;
              if (col.columnType === 'delta') return null;
              return <th key={`month-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.isCustomRange ? col.displayName : col.month}</th>;
            })}
          </tr>
          <tr className="main-header-row">
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <th key={`blank3-${idx}`} className="amount-table-blank-cell"></th>;
              if (col.columnType === 'delta') return null;
              return <th key={`type-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.type}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {filterZeroRows(customerData).map(customer => (
            <tr key={customer.name} className="product-header-row">
              <td className="row-label product-header" style={{ position: 'relative', paddingLeft: '30px' }}>
                <input
                  type="checkbox"
                  checked={selectedCustomers.has(customer.originalName || customer.name)}
                  onChange={() => handleCustomerSelect(customer.originalName || customer.name)}
                  disabled={customer.name.includes('*') && !editingGroup} // Enable selection for merged customers when editing
                  style={{ 
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    margin: 0,
                    width: '16px',
                    height: '16px'
                  }}
                />
                {customer.name}
              </td>
              <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
              {extendedColumns.map((col, idx) => {
                if (hiddenAmountColumnIndices.has(idx)) return <td key={`blank-${idx}`} className="amount-table-blank-cell"></td>;
                const val = customer.values[idx];
                if (col.columnType === 'delta') {
                  if (typeof val === 'object' && val !== null) {
                    // New object format with color and arrow
                    return (
                      <td key={idx} className="metric-cell delta-cell" style={{ color: val.color }}>
                        <span className="delta-arrow">{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Legacy string format
                    let deltaClass = '';
                    if (val.includes('▲')) deltaClass = 'delta-up';
                    else if (val.includes('▼')) deltaClass = 'delta-down';
                    return <td key={idx} className={`metric-cell ${deltaClass}`}>{val}</td>;
                  }
                  return <td key={idx} className="metric-cell">{val || '-'}</td>;
                }
                return <td key={idx} className="metric-cell">{formatValue(val, 'KGS')}</td>;
              })}
            </tr>
          ))}
          {/* Total Row for Customers */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            <td className="spacer-col" style={{ width: '10px', minWidth: '10px', maxWidth: '10px', background: 'transparent', border: 'none', padding: 0 }}></td>
            {extendedColumns.map((col, idx) => {
              if (hiddenAmountColumnIndices.has(idx)) return <td key={`total-blank-${idx}`} className="amount-table-blank-cell"></td>;
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(filterZeroRows(customerData), fromIndex, toIndex, extendedColumns);
                  return (
                    <td key={`total-delta-${idx}`} className="metric-cell delta-cell" style={{ color: delta.color }}>
                      <span className="delta-arrow">{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(filterZeroRows(customerData), idx, extendedColumns);
              return <td key={`total-${idx}`} className="metric-cell">{formatTotalValue(totalValue, 'KGS')}</td>;
            })}
          </tr>
        </tbody>
      </table>
      
      {/* Customer Grouping UI */}
      {(selectedCustomers.size > 0 || editingGroup) && (
        <div style={{
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd',
          border: '2px solid #2196f3',
          borderRadius: '5px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            {editingGroup 
              ? `✏️ Editing Group: ${editingGroup.mergedName}` 
              : `👥 Group Selected Customers (${selectedCustomers.size})`}
          </h4>
          {editingGroup ? (
            <div>
              <div style={{ margin: '0 0 10px 0' }}>
                <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>
                  Current customers in group (click X to remove):
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {editingGroup.originalCustomers.map(customer => (
                    <div key={customer} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                      backgroundColor: customersToRemove.has(customer) ? '#ffebee' : '#e8f5e8',
                      border: `1px solid ${customersToRemove.has(customer) ? '#f44336' : '#4caf50'}`,
                borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <span style={{ 
                        textDecoration: customersToRemove.has(customer) ? 'line-through' : 'none',
                        color: customersToRemove.has(customer) ? '#666' : '#000'
                      }}>
                        {customer}
                    </span>
                      <button
                        onClick={() => handleRemoveCustomer(customer)}
                        style={{
                          marginLeft: '6px',
                          padding: '2px 4px',
                          backgroundColor: customersToRemove.has(customer) ? '#4caf50' : '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                        title={customersToRemove.has(customer) ? 'Undo removal' : 'Remove from group'}
                      >
                        {customersToRemove.has(customer) ? '↩' : '✕'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ margin: '0 0 10px 0', color: '#1976d2', fontSize: '14px', fontWeight: 'bold' }}>
                Selected customers to add: {selectedCustomers.size > 0 ? Array.from(selectedCustomers).join(', ') : 'None'}
              </p>
              {customersToRemove.size > 0 && (
                <p style={{ margin: '0 0 10px 0', color: '#d32f2f', fontSize: '14px', fontWeight: 'bold' }}>
                  Customers to remove: {Array.from(customersToRemove).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '14px' }}>
              Selected customers: {Array.from(selectedCustomers).join(', ')}
            </p>
          )}
          
          {editingGroup ? (
            /* Edit Mode - Simple interface */
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleSaveEdit}
                disabled={selectedCustomers.size === 0 && customersToRemove.size === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: (selectedCustomers.size === 0 && customersToRemove.size === 0) ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (selectedCustomers.size === 0 && customersToRemove.size === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                💾 Save Changes
                {(selectedCustomers.size > 0 || customersToRemove.size > 0) && (
                  <span style={{ marginLeft: '4px' }}>
                    ({selectedCustomers.size > 0 && `+${selectedCustomers.size}`}
                    {selectedCustomers.size > 0 && customersToRemove.size > 0 && ', '}
                    {customersToRemove.size > 0 && `-${customersToRemove.size}`})
                  </span>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ❌ Cancel Edit
              </button>
            </div>
          ) : (
            /* Create Mode - Full interface */
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#495057' }}>
                Choose Group Name:
              </label>
              
              {/* Option 1: Select existing customer name */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>
                  🔘 Use existing customer name:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Array.from(selectedCustomers).map(customer => (
                    <button
                      key={customer}
                      onClick={() => setNewGroupName(customer)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: newGroupName === customer ? '#007bff' : '#f8f9fa',
                        color: newGroupName === customer ? 'white' : '#495057',
                        border: `1px solid ${newGroupName === customer ? '#007bff' : '#dee2e6'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {customer}
                    </button>
                    ))}
                  </div>
                </div>
              
              {/* Option 2: Custom name */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>
                  ✏️ Or enter custom name:
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter custom group name..."
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%',
                    maxWidth: '400px'
                  }}
                />
              </div>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={handleCreateGroup}
                  disabled={selectedCustomers.size < 2 || !newGroupName.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedCustomers.size < 2 || !newGroupName.trim() ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedCustomers.size < 2 || !newGroupName.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✅ Create Group ({selectedCustomers.size} customers)
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomers(new Set());
                    setNewGroupName('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Cancel
                </button>
          </div>
        </div>
      )}
        </div>
      )}
      
      {/* Display saved merged groups */}
      <MergedGroupsDisplay 
        salesRep={rep} 
        division={selectedDivision} 
        onGroupDeleted={() => fetchData()} 
        onGroupEdit={handleEditGroup}
      />
      
    </div>
  );
};

// Component to display the actual sales rep report
const SalesRepReportContent = ({ rep }) => {
  const { selectedDivision } = useExcelData();
  
  return (
    <SalesRepReport 
      rep={rep}
      selectedDivision={selectedDivision}
      toProperCase={toProperCase}
      getProductGroupsForSalesRep={getProductGroupsForSalesRep}
      fetchCustomerDashboardData={fetchCustomerDashboardData}
      preparePeriods={preparePeriods}
      buildExtendedColumns={buildExtendedColumns}
      processCustomerData={processCustomerData}
      applySavedMergeRules={applySavedMergeRules}
    />
  );
};

export { getProductGroupsForSalesRep };
export default SalesBySaleRepTable;