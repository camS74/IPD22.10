import React, { useState, useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { computeCellValue as sharedComputeCellValue } from '../../utils/computeCellValue';
import ComprehensiveHTMLExport from './ComprehensiveHTMLExport';
import MultiChartHTMLExport from './MultiChartHTMLExport';
import './ColumnConfigGrid.css';

// Color scheme definitions for UI - array format
const colorSchemes = [
  { name: 'blue', label: 'Blue', isDark: true },
  { name: 'green', label: 'Green', isDark: true },
  { name: 'yellow', label: 'Yellow', isDark: false },
  { name: 'orange', label: 'Orange', isDark: false },
  { name: 'boldContrast', label: 'Bold Contrast', isDark: true }
];

const ColumnConfigGrid = ({ productGroupTableRef }) => {
  const { 
    columnOrder, 
    updateColumnOrder, 
    removeColumn, 
    clearAllColumns, 
    generateData, 
    dataGenerated,
    saveAsStandardSelection,
    clearStandardSelection,
    basePeriodIndex,
    setBasePeriod,
    clearBasePeriod,
    chartVisibleColumns,
    toggleChartColumnVisibility,
    isColumnVisibleInChart,
    selectedColumnIndex,
    setSelectedColumnIndex
  } = useFilter();
  
  const { selectedDivision, excelData } = useExcelData();
  
  const [standardSaved, setStandardSaved] = useState(false);
  
  // Handle Clear All with resetting selection
  const handleClearAll = () => {
    clearAllColumns();
    setSelectedColumnIndex(null); // Reset selected column when clearing all
    clearBasePeriod(); // Reset base period when clearing all
  };
  
  // Handle data generation
  const handleGenerate = () => {
    if (columnOrder.length > 0) {
      generateData();
    }
  };
  
  // Move a column left in the order
  const moveLeft = (index) => {
    if (index > 0) {
      const newOrder = [...columnOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      updateColumnOrder(newOrder);
    }
  };
  
  // Move a column right in the order
  const moveRight = (index) => {
    if (index < columnOrder.length - 1) {
      const newOrder = [...columnOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      updateColumnOrder(newOrder);
    }
  };
  
  // Get CSS class for column based on its config
  const getColumnClass = (column) => {
    const baseClass = 'config-column';
    if (column.customColor) {
      return `${baseClass} scheme-${column.customColor}`;
    }
    
    // Default to classic blue if no custom color
    return `${baseClass} scheme-classicBlue`;
  };
  
  // Get background color for column (for inline styling)
  const getColumnStyle = (column, isSelected = false) => {
    // Start with bold font style for all columns
    const baseStyle = { fontWeight: 'bold' };
    
    if (column.customColor) {
      const scheme = colorSchemes.find(s => s.name === column.customColor);
      if (scheme) {
        const primary = getComputedStyle(document.documentElement)
          .getPropertyValue(`--color-${scheme.name}-primary`).trim();
        const text = getComputedStyle(document.documentElement)
          .getPropertyValue(`--color-${scheme.name}-text`).trim();
        
        return { 
          ...baseStyle,
          backgroundColor: primary,
          color: text,
          boxShadow: isSelected ? '0 0 5px 2px rgba(0,0,0,0.3)' : 'none'
        };
      }
    }
    
    // Default to blue if no custom color
    return { 
      ...baseStyle,
      backgroundColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-blue-primary').trim(),
      color: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-blue-text').trim(),
      boxShadow: isSelected ? '0 0 5px 2px rgba(0,0,0,0.3)' : 'none'
    };
  };
  
  // Handle column click to select it
  const handleColumnClick = (index) => {
    setSelectedColumnIndex(index === selectedColumnIndex ? null : index);
  };
  
  // Handle remove column
  const handleRemoveColumn = () => {
    if (selectedColumnIndex !== null) {
      removeColumn(columnOrder[selectedColumnIndex].id);
      setSelectedColumnIndex(null);
    }
  };
  
  // Function to determine text color based on background brightness
  const getTextColor = (colorScheme) => {
    // If we know the color is dark or light through our predefined property
    if (colorScheme && colorSchemes.find(s => s.name === colorScheme)) {
      const scheme = colorSchemes.find(s => s.name === colorScheme);
      return scheme.isDark ? '#FFFFFF' : '#000000';
    }
    
    // Default to white text
    return '#FFFFFF';
  };
  
  // Set custom color for the selected column
  const setColumnColor = (colorScheme) => {
    if (selectedColumnIndex !== null) {
      const newOrder = [...columnOrder];
      newOrder[selectedColumnIndex] = {
        ...newOrder[selectedColumnIndex],
        customColor: colorScheme
      };
      updateColumnOrder(newOrder);
    }
  };
  
  // Handle saving as standard selection
  const handleSaveAsStandard = async () => {
    try {
      const success = await saveAsStandardSelection();
      if (success) {
        setStandardSaved(true);
        // Reset the saved state after 2 seconds
        setTimeout(() => setStandardSaved(false), 2000);
      } else {
        alert('Failed to save standard configuration. Please check the backend connection.');
      }
    } catch (error) {
      console.error('Error saving standard configuration:', error);
      alert('Failed to save standard configuration. Please try again.');
    }
  };

  // Handle clearing standard selection
  const handleClearStandard = async () => {
    try {
      const success = await clearStandardSelection();
      if (success) {
        setStandardSaved(false);
      } else {
        alert('Failed to clear standard configuration. Please check the backend connection.');
      }
    } catch (error) {
      console.error('Error clearing standard configuration:', error);
      alert('Failed to clear standard configuration. Please try again.');
    }
  };
  


  return (
    <div className="column-config-container">
      <div className="column-config-header">
        <div className="header-title-actions">
          <h3>Period Configuration</h3>
          <div className="header-buttons-container">
            {columnOrder.length > 0 && (
              <>
                <div className="standard-buttons">
                  <button 
                    onClick={handleSaveAsStandard} 
                    className={`standard-btn ${standardSaved ? 'saved' : ''}`}
                    title="Save current selection as standard"
                  >
                    {standardSaved ? 'Saved as Standard!' : 'Save as Standard'}
                  </button>
                  <button 
                    onClick={handleClearStandard} 
                    className="clear-standard-btn"
                    title="Clear standard selection"
                  >
                    Clear Standard
                  </button>
                </div>
                <div className="action-buttons">
                <button onClick={handleGenerate} className="generate-btn" disabled={dataGenerated}>
                  {dataGenerated ? 'Generated' : 'Generate'}
                </button>
                <button onClick={handleClearAll} className="clear-all-btn">
                  Clear All
                </button>
                </div>
              </>
            )}
          </div>
        </div>
        {selectedColumnIndex !== null && (
          <div className="column-actions">
            <button onClick={() => moveLeft(selectedColumnIndex)} disabled={selectedColumnIndex === 0}>
              ← Move Left
            </button>
            <button onClick={() => moveRight(selectedColumnIndex)} disabled={selectedColumnIndex === columnOrder.length - 1}>
              Move Right →
            </button>
            <button onClick={handleRemoveColumn} className="remove-btn">
              Remove
            </button>
            <div className="color-selector">
              <span>Color Scheme:</span>
              <div className="color-options">
                {colorSchemes.map((scheme) => (
                  <div 
                    key={scheme.name} 
                    className="color-option"
                    style={{ backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(`--color-${scheme.name}-primary`).trim(), border: `1px solid ${getComputedStyle(document.documentElement).getPropertyValue(`--color-${scheme.name}-secondary`).trim()}` }}
                    onClick={() => setColumnColor(scheme.name)}
                    title={scheme.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="config-grid">
        {columnOrder.length > 0 ? (
          <>
            {/* Base period selector row aligned with columns */}
            <div className="config-row base-period-row">
              {columnOrder.map((column, index) => (
                <div
                  key={`base-period-${index}`}
                  className={`base-period-selector${basePeriodIndex === index ? ' selected' : ''}${basePeriodIndex !== null && basePeriodIndex !== index ? ' faded' : ''}`}
                  onClick={() => setBasePeriod(index)}
                  title={basePeriodIndex === index ? 'Base Period' : 'Set as Base Period'}
                >
                  {basePeriodIndex === index ? '★' : '☆'}
                </div>
              ))}
              <div className="row-description">
                <strong><em>Select a column as the base period for comparisons</em></strong>
              </div>
            </div>
            {/* End base period selector row */}
            {/* Chart visibility row */}
            <div className="config-row chart-visibility-row">
              {columnOrder.map((column, index) => (
                <div
                  key={`chart-visibility-${index}`}
                  className={`chart-visibility-selector${isColumnVisibleInChart(column.id) ? ' visible' : ' hidden'}`}
                  onClick={() => toggleChartColumnVisibility(column.id)}
                  title={isColumnVisibleInChart(column.id) ? 'Visible in Chart (click to hide)' : 'Hidden from Chart (click to show)'}
                >
                  {isColumnVisibleInChart(column.id) ? '✓' : ''}
                </div>
              ))}
              <div className="row-description">
                <strong><em>Select which columns appear in charts</em></strong>
              </div>
            </div>
            {/* End chart visibility row */}
            <div className="config-row year-row">
              {columnOrder.map((column, index) => (
                <div 
                  key={`year-${index}`} 
                  className={`config-column ${selectedColumnIndex === index ? 'selected' : ''}`}
                  style={getColumnStyle(column, selectedColumnIndex === index)}
                  onClick={() => handleColumnClick(index)}
                >
                  {column.year}
                </div>
              ))}
            </div>
            <div className="config-row period-row">
              {columnOrder.map((column, index) => (
                <div 
                  key={`period-${index}`} 
                  className={`config-column ${selectedColumnIndex === index ? 'selected' : ''}`}
                  style={getColumnStyle(column, selectedColumnIndex === index)}
                  onClick={() => handleColumnClick(index)}
                >
                  {column.isCustomRange ? column.displayName : column.month}
                </div>
              ))}
            </div>
            <div className="config-row type-row">
              {columnOrder.map((column, index) => (
                <div 
                  key={`type-${index}`} 
                  className={`config-column ${selectedColumnIndex === index ? 'selected' : ''}`}
                  style={getColumnStyle(column, selectedColumnIndex === index)}
                  onClick={() => handleColumnClick(index)}
                >
                  {column.type}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-columns-message">
            No columns configured. Please select options from above and click "Add Column".
          </div>
        )}
      </div>
      {/* Add Generate Complete Report buttons at the bottom */}
      <div className="export-buttons-container">
        <ComprehensiveHTMLExport tableRef={productGroupTableRef} />
        {dataGenerated && (
          <MultiChartHTMLExport />
        )}

      </div>
    </div>
  );
};

export default ColumnConfigGrid;
