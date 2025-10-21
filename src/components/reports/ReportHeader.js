import React from 'react';

const ReportHeader = ({ rep, basePeriod, toProperCase }) => {
  const getPeriodLabel = (period) => {
    if (!period) return { year: '', periodType: '' };
    const periodType = period.isCustomRange ? period.displayName : period.month;
    return {
      year: period.year,
      periodType: periodType,
      prevPeriod: period.prevPeriod,
      nextPeriod: period.nextPeriod
    };
  };

  const formatPeriodLabel = (period) => {
    if (!period) return '';
    if (typeof period === 'string') return period;
    if (typeof period === 'object' && period.year && period.month) {
      // Capitalize period types like HY1, HY2, Q1, Q2, etc.
      const formattedMonth = period.month.toUpperCase();
      return `${formattedMonth} ${period.year}`;
    }
    return '';
  };

  const formatPeriodForDescription = (period, isBudget = false) => {
    if (!period) return '';
    
    if (typeof period === 'object' && period.year && period.month) {
      // Capitalize period types like HY1, HY2, Q1, Q2, etc.
      const formattedMonth = period.month.toUpperCase();
      if (isBudget) {
        // For budget comparison, use the same period but with "Budget"
        return `${formattedMonth} ${period.year} Budget`;
      } else {
        // For previous year comparison, adjust the year
        const prevYear = parseInt(period.year) - 1;
        return `${formattedMonth} ${prevYear}`;
      }
    }
    
    return '';
  };

  const periodInfo = getPeriodLabel(basePeriod);
  const currentPeriod = formatPeriodLabel(basePeriod);
  const previousYearPeriod = formatPeriodForDescription(basePeriod);
  const budgetPeriod = formatPeriodForDescription(basePeriod, true);
  
  const description = `This report analyzes actual ${currentPeriod} sales & volume performance versus ${previousYearPeriod} and against ${budgetPeriod} targets.`;

  return (
    <div className="report-header">
      <div className="header-content">
        <h1>SALES & VOLUME PERFORMANCE REPORT</h1>
        <h2>{toProperCase(rep)}</h2>
        <div className="report-period">
          <div className="period-year">{periodInfo.year}</div>
          <div className="period-type" style={{
            fontSize: '1.2em',
            fontWeight: '600',
            letterSpacing: '1px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            marginBottom: '15px'
          }}>
            {periodInfo.periodType}
          </div>
          <div className="period-description">{description}</div>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;
