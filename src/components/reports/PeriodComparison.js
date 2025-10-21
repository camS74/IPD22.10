import React from 'react';

const PeriodComparison = ({ prevPeriod, basePeriod, nextPeriod, kgsTotals, basePeriodIndex }) => {
  const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Number(value).toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const getPeriodLabel = (period) => {
    if (!period) return '';
    // Capitalize period types like HY1, HY2, Q1, Q2, etc.
    const formattedMonth = period.isCustomRange ? period.displayName : period.month.toUpperCase();
    return `${period.year} ${formattedMonth} ${period.type}`;
  };

  return (
    <div className="report-section">
      <h2>5. Period Comparison</h2>
      <div className="comparison-container">
        <div className="comparison-card">
          <h4>{getPeriodLabel(prevPeriod)}</h4>
          <div className="comparison-value">
            {formatNumber(kgsTotals[basePeriodIndex - 1] || 0)} KGS
          </div>
        </div>
        <div className="comparison-arrow">→</div>
        <div className="comparison-card current">
          <h4>{getPeriodLabel(basePeriod)}</h4>
          <div className="comparison-value">
            {formatNumber(kgsTotals[basePeriodIndex] || 0)} KGS
          </div>
        </div>
        {nextPeriod && (
          <>
            <div className="comparison-arrow">→</div>
            <div className="comparison-card target">
              <h4>{getPeriodLabel(nextPeriod)} (Target)</h4>
              <div className="comparison-value">
                {formatNumber(kgsTotals[basePeriodIndex + 1] || 0)} KGS
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PeriodComparison;
