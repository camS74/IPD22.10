# UAE Currency Symbol Rule

## 🎯 **Rule: Adding UAE Currency Symbol**

When you say "add it" or "add UAE currency symbol", I will add the UAE Dirham symbol (D with 2 dashes in the middle) to the appropriate places.

## 📋 **Implementation Pattern:**

### **HTML Entity:**
```html
<span className="uae-symbol">&#x00EA;</span>
```

### **CSS Class:**
```css
.uae-symbol {
  font-family: 'UAESymbol', sans-serif;
  margin-right: 5px;
}
```

### **SVG Component (Recommended):**
```javascript
import UAEDirhamSymbol from './UAEDirhamSymbol';

// Usage in JSX
<UAEDirhamSymbol />

// Or with custom styling
<UAEDirhamSymbol className="custom-class" style={{ width: '20px' }} />
```

### **HTML Export (for static HTML):**
```javascript
const getUAEDirhamSymbolHTML = () => {
  return '<svg class="uae-dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="display: inline-block; vertical-align: -0.1em; width: 1em; height: 1em; margin-right: 0.2em;"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>';
};
```

## 📍 **Current Usage Locations:**

1. **Sales by Sales Rep Report** (`SalesBySaleRepTable.js`)
   - Line 1852: Product Groups subtitle
   - Line 1031-1053: Font loading

2. **Product Groups Amount Table** (`ProductGroupsAmountTable.js`)
   - Line 8-30: Font loading
   - Line 84, 109: Amount formatting

3. **Executive Summary** (`ExecutiveSummary.js`)
   - Line 43-63: Font loading
   - Line 310: Currency formatting

4. **Product Group Key Facts** (`ProductGroupKeyFacts.js`)
   - Line 53, 62, 69, 79: Amount and ASP formatting

## 🎯 **When to Add:**

- **Amount/Money values** in tables and reports
- **Sales figures** and financial data
- **Currency displays** in dashboards
- **Revenue metrics** and KPIs

## ❌ **When NOT to Add:**

- **Percentages** (% values)
- **Quantities** (KGS, MT, units)
- **Ratios** and **rates**
- **Non-monetary** metrics

## 🔧 **Implementation Steps:**

1. **Import the component:** `import UAEDirhamSymbol from './UAEDirhamSymbol';`
2. **Use in JSX:** Wrap monetary values with `<UAEDirhamSymbol />`
3. **For HTML exports:** Use `getUAEDirhamSymbolHTML()` function
4. **Styling:** Component automatically handles proper sizing and spacing

---

**Rule Active: When you say "add it" or "add UAE currency symbol", I will apply this pattern to the appropriate monetary values.**















