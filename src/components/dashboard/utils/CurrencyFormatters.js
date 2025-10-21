import React from 'react';
import UAEDirhamSymbol from '../UAEDirhamSymbol';

/**
 * Format AED currency with symbol for display
 * @param {number} value - The numeric value to format
 * @param {Object} options - Formatting options
 * @param {number} options.dp - Decimal places (default: 2)
 * @param {boolean} options.useSymbol - Whether to use symbol (default: true)
 * @returns {JSX.Element} Formatted currency with symbol
 */
export const formatAEDSymbol = (value, options = {}) => {
  const { dp = 2, useSymbol = true } = options;
  
  if (value == null || isNaN(value)) {
    return (
      <>
        {useSymbol && <UAEDirhamSymbol />}
        0.00
      </>
    );
  }
  
  const formatted = value.toFixed(dp);
  return (
    <>
      {useSymbol && <UAEDirhamSymbol />}
      {formatted}
    </>
  );
};

/**
 * Format AED currency per kg with symbol
 * @param {number} value - The numeric value to format
 * @param {Object} options - Formatting options
 * @param {number} options.dp - Decimal places (default: 2)
 * @param {boolean} options.useSymbol - Whether to use symbol (default: true)
 * @returns {JSX.Element} Formatted currency per kg with symbol
 */
export const formatAEDPerKg = (value, options = {}) => {
  const { dp = 2, useSymbol = true } = options;
  
  if (value == null || isNaN(value)) {
    return (
      <>
        {useSymbol && <UAEDirhamSymbol />}
        0.00/kg
      </>
    );
  }
  
  const formatted = value.toFixed(dp);
  return (
    <>
      {useSymbol && <UAEDirhamSymbol />}
      {formatted}/kg
    </>
  );
};

/**
 * Format AED currency with code for exports/reports (CSV/Excel/API)
 * @param {number} value - The numeric value to format
 * @param {Object} options - Formatting options
 * @param {number} options.dp - Decimal places (default: 2)
 * @returns {string} Formatted currency with "AED" code
 */
export const formatAEDCode = (value, options = {}) => {
  const { dp = 2 } = options;
  
  if (value == null || isNaN(value)) {
    return `AED 0.00`;
  }
  
  const formatted = value.toFixed(dp);
  return `AED ${formatted}`;
};

/**
 * Format large currency values with M/K suffixes
 * @param {number} value - The numeric value to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.useSymbol - Whether to use symbol (default: true)
 * @returns {JSX.Element} Formatted currency with M/K suffixes
 */
export const formatAEDLarge = (value, options = {}) => {
  const { useSymbol = true } = options;
  
  if (value == null || isNaN(value)) {
    return (
      <>
        {useSymbol && <UAEDirhamSymbol />}
        0.00M
      </>
    );
  }
  
  let formatted;
  if (value >= 1000000) {
    formatted = (value / 1000000).toFixed(2) + 'M';
  } else if (value >= 1000) {
    formatted = (value / 1000).toFixed(2) + 'K';
  } else {
    formatted = value.toFixed(2);
  }
  
  return (
    <>
      {useSymbol && <UAEDirhamSymbol />}
      {formatted}
    </>
  );
};
