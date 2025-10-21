// Shared KPI CSS content - single source of truth
// This ensures the main KPI component and HTML export use identical styling
// EXACT same as KPIExecutiveSummary.css

export const KPI_CSS_CONTENT = `
/* KPI Executive Summary Styles - Enhanced Version */
.kpi-dashboard {
  background: white;
  min-height: 100vh;
  padding: 24px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Override for exported HTML context - remove container styling */
.full-screen-chart .kpi-dashboard {
  background: transparent;
  min-height: auto;
  padding: 0;
}

/* Fix container overlap and spacing issues */
.full-screen-chart {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  z-index: 1000;
  overflow-y: auto;
}

.full-screen-header {
  position: sticky;
  top: 0;
  background: #667eea; /* restored blue header */
  color: white; /* ensure text is white on blue */
  z-index: 1001;
  padding: 20px;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.full-screen-content {
  padding: 20px;
  max-width: 100%;
  overflow-x: hidden;
}

.kpi-dashboard > h2 {
  text-align: center;
  font-weight: 700;
  font-size: 1.5rem;  /* Consistent with other pages - 24px */
  margin-bottom: 8px;
}

/* KPI Header Period Styling - Clean and Simple */
.kpi-dashboard > div:nth-child(2),
.kpi-dashboard > div:nth-child(4) {
  text-align: center;
  margin-bottom: 6px;
}

.kpi-dashboard > div:nth-child(2) > span,
.kpi-dashboard > div:nth-child(4) > span {
  font-weight: 700;
  font-size: 18px;
  color: #1f2937;
}

.kpi-dashboard > div:nth-child(3) {
  text-align: center;
  margin-bottom: 6px;
}

.kpi-period-vs {
  font-weight: 700;
  font-size: 18px;
  color: #1f2937;
}


.kpi-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.kpi-section-title {
  font-size: 1.4em;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 28px;
  text-align: center;
  border-bottom: 3px solid #667eea;
  padding-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  align-items: stretch;
  margin-top: 8px;
  width: 100%;
  overflow: hidden;
}

/* Ensure full-width cards span correctly */
.kpi-cards .revenue-drivers {
  grid-column: 1 / -1;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
}

.kpi-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  backdrop-filter: blur(10px);
}

.kpi-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
}

.kpi-card.large {
  grid-column: span 2;
  min-height: 170px;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(to bottom, #667eea, #764ba2);
  border-radius: 0 2px 2px 0;
}

/* PROPER VISUAL HIERARCHY - UNIFORM FONT SYSTEM */

.kpi-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2.5rem;
  margin-bottom: 16px;
}

/* LEVEL 1: CARD TITLES - LARGEST AND MOST PROMINENT */
.kpi-label {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: #444b54;
  letter-spacing: 0.04em;
  margin-top: 0;
}

/* LEVEL 2: CARD CONTENT - UNIFORM MEDIUM SIZE */
.kpi-value {
  font-size: 1.4em;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
  margin-bottom: 12px;
  line-height: 1.3;
  font-family: 'Segoe UI', sans-serif;
}

/* LEVEL 3: CARD TRENDS - SMALLEST */
.kpi-trend {
  font-size: 0.88em;
  text-align: center;
  color: #6b7280;
  font-weight: 500;
  line-height: 1.4;
  padding: 4px 8px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

/* Enhanced category cards styling */
.category-cards {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.category-card {
  background: white;
  border-radius: 10px;
  padding: 16px;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.category-title {
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 10px;
  font-size: 1.1em;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.category-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  font-size: 0.9em;
}

.category-metric {
  color: #4a5568;
  padding: 6px 0;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  font-weight: 500;
}

/* Responsive adjustments - Enhanced */
@media (max-width: 1400px) {
  .kpi-cards {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 18px;
  }
  
  .kpi-section {
    padding: 28px;
    margin-bottom: 28px;
  }
}

@media (max-width: 1200px) {
  .kpi-cards {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
  }
  
  .kpi-card.large {
    grid-column: span 1;
  }
  
  .kpi-card {
    min-height: 160px;
    padding: 20px;
  }
  
  .kpi-label {
    font-size: 0.85em;
  }
  
  .kpi-value {
    font-size: 1.3em;
  }
  
  .kpi-icon {
    font-size: 2em;
    margin-bottom: 12px;
  }
}

@media (max-width: 1100px) {
  .kpi-cards {
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 14px;
  }
}

@media (max-width: 1000px) {
  .kpi-cards {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .kpi-dashboard {
    padding: 16px;
  }
  
  .kpi-section {
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 12px;
  }
  
  .kpi-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .kpi-card {
    padding: 18px;
    min-height: 160px;
    border-radius: 10px;
  }
  
  .kpi-label {
    font-size: 0.85em;
    margin-bottom: 10px;
  }
  
  .kpi-value {
    font-size: 1.2em;
    margin-bottom: 10px;
  }
  
  .kpi-icon {
    font-size: 1.8em;
    margin-bottom: 12px;
  }
  
  .kpi-trend {
    font-size: 0.8em;
    padding: 3px 6px;
  }
}

/* Top Revenue Drivers - MATCH OTHER CARDS EXACTLY */
.kpi-card .kpi-value ol {
  text-align: center;
  margin: 0;
  padding-left: 0;
  line-height: 1.3;
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  font-weight: inherit;
}

.kpi-card .kpi-value ol li {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: inherit;
  padding: 8px 14px;
  background: rgba(102, 126, 234, 0.06);
  border-radius: 8px;
  border-left: 3px solid #667eea;
  width: 100%;
  text-align: left;
  color: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.kpi-card .kpi-value ol li:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: translateX(4px);
}

/* Arrow color classes - Enhanced */
.arrow-positive {
  color: #007bff;
  font-weight: 700;
}

.arrow-negative {
  color: #dc3545;
  font-weight: 700;
}

.kpi-value > div {
  margin-bottom: 8px;
}

/* Category Highlighting - Direct approach */
.category-highlight {
  font-size: 1.1em;
  margin-bottom: 12px;
  font-weight: 700;
  color: #1e40af;
  text-decoration: underline;
  text-decoration-color: #3b82f6;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.8px;
}

/* Financial Performance Cards - Special styling */
.kpi-section:first-of-type .kpi-card:nth-child(1)::before {
  background: #10b981;
}

.kpi-section:first-of-type .kpi-card:nth-child(2)::before {
  background: #3b82f6;
}

.kpi-section:first-of-type .kpi-card:nth-child(3)::before {
  background: #8b5cf6;
}

.kpi-section:first-of-type .kpi-card:nth-child(4)::before {
  background: #f59e0b;
}

/* Product Performance Cards */
.kpi-section:nth-of-type(2) .kpi-card::before {
  background: #ef4444;
}

.kpi-section:nth-of-type(2) .kpi-card.large::before {
  background: #dc2626;
}

/* Geographic Distribution Cards */
.kpi-section:nth-of-type(3) .kpi-card::before {
  background: #06b6d4;
}

/* Customer Insights Cards */
.kpi-section:nth-of-type(4) .kpi-card::before {
  background: #84cc16;
}

/* CATEGORY CARDS - Process and Material Categories */
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card {
  min-height: 220px;
  max-height: 220px;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  border: 2px solid rgba(102, 126, 234, 0.1);
}

.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card .kpi-value,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card .kpi-value {
  font-size: 1em;
  line-height: 1.5;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  font-weight: 500;
  color: #374151;
  text-align: left;
  gap: 8px;
}

.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card .kpi-label,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card .kpi-label {
  font-size: 1em;
  margin-bottom: 16px;
  font-weight: 700;
  color: #1e40af;
  text-decoration: none;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  letter-spacing: 1px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

/* Force category cards to stay in single horizontal rows */
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4),
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  margin-top: 24px;
  margin-bottom: 24px;
}

/* Top Revenue Drivers specific styling - Single Card with 3 Internal Rows */
.revenue-drivers {
  grid-column: 1 / -1; /* Force full width across all columns */
  min-height: auto;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.revenue-drivers .kpi-label {
  font-weight: 700;
  font-size: 1.05em;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  text-align: center;
  margin-bottom: 20px;
}

.revenue-drivers .kpi-value {
  width: 100%;
  text-align: left;
  flex: 1;
}

.revenue-drivers > div {
  padding-left: 0;
  margin: 0;
  width: 100%;
}

.revenue-drivers > div > div {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  border-left: 4px solid #667eea;
  transition: all 0.2s ease;
  width: 100%;
}

.revenue-drivers > div > div:hover {
  background: rgba(102, 126, 234, 0.08);
  transform: translateX(4px);
}

.revenue-drivers > div > div:not(:last-child) {
  margin-bottom: 16px;
}

/* Medal emojis styling in revenue drivers */
.revenue-drivers > div > div > span:first-child {
  font-size: 2.2em;
  margin-right: 16px;
  min-width: 40px;
  text-align: center;
}

/* Product details styling */
.revenue-drivers > div > div > div {
  flex: 1;
}

.revenue-drivers > div > div > div > div:first-child {
  font-weight: 600;
  font-size: 1.1em;
  color: #1f2937;
  margin-bottom: 4px;
}

.revenue-drivers > div > div > div > div:last-child {
  font-size: 0.9em;
  color: #6b7280;
}

/* Improve arrow styling in revenue drivers */
.revenue-drivers .arrow-positive,
.revenue-drivers .arrow-negative {
  font-size: 0.85em;
  padding: 3px 8px;
  margin-left: 8px;
}

/* Geographic Distribution Cards */
.export-regions {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 20px !important;
  width: 100% !important;
  overflow: visible !important;
}

.export-regions .kpi-card {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  flex: 1 1 0 !important;
  min-width: 0 !important;
}

.export-regions .kpi-card::before {
  background: linear-gradient(to bottom, #06b6d4, #0284c7);
}

.export-regions .kpi-card .kpi-trend {
  font-size: 0.8em;
  color: #64748b;
}

/* Visual connector under Export card */
.export-connector {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  height: 40px;
  margin: 10px 0 15px 0;
  padding-right: 25%;
  position: relative;
}

.export-connector__arrow {
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 12px solid #6b7280;
}

.export-connector__bracket {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 3px;
  background: #6b7280;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4);
}

.export-connector__bracket::before,
.export-connector__bracket::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 15px;
  background: #6b7280;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4);
}

.export-connector__bracket::before {
  left: 0;
  top: 0;
}

.export-connector__bracket::after {
  right: 0;
  top: 0;
}

/* UAE Local Card */
.uae-icon-container {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
}

.uae-icon {
  width: 50px;
  height: 50px;
}

/* Globe Container */
.rotating-emoji-container {
  width: 60px;
  height: 60px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}

.rotating-emoji {
  font-size: 40px;
  animation: rotate-emoji 20s linear infinite;
}

@keyframes rotate-emoji {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Region Globe Container */
.region-globe-container {
  width: 50px;
  height: 50px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  border: none;
}

.region-globe {
  font-size: 32px;
  animation: pulse-globe 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

@keyframes pulse-globe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* Force export regions to always stay in one row - no scrolling */
@media (max-width: 1200px) {
  .export-regions {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 15px !important;
  }
}

@media (max-width: 768px) {
  .export-regions {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 10px !important;
  }
}

@media (max-width: 480px) {
  .export-regions {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;
  }
}

/* Error and loading states */
.kpi-error-state {
  padding: 32px;
  text-align: center;
  color: #888;
}

/* Customer insights styling */
.customer-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
  min-width: 0; /* Allow flex items to shrink */
}

.customer-line span:first-child {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.customer-percentage {
  font-size: 0.8em;
  color: #666;
  font-weight: 600;
}

.customer-subtitle {
  font-weight: bold;
  font-size: 12px;
  margin-top: 1px;
  color: #666;
}

/* Revenue drivers styling */
.revenue-driver-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.revenue-driver-medal {
  font-size: 1.8em;
  margin-right: 12px;
  min-width: 40px;
  text-align: center;
}

.revenue-driver-content {
  flex: 1;
}

.revenue-driver-name {
  font-weight: 600;
  margin-bottom: 4px;
  color: #1f2937;
}

.revenue-driver-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Growth indicators */
.growth-indicator {
  margin-left: 8px;
}

/* Ensure trend text appears on new line */
.kpi-trend {
  display: block !important;
  margin-top: 4px;
  line-height: 1.2;
}

/* Geographic region styling */
.region-card-gradient {
  background: linear-gradient(135deg, var(--gradient-color), var(--gradient-color-cc));
  border-left: 4px solid var(--gradient-color);
  box-shadow: 0 4px 12px var(--gradient-color-44);
}

.region-label-light {
  color: white;
  font-weight: 700;
}

.region-label-dark {
  color: #2d3748;
  font-weight: 700;
}

.region-value-light {
  color: white;
  font-weight: 800;
}

.region-value-dark {
  color: #1a365d;
  font-weight: 800;
}

.region-trend-light {
  color: #e2e8f0;
}

.region-trend-dark {
  color: #4a5568;
}

.region-growth {
  font-size: 14px;
  font-weight: 700;
  margin-top: 2px;
}

.region-growth-positive {
  color: #10b981;
}

.region-growth-negative {
  color: #ef4444;
}

.region-growth-arrow {
  font-weight: 900;
}

.region-growth-subtitle {
  font-size: 10px;
  font-weight: 400;
  margin-top: 2px;
}

.region-tooltip {
  font-size: 10px;
  margin-top: 2px;
  font-style: italic;
}

.region-tooltip-light {
  color: #e2e8f0;
}

.region-tooltip-dark {
  color: #666;
}

/* Back button styling for export */
.back-button {
  position: absolute;
  top: 20px;
  left: 20px;
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  z-index: 10;
}

.back-button:hover {
  background: #5a6fcf;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.customer-names-small {
  font-size: 0.9em;
  color: #666;
  font-weight: 500;
  margin-top: 2px;
  white-space: nowrap;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Customer lines with dots styling */
.customer-line-with-dots {
  display: flex;
  align-items: baseline;
  width: 100%;
  margin-bottom: 2px;
}

.customer-name {
  flex-shrink: 0;
  margin-right: 8px;
}

.customer-dots {
  flex: 1;
  border-bottom: 1px dotted #ccc;
  margin: 0 8px;
  height: 1px;
  align-self: flex-end;
  margin-bottom: 0.2em;
}

.customer-percentage {
  flex-shrink: 0;
  font-weight: 600;
  color: #666;
  font-size: 0.8em;
}

.kpi-section .kpi-cards .kpi-card {
  min-height: 170px;
}

/* Process and Material Category Cards: 3 per row, centered */
.kpi-section .kpi-cards.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 20px;
  width: 100%;
  justify-items: stretch;
  align-items: start;
}

@media (max-width: 900px) {
  .kpi-section .kpi-cards.category-cards {
    grid-template-columns: 1fr;
  }
}

/* P&L Financial Table Styles - EXACT same as ComprehensiveHTMLExport */

/* Table Container - EXACT same as ComprehensiveHTMLExport */
.pl-table-container {
  width: 100%;
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 0 auto;
}

/* Table Title Container - EXACT same as ComprehensiveHTMLExport */
.pl-table-title-container {
  padding: 20px 20px 10px 20px;
  text-align: center;
}

.pl-table-title-container .pl-page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Table Styles - EXACT same as ComprehensiveHTMLExport */
.pl-financial-table {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  font-size: 14px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  table-layout: auto;
}

.pl-financial-table th, 
.pl-financial-table td {
  padding: 8px 12px;
  text-align: center;
  border: 1px solid #ddd;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Consistent header row heights - EXACT same as ComprehensiveHTMLExport */
.pl-financial-table thead tr th {
  height: 35px;
  line-height: 1.2;
  vertical-align: middle;
  font-weight: bold;
  position: sticky;
  z-index: 10;
  white-space: nowrap !important;
}

/* Default: Freeze first 3 header rows */
.pl-financial-table thead tr:nth-child(1) th {
  top: 70px; /* Account for sticky back button container height */
  z-index: 13;
}

.pl-financial-table thead tr:nth-child(2) th {
  top: 105px; /* 70px sticky back + 35px first row */
  z-index: 12;
}

.pl-financial-table thead tr:nth-child(3) th {
  top: 140px; /* 70px sticky back + 70px first two rows */
  z-index: 11;
}

/* P&L Financial Table: Freeze first 4 header rows */
.pl-financial-table thead tr:nth-child(4) th {
  top: 175px; /* 70px sticky back + 105px first three rows */
  z-index: 10;
  position: sticky;
  font-weight: bold;
}

/* Make first column cells in frozen header rows white with no borders */
.pl-financial-table thead tr:nth-child(1) th:first-child,
.pl-financial-table thead tr:nth-child(2) th:first-child,
.pl-financial-table thead tr:nth-child(3) th:first-child,
.pl-financial-table thead tr:nth-child(4) th:first-child {
  background-color: white;
  border: none;
}

/* Remove left border from first period column in headers - clean look */
.pl-financial-table thead tr:nth-child(2) th:nth-child(2),
.pl-financial-table thead tr:nth-child(3) th:nth-child(2),
.pl-financial-table thead tr:nth-child(4) th:nth-child(2) {
  border-left: none;
}

/* Add thin borders to 4th row cells starting from 2nd column - P&L Financial only */
.pl-financial-table thead tr:nth-child(4) th:nth-child(n+2) {
  border: 1px solid #ddd;
}

/* FIX: Ensure sticky headers in the P&L table retain their borders when scrolled */
.pl-financial-table thead th[style*="background-color"] {
  border-right: 1px solid #ddd !important;
  border-bottom: 1px solid #ddd !important;
}

/* FIX: Ensure P&L table cells have right borders to prevent missing lines */
.pl-financial-table th,
.pl-financial-table td {
  border-right: 1px solid #ddd !important;
}

/* Headers are center aligned */
.pl-financial-table th {
  text-align: center;
}

/* First column data cells left alignment */
.pl-financial-table td:first-child {
  text-align: left;
  padding-left: 12px;
}

/* Financial Table Bold Formatting - Preserve Original Styles */
.pl-financial-table .section-header td {
  font-weight: bold;
}

.pl-financial-table .important-row td {
  font-weight: bold;
}

.pl-financial-table tr.important-row td:first-child,
.pl-financial-table tr.important-row td:nth-child(3n+2),
.pl-financial-table tr.important-row td:nth-child(3n+3),
.pl-financial-table tr.important-row td:nth-child(3n+4) {
  font-weight: bold;
}

/* Ensure all cells in section header rows are bold */
.pl-financial-table .section-header {
  background-color: transparent;
}

/* Make calculated cells italic */
.pl-financial-table .calculated-cell {
  font-style: italic;
  color: #000000;
}

/* Sales by Country Table Formatting */
.pl-financial-table .country-row {
  background-color: #ffffff;
}

.pl-financial-table .country-row:hover {
  background-color: #f8f9fa;
}

.pl-financial-table .percentage-cell {
  font-weight: 500;
}

.pl-financial-table .delta-cell {
  font-weight: bold;
  font-size: 13px;
}

/* Sales by Customer Table Formatting */
.pl-financial-table .customer-row {
  background-color: #ffffff;
}

.pl-financial-table .customer-row:hover {
  background-color: #f8f9fa;
}

.pl-financial-table .sales-amount-cell {
  font-weight: 500;
}
`; 