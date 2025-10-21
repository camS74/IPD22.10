# Table Column Hiding Solution Documentation

## Problem Statement
When displaying two identical tables side-by-side where one table needs certain columns hidden while maintaining perfect alignment, traditional CSS approaches fail:

- `display: none` - Completely removes elements, breaking alignment
- `visibility: hidden` - Can cause weird gaps and spacing issues  
- Array filtering - Creates index mismatches between data and display

## The Solution: Transparent Placeholder Cells

Instead of actually hiding columns, we render **transparent placeholder cells** that maintain the table structure while appearing invisible.

### Key Principles

1. **Both tables maintain identical structure** - Same number of columns, same widths
2. **No index mapping issues** - Data arrays match display structure perfectly
3. **Perfect alignment guaranteed** - Grid structure never breaks
4. **Clean visual result** - Hidden columns appear as seamless gaps

### Implementation Details

#### 1. CSS Class for Hidden Cells
```css
.amount-table-blank-cell {
    background: transparent !important;
    border: none !important;
    color: transparent !important;
    width: 120px; /* Match normal column width */
    min-width: 120px;
    max-width: 120px;
}
```

#### 2. Track Hidden Columns
```javascript
// Define which columns should be hidden in Amount table
const hiddenAmountColumnIndices = new Set();
extendedColumns.forEach((col, idx) => {
    if (col.type === 'Budget' || 
        (col.type === 'delta' && idx > 0 && extendedColumns[idx-1].type === 'Budget')) {
        hiddenAmountColumnIndices.add(idx);
    }
});
```

#### 3. Render Placeholder Cells in Headers
```javascript
// For each column position, either render normal header or blank cell
extendedColumns.map((col, idx) => {
    if (hiddenAmountColumnIndices.has(idx)) {
        return <th key={`blank-${idx}`} className="amount-table-blank-cell"></th>;
    }
    // ... normal header rendering
});
```

#### 4. Render Placeholder Cells in Body Rows
```javascript
// For each data cell, either render normal cell or blank cell
extendedColumns.map((col, idx) => {
    if (hiddenAmountColumnIndices.has(idx)) {
        return <td key={`blank-${idx}`} className="amount-table-blank-cell"></td>;
    }
    // ... normal cell rendering
});
```

#### 5. Render Placeholder Cells in Total Row
```javascript
// For totals row, either render calculated total or blank cell
extendedColumns.map((col, idx) => {
    if (hiddenAmountColumnIndices.has(idx)) {
        return <td key={`blank-total-${idx}`} className="amount-table-blank-cell"></td>;
    }
    // ... normal total rendering
});
```

### Why This Works

1. **Structural Integrity**: Both tables have identical DOM structure
2. **No Index Confusion**: Data array indices match column positions exactly
3. **CSS Simplicity**: One CSS class handles all hiding scenarios
4. **Maintainable**: Easy to add/remove hidden columns by updating the Set
5. **Flexible**: Can hide any combination of columns without breaking alignment

### Usage Pattern

```javascript
// 1. Define which columns to hide
const hiddenColumnIndices = new Set([2, 3, 5]); // Hide columns 2, 3, and 5

// 2. In render, check if column should be hidden
columns.map((col, idx) => {
    if (hiddenColumnIndices.has(idx)) {
        return <td key={`blank-${idx}`} className="hidden-cell"></td>;
    }
    return <td key={idx}>{/* normal content */}</td>;
});
```

### Benefits Over Alternatives

| Approach | Alignment | Index Mapping | Performance | Maintainability |
|----------|-----------|---------------|-------------|-----------------|
| `display: none` | ❌ Breaks | ❌ Complex | ✅ Good | ❌ Hard |
| `visibility: hidden` | ⚠️ Gaps | ✅ Simple | ✅ Good | ⚠️ Okay |
| Array filtering | ❌ Breaks | ❌ Very Complex | ✅ Good | ❌ Very Hard |
| **Transparent cells** | ✅ Perfect | ✅ Simple | ✅ Good | ✅ Easy |

### When to Use This Pattern

- **Multi-table layouts** where alignment is critical
- **Dynamic column hiding** based on user preferences or data conditions
- **Responsive designs** where certain columns hide on smaller screens
- **Print layouts** where some columns should be excluded

### Implementation Checklist

- [ ] Define CSS class for hidden cells (transparent, no border, fixed width)
- [ ] Create Set/Array of hidden column indices
- [ ] Apply hidden cell rendering in ALL table sections (header, body, footer)
- [ ] Test with different data sets and column combinations
- [ ] Verify alignment between all related tables
- [ ] Ensure no styling conflicts with existing CSS classes

## Real-World Example: SalesBySaleRepTable

In our implementation, we hide Budget columns and their delta columns in the Amount table while keeping them visible in the Kgs table. This creates a clean visual separation while maintaining perfect alignment.

The solution handles:
- Multiple column types (Budget, delta, regular)
- Dynamic column generation based on data
- Complex totals calculations
- Responsive design requirements

This pattern is now the recommended approach for any similar table alignment challenges in the project. 