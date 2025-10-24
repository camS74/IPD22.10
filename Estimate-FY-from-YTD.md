
# Estimate FY from YTD Actuals — Functional & Implementation Spec

**Version:** 1.0  
**Owner:** IP Dashboard  
**Goal:** Add a new **Type = Estimate** to the Period selector that extrapolates **FY** figures from **YTD Actual** data for a chosen **basis period** (e.g., HY1, Q1, or a custom contiguous month range). The estimate must be computed **per the same dimensional cuts** used across the app — e.g., by **Customer**, **Country**, **Sales Rep**, **Product Group**, etc. The additive figures to extrapolate are: **Kgs**, **Amount**, and **Margin**. **All other KPIs/ratios** (e.g., GP%, NP%, Yield) continue to be calculated by the existing page logic from these totals (do **not** extrapolate percentages directly).

---

## 1) Concept Overview

- Users can compare:
  - `2025 HY1 • Actual`
  - `2025 FY • Budget`
  - **`2025 FY • Estimate`** (derived from YTD Actuals, e.g., HY1)
- **Estimate** is **not** stored in the source Excel/DB as a native type; it is a **computed FY** based on the user-chosen **basis months** of **Actual** for the **same year**.
- Core formula (for additive metrics only):
  \n
  **FY-Estimate = Sum(Actual for basis months) × (12 / count(basis months))**\n
  \n
  Examples: HY1 → factor 12/6 = **2**; Q1 → 12/3 = **4**; Jan–Aug → 12/8 = **1.5**.

### Why “same dimensions” matters
The extrapolation must respect the same slicing: for each (Customer, Country, Sales Rep, Product Group, …), compute its YTD Actuals, then scale that subtotal to FY. This preserves mix and enables apples-to-apples comparisons in all existing charts/tables.

---

## 2) Scope & Non-Scope

**In scope:**
- New **Estimate** option in **Type** selector within Period selection UI.
- Basis selector for **Estimate** (FY target + YTD basis months: HY1, Q1, or custom contiguous range Jan–Aug, etc.).
- Compute and surface **Kgs**, **Amount**, **Margin** as **FY Estimated totals per dimension**.
- Persist **Estimate definitions** (and optionally snapshots) so columns survive reloads.
- Use existing page logic to calculate derivative KPIs from Estimated totals.

**Out of scope (v1):**
- Estimating **non-FY** periods (e.g., HY1 from Q1). (Keep **strict FY** target in v1.)
- Estimating **non-additive** measures directly (e.g., GP% scaling). Derive from totals.

---

## 3) Data Rules

- **Year**: Estimate is always for the **same year** as the basis months.
- **Target Period**: v1 supports **FY** only. (UI should constrain this when Type = Estimate.)
- **Basis Months**: Must be **contiguous** within a calendar year (HY1, Q1, Jan–Aug…).
- **Type for basis**: Always **Actual**.
- **Dimensions**: Aggregate by the **exact same keys** used in reports (e.g., `customer`, `country`, `sales_rep`, `product_group`, `material`, etc.).\n
  Implementation note: use the same “group-by” utilities already used for Actual/Budget aggregation.
- **Additive metrics to extrapolate**: `kgs`, `amount`, `margin`.\n
  Apply the same currency handling and sign conventions as Actuals.
- **Derived metrics**: Recompute on each page using the existing logic and the extrapolated totals (e.g., `gp_pct = margin / amount` if that’s the definition).

---

## 4) UI/UX Changes

1. **Type dropdown**: Always include **Estimate** alongside Actual, Budget, Forecast.
2. **When Type = Estimate**:
   - **Target Period** field: lock to **FY** (disable other entries).
   - **Basis selector** appears:
     - Quick presets: **HY1**, **Q1**, **Q2**, **Q3**, **Q4** (if you want), and
     - **Custom contiguous range** (multi-select months with sequential validation).
   - **Helper text**: “Estimate FY by extrapolating 2025 Actuals over {BasisLabel}. We will scale Kgs, Amount, Margin by (12 / BasisMonths). Ratios are recomputed from totals.”
3. **Column Labeling**:
   - Primary label: `FY 2025 — Estimate`
   - Sub-label / tooltip: `Basis: HY1 (Jan–Jun)` or `Basis: Jan–Aug`
   - Legend badge: consider a small **E** badge.
4. **Color**: Assign a distinct palette color for **Estimate** (consistent across reloads).

---

## 5) Backend & Persistence

- Use existing `GlobalConfigService` to store **Estimate definitions** keyed by Division+Year.\n
  Key pattern: `estimates:{division}:{year}:{month}|Estimate|{basisLabel}`\n
  - **Definition** payload:
    ```json
    {
      "year": 2025,
      "targetPeriod": "FY",
      "basisMonths": ["January","February","March","April","May","June"],
      "createdAt": "2025-10-23T08:00:00Z",
      "createdBy": "user@example.com"
    }
    ```
  - **Snapshot** payload (optional): aggregated & scaled numbers per dimension as of save time. Prefer storing **definitions** and recomputing at render for freshness when Actuals update.
- **Endpoints** (Node/Express):\n
  - `POST /api/estimates` → save `{ division, year, key, payload }`\n
  - `GET /api/estimates/:division/:year` → load all estimates for that division+year\n
  - Keep the existing `/api/standard-config` endpoints for column selections (`standardColumnSelection`, `basePeriodIndex`, etc.).

---

## 6) Core Algorithm (Pseudo-code)

```js
const FULL_YEAR = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function areMonthsSequential(months) {
  const idx = months.map(m => FULL_YEAR.indexOf(m)).sort((a,b)=>a-b);
  if (idx.includes(-1)) return false;
  for (let i=1;i<idx.length;i++) if (idx[i] !== idx[i-1]+1) return false;
  return true;
}

function buildEstimateSeries({ year, basisMonths }, rawActualRows, groupDims) {
  if (!areMonthsSequential(basisMonths)) throw new Error("Basis months must be contiguous.");
  const factor = 12 / basisMonths.length;

  // 1) Filter Actual rows for the year+basisMonths
  const ytd = rawActualRows.filter(r =>
    r.year === year && r.type === "Actual" && basisMonths.includes(r.month)
  );

  // 2) Group by dimensions (customer, country, sales_rep, product_group, ...)
  const grouped = aggregateByDims(ytd, groupDims, {
    sumFields: ["kgs","amount","margin"]
  });

  // 3) Scale additive totals
  const estimated = {};
  for (const [key, rec] of Object.entries(grouped)) {
    estimated[key] = {
      ...pickDimsFromKey(key, groupDims),
      year,
      period: "FY",
      type: "Estimate",
      kgs: rec.kgs * factor,
      amount: rec.amount * factor,
      margin: rec.margin * factor
    };
  }

  // 4) DO NOT scale ratios. Let pages recompute: gp_pct = margin / amount, etc.
  return estimated; // same shape as other series used by the app
}
```

---

## 7) Frontend Integration Steps

1. **Types list**: Union spreadsheet Row-3 types with `["Estimate"]` so Estimate is always available.
2. **Extend `addColumn`** (FilterContext):
   - Accept `estBasisMonths` when `type === "Estimate"`.
   - Enforce `month === "FY"` for Estimate (v1).
   - Validate `areMonthsSequential(estBasisMonths)`.
   - Add column object with `estimateMeta = { basisMonths: [...] }`.
   - Persist to `standardColumnSelection` as usual.
3. **Series Resolver**:
   - In the function that maps a selected column to a data series (used by charts/tables), add:
     - If `type !== "Estimate"` → existing path.
     - Else → call `buildEstimateSeries(col.estimateMeta, rawActualRows, groupDims)`.
4. **Persist Definition (optional snapshot)**:
   - After first compute (or on user “Save” action), `POST /api/estimates` with `{division, year, key, payload}`.
   - On app load, `GET /api/estimates/:division/:year` → hydrate definitions and recompute series (or hydrate snapshots if you chose to store them).

---

## 8) Validation & Edge Cases

- **Empty basis**: block with toast “Select basis months for Estimate.”
- **Missing Actual data for some basis months**: treat missing as 0; show a small warning icon in the column header tooltip.
- **Currency/formatting**: respect current locale/currency formatting; the values are totals like other columns.
- **MAX_COLUMNS**: current cap is 5. Estimate counts toward this cap.
- **FY only (v1)**: the UI must prevent picking Q/HY/single month as the **target** when Type=Estimate.
- **Consistency**: use `'FY'` uniformly (avoid `'Year'` label mismatch).

---

## 9) Worked Example

- User selects: **Year = 2025, Type = Estimate, Target = FY, Basis = HY1** (Jan–Jun).
- For a given (Customer=A, Country=UAE, Sales Rep=John, Product Group=WAL):\n
  Sum YTD Actuals Jan–Jun = `kgs=120, amount=900k, margin=144k`.\n
  Factor = 12/6 = **2**.\n
  Estimated FY → `kgs=240, amount=1.8M, margin=288k`.\n
  Pages compute ratios as usual: `gp% = 288k / 1.8M = 16%` (if that’s the definition).

---

## 10) QA Checklist

- [ ] Type selector shows **Estimate** everywhere periods are added.
- [ ] When Type=Estimate, Target is locked to **FY**.
- [ ] Basis presets work (HY1, Q1) and custom contiguous range validates correctly.
- [ ] Estimated totals appear in all reports next to Actual/Budget with the correct label/badge.
- [ ] Totals match `YTD * (12 / months)` for **Kgs, Amount, Margin** per **each** (Customer, Country, Sales Rep, Product Group, …).
- [ ] Ratios are recomputed by pages; no percentage is scaled directly.
- [ ] Estimate definitions persist and reload; optional snapshots reproduce prior views if chosen.
- [ ] No regression to existing Actual/Budget/Forecast logic.

---

## 11) Rollout Notes

- Ship behind a feature flag `enableEstimateType` for quick rollback.
- Add telemetry: when an Estimate is created, store `{year, basisLabel, dimsUsed, user}`.
- Document in release notes with an example screenshot.

---

## 12) Future Enhancements (Optional)

- Allow estimating **HY/Q** targets (not only FY) using proportion-to-period-length logic.
- Add **seasonality** profiles (use prior-year monthly weights instead of a simple flat factor).
- Allow **exclude outliers** or **cap growth** per dimension before scaling.
- Permit **non-contiguous** custom bases (e.g., Jan, Mar, Apr) with explicit disclosure.
