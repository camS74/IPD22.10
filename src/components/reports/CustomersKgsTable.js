import React, { useState, useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import './ProductGroupsKgsTable.css'; // Reusing the same CSS styles

const CustomersKgsTable = ({ kgsData, rep }) => {
  const { columnOrder, basePeriodIndex, customerMergeConfig } = useFilter();
  const [customerData, setCustomerData] = useState({});
  const [loading, setLoading] = useState(false);
  const [transformedData, setTransformedData] = useState([]);
  const [isTransforming, setIsTransforming] = useState(false);

  // Merge customers based on configuration
  const mergeCustomers = (customers) => {
    if (!customerMergeConfig || customerMergeConfig.length === 0) {
      return customers;
    }

    const mergedCustomers = new Map();
    const processedCustomers = new Set();

    // First, process merge configurations
    customerMergeConfig.forEach(config => {
      const { mergedName, customers: customersToMerge } = config;
      const mergedCustomer = {
        name: mergedName,
        rawValues: new Array(columnOrder.length).fill(0),
        values: new Array(extendedColumns.length).fill(0)
      };

      // Sum up values from all customers in this merge group
      customersToMerge.forEach(customerName => {
        const customer = customers.find(c => c.name === customerName);
        if (customer) {
          processedCustomers.add(customerName);
          customer.rawValues.forEach((value, index) => {
            if (typeof value === 'number' && !isNaN(value)) {
              mergedCustomer.rawValues[index] += value;
            }
          });
        }
      });

      mergedCustomers.set(mergedName, mergedCustomer);
    });

    // Add remaining customers that weren't merged
    customers.forEach(customer => {
      if (!processedCustomers.has(customer.name)) {
        mergedCustomers.set(customer.name, customer);
      }
    });

    return Array.from(mergedCustomers.values());
  };

  // Helper function to format names to proper case (Xxxx Xxxx)
  const toProperCase = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
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

  // Load and apply saved merge rules from database
  const applySavedMergeRules = async (salesRep, division, customers, extendedColumns) => {
    try {
      const response = await fetch(`http://localhost:3001/api/customer-merge-rules/get?salesRep=${encodeURIComponent(salesRep)}&division=${encodeURIComponent(division)}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        console.log(`✅ Found ${result.data.length} saved merge rules for ${salesRep}`);
        console.log('📋 Available customers:', customers.map(c => c.name));
        console.log('📋 Saved merge rules:', result.data);
    
        const processedCustomers = [];
        const mergedGroups = [];
        const processed = new Set();
        
        // Apply saved merge rules
        result.data.forEach((rule) => {
          const originalCustomers = rule.originalCustomers;
          
          // Check if all customers in the rule still exist (case-insensitive comparison)
          const existingCustomers = [];
          const existingCustomerObjects = [];
          
          originalCustomers.forEach(customerName => {
            // Find matching customer object (case-insensitive)
            const matchingCustomer = customers.find(c => 
              c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
            );
            if (matchingCustomer) {
              existingCustomers.push(matchingCustomer.name); // Use the actual customer name from data
              existingCustomerObjects.push(matchingCustomer);
            }
          });
          
          const missingCustomers = originalCustomers.filter(customerName => {
            return !customers.some(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim());
          });
          
          console.log(`🔍 Processing rule "${rule.mergedName}":`, {
            originalCustomers,
            existingCustomers,
            found: existingCustomers.length,
            missingCustomers,
            allCustomers: customers.map(c => c.name)
          });
          
          if (existingCustomers.length > 1) {
            // Multiple customers exist, apply the merge
            existingCustomers.forEach(customerName => {
              processed.add(customerName); // Use exact customer name from data
              console.log(`✅ Marking as processed: "${customerName}"`);
            });
            
            mergedGroups.push(existingCustomers);
            const mergedCustomer = processMergedCustomerGroup(existingCustomers, extendedColumns, customers, rule.mergedName);
            processedCustomers.push(mergedCustomer);
            console.log(`🔀 Created merged customer: "${mergedCustomer.name}"`);
          } else if (existingCustomers.length === 1) {
            // Only one customer exists, but use the merged name if specified
            const customerName = existingCustomers[0];
            processed.add(customerName);
            console.log(`✅ Marking single customer as processed: "${customerName}"`);
            
            const singleCustomer = existingCustomerObjects[0];
            if (singleCustomer) {
              // Create a copy to avoid mutating the original
              const processedSingleCustomer = { ...singleCustomer };
              if (rule.mergedName) {
                processedSingleCustomer.name = toProperCase(rule.mergedName) + '*';
                processedSingleCustomer.originalName = rule.mergedName;
              }
              processedCustomers.push(processedSingleCustomer);
              console.log(`⚠️ Only one customer found for merge rule "${rule.mergedName}", using merged name`);
            }
          }
        });
        
        // Add remaining unprocessed customers as single customers
        customers.forEach(customer => {
          if (!processed.has(customer.name)) {
            console.log(`➕ Adding unprocessed customer: "${customer.name}"`);
            // Create a copy to avoid mutating the original
            processedCustomers.push({ ...customer });
          } else {
            console.log(`✅ Customer already processed: "${customer.name}"`);
          }
        });
        
        console.log(`📊 Final processed customers count: ${processedCustomers.length}`);
        console.log(`📊 Final processed customer names:`, processedCustomers.map(c => c.name));
    
        return {
          customers: processedCustomers,
          mergedGroups: mergedGroups
        };
      }
      
      // No saved rules found, return all customers as individual entries
      console.log(`ℹ️ No saved merge rules found for ${salesRep}, showing all customers individually`);
      
      return {
        customers: customers,
        mergedGroups: []
      };
      
    } catch (error) {
      console.error('Error loading saved merge rules:', error);
      console.log('Showing all customers individually due to error');
      
      return {
        customers: customers,
        mergedGroups: []
      };
    }
  };

  // Process a group of merged customers
  const processMergedCustomerGroup = (customerGroup, extendedColumns, allCustomers, customMergedName = null) => {
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
          const customer = allCustomers.find(c => c.name === customerName);
          if (customer && customer.rawValues && customer.rawValues[col.dataIndex] !== undefined) {
            const value = customer.rawValues[col.dataIndex];
            if (typeof value === 'number') {
              aggregatedValue += value;
            }
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

  // Build extended columns structure (similar to SalesBySaleRepTable)
  const buildExtendedColumns = (columnOrder) => {
    if (!columnOrder || columnOrder.length === 0) return [];
    
    const extendedColumns = [];
    
    for (let i = 0; i < columnOrder.length; i++) {
      const col = columnOrder[i];
      extendedColumns.push({
        ...col,
        columnType: 'data',
        dataIndex: i  // Add dataIndex to map to rawValues array
      });
      
      // Add delta column between consecutive data columns
      if (i < columnOrder.length - 1) {
        extendedColumns.push({
          columnType: 'delta',
          fromDataIndex: i,
          toDataIndex: i + 1
        });
      }
    }
    
    return extendedColumns;
  };

  const extendedColumns = buildExtendedColumns(columnOrder);

  // Check if a column is the base period column
  const isBasePeriodColumn = (columnIndex) => {
    if (basePeriodIndex === null) return false;
    const dataColumnIndex = extendedColumns.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
    return dataColumnIndex === basePeriodIndex;
  };

  // Filter out rows with all zero values
  const filterZeroRows = (data) => {
    return data.filter(row => {
      const hasPositiveValue = extendedColumns.some((col, colIndex) => {
        if (col.columnType === 'data') {
          const val = row.values[colIndex];
          
          if (typeof val === 'string') {
            const numValue = parseFloat(val);
            return !isNaN(numValue) && numValue > 0;
          }
          if (typeof val === 'number') {
            return !isNaN(val) && val > 0;
          }
        }
        return false;
      });
      return hasPositiveValue;
    });
  };

  // Sort customers by base period values (highest to lowest) - moved before early returns
  const sortedData = React.useMemo(() => {
    if (!transformedData || transformedData.length === 0) return [];
    
    const filteredData = filterZeroRows(transformedData);
    if (!filteredData || filteredData.length === 0) return [];
    
    // Debug logging
    console.log('🔍 CustomersKgsTable Sorting Debug:');
    console.log('- basePeriodIndex:', basePeriodIndex);
    console.log('- transformedData length:', transformedData.length);
    console.log('- filteredData length:', filteredData.length);
    
    // Check for duplicates
    const customerNames = filteredData.map(c => c.name);
    const uniqueNames = [...new Set(customerNames)];
    if (customerNames.length !== uniqueNames.length) {
      console.warn('⚠️ DUPLICATES DETECTED:');
      const duplicates = customerNames.filter((name, index) => customerNames.indexOf(name) !== index);
      console.warn('Duplicate customers:', duplicates);
    }
    
    // Get filtered data columns (excluding delta columns)
    const dataColumnsOnly = extendedColumns.filter(c => c.columnType === 'data');
    
    // Determine the effective base period index
    let effectiveBasePeriodIndex = basePeriodIndex;
    
    // If base period index is invalid or out of range, use the first available period
    if (effectiveBasePeriodIndex === null || effectiveBasePeriodIndex < 0 || effectiveBasePeriodIndex >= dataColumnsOnly.length) {
      effectiveBasePeriodIndex = 0; // Default to first period
    }
    
    console.log('- effectiveBasePeriodIndex:', effectiveBasePeriodIndex);
    console.log('- dataColumnsOnly length:', dataColumnsOnly.length);
    
    // Ensure we have at least one data column to sort by
    if (dataColumnsOnly.length === 0) {
      return filteredData;
    }
    
    // Find the column index in extendedColumns that corresponds to the base period
    const baseDataColumn = dataColumnsOnly[effectiveBasePeriodIndex];
    const baseColumnIndex = extendedColumns.findIndex(col => 
      col.columnType === 'data' && 
      col.year === baseDataColumn.year && 
      col.month === baseDataColumn.month && 
      col.type === baseDataColumn.type
    );
    
    console.log('- baseDataColumn:', baseDataColumn);
    console.log('- baseColumnIndex:', baseColumnIndex);
    
    if (baseColumnIndex === -1) {
      return filteredData; // If base column not found, return unsorted
    }
    
    // Sort customers by base period value (descending - highest to lowest)
    const sorted = [...filteredData].sort((a, b) => {
      // The basePeriodIndex refers to data columns only, but rawValues uses the original columnOrder indexing
      // We need to map the basePeriodIndex to the correct rawValues index
      const baseDataColumn = dataColumnsOnly[effectiveBasePeriodIndex];
      const rawValuesIndex = columnOrder.findIndex(col => 
        col.year === baseDataColumn.year && 
        col.month === baseDataColumn.month && 
        col.type === baseDataColumn.type
      );
      
      const aValue = a.rawValues[rawValuesIndex] || 0;
      const bValue = b.rawValues[rawValuesIndex] || 0;
      
      console.log(`Comparing ${a.name} (rawValues[${rawValuesIndex}] = ${aValue}) vs ${b.name} (rawValues[${rawValuesIndex}] = ${bValue})`);
      
      return bValue - aValue; // Sort descending (highest values first)
    });
    
    console.log('✅ Sorted customers:', sorted.map(c => {
      const baseDataColumn = dataColumnsOnly[effectiveBasePeriodIndex];
      const rawValuesIndex = columnOrder.findIndex(col => 
        col.year === baseDataColumn.year && 
        col.month === baseDataColumn.month && 
        col.type === baseDataColumn.type
      );
      return `${c.name}: ${c.rawValues[rawValuesIndex] || 0}`;
    }));
    
    return sorted;
  }, [transformedData, extendedColumns, basePeriodIndex]);

  // Get column header style - REMOVED ALL BACKGROUND COLORS
  const getColumnHeaderStyle = (col) => {
    if (col.type === 'Budget') {
      return { color: '#333' };
    } else if (col.type === 'Forecast') {
      return { color: '#f57c00' };
    } else {
      return { color: '#333' };
    }
  };

  // Enhanced format number for display with better visual presentation
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

  // Format value for total row (whole numbers without decimals)
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

  // Calculate column total
  const calculateColumnTotal = (data, columnIndex) => {
    // Map columnIndex to rawValues index (skip delta columns)
    const dataColumnIndex = extendedColumns.slice(0, columnIndex).filter(col => col.columnType === 'data').length;
    
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

  // Enhanced calculate delta for total row with better formatting
  const calculateTotalDelta = (data, fromIndex, toIndex) => {
    const fromTotal = calculateColumnTotal(data, fromIndex);
    const toTotal = calculateColumnTotal(data, toIndex);
    
    if (fromTotal === 0) return { arrow: '➖', value: '➖', color: '#6b7280' };
    
    const delta = ((toTotal - fromTotal) / fromTotal) * 100;
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '➖';
    const color = delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#6b7280';
    
    // Enhanced delta formatting
    const absDelta = Math.abs(delta);
    let formattedValue;
    
    if (absDelta >= 999.9) {
      formattedValue = '999+%';
    } else if (absDelta >= 99.99) {
      formattedValue = Math.round(absDelta) + '%';
    } else if (absDelta >= 10) {
      formattedValue = absDelta.toFixed(1) + '%';
    } else {
      formattedValue = absDelta.toFixed(2) + '%';
    }
    
    return { arrow, value: formattedValue, color };
  };

  // Fetch customer sales data from database API
  const fetchCustomerSalesData = async (column) => {
    if (!rep || !column) return;
    
    setLoading(true);
    
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
          dataType: column.type || 'Actual',
          valueType: 'KGS' // Request KGS data for volume table
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
    } finally {
      setLoading(false);
    }
  };

  // Load customer sales data when columns change
  useEffect(() => {
    if (rep && columnOrder.length > 0) {
      columnOrder.forEach(column => {
        fetchCustomerSalesData(column);
      });
    }
  }, [rep, columnOrder]);



  // Transform data when customer data changes
  useEffect(() => {
    const transformData = async () => {
      if (!customerData || customerData.length === 0 || !columnOrder || columnOrder.length === 0) {
        setTransformedData([]);
        return;
      }
      
      setIsTransforming(true);
      try {
        const result = await transformToCustomerData();
        setTransformedData(result);
        
        // Dispatch event to notify CustomerKeyFactsNew that data is ready
        window.dispatchEvent(new CustomEvent('customersKgsTable:dataReady', {
          detail: {
            rows: result,
            columnOrder: columnOrder,
            rep: rep
          }
        }));
      } catch (error) {
        console.error('Error transforming customer data:', error);
        setTransformedData([]);
      } finally {
        setIsTransforming(false);
      }
    };

    transformData();
  }, [customerData, rep, columnOrder]);

  // Transform real customer data to display format with customer merging
  const transformToCustomerData = async () => {
    if (!columnOrder || columnOrder.length === 0) return [];
    
    console.log('🔄 transformToCustomerData called with:');
    console.log('- columnOrder:', columnOrder);
    console.log('- customerData keys:', Object.keys(customerData || {}));
    
    // Create a map to aggregate data by customer across all periods
    const customerMap = new Map();
    
    // Process each column's customer data
    columnOrder.forEach((column, columnIndex) => {
      const columnKey = column.id || `${column.year}-${column.month}-${column.type}`;
      const columnData = customerData[columnKey] || [];
      
      console.log(`Processing column ${columnIndex}: ${columnKey}, data length: ${columnData.length}`);
      
      columnData.forEach(customerRecord => {
        const customerName = customerRecord.customer;
        const value = parseFloat(customerRecord.value) || 0;
        
        if (!customerMap.has(customerName)) {
          customerMap.set(customerName, {
            name: customerName,
            rawValues: new Array(columnOrder.length).fill(0),
            values: new Array(extendedColumns.length).fill(0)
          });
        }
        
        const customer = customerMap.get(customerName);
        customer.rawValues[columnIndex] = value;
      });
    });
    
    console.log('📊 Customer map created with', customerMap.size, 'customers');
    console.log('Customer names:', Array.from(customerMap.keys()));
    
    // Build the values array for display (including deltas)
    Array.from(customerMap.values()).forEach(customer => {
      extendedColumns.forEach((col, colIndex) => {
        if (col.columnType === 'data') {
          // For data columns, use the rawValues
          const rawIndex = col.dataIndex;
          if (rawIndex < customer.rawValues.length) {
            customer.values[colIndex] = customer.rawValues[rawIndex];
          }
        } else if (col.columnType === 'delta') {
          // For delta columns, calculate the delta between consecutive data columns
          const fromDataIndex = col.fromDataIndex;
          const toDataIndex = col.toDataIndex;
          
          if (fromDataIndex < customer.rawValues.length && toDataIndex < customer.rawValues.length) {
            const fromValue = customer.rawValues[fromDataIndex] || 0;
            const toValue = customer.rawValues[toDataIndex] || 0;
            
            if (fromValue === 0) {
              customer.values[colIndex] = { arrow: '➖', value: '➖', color: '#6b7280' };
            } else {
              const delta = ((toValue - fromValue) / fromValue) * 100;
              const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '➖';
              const color = delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#6b7280';
              
              const absDelta = Math.abs(delta);
              let formattedValue;
              
              if (absDelta >= 999.9) {
                formattedValue = '999+%';
              } else if (absDelta >= 99.99) {
                formattedValue = Math.round(absDelta) + '%';
              } else if (absDelta >= 10) {
                formattedValue = absDelta.toFixed(1) + '%';
              } else {
                formattedValue = absDelta.toFixed(2) + '%';
              }
              
              customer.values[colIndex] = { arrow, value: formattedValue, color };
            }
          }
        }
      });
    });
    
    // Get all customers before merging
    const allCustomers = Array.from(customerMap.values());
    
    console.log('👥 All customers before merging:', allCustomers.length);
    console.log('Customer details:', allCustomers.map(c => ({ name: c.name, rawValues: c.rawValues })));
    
    // Apply customer merging if rep is available
    if (rep) {
      try {
        const { customers: mergedCustomers } = await applySavedMergeRules(rep, 'FP', allCustomers, extendedColumns);
        console.log('🔀 After merge rules applied:', mergedCustomers.length);
        console.log('Merged customer names:', mergedCustomers.map(c => c.name));
        return mergedCustomers;
      } catch (error) {
        console.error('Error applying merge rules:', error);
        return allCustomers;
      }
    }
    
    console.log('📝 No rep provided, returning all customers as-is');
    return allCustomers;
  };

  // Generate customers for a product group (demo data) - REMOVED
  // const generateCustomersForProductGroup = (productGroupName) => {
  //   // This function has been removed and replaced with real customer data fetching
  // };

  // Transform product group data to customer-based data - REPLACED
  // const transformToCustomerData = (productGroupData) => {
  //   // This function has been replaced with real customer data transformation
  // };

  // Filter out rows with all zero values - REMOVED DUPLICATE

  // Render table header
  const renderTableHeader = () => (
    <thead>
      <tr className="main-header-row">
        <th className="product-header" rowSpan={3}>Customers</th>
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') {
            return <th key={`delta-${idx}`} rowSpan={3} style={getColumnHeaderStyle({ columnType: 'delta' })} className="delta-header">YoY<br />%</th>;
          }
          return <th key={`year-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.year}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') return null;
          return <th key={`month-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.isCustomRange ? col.displayName : col.month}</th>;
        })}
      </tr>
      <tr className="main-header-row">
        {extendedColumns.map((col, idx) => {
          if (col.columnType === 'delta') return null;
          return <th key={`type-${idx}`} style={getColumnHeaderStyle(col)} className="period-header">{col.type}</th>;
        })}
      </tr>
    </thead>
  );

  if (!kgsData || kgsData.length === 0) {
    return (
      <div className="product-groups-kgs-table">
        <h3>Customers - Sales MT Comparison</h3>
        <div className="no-data">No data available for {rep}</div>
      </div>
    );
  }

  if (!columnOrder || columnOrder.length === 0) {
    return (
      <div className="product-groups-kgs-table">
        <h3>Customers - Sales MT Comparison</h3>
        <div className="no-data">Please select columns to view data.</div>
      </div>
    );
  }

  if (isTransforming) {
    return (
      <div className="product-groups-kgs-table">
        <h3>Customers - Sales MT Comparison</h3>
        <div className="no-data">Loading customer data...</div>
      </div>
    );
  }

  // Use transformed data instead of calling transformToCustomerData directly
  const customerTableData = transformedData;
  // filteredData is now handled by sortedData which includes filtering

  return (
    <div className="product-groups-kgs-table">
      <h3>Customers - Sales MT Comparison</h3>
      <table className="kgs-comparison-table">
        {renderTableHeader()}
        <tbody>
          {sortedData.map(customer => (
            <tr key={customer.name} className="product-row">
              <td className="row-label product-name">{toProperCase(customer.name)}</td>
              {extendedColumns.map((col, idx) => {
                if (col.columnType === 'delta') {
                  const val = customer.values[idx];
                  if (typeof val === 'object' && val !== null) {
                    // Enhanced object format with better styling
                    const deltaClass = val.arrow === '▲' ? 'delta-up' : val.arrow === '▼' ? 'delta-down' : '';
                    return (
                      <td key={idx} className={`metric-cell delta-cell ${deltaClass}`} style={{ color: val.color }}>
                        <span className="delta-arrow" style={{ fontSize: '12px' }}>{val.arrow}</span>
                        <span className="delta-value">{val.value}</span>
                      </td>
                    );
                  } else if (typeof val === 'string') {
                    // Enhanced legacy string format with emoji support
                    let deltaClass = '';
                    let displayVal = val;
                    if (val.includes('▲') || val.includes('📈')) {
                      deltaClass = 'delta-up';
                      displayVal = val.replace('📈', '▲');
                    } else if (val.includes('▼') || val.includes('📉')) {
                      deltaClass = 'delta-down';
                      displayVal = val.replace('📉', '▼');
                    }
                    return <td key={idx} className={`metric-cell delta-cell ${deltaClass}`}>{displayVal}</td>;
                  }
                  return <td key={idx} className="metric-cell delta-cell">➖</td>;
                }
                // For data columns, use rawValues to get the original KGS values
                const rawVal = customer.rawValues[col.dataIndex];
                return <td key={idx} className="metric-cell">{formatValue(rawVal)}</td>;
              })}
            </tr>
          ))}
          {/* Total Row */}
          <tr className="total-row">
            <td className="total-label">Total</td>
            {extendedColumns.map((col, idx) => {
              if (col.columnType === 'delta') {
                // Find the corresponding data columns for delta calculation
                const dataColumns = extendedColumns.filter(c => c.columnType === 'data');
                const deltaIndex = extendedColumns.slice(0, idx).filter(c => c.columnType === 'delta').length;
                if (deltaIndex < dataColumns.length - 1) {
                  const fromIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex]);
                  const toIndex = extendedColumns.findIndex(c => c === dataColumns[deltaIndex + 1]);
                  const delta = calculateTotalDelta(sortedData, fromIndex, toIndex);
                  const deltaClass = delta.arrow === '▲' ? 'delta-up' : delta.arrow === '▼' ? 'delta-down' : '';
                  return (
                    <td key={`total-delta-${idx}`} className={`metric-cell delta-cell ${deltaClass}`} style={{ color: delta.color }}>
                      <span className="delta-arrow" style={{ fontSize: '12px' }}>{delta.arrow}</span>
                      <span className="delta-value">{delta.value}</span>
                    </td>
                  );
                }
                return <td key={`total-delta-${idx}`} className="metric-cell">-</td>;
              }
              const totalValue = calculateColumnTotal(sortedData, idx);
              return <td key={`total-${idx}`} className="metric-cell total-value">{formatValueForTotal(totalValue)}</td>;
            })}
          </tr>
        </tbody>
      </table>

    </div>
  );
};

export default CustomersKgsTable;