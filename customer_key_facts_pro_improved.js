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

const toProperCase = (str) => (str || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

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

  // 2) rowsOverride
  useEffect(() => {
    if (Array.isArray(rowsOverride) && rowsOverride.length > 0) {
      setRows(rowsOverride);
      setWaitingForTable(false);
    }
  }, [rowsOverride]);

  // 2b) amountRowsOverride
  useEffect(() => {
    if (Array.isArray(amountRowsOverride) && amountRowsOverride.length > 0) {
      setAmountRows(amountRowsOverride);
      setWaitingForAmountTable(false);
    }
  }, [amountRowsOverride]);

  // 3) fallback build
  useEffect(() => {
    (async () => {
      if (hasMountedRef.current) return;
      hasMountedRef.current = true;
      setTimeout(async () => {
        if (waitingForTable) {
          if (rep && Array.isArray(columnOrder) && columnOrder.length > 0) {
            let built = await buildRowsFromApi(rep, columnOrder, 'Actual');
            built = await applySavedMergeRules(rep, 'FP', built);
            setRows(built);
          } else {
            setRows(null);
          }
          setWaitingForTable(false);
        }
        if (waitingForAmountTable) {
          if (rep && Array.isArray(columnOrder) && columnOrder.length > 0) {
            let built = await buildRowsFromApi(rep, columnOrder, 'Amount');
            built = await applySavedMergeRules(rep, 'FP', built);
            setAmountRows(built);
          } else {
            setAmountRows(null);
          }
          setWaitingForAmountTable(false);
        }
      }, 300);
    })();
  }, [waitingForTable, waitingForAmountTable, rep, columnOrder]);

  // ============================== ANALYTICS ==================================
  const findings = useMemo(() => {
    if (!rows || !Array.isArray(columnOrder) || columnOrder.length === 0 || basePeriodIndex == null) return null;

    const base = columnOrder[basePeriodIndex];
    const budgetIndex = findBudgetIndex(columnOrder, basePeriodIndex);

    const previousYearIndex = columnOrder.findIndex(col => col?.type === 'Actual' && String(col?.year) === String((base?.year ?? 0) - 1) && normalize(col?.month) === normalize(base?.month));

    const hasPreviousYearData = previousYearIndex >= 0;
    const ytdCurrentIndex = columnOrder.findIndex(col => isYTDCol(col) && col.year === base?.year);
    const ytdPreviousIndex = columnOrder.findIndex(col => isYTDCol(col) && col.year === (base?.year ?? 0) - 1);
    const fyCurrentIndex = columnOrder.findIndex(col => isFYCol(col) && col.year === base?.year);
    const fyPreviousIndex = columnOrder.findIndex(col => isFYCol(col) && col.year === (base?.year ?? 0) - 1);
    const fyBudgetIndex = columnOrder.findIndex(col => isBudgetColGeneric(col) && col.year === base?.year && (isFYCol(col) || normalize(col?.month) === 'fy'));

    // Portfolio totals - Volume
    const totalActual = safeSumAt(basePeriodIndex, rows);
    const totalBudget = budgetIndex >= 0 ? safeSumAt(budgetIndex, rows) : 0;
    const totalPrev = previousYearIndex >= 0 ? safeSumAt(previousYearIndex, rows) : 0;
    const totalYtdCur = ytdCurrentIndex >= 0 ? safeSumAt(ytdCurrentIndex, rows) : 0;
    const totalYtdPrev = ytdPreviousIndex >= 0 ? safeSumAt(ytdPreviousIndex, rows) : 0;
    const totalFyCur = fyCurrentIndex >= 0 ? safeSumAt(fyCurrentIndex, rows) : 0;
    const totalFyPrev = fyPreviousIndex >= 0 ? safeSumAt(fyPreviousIndex, rows) : 0;
    const totalFyBudget = fyBudgetIndex >= 0 ? safeSumAt(fyBudgetIndex, rows) : 0;

    // Portfolio totals - Amount
    const totalAmountActual = amountRows ? safeSumAt(basePeriodIndex, amountRows) : 0;
    const totalAmountBudget = amountRows && budgetIndex >= 0 ? safeSumAt(budgetIndex, amountRows) : 0;
    const totalAmountPrev = amountRows && previousYearIndex >= 0 ? safeSumAt(previousYearIndex, amountRows) : 0;
    const totalAmountYtdCur = amountRows && ytdCurrentIndex >= 0 ? safeSumAt(ytdCurrentIndex, amountRows) : 0;
    const totalAmountYtdPrev = amountRows && ytdPreviousIndex >= 0 ? safeSumAt(ytdPreviousIndex, amountRows) : 0;
    const totalAmountFyCur = amountRows && fyCurrentIndex >= 0 ? safeSumAt(fyCurrentIndex, amountRows) : 0;
    const totalAmountFyPrev = amountRows && fyPreviousIndex >= 0 ? safeSumAt(fyPreviousIndex, amountRows) : 0;
    const totalAmountFyBudget = amountRows && fyBudgetIndex >= 0 ? safeSumAt(fyBudgetIndex, amountRows) : 0;

    // Active customers and sorted list
    const activeCustomers = rows.filter(r => (r.rawValues?.[basePeriodIndex] || 0) > 0);
    const customerCount = activeCustomers.length;
    const totalCustomers = rows.length;

    const sortedCustomers = activeCustomers
      .map(r => ({ name: r.name, volume: r.rawValues?.[basePeriodIndex] || 0 }))
      .sort((a,b) => b.volume - a.volume);

    // Concentration
    const top1CustomerShare = customerCount > 0 ? (sortedCustomers[0]?.volume || 0) / (totalActual || 1) : 0;
    const top3CustomerShare = customerCount > 0 ? sortedCustomers.slice(0, Math.min(3, customerCount)).reduce((s,c)=>s+c.volume,0) / (totalActual || 1) : 0;
    const top5CustomerShare = customerCount > 0 ? sortedCustomers.slice(0, Math.min(5, customerCount)).reduce((s,c)=>s+c.volume,0) / (totalActual || 1) : 0;

    const HIGH_CONCENTRATION_THRESHOLD = 0.5;
    const MEDIUM_CONCENTRATION_THRESHOLD = 0.3;
    const LOW_CUSTOMER_COUNT_THRESHOLD = 5;

    const concentrationRiskLevel = (() => {
      if (customerCount <= LOW_CUSTOMER_COUNT_THRESHOLD) return 'HIGH';
      if (top1CustomerShare >= HIGH_CONCENTRATION_THRESHOLD) return 'HIGH';
      if (top1CustomerShare >= MEDIUM_CONCENTRATION_THRESHOLD) return 'MEDIUM';
      if (top3CustomerShare >= 0.8) return 'MEDIUM';
      return 'LOW';
    })();

    const avgVolumePerCustomer = customerCount > 0 ? totalActual / customerCount : 0;
    const customerEfficiency = totalActual > 0 ? customerCount / totalActual * 1000 : 0; // customers per 1000 MT

    // Retention & churn (use keyName to align merged names)
    let retentionAnalysis = { retentionRate:0, churnRate:0, retainedCustomers:0, lostCustomers:0, newCustomers:0, totalPreviousCustomers:0, lostCustomerNames:[], newCustomerNames:[], retentionRisk:'LOW' };
    if (previousYearIndex >= 0) {
      const previousCustomers = rows.filter(r => (r.rawValues?.[previousYearIndex] || 0) > 0).map(r => ({ key: keyName(r.name), name: r.name, volume: r.rawValues?.[previousYearIndex] || 0 }));
      const currentCustomers  = rows.filter(r => (r.rawValues?.[basePeriodIndex] || 0) > 0).map(r => ({ key: keyName(r.name), name: r.name, volume: r.rawValues?.[basePeriodIndex] || 0 }));
      const prevSet = new Set(previousCustomers.map(c => c.key));
      const curSet  = new Set(currentCustomers.map(c => c.key));
      const retained = previousCustomers.filter(c => curSet.has(c.key));
      const lost = previousCustomers.filter(c => !curSet.has(c.key));
      const added = currentCustomers.filter(c => !prevSet.has(c.key));
      const totalPrevCust = previousCustomers.length;
      const retentionRate = totalPrevCust > 0 ? (retained.length / totalPrevCust) : 0;
      const churnRate = totalPrevCust > 0 ? (lost.length / totalPrevCust) : 0;
      const retentionRisk = churnRate >= 0.3 ? 'HIGH' : churnRate >= 0.15 ? 'MEDIUM' : 'LOW';
      retentionAnalysis = { retentionRate, churnRate, retainedCustomers: retained.length, lostCustomers: lost.length, newCustomers: added.length, totalPreviousCustomers: totalPrevCust, lostCustomerNames: lost.map(c=>stripMergeMark(c.name)).slice(0,5), newCustomerNames: added.map(c=>stripMergeMark(c.name)).slice(0,5), retentionRisk };
    }

    // Variances
    const vsBudget = ratioPct(totalActual, totalBudget);
    const yoy = ratioPct(totalActual, totalPrev);
    const vsBudgetAmount = amountRows ? ratioPct(totalAmountActual, totalAmountBudget) : null;
    const yoyAmount = amountRows ? ratioPct(totalAmountActual, totalAmountPrev) : null;

    // Run-rate vs budget (prefer FY budget)
    let runRateInfo = null;
    if (ytdCurrentIndex >= 0) {
      const denomBudget = totalFyBudget > 0 ? totalFyBudget : totalBudget;
      if (denomBudget > 0) {
        const rr = totalYtdCur / denomBudget;
        runRateInfo = `Run-rate vs ${totalFyBudget > 0 ? 'FY' : 'period'} budget: ${(rr * 100).toFixed(1)}%`;
        if (rr < RUNRATE_WARN) runRateInfo += ` — below ${(RUNRATE_WARN * 100).toFixed(0)}% threshold`;
      }
    }

    // High-materiality selection (share-based)
    const customers = rows
      .map((r) => {
        const a = parseFloat(r?.rawValues?.[basePeriodIndex] ?? 0) || 0;
        const b = budgetIndex >= 0 ? (parseFloat(r?.rawValues?.[budgetIndex] ?? 0) || 0) : 0;
        const p = previousYearIndex >= 0 ? (parseFloat(r?.rawValues?.[previousYearIndex] ?? 0) || 0) : 0;
        const ytdC = ytdCurrentIndex >= 0 ? (parseFloat(r?.rawValues?.[ytdCurrentIndex] ?? 0) || 0) : 0;
        const ytdP = ytdPreviousIndex >= 0 ? (parseFloat(r?.rawValues?.[ytdPreviousIndex] ?? 0) || 0) : 0;
        const share = totalActual > 0 ? (a / totalActual) : 0;
        const matVarScore = share * Math.abs(ratioPct(a,b) ?? 0); // materiality × variance
        return {
          name: r.name,
          actual: a, budget: b, prev: p,
          ytdC, ytdP, share, matVarScore,
          vsBudget: ratioPct(a, b),
          yoy: ratioPct(a, p),
          ytdYoy: ratioPct(ytdC, ytdP)
        };
      })
      .filter(c => (c.actual || c.budget || c.prev))
      .sort((x, y) => y.actual - x.actual);

    // Coverage rule
    const focus = [];
    let cum = 0;
    for (const c of customers) {
      if (focus.length >= MAX_FOCUS) break;
      if (c.share < TOP_SHARE_MIN && cum >= CUM_SHARE_TARGET) break;
      focus.push(c);
      cum += c.share;
    }

    const growthDrivers = focus
      .filter(c => (c.vsBudget != null && c.vsBudget >= GROWTH_VOL_PCT) || (c.yoy != null && c.yoy >= GROWTH_YOY_VOL))
      .sort((a,b) => b.actual - a.actual)
      .slice(0, MAX_LIST);

    const underperformers = focus
      .filter(c => (c.vsBudget != null && c.vsBudget <= UNDERPERF_VOL_PCT) || (c.yoy != null && c.yoy <= UNDERPERF_YOY_VOL))
      .sort((a,b) => b.actual - a.actual)
      .slice(0, MAX_LIST);

    const stable = focus
      .filter(c => !growthDrivers.includes(c) && !underperformers.includes(c))
      .slice(0, MAX_LIST);

    // Months remaining in FY
    const monthsRemaining = (() => {
      const m = monthToNumber(base?.month);
      if (m === 'q1' || m === 'q2' || m === 'q3' || m === 'q4' || m === 'year' || m === 'fy') return null;
      return m ? Math.max(0, 12 - m) : null;
    })();

    // Catch-up (portfolio)
    const portfolioRemainingMt = (() => {
      const target = totalFyBudget || totalBudget;
      return target > 0 ? Math.max(0, target - (totalYtdCur || totalActual)) : 0;
    })();
    const portfolioPerMonthMt = (monthsRemaining && monthsRemaining > 0) ? (portfolioRemainingMt / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);

    // Per-customer catch-up
    const withCatchup = focus.map(c => {
      const target = (fyBudgetIndex >= 0 ? (parseFloat(rows.find(r => r.name === c.name)?.rawValues?.[fyBudgetIndex]) || 0) : 0) || c.budget;
      const current = ytdCurrentIndex >= 0 ? c.ytdC : c.actual;
      const gap = target > 0 ? Math.max(0, target - (current || 0)) : 0;
      const perMonth = (monthsRemaining && monthsRemaining > 0) ? (gap / monthsRemaining) : (monthsRemaining === 0 ? 0 : null);
      return { ...c, targetFY: target || null, gap, perMonth };
    });

    // ======= Volume vs Sales + PVM =======
    const avgKiloRate = totalActual > 0 ? totalAmountActual / (totalActual / 1000) : 0;
    const avgKiloRatePrev = totalPrev > 0 ? totalAmountPrev / (totalPrev / 1000) : 0;
    const avgKiloRateBudget = totalBudget > 0 ? totalAmountBudget / (totalBudget / 1000) : 0;

    const kiloRateYoY = (avgKiloRatePrev > 0) ? ((avgKiloRate - avgKiloRatePrev) / avgKiloRatePrev) * 100 : null;
    const kiloRateVsBudget = (avgKiloRateBudget > 0) ? ((avgKiloRate - avgKiloRateBudget) / avgKiloRateBudget) * 100 : null;

    // Portfolio PVM
    const volDiffMT = (totalActual - totalPrev) / 1000; // MT
    const priceEffect = avgKiloRatePrev > 0 ? (avgKiloRate - avgKiloRatePrev) * (totalActual / 1000) : 0;
    const volumeEffect = avgKiloRatePrev > 0 ? volDiffMT * avgKiloRatePrev : 0;
    const mixEffect = (totalAmountActual - totalAmountPrev) - (priceEffect + volumeEffect);

    // Customer-level volume vs sales analysis
    const customerVolumeVsSales = rows.map(customer => {
      const k = keyName(customer.name);
      const customerVolume = customer.rawValues?.[basePeriodIndex] || 0;
      const amountRow = amountRows?.find(ar => keyName(ar.name) === k);
      const customerAmount = amountRow?.rawValues?.[basePeriodIndex] || 0;
      const customerKiloRate = customerVolume > 0 ? customerAmount / (customerVolume / 1000) : 0;

      const prevVolume = customer.rawValues?.[previousYearIndex] || 0;
      const prevAmount = amountRow?.rawValues?.[previousYearIndex] || 0;
      const prevKiloRate = prevVolume > 0 ? prevAmount / (prevVolume / 1000) : 0;

      const volumeGrowth = prevVolume > 0 ? ((customerVolume - prevVolume) / prevVolume) * 100 : null;
      const salesGrowth = prevAmount > 0 ? ((customerAmount - prevAmount) / prevAmount) * 100 : null;
      const kiloRateChange = prevKiloRate > 0 ? ((customerKiloRate - prevKiloRate) / prevKiloRate) * 100 : null;

      // PVM per customer
      const volDiff = (customerVolume - prevVolume) / 1000;
      const priceEff = prevKiloRate > 0 ? (customerKiloRate - prevKiloRate) * (customerVolume / 1000) : 0;
      const volumeEff = prevKiloRate > 0 ? volDiff * prevKiloRate : 0;
      const mixEff = (customerAmount - prevAmount) - (priceEff + volumeEff);

      return {
        name: customer.name,
        volume: customerVolume,
        sales: customerAmount,
        kiloRate: customerKiloRate,
        prevKiloRate,
        volumeGrowth,
        salesGrowth,
        kiloRateChange,
        pvm: { priceEff, volumeEff, mixEff },
        advantage: customerKiloRate > avgKiloRate ? 'sales' : 'volume',
        performance: {
          volumeVsSales: (volumeGrowth != null && salesGrowth != null) ? (volumeGrowth > salesGrowth ? 'volume-driven' : 'sales-driven') : 'neutral',
          kiloRateTrend: kiloRateChange > 5 ? 'improving' : kiloRateChange < -5 ? 'declining' : 'stable'
        }
      };
    }).filter(c => c.volume > 0 || c.sales > 0);

    // Outlier detection on YoY volume growth (z-score)
    const growthVals = customerVolumeVsSales.map(c => c.volumeGrowth).filter(v => v != null);
    const mean = growthVals.reduce((s,v)=>s+v,0) / (growthVals.length || 1);
    const sd = Math.sqrt(growthVals.reduce((s,v)=>s + Math.pow(v-mean,2),0) / (growthVals.length || 1));
    const outliers = customerVolumeVsSales.filter(c => c.volumeGrowth != null && sd > 0 && Math.abs((c.volumeGrowth - mean)/sd) >= 2);

    // Top performers by metrics
    const topVolumePerformers = [...customerVolumeVsSales].sort((a,b)=>b.volume - a.volume).slice(0,5);
    const topSalesPerformers  = [...customerVolumeVsSales].sort((a,b)=>b.sales - a.sales).slice(0,5);
    const topKiloRatePerformers = customerVolumeVsSales.filter(c => c.kiloRate > 0).sort((a,b)=>b.kiloRate - a.kiloRate).slice(0,5);

    const volumeAdvantageCustomers = customerVolumeVsSales.filter(c => c.advantage === 'volume').sort((a,b)=>b.volume - a.volume);
    const salesAdvantageCustomers  = customerVolumeVsSales.filter(c => c.advantage === 'sales').sort((a,b)=>b.sales - a.sales);

    // Executive lines
    const lines = [];
    if (vsBudget != null) lines.push(`Volume: ${vsBudget >= 0 ? 'ahead' : 'behind'} budget by ${formatPct(vsBudget)}`);
    if (vsBudgetAmount != null) lines.push(`Sales: ${vsBudgetAmount >= 0 ? 'ahead' : 'behind'} budget by ${formatPct(vsBudgetAmount)}`);
    if (hasPreviousYearData && yoy != null) lines.push(`Volume YoY: ${yoy >= 0 ? 'up' : 'down'} ${formatPct(yoy)}`);
    if (hasPreviousYearData && yoyAmount != null) lines.push(`Sales YoY: ${yoyAmount >= 0 ? 'up' : 'down'} ${formatPct(yoyAmount)}`);
    if (!hasPreviousYearData) lines.push(`YoY: no ${(base?.year ?? 0) - 1} data available`);
    if (totalYtdCur > 0 && totalFyCur > 0) lines.push(`YTD→FY: ${(totalYtdCur / (totalFyCur || 1) * 100).toFixed(1)}% of full-year achieved`);
    if (ytdCurrentIndex >= 0) {
      const denomBudget = totalFyBudget > 0 ? 'FY' : 'period';
      const denomValue = (totalFyBudget > 0 ? totalFyBudget : totalBudget) || 0;
      if (denomValue > 0) {
        const rr = totalYtdCur / denomValue;
        lines.push(`Run-rate vs ${denomBudget} budget: ${(rr*100).toFixed(1)}%${rr < RUNRATE_WARN ? ` — below ${(RUNRATE_WARN*100).toFixed(0)}% threshold` : ''}`);
      }
    }

    const executiveSummary = lines.join('. ') + (lines.length ? '.' : '');

    return {
      base,
      executiveSummary,
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
        pvm: { priceEffect, volumeEffect, mixEffect },
        customerAnalysis: customerVolumeVsSales,
        topPerformers: { volume: topVolumePerformers, sales: topSalesPerformers, kiloRate: topKiloRatePerformers },
        advantageAnalysis: {
          volumeAdvantage: volumeAdvantageCustomers,
          salesAdvantage: salesAdvantageCustomers,
          volumeAdvantageCount: volumeAdvantageCustomers.length,
          salesAdvantageCount: salesAdvantageCustomers.length
        },
        keyInsights: {
          dominantDriver: Math.abs(vsBudget || 0) > Math.abs(vsBudgetAmount || 0) ? 'volume' : 'sales',
          kiloRateTrend: kiloRateYoY > 5 ? 'improving' : kiloRateYoY < -5 ? 'declining' : 'stable',
          performanceGap: Math.abs((vsBudget || 0) - (vsBudgetAmount || 0)),
          hasSignificantGap: Math.abs((vsBudget || 0) - (vsBudgetAmount || 0)) > 10,
          outliers
        }
      }
    };
  }, [rows, amountRows, columnOrder, basePeriodIndex]);

  // Emit findings to parent when calculated
  useEffect(() => {
    if (findings && onFindingsCalculated) onFindingsCalculated(findings);
  }, [findings, onFindingsCalculated]);

  // ============================== RENDER ======================================
  if (!findings) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Customer Key Facts</h3>
        {waitingForTable ? (
          <div style={styles.insight}>
            Waiting for CustomersKgsTable… If this persists, emit:
            <code style={styles.code}>
              {`window.dispatchEvent(new CustomEvent('customersKgsTable:dataReady', { detail: { rows: mergedCustomers } }));`}
            </code>
            or pass <code>rowsOverride</code>.
          </div>
        ) : (
          <div style={styles.insight}>No customer rows available for analysis.</div>
        )}
      </div>
    );
  }

  const {
    base, totals, vsBudget, yoy, vsBudgetAmount, yoyAmount, monthsRemaining,
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

      {/* Portfolio KPIs */}
      <div style={styles.summary}>
        {kpi('Total Volume', formatMt(totals.totalActual))}
        {kpi('Total Sales', formatAmount(totals.totalAmountActual))}
        {kpi('Avg Kilo Rate (AED/MT)', <><UAEDirhamSymbol />{formatAED(comprehensiveInsights.volumeVsSalesPerformance.avgKiloRate)}</>)}
        {kpi('Volume vs Budget', formatPct(vsBudget), summaryAccent(vsBudget))}
        {kpi('Sales vs Budget', formatPct(vsBudgetAmount), summaryAccent(vsBudgetAmount))}
        {kpi('Volume YoY', hasPreviousYearData ? formatPct(yoy) : 'No Data', hasPreviousYearData ? summaryAccent(yoy) : '#6b7280')}
        {kpi('Sales YoY', hasPreviousYearData ? formatPct(yoyAmount) : 'No Data', hasPreviousYearData ? summaryAccent(yoyAmount) : '#6b7280')}
        {kpi('Top Coverage', `${(coveragePct * 100).toFixed(1)}%`)}
      </div>

      {/* Executive Summary */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📊 Executive Summary</h4>
        <div style={styles.insight}>{executiveSummary}</div>
        {(monthsRemaining != null) && (
          <div style={styles.insight}>
            <strong>Catch-up to FY:</strong> {portfolioRemainingMt > 0
              ? <>Need {formatMt(portfolioRemainingMt)} more{(monthsRemaining > 0) && <> — avg {formatMt(portfolioPerMonthMt)} per month</>}.</>
              : <>On track or ahead of FY target.</>}
          </div>
        )}
      </div>

      {/* Volume vs Sales + PVM */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>📈 Volume vs Sales & Price–Volume–Mix</h4>
        <div style={styles.insight}>
          <strong>Driver:</strong> {comprehensiveInsights.keyInsights.dominantDriver === 'volume' ? 'Volume-driven' : 'Sales-driven'}
          {comprehensiveInsights.keyInsights.hasSignificantGap && ` (${comprehensiveInsights.keyInsights.performanceGap.toFixed(1)}% gap)`}
        </div>
        <div style={styles.insight}>
          <strong>Kilo Rate:</strong> {comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY != null && `${comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY>0?'+':''}${comprehensiveInsights.volumeVsSalesPerformance.kiloRateYoY.toFixed(1)}% YoY`} — trend {comprehensiveInsights.keyInsights.kiloRateTrend}
        </div>
        <div style={styles.card}>
          <h5 style={{margin: '0 0 8px 0', color: '#1e40af'}}>Portfolio PVM (AED)</h5>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            <div><strong>Price</strong><div><UAEDirhamSymbol />{formatAED(comprehensiveInsights.pvm.priceEffect)}</div></div>
            <div><strong>Volume</strong><div><UAEDirhamSymbol />{formatAED(comprehensiveInsights.pvm.volumeEffect)}</div></div>
            <div><strong>Mix</strong><div><UAEDirhamSymbol />{formatAED(comprehensiveInsights.pvm.mixEffect)}</div></div>
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {focusCustomers.length > 0 && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🏆 Top Contributors (by current volume)</h4>
          {focusCustomers.map((c, i) => (
            <div key={c.name} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.rank}>#{i + 1}</div>
                <div style={styles.customerName}>{c.name}</div>
              </div>
              <div style={styles.cardGrid}>
                <div><strong>Volume</strong><div>{formatMt(c.actual)} ({(c.share * 100).toFixed(1)}% share)</div></div>
                {c.vsBudget != null && <div><strong>Vs Budget</strong><div style={{color: summaryAccent(c.vsBudget)}}>{formatPct(c.vsBudget)}</div></div>}
                {hasPreviousYearData && c.yoy != null && <div><strong>YoY</strong><div style={{color: summaryAccent(c.yoy)}}>{formatPct(c.yoy)}</div></div>}
                {!hasPreviousYearData && <div><strong>YoY</strong><div style={{color: '#6b7280'}}>No Data</div></div>}
                {(c.ytdYoy != null) && <div><strong>YTD YoY</strong><div style={{color: summaryAccent(c.ytdYoy)}}>{formatPct(c.ytdYoy)}</div></div>}
                {c.targetFY ? (
                  <div style={{gridColumn: '1 / -1'}}>
                    <strong>FY Catch-up</strong>
                    <div>
                      Target {formatMt(c.targetFY)} — gap {formatMt(c.gap)}
                      {monthsRemaining != null && <>; required {formatMt(c.perMonth)} / month</>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Concentration Risk Analysis */}
      <div style={{...styles.section, borderLeft: `4px solid ${concentrationRisk.level === 'HIGH' ? '#dc2626' : concentrationRisk.level === 'MEDIUM' ? '#f59e0b' : '#059669'}`}}>
        <h4 style={styles.sectionTitle}>
          {concentrationRisk.level === 'HIGH' ? '🚨' : concentrationRisk.level === 'MEDIUM' ? '⚠️' : '✅'} Customer Concentration Risk Analysis
        </h4>
        <div style={{
          ...styles.insight,
          background: concentrationRisk.level === 'HIGH' ? '#fef2f2' : concentrationRisk.level === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
          color: concentrationRisk.level === 'HIGH' ? '#dc2626' : concentrationRisk.level === 'MEDIUM' ? '#d97706' : '#059669',
          borderLeft: `3px solid ${concentrationRisk.level === 'HIGH' ? '#dc2626' : concentrationRisk.level === 'MEDIUM' ? '#f59e0b' : '#059669'}`
        }}>
          <strong>Risk Level: {concentrationRisk.level}</strong>
        </div>
        <div style={styles.concentrationGrid}>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Active Customers</div><div style={styles.metricValue}>{concentrationRisk.customerCount} of {concentrationRisk.totalCustomers}</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Top Customer Share</div><div style={{...styles.metricValue, color: concentrationRisk.top1Share >= 0.5 ? '#dc2626' : concentrationRisk.top1Share >= 0.3 ? '#f59e0b' : '#059669'}}>{(concentrationRisk.top1Share * 100).toFixed(1)}%</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Top 3 Share</div><div style={{...styles.metricValue, color: concentrationRisk.top3Share >= 0.8 ? '#dc2626' : concentrationRisk.top3Share >= 0.6 ? '#f59e0b' : '#059669'}}>{(concentrationRisk.top3Share * 100).toFixed(1)}%</div></div>
          <div style={styles.concentrationMetric}><div style={styles.metricLabel}>Top 5 Share</div><div style={styles.metricValue}>{(concentrationRisk.top5Share * 100).toFixed(1)}%</div></div>
        </div>
        <div style={styles.insight}><strong>Customer Base Efficiency:</strong> Average {formatMt(concentrationRisk.avgVolumePerCustomer)} per customer ({concentrationRisk.customerEfficiency.toFixed(1)} customers per 1,000 MT).</div>
      </div>

      {/* Customer Retention & Churn Analysis */}
      {retentionAnalysis.totalPreviousCustomers > 0 && (
        <div style={{...styles.section, borderLeft: `4px solid ${retentionAnalysis.retentionRisk === 'HIGH' ? '#dc2626' : retentionAnalysis.retentionRisk === 'MEDIUM' ? '#f59e0b' : '#059669'}`}}>
          <h4 style={styles.sectionTitle}>
            {retentionAnalysis.retentionRisk === 'HIGH' ? '🚨' : retentionAnalysis.retentionRisk === 'MEDIUM' ? '⚠️' : '✅'} Customer Retention & Churn Analysis
          </h4>
          <div style={{
            ...styles.insight,
            background: retentionAnalysis.retentionRisk === 'HIGH' ? '#fef2f2' : retentionAnalysis.retentionRisk === 'MEDIUM' ? '#fffbeb' : '#f0fdf4',
            color: retentionAnalysis.retentionRisk === 'HIGH' ? '#dc2626' : retentionAnalysis.retentionRisk === 'MEDIUM' ? '#d97706' : '#059669',
            borderLeft: `3px solid ${retentionAnalysis.retentionRisk === 'HIGH' ? '#dc2626' : retentionAnalysis.retentionRisk === 'MEDIUM' ? '#f59e0b' : '#059669'}`
          }}>
            <strong>Retention Risk Level: {retentionAnalysis.retentionRisk}</strong>
          </div>
          <div style={styles.retentionGrid}>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Retention Rate</div><div style={{...styles.metricValue, color: retentionAnalysis.retentionRate >= 0.85 ? '#059669' : retentionAnalysis.retentionRate >= 0.7 ? '#f59e0b' : '#dc2626'}}>{(retentionAnalysis.retentionRate * 100).toFixed(1)}%</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Loss Rate</div><div style={{...styles.metricValue, color: retentionAnalysis.churnRate >= 0.3 ? '#dc2626' : retentionAnalysis.churnRate >= 0.15 ? '#f59e0b' : '#059669'}}>{(retentionAnalysis.churnRate * 100).toFixed(1)}%</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>Retained Customers</div><div style={styles.metricValue}>{retentionAnalysis.retainedCustomers}</div></div>
            <div style={styles.retentionMetric}><div style={styles.metricLabel}>New Customers</div><div style={styles.metricValue}>{retentionAnalysis.newCustomers}</div></div>
          </div>
        </div>
      )}

      {/* Growth / Risk */}
      {(growthDrivers.length > 0 || underperformers.length > 0 || stable.length > 0) && (
        <div style={styles.dual}>
          {growthDrivers.length > 0 && (
            <div style={{...styles.section, ...styles.hiliteGreen}}>
              <h4 style={styles.sectionTitle}>🚀 Growth Drivers</h4>
              {growthDrivers.map((c) => (
                <div key={c.name} style={styles.bullet}>
                  <div style={styles.dot} /> <strong>{c.name}</strong> — {formatMt(c.actual)}
                  {c.vsBudget != null && <> | {formatPct(c.vsBudget)} vs budget</>}
                  {hasPreviousYearData && c.yoy != null && <> | {formatPct(c.yoy)} YoY</>}
                  {!hasPreviousYearData && <> | No YoY data</>}
                </div>
              ))}
            </div>
          )}
          {underperformers.length > 0 && (
            <div style={{...styles.section, ...styles.hiliteRed}}>
              <h4 style={styles.sectionTitle}>⚠️ Underperformers</h4>
              {underperformers.map((c) => (
                <div key={c.name} style={styles.bullet}>
                  <div style={styles.dot} /> <strong>{c.name}</strong> — {formatMt(c.actual)}
                  {c.vsBudget != null && <> | {formatPct(c.vsBudget)} vs budget</>}
                  {hasPreviousYearData && c.yoy != null && <> | {formatPct(c.yoy)} YoY</>}
                  {!hasPreviousYearData && <> | No YoY data</>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>💡 Strategic Priorities</h4>
        <div style={styles.recommendations}>
          {underperformers.length > 0 && (
            <div style={styles.recommendation}>
              Address shortfalls with priority customers representing {(underperformers.reduce((s,c)=>s+c.share,0)*100).toFixed(1)}% share via targeted plans.
            </div>
          )}
          {growthDrivers.length > 0 && (
            <div style={styles.recommendation}>
              Double down on momentum accounts (share {(growthDrivers.reduce((s,c)=>s+c.share,0)*100).toFixed(1)}%) with focused allocation.
            </div>
          )}
          <div style={styles.recommendation}>
            Monitor concentration risk: top set covers {(coveragePct*100).toFixed(1)}% of volume.
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================== STYLES =======================================
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
  retentionMetric: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, textAlign: 'center' }
};

export default CustomerKeyFacts;
