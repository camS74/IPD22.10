import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useExcelData } from './ExcelDataContext';

const FilterContext = createContext();

export const useFilter = () => useContext(FilterContext);

export const FilterProvider = ({ children }) => {
  const { excelData, selectedDivision } = useExcelData();
  
  // Filter states
  const [availableFilters, setAvailableFilters] = useState({
    years: [],
    months: [],
    types: []
  });
  
  // Column order state - explicitly added by user
  const [columnOrder, setColumnOrder] = useState([]);
  
  // Chart visible columns - track which columns are visible in charts
  const [chartVisibleColumns, setChartVisibleColumns] = useState([]);
  
  // Base period index state
  const [basePeriodIndex, setBasePeriodIndex] = useState(null);
  
  // State to track if data has been generated
  const [dataGenerated, setDataGenerated] = useState(false);
  
  // Column selection state for styling/highlighting
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(null);
  
  // Full year and quarters mapping for aggregation
  const fullYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const quarters = {
    'Q1': ['January', 'February', 'March'],
    'Q2': ['April', 'May', 'June'],
    'Q3': ['July', 'August', 'September'],
    'Q4': ['October', 'November', 'December']
  };
  const halfYears = {
    'HY1': ['January', 'February', 'March', 'April', 'May', 'June'],
    'HY2': ['July', 'August', 'September', 'October', 'November', 'December']
  };
  
  // Helper function to check if months are sequential
  const areMonthsSequential = (months) => {
    if (months.length <= 1) return true;
    
    const monthIndices = months.map(month => fullYear.indexOf(month)).sort((a, b) => a - b);
    
    for (let i = 1; i < monthIndices.length; i++) {
      if (monthIndices[i] !== monthIndices[i - 1] + 1) {
        return false;
      }
    }
    return true;
  };

  // Helper function to format month range display
  const formatMonthRange = (months) => {
    if (months.length === 1) {
      return months[0];
    } else if (months.length > 1) {
      const firstMonth = months[0].substring(0, 3); // Jan, Feb, etc.
      const lastMonth = months[months.length - 1].substring(0, 3);
      return `${firstMonth}-${lastMonth}`;
    }
    return '';
  };

  // Function to create custom month range
  const createCustomRange = (year, selectedMonths, type) => {
    // Sort months by their order in the year
    const sortedMonths = selectedMonths.sort((a, b) => 
      fullYear.indexOf(a) - fullYear.indexOf(b)
    );

    // Validate sequential requirement
    if (!areMonthsSequential(sortedMonths)) {
      return { success: false, error: 'Selected months must be sequential (consecutive).' };
    }

    // Create display name and ID
    const displayName = formatMonthRange(sortedMonths);
    const rangeId = `CUSTOM_${sortedMonths.join('_')}`;
    
    const newColumn = {
      year,
      month: rangeId, // Use unique ID for custom ranges
      type,
      months: sortedMonths,
      displayName, // Add display name for UI
      isCustomRange: true,
      id: `${year}-${rangeId}-${type}`
    };

    return { success: true, column: newColumn };
  };
  
  // Extract filter options from the Excel data
  useEffect(() => {
    if (excelData && selectedDivision && excelData[selectedDivision]) {
      const sheet = excelData[selectedDivision];
      
      // Check if sheet has enough rows and columns
      if (sheet.length >= 3 && sheet[0].length > 1) {
        // Extract years from row 1 (index 0)
        const years = [...new Set(sheet[0].slice(1).filter(Boolean))];
        
        // Extract months from row 2 (index 1)
        const months = [...new Set(sheet[1].slice(1).filter(Boolean))];
        const extendedMonths = ["FY", "HY1", "HY2", "Q1", "Q2", "Q3", "Q4", ...months];
        
        // Extract data types from row 3 (index 2)
        const types = [...new Set(sheet[2].slice(1).filter(Boolean))];
        
        setAvailableFilters({ years, months: extendedMonths, types });
      }
    }
  }, [excelData, selectedDivision]);
  
  // Maximum number of columns allowed
  const MAX_COLUMNS = 5;
  
  // Helper function to find available color
  const findAvailableColor = (existingColumns) => {
    const colorSchemes = [
      'blue', 'green', 'yellow', 'orange', 'boldContrast'
    ];
    
    // Get colors already in use
    const usedColors = existingColumns
      .map(col => col.customColor)
      .filter(Boolean);
    
    // Find first color that's not used
    const availableColor = colorSchemes.find(color => !usedColors.includes(color));
    return availableColor || 'blue'; // Default to blue if all colors are used
  };

  // Function to add a column
  const addColumn = (year, month, type, customMonths = null) => {
    // Check if we've already reached the maximum number of columns
    if (columnOrder.length >= MAX_COLUMNS) {
      console.warn(`Maximum number of columns (${MAX_COLUMNS}) reached`);
      return { success: false, error: `Maximum limit of ${MAX_COLUMNS} columns reached.` };
    }

    let newColumn;

    // Handle custom month ranges
    if (customMonths && Array.isArray(customMonths) && customMonths.length > 0) {
      const customResult = createCustomRange(year, customMonths, type);
      if (!customResult.success) {
        return customResult; // Return error from createCustomRange
      }
      newColumn = customResult.column;
    } else {
      // Handle regular periods (existing logic)
      let actualMonths = [];
      if (month === 'FY') actualMonths = fullYear;
      else if (quarters[month]) actualMonths = quarters[month];
      else if (halfYears[month]) actualMonths = halfYears[month];
      else actualMonths = [month];
      
      newColumn = { 
        year, 
        month, 
        type, 
        months: actualMonths,
        id: `${year}-${month}-${type}`
      };
    }

    // Check if this column already exists to avoid duplicates
    const exists = columnOrder.some(col => col.id === newColumn.id);
    
    if (!exists) {
      // Find an available color that's not used by other columns
      const availableColor = findAvailableColor(columnOrder);
      newColumn.customColor = availableColor;
      
      setColumnOrder(prev => [...prev, newColumn]);
      return { success: true };
    }
    
    return { success: false, error: 'This column combination already exists.' };
  };
  
  // Function to update column order
  const updateColumnOrder = (newOrder) => {
    setColumnOrder(newOrder);
  };
  
  // Function to remove a column
  const removeColumn = (columnId) => {
    // First find the index of the column to be removed
    const indexToRemove = columnOrder.findIndex(col => col.id === columnId);
    
    // If the column exists and is being removed
    if (indexToRemove !== -1) {
      // Check if the removed column is the base period or affects the base period index
      if (basePeriodIndex !== null) {
        // If we're removing the base period column
        if (indexToRemove === basePeriodIndex) {
          // Clear the base period
          clearBasePeriod();
        } 
        // If we're removing a column before the base period, adjust the index
        else if (indexToRemove < basePeriodIndex) {
          // Decrement the base period index
          setBasePeriod(basePeriodIndex - 1);
        }
      }
    }
    
    // Remove the column from the order
    setColumnOrder(prev => prev.filter(col => col.id !== columnId));
  };
  
  // Function to clear all columns
  const clearAllColumns = () => {
    setColumnOrder([]);
    setDataGenerated(false);
  };
  
  // Function to generate data based on selected columns
  const generateData = () => {
    if (columnOrder.length > 0) {
      setDataGenerated(true);
      return true;
    }
    return false;
  };

  // Function to save current selection as standard
  const saveAsStandardSelection = async () => {
    if (columnOrder.length > 0) {
      try {
        // Save both column selection and base period index
        const [columnResponse, basePeriodResponse] = await Promise.all([
          fetch('http://localhost:3001/api/standard-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'standardColumnSelection',
              data: columnOrder
            })
          }),
          // Only save base period if it's set
          basePeriodIndex !== null ? fetch('http://localhost:3001/api/standard-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'basePeriodIndex',
              data: basePeriodIndex
            })
          }) : Promise.resolve({ ok: true })
        ]);
        
        if (columnResponse.ok && basePeriodResponse.ok) {
          console.log('✅ Standard configuration saved to backend (columns + base period)');
          return true;
        } else {
          console.error('Failed to save standard configuration to backend');
          return false;
        }
      } catch (error) {
        console.error('Error saving standard configuration:', error);
        return false;
      }
    }
    return false;
  };

  // Function to clear standard selection
  const clearStandardSelection = async () => {
    try {
      // Clear both column selection and base period index
      const [columnResponse, basePeriodResponse] = await Promise.all([
        fetch('http://localhost:3001/api/standard-config/standardColumnSelection', {
          method: 'DELETE'
        }),
        fetch('http://localhost:3001/api/standard-config/basePeriodIndex', {
          method: 'DELETE'
        })
      ]);
      
      if (columnResponse.ok && basePeriodResponse.ok) {
        console.log('✅ Standard configuration cleared from backend (columns + base period)');
        return true;
      } else {
        console.error('Failed to clear standard configuration from backend');
        return false;
      }
    } catch (error) {
      console.error('Error clearing standard configuration:', error);
      return false;
    }
  };

  // Function to set base period
  const setBasePeriod = async (index) => {
    setBasePeriodIndex(index);
    try {
      await fetch('http://localhost:3001/api/standard-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'basePeriodIndex',
          data: index
        })
      });
      // console.log('Base period saved to backend');
    } catch (error) {
      console.error('Failed to save base period to backend:', error);
    }
  };

  // Function to clear base period
  const clearBasePeriod = async () => {
    setBasePeriodIndex(null);
    try {
      await fetch('http://localhost:3001/api/standard-config/basePeriodIndex', {
        method: 'DELETE'
      });
      // console.log('Base period cleared from backend');
    } catch (error) {
      console.error('Failed to clear base period from backend:', error);
    }
  };

  // Toggle visibility of a column in charts
  const toggleChartColumnVisibility = (columnId) => {
    setChartVisibleColumns(prev => {
      const newVisibility = prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)  // Remove if present (hide)
        : [...prev, columnId];                // Add if not present (show)
      
      // Save to backend immediately
      saveChartVisibilityToBackend(newVisibility);
      return newVisibility;
    });
  };
  
  // Check if a column is visible in charts
  const isColumnVisibleInChart = (columnId) => {
    return chartVisibleColumns.includes(columnId);
  };

  // Alias for backward compatibility
  const setSelectedColumn = setSelectedColumnIndex;

  // Load standard configuration from backend on component mount
  useEffect(() => {
    const loadStandardConfig = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/standard-config');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log('🔍 Loaded global config from backend:', result.data);
            
            // Load standard column selection and enrich with months array
            if (result.data.standardColumnSelection && Array.isArray(result.data.standardColumnSelection)) {
              // Enrich each period with months array if missing
              const enrichedColumns = result.data.standardColumnSelection.map(col => {
                if (col.months) return col; // Already has months
                
                // Add months based on period type
                if (col.month === 'HY1') {
                  return { ...col, months: halfYears['HY1'] };
                } else if (col.month === 'HY2') {
                  return { ...col, months: halfYears['HY2'] };
                } else if (col.month === 'Q1') {
                  return { ...col, months: quarters['Q1'] };
                } else if (col.month === 'Q2') {
                  return { ...col, months: quarters['Q2'] };
                } else if (col.month === 'Q3') {
                  return { ...col, months: quarters['Q3'] };
                } else if (col.month === 'Q4') {
                  return { ...col, months: quarters['Q4'] };
                } else if (col.month === 'Year') {
                  return { ...col, months: fullYear };
                } else if (fullYear.includes(col.month)) {
                  return { ...col, months: [col.month] }; // Single month
                } else {
                  return col; // Unknown format, keep as is
                }
              });
              
              setColumnOrder(enrichedColumns);
              console.log('📊 Loaded standardColumnSelection:', enrichedColumns.length, 'columns (enriched with months)');
            } else {
              console.log('⚠️ No standardColumnSelection found, using empty array');
              setColumnOrder([]);
            }
            
            // Load chart visibility
            if (result.data.chartVisibleColumns && Array.isArray(result.data.chartVisibleColumns)) {
              setChartVisibleColumns(result.data.chartVisibleColumns);
              console.log('📊 Loaded chartVisibleColumns:', result.data.chartVisibleColumns.length, 'columns');
            } else {
              console.log('⚠️ No chartVisibleColumns found, using empty array');
              setChartVisibleColumns([]);
            }
            
            // Load base period index
            if (result.data.basePeriodIndex !== undefined && result.data.basePeriodIndex !== null) {
              setBasePeriodIndex(result.data.basePeriodIndex);
              console.log('📅 Loaded basePeriodIndex:', result.data.basePeriodIndex);
            } else {
              console.log('⚠️ No basePeriodIndex found, using null');
              setBasePeriodIndex(null);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load global config from backend:', error);
      }
    };

    // Chart visibility is now loaded in loadStandardConfig above

    // Base period is now loaded in loadStandardConfig above

    loadStandardConfig();
  }, []);
  
  // Update chart visibility when columnOrder changes
  useEffect(() => {
    // Make sure all columns have a visibility setting
    setChartVisibleColumns(prev => {
      // Find any columns that aren't in the visibility list yet
      const newColumns = columnOrder.filter(col => !prev.includes(col.id));
      
      // If there are any new columns, add them to the visibility list
      if (newColumns.length > 0) {
        const updatedVisibility = [...prev, ...newColumns.map(col => col.id)];
        // Save to backend immediately
        saveChartVisibilityToBackend(updatedVisibility);
        return updatedVisibility;
      }
      
      // If all columns already have visibility settings, just return the current list
      // But filter out any columns that no longer exist
      const filtered = prev.filter(id => columnOrder.some(col => col.id === id));
      if (filtered.length !== prev.length) {
        // Save the filtered list if it changed
        saveChartVisibilityToBackend(filtered);
      }
      return filtered;
    });
  }, [columnOrder]);

  // Helper function to save chart visibility to backend
  const saveChartVisibilityToBackend = async (visibility) => {
    try {
      await fetch('http://localhost:3001/api/standard-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'chartVisibleColumns',
          data: visibility
        })
      });
    } catch (error) {
      console.error('Failed to save chart visibility to backend:', error);
    }
  };

  // Values to expose in the context - MEMOIZED to prevent infinite re-renders
  const value = useMemo(() => ({
    availableFilters,
    columnOrder,
    updateColumnOrder,
    addColumn,
    removeColumn,
    clearAllColumns,
    generateData,
    dataGenerated,
    fullYear,
    quarters,
    saveAsStandardSelection,
    clearStandardSelection,
    basePeriodIndex,
    setBasePeriod,
    clearBasePeriod,
    chartVisibleColumns,
    toggleChartColumnVisibility,
    isColumnVisibleInChart,
    // New multi-month range functions
    areMonthsSequential,
    formatMonthRange,
    createCustomRange,
    selectedColumnIndex,
    setSelectedColumnIndex,
    setSelectedColumn,
    // expose selectedDivision so dashboard radio selection is available everywhere
    selectedDivision
  }), [
    availableFilters,
    columnOrder,
    updateColumnOrder,
    addColumn,
    removeColumn,
    clearAllColumns,
    generateData,
    dataGenerated,
    fullYear,
    quarters,
    saveAsStandardSelection,
    clearStandardSelection,
    basePeriodIndex,
    setBasePeriod,
    clearBasePeriod,
    chartVisibleColumns,
    toggleChartColumnVisibility,
    isColumnVisibleInChart,
    areMonthsSequential,
    formatMonthRange,
    createCustomRange,
    selectedColumnIndex,
    setSelectedColumnIndex,
    setSelectedColumn,
    selectedDivision
  ]);
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}; 