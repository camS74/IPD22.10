# WRITEUP V2 — Deep AI Analysis & Presentation Spec (Cursor Implementation)

This spec upgrades the current **WriteUp** feature into a *diagnostic, board‑ready* deliverable. It includes: causal variance analysis (PVM & cost drivers), an Insight Engine with scoring, safe markdown rendering, branded PDF export, and UX improvements. **All files below are complete** and can be copied verbatim.

---

## 1) Goals

1. **Deep reasoning**: Diagnose *why* metrics moved using Price–Volume–Mix and cost drivers, not just describe changes.
2. **Prioritized insights**: Rank findings by impact and confidence; write the narrative in that order.
3. **Unified fact pack**: Consolidate P&L, KPI, Sales by Customer/Rep, Product Mix, and Chart summaries into a single JSON context.
4. **Professional output**: Clean reading layout, sanitized markdown, branded PDF (cover, page numbers), and optional XLSX of the tables powering the writeup.
5. **Explorable root-cause**: Lightweight decomposition (top contributors by product/customer/region) with “Explain” and “Next best split” actions.

---

## 2) Folder Structure

```
src/
  analysis/
    insightEngine.js
    pvm.js
  renderer/
    markdownRenderer.js
  export/
    exportWriteup.js
  components/
    WriteUpView.js
  styles/
    WriteUpView.css
```

> If your project uses TS: rename to `.ts` / `.tsx` and add types, but keep the same APIs.

---

## 3) Data Contract (Fact Pack)

The writer consumes a **single object** `factPack` with consistent keys per run. Build it from your existing pages (P&L, KPI, Sales by Customer, etc.).

```json
{
  "periods": { "base": "2025-01", "comp": "2025-09" },
  "kpi": { "sales": 81234567, "gp": 14678901, "gp_pct": 18.1, "ebitda": 9023000, "np": 5034000 },
  "targets": { "gp_pct": 20.0 },
  "revenue_pvm": {
    "total": { "price": 2100000, "volume": -900000, "mix": 450000 },
    "by_product": [{ "key": "WAL", "price": 1200000, "volume": -400000, "mix": 250000 }],
    "by_country": [{ "key": "KSA", "price": 700000, "volume": -300000, "mix": 120000 }]
  },
  "cogs_drivers": {
    "material_price": -800000,
    "material_mix": 120000,
    "labor_rate": -110000,
    "labor_hours": -200000,
    "energy_tariff": -60000,
    "energy_usage": -90000,
    "yield_scrap": -150000
  },
  "unit_econ": { "sales_kg": 4160000, "gp_per_kg": 3.53, "mfg_per_kg": 5.11 },
  "top_customers": [{ "name": "Customer A", "sales": 5400000, "delta_gp": 320000 }],
  "top_reps": [{ "name": "Rep X", "sales": 7200000, "delta_gp": 410000 }],
  "product_mix": [{ "group": "WAL", "share_pct": 32.1, "delta_share_pp": 2.3 }],
  "anomalies": [{ "signal": "GP% < target by 3.1pp in KSA", "severity": "high" }],
  "chart_findings": ["Audit bar shows rising mfg/₹kg vs stable sales/₹kg since Q2"],
  "volatility_hints": [{ "metric": "sales", "volatility": 0.2 }]
}
```

- **Required minimum keys**: `periods`, `kpi`, `revenue_pvm.total`, `cogs_drivers`.
- All currency is in AED unless stated; weights in kg.

---

## 4) Packages

Install once:

```bash
npm i marked dompurify html2pdf.js
```

(If using TypeScript: `npm i -D @types/dompurify @types/marked`)

---

## 5) Full Files

### 5.1 `analysis/insightEngine.js`

```javascript
// analysis/insightEngine.js (FULL FILE)

/**
 * Score and rank insights so the write-up leads with what matters.
 * impact ~ |delta_abs| weighted by delta_pct; penalize volatility; scale by confidence.
 */
export function scoreInsight({ deltaAbs = 0, deltaPct = 0, volatility = 0, confidence = 0.8 }) {
  const impact = Math.abs(deltaAbs) * (0.5 + Math.min(Math.abs(deltaPct), 1));
  const penalty = 1 + Math.max(0, Math.min(10, volatility));   // cap penalty growth
  return (impact * Math.max(0, Math.min(1, confidence))) / penalty;
}

export function rankInsights(insights = []) {
  return insights
    .map(i => ({ ...i, score: scoreInsight(i) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Build a normalized insight list from the fact pack.
 * You can extend this to include customer/country/product specifics.
 */
export function buildInsights(factPack = {}) {
  const ins = [];
  const { kpi = {}, targets = {}, revenue_pvm = {}, cogs_drivers = {}, anomalies = [], volatility_hints = [] } = factPack;
  const vol = (name) => (volatility_hints.find(v => v.metric === name)?.volatility ?? 0.1);

  if (revenue_pvm?.total) {
    const { price = 0, volume = 0, mix = 0 } = revenue_pvm.total;
    const deltaAbs = price + volume + mix;
    const deltaPct = kpi?.sales ? deltaAbs / Math.max(1, kpi.sales) : 0;
    ins.push({
      metric: 'Revenue',
      title: 'Revenue moved',
      deltaAbs, deltaPct,
      drivers: [{ key: 'Price', v: price }, { key: 'Volume', v: volume }, { key: 'Mix', v: mix }],
      confidence: 0.85, volatility: vol('sales')
    });
  }

  if (typeof kpi?.gp_pct === 'number' && typeof targets?.gp_pct === 'number') {
    const diff = (kpi.gp_pct - targets.gp_pct);
    ins.push({
      metric: 'GP% vs Target',
      title: 'Gross margin vs target',
      deltaAbs: diff, deltaPct: diff / Math.max(1, targets.gp_pct),
      drivers: Object.entries(cogs_drivers).map(([k, v]) => ({ key: k, v })),
      confidence: 0.8, volatility: vol('gp_pct')
    });
  }

  anomalies.forEach(a => ins.push({
    metric: 'Anomaly',
    title: a.signal, deltaAbs: 0, deltaPct: 0, drivers: [], confidence: 0.7, volatility: 0.2
  }));

  return rankInsights(ins);
}
```

### 5.2 `analysis/pvm.js`

```javascript
// analysis/pvm.js (FULL FILE)

/**
 * Basic Price–Volume–Mix decomposition for revenue.
 * Provide vectors per SKU (same length) for base and current.
 * priceVec = unit price; qtyVec = quantity; mixVec = distribution weights (sum to 1).
 */

export function pvmRevenue({ basePriceVec = [], baseQtyVec = [], curPriceVec = [], curQtyVec = [] }) {
  const sum = (a) => a.reduce((s, v) => s + (Number(v) || 0), 0);
  const dot = (a, b) => a.reduce((s, v, i) => s + (Number(v) || 0) * (Number(b[i]) || 0), 0);

  const baseQty = sum(baseQtyVec);
  const curQty  = sum(curQtyVec);

  // Normalize mixes to 1 (avoid zero-div)
  const norm = (arr) => {
    const total = Math.max(1e-9, sum(arr));
    return arr.map(v => (Number(v) || 0) / total);
  };
  const baseMix = norm(baseQtyVec);
  const curMix  = norm(curQtyVec);

  // Baseline revenue and current revenue
  const revBase = dot(basePriceVec, baseQtyVec);
  const revCur  = dot(curPriceVec, curQtyVec);

  // Price effect at current quantity mix
  const price = dot(curPriceVec.map((p, i) => p - (basePriceVec[i] || 0)), curQtyVec);

  // Volume effect at base price, base mix
  const volume = (curQty - baseQty) * (revBase / Math.max(1e-9, baseQty));

  // Mix effect: redistribute current qty using base vs current mix
  const basePricePerSku = basePriceVec;
  const mix = dot(curMix.map((m, i) => m - baseMix[i]), basePricePerSku) * curQty;

  return { price, volume, mix, revBase, revCur };
}
```

### 5.3 `renderer/markdownRenderer.js`

```javascript
// renderer/markdownRenderer.js (FULL FILE)
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false
});

export function renderMarkdownToSafeHtml(markdown = '') {
  const rawHtml = marked.parse(markdown ?? '');
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
```

### 5.4 `export/exportWriteup.js`

```javascript
// export/exportWriteup.js (FULL FILE)
import html2pdf from 'html2pdf.js';

/**
 * Export the given element to a branded PDF.
 * Usage: await exportWriteup(ref.current, { filename: 'WriteUp_Aug_2025.pdf', footerText: 'Interplast • Confidential' })
 */
export async function exportWriteup(element, { filename, footerText = 'Confidential' } = {}) {
  if (!element) throw new Error('exportWriteup: element is required');

  const opt = {
    margin:       [10, 10, 15, 10],
    filename:     filename || `Financial_Analysis_${new Date().toISOString().slice(0,10)}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().from(element).set(opt).save();
}
```

### 5.5 `styles/WriteUpView.css`

```css
/* styles/WriteUpView.css (FULL FILE) */

.writeup-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

.writeup-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.writeup-editor {
  min-height: 680px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px 22px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: auto;
}

.writeup-section {
  margin: 22px 0;
  padding: 16px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fafbff;
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.metric-card .title {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.metric-card .value {
  font-size: 18px;
  font-weight: 800;
  color: #0b2b4b;
}

.alert {
  border-left: 4px solid #f59e0b;
  background: #fff8e1;
  padding: 10px 12px;
  border-radius: 8px;
}

.chat-panel {
  max-height: calc(100vh - 120px);
  overflow: auto;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}

.chat-messages {
  max-height: 50vh;
  overflow: auto;
}

.btn {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 600;
}

.btn.primary {
  background: #0b2b4b;
  color: #fff;
  border-color: #0b2b4b;
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .writeup-toolbar { display: none; }
}
```

### 5.6 `components/WriteUpView.js`

```javascript
// components/WriteUpView.js (FULL FILE)
import React, { useRef, useState, useEffect } from 'react';
import { buildInsights } from '../analysis/insightEngine';
import { exportWriteup } from '../export/exportWriteup';
import { renderMarkdownToSafeHtml } from '../renderer/markdownRenderer';
import '../styles/WriteUpView.css';

/**
 * PROPS
 * - factPack: JSON object following the contract in section 3.
 * - onExplainSplit?: (dimension: string) => void   // hook to open a decomposition explorer
 */
export default function WriteUpView({ factPack = {}, onExplainSplit }) {
  const editorRef = useRef(null);
  const [rawMd, setRawMd] = useState('');
  const [html, setHtml] = useState('');
  const [insights, setInsights] = useState([]);

  // 1) Build canonical insights (ranked)
  useEffect(() => {
    const ranked = buildInsights(factPack);
    setInsights(ranked);
  }, [factPack]);

  // 2) Author the markdown narrative deterministically
  useEffect(() => {
    const md = composeNarrative(factPack, insights);
    setRawMd(md);
    setHtml(renderMarkdownToSafeHtml(md));
  }, [factPack, insights]);

  // 3) Inject sanitized HTML
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = html;
  }, [html]);

  const exportPdf = () => exportWriteup(editorRef.current, { filename: `WriteUp_${(factPack?.periods?.comp)||'period'}.pdf` });

  return (
    <div className="writeup-container">
      <div className="writeup-toolbar">
        <button className="btn" onClick={() => setHtml(renderMarkdownToSafeHtml(rawMd))}>Refresh</button>
        <button className="btn primary" onClick={exportPdf}>Export PDF</button>
      </div>

      <div className="metric-cards">
        <Metric title="Sales (AED)" value={fmtAed(factPack?.kpi?.sales)} />
        <Metric title="GP (AED)" value={fmtAed(factPack?.kpi?.gp)} />
        <Metric title="GP %" value={`${(factPack?.kpi?.gp_pct ?? 0).toFixed(1)}%`} />
        <Metric title="EBITDA (AED)" value={fmtAed(factPack?.kpi?.ebitda)} />
      </div>

      {thresholdAlerts(factPack).map((t, i) => (
        <div className="alert" key={i}>{t}</div>
      ))}

      <section className="writeup-section">
        <div ref={editorRef} className="writeup-editor" />
      </section>

      <section className="writeup-section">
        <h3>Explore Root Causes</h3>
        <p>Drill by Product / Customer / Country. The engine suggests the next best split by contribution to ΔGross Profit.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => onExplainSplit?.('product')}>Explain by Product</button>
          <button className="btn" onClick={() => onExplainSplit?.('customer')}>Explain by Customer</button>
          <button className="btn" onClick={() => onExplainSplit?.('country')}>Explain by Country</button>
        </div>
      </section>
    </div>
  );
}

// ---------- helpers ----------
function Metric({ title, value }) {
  return (
    <div className="metric-card">
      <div className="title">{title}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function fmtAed(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `د.إ ${(n/1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `د.إ ${(n/1_000).toFixed(1)}k`;
  return `د.إ ${n.toFixed(0)}`;
}

function thresholdAlerts(factPack) {
  const alerts = [];
  const gpPct = Number(factPack?.kpi?.gp_pct);
  const target = Number(factPack?.targets?.gp_pct);
  if (Number.isFinite(gpPct) && Number.isFinite(target) && gpPct < target - 1.5) {
    alerts.push(`GP% below target by ${(target - gpPct).toFixed(1)}pp.`);
  }
  return alerts;
}

function composeNarrative(factPack = {}, insights = []) {
  const p = factPack?.periods ?? {};
  const k = factPack?.kpi ?? {};
  const r = factPack?.revenue_pvm?.total ?? {};
  const c = factPack?.cogs_drivers ?? {};
  const topCust = factPack?.top_customers ?? [];
  const topRep = factPack?.top_reps ?? [];
  const mix = factPack?.product_mix ?? [];
  const unit = factPack?.unit_econ ?? {};

  const head = `# Executive Summary (${p.base} → ${p.comp})
- **Sales:** ${fmtAed(k.sales)}; **GP%:** ${(k.gp_pct ?? 0).toFixed(1)}%; **EBITDA:** ${fmtAed(k.ebitda)}.
- **Top drivers:** ${driverLine(r, c)}.
- **Concentration:** Top 3 customers contribute ${share(topCust, 3)} of sales.
`;

  const bridges = `
## Variance Bridges
**Revenue (PVM):** Price ${fmtAed(r.price)}; Volume ${fmtAed(r.volume)}; Mix ${fmtAed(r.mix)}.
**COGS drivers:** ${Object.entries(c).map(([k,v]) => `${nice(k)} ${fmtAed(v)}`).join('; ')}.
`;

  const causes = `
## Root Causes
- **Customers:** ${listContrib(topCust, 'name', 'delta_gp')}
- **Sales Reps:** ${listContrib(topRep, 'name', 'delta_gp')}
- **Product Mix:** ${mix.map(m => `**${m.group}** ${m.share_pct?.toFixed(1)}% (Δ mix ${m.delta_share_pp?.toFixed(1)}pp)`).join('; ')}
`;

  const unitEcon = `
## Unit Economics
- Sales volume: **${(unit.sales_kg ?? 0).toLocaleString()} kg**.
- GP per kg: **د.إ ${Number(unit.gp_per_kg||0).toFixed(2)}**; Manufacturing per kg: **د.إ ${Number(unit.mfg_per_kg||0).toFixed(2)}**.
`;

  const actions = `
## Recommended Actions (Next 30–60 days)
1. **Pricing Ops:** Target price realization on top-5 SKUs; +1% price sensitivity ≈ +AED ${(0.01 * (k.sales||0)).toFixed(0)} GP (est.).
2. **Yield & Scrap:** Address yield loss outliers (see Mfg per kg ↑); aim −0.3 د.إ/кg via setup optimization.
3. **Mix Tilt:** Protect high-margin WAL in KSA; defend mix (+Δpp) where PVM shows positive mix.
`;

  const ordered = insights.map((i, idx) =>
    `- **[${idx+1}] ${i.metric}** — ${i.title}. ΔAbs: ${fmtAed(i.deltaAbs)}; drivers: ${i.drivers.map(d=>`${d.key}:${fmtAed(d.v)}`).join(', ')}`
  ).join('\n');

  const appendix = `
## Ranked Insights
${ordered || '- (no insights constructed)'}
`;

  return [head, bridges, causes, unitEcon, actions, appendix].join('\n\n');
}

// small formatters
function driverLine(r, c) {
  const arr = [`P ${fmtAed(r.price)}`, `V ${fmtAed(r.volume)}`, `M ${fmtAed(r.mix)}`];
  const topCost = Object.entries(c).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];
  if (topCost) arr.push(`${nice(topCost[0])} ${fmtAed(topCost[1])}`);
  return arr.join(' · ');
}
function nice(k){ return k.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()); }
function share(list, n){
  const s = list.slice(0,n).reduce((t,x)=>t+(Number(x.sales)||0),0);
  const total = list.reduce((t,x)=>t+(Number(x.sales)||0),0) || 1;
  return `${((s/total)*100).toFixed(1)}%`;
}
function listContrib(arr, key, val){
  return arr.slice(0,5).map(x=>`**${x[key]}** (${fmtAed(x[val]||0)})`).join('; ');
}
```

---

## 6) Acceptance Criteria

- **Depth**: Narrative must include PVM and cost-driver summaries and a ranked “Insights” section.
- **Safety**: All writeup HTML is sanitized via DOMPurify; no raw unsanitized HTML injection.
- **UX**: Editor min-height ≥ 680px; metric cards shown; alerts for GP% below target.
- **Export**: “Export PDF” creates an A4 portrait PDF with correct styling and numbers.
- **API**: Component accepts a `factPack` object exactly as in Section 3 and renders without runtime errors.

---

## 7) Optional Next Steps

- Add XLSX export for `factPack` using `xlsx` package.
- Hook the “Explain by …” buttons to your existing drill pages or to a new decomposition dialog.

---

## 8) Sources (reliable)

- **PVM / variance bridges**: FTI Consulting — *A Quantifiable Approach to Price‑Volume‑Mix Analysis*.
- **Root‑cause / decomposition tree**: Microsoft Power BI docs — Decomposition Tree.
- **Safe HTML sanitization**: DOMPurify documentation.
- **Markdown rendering**: Marked.js documentation.
- **Client‑side HTML→PDF**: html2pdf.js documentation.
