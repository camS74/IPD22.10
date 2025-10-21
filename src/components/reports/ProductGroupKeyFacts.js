import React, { useMemo, useEffect } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import UAEDirhamSymbol from '../dashboard/UAEDirhamSymbol';

/**
 * ProductGroupKeyFacts - Enhanced with V3 Business Logic
 * 
 * Key Features:
 * - Robust period detection with intelligent budget finding
 * - Materiality scoring using budget share × actual share
 * - Budget-focused analysis (ignores zero-budget items)
 * - Proper AED currency formatting
 * - Configurable thresholds for business rules
 * - Name-keyed merge for safer data alignment
 * - Run-rate analysis and YTD tracking
 */

// ====== BUSINESS CONFIGURATION ===============================================
const BUDGET_SHARE_MIN = 0.05;     // minimum budget share to include in "high-budget" focus (5%)
const CUM_BUDGET_TARGET = 0.70;    // ensure coverage of at least 70% of budget cumulatively
const MAX_FOCUS_ITEMS = 8;         // cap number of focused high-budget items
const MAX_LIST_ITEMS = 5;          // cap for critical and strong lists

const UNDERPERF_VOL_PCT = -15;     // volume vs budget % threshold for underperformance
const UNDERPERF_AMT_PCT = -15;     // sales vs budget % threshold for underperformance
const UNDERPERF_YOY_VOL = -10;     // yoy volume % threshold for underperformance

const GROWTH_VOL_PCT = 10;         // volume vs budget % threshold for growth driver
const GROWTH_AMT_PCT = 10;         // sales vs budget % threshold for growth driver
const GROWTH_YOY_VOL = 15;         // yoy volume % threshold for growth driver

const ASP_DELTA_SHOW = 5;          // show ASP premium/discount when abs(delta%) >= 5
const RUNRATE_WARN = 0.85;         // run-rate warning threshold (85% of FY budget by now)

// ====== UTILITIES ============================================================
const isNil = (v) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

const formatNumber = (num, type = 'default') => {
  if (isNil(num)) return 'N/A';

  if (type === 'mt') {
    const mt = num / 1000;
    if (mt >= 1000) return Math.round(mt).toLocaleString() + ' MT';
    if (mt >= 100) return Math.round(mt) + ' MT';
    return mt.toFixed(1) + ' MT';
  }

  if (type === 'amount') {
    // UAE Dirham formatting with proper symbol for millions display
    const millions = num / 1000000;
    if (millions >= 1) {
      return (
        <>
          <UAEDirhamSymbol />
          {millions.toFixed(1)}M
        </>
      );
    }
    const thousands = num / 1000;
    if (thousands >= 1) {
      return (
        <>
          <UAEDirhamSymbol />
          {thousands.toFixed(0)}K
        </>
      );
    }
    return (
      <>
        <UAEDirhamSymbol />
        {Math.round(num).toLocaleString()}
      </>
    );
  }

  if (type === 'asp') {
    // ASP formatting without compact notation to avoid awkward currency/kg combinations
    return (
      <>
        <UAEDirhamSymbol />
        {Math.round(num).toLocaleString()}
      </>
    );
  }

  if (type === 'percentage') {
    const signless = Math.abs(num).toFixed(1);
    return `${signless}%`;
  }

  return Number(num).toFixed(1);
};

const normalize = (s) => (s || '').toString().trim().toLowerCase();

const isYTDCol = (c) => c?.type === 'Actual' && ['ytd','yrtodate','year-to-date'].includes(normalize(c?.month));
const isFYCol = (c) => c?.type === 'Actual' && ['fy','full year','fullyear','full-year','full_year'].includes(normalize(c?.month));
const isBudgetColGeneric = (c) => normalize(c?.type) === 'budget' || normalize(c?.type) === 'fy budget' || normalize(c?.type) === 'full year budget';

const monthToNumber = (m) => {
  if (m == null) return null;
  const x = normalize(m);
  const map = {
    'jan':1,'january':1,
    'feb':2,'february':2,
    'mar':3,'march':3,
    'apr':4,'april':4,
    'may':5,
    'jun':6,'june':6,
    'jul':7,'july':7,
    'aug':8,'august':8,
    'sep':9,'sept':9,'september':9,
    'oct':10,'october':10,
    'nov':11,'november':11,
    'dec':12,'december':12
  };
  if (!isNaN(parseInt(x))) {
    const n = parseInt(x);
    return (n>=1 && n<=12) ? n : null;
  }
  return map[x] ?? null;
};

/** Robust budget locator with intelligent fallbacks */
const findBudgetIndex = (columnOrder, basePeriodIndex) => {
  if (!Array.isArray(columnOrder) || basePeriodIndex == null) return -1;
  const base = columnOrder[basePeriodIndex];
  
  // 1) Strict match: same year & month & type Budget
  const strict = columnOrder.findIndex((c) =>
    normalize(c?.type) === 'budget' &&
    c?.year === base?.year &&
    normalize(c?.month) === normalize(base?.month)
  );
  if (strict !== -1) return strict;

  // 2) FY budget (prefer explicit FY)
  const fyBudget = columnOrder.findIndex((c) =>
    isBudgetColGeneric(c) && (isFYCol(c) || ['fy','fullyear','full year'].includes(normalize(c?.month)))
  );
  if (fyBudget !== -1) return fyBudget;

  // 3) Any budget
  const anyBudget = columnOrder.findIndex((c) => isBudgetColGeneric(c));
  return anyBudget !== -1 ? anyBudget : -1;
};

const safeSumAt = (index, dataArr) => {
  if (index < 0 || !Array.isArray(dataArr)) return 0;
  return dataArr.reduce((s, it) => {
    const v = parseFloat(it?.rawValues?.[index] ?? 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
};

const ratioPct = (a, b) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return ((a - b) / b) * 100;
};

const ProductGroupKeyFacts = ({ kgsData, amountData, onFindingsCalculated }) => {
  const { columnOrder, basePeriodIndex } = useFilter();


  const calculateKeyFindings = () => {
    if (!kgsData || !amountData || !columnOrder || basePeriodIndex === null) return null;

    // ====== ROBUST PERIOD DETECTION ==========================================
    const basePeriod = columnOrder[basePeriodIndex];
    const budgetIndex = findBudgetIndex(columnOrder, basePeriodIndex);
    
    // Previous year: same month, previous year
    const previousYearIndex = columnOrder.findIndex(col => 
      col.type === 'Actual' && 
      col.year === basePeriod.year - 1 && 
      normalize(col.month) === normalize(basePeriod.month)
    );
    
    // YTD and FY detection with robust matching
    const ytdCurrentIndex = columnOrder.findIndex(col => isYTDCol(col) && col.year === basePeriod.year);
    const ytdPreviousIndex = columnOrder.findIndex(col => isYTDCol(col) && col.year === (basePeriod.year - 1));
    const fyCurrentIndex = columnOrder.findIndex(col => isFYCol(col) && col.year === basePeriod.year);
    const fyPreviousIndex = columnOrder.findIndex(col => isFYCol(col) && col.year === (basePeriod.year - 1));
    const fyBudgetIndex = columnOrder.findIndex(col => 
      isBudgetColGeneric(col) && 
      col.year === basePeriod.year && 
      (isFYCol(col) || normalize(col.month) === 'fy')
    );

    // ====== PORTFOLIO TOTALS ==============================================
    const totalMTActual = safeSumAt(basePeriodIndex, kgsData);
    const totalAmountActual = safeSumAt(basePeriodIndex, amountData);
    const totalMTBudget = budgetIndex >= 0 ? safeSumAt(budgetIndex, kgsData) : 0;
    const totalAmountBudget = budgetIndex >= 0 ? safeSumAt(budgetIndex, amountData) : 0;
    const totalMTPrevious = previousYearIndex >= 0 ? safeSumAt(previousYearIndex, kgsData) : 0;
    const totalAmountPrevious = previousYearIndex >= 0 ? safeSumAt(previousYearIndex, amountData) : 0;
    
    // FY Budget totals for preference calculations
    const totalMTFYBudget = fyBudgetIndex >= 0 ? safeSumAt(fyBudgetIndex, kgsData) : 0;
    const totalAmountFYBudget = fyBudgetIndex >= 0 ? safeSumAt(fyBudgetIndex, amountData) : 0;

    // Calculate monthsRemaining early for use in product analysis
    const monthsRemaining = (() => {
      const monthNum = monthToNumber(basePeriod?.month);
      return monthNum ? Math.max(0, 12 - monthNum) : null;
    })();

    // ====== VARIANCE CALCULATIONS =========================================
    const mtVsBudget = ratioPct(totalMTActual, totalMTBudget);
    const amtVsBudget = ratioPct(totalAmountActual, totalAmountBudget);
    const mtYoY = ratioPct(totalMTActual, totalMTPrevious);
    const amtYoY = ratioPct(totalAmountActual, totalAmountPrevious);

    // ====== RUN-RATE ANALYSIS =============================================
    // Fix #1: Run-rate uses FY Budget when present, else period Budget
    let runRateInfo = null;
    if (ytdCurrentIndex >= 0) {
      const ytdAmount = safeSumAt(ytdCurrentIndex, amountData);
      
      // Prefer FY Budget, fallback to period budget
      const fyAmountBudget = fyBudgetIndex >= 0 ? safeSumAt(fyBudgetIndex, amountData) : 0;
      const denomBudgetAmt = fyAmountBudget > 0 ? fyAmountBudget : totalAmountBudget;
      
      if (denomBudgetAmt > 0) {
        const runRate = ytdAmount / denomBudgetAmt;
        const budgetType = fyAmountBudget > 0 ? 'FY budget' : 'period budget';
        const runRatePct = (runRate * 100).toFixed(1);
        
        // Always show percentage, append warning only when below threshold
        runRateInfo = `Run-rate vs ${budgetType}: ${runRatePct}%`;
        if (runRate < RUNRATE_WARN) {
          runRateInfo += ` - below ${(RUNRATE_WARN * 100).toFixed(0)}% threshold`;
        }
      }
    }

    // Calculate totals helper for backward compatibility
    const calcTotal = (data, index) => {
      if (index === -1) return 0;
      return data.reduce((sum, item) => {
        const value = parseFloat(item.rawValues?.[index] || 0);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    };

    // ====== NAME-KEYED MERGE FOR PRODUCT ANALYSIS ========================
    const mergedData = [];
    const amountByName = {};
    amountData.forEach(item => {
      amountByName[normalize(item.name)] = item;
    });

    kgsData.forEach(kgItem => {
      const normalizedName = normalize(kgItem.name);
      const amountItem = amountByName[normalizedName];
      if (amountItem) {
        mergedData.push({ kg: kgItem, amount: amountItem });
      }
    });

    // ====== PER-PRODUCT STATISTICS =======================================
    const productAnalysis = mergedData.map(({ kg: kgItem, amount: amountItem }) => {
      // Current period
      const mtActual = parseFloat(kgItem.rawValues?.[basePeriodIndex] || 0);
      const amountActual = parseFloat(amountItem.rawValues?.[basePeriodIndex] || 0);
      
      // Budget
      const mtBudget = budgetIndex >= 0 ? parseFloat(kgItem.rawValues?.[budgetIndex] || 0) : 0;
      const amountBudget = budgetIndex >= 0 ? parseFloat(amountItem.rawValues?.[budgetIndex] || 0) : 0;
      
      // Previous year
      const mtPrevYear = previousYearIndex >= 0 ? parseFloat(kgItem.rawValues?.[previousYearIndex] || 0) : 0;
      const amountPrevYear = previousYearIndex >= 0 ? parseFloat(amountItem.rawValues?.[previousYearIndex] || 0) : 0;
      
      // YTD values
      const mtYTDCurrent = ytdCurrentIndex !== -1 ? parseFloat(kgItem.rawValues?.[ytdCurrentIndex] || 0) : 0;
      const amountYTDCurrent = ytdCurrentIndex !== -1 ? parseFloat(amountItem.rawValues?.[ytdCurrentIndex] || 0) : 0;
      const mtYTDPrevious = ytdPreviousIndex !== -1 ? parseFloat(kgItem.rawValues?.[ytdPreviousIndex] || 0) : 0;
      const amountYTDPrevious = ytdPreviousIndex !== -1 ? parseFloat(amountItem.rawValues?.[ytdPreviousIndex] || 0) : 0;

      // FY values
      const mtFYCurrent = fyCurrentIndex !== -1 ? parseFloat(kgItem.rawValues?.[fyCurrentIndex] || 0) : 0;
      const amountFYCurrent = fyCurrentIndex !== -1 ? parseFloat(amountItem.rawValues?.[fyCurrentIndex] || 0) : 0;
      const mtFYPrevious = fyPreviousIndex !== -1 ? parseFloat(kgItem.rawValues?.[fyPreviousIndex] || 0) : 0;
      const amountFYPrevious = fyPreviousIndex !== -1 ? parseFloat(amountItem.rawValues?.[fyPreviousIndex] || 0) : 0;
      const mtFYBudget = fyBudgetIndex !== -1 ? parseFloat(kgItem.rawValues?.[fyBudgetIndex] || 0) : 0;
      const amountFYBudget = fyBudgetIndex !== -1 ? parseFloat(amountItem.rawValues?.[fyBudgetIndex] || 0) : 0;

      // ====== MATERIALITY SCORING =======================================
      // V3's sophisticated materiality: budget share × actual share
      // Fix #3: Budget share = max(AmountShare, VolumeShare) to respect MT-only budgets
      // Fix: Prefer FY Budget totals when available as denominators
      const totalAmtBudSafe = totalAmountFYBudget > 0 ? totalAmountFYBudget : totalAmountBudget;
      const totalMtBudSafe = totalMTFYBudget > 0 ? totalMTFYBudget : totalMTBudget;
      // Use FY-first numerators for budget share calculation
      const amountNumerator = amountFYBudget || amountBudget;
      const mtNumerator = mtFYBudget || mtBudget;
      const amountBudgetShare = totalAmtBudSafe > 0 ? amountNumerator / totalAmtBudSafe : 0;
      const mtBudgetShare = totalMtBudSafe > 0 ? mtNumerator / totalMtBudSafe : 0;
      const budgetShare = Math.max(amountBudgetShare, mtBudgetShare);
      
      const amountActualShare = totalAmountActual > 0 ? amountActual / totalAmountActual : 0;
      const mtActualShare = totalMTActual > 0 ? mtActual / totalMTActual : 0;
      const actualShare = Math.max(amountActualShare, mtActualShare);
      const materialityScore = budgetShare * actualShare;
      
      // Legacy compatibility
      const budgetWeight = totalMTBudget > 0 ? (mtBudget / totalMTBudget) * 100 : 0;
      const actualContribution = totalMTActual > 0 ? (mtActual / totalMTActual) * 100 : 0;
      const strategicScore = budgetWeight * 0.6 + actualContribution * 0.4;

      // ====== VARIANCE CALCULATIONS =====================================
      const mtVariance = ratioPct(mtActual, mtBudget);
      const amountVariance = ratioPct(amountActual, amountBudget);
      const mtYoY = ratioPct(mtActual, mtPrevYear);
      const amountYoY = ratioPct(amountActual, amountPrevYear);

      // YTD YoY
      const mtYTDGrowth = mtYTDPrevious > 0 ? ((mtYTDCurrent - mtYTDPrevious) / mtYTDPrevious) * 100 : null;
      const amountYTDGrowth = amountYTDPrevious > 0 ? ((amountYTDCurrent - amountYTDPrevious) / amountYTDPrevious) * 100 : null;

      // FY comparison
      const mtFYGrowth = mtFYPrevious > 0 ? ((mtFYCurrent - mtFYPrevious) / mtFYPrevious) * 100 : null;
      const amountFYGrowth = amountFYPrevious > 0 ? ((amountFYCurrent - amountFYPrevious) / amountFYPrevious) * 100 : null;
      const mtFYBudgetVar = mtFYBudget > 0 ? ((mtFYCurrent - mtFYBudget) / mtFYBudget) * 100 : null;
      const amountFYBudgetVar = amountFYBudget > 0 ? ((amountFYCurrent - amountFYBudget) / amountFYBudget) * 100 : null;

      // ====== ASP ANALYSIS ==============================================
      const currentASP = mtActual > 0 ? amountActual / mtActual : 0;
      const budgetASP = mtBudget > 0 ? amountBudget / mtBudget : 0;
      const prevYearASP = mtPrevYear > 0 ? amountPrevYear / mtPrevYear : 0;
      const aspVsBudgetPct = ratioPct(currentASP, budgetASP);
      const aspYoYPct = ratioPct(currentASP, prevYearASP);

      // ====== STRATEGIC CATEGORIZATION ================================
      // Budget-focused analysis (ignore zero-budget items)
      const isHighBudget = budgetShare >= BUDGET_SHARE_MIN;
      
      // Critical Underperformers
      const isCritical = isHighBudget && (
        (mtVariance !== null && mtVariance <= UNDERPERF_VOL_PCT) ||
        (amountVariance !== null && amountVariance <= UNDERPERF_AMT_PCT) ||
        (mtYoY !== null && mtYoY <= UNDERPERF_YOY_VOL)
      );

      // Growth Drivers
      const isGrowthDriver = isHighBudget && (
        (mtVariance !== null && mtVariance >= GROWTH_VOL_PCT) ||
        (amountVariance !== null && amountVariance >= GROWTH_AMT_PCT) ||
        (mtYoY !== null && mtYoY >= GROWTH_YOY_VOL)
      );

      // ====== PRODUCT CATCH-UP CALCULATIONS ============================
      const productRemainingMt = (() => {
        const fyBudgetMt = mtFYBudget || mtBudget;
        const currentMt = mtYTDCurrent || mtActual;
        return Math.max(0, (fyBudgetMt || 0) - (currentMt || 0));
      })();
      
      const productRemainingAmt = (() => {
        const fyBudgetAmt = amountFYBudget || amountBudget;
        const currentAmt = amountYTDCurrent || amountActual;
        return Math.max(0, (fyBudgetAmt || 0) - (currentAmt || 0));
      })();
      
      const productPerMonthMt = (() => {
        return (monthsRemaining && monthsRemaining > 0) ? (productRemainingMt / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);
      })();
      
      const productPerMonthAmt = (() => {
        return (monthsRemaining && monthsRemaining > 0) ? (productRemainingAmt / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);
      })();

      return {
        name: kgItem.name,
        mtActual, amountActual, mtBudget, amountBudget,
        mtPrevYear, amountPrevYear,
        mtYTDCurrent, amountYTDCurrent, mtYTDPrevious, amountYTDPrevious,
        mtFYCurrent, amountFYCurrent, mtFYPrevious, amountFYPrevious,
        mtFYBudget, amountFYBudget,
        budgetShare, actualShare, materialityScore,
        strategicScore, budgetWeight, actualContribution,
        mtVariance, amountVariance, mtYoY, amountYoY,
        mtYTDGrowth, amountYTDGrowth, mtFYGrowth, amountFYGrowth,
        mtFYBudgetVar, amountFYBudgetVar,
        currentASP, budgetASP, prevYearASP, aspVsBudgetPct, aspYoYPct,
        isHighBudget, isCritical, isGrowthDriver,
        productRemainingMt, productRemainingAmt, productPerMonthMt, productPerMonthAmt
      };
    }).filter(Boolean);

    // ====== HIGH-BUDGET FOCUS SELECTION ================================
    // Sort by budget share and ensure cumulative coverage
    // Fix: Use FY budget targets for selection to treat MT-only items fairly
    const sortedByBudget = productAnalysis
      .filter(p => (p.amountFYBudget || p.amountBudget) > 0 || (p.mtFYBudget || p.mtBudget) > 0)
      .sort((a, b) => b.budgetShare - a.budgetShare);

    let cumulativeBudgetShare = 0;
    const highBudgetProducts = [];
    
    for (const product of sortedByBudget) {
      if (highBudgetProducts.length >= MAX_FOCUS_ITEMS) break;
      if (cumulativeBudgetShare >= CUM_BUDGET_TARGET && product.budgetShare < BUDGET_SHARE_MIN) break;
      
      highBudgetProducts.push(product);
      cumulativeBudgetShare += product.budgetShare;
    }

    // Sort by materiality score after coverage rule to emphasize current impact
    highBudgetProducts.sort((a, b) => b.materialityScore - a.materialityScore);

    // ====== CATEGORIZE BY PERFORMANCE =================================
    const criticalUnderperformers = highBudgetProducts
      .filter(p => p.isCritical)
      .sort((a, b) => b.materialityScore - a.materialityScore)
      .slice(0, MAX_LIST_ITEMS);

    const growthDrivers = highBudgetProducts
      .filter(p => p.isGrowthDriver)
      .sort((a, b) => b.materialityScore - a.materialityScore)
      .slice(0, MAX_LIST_ITEMS);

    // ====== ASP PREMIUM/DISCOUNT ANALYSIS ============================
    const aspConcerns = highBudgetProducts.filter(p => {
      return p.aspYoYPct !== null && Math.abs(p.aspYoYPct) >= ASP_DELTA_SHOW;
    }).sort((a, b) => b.materialityScore - a.materialityScore).slice(0, MAX_LIST_ITEMS);

    // Legacy compatibility - map to old structure
    const criticalIssues = criticalUnderperformers;
    const pricingConcerns = aspConcerns;

    // ====== EXECUTIVE SUMMARY GENERATION =============================
    let executiveSummary = '';
    
    // Build compressed executive summary - one line each for budget, YoY, YTD→FY, run-rate
    const summaryLines = [];
    
    // Budget performance (volume & sales together)
    if (mtVsBudget !== null || amtVsBudget !== null) {
      const budgetParts = [];
      if (mtVsBudget !== null) {
        budgetParts.push(`volume ${mtVsBudget >= 0 ? 'ahead' : 'behind'} by ${formatNumber(Math.abs(mtVsBudget), 'percentage')}`);
      }
      if (amtVsBudget !== null) {
        budgetParts.push(`sales ${amtVsBudget >= 0 ? 'ahead' : 'behind'} by ${formatNumber(Math.abs(amtVsBudget), 'percentage')}`);
      }
      summaryLines.push(`Budget: ${budgetParts.join(', ')}`);
    }
    
    // FY Budget performance (volume & sales together)
    if (fyBudgetIndex !== -1 && fyCurrentIndex !== -1) {
      const fyMTBudgetVar = fyBudgetIndex !== -1 && fyCurrentIndex !== -1 ? 
        ratioPct(calcTotal(kgsData, fyCurrentIndex), calcTotal(kgsData, fyBudgetIndex)) : null;
      const fyAmtBudgetVar = fyBudgetIndex !== -1 && fyCurrentIndex !== -1 ? 
        ratioPct(calcTotal(amountData, fyCurrentIndex), calcTotal(amountData, fyBudgetIndex)) : null;
      
      if (fyMTBudgetVar !== null || fyAmtBudgetVar !== null) {
        const fyBudgetParts = [];
        if (fyMTBudgetVar !== null) {
          fyBudgetParts.push(`volume ${fyMTBudgetVar >= 0 ? 'ahead' : 'behind'} by ${formatNumber(Math.abs(fyMTBudgetVar), 'percentage')}`);
        }
        if (fyAmtBudgetVar !== null) {
          fyBudgetParts.push(`sales ${fyAmtBudgetVar >= 0 ? 'ahead' : 'behind'} by ${formatNumber(Math.abs(fyAmtBudgetVar), 'percentage')}`);
        }
        summaryLines.push(`FY Budget: ${fyBudgetParts.join(', ')}`);
      }
    }
    
    // YoY performance (volume & sales together)
    if (mtYoY !== null || amtYoY !== null) {
      const yoyParts = [];
      if (mtYoY !== null) {
        yoyParts.push(`volume ${mtYoY >= 0 ? 'up' : 'down'} ${formatNumber(Math.abs(mtYoY), 'percentage')}`);
      }
      if (amtYoY !== null) {
        yoyParts.push(`sales ${amtYoY >= 0 ? 'up' : 'down'} ${formatNumber(Math.abs(amtYoY), 'percentage')}`);
      }
      summaryLines.push(`YoY: ${yoyParts.join(', ')}`);
    }
    
    // YTD→FY progress
    if (ytdCurrentIndex !== -1 && (fyCurrentIndex !== -1 || fyBudgetIndex !== -1) && 
        ytdCurrentIndex !== -1 && fyCurrentIndex !== -1) {
      const totalAmountYTDCurrent = ytdCurrentIndex !== -1 ? calcTotal(amountData, ytdCurrentIndex) : 0;
      const totalAmountFYCurrent = fyCurrentIndex !== -1 ? calcTotal(amountData, fyCurrentIndex) : 0;
      if (totalAmountYTDCurrent > 0 && totalAmountFYCurrent > 0) {
        const ytdFyProgress = (totalAmountYTDCurrent / totalAmountFYCurrent) * 100;
        summaryLines.push(`YTD→FY: ${formatNumber(ytdFyProgress, 'percentage')} of full-year achieved`);
      }
    }
    
    // Run-rate
    if (runRateInfo) {
      summaryLines.push(runRateInfo);
    }
    
    executiveSummary += summaryLines.join('. ') + (summaryLines.length > 0 ? '. ' : '');
    
    // Add product insights
    if (criticalUnderperformers.length > 0) {
      executiveSummary += `${criticalUnderperformers.length} high-budget products underperforming. `;
    }
    if (growthDrivers.length > 0) {
      executiveSummary += `${growthDrivers.length} products driving growth. `;
    }

    return {
      basePeriod,
      // Portfolio metrics
      totalMTActual,
      totalAmountActual,
      totalMTBudget,
      totalAmountBudget,
      totalMTPrevious,
      totalAmountPrevious,
      mtVsBudget,
      amtVsBudget,
      mtYoY,
      amtYoY,
      runRateInfo,
      
      // Analysis results
      executiveSummary: executiveSummary.trim() || 'Analysis complete.',
      highBudgetProducts,
      criticalUnderperformers,
      growthDrivers,
      aspConcerns,
      
      // Legacy compatibility
      criticalIssues: criticalUnderperformers,
      pricingConcerns: aspConcerns,
      productAnalysis,
      
      // Period availability flags
      hasBudget: budgetIndex !== -1,
      hasPrevYear: previousYearIndex !== -1,
      hasYTD: ytdCurrentIndex !== -1 && ytdPreviousIndex !== -1,
      hasYTDCurrent: ytdCurrentIndex !== -1,
      hasFY: fyCurrentIndex !== -1,
      hasFYComparison: fyCurrentIndex !== -1 && (fyPreviousIndex !== -1 || fyBudgetIndex !== -1),
      
      // YTD totals
      totalMTYTDCurrent: ytdCurrentIndex !== -1 ? calcTotal(kgsData, ytdCurrentIndex) : 0,
      totalAmountYTDCurrent: ytdCurrentIndex !== -1 ? calcTotal(amountData, ytdCurrentIndex) : 0,
      totalMTYTDPrevious: ytdPreviousIndex !== -1 ? calcTotal(kgsData, ytdPreviousIndex) : 0,
      totalAmountYTDPrevious: ytdPreviousIndex !== -1 ? calcTotal(amountData, ytdPreviousIndex) : 0,
      // FY totals
      totalMTFYCurrent: fyCurrentIndex !== -1 ? calcTotal(kgsData, fyCurrentIndex) : 0,
      totalAmountFYCurrent: fyCurrentIndex !== -1 ? calcTotal(amountData, fyCurrentIndex) : 0,
      totalMTFYPrevious: fyPreviousIndex !== -1 ? calcTotal(kgsData, fyPreviousIndex) : 0,
      totalAmountFYPrevious: fyPreviousIndex !== -1 ? calcTotal(amountData, fyPreviousIndex) : 0,
      totalMTFYBudget: fyBudgetIndex !== -1 ? calcTotal(kgsData, fyBudgetIndex) : 0,
      totalAmountFYBudget: fyBudgetIndex !== -1 ? calcTotal(amountData, fyBudgetIndex) : 0,
      
      // ====== BUDGET CATCH-UP CALCULATIONS ================================
      // Use pre-calculated monthsRemaining
      monthsRemaining,
      
      portfolioRemainingMt: (() => {
        const fyBudgetMt = fyBudgetIndex !== -1 ? calcTotal(kgsData, fyBudgetIndex) : totalMTBudget;
        const currentMt = ytdCurrentIndex !== -1 ? calcTotal(kgsData, ytdCurrentIndex) : totalMTActual;
        return Math.max(0, (fyBudgetMt || 0) - (currentMt || 0));
      })(),
      
      portfolioRemainingAmt: (() => {
        const fyBudgetAmt = fyBudgetIndex !== -1 ? calcTotal(amountData, fyBudgetIndex) : totalAmountBudget;
        const currentAmt = ytdCurrentIndex !== -1 ? calcTotal(amountData, ytdCurrentIndex) : totalAmountActual;
        return Math.max(0, (fyBudgetAmt || 0) - (currentAmt || 0));
      })(),
      
      // Portfolio per-month calculations
      portfolioPerMonthMt: (() => {
        const portfolioRemainingMt = (() => {
          const fyBudgetMt = fyBudgetIndex !== -1 ? calcTotal(kgsData, fyBudgetIndex) : totalMTBudget;
          const currentMt = ytdCurrentIndex !== -1 ? calcTotal(kgsData, ytdCurrentIndex) : totalMTActual;
          return Math.max(0, (fyBudgetMt || 0) - (currentMt || 0));
        })();
        return (monthsRemaining && monthsRemaining > 0) ? (portfolioRemainingMt / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);
      })(),
      
      portfolioPerMonthAmt: (() => {
        const portfolioRemainingAmt = (() => {
          const fyBudgetAmt = fyBudgetIndex !== -1 ? calcTotal(amountData, fyBudgetIndex) : totalAmountBudget;
          const currentAmt = ytdCurrentIndex !== -1 ? calcTotal(amountData, ytdCurrentIndex) : totalAmountActual;
          return Math.max(0, (fyBudgetAmt || 0) - (currentAmt || 0));
        })();
        return (monthsRemaining && monthsRemaining > 0) ? (portfolioRemainingAmt / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);
      })()
    };
  };

  const findings = calculateKeyFindings();

  // Pass findings to parent component if callback provided
  React.useEffect(() => {
    if (findings && onFindingsCalculated) {
      onFindingsCalculated(findings);
    }
  }, [findings, onFindingsCalculated]);

  if (!findings) {
    return (
      <div style={styles.container}>
        <div style={styles.noData}>
          No data available. Please ensure data is loaded and a period is selected.
        </div>
      </div>
    );
  }

  const mtBudgetVar = findings.totalMTBudget > 0 ? 
    ((findings.totalMTActual - findings.totalMTBudget) / findings.totalMTBudget) * 100 : null;
  const amountBudgetVar = findings.totalAmountBudget > 0 ? 
    ((findings.totalAmountActual - findings.totalAmountBudget) / findings.totalAmountBudget) * 100 : null;

  const ytdMTGrowth = findings.totalMTYTDPrevious > 0 ?
    ((findings.totalMTYTDCurrent - findings.totalMTYTDPrevious) / findings.totalMTYTDPrevious) * 100 : null;
  const ytdAmountGrowth = findings.totalAmountYTDPrevious > 0 ?
    ((findings.totalAmountYTDCurrent - findings.totalAmountYTDPrevious) / findings.totalAmountYTDPrevious) * 100 : null;

  const fyMTGrowth = findings.totalMTFYPrevious > 0 ?
    ((findings.totalMTFYCurrent - findings.totalMTFYPrevious) / findings.totalMTFYPrevious) * 100 : null;
  const fyAmountGrowth = findings.totalAmountFYPrevious > 0 ?
    ((findings.totalAmountFYCurrent - findings.totalAmountFYPrevious) / findings.totalAmountFYPrevious) * 100 : null;

  // FY Budget comparison: Use Period Actual vs FY Budget (since YTD data is not available)
  const fyMTBudgetVar = findings.totalMTFYBudget > 0 && findings.totalMTActual > 0 ?
    ((findings.totalMTActual - findings.totalMTFYBudget) / findings.totalMTFYBudget) * 100 : null;
  const fyAmountBudgetVar = findings.totalAmountFYBudget > 0 && findings.totalAmountActual > 0 ?
    ((findings.totalAmountActual - findings.totalAmountFYBudget) / findings.totalAmountFYBudget) * 100 : null;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Product Groups Strategic Analysis</h3>
      
      {/* Executive Summary */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📊 Executive Summary</h4>
        
        <div style={styles.insight}>
          {findings.executiveSummary}
        </div>
        
        {findings.hasBudget && mtBudgetVar !== null && (
          <div style={styles.insight}>
            <strong>Period Performance vs Budget:</strong> Volume at {formatNumber(findings.totalMTActual, 'mt')} is {formatNumber(Math.abs(mtBudgetVar), 'percentage')} {mtBudgetVar < 0 ? 'below' : 'above'} target ({formatNumber(findings.totalMTBudget, 'mt')}), while sales at {formatNumber(findings.totalAmountActual, 'amount')} shows {formatNumber(Math.abs(amountBudgetVar), 'percentage')} {amountBudgetVar < 0 ? 'shortfall' : 'surplus'} vs {formatNumber(findings.totalAmountBudget, 'amount')} budget.
            {fyMTBudgetVar !== null || fyAmountBudgetVar !== null ? (
              <><br/><strong>Period vs FY Budget:</strong> Period volume at {formatNumber(findings.totalMTActual, 'mt')} is {formatNumber(Math.abs(fyMTBudgetVar), 'percentage')} {fyMTBudgetVar < 0 ? 'below' : 'above'} FY budget target ({formatNumber(findings.totalMTFYBudget, 'mt')}), while period sales at {formatNumber(findings.totalAmountActual, 'amount')} shows {formatNumber(Math.abs(fyAmountBudgetVar), 'percentage')} {fyAmountBudgetVar < 0 ? 'shortfall' : 'surplus'} vs {formatNumber(findings.totalAmountFYBudget, 'amount')} FY budget.</>
            ) : null}
          </div>
        )}

        {findings.hasYTD && ytdMTGrowth !== null && (
          <div style={styles.insight}>
            <strong>Year-to-Date Trajectory:</strong> YTD volume of {formatNumber(findings.totalMTYTDCurrent, 'mt')} reflects {formatNumber(Math.abs(ytdMTGrowth), 'percentage')} {ytdMTGrowth >= 0 ? 'growth' : 'decline'} vs prior year ({formatNumber(findings.totalMTYTDPrevious, 'mt')}). Sales at {formatNumber(findings.totalAmountYTDCurrent, 'amount')} shows {formatNumber(Math.abs(ytdAmountGrowth), 'percentage')} {ytdAmountGrowth >= 0 ? 'increase' : 'decrease'} YoY.
          </div>
        )}

        {findings.hasFYComparison && findings.totalMTFYCurrent > 0 && (
          <div style={styles.insight}>
            <strong>Full Year Performance:</strong> FY volume reached {formatNumber(findings.totalMTFYCurrent, 'mt')}
            {fyMTGrowth !== null && ` (${formatNumber(Math.abs(fyMTGrowth), 'percentage')} ${fyMTGrowth >= 0 ? 'up' : 'down'} YoY)`}
            {fyMTBudgetVar !== null && `, ${formatNumber(Math.abs(fyMTBudgetVar), 'percentage')} ${fyMTBudgetVar < 0 ? 'below' : 'above'} FY budget`}. 
            Sales of {formatNumber(findings.totalAmountFYCurrent, 'amount')}
            {fyAmountGrowth !== null && ` reflects ${formatNumber(Math.abs(fyAmountGrowth), 'percentage')} ${fyAmountGrowth >= 0 ? 'growth' : 'contraction'}`}
            {fyAmountBudgetVar !== null && `, ${formatNumber(Math.abs(fyAmountBudgetVar), 'percentage')} ${fyAmountBudgetVar < 0 ? 'under' : 'over'} target`}.
          </div>
        )}

        {findings.hasYTDCurrent && findings.hasFYComparison && findings.totalAmountYTDCurrent > 0 && findings.totalAmountFYCurrent > 0 && (
          <div style={styles.insight}>
            <strong>YTD vs Full-Year Comparison:</strong> YTD sales of {formatNumber(findings.totalAmountYTDCurrent, 'amount')} vs Full-Year {formatNumber(findings.totalAmountFYCurrent, 'amount')} ({formatNumber((findings.totalAmountYTDCurrent / findings.totalAmountFYCurrent) * 100, 'percentage')} of FY achieved).
          </div>
        )}

        {/* Fix #4: Add YTD vs Full-Year comparison for VOLUME as well */}
        {findings.hasYTDCurrent && findings.hasFYComparison && findings.totalMTYTDCurrent > 0 && findings.totalMTFYCurrent > 0 && (
          <div style={styles.insight}>
          <strong>YTD vs Full-Year Volume Comparison:</strong> YTD volume of {formatNumber(findings.totalMTYTDCurrent, 'mt')} vs Full-Year {formatNumber(findings.totalMTFYCurrent, 'mt')} ({formatNumber((findings.totalMTYTDCurrent / findings.totalMTFYCurrent) * 100, 'percentage')} of FY achieved).
        </div>
        )}
      </div>



      {/* Critical Issues */}
      {findings.criticalUnderperformers.length > 0 && (
        <div style={styles.section}>
          <h4 style={{...styles.sectionTitle, color: '#dc2626'}}>⚠️ High-Priority Underperformers</h4>
          {findings.criticalUnderperformers.map((product, idx) => (
            <div key={idx} style={styles.productCard}>
              <div style={styles.productName}>{product.name}</div>
              <div style={styles.productDetails}>
                <div style={styles.detailRow}>
                  <strong>Strategic Weight:</strong> {(product.budgetShare * 100).toFixed(1)}% of total budget ({formatNumber(product.mtFYBudget || product.mtBudget, 'mt')} / {formatNumber(product.amountFYBudget || product.amountBudget, 'amount')})
                </div>
                
                {product.mtVariance !== null && Math.abs(product.mtVariance) > 5 && (
                  <div style={styles.detailRow}>
                    <strong>Period Gap:</strong> Volume {formatNumber(Math.abs(product.mtVariance), 'percentage')} {product.mtVariance < 0 ? 'below' : 'above'} plan ({formatNumber(product.mtActual, 'mt')} vs {formatNumber(product.mtBudget, 'mt')}), revenue impact {formatNumber(Math.abs(product.amountVariance), 'percentage')} {product.amountVariance < 0 ? 'short' : 'over'} at {formatNumber(product.amountActual, 'amount')}
                  </div>
                )}

                {product.mtYoY !== null && (
                  <div style={styles.detailRow}>
                    <strong>YoY Trend:</strong> {formatNumber(Math.abs(product.mtYoY), 'percentage')} {product.mtYoY < 0 ? 'volume decline' : 'volume growth'} from {formatNumber(product.mtPrevYear, 'mt')} to {formatNumber(product.mtActual, 'mt')}, sales {product.amountYoY >= 0 ? 'up' : 'down'} {formatNumber(Math.abs(product.amountYoY), 'percentage')}
                  </div>
                )}

                {product.mtYTDGrowth !== null && findings.hasYTD && (
                  <div style={styles.detailRow}>
                    <strong>YTD Performance:</strong> {formatNumber(product.mtYTDCurrent, 'mt')} ({formatNumber(Math.abs(product.mtYTDGrowth), 'percentage')} {product.mtYTDGrowth >= 0 ? 'ahead' : 'behind'} prior year's {formatNumber(product.mtYTDPrevious, 'mt')})
                  </div>
                )}

                {product.mtFYBudgetVar !== null && findings.hasFY && Math.abs(product.mtFYBudgetVar) > 5 && (
                  <div style={styles.detailRow}>
                    <strong>FY Outlook:</strong> Full year tracking at {formatNumber(product.mtFYCurrent, 'mt')} / {formatNumber(product.amountFYCurrent, 'amount')}, {formatNumber(Math.abs(product.mtFYBudgetVar), 'percentage')} {product.mtFYBudgetVar < 0 ? 'below' : 'above'} FY target
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Growth Drivers */}
      {findings.growthDrivers.length > 0 && (
        <div style={styles.section}>
          <h4 style={{...styles.sectionTitle, color: '#059669'}}>🚀 Growth Drivers</h4>
          {findings.growthDrivers.map((product, idx) => (
            <div key={idx} style={{...styles.productCard, borderLeft: '4px solid #059669'}}>
              <div style={styles.productName}>{product.name}</div>
              <div style={styles.productDetails}>
                <div style={styles.detailRow}>
                  <strong>Strong Execution:</strong> Delivered {formatNumber(product.mtActual, 'mt')} / {formatNumber(product.amountActual, 'amount')} ({product.actualContribution.toFixed(1)}% of total volume)
                </div>
                
                {product.mtVariance !== null && product.mtVariance > 10 && (
                  <div style={styles.detailRow}>
                    <strong>Exceeded Budget:</strong> Volume {formatNumber(product.mtVariance, 'percentage')} above plan, revenue outperformance of {formatNumber(product.amountVariance, 'percentage')}
                  </div>
                )}

                {product.mtYoY !== null && product.mtYoY > 15 && (
                  <div style={styles.detailRow}>
                    <strong>Momentum:</strong> {formatNumber(product.mtYoY, 'percentage')} volume expansion YoY (from {formatNumber(product.mtPrevYear, 'mt')} to {formatNumber(product.mtActual, 'mt')}), sales growth of {formatNumber(product.amountYoY, 'percentage')}
                  </div>
                )}

                {product.mtFYGrowth !== null && findings.hasFY && product.mtFYGrowth > 10 && (
                  <div style={styles.detailRow}>
                    <strong>FY Achievement:</strong> Full year performance at {formatNumber(product.mtFYCurrent, 'mt')} represents {formatNumber(product.mtFYGrowth, 'percentage')} growth vs prior FY
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASP Concerns */}
      {findings.aspConcerns.length > 0 && (
        <div style={styles.section}>
          <h4 style={{...styles.sectionTitle, color: '#d97706'}}>💰 Pricing Analysis</h4>
          {findings.aspConcerns.map((product, idx) => {
            return (
              <div key={idx} style={{...styles.productCard, borderLeft: '4px solid #d97706'}}>
                <div style={styles.productName}>{product.name}</div>
                <div style={styles.productDetails}>
                  {product.aspYoYPct !== null && Math.abs(product.aspYoYPct) >= ASP_DELTA_SHOW && (
                    <div style={styles.detailRow}>
                      <strong>ASP Change YoY:</strong> Current realization at {formatNumber(product.currentASP, 'asp')}/kg vs {formatNumber(product.prevYearASP, 'asp')}/kg prior year ({formatNumber(Math.abs(product.aspYoYPct), 'percentage')} {product.aspYoYPct < 0 ? 'decline' : 'increase'})
                    </div>
                  )}
                  {product.aspVsBudgetPct !== null && Math.abs(product.aspVsBudgetPct) >= ASP_DELTA_SHOW && (
                    <div style={styles.detailRow}>
                      <strong>ASP vs Budget:</strong> {formatNumber(Math.abs(product.aspVsBudgetPct), 'percentage')} {product.aspVsBudgetPct < 0 ? 'below' : 'above'} budgeted ASP of {formatNumber(product.budgetASP, 'asp')}/kg
                    </div>
                  )}
                  <div style={styles.detailRow}>
                    <strong>Revenue Impact:</strong> Volume of {formatNumber(product.mtActual, 'mt')} generating {formatNumber(product.amountActual, 'amount')} with materiality score of {(product.materialityScore * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Catch-up Plan */}
      {(findings.monthsRemaining !== null || findings.portfolioRemainingMt > 0 || findings.portfolioRemainingAmt > 0) && (
        <div style={styles.section}>
          <h4 style={{...styles.sectionTitle, color: '#7c3aed'}}>🎯 Required Growth to Targets</h4>
          


          {/* Portfolio Catch-up Plan */}
          <div style={styles.insight}>
            <strong>Portfolio Catch-up Plan</strong>
            {findings.monthsRemaining !== null && findings.monthsRemaining > 0 && (
              <div>
                <strong>Time Remaining:</strong> {findings.monthsRemaining} months to achieve FY budget targets
              </div>
            )}
            {findings.monthsRemaining === 0 && (
              <div>
                <strong>Time Remaining:</strong> No months remaining - gap must be closed within current month (end-loading)
              </div>
            )}
            {findings.portfolioRemainingMt > 0 ? (
              <div>
                <strong>Volume Gap:</strong> Need {formatNumber(findings.portfolioRemainingMt, 'mt')} more to hit FY budget
              </div>
            ) : findings.portfolioRemainingMt < 0 ? (
              <div>
                <strong>Volume Status:</strong> Portfolio is {formatNumber(Math.abs(findings.portfolioRemainingMt), 'mt')} ahead of FY budget target
              </div>
            ) : null}
            
            {findings.portfolioRemainingAmt > 0 ? (
              <div>
                <strong>Sales Gap:</strong> Need {formatNumber(findings.portfolioRemainingAmt, 'amount')} more to hit FY budget
              </div>
            ) : findings.portfolioRemainingAmt < 0 ? (
              <div>
                <strong>Sales Status:</strong> Portfolio is {formatNumber(Math.abs(findings.portfolioRemainingAmt), 'amount')} ahead of FY budget target
              </div>
            ) : null}
            
            {/* Show per-month requirements only when months remaining > 0 */}
            {findings.monthsRemaining > 0 && (findings.portfolioRemainingMt > 0 || findings.portfolioRemainingAmt > 0) && (
              <div>
                <strong>Required Average Per Month:</strong> {formatNumber(findings.portfolioPerMonthMt, 'mt')} / {formatNumber(findings.portfolioPerMonthAmt, 'amount')}
              </div>
            )}
            
            {findings.portfolioRemainingMt <= 0 && findings.portfolioRemainingAmt <= 0 && (
              <div>
                <strong>Status:</strong> Portfolio is on track or ahead of budget targets
              </div>
            )}
          </div>

          {/* Product Level Catch-up */}
          {findings.highBudgetProducts && findings.highBudgetProducts.length > 0 && (
            <div>
              <strong style={{color: '#1e40af', fontSize: '16px'}}>Product Level Catch-up</strong>
              {findings.highBudgetProducts
                .filter(product => 
                  (product.productRemainingMt !== undefined && product.productRemainingMt > 0) || 
                  (product.productRemainingAmt !== undefined && product.productRemainingAmt > 0)
                )
                .length > 0 ? (
                findings.highBudgetProducts
                  .filter(product => 
                    (product.productRemainingMt !== undefined && product.productRemainingMt > 0) || 
                    (product.productRemainingAmt !== undefined && product.productRemainingAmt > 0)
                  )
                  .map((product, idx) => (
                    <div key={idx} style={styles.productCard}>
                      <div style={styles.productName}>{product.name}</div>
                      <div style={styles.productDetails}>
                        {product.productRemainingMt > 0 && (
                          <div style={styles.detailRow}>
                            <strong>Volume Gap:</strong> Need {formatNumber(product.productRemainingMt, 'mt')} more to hit FY budget
                          </div>
                        )}
                        {product.productRemainingAmt > 0 && (
                          <div style={styles.detailRow}>
                            <strong>Sales Gap:</strong> Need {formatNumber(product.productRemainingAmt, 'amount')} more to hit FY budget
                          </div>
                        )}
                        {/* Show per-month requirements only when months remaining > 0 */}
                        {findings.monthsRemaining > 0 && (product.productRemainingMt > 0 || product.productRemainingAmt > 0) && (
                          <div style={styles.detailRow}>
                            <strong>Required Per Month:</strong> {formatNumber(product.productPerMonthMt, 'mt')} / {formatNumber(product.productPerMonthAmt, 'amount')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div style={styles.insight}>
                  All high-budget products are on track or ahead of targets
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Strategic Recommendations */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>💡 Strategic Priorities</h4>
        <div style={styles.recommendations}>
          {findings.criticalUnderperformers.length > 0 && (
            <div style={styles.recommendation}>
              Address underperformance in high-budget products representing {(findings.criticalUnderperformers.reduce((sum, p) => sum + p.budgetShare, 0) * 100).toFixed(1)}% of strategic allocation through targeted sales initiatives and market analysis.
            </div>
          )}
          {findings.growthDrivers.length > 0 && (
            <div style={styles.recommendation}>
              Capitalize on momentum in growth products by allocating additional resources and analyzing success factors for replication across portfolio.
            </div>
          )}
          {findings.aspConcerns.length > 0 && (
            <div style={styles.recommendation}>
              Investigate pricing pressure in {findings.aspConcerns.length} material products; implement margin protection strategies or validate competitive positioning.
            </div>
          )}
          {findings.hasYTD && ytdMTGrowth !== null && ytdMTGrowth < -5 && (
            <div style={styles.recommendation}>
              YTD performance trending {formatNumber(Math.abs(ytdMTGrowth), 'percentage')} below prior year requires immediate corrective action to achieve FY targets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    borderRadius: '12px',
    padding: '24px',
    margin: '20px 0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e2e8f0'
  },
  title: {
    color: '#1e293b',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '24px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  section: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    borderLeft: '4px solid #3b82f6'
  },
  sectionTitle: {
    color: '#1e40af',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px'
  },
  insight: {
    padding: '12px 16px',
    background: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1e40af',
    borderLeft: '3px solid #3b82f6'
  },
  productCard: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '16px',
    borderLeft: '4px solid #ef4444',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  productName: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '16px',
    marginBottom: '12px'
  },
  productDetails: {
    marginLeft: '12px'
  },
  detailRow: {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '8px',
    padding: '8px 12px',
    background: 'white',
    borderRadius: '6px'
  },
  recommendations: {
    padding: '16px',
    background: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0'
  },
  recommendation: {
    color: '#065f46',
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '12px',
    padding: '12px',
    background: 'white',
    borderRadius: '6px',
    borderLeft: '3px solid #10b981'
  },
  noData: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6c757d',
    fontStyle: 'italic',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '16px'
  }
};

export default ProductGroupKeyFacts;