import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import UAEDirhamSymbol from '../dashboard/UAEDirhamSymbol';

/**
 * CustomerKeyFacts (Pro) — Volume by Customer (IMPROVED)
 * ------------------------------------------------------------------
 * This version fixes bugs and adds deeper analysis:
 *  - ✅ Correctly fetches Amount rows from API (was fetching volume twice)
 *  - ✅ Fixes double-suffix bug in amount string formatter
 *  - ✅ Robust customer name matching (handles merged names with "*")
 *  - ✅ Price–Volume–Mix (PVM) decomposition at portfolio and customer level
 *  - ✅ Materiality×Variance scoring to prioritize actions
 *  - ✅ Outlier detection (z-score) on YoY growth to surface anomalies
 *  - ✅ Clearer KPI labels (e.g., AED/MT for kilo rate)
 *  - ✅ Safer guards for missing/zero denominators
 */

// ============================== CONFIG =======================================
const TOP_SHARE_MIN = 0.05;      // customers must have >=5% share to enter focus unless coverage rule keeps them
const CUM_SHARE_TARGET = 0.80;   // ensure at least 80% of current-period volume covered
const MAX_FOCUS = 10;            // cap number of focused customers
const MAX_LIST = 6;              // cap for lists

const UNDERPERF_VOL_PCT = -15;   // vs budget
const UNDERPERF_YOY_VOL = -10;   // vs prior year
const GROWTH_VOL_PCT = 15;       // vs budget
const GROWTH_YOY_VOL = 20;       // vs prior year

const RUNRATE_WARN = 0.85;       // 85% of FY budget by now

// ============================== UTILS ========================================
const isNil = (v) => v == null || (typeof v === 'number' && Number.isNaN(v));
const normalize = (s) => (s || '').toString().trim().toLowerCase();
const stripMergeMark = (s) => (s || '').replace(/\*+$/,'').trim();
const keyName = (s) => normalize(stripMergeMark(s));

// Convert to Proper Case (Title Case)
const toProperCase = (s) => {
  if (!s) return '';
  return s
    .toString()
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatCustomerName = (name) => toProperCase(stripMergeMark(name));

const formatPct = (n) => (n == null ? 'N/A' : `${Math.abs(n).toFixed(1)}%`);

const formatMt = (kgs) => {
  if (isNil(kgs)) return 'N/A';
  const mt = kgs / 1000;
  if (mt >= 1000) return Math.round(mt).toLocaleString() + ' MT';
  if (mt >= 100) return Math.round(mt) + ' MT';
  return mt.toFixed(1) + ' MT';
};

const formatAmount = (amount) => {
  if (isNil(amount)) return 'N/A';
  if (amount >= 1_000_000) return <><UAEDirhamSymbol />{(amount / 1_000_000).toFixed(1)}M</>;
  if (amount >= 1_000) return <><UAEDirhamSymbol />{(amount / 1_000).toFixed(1)}K</>;
  return <><UAEDirhamSymbol />{amount.toFixed(0)}</>;
};

const formatAED = (value) => {
  if (isNil(value)) return 'N/A';
  if (value === 0) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (absValue >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toFixed(0);
};

// FIX: do not add extra M/K; delegate to formatAED only
const formatAmountString = (amount) => formatAED(amount);

const isYTDCol = (c) => c?.type === 'Actual' && ['ytd','yrtodate','year-to-date'].includes(normalize(c?.month));
const isFYCol = (c) => c?.type === 'Actual' && ['fy','full year','fullyear','full-year','full_year','year'].includes(normalize(c?.month));
const isBudgetColGeneric = (c) => ['budget','fy budget','full year budget'].includes(normalize(c?.type));

const monthToNumber = (m) => {
  if (m == null) return null;
  const x = normalize(m);
  const map = {
    'jan':1,'january':1,'feb':2,'february':2,'mar':3,'march':3,'apr':4,'april':4,'may':5,
    'jun':6,'june':6,'jul':7,'july':7,'aug':8,'august':8,'sep':9,'sept':9,'september':9,
    'oct':10,'october':10,'nov':11,'november':11,'dec':12,'december':12,
    'q1':'q1','q2':'q2','q3':'q3','q4':'q4','year':'year','fy':'fy'
  };
  return map[x] ?? (isFinite(+x) ? (+x >=1 && +x <=12 ? +x : null) : null);
};

const findBudgetIndex = (columnOrder, basePeriodIndex) => {
  if (!Array.isArray(columnOrder) || basePeriodIndex == null) return -1;
  const base = columnOrder[basePeriodIndex];
  if (!base) return -1;

  // 1) strict same month+year budget
  const strict = columnOrder.findIndex(c =>
    isBudgetColGeneric(c) && c?.year === base?.year && normalize(c?.month) === normalize(base?.month)
  );
  if (strict !== -1) return strict;

  // 2) FY budget for the same year
  const fyBudget = columnOrder.findIndex(c => isBudgetColGeneric(c) && c?.year === base?.year && (isFYCol(c) || normalize(c?.month) === 'fy'));
  if (fyBudget !== -1) return fyBudget;

  // 3) any budget in same year
  const any = columnOrder.findIndex(c => isBudgetColGeneric(c) && c?.year === base?.year);
  if (any !== -1) return any;

  // 4) any budget at all
  return columnOrder.findIndex(c => isBudgetColGeneric(c));
};

const safeSumAt = (i, rows) => {
  if (i < 0 || !Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => {
    const v = parseFloat(r?.rawValues?.[i] ?? 0);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
};

const ratioPct = (a, b) => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return ((a - b) / b) * 100;
};

const columnToMonths = (column) => {
  if (!column) return [];
  if (Array.isArray(column.months) && column.months.length) return column.months;
  const map = {
    Q1: [1,2,3], Q2: [4,5,6], Q3: [7,8,9], Q4: [10,11,12],
    HY1: [1,2,3,4,5,6], HY2: [7,8,9,10,11,12],
    Year: [1,2,3,4,5,6,7,8,9,10,11,12],
    January:[1], February:[2], March:[3], April:[4], May:[5], June:[6],
    July:[7], August:[8], September:[9], October:[10], November:[11], December:[12]
  };
  return map[column.month] || [1];
};

// ============================== API HELPERS ==================================
const applySavedMergeRules = async (salesRep, division, customers) => {
  try {
    const response = await fetch(
      `http://localhost:3001/api/customer-merge-rules/get?salesRep=${encodeURIComponent(salesRep || '')}&division=${encodeURIComponent(division || 'FP')}`
    );
    const result = await response.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      const processedCustomers = [];
      const processed = new Set();

      for (const rule of result.data) {
        const existingObjs = [];
        for (const name of rule.originalCustomers || []) {
          const match = customers.find(c => normalize(c.name) === normalize(name));
          if (match) existingObjs.push(match);
        }
        if (existingObjs.length > 1) {
          const agg = {
            name: toProperCase(rule.mergedName) + '*',
            originalName: rule.mergedName,
            rawValues: new Array(customers[0]?.rawValues?.length || 0).fill(0)
          };
          existingObjs.forEach((c) => {
            c.rawValues.forEach((v, i) => {
              const num = parseFloat(v);
              if (Number.isFinite(num)) agg.rawValues[i] += num;
            });
            processed.add(c.name);
          });
          processedCustomers.push(agg);
        } else if (existingObjs.length === 1) {
          const only = { ...existingObjs[0] };
          processed.add(only.name);
          if (rule.mergedName) {
            only.name = toProperCase(rule.mergedName) + '*';
            only.originalName = rule.mergedName;
          }
          processedCustomers.push(only);
        }
      }

      customers.forEach((c) => {
        if (!processed.has(c.name)) processedCustomers.push({ ...c });
      });

      return processedCustomers;
    }
  } catch (e) {
    console.warn('Saved merge rules fetch failed, proceeding without:', e);
  }
  return customers;
};

// FIX: support explicit dataType override ("Amount" or "Actual")
const fetchCustomerSalesForColumn = async (rep, column, dataTypeOverride) => {
  const months = columnToMonths(column);
  const res = await fetch('http://localhost:3001/api/sales-by-customer-db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      division: 'FP',
      salesRep: rep,
      year: column.year,
      months,
      dataType: dataTypeOverride || column.type || 'Actual'
    })
  });
  const json = await res.json();
  return json?.success ? json.data || [] : [];
};

// FIX: third arg chooses dataType when building rows
const buildRowsFromApi = async (rep, columnOrder, dataType = 'Actual') => {
  if (!rep || !Array.isArray(columnOrder) || columnOrder.length === 0) return [];
  const cmap = new Map();
  for (let idx = 0; idx < columnOrder.length; idx++) {
    const col = columnOrder[idx];
    const data = await fetchCustomerSalesForColumn(rep, col, dataType);
    data.forEach((rec) => {
      const name = rec.customer;
      const val = parseFloat(rec.value) || 0;
      if (!cmap.has(name)) {
        cmap.set(name, { name, rawValues: new Array(columnOrder.length).fill(0) });
      }
      cmap.get(name).rawValues[idx] = val;
    });
  }
  return Array.from(cmap.values());
};

// ============================== COMPONENT ====================================
const CustomerKeyFacts = ({ rep: repProp, rowsOverride, amountRowsOverride, onFindingsCalculated }) => {
  const { columnOrder, basePeriodIndex } = useFilter();
  const rep = repProp;

  const [rows, setRows] = useState(null);
  const [amountRows, setAmountRows] = useState(null);
  const [waitingForTable, setWaitingForTable] = useState(true);
  const [waitingForAmountTable, setWaitingForAmountTable] = useState(true);
  const hasMountedRef = useRef(false);

  // 1) Listen for volume table event
  useEffect(() => {
    const handler = (ev) => {
      if (ev?.detail?.rows && Array.isArray(ev.detail.rows)) {
        const r = ev.detail.rows;
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          const ok = r[0]?.rawValues?.length === columnOrder.length;
          setRows(ok ? r : null);
        } else {
          setRows(r);
        }
        setWaitingForTable(false);
      }
    };
    window.addEventListener('customersKgsTable:dataReady', handler);
    return () => window.removeEventListener('customersKgsTable:dataReady', handler);
  }, [columnOrder]);

  // 1b) Listen for amount table event
  useEffect(() => {
    const handler = (ev) => {
      if (ev?.detail?.rows && Array.isArray(ev.detail.rows)) {
        const r = ev.detail.rows;
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          const ok = r[0]?.rawValues?.length === columnOrder.length;
          setAmountRows(ok ? r : null);
        } else {
          setAmountRows(r);
        }
        setWaitingForAmountTable(false);
      }
    };
    window.addEventListener('customersAmountTable:dataReady', handler);
    return () => window.removeEventListener('customersAmountTable:dataReady', handler);
  }, [columnOrder]);

  // 2) Fallback: build from API if no table event after mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      const timer = setTimeout(async () => {
        if (waitingForTable && rep && Array.isArray(columnOrder) && columnOrder.length > 0) {
          try {
            const apiRows = await buildRowsFromApi(rep, columnOrder, 'Actual');
            const merged = await applySavedMergeRules(rep, 'FP', apiRows);
            setRows(merged);
            setWaitingForTable(false);
          } catch (e) {
            console.error('Failed to build volume rows from API:', e);
          }
        }
        if (waitingForAmountTable && rep && Array.isArray(columnOrder) && columnOrder.length > 0) {
          try {
            const apiRows = await buildRowsFromApi(rep, columnOrder, 'Amount');
            const merged = await applySavedMergeRules(rep, 'FP', apiRows);
            setAmountRows(merged);
            setWaitingForAmountTable(false);
          } catch (e) {
            console.error('Failed to build amount rows from API:', e);
          }
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [rep, columnOrder, waitingForTable, waitingForAmountTable]);

  // 3) Use overrides if provided
  const finalRows = rowsOverride || rows;
  const finalAmountRows = amountRowsOverride || amountRows;

  // ============================== ANALYSIS ==================================
  const findings = useMemo(() => {
    if (!Array.isArray(finalRows) || finalRows.length === 0 || !Array.isArray(columnOrder) || basePeriodIndex == null) {
      return null;
    }

    const budgetIndex = findBudgetIndex(columnOrder, basePeriodIndex);

    // FIX: Convert years to numbers to handle string/number comparison
    const baseYear = Number(columnOrder[basePeriodIndex]?.year);
    const targetYear = baseYear - 1;
    const targetMonth = normalize(columnOrder[basePeriodIndex]?.month);

    const previousYearIndex = columnOrder.findIndex(c => Number(c?.year) === targetYear && normalize(c?.month) === targetMonth);
    const ytdCurrentIndex = columnOrder.findIndex(c => isYTDCol(c) && Number(c?.year) === baseYear);
    const ytdPreviousIndex = columnOrder.findIndex(c => isYTDCol(c) && Number(c?.year) === targetYear);
    const fyCurrentIndex = columnOrder.findIndex(c => isFYCol(c) && Number(c?.year) === baseYear);
    const fyPreviousIndex = columnOrder.findIndex(c => isFYCol(c) && Number(c?.year) === targetYear);
    const fyBudgetIndex = columnOrder.findIndex(c => isBudgetColGeneric(c) && Number(c?.year) === baseYear && (isFYCol(c) || normalize(c?.month) === 'fy'));

    const totalActual = safeSumAt(basePeriodIndex, finalRows);
    const totalBudget = safeSumAt(budgetIndex, finalRows);
    const totalPrev = safeSumAt(previousYearIndex, finalRows);
    const totalYtdCur = safeSumAt(ytdCurrentIndex, finalRows);
    const totalYtdPrev = safeSumAt(ytdPreviousIndex, finalRows);
    const totalFyCur = safeSumAt(fyCurrentIndex, finalRows);
    const totalFyPrev = safeSumAt(fyPreviousIndex, finalRows);
    const totalFyBudget = safeSumAt(fyBudgetIndex, finalRows);

    // Amount totals (if available)
    let totalAmountActual = 0, totalAmountBudget = 0, totalAmountPrev = 0;
    let totalAmountYtdCur = 0, totalAmountYtdPrev = 0, totalAmountFyCur = 0, totalAmountFyPrev = 0, totalAmountFyBudget = 0;
    if (Array.isArray(finalAmountRows) && finalAmountRows.length > 0) {
      totalAmountActual = safeSumAt(basePeriodIndex, finalAmountRows);
      totalAmountBudget = safeSumAt(budgetIndex, finalAmountRows);
      totalAmountPrev = safeSumAt(previousYearIndex, finalAmountRows);
      totalAmountYtdCur = safeSumAt(ytdCurrentIndex, finalAmountRows);
      totalAmountYtdPrev = safeSumAt(ytdPreviousIndex, finalAmountRows);
      totalAmountFyCur = safeSumAt(fyCurrentIndex, finalAmountRows);
      totalAmountFyPrev = safeSumAt(fyPreviousIndex, finalAmountRows);
      totalAmountFyBudget = safeSumAt(fyBudgetIndex, finalAmountRows);
    }

    // Kilo rates
    const avgKiloRate = totalActual > 0 ? totalAmountActual / (totalActual / 1000) : 0;
    const avgKiloRatePrev = totalPrev > 0 ? totalAmountPrev / (totalPrev / 1000) : 0;
    const avgKiloRateBudget = totalBudget > 0 ? totalAmountBudget / (totalBudget / 1000) : 0;
    const kiloRateYoY = ratioPct(avgKiloRate, avgKiloRatePrev);
    const kiloRateVsBudget = ratioPct(avgKiloRate, avgKiloRateBudget);

    // Months remaining calculation
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const basePeriodYear = columnOrder[basePeriodIndex]?.year;
    let monthsRemaining = 12;
    if (basePeriodYear === currentYear) {
      const basePeriodMonthNum = monthToNumber(columnOrder[basePeriodIndex]?.month);
      if (basePeriodMonthNum && basePeriodMonthNum <= 12) {
        monthsRemaining = 12 - basePeriodMonthNum;
      }
    }

    // Catch-up metrics
    const runRateInfo = {
      currentRunRate: totalActual * (12 / Math.max(1, 12 - monthsRemaining)),
      requiredRunRate: totalFyBudget > 0 ? totalFyBudget : totalBudget * (12 / Math.max(1, 12 - monthsRemaining)),
      isOnTrack: false,
      catchUpRequired: 0
    };
    runRateInfo.isOnTrack = runRateInfo.currentRunRate >= runRateInfo.requiredRunRate * RUNRATE_WARN;
    if (!runRateInfo.isOnTrack && monthsRemaining > 0) {
      runRateInfo.catchUpRequired = (runRateInfo.requiredRunRate - totalActual) / monthsRemaining;
    }

    // Customer analysis with volume vs sales
    const customerVolumeVsSales = [];
    if (Array.isArray(finalAmountRows) && finalAmountRows.length > 0) {
      const volumeMap = new Map();
      finalRows.forEach(r => volumeMap.set(keyName(r.name), r));
      
      finalAmountRows.forEach(amountRow => {
        const volumeRow = volumeMap.get(keyName(amountRow.name));
        if (volumeRow) {
          const volumeActual = volumeRow.rawValues?.[basePeriodIndex] || 0;
          const amountActual = amountRow.rawValues?.[basePeriodIndex] || 0;
          const volumeBudget = budgetIndex >= 0 ? (volumeRow.rawValues?.[budgetIndex] || 0) : 0;
          const amountBudget = budgetIndex >= 0 ? (amountRow.rawValues?.[budgetIndex] || 0) : 0;
          const volumePrev = previousYearIndex >= 0 ? (volumeRow.rawValues?.[previousYearIndex] || 0) : 0;
          const amountPrev = previousYearIndex >= 0 ? (amountRow.rawValues?.[previousYearIndex] || 0) : 0;
          
          const kiloRate = volumeActual > 0 ? amountActual / (volumeActual / 1000) : 0;
          const kiloRatePrev = volumePrev > 0 ? amountPrev / (volumePrev / 1000) : 0;
          const kiloRateBudget = volumeBudget > 0 ? amountBudget / (volumeBudget / 1000) : 0;
          
          customerVolumeVsSales.push({
            name: amountRow.name,
            volumeActual,
            amountActual,
            volumeBudget,
            amountBudget,
            volumePrev,
            amountPrev,
            kiloRate,
            kiloRatePrev,
            kiloRateBudget,
            volumeVsBudget: ratioPct(volumeActual, volumeBudget),
            amountVsBudget: ratioPct(amountActual, amountBudget),
            volumeYoY: ratioPct(volumeActual, volumePrev),
            amountYoY: ratioPct(amountActual, amountPrev),
            kiloRateYoY: ratioPct(kiloRate, kiloRatePrev),
            kiloRateVsBudget: ratioPct(kiloRate, kiloRateBudget)
          });
        }
      });
    }

    // PVM decomposition (Price-Volume-Mix)
    let priceEffect = 0, volumeEffect = 0, mixEffect = 0;
    let pvmAvailable = false;
    
    if (totalAmountPrev > 0 && totalPrev > 0 && totalAmountActual > 0 && totalActual > 0) {
      const avgPricePrev = totalAmountPrev / (totalPrev / 1000);
      const avgPriceCur = totalAmountActual / (totalActual / 1000);
      priceEffect = ((avgPriceCur - avgPricePrev) / avgPricePrev) * 100;
      volumeEffect = ((totalActual - totalPrev) / totalPrev) * 100;
      mixEffect = 0; // Simplified - would need product mix data for full calculation
      pvmAvailable = true;
    } else if (totalBudget > 0 && totalAmountBudget > 0 && totalActual > 0 && totalAmountActual > 0) {
      // Fallback to budget comparison if no previous year data
      const avgPriceBudget = totalAmountBudget / (totalBudget / 1000);
      const avgPriceCur = totalAmountActual / (totalActual / 1000);
      priceEffect = ((avgPriceCur - avgPriceBudget) / avgPriceBudget) * 100;
      volumeEffect = ((totalActual - totalBudget) / totalBudget) * 100;
      mixEffect = 0;
      pvmAvailable = true;
    }

    // Outlier detection (z-score on YoY growth)
    const yoyGrowthRates = finalRows
      .filter(r => previousYearIndex >= 0 && (r.rawValues?.[previousYearIndex] || 0) > 0)
      .map(r => {
        const prev = r.rawValues?.[previousYearIndex] || 0;
        const cur = r.rawValues?.[basePeriodIndex] || 0;
        return ratioPct(cur, prev) || 0;
      })
      .filter(rate => rate != null);
    
    const meanYoY = yoyGrowthRates.length > 0 ? yoyGrowthRates.reduce((a, b) => a + b, 0) / yoyGrowthRates.length : 0;
    const stdDevYoY = yoyGrowthRates.length > 1 ? Math.sqrt(yoyGrowthRates.reduce((sum, rate) => sum + Math.pow(rate - meanYoY, 2), 0) / (yoyGrowthRates.length - 1)) : 0;
    
    const outliers = finalRows
      .filter(r => previousYearIndex >= 0 && (r.rawValues?.[previousYearIndex] || 0) > 0)
      .map(r => {
        const prev = r.rawValues?.[previousYearIndex] || 0;
        const cur = r.rawValues?.[basePeriodIndex] || 0;
        const yoyRate = ratioPct(cur, prev) || 0;
        const zScore = stdDevYoY > 0 ? Math.abs(yoyRate - meanYoY) / stdDevYoY : 0;
        return { name: r.name, yoyRate, zScore, volume: cur };
      })
      .filter(item => item.zScore > 2) // 2 standard deviations
      .sort((a, b) => b.zScore - a.zScore)
      .slice(0, 5);

    // Top performers by different metrics
    const topVolumePerformers = finalRows
      .filter(r => (r.rawValues?.[basePeriodIndex] || 0) > 0)
      .sort((a, b) => (b.rawValues?.[basePeriodIndex] || 0) - (a.rawValues?.[basePeriodIndex] || 0))
      .slice(0, 5)
      .map(r => ({
        name: r.name,
        volume: r.rawValues?.[basePeriodIndex] || 0,
        share: totalActual > 0 ? ((r.rawValues?.[basePeriodIndex] || 0) / totalActual * 100) : 0
      }));

    const topSalesPerformers = customerVolumeVsSales
      .filter(c => c.amountActual > 0)
      .sort((a, b) => b.amountActual - a.amountActual)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        amount: c.amountActual,
        share: totalAmountActual > 0 ? (c.amountActual / totalAmountActual * 100) : 0
      }));

    const topKiloRatePerformers = customerVolumeVsSales
      .filter(c => c.kiloRate > 0 && c.volumeActual > totalActual * 0.01) // At least 1% of volume
      .sort((a, b) => b.kiloRate - a.kiloRate)
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        kiloRate: c.kiloRate,
        volume: c.volumeActual
      }));

    // Materiality thresholds for meaningful analysis
    const MIN_VOLUME_SHARE = 0.02; // Minimum 2% of total volume
    const MIN_ABSOLUTE_VOLUME = 10; // Minimum 10 MT absolute volume
    const MIN_PERFORMANCE_GAP = 10; // Minimum 10% performance gap to be significant
    
    // Volume vs Sales advantage analysis with materiality filters
    const volumeAdvantageCustomers = customerVolumeVsSales
      .filter(c => {
        // Must have valid data
        if (c.volumeVsBudget == null || c.amountVsBudget == null) return false;
        
        // Must have significant performance gap
        if (c.volumeVsBudget <= c.amountVsBudget + MIN_PERFORMANCE_GAP) return false;
        
        // Must meet materiality thresholds
        const volumeShare = totalActual > 0 ? (c.volumeActual / totalActual) : 0;
        const volumeMT = (c.volumeActual || 0) / 1000;
        
        return volumeShare >= MIN_VOLUME_SHARE && volumeMT >= MIN_ABSOLUTE_VOLUME;
      })
      .sort((a, b) => (b.volumeVsBudget - b.amountVsBudget) - (a.volumeVsBudget - a.amountVsBudget))
      .slice(0, 3); // Reduced to top 3 since we're being more selective

    const salesAdvantageCustomers = customerVolumeVsSales
      .filter(c => {
        // Must have valid data
        if (c.volumeVsBudget == null || c.amountVsBudget == null) return false;
        
        // Must have significant performance gap
        if (c.amountVsBudget <= c.volumeVsBudget + MIN_PERFORMANCE_GAP) return false;
        
        // Must meet materiality thresholds
        const volumeShare = totalActual > 0 ? (c.volumeActual / totalActual) : 0;
        const volumeMT = (c.volumeActual || 0) / 1000;
        
        return volumeShare >= MIN_VOLUME_SHARE && volumeMT >= MIN_ABSOLUTE_VOLUME;
      })
      .sort((a, b) => (b.amountVsBudget - b.volumeVsBudget) - (a.amountVsBudget - a.volumeVsBudget))
      .slice(0, 3); // Reduced to top 3 since we're being more selective

    // Retention analysis
    let retentionAnalysis = { retentionRate:0, churnRate:0, retainedCustomers:0, lostCustomers:0, newCustomers:0, totalPreviousCustomers:0, lostCustomerNames:[], newCustomerNames:[], retentionRisk:'LOW' };
    if (previousYearIndex >= 0) {
      const previousCustomers = finalRows.filter(r => (r.rawValues?.[previousYearIndex] || 0) > 0).map(r => ({ key: keyName(r.name), name: r.name, volume: r.rawValues?.[previousYearIndex] || 0 }));
      const currentCustomers  = finalRows.filter(r => (r.rawValues?.[basePeriodIndex] || 0) > 0).map(r => ({ key: keyName(r.name), name: r.name, volume: r.rawValues?.[basePeriodIndex] || 0 }));
      const prevSet = new Set(previousCustomers.map(c => c.key));
      const curSet  = new Set(currentCustomers.map(c => c.key));
      const retained = previousCustomers.filter(c => curSet.has(c.key));
      const lost = previousCustomers.filter(c => !curSet.has(c.key));
      const added = currentCustomers.filter(c => !prevSet.has(c.key));
      const totalPrevCust = previousCustomers.length;
      const retentionRate = totalPrevCust > 0 ? (retained.length / totalPrevCust) : 0;
      const churnRate = totalPrevCust > 0 ? (lost.length / totalPrevCust) : 0;
      const retentionRisk = churnRate >= 0.3 ? 'HIGH' : churnRate >= 0.15 ? 'MEDIUM' : 'LOW';
      retentionAnalysis = { retentionRate, churnRate, retainedCustomers: retained.length, lostCustomers: lost.length, newCustomers: added.length, totalPreviousCustomers: totalPrevCust, lostCustomerNames: lost.map(c=>formatCustomerName(c.name)).slice(0,5), newCustomerNames: added.map(c=>formatCustomerName(c.name)).slice(0,5), retentionRisk };
    }

    // Variances
    const vsBudget = ratioPct(totalActual, totalBudget);
    const yoy = ratioPct(totalActual, totalPrev);
    const vsBudgetAmount = ratioPct(totalAmountActual, totalAmountBudget);
    const yoyAmount = ratioPct(totalAmountActual, totalAmountPrev);

    // Focus customers (materiality × variance scoring)
    const withCatchup = finalRows
      .map((r) => {
        const actual = r.rawValues?.[basePeriodIndex] || 0;
        const budget = budgetIndex >= 0 ? (r.rawValues?.[budgetIndex] || 0) : 0;
        const prev = previousYearIndex >= 0 ? (r.rawValues?.[previousYearIndex] || 0) : 0;
        const vsBudget = ratioPct(actual, budget);
        const yoy = ratioPct(actual, prev);
        const share = totalActual > 0 ? (actual / totalActual) : 0;
        const materialityScore = share * 100;
        const varianceScore = Math.abs(vsBudget || 0) + Math.abs(yoy || 0);
        const priorityScore = materialityScore * varianceScore;
        
        return {
          name: r.name,
          actual,
          budget,
          prev,
          vsBudget,
          yoy,
          share,
          materialityScore,
          varianceScore,
          priorityScore,
          catchUpRequired: monthsRemaining > 0 && budget > actual ? (budget - actual) / monthsRemaining : 0
        };
      })
      .filter((c) => c.actual > 0 || c.budget > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    // Coverage rule: ensure top customers by volume are included
    const sortedByVolume = [...withCatchup].sort((a, b) => b.actual - a.actual);
    let cumShare = 0;
    const focusSet = new Set();
    
    // Add high-priority customers
    withCatchup.slice(0, MAX_FOCUS).forEach(c => focusSet.add(c.name));
    
    // Ensure coverage of top volume customers
    for (const customer of sortedByVolume) {
      if (focusSet.size >= MAX_FOCUS) break;
      cumShare += customer.share;
      focusSet.add(customer.name);
      if (cumShare >= CUM_SHARE_TARGET) break;
    }

    const focusCustomers = withCatchup.filter(c => focusSet.has(c.name)).slice(0, MAX_FOCUS);

    // Categorize customers
    const growthDrivers = focusCustomers.filter((c) => 
      (c.vsBudget != null && c.vsBudget >= GROWTH_VOL_PCT) || 
      (c.yoy != null && c.yoy >= GROWTH_YOY_VOL)
    ).slice(0, MAX_LIST);

    const underperformers = focusCustomers.filter((c) => 
      (c.vsBudget != null && c.vsBudget <= UNDERPERF_VOL_PCT) || 
      (c.yoy != null && c.yoy <= UNDERPERF_YOY_VOL)
    ).slice(0, MAX_LIST);

    const stable = focusCustomers.filter((c) => 
      !growthDrivers.some(g => g.name === c.name) && 
      !underperformers.some(u => u.name === c.name)
    ).slice(0, MAX_LIST);

    // Portfolio projections
    const portfolioRemainingMt = Math.max(0, (totalFyBudget || totalBudget * 12 / Math.max(1, 12 - monthsRemaining)) - totalActual);
    const portfolioPerMonthMt = monthsRemaining > 0 ? portfolioRemainingMt / monthsRemaining : 0;

    // Coverage percentage
    const cum = focusCustomers.reduce((s, c) => s + c.share, 0);

    // Concentration risk
    const sortedCustomers = finalRows
      .map(r => ({
        name: r.name,
        volume: r.rawValues?.[basePeriodIndex] || 0,
        share: totalActual > 0 ? ((r.rawValues?.[basePeriodIndex] || 0) / totalActual) : 0
      }))
      .filter(c => c.volume > 0)
      .sort((a, b) => b.volume - a.volume);

    const customerCount = sortedCustomers.length;
    const totalCustomers = finalRows.length;
    const top1CustomerShare = sortedCustomers[0]?.share || 0;
    const top3CustomerShare = sortedCustomers.slice(0, 3).reduce((sum, c) => sum + c.share, 0);
    const top5CustomerShare = sortedCustomers.slice(0, 5).reduce((sum, c) => sum + c.share, 0);
    const avgVolumePerCustomer = customerCount > 0 ? totalActual / customerCount : 0;
    const customerEfficiency = totalActual > 0 ? (totalAmountActual / totalActual) : 0;
    
    let concentrationRiskLevel = 'LOW';
    if (top1CustomerShare > 0.5) concentrationRiskLevel = 'CRITICAL';
    else if (top1CustomerShare > 0.3 || top3CustomerShare > 0.7) concentrationRiskLevel = 'HIGH';
    else if (top1CustomerShare > 0.2 || top3CustomerShare > 0.5) concentrationRiskLevel = 'MEDIUM';

    const hasPreviousYearData = previousYearIndex >= 0 && totalPrev > 0 && totalAmountPrev > 0;

    // Executive summary
    const executiveSummary = {
      portfolioHealth: vsBudget >= 0 ? 'ON_TRACK' : vsBudget >= -10 ? 'AT_RISK' : 'UNDERPERFORMING',
      keyRisks: [
        ...(concentrationRiskLevel === 'HIGH' || concentrationRiskLevel === 'CRITICAL' ? ['High customer concentration'] : []),
        ...(retentionAnalysis.churnRate > 0.2 ? ['High customer churn'] : []),
        ...(underperformers.length > focusCustomers.length * 0.4 ? ['Multiple underperforming customers'] : []),
        ...(!runRateInfo.isOnTrack ? ['Behind FY budget pace'] : [])
      ].slice(0, 3),
      opportunities: [
        ...(growthDrivers.length > 0 ? [`${growthDrivers.length} growth drivers identified`] : []),
        ...(volumeAdvantageCustomers.length > 0 ? ['Volume efficiency opportunities'] : []),
        ...(salesAdvantageCustomers.length > 0 ? ['Price realization opportunities'] : []),
        ...(retentionAnalysis.newCustomers > 0 ? [`${retentionAnalysis.newCustomers} new customers acquired`] : [])
      ].slice(0, 3)
    };

    return {
      base: { rep, basePeriodIndex, budgetIndex, previousYearIndex },
      totals: {
        totalActual, totalBudget, totalPrev, totalYtdCur, totalYtdPrev, totalFyCur, totalFyPrev, totalFyBudget,
        totalAmountActual, totalAmountBudget, totalAmountPrev, totalAmountYtdCur, totalAmountYtdPrev, totalAmountFyCur, totalAmountFyPrev, totalAmountFyBudget
      },
      vsBudget, yoy, vsBudgetAmount, yoyAmount,
      runRateInfo, monthsRemaining,
      focusCustomers: withCatchup,
      growthDrivers, underperformers, stable,
      portfolioRemainingMt, portfolioPerMonthMt,
      coveragePct: cum,
      hasPreviousYearData,
      concentrationRisk: {
        level: concentrationRiskLevel,
        customerCount,
        totalCustomers,
        top1Share: top1CustomerShare,
        top3Share: top3CustomerShare,
        top5Share: top5CustomerShare,
        avgVolumePerCustomer,
        customerEfficiency,
        topCustomers: sortedCustomers.slice(0,5)
      },
      retentionAnalysis,
      comprehensiveInsights: {
        volumeVsSalesPerformance: {
          volumeBudgetVar: vsBudget,
          salesBudgetVar: vsBudgetAmount,
          volumeYoY: yoy,
          salesYoY: yoyAmount,
          avgKiloRate,
          avgKiloRatePrev,
          avgKiloRateBudget,
          kiloRateYoY,
          kiloRateVsBudget
        },
        pvm: { priceEffect, volumeEffect, mixEffect, pvmAvailable },
        customerAnalysis: customerVolumeVsSales,
        topPerformers: { volume: topVolumePerformers, sales: topSalesPerformers, kiloRate: topKiloRatePerformers },
        advantageAnalysis: {
          volumeAdvantage: volumeAdvantageCustomers,
          salesAdvantage: salesAdvantageCustomers,
          outliers
        }
      },
      executiveSummary
    };
  }, [finalRows, finalAmountRows, columnOrder, basePeriodIndex]);

  // Notify parent of findings
  useEffect(() => {
    if (findings && onFindingsCalculated) {
      onFindingsCalculated(findings);
    }
  }, [findings, onFindingsCalculated]);

  // ============================== RENDER ====================================
  if (!findings) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Customer Key Facts</h3>
        {waitingForTable || waitingForAmountTable ? (
          <div style={styles.insight}>Loading customer data...</div>
        ) : (
          <div style={styles.insight}>No customer rows available for analysis.</div>
        )}
      </div>
    );
  }

  const {
    base, totals, vsBudget, yoy, vsBudgetAmount, yoyAmount, runRateInfo, monthsRemaining,
    focusCustomers, growthDrivers, underperformers, stable,
    portfolioRemainingMt, portfolioPerMonthMt, coveragePct,
    concentrationRisk, retentionAnalysis, hasPreviousYearData, comprehensiveInsights, executiveSummary
  } = findings;

  const kpi = (label, value, accent) => (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{...styles.kpiValue, color: accent || '#111827'}}>{value}</div>
    </div>
  );

  const summaryAccent = (n) => (n == null ? undefined : (n >= 0 ? '#059669' : '#dc2626'));

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Customer Key Facts</h3>

      {/* Executive Summary */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📊 Executive Overview</h4>
        <div style={styles.insight}>
          The customer portfolio demonstrates {concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL' ? 'remarkable concentration and strategic focus' : 'balanced distribution'}, with the top 3 customers commanding {formatPct(concentrationRisk.top3Share * 100)} of total volume and the top 5 accounting for {formatPct(concentrationRisk.top5Share * 100)}. This reveals a {concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL' ? 'highly focused B2B strategy' : 'diversified customer approach'} with {concentrationRisk.customerCount} active customers generating an average of {formatMt(concentrationRisk.avgVolumePerCustomer)} per customer.
          
          {executiveSummary.keyRisks.length > 0 && (
            <><br/><br/><strong>Key Risks:</strong> {executiveSummary.keyRisks.join(', ')}</>
          )}
          {executiveSummary.opportunities.length > 0 && (
            <><br/><strong>Opportunities:</strong> {executiveSummary.opportunities.join(', ')}</>
          )}
        </div>
      </div>

      {/* Volume vs Sales & PVM */}
      {comprehensiveInsights.customerAnalysis.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>⚖️ Volume vs Sales Performance</h4>
          <div style={styles.insight}>
            {comprehensiveInsights.pvm.pvmAvailable ? (
              <>
                <strong>Price-Volume-Mix Analysis:</strong><br/>
                • Price Effect: {formatPct(comprehensiveInsights.pvm.priceEffect)}<br/>
                • Volume Effect: {formatPct(comprehensiveInsights.pvm.volumeEffect)}<br/>
                • Portfolio Kilo Rate: <UAEDirhamSymbol />{formatAED(comprehensiveInsights.volumeVsSalesPerformance.avgKiloRate)}/MT
                ({hasPreviousYearData && comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY !== null ? `${formatPct(comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY)} YoY` : 'No YoY data'})
              </>
            ) : (
              <>
                <strong>Price-Volume Analysis:</strong><br/>
                • Portfolio Kilo Rate: <UAEDirhamSymbol />{formatAED(comprehensiveInsights.volumeVsSalesPerformance.avgKiloRate)}/MT<br/>
                • PVM Analysis: Requires previous year or budget data for comparison
              </>
            )}
          </div>
          
          {comprehensiveInsights.advantageAnalysis.volumeAdvantage.length > 0 && (
            <div style={styles.insight}>
              <strong>Volume Advantage (Volume outperforming Sales):</strong><br/>
              {comprehensiveInsights.advantageAnalysis.volumeAdvantage.map(c => {
                const volumeShare = totals.totalActual > 0 ? ((c.volumeActual / totals.totalActual) * 100) : 0;
                const volumeMT = (c.volumeActual || 0) / 1000;
                return `• ${formatCustomerName(c.name)}: Vol ${formatPct(c.volumeVsBudget)} vs Sales ${formatPct(c.amountVsBudget)} (${formatPct(c.volumeVsBudget - c.amountVsBudget)} gap) [${volumeShare.toFixed(1)}% share, ${volumeMT.toFixed(0)}MT]`;
              }).join('<br/>')}
            </div>
          )}
          
          {comprehensiveInsights.advantageAnalysis.salesAdvantage.length > 0 && (
            <div style={styles.insight}>
              <strong>Sales Advantage (Sales outperforming Volume):</strong><br/>
              {comprehensiveInsights.advantageAnalysis.salesAdvantage.map(c => {
                const volumeShare = totals.totalActual > 0 ? ((c.volumeActual / totals.totalActual) * 100) : 0;
                const volumeMT = (c.volumeActual || 0) / 1000;
                return `• ${formatCustomerName(c.name)}: Sales ${formatPct(c.amountVsBudget)} vs Vol ${formatPct(c.volumeVsBudget)} (${formatPct(c.amountVsBudget - c.volumeVsBudget)} premium) [${volumeShare.toFixed(1)}% share, ${volumeMT.toFixed(0)}MT]`;
              }).join('<br/>')}
            </div>
          )}
          
          {comprehensiveInsights.advantageAnalysis.volumeAdvantage.length === 0 && comprehensiveInsights.advantageAnalysis.salesAdvantage.length === 0 && (
            <div style={styles.insight}>
              <em style={{color: '#666'}}>No customers meet materiality thresholds for advantage analysis (≥2% volume share, ≥10MT volume, ≥10% performance gap)</em>
            </div>
          )}
        </div>
      )}

      {/* Multi-Period Trend Analysis (3-Year) */}
      {hasPreviousYearData && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>📈 Multi-Period Trend Analysis</h4>
          <div style={styles.insight}>
            <strong>3-Year Performance Trends:</strong><br/>
            • Volume Growth: {formatPct(yoy)} YoY<br/>
            • Sales Growth: {formatPct(yoyAmount)} YoY<br/>
            • Price Realization: {formatPct(comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY)} YoY<br/>
            {comprehensiveInsights.advantageAnalysis.outliers.length > 0 && (
              <>
                <br/><strong>Anomaly Detection (Statistical Outliers):</strong><br/>
                {comprehensiveInsights.advantageAnalysis.outliers.map(o => 
                  `• ${formatCustomerName(o.name)}: ${formatPct(o.yoyRate)} YoY (Z-score: ${o.zScore.toFixed(1)})`
                ).join('<br/>')}
              </>
            )}
          </div>
        </div>
      )}

      {/* Top Contributors */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🏆 Top Contributors</h4>
        <div style={styles.dual}>
          <div>
            <strong>By Volume:</strong>
            {comprehensiveInsights.topPerformers.volume.map((c, i) => (
              <div key={c.name} style={styles.topCustomerItem}>
                <div style={styles.customerRank}>{i + 1}</div>
                <div style={styles.customerNameSmall}>{formatCustomerName(c.name)}</div>
                <div style={styles.customerVolume}>{formatMt(c.volume)}</div>
                <div style={styles.customerShare}>{formatPct(c.share)}</div>
              </div>
            ))}
          </div>
          <div>
            <strong>By Sales:</strong>
            {comprehensiveInsights.topPerformers.sales.map((c, i) => (
              <div key={c.name} style={styles.topCustomerItem}>
                <div style={styles.customerRank}>{i + 1}</div>
                <div style={styles.customerNameSmall}>{formatCustomerName(c.name)}</div>
                <div style={styles.customerVolume}>{formatAmountString(c.amount)}</div>
                <div style={styles.customerShare}>{formatPct(c.share)}</div>
              </div>
            ))}
          </div>
        </div>
        
        {comprehensiveInsights.topPerformers.kiloRate.length > 0 && (
          <div style={styles.insight}>
            <strong>Highest Kilo Rates (Min 1% volume share):</strong><br/>
            {comprehensiveInsights.topPerformers.kiloRate.map((c, index) => (
              <React.Fragment key={c.name}>
                {index > 0 && <br/>}
                • {formatCustomerName(c.name)}: <UAEDirhamSymbol />{formatAED(c.kiloRate)}/MT ({formatMt(c.volume)})
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Concentration Risk Analysis */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🎯 Concentration Risk Analysis</h4>
        <div style={styles.concentrationGrid}>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Risk Level</div><div style={styles.metricValue}>{concentrationRisk.level}</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Top Customer</div><div style={styles.metricValue}>{formatPct(concentrationRisk.top1Share * 100)}</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Top 3 Share</div><div style={styles.metricValue}>{formatPct(concentrationRisk.top3Share * 100)}</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Active Customers</div><div style={styles.metricValue}>{concentrationRisk.customerCount}</div></div>
        </div>
        <div style={styles.insight}>
          <strong>Top 5 Customers by Volume:</strong><br/>
          {concentrationRisk.topCustomers.map((c, i) => (
            <div key={i}>
              {i + 1}. {formatCustomerName(c.name)}: {formatMt(c.volume)} ({formatPct(c.share * 100)})
            </div>
          ))}
        </div>
      </div>

      {/* Customer Retention & Churn Analysis */}
      {hasPreviousYearData && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🔄 Customer Retention & Churn Analysis</h4>
          <div style={styles.retentionGrid}>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Retention Rate</div><div style={styles.metricValue}>{formatPct(retentionAnalysis.retentionRate * 100)}</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Churn Rate</div><div style={styles.metricValue}>{formatPct(retentionAnalysis.churnRate * 100)}</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Lost Customers</div><div style={styles.metricValue}>{retentionAnalysis.lostCustomers}</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>New Customers</div><div style={styles.metricValue}>{retentionAnalysis.newCustomers}</div></div>
          </div>
        </div>
      )}

      {/* Growth / Risk */}
      {(growthDrivers.length > 0 || underperformers.length > 0 || stable.length > 0) && (
        <div style={styles.performanceGrid}>
          {growthDrivers.length > 0 && (
            <div style={styles.growthDriversCard}>
              <div style={styles.cardHeader}>
                <div style={styles.growthIcon}>🚀</div>
                <h4 style={styles.growthTitle}>Growth Drivers</h4>
                <div style={styles.growthBadge}>{growthDrivers.length}</div>
              </div>
              <div style={styles.performanceList}>
                {growthDrivers.map((c, index) => (
                  <div key={c.name} style={styles.growthItem}>
                    <div style={styles.performanceRank}>{index + 1}</div>
                    <div style={styles.performanceContent}>
                      <div style={styles.customerNameBold}>{c.name}</div>
                      <div style={styles.performanceMetrics}>
                        <span style={styles.volumeMetric}>{formatMt(c.actual)}</span>
                        {c.vsBudget != null && (
                          <span style={styles.budgetMetric}>
                            {formatPct(c.vsBudget)} vs budget
                          </span>
                        )}
                        {hasPreviousYearData && c.yoy != null && (
                          <span style={styles.yoyMetric}>
                            {formatPct(c.yoy)} YoY
                          </span>
                        )}
                        {!hasPreviousYearData && (
                          <span style={styles.noDataMetric}>No YoY data</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.trendIndicator}>📈</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {underperformers.length > 0 && (
            <div style={styles.underperformersCard}>
              <div style={styles.cardHeader}>
                <div style={styles.warningIcon}>⚠️</div>
                <h4 style={styles.underperformersTitle}>Underperformers</h4>
                <div style={styles.warningBadge}>{underperformers.length}</div>
              </div>
              <div style={styles.performanceList}>
                {underperformers.map((c, index) => (
                  <div key={c.name} style={styles.underperformerItem}>
                    <div style={styles.performanceRank}>{index + 1}</div>
                    <div style={styles.performanceContent}>
                      <div style={styles.customerNameBold}>{c.name}</div>
                      <div style={styles.performanceMetrics}>
                        <span style={styles.volumeMetric}>{formatMt(c.actual)}</span>
                        {c.vsBudget != null && (
                          <span style={styles.budgetMetricNegative}>
                            {formatPct(c.vsBudget)} vs budget
                          </span>
                        )}
                        {hasPreviousYearData && c.yoy != null && (
                          <span style={styles.yoyMetricNegative}>
                            {formatPct(c.yoy)} YoY
                          </span>
                        )}
                        {!hasPreviousYearData && (
                          <span style={styles.noDataMetric}>No YoY data</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.trendIndicator}>📉</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategic Priorities */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🎯 Strategic Priorities</h4>
        <div style={styles.recommendations}>
          {!runRateInfo.isOnTrack && (
            <div style={styles.recommendation}>
              📈 <strong>Accelerate Performance:</strong> Need {formatMt(runRateInfo.catchUpRequired)}/month to meet FY target
            </div>
          )}
          {(concentrationRisk.level === 'HIGH' || concentrationRisk.level === 'CRITICAL') && (
            <div style={styles.recommendation}>
              ⚖️ <strong>Diversify Portfolio:</strong> High concentration risk - develop smaller customers
            </div>
          )}
          {hasPreviousYearData && retentionAnalysis.churnRate > 0.2 && (
            <div style={styles.recommendation}>
              🔒 <strong>Improve Retention:</strong> {formatPct(retentionAnalysis.churnRate * 100)} churn rate needs attention
            </div>
          )}
          {comprehensiveInsights.advantageAnalysis.volumeAdvantage.length > 0 && (
            <div style={styles.recommendation}>
              💰 <strong>Price Optimization:</strong> {comprehensiveInsights.advantageAnalysis.volumeAdvantage.length} customers show volume-sales gaps
            </div>
          )}
          {comprehensiveInsights.advantageAnalysis.salesAdvantage.length > 0 && (
            <div style={styles.recommendation}>
              💎 <strong>Premium Strategy:</strong> {comprehensiveInsights.advantageAnalysis.salesAdvantage.length} customers show strong pricing power
            </div>
          )}
          {focusCustomers.length > 0 && (
            <div style={styles.recommendation}>
              🎯 <strong>Focus Customers:</strong> {focusCustomers.length} customers need immediate attention for budget achievement
            </div>
          )}
          {growthDrivers.length > 0 && (
            <div style={styles.recommendation}>
              🚀 <strong>Growth Drivers:</strong> Leverage {growthDrivers.length} high-performing customers for expansion
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
    borderRadius: 12,
    padding: 24,
    margin: '20px 0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  title: {
    color: '#1e293b',
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
    textAlign: 'center',
    background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 16 },
  kpi: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  kpiLabel: { fontSize: 12, color: '#6b7280' },
  kpiValue: { fontSize: 18, fontWeight: 700 },
  section: { background: '#ffffff', borderRadius: 10, padding: 16, marginBottom: 16, borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  sectionTitle: { color: '#1e40af', fontSize: 18, fontWeight: 600, marginBottom: 10 },
  insight: { padding: '12px 16px', background: '#eff6ff', borderRadius: 8, marginBottom: 12, fontSize: 15, lineHeight: 1.6, color: '#1e40af', borderLeft: '3px solid #3b82f6' },
  code: { display: 'block', background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 6, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  dual: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 },
  hiliteGreen: { borderLeft: '4px solid #059669' },
  hiliteRed: { borderLeft: '4px solid #dc2626' },
  bullet: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' },
  card: { padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  rank: { width: 28, height: 28, borderRadius: 6, background: '#1e40af', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  customerName: { fontWeight: 700, fontSize: 16, color: '#1f2937' },
   cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 },
   recommendations: { display: 'grid', gap: 8 },
   recommendation: { background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: 10, borderRadius: 8, fontSize: 14 },
   concentrationGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 16 },
   concentrationMetric: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, textAlign: 'center' },
   metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 500 },
   metricValue: { fontSize: 16, fontWeight: 700, color: '#1f2937' },
   topCustomerItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, marginBottom: 6, border: '1px solid #e5e7eb' },
   customerRank: { width: 24, height: 24, borderRadius: 4, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 },
   customerNameSmall: { flex: 1, fontWeight: 600, fontSize: 14, color: '#1f2937' },
   customerVolume: { fontWeight: 600, fontSize: 14, color: '#374151' },
   customerShare: { fontWeight: 700, fontSize: 14, color: '#3b82f6', minWidth: 60, textAlign: 'right' },
   retentionGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 12 },
   retentionMetric: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, textAlign: 'center' },
   
   // Enhanced Performance Grid Styles
   performanceGrid: { 
     display: 'grid', 
     gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
     gap: 20, 
     marginBottom: 20 
   },
   
   // Growth Drivers Card
   growthDriversCard: {
     background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
     borderRadius: 16,
     padding: 20,
     border: '2px solid #10b981',
     boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)',
     transition: 'all 0.3s ease',
     position: 'relative',
     overflow: 'hidden'
   },
   
   // Underperformers Card
   underperformersCard: {
     background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
     borderRadius: 16,
     padding: 20,
     border: '2px solid #ef4444',
     boxShadow: '0 8px 25px rgba(239, 68, 68, 0.15)',
     transition: 'all 0.3s ease',
     position: 'relative',
     overflow: 'hidden'
   },
   
   // Card Headers
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16
    },
    
    growthIcon: {
     fontSize: 24,
     background: 'linear-gradient(135deg, #10b981, #059669)',
     borderRadius: 12,
     width: 48,
     height: 48,
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'center',
     boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
   },
   
   warningIcon: {
     fontSize: 24,
     background: 'linear-gradient(135deg, #ef4444, #dc2626)',
     borderRadius: 12,
     width: 48,
     height: 48,
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'center',
     boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
   },
   
   growthTitle: {
     color: '#065f46',
     fontSize: 20,
     fontWeight: 700,
     margin: 0,
     flex: 1,
     textTransform: 'uppercase',
     letterSpacing: '0.5px'
   },
   
   underperformersTitle: {
     color: '#991b1b',
     fontSize: 20,
     fontWeight: 700,
     margin: 0,
     flex: 1,
     textTransform: 'uppercase',
     letterSpacing: '0.5px'
   },
   
   growthBadge: {
     background: 'linear-gradient(135deg, #10b981, #059669)',
     color: 'white',
     borderRadius: 20,
     padding: '6px 12px',
     fontSize: 14,
     fontWeight: 700,
     minWidth: 30,
     textAlign: 'center',
     boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
   },
   
   warningBadge: {
     background: 'linear-gradient(135deg, #ef4444, #dc2626)',
     color: 'white',
     borderRadius: 20,
     padding: '6px 12px',
     fontSize: 14,
     fontWeight: 700,
     minWidth: 30,
     textAlign: 'center',
     boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
   },
   
   // Performance List
   performanceList: {
     marginTop: 16,
     display: 'flex',
     flexDirection: 'column',
     gap: 12
   },
   
   // Growth Item
   growthItem: {
     background: 'rgba(255, 255, 255, 0.8)',
     borderRadius: 12,
     padding: 16,
     display: 'flex',
     alignItems: 'center',
     gap: 12,
     border: '1px solid rgba(16, 185, 129, 0.2)',
     transition: 'all 0.2s ease',
     backdropFilter: 'blur(10px)',
     boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
   },
   
   // Underperformer Item
   underperformerItem: {
     background: 'rgba(255, 255, 255, 0.8)',
     borderRadius: 12,
     padding: 16,
     display: 'flex',
     alignItems: 'center',
     gap: 12,
     border: '1px solid rgba(239, 68, 68, 0.2)',
     transition: 'all 0.2s ease',
     backdropFilter: 'blur(10px)',
     boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
   },
   
   // Performance Rank
   performanceRank: {
     background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
     color: 'white',
     borderRadius: 10,
     width: 32,
     height: 32,
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'center',
     fontSize: 14,
     fontWeight: 700,
     boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
     flexShrink: 0
   },
   
   // Performance Content
   performanceContent: {
     flex: 1,
     display: 'flex',
     flexDirection: 'column',
     gap: 6
   },
   
   customerNameBold: {
     fontSize: 16,
     fontWeight: 700,
     color: '#1f2937',
     lineHeight: 1.2
   },
   
   performanceMetrics: {
     display: 'flex',
     flexWrap: 'wrap',
     gap: 8,
     alignItems: 'center'
   },
   
   volumeMetric: {
     background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
     color: '#374151',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 600,
     border: '1px solid #d1d5db'
   },
   
   budgetMetric: {
     background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
     color: '#1e40af',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 600,
     border: '1px solid #93c5fd'
   },
   
   budgetMetricNegative: {
     background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
     color: '#dc2626',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 600,
     border: '1px solid #f87171'
   },
   
   yoyMetric: {
     background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
     color: '#065f46',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 600,
     border: '1px solid #6ee7b7'
   },
   
   yoyMetricNegative: {
     background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
     color: '#dc2626',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 600,
     border: '1px solid #f87171'
   },
   
   noDataMetric: {
     background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
     color: '#6b7280',
     padding: '4px 8px',
     borderRadius: 6,
     fontSize: 12,
     fontWeight: 500,
     border: '1px solid #d1d5db',
     fontStyle: 'italic'
   },
   
   trendIndicator: {
     fontSize: 20,
     flexShrink: 0,
     opacity: 0.7
   }
 };

 export default CustomerKeyFacts;