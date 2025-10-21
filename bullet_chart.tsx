import React from 'react';

const BulletChart = () => {
  const data = [
    {
      productGroup: 'Electronics',
      hy1Actual: 450000,
      hy1Budget: 420000,
      fullYearBudget: 900000,
      color: '#3b82f6'
    },
    {
      productGroup: 'Furniture',
      hy1Actual: 320000,
      hy1Budget: 380000,
      fullYearBudget: 750000,
      color: '#ef4444'
    },
    {
      productGroup: 'Clothing',
      hy1Actual: 280000,
      hy1Budget: 250000,
      fullYearBudget: 550000,
      color: '#10b981'
    },
    {
      productGroup: 'Sports',
      hy1Actual: 180000,
      hy1Budget: 200000,
      fullYearBudget: 400000,
      color: '#f59e0b'
    },
    {
      productGroup: 'Books',
      hy1Actual: 95000,
      hy1Budget: 100000,
      fullYearBudget: 200000,
      color: '#8b5cf6'
    },
    {
      productGroup: 'Home & Garden',
      hy1Actual: 410000,
      hy1Budget: 350000,
      fullYearBudget: 720000,
      color: '#06b6d4'
    }
  ];

  const enrichedData = data.map(item => ({
    ...item,
    hy1VsHy1BudgetPct: ((item.hy1Actual / item.hy1Budget) * 100),
    hy1VsHy1BudgetDelta: item.hy1Actual - item.hy1Budget,
    hy1VsFullYearPct: ((item.hy1Actual / item.fullYearBudget) * 100),
    hy1VsFullYearDelta: item.hy1Actual - (item.fullYearBudget / 2),
  }));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const BulletChartRow = ({ item, maxValue, type }) => {
    const target = type === 'hy1' ? item.hy1Budget : item.fullYearBudget / 2;
    const actual = item.hy1Actual;
    const percentage = type === 'hy1' ? item.hy1VsHy1BudgetPct : item.hy1VsFullYearPct;
    const delta = type === 'hy1' ? item.hy1VsHy1BudgetDelta : item.hy1VsFullYearDelta;

    const actualWidth = (actual / maxValue) * 100;
    const targetWidth = (target / maxValue) * 100;

    const performanceRanges = [
      { min: 0, max: 0.7 * target, color: '#fecaca', label: 'Poor' },
      { min: 0.7 * target, max: 0.9 * target, color: '#fed7aa', label: 'Fair' },
      { min: 0.9 * target, max: target, color: '#fef3c7', label: 'Good' },
      { min: target, max: 1.2 * target, color: '#dcfce7', label: 'Excellent' }
    ];

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {item.productGroup} - {type === 'hy1' ? 'vs HY1 Budget' : 'vs Full Year Budget'}
          </span>
          <div className="text-right">
            <span className={`text-sm font-semibold ${percentage >= 100 ? 'text-green-600' : percentage >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
              {percentage.toFixed(1)}%
            </span>
            <span className={`text-xs ml-2 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({delta >= 0 ? '+' : ''}{formatCurrency(delta)})
            </span>
          </div>
        </div>
        
        <div className="relative h-8 bg-gray-100 rounded">
          {/* Performance ranges */}
          {performanceRanges.map((range, index) => (
            <div
              key={index}
              className="absolute h-full"
              style={{
                left: `${(range.min / maxValue) * 100}%`,
                width: `${((Math.min(range.max, maxValue) - range.min) / maxValue) * 100}%`,
                backgroundColor: range.color,
              }}
            />
          ))}
          
          {/* Target line */}
          <div
            className="absolute h-full w-1 bg-gray-800 z-10"
            style={{ left: `${targetWidth}%` }}
          />
          
          {/* Actual bar */}
          <div
            className="absolute h-6 top-1 rounded z-20"
            style={{
              width: `${actualWidth}%`,
              backgroundColor: item.color,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatCurrency(0)}</span>
          <span>Target: {formatCurrency(target)}</span>
          <span>Actual: {formatCurrency(actual)}</span>
          <span>{formatCurrency(maxValue)}</span>
        </div>
      </div>
    );
  };

  const maxValue = Math.max(...enrichedData.map(item => Math.max(item.hy1Actual, item.hy1Budget, item.fullYearBudget / 2))) * 1.1;

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Bullet Chart Performance Analysis</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* HY1 vs HY1 Budget */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">HY1 Actual vs HY1 Budget</h2>
          {enrichedData.map((item, index) => (
            <BulletChartRow key={`hy1-${index}`} item={item} maxValue={maxValue} type="hy1" />
          ))}
        </div>

        {/* HY1 vs Full Year Budget */}
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">HY1 Actual vs Full Year Target (50%)</h2>
          {enrichedData.map((item, index) => (
            <BulletChartRow key={`fy-${index}`} item={item} maxValue={maxValue} type="fy" />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-200 rounded"></div>
            <span className="text-sm">Poor (&lt;70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-200 rounded"></div>
            <span className="text-sm">Fair (70-90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-200 rounded"></div>
            <span className="text-sm">Good (90-100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <span className="text-sm">Excellent (&gt;100%)</span>
          </div>
        </div>
        <div className="mt-2 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-blue-500 rounded"></div>
            <span className="text-sm">Actual Performance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-4 bg-gray-800"></div>
            <span className="text-sm">Target Line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulletChart;