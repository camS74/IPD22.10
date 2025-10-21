import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getProductGroupsForSalesRep } from '../dashboard/SalesBySaleRepTable';

const BudgetAchievementChart = ({ reportData, kgsData }) => {
  const budgetChartRef = useRef(null);
  const budgetChartInstance = useRef(null);
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Single option (HTML concept). Option 1 removed.

  // Fetch budget data from database
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!reportData?.salesRep || !reportData?.basePeriodIndex) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Prefer already-prepared kgsData to ensure identical filtering/order as YoY
        if (Array.isArray(kgsData) && kgsData.length > 0) {
          setBudgetData(kgsData);
          return;
        }

        // Otherwise fetch fresh from the same source method
        const division = (reportData?.selectedDivision || reportData?.division || 'FP');
        const data = await getProductGroupsForSalesRep(
          reportData.salesRep,
          'KGS',
          reportData.columnOrder,
          division
        );
        setBudgetData(data);
      } catch (error) {
        console.error('Error fetching budget data:', error);
        setError('Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [reportData?.salesRep, reportData?.basePeriodIndex, reportData?.columnOrder, reportData?.selectedDivision, kgsData]);

  // Create budget achievement chart
  useEffect(() => {
    if (budgetData && budgetChartRef.current) {
      createBudgetAchievementChart();
    }

    return () => {
      if (budgetChartInstance.current) {
        budgetChartInstance.current.destroy();
      }
      
      // Clean up any HTML elements created by Option 2
      const chartContainer = budgetChartRef.current?.parentElement;
      if (chartContainer) {
        const elementsToRemove = [
          '.html-chart-container',
          '.metrics-labels',
          '.custom-chart-labels', 
          '.custom-budget-chart'
        ];
        
        elementsToRemove.forEach(selector => {
          const element = chartContainer.querySelector(selector);
          if (element) element.remove();
        });
      }
    };
  }, [budgetData]);

  const createBudgetAchievementChart = () => {
    if (!budgetChartRef.current || !budgetData) return;

    // Destroy existing chart
    if (budgetChartInstance.current) {
      budgetChartInstance.current.destroy();
    }

    const ctx = budgetChartRef.current.getContext('2d');
    
    // Process the budget data
    const productGroups = budgetData.map(item => {
      const actualValue = item.rawValues?.[reportData.basePeriodIndex] || 0;
      
      // Find period budget (HY1 Budget) - usually next period
      const periodBudgetValue = item.rawValues?.[reportData.basePeriodIndex + 1] || 0;
      
      // Find yearly budget - look for year budget column
      const yearBudgetIndex = reportData.yearBudgetIndex || (reportData.basePeriodIndex + 2);
      const yearBudgetValue = item.rawValues?.[yearBudgetIndex] || 0;

      return {
        productGroup: item.productGroup || item.name,
        actualValue,
        periodBudgetValue,
        yearBudgetValue,
        periodAchievement: periodBudgetValue > 0 ? (actualValue / periodBudgetValue) * 100 : 0,
        yearAchievement: yearBudgetValue > 0 ? (actualValue / yearBudgetValue) * 100 : 0,
        periodDelta: actualValue - periodBudgetValue,
        yearDelta: actualValue - yearBudgetValue
      };
    });

    // Filter and sort
    const filteredGroups = productGroups.filter(item => 
      item.actualValue > 0 || item.periodBudgetValue > 0 || item.yearBudgetValue > 0
    );
    
    filteredGroups.sort((a, b) => b.actualValue - a.actualValue);
    const topGroups = filteredGroups.slice(0, 12); // Show more items for comparison

    if (topGroups.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📊 Budget Achievement Analysis', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
      ctx.font = '14px Arial';
      ctx.fillText('No budget data available for comparison.', ctx.canvas.width / 2, ctx.canvas.height / 2 + 10);
      return;
    }

    // Only Option 2 (HTML concept)
    createActualOnlyChart(ctx, topGroups);
  };

  // OPTION 2: Recreate your HTML concept using pure CSS/HTML within React
  const createActualOnlyChart = (ctx, topGroups) => {
    // Hide the canvas - we'll use pure HTML/CSS like your concept
    budgetChartRef.current.style.display = 'none';
    
    // Get container and clear any existing content
    const chartContainer = budgetChartRef.current.parentElement;
    
    // Remove ALL old chart elements and panels
    const existing = chartContainer.querySelector('.html-chart-container');
    if (existing) existing.remove();
    
    const oldMetrics = chartContainer.querySelector('.metrics-labels');
    if (oldMetrics) oldMetrics.remove();
    
    const oldCustomLabels = chartContainer.querySelector('.custom-chart-labels');
    if (oldCustomLabels) oldCustomLabels.remove();
    
    const oldCustomChart = chartContainer.querySelector('.custom-budget-chart');
    if (oldCustomChart) oldCustomChart.remove();

    // Filter and sort data
    const actualGroups = topGroups.filter(item => {
      const hasBudget = (item.periodBudgetValue > 0) || (item.yearBudgetValue > 0);
      const actualAtLeastOneMT = (item.actualValue >= 1000); // >= 1 MT
      return actualAtLeastOneMT || hasBudget;
    });
    actualGroups.sort((a, b) => b.actualValue - a.actualValue);

    // Create main container
    const htmlContainer = document.createElement('div');
    htmlContainer.className = 'html-chart-container';
    htmlContainer.style.cssText = `
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial;
      background: transparent;
      border: 0;
      border-radius: 0;
      padding: 0;
      margin: 0 0 16px 0;
      width: 100%;
      max-width: none; /* allow full container width */
      overflow: visible;
      `;

    // Build legend labels based on selected period
    const bp = reportData?.basePeriod || {};
    const rawBaseText = bp.displayName || bp.label || bp.name || '';
    let derivedBase = '';
    if (rawBaseText) {
      derivedBase = rawBaseText.replace(/actual/i, 'Budget');
      if (derivedBase === rawBaseText) {
        derivedBase = `${rawBaseText} Budget`;
      }
    } else {
      const part = bp.quarter || bp.hy || bp.month || bp.code || bp.short || 'Base Period';
      const year = bp.year ? ` ${bp.year}` : '';
      derivedBase = `${part}${year} Budget`;
    }
    const baseLabel = derivedBase;
    const actualLegend = rawBaseText
      ? (/actual/i.test(rawBaseText) ? rawBaseText : `${rawBaseText} Actual`)
      : `${(bp.quarter || bp.hy || bp.month || bp.code || bp.short || 'Base Period')}${bp.year ? ` ${bp.year}` : ''} Actual`;
    const fyLegend = bp.year ? `FY ${bp.year} Budget` : 'FY Budget';

    // Inject legend (title removed; page already has a heading)
    htmlContainer.innerHTML = `
      <!-- Legend (no card wrapper) -->
      <div style="display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 24px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 14px; height: 14px; background: #F1C40F; border-radius: 3px;"></span>
            <span style="color: #6b7280; font-size: 12px;">${actualLegend}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 14px; height: 14px; background: #1B4F72; border-radius: 3px;"></span>
            <span style="color: #6b7280; font-size: 12px;">${baseLabel}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 14px; height: 14px; background: #5DADE2; border-radius: 3px;"></span>
            <span style="color: #6b7280; font-size: 12px;">${fyLegend}</span>
          </div>
        </div>
      </div>
    `;

    // Add product group rows
    const rowsContainer = document.createElement('div');
    
    // baseLabel already computed above

    actualGroups.forEach(item => {
      const actualMT = item.actualValue / 1000;
      const periodBudgetMT = item.periodBudgetValue / 1000;
      const yearBudgetMT = item.yearBudgetValue / 1000;
      const periodDelta = item.periodDelta / 1000;
      const yearDelta = item.yearDelta / 1000;

      // Calculate max value for THIS product (not global) - longest bar takes full width
      const maxValue = Math.max(actualMT, periodBudgetMT, yearBudgetMT) * 1.05;

      // Calculate bar widths as percentages (relative to this product's max)
      const actualWidth = (actualMT / maxValue) * 100;
      const periodBudgetWidth = (periodBudgetMT / maxValue) * 100;
      const yearBudgetWidth = (yearBudgetMT / maxValue) * 100;

      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = `
        padding: 10px 0;
        border-bottom: 1px dashed #e5e7eb;
        margin-bottom: 0;
      `;

      rowDiv.innerHTML = `
        <!-- Product Group Title -->
        <div style="font-size: 14px; font-weight: 700; color: #374151; margin: 0 0 10px 2px;">
          ${item.productGroup}
        </div>
        
        <!-- Three Bars -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          
        <!-- HY1 Actual Bar -->
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="flex: 1; height: 24px; background: transparent; position: relative;">
            <div style="height: 100%; width: ${actualWidth}%; background: #F1C40F; border-radius: 3px;"></div>
          </div>
          <div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #111827;">
            ${actualMT >= 1 ? `${Math.round(actualMT)} MT` : ''}
          </div>
          <div style="width: 200px; text-align: right; font-size: 12px; line-height: 1.3; padding-left: 10px; white-space: nowrap;">
            <span style="color: #6b7280;">vs HY1 Budget: </span>
            <span style="color: ${item.periodAchievement >= 100 ? '#1f6feb' : '#dc2626'}; font-weight: 800;">${item.periodAchievement.toFixed(1)}%</span>
            <span style="color: ${periodDelta >= 0 ? '#1f6feb' : '#dc2626'};"> (${periodDelta >= 0 ? '+' : ''}${periodDelta.toFixed(1)} MT)</span>
          </div>
        </div>
          
        <!-- HY1 Budget Bar -->
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="flex: 1; height: 24px; background: transparent; position: relative;">
            ${periodBudgetMT > 0 
              ? `<div style=\"height: 100%; width: ${periodBudgetWidth}%; background: #1B4F72; border-radius: 3px;\"></div>`
              : `<div style=\"width: 100%; text-align: center; color: #6b7280; font-size: 12px; line-height: 24px;\">Not budgeted</div>`}
          </div>
          <div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #1B4F72;">
            ${periodBudgetMT > 0 ? `${Math.round(periodBudgetMT)} MT` : ''}
          </div>
          <div style="width: 200px; text-align: right; font-size: 12px; padding-left: 10px;">
            <div style="color: #6b7280;">${baseLabel}</div>
          </div>
        </div>
          
        <!-- FY Budget Bar -->
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="flex: 1; height: 24px; background: transparent; position: relative;">
            ${yearBudgetMT > 0 
              ? `<div style=\"height: 100%; width: ${yearBudgetWidth}%; background: #5DADE2; border-radius: 3px;\"></div>`
              : `<div style=\"width: 100%; text-align: center; color: #6b7280; font-size: 12px; line-height: 24px;\">Not budgeted</div>`}
          </div>
          <div style="min-width: 50px; font-size: 12px; font-weight: 700; color: #0f6085;">
            ${yearBudgetMT > 0 ? `${Math.round(yearBudgetMT)} MT` : ''}
          </div>
          <div style="width: 200px; text-align: right; font-size: 12px; line-height: 1.3; padding-left: 10px; white-space: nowrap;">
            <span style="color: #6b7280;">vs FY Budget: </span>
            <span style="color: ${item.yearAchievement >= 100 ? '#1f6feb' : '#dc2626'}; font-weight: 800;">${item.yearAchievement.toFixed(1)}%</span>
            <span style="color: ${yearDelta >= 0 ? '#1f6feb' : '#dc2626'};"> (${yearDelta >= 0 ? '+' : ''}${yearDelta.toFixed(1)} MT)</span>
          </div>
        </div>
          
        </div>
      `;

      rowsContainer.appendChild(rowDiv);
    });

    htmlContainer.appendChild(rowsContainer);
    chartContainer.appendChild(htmlContainer);
  };

  if (loading) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading budget data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 0' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Budget Achievement</h3>
      <p style={{fontStyle: 'italic', color: '#666', margin: '0 0 12px 0', fontSize: '13px'}}>
        HY1 Actual vs Budget and FY Budget: bars show MT; right side shows % and MT delta.
      </p>
      <div className="chart-container" style={{ overflow: 'visible' }}>
        <canvas ref={budgetChartRef} id="budgetAchievementChart"></canvas>
      </div>
    </div>
  );
};

export default BudgetAchievementChart;
