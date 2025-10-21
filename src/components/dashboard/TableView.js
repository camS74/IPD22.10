import React, { useRef, useEffect } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';
import PDFExport from './PDFExport';
import './TableView.css';
import { computeCellValue as sharedComputeCellValue } from '../../utils/computeCellValue';
import FormulaCalculator from './utils/FormulaCalculator';
import RowConfigurationService from './utils/RowConfigurationService';
import StylingService from './utils/StylingService';
import DataValidator from './utils/DataValidator';
import { FINANCIAL_ROWS } from './utils/FinancialConstants';
import UAEDirhamSymbol from './UAEDirhamSymbol';

// Helper function for safely removing DOM elements
const safelyRemoveElement = (element) => {
  try {
    // Check if element exists
    if (!element) return;
    
    // Try direct removal if element has parent
    if (element.parentNode) {
      element.parentNode.removeChild(element);
      return;
    }
    
    // Fallback: check if it's in document.body
    if (document.body && document.body.contains(element)) {
      document.body.removeChild(element);
      return;
    }
    
    // Fallback for loading overlays: find by class
    if (element.classList && element.classList.contains('loading-overlay')) {
      const overlays = document.querySelectorAll('.loading-overlay');
      overlays.forEach(overlay => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
    }
  } catch (cleanupError) {
    console.warn('Error removing element:', cleanupError);
    // Try one more approach with a slight delay
    setTimeout(() => {
      try {
        // Final attempt to remove loading overlays
        const overlays = document.querySelectorAll('.loading-overlay');
        overlays.forEach(overlay => {
          try {
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            } else if (document.body && document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
          } catch (e) {
            // Silently fail
          }
        });
      } catch (e) {
        // Last effort failed, nothing more we can do
      }
    }, 500);
  }
};

const TableView = () => {
  const { excelData, selectedDivision } = useExcelData();
  const { columnOrder, dataGenerated } = useFilter();
  const tableRef = useRef(null);


  // Only show data if Generate button has been clicked
  if (!dataGenerated) {
    return (
      <div className="table-view">
        <h3>Financial Table</h3>
        <div className="table-empty-state">
          <p>Please select columns and click the Generate button to view data.</p>
        </div>
      </div>
    );
  }

  // Get the Excel data based on selectedDivision
  const divisionData = excelData[selectedDivision] || [];

  // Validate input data
  const validationResult = DataValidator.validatePLInputs({
    divisionData,
    columnOrder
  });

  if (!validationResult.isValid) {
    console.error('Data validation failed:', validationResult.errors);
  }

  // Get row configuration from service
  const salesRows = RowConfigurationService.getRowConfiguration(divisionData);

  // Function to compute the value for a specific cell based on row index and column configuration
  const computeCellValue = (rowIndex, column) => {
    const value = sharedComputeCellValue(divisionData, rowIndex, column);
    if (value === 0) return '';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Function to compute percent of sales - ORIGINAL LOGIC RESTORED
  const computePercentOfSales = (rowIndex, column) => {
    try {
      // Skip for Sales row itself
      if (rowIndex === 3) return '';

      // Get the value for this row and the sales row
      const value = computeCellValue(rowIndex, column);
      const salesValue = computeCellValue(3, column);

      // If either is empty, return empty string
      if (value === '' || salesValue === '') return '';

      // Parse numbers
      const numValue = parseFloat(String(value).replace(/,/g, ''));
      const numSales = parseFloat(String(salesValue).replace(/,/g, ''));

      if (isNaN(numValue) || isNaN(numSales)) return '';
      if (numSales === 0) return '0.00%';

      const percentage = (numValue / numSales) * 100;
      return percentage.toFixed(2) + '%';
    } catch (error) {
      console.error('Error computing percent of sales:', error);
      return '';
    }
  };

  // Function to compute sales per kg - ORIGINAL LOGIC RESTORED
  const computeSalesPerKg = (rowIndex, column) => {
    try {
      // Validate inputs
      if (!column || typeof column !== 'object') {
        return '';
      }
      
      if (typeof rowIndex !== 'number') {
        return '';
      }

      // Skip for Sales Volume and Production Volume rows
      if (rowIndex === 7 || rowIndex === 8) return '';

      // Get the sales volume value (always from row 7)
      const volumeValue = computeCellValue(7, column);
      
      // If volume is empty, return empty string
      if (volumeValue === '') return '';
      
      // Parse the volume value
      const numVolumeValue = parseFloat(volumeValue.replace(/,/g, ''));
      
      // Check for valid numbers and non-zero volume
      if (isNaN(numVolumeValue) || numVolumeValue === 0) return '0.00';
      
      // Get the value for the current row
      const currentValue = computeCellValue(rowIndex, column);
      
      // If the current row value is empty, return empty string
      if (currentValue === '') return '';
      
      // Parse the current row value
      const numCurrentValue = parseFloat(currentValue.replace(/,/g, ''));
      
      // Check for valid number
      if (isNaN(numCurrentValue)) return '';
      
      // Calculate per kg value (current row value divided by sales volume)
      const perKgValue = numCurrentValue / numVolumeValue;
      
      // Format with exactly 2 decimal places
      return perKgValue.toFixed(2);
    } catch (error) {
      console.error('Error computing sales per kg:', error);
      return '';
    }
  };


  // Use StylingService for consistent styling
  const getColumnHeaderStyle = StylingService.getColumnHeaderStyle;
  const getCellBackgroundColor = StylingService.getCellBackgroundColor;

  return (
    <div className="table-view" ref={tableRef}>
      <PDFExport tableRef={tableRef} selectedDivision={selectedDivision} />
        <div className="table-header">
          <div className="header-center">
            <h2 className="table-title">{selectedDivision} Financials</h2>
            <div className="table-subtitle">(<UAEDirhamSymbol />)</div>
          </div>
        </div>
      <div className="table-container">
        <table className="financial-table">
          <colgroup>
            <col style={{ width: '18%' }}/>
          </colgroup>
          {columnOrder.map((_, index) => (
            <colgroup key={`colgroup-${index}`} className="period-column-group">
              {/* Increase Amount width to fit up to 999,999,999 */}
              <col style={{ width: `${76 / columnOrder.length * 0.8}%` }}/>
              {/* Slightly reduce % of Sales */}
              <col style={{ width: `${76 / columnOrder.length * 0.14}%` }}/>
              {/* Reduce D per Kg width */}
              <col style={{ width: `${76 / columnOrder.length * 0.06}%` }}/>
            </colgroup>
          ))}
          <thead>
            <tr>
              <th className="empty-header" rowSpan="4"></th>
              {columnOrder.map((column, index) => (
                <th
                  key={`year-${index}`}
                  style={getColumnHeaderStyle(column)}
                  colSpan="3"
                >
                  {column.year}
                </th>
              ))}
            </tr>
            <tr>
              {columnOrder.map((column, index) => (
                <th
                  key={`month-${index}`}
                  style={getColumnHeaderStyle(column)}
                  colSpan="3"
                >
                  {column.isCustomRange ? column.displayName : column.month}
                </th>
              ))}
            </tr>
            <tr>
              {columnOrder.map((column, index) => (
                <th 
                  key={`type-${index}`}
                  style={getColumnHeaderStyle(column)}
                  colSpan="3"
                >
                  {column.type}
                </th>
              ))}
            </tr>
            
            <tr>
              {columnOrder.map((column, index) => (
                <React.Fragment key={`metric-${index}`}>
                  <th style={{...getColumnHeaderStyle(column), fontSize: '13px'}}>
                    Amount
                  </th>
                  <th style={{...getColumnHeaderStyle(column), fontSize: '12px', lineHeight: '1.1', textAlign: 'center', padding: '2px'}}>
                    % of Sales
                  </th>
                  <th style={{...getColumnHeaderStyle(column), fontSize: '12px', lineHeight: '1.1', textAlign: 'center', padding: '2px'}}>
                    <UAEDirhamSymbol /> per Kg
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Sales section */}
            {salesRows.map((row) => {
              // If it's a separator row, render a spacer row
              if (row.isSeparator) {
                return (
                  <tr key={row.key} className="separator-row">
                    <td colSpan={columnOrder.length + 1}>&nbsp;</td>
                  </tr>
                );
              }
              
              // Check if this row should have bold styling using service
              const isBoldRow = RowConfigurationService.shouldBeBold(row.label);
              
              return (
                <tr key={row.key} className={`${row.isHeader ? 'section-header' : ''} ${isBoldRow ? 'important-row' : ''}`}>
                  <td className="row-label">{row.label}</td>
                  {columnOrder.flatMap((column, colIndex) => {
                    // Handle calculated fields with formulas
                    if (row.isCalculated) {
                      // Get background color based on the column's properties
                      const bgColor = getCellBackgroundColor(column);

                      // Use FormulaCalculator for consistent calculations
                      let formattedResult = '';
                      
                      // Prepare values for formula calculation
                      const values = {
                        sales: computeCellValue(FINANCIAL_ROWS.SALES, column),
                        material: computeCellValue(FINANCIAL_ROWS.MATERIAL, column),
                        costOfSales: computeCellValue(FINANCIAL_ROWS.COST_OF_SALES, column),
                        row9: computeCellValue(FINANCIAL_ROWS.ROW_9, column),
                        row10: computeCellValue(FINANCIAL_ROWS.ROW_10, column),
                        row12: computeCellValue(FINANCIAL_ROWS.ROW_12, column),
                        row13: computeCellValue(FINANCIAL_ROWS.ROW_13, column),
                        row15: computeCellValue(FINANCIAL_ROWS.ROW_15, column),
                        row31: computeCellValue(FINANCIAL_ROWS.ROW_31, column),
                        row32: computeCellValue(FINANCIAL_ROWS.ROW_32, column),
                        row40: computeCellValue(FINANCIAL_ROWS.ROW_40, column),
                        row42: computeCellValue(FINANCIAL_ROWS.ROW_42, column),
                        row43: computeCellValue(FINANCIAL_ROWS.ROW_43, column),
                        row44: computeCellValue(FINANCIAL_ROWS.ROW_44, column),
                        row49: computeCellValue(FINANCIAL_ROWS.ROW_49, column),
                        row50: computeCellValue(FINANCIAL_ROWS.ROW_50, column),
                        row51: computeCellValue(FINANCIAL_ROWS.ROW_51, column),
                        row54: computeCellValue(FINANCIAL_ROWS.ROW_54, column),
                        // Additional values for new formulas
                        actualDirectCostSpent: FormulaCalculator.calculateFormula('sum9-10-12-13', {
                          row9: computeCellValue(FINANCIAL_ROWS.ROW_9, column),
                          row10: computeCellValue(FINANCIAL_ROWS.ROW_10, column),
                          row12: computeCellValue(FINANCIAL_ROWS.ROW_12, column),
                          row13: computeCellValue(FINANCIAL_ROWS.ROW_13, column)
                        }),
                        dirCostInStock: computeCellValue(FINANCIAL_ROWS.ROW_15, column),
                        directCostOfGoodsSold: '', // Will be calculated
                        grossProfitAfterDepn: FormulaCalculator.calculateFormula('sales-cost-of-sales', {
                          sales: computeCellValue(FINANCIAL_ROWS.SALES, column),
                          costOfSales: computeCellValue(FINANCIAL_ROWS.COST_OF_SALES, column)
                        }),
                        depreciation: computeCellValue(FINANCIAL_ROWS.ROW_10, column),
                        totalBelowGPExpenses: FormulaCalculator.calculateFormula('sum-31-32-40-42-43-44-49-50-51', {
                          row31: computeCellValue(FINANCIAL_ROWS.ROW_31, column),
                          row32: computeCellValue(FINANCIAL_ROWS.ROW_32, column),
                          row40: computeCellValue(FINANCIAL_ROWS.ROW_40, column),
                          row42: computeCellValue(FINANCIAL_ROWS.ROW_42, column),
                          row43: computeCellValue(FINANCIAL_ROWS.ROW_43, column),
                          row44: computeCellValue(FINANCIAL_ROWS.ROW_44, column),
                          row49: computeCellValue(FINANCIAL_ROWS.ROW_49, column),
                          row50: computeCellValue(FINANCIAL_ROWS.ROW_50, column),
                          row51: computeCellValue(FINANCIAL_ROWS.ROW_51, column)
                        }),
                        totalExpenses: '', // Will be calculated
                        netProfit: '', // Will be calculated
                        bankInterest: computeCellValue(FINANCIAL_ROWS.ROW_42, column),
                        ebit: '', // Will be calculated
                        rdPreProduction: computeCellValue(FINANCIAL_ROWS.ROW_44, column)
                      };

                      // Calculate intermediate values for complex formulas
                      values.directCostOfGoodsSold = FormulaCalculator.calculateDirectCostOfGoodsSold(values.actualDirectCostSpent, values.dirCostInStock);
                      values.totalExpenses = FormulaCalculator.calculateTotalExpenses(values.actualDirectCostSpent, values.totalBelowGPExpenses);
                      values.netProfit = FormulaCalculator.calculateNetProfit(values.grossProfitAfterDepn, values.totalBelowGPExpenses);
                      values.ebit = FormulaCalculator.calculateEBIT(values.netProfit, values.bankInterest);

                      // Use FormulaCalculator for all calculations
                      formattedResult = FormulaCalculator.calculateFormula(row.formula, values);
                      
                      // Return an array of cells instead of using React.Fragment
                      return [
                        <td
                          key={`amount-${row.key}-${colIndex}`}
                          className="calculated-cell"
                          style={{ backgroundColor: bgColor }}
                        >
                          {formattedResult === '' ? '' : formattedResult}
                        </td>,
                        <td
                          key={`percent-${row.key}-${colIndex}`}
                          className="calculated-cell"
                          style={{ backgroundColor: bgColor }}
                        >
                          {(() => {
                            if (row.index === -5) return '';
                            try {
                              if (formattedResult === '') return '';
                              const salesValue = computeCellValue(FINANCIAL_ROWS.SALES, column);
                              return FormulaCalculator.calculatePercentageOfSales(formattedResult, salesValue);
                            } catch (error) {
                              console.error('Error computing percent of sales for calculated cell:', error);
                              return 'Error';
                            }
                          })()}
                        </td>,
                        <td
                          key={`perkg-${row.key}-${colIndex}`}
                          className="calculated-cell"
                          style={{ backgroundColor: bgColor }}
                        >
                          {(() => {
                            if (row.index === -5) return '';
                            try {
                              if (formattedResult === '') return '';
                              const volumeValue = computeCellValue(FINANCIAL_ROWS.SALES_VOLUME, column);
                              return FormulaCalculator.calculateSalesPerKg(formattedResult, volumeValue);
                            } catch (error) {
                              console.error('Error computing sales per kg for calculated cell:', error);
                              return '';
                            }
                          })()}
                        </td>
                      ];
                    }

                    // Regular data cells (not calculated)
                    const cellValue = computeCellValue(row.index, column);
                    
                    const bgColor = getCellBackgroundColor(column);
                    
                    // Return an array of cells instead of using React.Fragment
                    return [
                      <td 
                        key={`amount-${row.key}-${colIndex}`}
                        style={{ backgroundColor: bgColor }}
                      >
                        {cellValue}
                      </td>,
                      <td 
                        key={`percent-${row.key}-${colIndex}`}
                        style={{ backgroundColor: bgColor }}
                      >
                        {/* Keep % of Sales empty for specific rows */}
                        {row.index !== 7 && row.index !== 8 && row.index !== -5 ? computePercentOfSales(row.index, column) : ''}
                      </td>,
                      <td 
                        key={`perkg-${row.key}-${colIndex}`}
                        style={{ 
                          backgroundColor: bgColor, 
                          color: row.index === 3 ? '#2E865F' : 'inherit', 
                          fontWeight: row.index === 3 ? 'bold' : 'inherit' 
                        }}
                      >
                        {/* Show Sales per kg for all rows except Sales Volume and Production Volume */}
                        {computeSalesPerKg(row.index, column)}
                      </td>
                    ];
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;