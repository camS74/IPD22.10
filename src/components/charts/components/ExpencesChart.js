import React from 'react';

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

const KPI_ROWS = [52, 54, 56];
const textColors = ['#333', '#fff', '#fff', '#fff', '#fff'];

function calcVariance(current, prev) {
  if (prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

const ExpencesChart = ({ tableData, selectedPeriods, computeCellValue, style }) => {
  if (!selectedPeriods || selectedPeriods.length === 0 || typeof computeCellValue !== 'function') {
    return (
      <div className="modern-margin-gauge-panel" style={{ marginTop: 60, padding: 20, textAlign: 'center' }}>
        <h2 className="modern-gauge-heading">Expenses Trend</h2>
        <p>No data available. Please select a period.</p>
      </div>
    );
  }

  const periodsToUse = selectedPeriods.slice(0, 5);
  // Use only the first KPI row index for the cards (as in your screenshot)
  const kpiRow = KPI_ROWS[0];

  // Extract data for each period
  const cards = periodsToUse.map((period, idx) => {
    const value = computeCellValue(kpiRow, period);
    const sales = computeCellValue(3, period);
    const salesVolume = computeCellValue(7, period);
    const percentOfSales = (typeof sales === 'number' && sales !== 0) ? (value / sales) * 100 : 0;
    const perKg = (typeof salesVolume === 'number' && salesVolume !== 0) ? value / salesVolume : 0;
    
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
      } else {
        color = defaultColors[idx % defaultColors.length];
      }
    }
    
    return {
      periodName: `${period.year} ${period.isCustomRange ? period.displayName : (period.month || '')} ${period.type}`.trim(),
      value: typeof value === 'number' && !isNaN(value) ? value : 0,
      percentOfSales: percentOfSales,
      perKg: perKg,
      color: color,
      textColor: color === '#FFD700' ? '#333' : '#fff', // Dark text for yellow, white for others
    };
  });

  // Calculate variances between cards
  const variances = cards.map((card, idx) => {
    if (idx === 0) return null;
    return calcVariance(card.value, cards[idx - 1].value);
  });

  return (
    <div className="modern-margin-gauge-panel" style={{
      marginTop: 60,
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      padding: '20px',
      width: '95%',
      marginLeft: 'auto',
      marginRight: 'auto',
      boxSizing: 'border-box',
      ...(style || {})
    }}>
      <h2 className="modern-gauge-heading" style={{
        textAlign: 'center',
        fontSize: '18px',
        marginBottom: '20px',
        color: '#333',
        fontWeight: '600'
      }}>
        Expenses Trend
      </h2>
      <div style={{
        display: 'flex',
        flexWrap: 'nowrap',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        gap: '5px',
        marginTop: 20,
        marginBottom: 0,
        width: '100%',
        padding: '0 24px',
      }}>
        {cards.map((card, idx) => (
          <React.Fragment key={card.periodName}>
            {/* Card */}
            <div style={{
              padding: '12px 15px',
              borderRadius: '6px',
              backgroundColor: card.color,
              border: `1px solid ${card.color}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
              minWidth: '150px',
              maxWidth: '180px',
              flex: '1',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              color: card.textColor,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.07)';
            }}>
              <div style={{ fontSize: 14, color: card.textColor, fontWeight: 500, marginTop: 4 }}>{card.periodName}</div>
              <div style={{ fontWeight: 'bold', fontSize: 22, color: card.textColor, marginTop: 8 }}>
                {card.value ? (card.value / 1000000).toFixed(2) + 'M' : '0.00M'}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 'bold',
                color: card.textColor,
                marginTop: 8,
                width: '100%'
              }}>
                <div>{card.percentOfSales.toFixed(1)}%/Sls</div>
                <div>{card.perKg.toFixed(1)} per kg</div>
              </div>
            </div>
            {/* Variance badge between cards */}
            {idx < cards.length - 1 && (
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
                {variances[idx + 1] === null || isNaN(variances[idx + 1]) ? (
                  <span style={{ color: '#888', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>N/A</span>
                ) : (
                  <>
                    <span style={{
                      fontSize: 22,
                      fontWeight: 'bold',
                      color: variances[idx + 1] > 0 ? '#2E865F' : variances[idx + 1] < 0 ? '#cf1322' : '#888',
                      lineHeight: 1,
                    }}>
                      {variances[idx + 1] > 0 ? '▲' : variances[idx + 1] < 0 ? '▼' : '–'}
                    </span>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: variances[idx + 1] > 0 ? '#2E865F' : variances[idx + 1] < 0 ? '#cf1322' : '#888',
                      lineHeight: 1.1,
                    }}>
                      {Math.abs(variances[idx + 1]).toFixed(1)}
                    </span>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: variances[idx + 1] > 0 ? '#2E865F' : variances[idx + 1] < 0 ? '#cf1322' : '#888',
                      lineHeight: 1.1,
                    }}>
                      %
                    </span>
                  </>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ExpencesChart; 