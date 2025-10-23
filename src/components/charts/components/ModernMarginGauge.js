import React, { useState, useEffect } from 'react';
import UAEDirhamSymbol from '../../dashboard/UAEDirhamSymbol';
import './ModernMarginGauge.css';


// Color scheme definitions (MUST MATCH ColumnConfigGrid.js exactly)
const colorSchemes = [
  { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
  { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
  { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
  { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
  { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
];

// Default fallback colors in order
const defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];

// Single Gauge Component
const SingleGauge = ({ value, absoluteValue, perKgValue, title, color, index }) => {
  // Calculate the angle for the needle
  const needleAngle = -120 + (value / 100) * 240;
  const progressOffset = 418 - (value / 100) * 418;
  
  // Calculate the tip of the needle
  const angleRad = (Math.PI / 180) * needleAngle;
  const tipX = 100 + 70 * Math.sin(angleRad); // 70 is the needle length
  const tipY = 120 - 70 * Math.cos(angleRad); // SVG y axis is down, moved center to y=120
  const PERCENT_OFFSET = 45; // Increased from 32 to 45 for more space from arc
  const percentY = tipY - PERCENT_OFFSET;
  
  // Log the exact values for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`Gauge ${index} (${title}): Value=${value}%, Angle=${needleAngle}, Offset=${progressOffset}`);
  }
  
  return (
    <div className="modern-gauge-card" style={{ minHeight: 380 }}>
      <div className="gauge-body">
        {/* Gauge visualization with percentage at needle tip */}
        <div className="gauge-container">
          {/* SVG Gauge with Arc, Needle, and Percentage */}
          <svg viewBox="0 0 200 140" className="gauge-svg">
            {/* Arc background */}
            <path
              d="M20,120 A80,80 0 0,1 180,120"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="18"
              strokeLinecap="round"
              className="gauge-track"
            />
            {/* Arc progress */}
            <path
              d="M20,120 A80,80 0 0,1 180,120"
              fill="none"
              stroke={color}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="418"
              strokeDashoffset={progressOffset}
              className="gauge-progress"
            />
            {/* Needle */}
            <g transform={`rotate(${needleAngle} 100 120)`}>
              <line
                x1="100"
                y1="120"
                x2="100"
                y2="50"
                stroke="#333"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="100" cy="120" r="8" fill="#fff" stroke="#333" strokeWidth="4" />
            </g>
            {/* Percentage value at the tip with %/Sales format */}
            <text
              x={tipX}
              y={percentY}
              textAnchor="middle"
              fontSize="18"
              fontWeight="bold"
              fill={color}
              style={{ userSelect: 'none' }}
            >
              {value.toFixed(2)} %/Sls
            </text>
          </svg>
        </div>
        
        {/* Absolute value as main display */}
        <div className="gauge-absolute" style={{ fontSize: 28, fontWeight: 'bold', color: color, marginBottom: 5 }}>
          <UAEDirhamSymbol /> {absoluteValue}
        </div>
        
        {/* Per kg value with correct format: Đ xx.xx per kg */}
        <div className="gauge-perkg" style={{ fontSize: 16, fontWeight: 'bold', color: color, marginBottom: 5 }}>
          <UAEDirhamSymbol /> {perKgValue} per kg
        </div>
      </div>
      
      {/* Title bar */}
      <div
        className="gauge-title"
        style={{
          backgroundColor: color, // solid color, not faded
          color: color.toLowerCase() === '#ffd700' ? '#333' : '#fff', // dark text for yellow, white for others
          borderColor: color,
          fontSize: 20,
          fontWeight: 'bold',
          letterSpacing: 0.5
        }}
      >
        <span>
          {(() => {
            const words = title.split(' ');
            if (words.length > 1) {
              const lastWord = words[words.length - 1];
              const firstPart = words.slice(0, -1).join(' ');
              return (
                <React.Fragment>
                  {firstPart}
                  <br />
                  {lastWord}
                </React.Fragment>
              );
            }
            return title;
          })()}
        </span>
      </div>
    </div>
  );
};

// ModernMarginGauge - Main Component
const ModernMarginGauge = ({ data, periods, basePeriod, style }) => {

  if (process.env.NODE_ENV === 'development') {
    console.log('ModernMarginGauge received data:', {
      periodCount: periods.length,
      dataKeys: Object.keys(data),
      sampleData: Object.entries(data).map(([key, value]) => ({ 
        period: key, 
        sales: value.sales,
        materialCost: value.materialCost,
        calculatedMargin: value.sales - value.materialCost
      }))
    });
  }

  // Process data for gauges
  const gaugeData = periods.map((period, index) => {
    // FIXED: Use consistent key generation with ChartContainer
    let periodKey;
    if (period.isCustomRange) {
      periodKey = `${period.year}-${period.month}-${period.type}`;
    } else {
      periodKey = `${period.year}-${period.month || 'Year'}-${period.type}`;
    }
    
    const chartData = data[periodKey] || {};
    
    // Get raw data values
    const sales = chartData.sales || 0;
    const materialCost = chartData.materialCost || 0;
    const salesVolume = chartData.salesVolume || 0;
    
    // Calculate absolute margin (Sales - Material Cost)
    const absoluteMargin = sales - materialCost;
    
    // Calculate margin per kg
    const marginPerKg = salesVolume > 0 ? absoluteMargin / salesVolume : 0;
    
    // Calculate margin as percentage of sales for gauge needle
    const marginPercent = sales > 0 ? (absoluteMargin / sales) * 100 : 0;
    
    // Format absolute value for display (in millions)
    const absoluteValue = `${(absoluteMargin / 1000000).toFixed(1)}M`;
    
    // Format per kg value for display (xx.xx format)
    const perKgValue = marginPerKg.toFixed(2);
    
    // Use period-based colors (same logic as other components)
    let color;
    if (period.customColor) {
      const scheme = colorSchemes.find(s => s.name === period.customColor);
      if (scheme) {
        color = scheme.primary;
      }
    } else {
      // Default color assignment based on month/type (same as tables)
      if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
        color = '#FF6B35'; // Orange (light red)
      } else if (period.month === 'January') {
        color = '#FFD700'; // Yellow
      } else if (period.month === 'Year') {
        color = '#288cfa'; // Blue
      } else if (period.type === 'Budget') {
        color = '#2E865F'; // Green
    } else if (index === 0) {
        color = '#FFD700'; // Default first period - yellow
    } else if (index === 1) {
        color = '#288cfa'; // Default second period - blue
    } else if (index === 2) {
        color = '#003366'; // Default third period - dark blue
    } else {
      color = defaultColors[index % defaultColors.length]; // Cycle through default colors
      }
    }
    
    return {
      index,
      value: Math.max(0, Math.min(100, marginPercent)), // Clamp between 0-100 for gauge
      absoluteValue,
      perKgValue,
      color,
      period,
      sales,
      materialCost,
      salesVolume,
      absRaw: absoluteMargin, // For variance calculations
      marginPercent: marginPercent, // Store the margin % for relative variance calculation
      title: `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`,
      periodKey
    };
  });

  // Helper function to create period key (same as in gaugeData processing)
  const createPeriodKey = (period) => {
    if (period.isCustomRange) {
      return `${period.year}-${period.month}-${period.type}`;
    } else {
      return `${period.year}-${period.month || 'Year'}-${period.type}`;
    }
  };

  // Find base period index using the same key format
  const basePeriodObj = periods.find(p => createPeriodKey(p) === basePeriod);
  const baseIndex = basePeriodObj ? gaugeData.findIndex(g => g.periodKey === createPeriodKey(basePeriodObj)) : -1;
  const baseGauge = baseIndex >= 0 ? gaugeData[baseIndex] : null;
  const baseMarginPercent = baseGauge ? baseGauge.marginPercent : 0;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Base period calculation:', {
      basePeriod,
      basePeriodObj,
      baseIndex,
      baseGauge: baseGauge ? { title: baseGauge.title, marginPercent: baseGauge.marginPercent } : null,
      baseMarginPercent,
      allPeriods: periods.map(p => ({ 
        period: p, 
        periodKey: createPeriodKey(p),
        matchesBase: createPeriodKey(p) === basePeriod 
      })),
      allGauges: gaugeData.map(g => ({ title: g.title, periodKey: g.periodKey, marginPercent: g.marginPercent }))
    });
  }
  
  // Calculate variances based on sequential period comparison (margin %)
  const variances = gaugeData.map((g, idx) => {
    if (idx === 0) return null; // First period has no previous period to compare
    const prevGauge = gaugeData[idx - 1];
    if (prevGauge.marginPercent === 0) return null;
    const variance = ((g.marginPercent - prevGauge.marginPercent) / Math.abs(prevGauge.marginPercent)) * 100;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Variance for ${g.title}:`, {
        currentMarginPercent: g.marginPercent,
        previousMarginPercent: prevGauge.marginPercent,
        variance: variance,
        formula: `((${g.marginPercent}% - ${prevGauge.marginPercent}%) / ${Math.abs(prevGauge.marginPercent)}%) * 100 = ${variance}%`
      });
    }
    
    return variance;
  });

  return (
    <div className="modern-margin-gauge-panel" style={{ 
      marginTop: 30, 
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      width: '100%',
      maxWidth: '1200px',
      marginLeft: 'auto',
      marginRight: 'auto',
      boxSizing: 'border-box',
      ...(style || {}) // Apply any style props passed from parent component
    }}>
      <h2 className="modern-gauge-heading" style={{ textAlign: 'center', marginBottom: '10px' }}>Margin over Material</h2>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666', fontStyle: 'italic' }}>
          % variance based on sequential period comparison (current vs previous period)
        </span>
      </div>
      <div className="modern-gauge-container" style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 15,
        width: '100%',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {gaugeData.map((gauge, idx) => (
          <React.Fragment key={gauge.title}>
            <SingleGauge
              value={gauge.value}
              absoluteValue={gauge.absoluteValue}
              perKgValue={gauge.perKgValue}
              title={gauge.title}
              color={gauge.color}
              index={idx}
            />
            {/* Variance badge between cards - show variance for the NEXT card */}
            {idx < gaugeData.length - 1 && (() => {
              const variance = variances[idx + 1]; // This shows variance for the next card
              let badgeColor = '#888', arrow = '–';
              if (variance !== null && !isNaN(variance)) {
                if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
              }
              return (
                <div style={{
                  alignSelf: 'center',
                  margin: '0 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 40,
                  width: 40,
                  height: 60,
                  justifyContent: 'center',
                }}>
                  {variance === null || isNaN(variance) ? (
                    <span style={{ color: '#888', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>0%</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 22, fontWeight: 'bold', color: badgeColor, lineHeight: 1 }}>{arrow}</span>
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: badgeColor, lineHeight: 1.1 }}>{Math.abs(variance).toFixed(1)}</span>
                      <span style={{ fontSize: 16, fontWeight: 'bold', color: badgeColor, lineHeight: 1.1 }}>%</span>
                    </>
                  )}
                </div>
              );
            })()}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ModernMarginGauge;