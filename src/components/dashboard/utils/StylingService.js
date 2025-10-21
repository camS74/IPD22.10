/**
 * Styling Service for P&L Table
 * 
 * This service manages styling logic for the P&L table,
 * including column colors, cell backgrounds, and visual formatting.
 */

import { COLOR_SCHEMES, DEFAULT_COLORS, DEFAULT_CELL_COLORS } from './FinancialConstants';

/**
 * Styling Service Class
 * Manages all styling logic for the P&L table
 */
export class StylingService {
  
  /**
   * Gets column header style based on column configuration
   * @param {Object} column - The column configuration object
   * @returns {Object} Style object for column header
   */
  static getColumnHeaderStyle(column) {
    // Ensure column is defined
    if (!column) {
      return DEFAULT_COLORS.DEFAULT;
    }
    
    // Check if column has custom color property
    if (column.customColor) {
      const scheme = COLOR_SCHEMES.find(s => s.name === column.customColor);
      if (scheme) {
        return {
          backgroundColor: scheme.primary,
          color: scheme.isDark ? '#FFFFFF' : '#000000',
          fontWeight: 'bold'
        };
      }
    }
    
    // Default color assignment based on month/type
    if (column.month === 'Q1' || column.month === 'Q2' || column.month === 'Q3' || column.month === 'Q4') {
      return DEFAULT_COLORS.QUARTER;
    } else if (column.month === 'January') {
      return DEFAULT_COLORS.JANUARY;
    } else if (column.month === 'Year') {
      return DEFAULT_COLORS.YEAR;
    } else if (column.type === 'Budget') {
      return DEFAULT_COLORS.BUDGET;
    }
    
    // Default to blue
    return DEFAULT_COLORS.DEFAULT;
  }
  
  /**
   * Gets cell background color based on column configuration
   * @param {Object} column - The column configuration object
   * @returns {string} Background color string
   */
  static getCellBackgroundColor(column) {
    // Use custom color if available
    if (column.customColor) {
      const scheme = COLOR_SCHEMES.find(s => s.name === column.customColor);
      if (scheme) {
        return scheme.light;
      }
    }
    
    // Default color assignment based on month/type
    if (column.month === 'Q1' || column.month === 'Q2' || column.month === 'Q3' || column.month === 'Q4') {
      return DEFAULT_CELL_COLORS.QUARTER;
    } else if (column.month === 'January') {
      return DEFAULT_CELL_COLORS.JANUARY;
    } else if (column.month === 'Year') {
      return DEFAULT_CELL_COLORS.YEAR;
    } else if (column.type === 'Budget') {
      return DEFAULT_CELL_COLORS.BUDGET;
    }
    
    // Default to blue
    return DEFAULT_CELL_COLORS.DEFAULT;
  }
  
  /**
   * Gets row styling based on row properties
   * @param {Object} row - The row configuration object
   * @returns {Object} Style object for row
   */
  static getRowStyle(row) {
    const baseStyle = {};
    
    // Add header styling
    if (row.isHeader) {
      baseStyle.fontWeight = 'bold';
      baseStyle.backgroundColor = '#f8f9fa';
    }
    
    // Add separator styling
    if (row.isSeparator) {
      baseStyle.height = '10px';
      baseStyle.backgroundColor = 'transparent';
    }
    
    return baseStyle;
  }
  
  /**
   * Gets cell styling based on cell properties
   * @param {Object} cell - The cell configuration object
   * @param {Object} column - The column configuration object
   * @returns {Object} Style object for cell
   */
  static getCellStyle(cell, column) {
    const baseStyle = {
      backgroundColor: this.getCellBackgroundColor(column)
    };
    
    // Add calculated cell styling
    if (cell.isCalculated) {
      baseStyle.fontWeight = 'bold';
    }
    
    // Add special styling for sales row
    if (cell.rowIndex === 3) {
      baseStyle.color = '#2E865F';
      baseStyle.fontWeight = 'bold';
    }
    
    return baseStyle;
  }
  
  /**
   * Gets table styling
   * @returns {Object} Style object for table
   */
  static getTableStyle() {
    return {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif'
    };
  }
  
  /**
   * Gets table header styling
   * @returns {Object} Style object for table header
   */
  static getTableHeaderStyle() {
    return {
      backgroundColor: '#f8f9fa',
      fontWeight: 'bold',
      textAlign: 'center',
      padding: '8px',
      border: '1px solid #dee2e6'
    };
  }
  
  /**
   * Gets table cell styling
   * @returns {Object} Style object for table cell
   */
  static getTableCellStyle() {
    return {
      padding: '6px 8px',
      border: '1px solid #dee2e6',
      textAlign: 'right'
    };
  }
  
  /**
   * Gets row label cell styling
   * @returns {Object} Style object for row label cell
   */
  static getRowLabelStyle() {
    return {
      padding: '6px 8px',
      border: '1px solid #dee2e6',
      textAlign: 'left',
      fontWeight: 'normal',
      backgroundColor: '#f8f9fa'
    };
  }
  
  /**
   * Gets important row styling
   * @returns {Object} Style object for important rows
   */
  static getImportantRowStyle() {
    return {
      fontWeight: 'bold',
      backgroundColor: '#fff3cd'
    };
  }
  
  /**
   * Gets section header styling
   * @returns {Object} Style object for section headers
   */
  static getSectionHeaderStyle() {
    return {
      fontWeight: 'bold',
      backgroundColor: '#e9ecef',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };
  }
  
  /**
   * Gets calculated cell styling
   * @returns {Object} Style object for calculated cells
   */
  static getCalculatedCellStyle() {
    return {
      fontWeight: 'bold',
      backgroundColor: '#f8f9fa'
    };
  }
  
  /**
   * Gets separator row styling
   * @returns {Object} Style object for separator rows
   */
  static getSeparatorRowStyle() {
    return {
      height: '10px',
      backgroundColor: 'transparent',
      border: 'none'
    };
  }
  
  /**
   * Gets responsive styling for mobile devices
   * @returns {Object} Style object for mobile responsiveness
   */
  static getMobileStyle() {
    return {
      fontSize: '12px',
      padding: '4px 6px'
    };
  }
  
  /**
   * Gets print styling for PDF export
   * @returns {Object} Style object for print media
   */
  static getPrintStyle() {
    return {
      fontSize: '10px',
      padding: '4px',
      border: '1px solid #000',
      backgroundColor: '#fff'
    };
  }
  
  /**
   * Gets color scheme by name
   * @param {string} schemeName - The name of the color scheme
   * @returns {Object|null} Color scheme object or null if not found
   */
  static getColorScheme(schemeName) {
    return COLOR_SCHEMES.find(scheme => scheme.name === schemeName) || null;
  }
  
  /**
   * Gets all available color schemes
   * @returns {Array} Array of all color schemes
   */
  static getAllColorSchemes() {
    return COLOR_SCHEMES;
  }
  
  /**
   * Validates if a color scheme exists
   * @param {string} schemeName - The name of the color scheme
   * @returns {boolean} True if scheme exists, false otherwise
   */
  static isValidColorScheme(schemeName) {
    return COLOR_SCHEMES.some(scheme => scheme.name === schemeName);
  }
}

export default StylingService;




















