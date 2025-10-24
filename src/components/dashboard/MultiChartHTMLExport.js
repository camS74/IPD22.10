import React, { useState } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';
import { computeCellValue as sharedComputeCellValue } from '../../utils/computeCellValue';
import { KPI_CSS_CONTENT } from '../../utils/sharedStyles';
import ipTransparentLogo from '../../assets/IP transparent-.jpg';

// Helper function to get UAE Dirham symbol SVG for HTML strings (standalone)
const getUAEDirhamSymbolHTML = () => {
  return '<svg class="uae-dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="display: inline-block; vertical-align: -0.1em; width: 1em; height: 1em; margin-right: 0.2em;"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>';
};

const MultiChartHTMLExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { excelData, selectedDivision } = useExcelData();
const { 
    columnOrder, 
    basePeriodIndex,
    // chartVisibleColumns, // unused
    isColumnVisibleInChart,
    dataGenerated
  } = useFilter();

  // Get KPI CSS content (same as Comprehensive HTML Export)
  const getKPICSSContent = () => {
    return KPI_CSS_CONTENT;
  };

  // Capture Product Group table HTML (same as Comprehensive HTML Export)
  const captureProductGroupTable = async () => {
    console.log('🔍 Capturing Product Group table...');

    // Wait a bit more for table to fully render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Helper function to process and return table HTML
    const processTable = (table) => {
      const clonedTable = table.cloneNode(true);
      // Replace "Product Group" with "Product Groups" in all cells AND add class for styling
      const allCells = clonedTable.querySelectorAll('td, th');
      allCells.forEach(cell => {
        if (cell.textContent && cell.textContent.trim() === 'Product Group') {
          cell.textContent = 'Product Groups';
          cell.classList.add('table-main-label'); // Add class for font size styling
        }
      });
      return clonedTable.outerHTML;
    };

    // APPROACH 1: Look for Product Group table by class
    const productGroupTable = document.querySelector('table.product-group-table');

    if (productGroupTable) {
      console.log('✅ Found Product Group table by class');
      return processTable(productGroupTable);
    }

    // APPROACH 2: Look for table with product-header-row (unique to Product Group)
    const tableWithProductHeaders = document.querySelector('table .product-header-row')?.closest('table');

    if (tableWithProductHeaders) {
      console.log('✅ Found Product Group table by product-header-row');
      return processTable(tableWithProductHeaders);
    }
    
    // APPROACH 3: Look for table containing product group specific text
    const allTables = Array.from(document.querySelectorAll('table'));
    console.log('Available tables count:', allTables.length);
    
    const productGroupTableByContent = allTables.find(table => {
      const tableText = table.textContent || '';
      const hasProductGroupContent = tableText.includes('Total Product Group') ||
                                    tableText.includes('Product Group') ||
                                    tableText.includes('Process Categories') ||
                                    tableText.includes('Material Categories') ||
                                    tableText.includes('PE Films') ||
                                    tableText.includes('Laminates') ||
                                    tableText.includes('Shrink');
      
      const hasTableStructure = table.querySelector('thead') && table.querySelector('tbody');
      
      console.log(`Checking table for Product Group content:`, {
        hasProductGroupContent,
        hasTableStructure,
        textPreview: tableText.substring(0, 100)
      });
      
      return hasProductGroupContent && hasTableStructure;
    });
    
    if (productGroupTableByContent) {
      console.log('✅ Found Product Group table by content analysis');
      return processTable(productGroupTableByContent);
    }
    
    console.error('❌ No Product Group table found after enhanced search');
    console.log('Available tables count:', allTables.length);
    
    allTables.forEach((table, index) => {
      console.log(`Table ${index}:`, {
        classes: table.className,
        hasProductHeaders: !!table.querySelector('.product-header-row'), 
        hasProductHeader: !!table.querySelector('.product-header'),
        tableView: table.closest('.table-view')?.querySelector('h3')?.textContent,
        hasProductGroupClass: table.classList.contains('product-group-table'),
        firstRowText: table.querySelector('tr')?.textContent?.substring(0, 50)
      });
    });
    
    // Try to get any table that looks like it might be the Product Group table
    const fallbackTable = allTables.find(table => 
      table.querySelector('.product-header-row') ||
      table.querySelector('.product-header') ||
      table.classList.contains('product-group-table') ||
      table.closest('.table-view')?.textContent?.includes('Product Group')
    );
    
    if (fallbackTable) {
      console.log('🎯 Using fallback table that seems to be Product Group table');
      return processTable(fallbackTable);
    }
    
    throw new Error('Product Group table not found. Please visit the Product Group tab first.');
  };

  // Capture P&L Financial table HTML (same as Comprehensive HTML Export)
  const capturePLFinancialTable = async () => {
    try {
      // Navigate to P&L tab using the same logic as ensurePLTabActive()
      const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const plTab = allButtons.find(el => {
        const text = el.textContent?.trim();
        return (text === 'P&L' || text === 'P&L Financial' || text.includes('P&L')) && text.length < 50;
      });

      if (plTab) {
        const isActive = plTab.classList.contains('active') || 
                        plTab.getAttribute('aria-selected') === 'true';
        if (!isActive) {
          console.log('🔄 Switching to P&L tab for HTML capture...');
          plTab.click();
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Capture the EXACT HTML from the P&L table
      const plTable = document.querySelector('table.financial-table');
      if (!plTable) {
        // Fallback: look for any table in table-view that might be the financial table
        const allTables = Array.from(document.querySelectorAll('table'));
        const fallbackTable = allTables.find(table => {
          const tableView = table.closest('.table-view');
          return tableView && table.querySelector('thead') && table.querySelector('tbody');
        });
        
        if (fallbackTable) {
          console.log('🎯 Using fallback table for P&L Financial');
          return fallbackTable.outerHTML;
        }
        
        throw new Error('P&L table not found. Please ensure P&L tab is active and table is rendered.');
      }

      // Clone the table to modify it
      const clonedTable = plTable.cloneNode(true);
      
      // Change the table class to use our custom CSS
      clonedTable.className = 'pl-financial-table';
      
      // Remove only conflicting inline styles while preserving colors
      clonedTable.removeAttribute('style');
      
      // Remove only specific conflicting styles from th and td elements, keep background colors
      const allCells = clonedTable.querySelectorAll('th, td');
      allCells.forEach(cell => {
        // Remove conflicting styles but KEEP background-color and other visual styling
        cell.style.removeProperty('border');
        cell.style.removeProperty('padding');
        cell.style.removeProperty('font-size');
        cell.style.removeProperty('font-family');
        cell.style.removeProperty('text-align');
        cell.style.removeProperty('height');
        cell.style.removeProperty('line-height');
        cell.style.removeProperty('vertical-align');
        cell.style.removeProperty('width');
        cell.style.removeProperty('min-width');
        cell.style.removeProperty('max-width');
        cell.style.removeProperty('white-space');
        cell.style.removeProperty('overflow');
        cell.style.removeProperty('text-overflow');
        // Keep background-color, color, font-weight, etc.
      });
      
      // Remove only conflicting styles from tr elements, keep background colors
      const allRows = clonedTable.querySelectorAll('tr');
      allRows.forEach(row => {
        // Remove conflicting styles but KEEP background-color
        row.style.removeProperty('border');
        row.style.removeProperty('height');
        row.style.removeProperty('width');
        // Keep background-color, color, etc.
      });
      
      // Remove width constraints from colgroup elements but keep other styling
      // EXCEPT for Sales Rep table AND Sales by Customer table - preserve their colgroup widths for equal column distribution
      const allColgroups = clonedTable.querySelectorAll('colgroup, col');
      // Check if this is the Sales Rep table by looking for the first header cell
      const firstHeader = clonedTable.querySelector('thead tr th.empty-header');
      const isSalesRepTable = firstHeader && firstHeader.textContent?.includes('Sales Rep');
      // Check if this is the Sales by Customer table by checking table class
      const isSalesByCustomerTable = clonedTable.classList.contains('sales-by-customer-table');
      
      allColgroups.forEach(col => {
        // Don't remove width from Sales Rep table or Sales by Customer table colgroups
        if (!isSalesRepTable && !isSalesByCustomerTable) {
          col.style.removeProperty('width');
          col.style.removeProperty('min-width');
          col.style.removeProperty('max-width');
        }
        // Keep other styling
      });
      
      // Add space after currency symbols
      const currencySymbols = clonedTable.querySelectorAll('.uae-symbol');
      currencySymbols.forEach(symbol => {
        if (symbol.textContent && !symbol.textContent.includes(' ')) {
          symbol.textContent = symbol.textContent + ' ';
        }
      });
      
      // Remove empty rows from thead (the 2 unwanted rows above headers)
      const theadRows = clonedTable.querySelectorAll('thead tr');
      theadRows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const hasContent = Array.from(cells).some(cell => {
          const text = cell.textContent?.trim();
          return text && text.length > 0 && text !== ' ' && text !== '\u00A0';
        });
        // Remove row if it's completely empty or has only whitespace
        if (!hasContent) {
          row.remove();
        }
      });

      // Fix the header structure - ensure headers are on single lines (no breaks)
      const headerCells = clonedTable.querySelectorAll('thead tr th');
      headerCells.forEach(th => {
        // Remove any existing line breaks and ensure single-line headers
        const text = th.textContent?.trim();
        if (text.includes('%') && text.includes('Sales')) {
          th.innerHTML = '% of Sales';
        } else if (text.includes('per') && text.includes('Kg')) {
          th.innerHTML = getUAEDirhamSymbolHTML() + ' per Kg';
        }
      });

      // Return the modified HTML
      return clonedTable.outerHTML;
      
    } catch (error) {
      console.error('❌ Failed to capture P&L table HTML:', error);
      throw new Error(`Failed to capture P&L table HTML: ${error.message}`);
    }
  };

  // Generate KPI Summary HTML (same as Comprehensive HTML Export)
  // Helper function to ensure Product Group tab is active
  const ensureProductGroupTabActive = () => {
    console.log('🔍 Checking if Product Group tab is active...');
    
    // Find the Product Group tab specifically - look for small clickable elements only
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const productGroupTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return text === 'Product Group' && text.length < 50; // Must be exact match and short text
    });
    
    if (!productGroupTab) {
      console.warn('⚠️ Product Group tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found Product Group tab button:', productGroupTab.textContent?.trim());
    
    // Check if it's already active
    const isActive = productGroupTab.classList.contains('active') || 
                    productGroupTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking Product Group tab...');
      productGroupTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ Product Group tab is already active');
    }
    
    return Promise.resolve();
  };

  // Capture Sales by Customer table HTML (same as Comprehensive HTML Export)
  const captureSalesCustomerTable = async () => {
    console.log('🔍 Capturing Sales by Customer table...');
    
    // Check if "Hide Sales Rep" checkbox is checked
    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    let hideSalesRep = false;
    
    console.log('🔍 DEBUG: Found', allCheckboxes.length, 'checkboxes on page');
    
    // Look for the "Hide Sales Rep" checkbox specifically
    for (const checkbox of allCheckboxes) {
      const label = checkbox.closest('label');
      console.log('🔍 DEBUG: Checkbox label text:', label ? label.textContent.trim() : 'NO LABEL');
      
      if (label && label.textContent.includes('Hide Sales Rep')) {
        hideSalesRep = checkbox.checked;
        console.log('🔍 Found Hide Sales Rep checkbox, checked:', hideSalesRep);
        break;
      }
    }
    
    // Also try alternative detection methods
    if (!hideSalesRep) {
      // Try finding by text content in the page
      const hideSalesRepText = document.body.textContent;
      if (hideSalesRepText.includes('Hide Sales Rep')) {
        console.log('🔍 DEBUG: Found "Hide Sales Rep" text in page, but checkbox detection failed');
      }
      
      // Try finding the checkbox by looking for the specific text pattern
      const allLabels = Array.from(document.querySelectorAll('label'));
      for (const label of allLabels) {
        if (label.textContent.includes('Hide Sales Rep')) {
          const checkbox = label.querySelector('input[type="checkbox"]');
          if (checkbox) {
            hideSalesRep = checkbox.checked;
            console.log('🔍 Found Hide Sales Rep checkbox via label search, checked:', hideSalesRep);
            break;
          }
        }
      }
    }
    
    console.log('🔍 Hide Sales Rep setting:', hideSalesRep ? 'HIDDEN' : 'VISIBLE');
    
    // Look for the Sales by Customer table in the DOM
    const allTables = Array.from(document.querySelectorAll('table'));
    console.log('Available tables count for Sales Customer:', allTables.length);
    
    // Find table that looks like Sales by Customer - it should have customer names
    const customerTable = allTables.find(table => {
      const tableText = table.textContent || '';
      const hasCustomerData = tableText.includes('Customer') || 
                             tableText.includes('Total') ||
                             tableText.includes('Sales') ||
                             tableText.includes('AED') ||
                             tableText.includes('Amount');
      
      const isInTableView = table.closest('.table-view') || table.closest('.sales-customer-table');
      
      console.log(`Checking table for Sales Customer:`, {
        hasCustomerData,
        isInTableView: !!isInTableView,
        classes: table.className,
        textPreview: tableText.substring(0, 100)
      });
      
      return hasCustomerData && isInTableView;
    });
    
    // Helper function to process Customer table - replace singular with plural
    const processCustomerTable = (table) => {
      const clonedTable = table.cloneNode(true);
      const allCells = clonedTable.querySelectorAll('td, th');
      allCells.forEach(cell => {
        const text = cell.textContent?.trim();
        if (text === 'Customer' || text === 'Sales Rep') {
          cell.textContent = text === 'Customer' ? 'Customers' : 'Sales Reps';
        }
      });
      return clonedTable.outerHTML;
    };

    if (customerTable) {
      console.log('✅ Found Sales by Customer table');

      // Store the hideSalesRep setting for later use in rendering
      window.salesCustomerHideSalesRep = hideSalesRep;

      return processCustomerTable(customerTable);
    }

    // Fallback: look for any table that might be the sales customer table
    const fallbackTable = allTables.find(table => {
      const tableView = table.closest('.table-view');
      const hasSalesData = table.textContent?.includes('Sales') || table.textContent?.includes('Amount');
      return tableView && hasSalesData && table.querySelector('thead') && table.querySelector('tbody');
    });

    if (fallbackTable) {
      console.log('🎯 Using fallback table for Sales by Customer');

      // Store the hideSalesRep setting for later use in rendering
      window.salesCustomerHideSalesRep = hideSalesRep;

      return processCustomerTable(fallbackTable);
    }
    
    throw new Error('Sales by Customer table not found. Please visit the Sales by Customer tab first.');
  };

  // Function to capture Sales by Country table HTML
  const captureSalesCountryTable = async () => {
    console.log('🔍 Capturing Sales by Country table...');
    
    // Check if "Hide Budget & Forecast" checkbox is checked
    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    let hideBudgetForecast = false;
    
    console.log('🔍 DEBUG: Found', allCheckboxes.length, 'checkboxes on page');
    
    // Look for the "Hide Budget & Forecast" checkbox
    for (const checkbox of allCheckboxes) {
      const label = checkbox.closest('label');
      const labelText = label ? label.textContent.trim() : '';
      console.log('🔍 DEBUG: Checkbox label text:', labelText);
      
      if (label && (label.textContent.includes('Hide Budget') || label.textContent.includes('Hide Budget & Forecast'))) {
        hideBudgetForecast = checkbox.checked;
        console.log('🔍 Found Hide Budget checkbox, checked:', hideBudgetForecast);
        break;
      }
    }
    
    console.log('🔍 Hide Budget & Forecast setting:', hideBudgetForecast ? 'HIDDEN' : 'VISIBLE');
    
    // Look for the Sales by Country table in the DOM
    const allTables = Array.from(document.querySelectorAll('table'));
    console.log('Available tables count for Sales Country:', allTables.length);
    
    // Find table that looks like Sales by Country - it should have country names
    const countryTable = allTables.find(table => {
      const tableText = table.textContent || '';
      const hasCountryData = tableText.includes('Country') || 
                            tableText.includes('Total') ||
                            tableText.includes('Europe') ||
                            tableText.includes('UAE');
      
      const isInTableView = table.closest('.table-view') || table.classList.contains('sales-by-country-table');
      
      console.log(`Checking table for Sales Country:`, {
        hasCountryData,
        isInTableView: !!isInTableView,
        classes: table.className,
        textPreview: tableText.substring(0, 100)
      });
      
      return hasCountryData && isInTableView;
    });
    
    // Helper function to process Country table - replace singular with plural
    const processCountryTable = (table) => {
      const clonedTable = table.cloneNode(true);
      const allCells = clonedTable.querySelectorAll('td, th');
      allCells.forEach(cell => {
        const text = cell.textContent?.trim();
        if (text === 'Country') {
          cell.textContent = 'Country Names';
        }
      });
      return clonedTable.outerHTML;
    };

    if (countryTable) {
      console.log('✅ Found Sales by Country table');
      return processCountryTable(countryTable);
    }

    // Fallback: look for any table that might be the sales country table
    const fallbackTable = allTables.find(table => {
      const tableView = table.closest('.table-view');
      const hasCountryData = table.textContent?.includes('Country') || table.textContent?.includes('Europe');
      return tableView && hasCountryData && table.querySelector('thead') && table.querySelector('tbody');
    });

    if (fallbackTable) {
      console.log('🎯 Using fallback table for Sales by Country');
      return processCountryTable(fallbackTable);
    }
    
    throw new Error('Sales by Country table not found. Please visit the Sales by Country tab first.');
  };

  // Helper function to ensure Sales by Customer tab is active
  const ensureSalesCustomerTabActive = () => {
    console.log('🔍 Checking if Sales by Customer tab is active...');
    
    // Find the Sales by Customer tab specifically
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const salesCustomerTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return (text === 'Sales by Customer' || text.includes('Customer')) && text.length < 50;
    });
    
    if (!salesCustomerTab) {
      console.warn('⚠️ Sales by Customer tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found Sales by Customer tab button:', salesCustomerTab.textContent?.trim());
    
    // Check if it's already active
    const isActive = salesCustomerTab.classList.contains('active') || 
                    salesCustomerTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking Sales by Customer tab...');
      salesCustomerTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ Sales by Customer tab is already active');
    }
    
    return Promise.resolve();
  };

  // Helper function to ensure Sales by Sales Rep Divisional tab is active
  const ensureSalesSaleRepTabActive = () => {
    console.log('🔍 Checking if Sales by Sales Rep Divisional tab is active...');
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const salesRepTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return text === 'Sales by Sales Rep Divisional';
    });
    if (!salesRepTab) {
      console.warn('⚠️ Sales by Sales Rep Divisional tab button not found');
      return Promise.resolve();
    }
    
    // Check if the tab is already active by looking for the SalesBySalesRepDivisional component
    const salesRepDivisionalTable = Array.from(document.querySelectorAll('.table-view')).find(tableView => {
      const title = tableView.querySelector('h2')?.textContent;
      return title && title.includes('Sales by Sales Rep');
    });
    if (salesRepDivisionalTable) {
      console.log('✅ Sales by Sales Rep Divisional tab is already active');
      return Promise.resolve();
    }
    console.log('🔍 Found Sales by Sales Rep Divisional tab button:', salesRepTab.textContent?.trim());
    const isActive = salesRepTab.classList.contains('active') || salesRepTab.getAttribute('aria-selected') === 'true';
    if (!isActive) {
      console.log('🔄 Clicking Sales by Sales Rep Divisional tab...');
      salesRepTab.click();
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ Sales by Sales Rep Divisional tab is already active');
    }
    return Promise.resolve();
  };

  // Helper function to ensure Sales by Country tab is active
  const ensureSalesCountryTabActive = () => {
    console.log('🔍 Checking if Sales by Country tab is active...');
    
    // Find the Sales by Country tab specifically
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const salesCountryTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return text && text.includes('Sales by Country') && !text.includes('Customer');
    });
    
    if (!salesCountryTab) {
      console.warn('⚠️ Sales by Country tab not found');
      return Promise.resolve();
    }
    
    console.log('🔍 Found Sales by Country tab button:', salesCountryTab.textContent);
    
    // Check if it's already active
    const isActive = salesCountryTab.classList.contains('active') || 
                    salesCountryTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking Sales by Country tab...');
      salesCountryTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ Sales by Country tab is already active');
    }
    
    return Promise.resolve();
  };

  const generateOutstandingKPISummary = async () => {
    try {
      // Navigate to KPI tab using the same logic as ensureKPITabActive()
      const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const kpiTab = allButtons.find(el => {
        const text = el.textContent?.trim();
        return (text === 'KPI' || text === 'Executive Summary' || text.includes('KPI')) && text.length < 50;
      });

      if (kpiTab) {
        const isActive = kpiTab.classList.contains('active') || 
                        kpiTab.getAttribute('aria-selected') === 'true';
        if (!isActive) {
          console.log('🔄 Switching to KPI tab for HTML capture...');
          kpiTab.click();
          
          // Wait for loading spinners to disappear (up to 15 seconds)
          console.log('⏳ Waiting for KPI data to finish loading...');
          const maxWaitTime = 15000; // 15 seconds max
          const startTime = Date.now();
          
          while (Date.now() - startTime < maxWaitTime) {
            const loadingSpinners = document.querySelectorAll('.kpi-dashboard .loading-spinner, .kpi-dashboard .spinner');
            if (loadingSpinners.length === 0) {
              console.log('✅ KPI loading complete! Data is ready for capture.');
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
          }
          
          // Give it an extra 500ms to ensure DOM is fully updated
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Capture the EXACT HTML from the live KPI component
      const kpiComponent = document.querySelector('.kpi-dashboard');
      if (!kpiComponent) {
        throw new Error('KPI component not found. Please ensure KPI tab is active and component is rendered.');
      }

      // Clone the component to modify it
      const clonedComponent = kpiComponent.cloneNode(true);
      
      // Add space after currency symbols
      const currencySymbols = clonedComponent.querySelectorAll('.uae-symbol');
      currencySymbols.forEach(symbol => {
        if (symbol.textContent && !symbol.textContent.includes(' ')) {
          symbol.textContent = symbol.textContent + ' ';
        }
      });

      // Get the actual KPI CSS content
      const kpiCSS = getKPICSSContent();

      // Return the modified HTML + CSS
      return `
        <style>
          ${kpiCSS}
        </style>
        ${clonedComponent.outerHTML}
      `;
      
    } catch (error) {
      console.error('❌ Failed to capture live KPI HTML:', error);
      throw new Error(`Failed to capture live KPI HTML: ${error.message}`);
    }
  };

  const handleExport = async () => {
    console.log('🔥🔥🔥 MULTICHART EXPORT STARTED - This should generate 5 cards!');
    setIsExporting(true);
    
    // 🚨 CRITICAL: Capture checkbox states RIGHT NOW before switching any tabs!
    let globalHideSalesRepState = false;
    let globalHideBudgetForecastState = false;
    console.log('🔍 INITIAL CHECK: Looking for checkboxes on current tab...');
    const initialCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    for (const checkbox of initialCheckboxes) {
      const label = checkbox.closest('label');
      if (label) {
        if (label.textContent.includes('Hide Sales Rep')) {
          globalHideSalesRepState = checkbox.checked;
          localStorage.setItem('exportHideSalesRep', globalHideSalesRepState.toString());
          console.log('💾 CAPTURED at start: Hide Sales Rep =', globalHideSalesRepState);
        } else if (label.textContent.includes('Hide Budget')) {
          globalHideBudgetForecastState = checkbox.checked;
          localStorage.setItem('exportHideBudgetForecast', globalHideBudgetForecastState.toString());
          console.log('💾 CAPTURED at start: Hide Budget & Forecast =', globalHideBudgetForecastState);
        }
      }
    }
    
    try {
      // Compute cell values - EXACT same logic as ChartContainer
      const divisionData = excelData[selectedDivision] || [];
      const computeCellValue = (rowIndex, column) =>
        sharedComputeCellValue(divisionData, rowIndex, column);

      // Numeric sanitizer to handle formatted strings
      const sanitizeNumeric = (value) => {
        if (value === null || value === undefined) return 0;
        
        if (typeof value === 'string') {
          const cleaned = value.replace(/[,¥€£$₽₹₪₩₫₨₴₸₼₾₿\s]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      };

      // Build chart data with validation - EXACT same logic as ChartContainer
      const periods = columnOrder;
      if (!periods || periods.length === 0) {
        throw new Error('No periods available. Please generate data first.');
      }
      
      const basePeriod = periods[basePeriodIndex];
      const visiblePeriods = periods.filter(p => isColumnVisibleInChart(p.id));
      
      if (visiblePeriods.length === 0) {
        throw new Error('No visible periods in chart. Please make at least one period visible.');
      }

      // Capture actual data from original charts - this gets the REAL figures currently displayed
      const captureActualChartData = () => {
        const actualData = {};
        
        visiblePeriods.forEach(period => {
          const periodKey = `${period.year}-${period.month || period.type}-${period.type}`;
          actualData[periodKey] = {
            sales: computeCellValue(3, period),
            materialCost: computeCellValue(5, period),
            salesVolume: computeCellValue(7, period),
            productionVolume: computeCellValue(8, period),
            // Manufacturing Cost data - EXACT same as original charts
            labour: computeCellValue(9, period),
            depreciation: computeCellValue(10, period),
            electricity: computeCellValue(12, period),
            othersMfgOverheads: computeCellValue(13, period),
            totalDirectCost: computeCellValue(14, period),
            // Below GP Expenses data - EXACT same as original charts
            sellingExpenses: computeCellValue(31, period),
            transportation: computeCellValue(32, period),
            administration: computeCellValue(40, period),
            bankInterest: computeCellValue(42, period),
            totalBelowGPExpenses: computeCellValue(52, period),
            // Combined Trends data - EXACT same as original charts
            netProfit: computeCellValue(54, period),
            ebitda: computeCellValue(56, period)
          };
        });

        return actualData;
      };

      const capturedActualData = captureActualChartData();

      // Get division display name
      const getDivisionDisplayName = () => {
        const divisionNames = {
          'FP-Product Group': 'Flexible Packaging',
          'SB-Product Group': 'Shopping Bags',
          'TF-Product Group': 'Thermoforming Products',
          'HCM-Product Group': 'Harwal Container Manufacturing'
        };
        return divisionNames[selectedDivision] || selectedDivision.split('-')[0];
      };

      // Get base period display text
      const getBasePeriodText = () => {
        if (basePeriodIndex !== null && columnOrder[basePeriodIndex]) {
          const period = columnOrder[basePeriodIndex];
          return `${period.year} ${period.isCustomRange ? period.displayName : period.month} ${period.type}`;
        }
        return 'No Base Period Selected';
      };

      // Convert logo to base64 for embedding
      const getBase64Logo = async () => {
        try {
          const response = await fetch(ipTransparentLogo);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn('Could not load IP transparent logo for charts export:', error);
          return null;
        }
      };
      
      const chartData = {};
      const colsToIterate = visiblePeriods.length ? visiblePeriods : periods;

      colsToIterate.forEach(col => {
        let key;
        if (col.isCustomRange) {
          key = `${col.year}-${col.month}-${col.type}`;
        } else {
          key = `${col.year}-${col.month || 'Year'}-${col.type}`;
        }
        
        const salesRaw = computeCellValue(3, col);
        const materialRaw = computeCellValue(5, col);
        const salesVolRaw = computeCellValue(7, col);
        const prodVolRaw = computeCellValue(8, col);
        
        // Sanitize all numeric values
        const sales = sanitizeNumeric(salesRaw);
        const material = sanitizeNumeric(materialRaw);
        const salesVol = sanitizeNumeric(salesVolRaw);
        const prodVol = sanitizeNumeric(prodVolRaw);
        
        chartData[key] = {
          sales,
          materialCost: material,
          salesVolume: salesVol,
          productionVolume: prodVol,
          marginPerKg: salesVol > 0 ? (sales - material) / salesVol : 0
        };
      });

      // Create period key helper function - EXACT same as BarChart
      const createPeriodKey = (period) => {
        if (period.isCustomRange) {
          return `${period.year}-${period.month}-${period.type}`;
        } else {
          return `${period.year}-${period.month || 'Year'}-${period.type}`;
        }
      };

      // Get base period key
      const basePeriodKey = basePeriod ? createPeriodKey(basePeriod) : '';

      // Build period labels - EXACT same as BarChart
      const periodLabels = visiblePeriods.map(period => {
        if (period.isCustomRange) {
          return `${period.year}-${period.displayName}-${period.type}`;
        } else if (period.month) {
          return `${period.year}-${period.month}-${period.type}`;
        }
        return `${period.year}-${period.type}`;
      });

      // Build series data - EXACT same as BarChart
      const seriesData = visiblePeriods.map(period => {
        const periodKey = createPeriodKey(period);
        return chartData[periodKey]?.sales || 0;
      });

      // Sales Volume data - EXACT same as BarChart
      const salesVolumeData = visiblePeriods.map(period => {
        const periodKey = createPeriodKey(period);
        return chartData[periodKey]?.salesVolume || 0;
      });

      // Calculate % variance - EXACT same as BarChart
      const percentVariance = seriesData.map((value, idx) => {
        if (idx === 0) return null;
        const prevValue = seriesData[idx - 1];
        if (prevValue === 0) return null;
        return ((value - prevValue) / Math.abs(prevValue)) * 100;
      });

      // Color schemes - EXACT same as BarChart
      const colorSchemes = [
        { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
        { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
        { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
        { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
        { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
      ];

      // Get bar colors - EXACT same as BarChart
      const barColors = visiblePeriods.map((period) => {
        if (period.customColor) {
          const scheme = colorSchemes.find(s => s.name === period.customColor);
          if (scheme) {
            return scheme.primary;
          }
        }
        
        if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
          return '#FF6B35';
        } else if (period.month === 'January') {
          return '#FFD700';
        } else if (period.month === 'Year') {
          return '#288cfa';
        } else if (period.type === 'Budget') {
          return '#2E865F';
        }
        
        return '#288cfa';
      });

      // Get logo and division info for header
      const logoBase64 = await getBase64Logo();
      const divisionName = getDivisionDisplayName();
      const periodDisplayText = getBasePeriodText(); // Fixed variable name conflict

      // 🎯 Capture live KPI data (same as Comprehensive HTML Export)
      console.log('🔥 Step: Capturing live KPI data...');
      let kpiSummaryHTML = '<div class="placeholder-content"><h3>KPI Summary</h3><p>KPI data not available - please visit the KPI tab first.</p></div>';
      try {
        kpiSummaryHTML = await generateOutstandingKPISummary();
        console.log('✅ Live KPI data captured successfully');
      } catch (err) {
        console.warn('⚠️ KPI Summary not available:', err.message);
      }

      // 🎯 Capture live Product Group data
      console.log('🔥 Step: Capturing live Product Group data...');
      let productGroupTableHTML = '<div class="placeholder-content"><h3>Product Group</h3><p>Product Group table not available - please visit the Product Group tab first.</p></div>';
      try {
        await ensureProductGroupTabActive();
        // Add extra wait for Product Group table to fully render with calculations
        await new Promise(resolve => setTimeout(resolve, 2000));
        productGroupTableHTML = await captureProductGroupTable();
        console.log('✅ Live Product Group data captured successfully');
      } catch (err) {
        console.warn('⚠️ Product Group table not available:', err.message);
      }

      // 🎯 Capture live P&L Financial data
      console.log('🔥 Step: Capturing live P&L Financial data...');
      let plFinancialTableHTML = '<div class="placeholder-content"><h3>P&L Financial</h3><p>P&L table not available - please visit the P&L tab first.</p></div>';
      try {
        plFinancialTableHTML = await capturePLFinancialTable();
        console.log('✅ Live P&L Financial data captured successfully');
      } catch (err) {
        console.warn('⚠️ P&L Financial table not available:', err.message);
      }

      // 🎯 Capture live Sales by Customer data
      console.log('🔥 Step: Capturing live Sales by Customer data...');
      let salesCustomerTableHTML = '<div class="placeholder-content"><h3>Sales by Customer</h3><p>Sales by Customer table not available - please visit the Sales by Customer tab first.</p></div>';
      
      // Read the checkbox state that was captured at the start
      const savedState = localStorage.getItem('exportHideSalesRep');
      let hideSalesRepState = savedState === 'true';
      console.log('📖 USING SAVED STATE: hideSalesRep =', hideSalesRepState);
      
      try {
        await ensureSalesCustomerTabActive();
        
        // After tab activation, restore the checkbox state by clicking if needed
        console.log('🔍 RESTORING STATE: Looking for Hide Sales Rep checkbox...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for component to mount
        
        const postCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        for (const checkbox of postCheckboxes) {
          const label = checkbox.closest('label');
          if (label && label.textContent.includes('Hide Sales Rep')) {
            const currentState = checkbox.checked;
            console.log('🔍 Checkbox after tab switch:', currentState, '| Need to restore to:', hideSalesRepState);
            
            if (currentState !== hideSalesRepState) {
              console.log('🔄 CLICKING checkbox to restore state...');
              checkbox.click();
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait for React to update
              console.log('✅ Checkbox clicked! State should now be:', hideSalesRepState);
            } else {
              console.log('✅ Checkbox already in correct state');
            }
            break;
          }
        }
        
        console.log('🔍 FINAL STATE: hideSalesRepState =', hideSalesRepState);
        
        // Wait for the table to fully render with the CORRECT column visibility
        // If hideSalesRep is checked, the table needs to re-render without the Sales Rep column
        console.log('⏳ Waiting for table to render with correct column visibility...');
        
        // Wait and verify the DOM has updated according to checkbox state
        let retries = 0;
        let maxRetries = 10;
        let waitTime = 500; // Check every 500ms
        
        while (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Check if the DOM matches the expected state
          const currentTable = document.querySelector('.sales-by-customer-table');
          const hasSalesRepColumn = currentTable && currentTable.querySelector('.sales-rep-header');
          
          console.log(`🔍 Retry ${retries + 1}: Sales Rep column present in DOM:`, !!hasSalesRepColumn, '| Expected to be hidden:', hideSalesRepState);
          
          // If checkbox is checked (hide sales rep) and column is gone, OR
          // If checkbox is unchecked (show sales rep) and column is present
          if ((hideSalesRepState && !hasSalesRepColumn) || (!hideSalesRepState && hasSalesRepColumn)) {
            console.log('✅ Table DOM matches expected state!');
            break;
          }
          
          retries++;
        }
        
        if (retries === maxRetries) {
          console.warn('⚠️ Timeout waiting for table to update, capturing current state...');
        }
        
        salesCustomerTableHTML = await captureSalesCustomerTable();
        console.log('✅ Live Sales by Customer data captured successfully');
        
        // Debug: Check what was actually captured
        console.log('🔍 DEBUG: Captured HTML contains "Sales Rep" header:', salesCustomerTableHTML.includes('Sales Rep'));
        console.log('🔍 DEBUG: Captured HTML contains "sales-rep-header":', salesCustomerTableHTML.includes('sales-rep-header'));
        console.log('🔍 DEBUG: First 1000 characters of captured HTML:', salesCustomerTableHTML.substring(0, 1000));
      } catch (err) {
        console.warn('⚠️ Sales by Customer table not available:', err.message);
      }

  // 🎯 Capture live Sales by Sales Rep Divisional data
  console.log('🔥 Step: Capturing live Sales by Sales Rep Divisional data...');
  let salesRepTableHTML = '<div class="placeholder-content"><h3>Sales by Sales Rep</h3><p>Sales by Sales Rep Divisional table not available - please visit the Sales by Sales Rep Divisional tab first.</p></div>';
  try {
    await ensureSalesSaleRepTabActive();
    
    // Wait for loading spinner to disappear (up to 30 seconds for ultra-fast API)
    console.log('⏳ Waiting for Sales Rep Divisional data to finish loading...');
    const maxWaitTime = 30000; // 30 seconds max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const loadingSpinner = document.querySelector('.table-view .loading-spinner');
      if (!loadingSpinner) {
        console.log('✅ Loading complete! Data is ready for capture.');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms
    }
    
    // Give it an extra 500ms to ensure DOM is fully updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Look for the Sales by Sales Rep Divisional table specifically
    // First try to find a table with "Sales by Sales Rep" in the title
    const salesRepTable = Array.from(document.querySelectorAll('.table-view')).find(tableView => {
      const title = tableView.querySelector('h2')?.textContent;
      return title && title.includes('Sales by Sales Rep');
    })?.querySelector('table') ||
    // Fallback to the standard selector
    document.querySelector('.sales-by-customer-table') || 
    document.querySelector('.table-view table') ||
    document.querySelector('.sales-customer-table-container table');
    
    if (salesRepTable) {
      console.log('✅ Found Sales by Sales Rep Divisional table');
      salesRepTableHTML = salesRepTable.outerHTML;
      
      // Debug: Check if this is actually the Sales Rep Divisional table
      const tableTitle = salesRepTable.closest('.table-view')?.querySelector('h2')?.textContent;
      console.log('🔍 Table title found:', tableTitle);
      console.log('🔍 Table contains "Sales Rep" in title:', tableTitle?.includes('Sales Rep'));
    } else {
      console.warn('⚠️ Sales by Sales Rep Divisional table not found in DOM; using placeholder');
      const allTables = Array.from(document.querySelectorAll('table'));
      console.log('Available tables:', allTables.map(t => ({ 
        classes: t.className, 
        textPreview: (t.textContent || '').substring(0, 100),
        parentTitle: t.closest('.table-view')?.querySelector('h2')?.textContent
      })));
    }
  } catch (err) {
    console.warn('⚠️ Sales by Sales Rep Divisional capture failed:', err.message);
  }

      // 🎯 Capture live Sales by Country data
      console.log('🔥 Step: Capturing live Sales by Country data...');
      let salesCountryTableHTML = '<div class="placeholder-content"><h3>Sales by Country</h3><p>Sales by Country table not available - please visit the Sales by Country tab first.</p></div>';
      
      // Read the checkbox state that was captured at the start (if exists)
      const savedBudgetState = localStorage.getItem('exportHideBudgetForecast');
      let hideBudgetForecastState = savedBudgetState === 'true';
      console.log('📖 USING SAVED STATE: hideBudgetForecast =', hideBudgetForecastState);
      
      try {
        await ensureSalesCountryTabActive();
        
        // After tab activation, check and restore checkbox state
        console.log('🔍 RESTORING STATE: Looking for Hide Budget checkbox...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for component to mount
        
        const budgetCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        for (const checkbox of budgetCheckboxes) {
          const label = checkbox.closest('label');
          if (label && (label.textContent.includes('Hide Budget') || label.textContent.includes('Hide Budget & Forecast'))) {
            const currentState = checkbox.checked;
            console.log('🔍 Checkbox after tab switch:', currentState, '| Need to restore to:', hideBudgetForecastState);
            
            if (currentState !== hideBudgetForecastState) {
              console.log('🔄 CLICKING checkbox to restore state...');
              checkbox.click();
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait for React to update
              console.log('✅ Checkbox clicked! State should now be:', hideBudgetForecastState);
            } else {
              console.log('✅ Checkbox already in correct state');
            }
            break;
          }
        }
        
        console.log('🔍 FINAL STATE: hideBudgetForecastState =', hideBudgetForecastState);
        
        // Wait for the table to render
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        salesCountryTableHTML = await captureSalesCountryTable();
        console.log('✅ Live Sales by Country data captured successfully');
      } catch (err) {
        console.warn('⚠️ Sales by Country table not available:', err.message);
      }

      // Generate the comprehensive HTML with EXACT same charts as main Charts page
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${divisionName} - Comprehensive Report</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script>
        // Fallback for offline use - if ECharts fails to load from CDN
        if (typeof echarts === 'undefined') {
            console.log('ECharts CDN failed to load, charts will not render');
            // You can embed a minimal chart library here if needed for offline use
        }
    </script>
    <script>
        // Font detection removed - using SVG-based UAE symbols that render immediately
        // No font loading detection needed since we use getUAEDirhamSymbolHTML() SVG approach
        
        // Fallback for ECharts loading
        window.addEventListener('load', function() {
            if (typeof echarts === 'undefined') {
                console.error('ECharts failed to load from CDN');
                document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: #dc3545; font-size: 18px; text-align: center; padding: 20px;"><div>Chart library failed to load. Please check your internet connection and refresh the page.</div></div>';
            }
            
            // No font loading delay needed - SVG symbols render immediately
        });
    </script>
    <style>
        @font-face {
            font-family: 'UAESymbol';
            src: url('data:font/woff2;base64,d09GMgABAAAAAAQYAA0AAAAACBAAAAPDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cBmAAgkIIBBEICoUUhCkLCgABNgIkAxAEIAWEEAcqG7YGUZQPTgfg47Apmy9iLmImDnGZy6goEb/MR/MYQbVG9uze3RO4ALBFhQoAVFiTQhIyGnVcolgBokvV/WSX/+Yu3Al08BwCbQCpXXyYbdB9UFW6f3A5/X/6J1j6rE/3ezTw3xoLs7ZIgImtaUX58mgKJJRpgon2VjNR6jPw3PkpCCJqLwS8uH9zAuBt6/4L8i7/FfljnFKSjqSrOCbPjpcmhICkbMLIBNdp7uaEepj22efcvw5Wmt7ZAQQA+kPIyOgNgcmEAr0Z6Q8UCoHPdb1urXtAQFQEvU+ii99CwG/KpmMPSCNA1LUECtCICg/wHtCKsZEAFz29WmIpx8aWRoXYmKqaKVpzXGPx4xRWxDrOiI46Pi5gYZrFV1nRURULIOacOMpfNA0OOEB0VAaxbJpa9cACVLfusOrAHHCYEXJSxuFMOMlzYrjif0QefiT+CEVJTut5CY9Q3rhrOk6ORKxIhLENPyYHzM7gNTvhyNbOyA+5cTUcxsBAwbYEz4hnOLRLvUv+pPBYyZ4Ao4LQv8rP5M8wVD4AXnPeCDrOY975thcv4RW7Nbu1u8x3fSUbxRt09Qc4BtdqBO+N0k1vktptmTo3z4ok3bC7ANk6w/v5t4cixFb5r4Qx7hewSoO10Pvjr2OEkcAWoYLFurl/zmyEQtN/3YQZ64aAodj/C3GxW7lQ9zTZa4S7P03ykfeRY/qVJdqcKi7WqGtO35P6ItlvOnmk15N2cyckpvH93UXSirc66fagHa6uBbXJS23+ca7vZswQxF4Tj19ElEbnsnt11wOWtsq+/M3LL16ExpEvXqQ0u/l86v/ogX370tJ8DDgwBNdO3jo5y7Zk7uZsJ9gAmutT+WV6dzmMm3ypofBt4uWqfDr5Sk6+TXQxu7ASArJV/NeJSG8NITj3+8alNdaT/zXi/PH0l6svQKMEAht4IsszBuSXAtMLb34AQBZGdrNA4e4LQEIITEcD0O6CAPTgD4HQZD0Ekga7IZANcU+AQlM0C1DqiHyk2hJLCUXRhIlAJ0O3TDJpt4XM5pgnC922yVLfcPicSnfEi9Ol24heLZo060e4qOOK8OXNVwAPRI1eDZp1gN8sDepcv0rmoJrehuYOgEU69WvRr12DegFg0bYL9/j6AID5GjQZ0F7RhlfKFQFm6MoV5GKvJg3HZ9K8EaEdKsu+Rl/BPPnx7NaAJ2NhnNPb1EB8aW8SSjrg9YJvsKefZ8s99YouLvbq09LbOMKbNx80b27D7W7O29uH9qaeKoYJcK2vmgiEfIGINHYBAA==') format('woff2');
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #e3f2fd;
            min-height: 100vh;
        }
        
        .header {
            background: white;
            padding: 20px 0;
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .logo-container {
            margin-bottom: 20px;
        }
        
        .logo {
            max-height: 80px;
            max-width: 200px;
            object-fit: contain;
        }
        
        .division-title {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .period-info {
            font-size: 1.1rem;
            color: #34495e;
            background: #ecf0f1;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: 600;
            margin-top: 15px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 25px;
            margin-bottom: 40px;
        }
        
        .charts-grid.hidden {
            display: none;
        }
        
        .chart-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border: 2px solid transparent;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .chart-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            border-color: #3498db;
        }
        
        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 16px;
            display: block;
        }
        
        .card-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #444b54;
            margin-bottom: 8px;
            letter-spacing: 0.04em;
        }
        
        
        /* Full-screen chart view */
        .full-screen-chart {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            z-index: 1000;
            display: none;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
        }
        
        .full-screen-chart.active {
            display: flex !important;
        }
        
        .full-screen-header {
            background: #033082;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
        }
        
        .currency-badge {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 22px;
            line-height: 1;
            pointer-events: none;
            opacity: 0.9;
        }
        
        .full-screen-title {
            font-size: 1.8rem;
            font-weight: 600;
            margin: 0;
        }
        
        /* Sales Reps table header font size */
        .sales-rep-table-container th.empty-header {
            font-size: 28px !important;
        }
        
        /* Center all figures in Sales Reps table */
        .sales-rep-table-container .metric-cell {
            text-align: center !important;
        }
        
        /* Delta cells - smaller font size */
        .sales-rep-table-container .delta-cell {
            font-size: 0.875rem !important; /* 14px - 2px smaller than regular 1rem */
        }
        
        /* Add borders to Sales Reps table */
        .sales-rep-table-container table {
            border-collapse: collapse !important;
            border: 1px solid #ddd !important;
        }
        
        .sales-rep-table-container th,
        .sales-rep-table-container td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
        }
        
        /* Make sales rep names bold */
        .sales-rep-table-container .customer-name-cell {
            font-weight: bold !important;
        }
        
        /* Hide the first row (year row) in Sales Reps table */
        .sales-rep-table-container thead tr:first-child {
            display: none !important;
        }
        
        .back-to-cards-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid white;
            border-radius: 8px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .back-to-cards-btn:hover {
            background: white;
            color: #033082;
        }
        
        .full-screen-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            height: auto;
            min-height: calc(100vh - 80px);
            box-sizing: border-box;
        }
        
        .full-screen-chart-container {
            width: 100%;
            height: auto;
            min-height: 60vh;
            margin-bottom: 20px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .uae-symbol {
            font-family: 'UAESymbol', sans-serif;
        }
        
        .uae-symbol.fallback {
            font-family: sans-serif !important;
        }
        
        /* EXACT same styling as original charts */
        .modern-margin-gauge-panel {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .modern-gauge-heading {
            font-size: 1.5rem;
            font-weight: 600;
            color: #2c3e50;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .chart-data-summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
         .additional-data {
             margin-top: 5px;
             padding: 20px;
             background: #f8f9fa;
             border-radius: 8px;
         }
        
        .data-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .data-label {
            font-weight: bold;
            font-size: 18px;
            min-width: 200px;
        }
        
        .data-values {
            display: flex;
            flex: 1;
            justify-content: space-around;
        }
        
        .data-value {
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            min-width: 100px;
        }
        
        .purple {
            color: #8e44ad;
        }
        
        .green {
            color: #2E865F;
        }
        
        /* EXACT same header styling as BarChartHTMLExport.js */
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px 0;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 10px 0;
            color: #333;
        }
        
        .subtitle {
            font-size: 18px;
            color: #888;
            margin-bottom: 10px;
        }
        
        .note {
            font-size: 14px;
            color: #666;
            font-style: italic;
        }
        
        .chart-header {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px 0;
        }
        
        /* EXACT same CSS as ModernMarginGauge.css */
        .modern-margin-gauge-panel {
            width: 98%;
            max-width: 1300px;
            margin: 30px auto 0;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .modern-margin-gauge-panel:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .modern-gauge-heading {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 50px;
            color: #333;
        }
        
        .modern-gauge-container {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            justify-items: center;
        }
        
        .modern-gauge-card {
            width: 100%;
            max-width: 260px;
            background-color: #fff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .modern-gauge-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        
        .gauge-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .gauge-container {
            position: relative;
            width: 100%;
            height: 160px;
            margin-bottom: 20px;
            margin-top: 15px;
        }
        
        .gauge-svg {
            width: 100%;
            height: 100%;
        }
        
        .gauge-track {
            transition: stroke-dashoffset 0.5s ease;
        }
        
        .gauge-progress {
            transition: stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .gauge-absolute {
            font-size: 24px;
            font-weight: 600;
            color: #444;
            margin-bottom: 5px;
        }
        
         .gauge-title {
             padding: 12px 16px;
             text-align: center;
             font-weight: 500;
             font-size: 16px;
         }
         
         /* Manufacturing cost totals card hover effects */
         .manufacturing-totals-card {
             padding: 12px 10px;
             border-radius: 6px;
             box-shadow: 0 2px 6px rgba(0,0,0,0.07);
             min-width: 150px;
             max-width: 180px;
             flex: 1;
             text-align: center;
             position: relative;
             overflow: hidden;
             cursor: pointer;
             display: flex;
             flex-direction: column;
             align-items: center;
             transition: transform 0.3s ease, box-shadow 0.3s ease;
         }
         
        .manufacturing-totals-card:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .below-gp-expenses-totals-card {
            padding: 12px 10px;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.07);
            min-width: 150px;
            max-width: 180px;
            flex: 1;
            text-align: center;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .below-gp-expenses-totals-card:hover {
            transform: translateY(-5px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        @media (max-width: 1400px) {
            .modern-gauge-container {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        @media (max-width: 992px) {
            .modern-gauge-container {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .modern-gauge-container {
                grid-template-columns: 1fr;
            }
        }
        
        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
            .title {
                font-size: 24px;
            }
            
            .subtitle {
                font-size: 16px;
            }
            
            .data-label {
                font-size: 16px;
                min-width: 150px;
            }
            
            .data-value {
                font-size: 16px;
                min-width: 80px;
            }
        }
        
        @media (max-width: 480px) {
            .title {
                font-size: 20px;
            }
            
            .subtitle {
                font-size: 14px;
            }
            
            .additional-data {
                margin-top: 10px;
                padding: 10px 15px;
            }
            
            .data-label {
                font-size: 14px;
                min-width: 120px;
            }
            
            .data-value {
                font-size: 14px;
                min-width: 60px;
            }
        }
        
        @media (max-width: 1400px) {
            .charts-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }
        }
        
        @media (max-width: 992px) {
            .charts-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
            }
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .charts-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .chart-card-header {
                padding: 20px;
            }
            
            .chart-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
            }
            
            .chart-title {
                font-size: 1.1rem;
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
        
        /* Consistent header row heights - OPTIMIZED and compact */
        .pl-financial-table thead tr th {
            height: 18px;
            line-height: 1;
            vertical-align: middle;
            font-weight: bold;
            position: sticky;
            z-index: 10;
            white-space: nowrap !important;
            padding: 2px 4px;
            font-size: 10px;
        }

        /* Default: Freeze first 3 header rows - OPTIMIZED for no dead space */
        .pl-financial-table thead tr:nth-child(1) th {
            top: 0px; /* Start immediately after blue header */
            z-index: 13;
        }

        .pl-financial-table thead tr:nth-child(2) th {
            top: 18px; /* 18px first row */
            z-index: 12;
        }

        .pl-financial-table thead tr:nth-child(3) th {
            top: 36px; /* 36px first two rows */
            z-index: 11;
        }

        /* P&L Financial Table: Freeze first 4 header rows */
        .pl-financial-table thead tr:nth-child(4) th {
            top: 54px; /* 54px first three rows */
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

        /* UAE Dirham Symbol - SVG based, no font loading needed */
        .uae-dirham-symbol {
          display: inline-block;
          vertical-align: -0.1em;
          width: 1em;
          height: 1em;
          margin-right: 0.2em;
          fill: currentColor;
        }
        .table-subtitle {
            font-size: 0.9rem;
            color: #666;
            margin-top: 5px;
            text-align: center;
        }

        /* Product Group Table Styles - EXACT same as ComprehensiveHTMLExport */
        
        /* Table Container - EXACT same as ComprehensiveHTMLExport */
        .product-group-table-container {
            width: 100%;
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 0 auto;
        }
        
        /* Table Title Container - EXACT same as ComprehensiveHTMLExport */
        .product-group-table-title-container {
            padding: 20px 20px 10px 20px;
            text-align: center;
        }
        
        .product-group-table-title-container .product-group-page-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #333;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Table Styles - EXACT same as ComprehensiveHTMLExport */
        .product-group-table {
            width: 100%;
            min-width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            font-size: 14px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            table-layout: auto;
        }

        .product-group-table th, 
        .product-group-table td {
            padding: 8px 12px;
            text-align: center;
            border: 1px solid #ddd;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* Consistent header row heights - REDUCED for more screen space */
        .product-group-table thead tr th {
            height: 24px;
            line-height: 1.1;
            vertical-align: middle;
            font-weight: bold;
            position: sticky;
            z-index: 10;
            white-space: nowrap !important;
            padding: 3px 6px;
            font-size: 11px;
        }
        
        /* Default: Freeze first 3 header rows - OPTIMIZED for no dead space */
        .product-group-table thead tr:nth-child(1) th {
            top: 0px; /* Start immediately after blue header */
            z-index: 13;
        }
        
        .product-group-table thead tr:nth-child(2) th {
            top: 24px; /* 24px first row */
            z-index: 12;
        }
        
        .product-group-table thead tr:nth-child(3) th {
            top: 48px; /* 48px first two rows */
            z-index: 11;
        }
        
        /* Make first column cells in frozen header rows white with no borders */
        .product-group-table thead tr:nth-child(1) th:first-child,
        .product-group-table thead tr:nth-child(2) th:first-child,
        .product-group-table thead tr:nth-child(3) th:first-child {
            background-color: white;
            border: none;
        }
        
        /* Remove left border from first period column in headers - clean look */
        .product-group-table thead tr:nth-child(2) th:nth-child(2),
        .product-group-table thead tr:nth-child(3) th:nth-child(2) {
            border-left: none;
        }
        
        /* FIX: Ensure sticky headers in the Product Group table retain their borders when scrolled */
        .product-group-table thead th[style*="background-color"] {
            border-right: 1px solid #ddd !important;
            border-bottom: 1px solid #ddd !important;
        }
        
        /* FIX: Ensure Product Group table cells have right borders to prevent missing lines */
        .product-group-table th,
        .product-group-table td {
            border-right: 1px solid #ddd !important;
        }
        
        /* Headers are center aligned */
        .product-group-table th {
            text-align: center;
        }
        
        /* First column data cells left alignment */
        .product-group-table td:first-child {
            text-align: left;
            padding-left: 12px;
        }
        
        /* Product group rows with darker colors */
        .product-header-row td:first-child {
            background-color: #1565c0;
            color: white;
            font-weight: bold;
        }

        /* Double font size ONLY for cells with class "table-main-label" (Product Groups, Customers, etc.) */
        .table-main-label {
            font-size: 28px !important;
        }
        
        /* Product Groups Names header font size */
        .product-group-table th.empty-header {
            font-size: 28px !important;
        }
        
        /* Category header rows */
        .category-header-row td:first-child {
            background-color: #37474f;
            color: white;
            font-weight: bold;
        }
        
        /* Total row */
        .total-header-row td:first-child {
            background-color: #e65100;
            color: white;
            font-weight: bold;
        }
        
        /* Preserve Original Inline Styles - Don't Override Background Colors */
        .product-group-table th[style*="background-color"],
        .product-group-table td[style*="background-color"] {
            /* Let inline styles take precedence for background colors */
        }
        
        /* Remove top borders from all colored header cells */
        .product-group-table thead tr th[style*="background-color"] {
            border-top: none;
        }
        
        /* Remove ALL borders from first 3 header rows and eliminate spaces */
        .product-group-table thead tr:nth-child(1) th,
        .product-group-table thead tr:nth-child(2) th,
        .product-group-table thead tr:nth-child(3) th {
            border: none;
            margin: 0;
            padding: 8px 12px;
            line-height: 1;
        }
        
        /* Ensure no spacing between header rows */
        .product-group-table thead tr:nth-child(1),
        .product-group-table thead tr:nth-child(2),
        .product-group-table thead tr:nth-child(3) {
            margin: 0;
            padding: 0;
            border-spacing: 0;
        }

        /* Sales by Customer Table - EXACT same approach as Product Group */
        
        /* Table Container */
        .sales-customer-table-container {
            width: 100%;
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 0 auto;
        }
        
        /* Hide the first row (star row) in Sales by Customer table */
        .sales-customer-table-container thead tr:first-child {
            display: none !important;
        }
        
        /* Freeze header rows - OPTIMIZED for no dead space (after hiding star row) */
        .sales-customer-table-container thead tr:nth-child(2) th {
            top: 0px;
            z-index: 13;
        }
        
        .sales-customer-table-container thead tr:nth-child(3) th {
            top: 24px;
            z-index: 12;
        }
        
        .sales-customer-table-container thead tr:nth-child(4) th {
            top: 48px;
            z-index: 11;
        }
        
        .sales-customer-table-container thead tr:nth-child(5) th {
            top: 72px;
            z-index: 10;
        }
        
        /* First column in frozen headers - white/no border (after hiding star row) */
        .sales-customer-table-container thead tr:nth-child(2) th:first-child,
        .sales-customer-table-container thead tr:nth-child(3) th:first-child,
        .sales-customer-table-container thead tr:nth-child(4) th:first-child,
        .sales-customer-table-container thead tr:nth-child(5) th:first-child {
            background-color: white;
            border: none;
            white-space: normal !important; /* Allow line breaks */
        }
        
        /* Table Title Container */
        .sales-customer-table-title-container {
            padding: 20px 20px 10px 20px;
            text-align: center;
        }
        
        /* Table Styles */
        .sales-by-customer-table {
            width: 100%;
            min-width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            font-size: 12px;
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            table-layout: fixed;
        }

        .sales-by-customer-table th, 
        .sales-by-customer-table td {
            padding: 6px;
            text-align: center;
            border: 1px solid #ddd;
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Note: colgroup widths are set individually below for better control */
        
        /* Sales by Customer Table - table layout for colgroup widths */
        .sales-by-customer-table {
            table-layout: fixed !important;
            width: 100% !important;
        }
        
        /* Customer column - 16.2% (reduced by 10%) */
        .sales-by-customer-table colgroup:first-child col:first-child {
            width: 16.2% !important;
        }
        
        /* Sales Rep column - 10.12% (increased by 15%) */
        .sales-by-customer-table colgroup:first-child col:nth-child(2) {
            width: 10.12% !important;
        }
        
        /* Note: Period and delta widths are controlled by inline styles from the captured table */
        
        /* Sales Rep table specific - equal widths for all periods */
        /* Don't override widths - let the inline styles from the captured table work */
        .sales-rep-table-container .financial-table {
            table-layout: fixed !important;
            width: 100% !important;
        }
        
        /* Header row heights and freeze - REDUCED for more screen space */
        .sales-by-customer-table thead tr th {
            height: 24px;
            line-height: 1.1;
            vertical-align: middle;
            font-weight: bold;
            position: sticky;
            z-index: 10;
            white-space: nowrap !important;
            padding: 3px 6px;
            font-size: 11px;
        }
        
        /* Freeze header rows - OPTIMIZED for no dead space (after hiding star row) */
        .sales-by-customer-table thead tr:nth-child(2) th {
            top: 0px;
            z-index: 13;
        }
        
        .sales-by-customer-table thead tr:nth-child(3) th {
            top: 24px;
            z-index: 12;
        }
        
        .sales-by-customer-table thead tr:nth-child(4) th {
            top: 48px;
            z-index: 11;
        }
        
        .sales-by-customer-table thead tr:nth-child(5) th {
            top: 72px;
            z-index: 10;
        }
        
        /* First column in frozen headers - white/no border (after hiding star row) */
        .sales-by-customer-table thead tr:nth-child(2) th:first-child,
        .sales-by-customer-table thead tr:nth-child(3) th:first-child,
        .sales-by-customer-table thead tr:nth-child(4) th:first-child,
        .sales-by-customer-table thead tr:nth-child(5) th:first-child {
            background-color: white;
            border: none;
            white-space: normal !important; /* Allow line breaks */
        }
        
        /* Ensure borders on colored headers */
        .sales-by-customer-table thead th[style*="background-color"] {
            border-right: 1px solid #ddd !important;
            border-bottom: 1px solid #ddd !important;
        }
        
        /* Ensure table cells have borders */
        .sales-by-customer-table th,
        .sales-by-customer-table td {
            border-right: 1px solid #ddd !important;
        }
        
        /* Star cells - no borders */
        .sales-by-customer-table th.star-cell {
            border: none !important;
            background-color: #ffffff !important;
        }
        
        /* Hide the first row (star row) in Sales by Customer table */
        .sales-by-customer-table thead tr:first-child {
            display: none !important;
        }
        
        /* Empty header - main row header (Customer/Country) */
        .sales-by-customer-table th.empty-header {
            background-color: #ffffff;
            color: #000000;
            border: none;
            height: 24px !important;
            line-height: 24px !important;
            padding: 3px 6px !important;
            vertical-align: middle !important;
            font-size: 22px !important;
            white-space: normal !important; /* Allow line breaks */
        }
        
        /* Row labels - left aligned */
        .sales-by-customer-table td.row-label {
            text-align: left;
        }
        
        /* Customer name cells */
        .sales-by-customer-table .customer-name-cell {
            text-align: left;
            background-color: #ffffff;
            font-weight: 600;
        }
        
        /* Sales Rep cells */
        .sales-by-customer-table .sales-rep-cell {
            text-align: left;
            text-transform: capitalize;
            background-color: #ffffff;
        }
        
        /* Sales Rep header */
        .sales-by-customer-table .sales-rep-header {
            border-top: none;
            border-left: none;
            white-space: normal !important; /* Allow line breaks */
            font-size: 22px !important;
        }
        
        /* Summary rows */
        .sales-by-customer-table .summary-label {
            font-weight: 700;
            text-align: left;
        }
        
        .sales-by-customer-table .summary-cell {
            font-weight: 700;
        }
        
        /* Summary row colors */
        .sales-by-customer-table .total-top20-label {
            background-color: #2196F3 !important;
            color: white !important;
        }
        
        .sales-by-customer-table .total-other-label {
            background-color: #1565C0 !important;
            color: white !important;
        }
        
        .sales-by-customer-table .total-sales-label {
            background-color: #0D47A1 !important;
            color: white !important;
        }
        
        .sales-by-customer-table .number-all-label {
            background-color: #1976D2 !important;
            color: white !important;
        }
        
        /* Thick border separator */
        .sales-by-customer-table .thick-border-bottom {
            border-bottom: 4px solid #333 !important;
        }

        /* Sales by Country Table - EXACT same approach as Sales by Customer */

        /* Set font size for "Country Names" header text */
        .sales-by-country-table th.empty-header {
            font-size: 22px !important;
        }

        /* Table Container */
        .sales-country-table-container {
            width: 100%;
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 0 auto;
        }
        
        /* Table Title Container */
        .sales-country-table-title-container {
            padding: 20px 20px 10px 20px;
            text-align: center;
        }
        
        /* Table Styles */
        .sales-by-country-table {
            width: 100%;
            min-width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            font-size: 12px;
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            table-layout: fixed;
        }

        .sales-by-country-table th, 
        .sales-by-country-table td {
            padding: 6px;
            text-align: center;
            border: 1px solid #ddd;
            font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Override colgroup widths for better proportions */
        .sales-by-country-table colgroup col {
            width: auto !important;
        }
        
        /* Country column - 20% */
        .sales-by-country-table colgroup:first-child col:first-child {
            width: 20% !important;
        }
        
        /* For data columns in each period colgroup */
        /* Values column */
        .sales-by-country-table colgroup:not(:first-child) col:first-child {
            width: 7% !important;
        }
        
        /* Percent column */
        .sales-by-country-table colgroup:not(:first-child) col:nth-child(2) {
            width: 4% !important;
        }
        
        /* Delta columns (single col in colgroup) */
        .sales-by-country-table colgroup:not(:first-child) col:only-child {
            width: 5.5% !important;
        }
        
        /* Header row heights and freeze - REDUCED for more screen space */
        .sales-by-country-table thead tr th {
            height: 24px;
            line-height: 1.1;
            vertical-align: middle;
            font-weight: bold;
            position: sticky;
            z-index: 10;
            white-space: nowrap !important;
            padding: 3px 6px;
            font-size: 11px;
        }
        
        /* Freeze header rows - OPTIMIZED for no dead space (after hiding star row) */
        .sales-by-country-table thead tr:nth-child(2) th {
            top: 0px;
            z-index: 13;
        }
        
        .sales-by-country-table thead tr:nth-child(3) th {
            top: 24px;
            z-index: 12;
        }
        
        .sales-by-country-table thead tr:nth-child(4) th {
            top: 48px;
            z-index: 11;
        }
        
        .sales-by-country-table thead tr:nth-child(5) th {
            top: 72px;
            z-index: 10;
        }
        
        /* First column in frozen headers - white/no border (after hiding star row) */
        .sales-by-country-table thead tr:nth-child(2) th:first-child,
        .sales-by-country-table thead tr:nth-child(3) th:first-child,
        .sales-by-country-table thead tr:nth-child(4) th:first-child,
        .sales-by-country-table thead tr:nth-child(5) th:first-child {
            background-color: white;
            border: none;
        }
        
        /* Ensure borders on colored headers */
        .sales-by-country-table thead th[style*="background-color"] {
            border-right: 1px solid #ddd !important;
            border-bottom: 1px solid #ddd !important;
        }
        
        /* Ensure table cells have borders */
        .sales-by-country-table th,
        .sales-by-country-table td {
            border-right: 1px solid #ddd !important;
        }
        
        /* Star cells - no borders */
        .sales-by-country-table th.star-cell {
            border: none !important;
            background-color: #ffffff !important;
        }
        
        /* Hide the first row (star row) in Sales by Country table */
        .sales-by-country-table thead tr:first-child {
            display: none !important;
        }
        
        /* Empty header - main row header (Country) */
        .sales-by-country-table th.empty-header {
            background-color: #ffffff;
            color: #000000;
            border: none;
            height: 24px !important;
            line-height: 24px !important;
            padding: 3px 6px !important;
            vertical-align: middle !important;
        }
        
        /* Row labels - left aligned */
        .sales-by-country-table td.row-label {
            text-align: left;
        }
        
        /* Country name cells */
        .sales-by-country-table .country-name-cell {
            text-align: left;
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        /* All country names should be bold and normal font size */
        .sales-by-country-table tbody td:first-child {
            font-weight: bold !important;
            font-size: 12px !important;
        }
        
        /* Summary rows */
        .sales-by-country-table .summary-label {
            font-weight: 700;
            text-align: left;
        }
        
        .sales-by-country-table .summary-cell {
            font-weight: 700;
        }
        
        /* Total row - light blue background and bold */
        .sales-by-country-table .total-label,
        .sales-by-country-table .total-cell {
            background-color: #B3D9FF !important;
            font-weight: 700 !important;
        }
        
        .sales-by-country-table tr.total-row td {
            background-color: #B3D9FF !important;
            font-weight: 700 !important;
        }
        
        /* Thick border separator */
        .sales-by-country-table .thick-border-bottom {
            border-bottom: 4px solid #333 !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <div class="logo-container">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="logo">` : ''}
            </div>
            <h1 class="division-title">${divisionName} - Comprehensive Report</h1>
            <div class="period-info">${periodDisplayText}</div>
        </div>
    </div>
    
    <div class="container">
        <!-- Divisional KPIs Card Row -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 25px; margin-bottom: 30px; justify-items: center;">
            <div class="chart-card" onclick="showChart('divisional-kpis')" style="max-width: 400px; width: 100%;">
                <span class="card-icon">📈</span>
                <div class="card-title">Divisional KPIs</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Key performance indicators and metrics overview
                </div>
            </div>
        </div>
        
        <div class="charts-grid">
            <!-- Sales & Volume Analysis Card -->
            <div class="chart-card" onclick="showChart('sales-volume')">
                <span class="card-icon">📊</span>
                <div class="card-title">Sales & Volume Analysis</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Visual analysis of sales revenue and volume trends across different time periods
                </div>
            </div>
            
            <!-- Margin Analysis Card -->
            <div class="chart-card" onclick="showChart('margin-analysis')">
                <span class="card-icon">📋</span>
                <div class="card-title">Margin Analysis</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Detailed breakdown of profit margins over material costs with trend analysis
                </div>
            </div>
            
            <!-- Manufacturing Cost Card -->
            <div class="chart-card" onclick="showChart('manufacturing-cost')">
                <span class="card-icon">🏭</span>
                <div class="card-title">Manufacturing Cost</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Analysis of direct manufacturing costs including materials, labor, and production expenses
                </div>
            </div>
            
            <!-- Below GP Expenses Card -->
            <div class="chart-card" onclick="showChart('below-gp-expenses')">
                <span class="card-icon">📊</span>
                <div class="card-title">Below GP Expenses</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Operating expenses below gross profit including administrative and selling costs
                </div>
            </div>
            
            <!-- Combined Trends Card -->
            <div class="chart-card" onclick="showChart('combined-trends')">
                <span class="card-icon">📈</span>
                <div class="card-title">Cost & Profitability Trend</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Historical trends showing cost evolution and profitability patterns over time
                </div>
            </div>
        </div>
        
        <!-- P&L Financial, Product Group, Sales by Sales Rep, Sales by Customer, and Sales by Country Card Row -->
        <div class="charts-grid" style="margin-top: 30px; margin-bottom: 60px;">
            <div class="chart-card" onclick="showChart('pl-financial')">
                <span class="card-icon">💰</span>
                <div class="card-title">Profit and Loss Statement</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Complete Profit & Loss statement with detailed financial performance breakdown
                </div>
            </div>
            <div class="chart-card" onclick="showChart('product-group')">
                <span class="card-icon">📊</span>
                <div class="card-title">Product Groups</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Performance analysis by product categories including sales, margins, and growth metrics
                </div>
            </div>
            <div class="chart-card" onclick="showChart('sales-rep')">
                <span class="card-icon">🧑‍💼</span>
                <div class="card-title">Sales by Sales Reps</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Sales representative performance analysis and individual contribution breakdown
                </div>
            </div>
            <div class="chart-card" onclick="showChart('sales-customer')">
                <span class="card-icon">👥</span>
                <div class="card-title">Sales by Customers</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Top customer analysis showing sales performance and contribution by key accounts
                </div>
            </div>
            <div class="chart-card" onclick="showChart('sales-country')">
                <span class="card-icon">🌍</span>
                <div class="card-title">Sales by Countries</div>
                <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 8px; line-height: 1.4;">
                    Geographic distribution of sales performance across different countries and regions
                </div>
            </div>
        </div>
    </div>
    
    <!-- Full-screen chart views with EXACT same charts as main Charts page -->
    <!-- Divisional KPIs Chart -->
    <div class="full-screen-chart" id="full-screen-divisional-kpis">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Divisional KPIs</h1>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
        <div class="full-screen-content" id="full-divisional-kpis-chart">
            <!-- KPIs will be rendered here -->
        </div>
    </div>
    
    <!-- Profit and Loss Statement Chart -->
    <div class="full-screen-chart" id="full-screen-pl-financial">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Profit and Loss Statement</h1>
            <div class="currency-badge">${getUAEDirhamSymbolHTML()}</div>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
        <div class="full-screen-content" id="full-pl-financial-chart">
            <!-- P&L table will be rendered here -->
        </div>
    </div>
    
        <!-- Product Groups Chart -->
        <div class="full-screen-chart" id="full-screen-product-group">
            <div class="full-screen-header">
                <h1 class="full-screen-title">Product Groups</h1>
                <div class="currency-badge">${getUAEDirhamSymbolHTML()}</div>
                <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
            </div>
            <div class="full-screen-content" id="full-product-group-chart">
                <!-- Product Groups table will be rendered here -->
            </div>
        </div>

        <!-- Sales by Customers Chart -->
        <div class="full-screen-chart" id="full-screen-sales-customer">
            <div class="full-screen-header">
                <h1 class="full-screen-title" id="sales-customer-header-title">Sales by Customers</h1>
                <div class="currency-badge">${getUAEDirhamSymbolHTML()}</div>
                <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
            </div>
            <div class="full-screen-content" id="full-sales-customer-chart">
                <!-- Sales by Customers table will be rendered here -->
            </div>
        </div>

        <!-- Sales by Sales Reps Chart -->
        <div class="full-screen-chart" id="full-screen-sales-rep">
            <div class="full-screen-header">
                <h1 class="full-screen-title" id="sales-rep-header-title">Sales by Sales Reps Names</h1>
                <div class="currency-badge">${getUAEDirhamSymbolHTML()}</div>
                <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
            </div>
            <div class="full-screen-content" id="full-sales-rep-chart">
                <!-- Sales by Sales Reps table will be rendered here -->
            </div>
        </div>

    <!-- Sales by Countries Chart -->
        <div class="full-screen-chart" id="full-screen-sales-country">
            <div class="full-screen-header">
                <h1 class="full-screen-title" id="sales-country-header-title">Sales by Countries</h1>
                <div class="currency-badge">${getUAEDirhamSymbolHTML()}</div>
                <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
            </div>
            <div class="full-screen-content" id="full-sales-country-chart">
                <!-- Sales by Countries table will be rendered here -->
            </div>
        </div>
    
    <!-- Sales & Volume Analysis Chart -->
    <div class="full-screen-chart" id="full-screen-sales-volume">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Sales and Volume</h1>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
         <div class="full-screen-content">
             <div class="modern-margin-gauge-panel">
                 <div class="full-screen-chart-container" id="full-sales-volume-chart"></div>
                <!-- EXACT same additional data as BarChartHTMLExport.js -->
                <div class="additional-data">
                    <div class="data-row">
                        <div class="data-label purple">Sales Volume (MT)</div>
                        <div class="data-values">
                            ${visiblePeriods.map((period, idx) => {
                                const periodKey = createPeriodKey(period);
                                const value = sanitizeNumeric(chartData[periodKey]?.salesVolume || 0);
                                const mtValue = Math.round(value / 1000);
                                return `<div class="data-value purple">${mtValue.toLocaleString()}</div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div class="data-row">
                        <div class="data-label green">Sales ${getUAEDirhamSymbolHTML()} per Kg</div>
                        <div class="data-values">
                            ${visiblePeriods.map((period, idx) => {
                                const periodKey = createPeriodKey(period);
                                const salesValue = sanitizeNumeric(chartData[periodKey]?.sales || 0);
                                const salesVolumeValue = sanitizeNumeric(chartData[periodKey]?.salesVolume || 0);
                                const salesPerKg = salesVolumeValue > 0 ? (salesValue / salesVolumeValue).toFixed(2) : '0.00';
                                return `<div class="data-value green">${salesPerKg}</div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="full-screen-chart" id="full-screen-margin-analysis">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Margin Analysis</h1>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
        <div class="full-screen-content">
            <div class="modern-margin-gauge-panel">
                <div class="full-screen-chart-container" id="full-margin-analysis-chart"></div>
            </div>
        </div>
    </div>
    
     <div class="full-screen-chart" id="full-screen-manufacturing-cost">
         <div class="full-screen-header">
             <h1 class="full-screen-title">Manufacturing Cost</h1>
             <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
         </div>
         <div class="full-screen-content">
             <div class="modern-margin-gauge-panel">
                 <div class="full-screen-chart-container" id="full-manufacturing-cost-chart"></div>
                 <div id="manufacturing-cost-totals"></div>
             </div>
         </div>
     </div>
    
    <div class="full-screen-chart" id="full-screen-below-gp-expenses">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Below GP Expenses</h1>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
        <div class="full-screen-content">
            <div class="modern-margin-gauge-panel">
                <div class="full-screen-chart-container" id="full-below-gp-expenses-chart"></div>
                <div id="below-gp-expenses-totals"></div>
            </div>
        </div>
    </div>
    
    <div class="full-screen-chart" id="full-screen-combined-trends">
        <div class="full-screen-header">
            <h1 class="full-screen-title">Combined Trends</h1>
            <button class="back-to-cards-btn" onclick="hideAllCharts()">← Back to Dashboard</button>
        </div>
        <div class="full-screen-content">
                <div class="full-screen-chart-container" id="full-expenses-chart"></div>
        </div>
    </div>

     <script>
         // Global variables - EXACT same as BarChart
         var periodLabels = ${JSON.stringify(periodLabels)};
         var seriesData = ${JSON.stringify(seriesData)};
         var salesVolumeData = ${JSON.stringify(salesVolumeData)};
         var percentVariance = ${JSON.stringify(percentVariance)};
         var barColors = ${JSON.stringify(barColors)};
         var basePeriodKey = '${basePeriodKey}';
        var visiblePeriods = ${JSON.stringify(visiblePeriods)};
        var chartData = ${JSON.stringify(chartData)};
        var capturedActualData = ${JSON.stringify(capturedActualData)};
        var kpiSummaryHTML = ${JSON.stringify(kpiSummaryHTML)};
        var plFinancialTableHTML = ${JSON.stringify(plFinancialTableHTML)};
        
        // Helper function to get division display name
        function getDivisionDisplayName() {
            const divisionNames = {
                'FP-Product Group': 'Flexible Packaging',
                'SB-Product Group': 'Shopping Bags',
                'TF-Product Group': 'Thermoforming Products',
                'HCM-Product Group': 'Harwal Container Manufacturing'
            };
            // Try to get from the page title or use a default
            const title = document.title || '';
            if (title.includes('Flexible Packaging')) return 'Flexible Packaging';
            if (title.includes('Shopping Bags')) return 'Shopping Bags';
            if (title.includes('Thermoforming')) return 'Thermoforming Products';
            if (title.includes('Harwal')) return 'Harwal Container Manufacturing';
            return 'Division';
        }
        var charts = {};

         // Helper functions
         function getUAEDirhamSymbolHTML() {
             return '<svg class="uae-dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="display: inline-block; vertical-align: -0.1em; width: 1em; height: 1em; margin-right: 0.2em;"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>';
         }
         // Convert UAE SVG to data URL for rich text image in ECharts labels
         function getUAESymbolImageDataURL(color) {
             color = color || '#222';
             var svg = getUAEDirhamSymbolHTML().replace('currentColor', color);
             return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
         }
         
         function createPeriodKey(period) {
             if (period.isCustomRange) {
                 return period.year + '-' + period.month + '-' + period.type;
             } else {
                 return period.year + '-' + (period.month || 'Year') + '-' + period.type;
             }
         }

         function sanitizeNumeric(value) {
             if (typeof value === 'number') return value;
             if (typeof value === 'string') {
                 return parseFloat(value.replace(/[, \u00EA]/g, '')) || 0;
             }
             return 0;
         }

        // Compute cell value function - EXACT same as original, but using ACTUAL captured data
        function computeCellValue(rowIndex, column) {
            // Create period key to match chartData structure
            var periodKey;
            if (column.isCustomRange) {
                periodKey = column.year + '-' + column.month + '-' + column.type;
            } else {
                periodKey = column.year + '-' + (column.month || 'Year') + '-' + column.type;
            }
            
            var periodData = chartData[periodKey];
            var actualData = capturedActualData[periodKey];
            if (!periodData || !actualData) return 0;
            
            // Return data based on row index - EXACT same figures as original charts
            switch(rowIndex) {
                case 3: return periodData.sales || 0;
                case 5: return periodData.materialCost || 0;
                case 7: return periodData.salesVolume || 0;
                case 8: return periodData.productionVolume || 0;
                // Manufacturing Cost - EXACT same figures as original charts
                case 9: return actualData.labour || 0; // Labour - actual figure from original chart
                case 10: return actualData.depreciation || 0; // Depreciation - actual figure from original chart
                case 12: return actualData.electricity || 0; // Electricity - actual figure from original chart
                case 13: return actualData.othersMfgOverheads || 0; // Others Mfg. Overheads - actual figure from original chart
                case 14: return actualData.totalDirectCost || 0; // Total Direct Cost - actual figure from original chart
                // Below GP Expenses - EXACT same figures as original charts
                case 31: return actualData.sellingExpenses || 0; // Selling expenses - actual figure from original chart
                case 32: return actualData.transportation || 0; // Transportation - actual figure from original chart
                case 40: return actualData.administration || 0; // Administration - actual figure from original chart
                case 42: return actualData.bankInterest || 0; // Bank interest - actual figure from original chart
                case 52: return actualData.totalBelowGPExpenses || 0; // Total Below GP Expenses - actual figure from original chart
                // Combined Trends - EXACT same figures as original charts
                case 54: return actualData.netProfit || 0; // Net Profit - actual figure from original chart
                case 56: return actualData.ebitda || 0; // EBITDA - actual figure from original chart
                default: return 0;
            }
        }

        // Show chart function - full screen mode
        function showChart(chartType) {
            console.log('Showing chart in full screen:', chartType);
            
            // Hide the card grid
            var chartsGrid = document.querySelector('.charts-grid');
            if (chartsGrid) {
                chartsGrid.classList.add('hidden');
            }
            
            // Hide all full-screen charts
            var allFullScreenCharts = document.querySelectorAll('.full-screen-chart');
            allFullScreenCharts.forEach(function(chart) {
                chart.classList.remove('active');
            });
            
            // Show the selected full-screen chart
            var selectedFullScreenChart = document.getElementById('full-screen-' + chartType);
            console.log('Looking for chart element: full-screen-' + chartType);
            console.log('Found element:', selectedFullScreenChart);
            if (selectedFullScreenChart) {
                selectedFullScreenChart.classList.add('active');
                console.log('Showing full screen chart:', chartType);
                
                // Initialize chart if not already done
                if (!charts[chartType]) {
                    console.log('Initializing full screen chart:', chartType);
                    if (chartType === 'combined-trends') {
                        // Special handling for combined trends
                        console.log('Special handling for combined-trends');
                        setTimeout(function() {
                            console.log('*** TIMEOUT: Initializing Combined Trends ***');
                            initializeCombinedTrends();
                            console.log('*** TIMEOUT: After initializeCombinedTrends ***');
                        }, 1000);
                    } else {
                    initializeFullScreenChart(chartType);
                    }
                } else {
                    console.log('Chart already initialized:', chartType);
                }
            } else {
                console.error('Full screen chart not found:', chartType);
            }
        }

        // Show specific chart function
        function showChart(chartType) {
            console.log('Showing chart:', chartType);
            
            // Hide the card grid
            var chartsGrid = document.querySelector('.charts-grid');
            if (chartsGrid) {
                chartsGrid.classList.add('hidden');
            }
            
            // Hide all full-screen charts first
            var allFullScreenCharts = document.querySelectorAll('.full-screen-chart');
            allFullScreenCharts.forEach(function(chart) {
                chart.classList.remove('active');
            });
            
            // Show the specific chart
            var targetChart = document.getElementById('full-screen-' + chartType);
            if (targetChart) {
                targetChart.classList.add('active');
                console.log('Chart displayed:', chartType);
                
                // Initialize the chart based on type with a small delay to ensure visibility
        setTimeout(function() {
            if (chartType === 'divisional-kpis') {
                renderDivisionalKPIs();
            } else if (chartType === 'pl-financial') {
                renderPLFinancial();
            } else if (chartType === 'product-group') {
                renderProductGroup();
            } else if (chartType === 'sales-rep') {
                renderSalesRep();
            } else if (chartType === 'sales-customer') {
                renderSalesCustomer();
            } else if (chartType === 'sales-country') {
                renderSalesCountry();
            } else if (chartType === 'combined-trends') {
                // Combined trends uses HTML cards, not ECharts - initialize the content
                initializeCombinedTrends();
            } else {
                // For all other charts, use the existing initialization
                initializeFullScreenChart(chartType);
            }
        }, 100); // Small delay to ensure chart is visible
            } else {
                console.error('Chart not found:', 'full-screen-' + chartType);
            }
        }

        // Hide all charts function - return to card grid
        function hideAllCharts() {
            console.log('Returning to card grid');
            
            // Hide all full-screen charts
            var allFullScreenCharts = document.querySelectorAll('.full-screen-chart');
            allFullScreenCharts.forEach(function(chart) {
                chart.classList.remove('active');
            });
            
            // Show the card grid
            var chartsGrid = document.querySelector('.charts-grid');
            if (chartsGrid) {
                chartsGrid.classList.remove('hidden');
            }
        }

         // Initialize full-screen chart with EXACT same logic as original charts
         function initializeFullScreenChart(chartType) {
             var chartDom = document.getElementById('full-' + chartType + '-chart');
             if (!chartDom) {
                 console.log('Chart DOM not found for:', 'full-' + chartType + '-chart');
                 return;
             }
             
             // Wait for UAESymbol font to load before rendering chart
             setTimeout(function() {
                 var myChart = echarts.init(chartDom, null, { renderer: 'canvas' });
                 
                 var option;
                 
                switch(chartType) {
                    case 'sales-volume':
                        option = getSalesVolumeOption(); // EXACT same as BarChart
                        break;
                     case 'margin-analysis':
                         // Use SVG gauges instead of ECharts
                         renderMarginAnalysisGauges();
                         return;
                 case 'manufacturing-cost':
                     option = getManufacturingCostOption(); // EXACT same as ManufacturingCostChart
                     renderManufacturingCostTotals(); // Render totals summary
                     break;
                     case 'below-gp-expenses':
                         option = getBelowGPExpensesOption(); // EXACT same as BelowGPExpensesChart
                         renderBelowGPExpensesTotals(); // Render totals summary
                         break;
                     case 'combined-trends':
                         console.log('*** CASE COMBINED TRENDS REACHED ***');
                         // Wait for DOM and font to load like other charts
                         setTimeout(function() {
                             console.log('*** TIMEOUT: Initializing Combined Trends ***');
                         initializeCombinedTrends(); // EXACT same as ExpencesChart + Profitchart
                             console.log('*** TIMEOUT: After initializeCombinedTrends ***');
                         }, 1000); // Same delay as other charts
                         return;
                     default:
                         return;
                 }
                 
                 myChart.setOption(option);
                 charts[chartType] = myChart;
                 
                 // Handle resize
                 window.addEventListener('resize', function() {
                     if (charts[chartType] && !charts[chartType].isDisposed()) {
                         charts[chartType].resize();
                     }
                 });
             }, 1000); // Wait 1 second for font to load
         }

        // EXACT same chart options as original BarChart.js
        function getSalesVolumeOption() {
            return {
                legend: {
                    show: false
                },
                 grid: {
                     left: '0%',
                     right: '0%',
                     bottom: 60,
                     top: 15,
                     containLabel: true
                 },
                xAxis: {
                    type: 'category',
                    data: periodLabels,
                    position: 'bottom',
                    axisLabel: {
                        rotate: 0,
                        fontWeight: 'bold',
                        fontSize: 18,
                        color: '#000',
                        formatter: function(value) {
                            const parts = value.split('-');
                            if (parts.length >= 3) {
                                const year = parts[0];
                                if (parts.length > 3) {
                                    const displayName = parts.slice(1, -1).join('-');
                                    const type = parts[parts.length - 1];
                                    return year + '\\n' + displayName + '\\n' + type;
                                } else {
                                    const month = parts[1];
                                    const type = parts[2];
                                    if (month === 'Year') {
                                        return year + '\\n\\n' + type;
                                    } else {
                                        return year + '\\n' + month + '\\n' + type;
                                    }
                                }
                            }
                            return value;
                        },
                        margin: 30
                    },
                    axisLine: {
                        lineStyle: {
                            color: '#000',
                            width: 2
                        }
                    },
                    axisTick: {
                        alignWithLabel: true,
                        length: 4,
                        lineStyle: {
                            color: '#ccc'
                        }
                    }
                },
                yAxis: [{
                    type: 'value',
                    show: false,
                    scale: true,
                    max: function(value) {
                        return value.max * 1.15;
                    }
                }],
                series: [{
                    name: '',
                    data: seriesData,
                    type: 'bar',
                    barMaxWidth: '80%',
                    barWidth: '80%',
                    barCategoryGap: '0%',
                    itemStyle: {
                        color: function(params) {
                            return barColors[params.dataIndex];
                        }
                    },
                     label: {
                         show: true,
                         position: 'top',
                         fontWeight: 'bold',
                         fontSize: 18,
                         color: '#222',
                         rich: {
                             uae: {
                                 width: 16,
                                 height: 16,
                                 lineHeight: 18,
                                 padding: [-2, 4, 0, 0],
                                 align: 'center',
                                 verticalAlign: 'top',
                                 backgroundColor: {
                                     image: getUAESymbolImageDataURL('#222')
                                 }
                             },
                             num: {
                                 fontSize: 18,
                                 fontWeight: 'bold',
                                 color: '#222',
                                 verticalAlign: 'middle',
                                 lineHeight: 18
                             }
                         },
                         formatter: function(params) {
                             const value = params.value;
                             const text = value >= 1000000
                                 ? (value / 1000000).toFixed(1) + 'M'
                                 : value >= 1000
                                     ? (value / 1000).toFixed(1) + 'K'
                                     : String(value);
                             return '{uae|}{num|' + text + '}';
                         }
                     },
                    emphasis: {
                        focus: 'series'
                    },
                    z: 2
                }, {
                    name: 'Percent Difference',
                    type: 'custom',
                    renderItem: function(params, api) {
                        const idx = api.value(0);
                        const value = api.value(1);
                        const pct = percentVariance[idx];
                        if (pct === null || pct === undefined) return null;
                        let color = '#888';
                        if (pct > 0) color = '#2E865F';
                        else if (pct < 0) color = '#dc3545';
                        const x = api.coord([idx, value])[0];
                        const y = api.coord([idx, value])[1];
                        return {
                            type: 'text',
                            style: {
                                text: (pct > 0 ? '+' : '') + pct.toFixed(1) + '%',
                                fill: color,
                                font: 'bold 16px sans-serif',
                                textAlign: 'center',
                                textVerticalAlign: 'bottom'
                            },
                            position: [x, y - 36]
                        };
                    },
                    data: periodLabels.map((_, idx) => [idx, seriesData[idx]]),
                    z: 3
                }],
                tooltip: {
                    show: false,
                    trigger: 'none'
                },
                animation: false
            };
        }

        // EXACT same SVG gauges as original ModernMarginGauge.js - NO ECHARTS
        function getMarginAnalysisOption() {
            // This function is not used for SVG gauges
            return null;
        }
        
        // EXACT TWIN of ModernMarginGauge.js - COMPLETE COPY
        function renderMarginAnalysisGauges() {
            var chartContainer = document.getElementById('full-margin-analysis-chart');
            if (!chartContainer) return;
            
            // EXACT same color schemes as ModernMarginGauge.js
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            // EXACT same data processing as ModernMarginGauge.js
            var gaugeData = visiblePeriods.map(function(period, index) {
                // EXACT same key generation
                var periodKey;
                if (period.isCustomRange) {
                    periodKey = period.year + '-' + period.month + '-' + period.type;
                } else {
                    periodKey = period.year + '-' + (period.month || 'Year') + '-' + period.type;
                }
                
                var chartDataForPeriod = chartData[periodKey] || {};
                
                // Get raw data values
                var sales = chartDataForPeriod.sales || 0;
                var materialCost = chartDataForPeriod.materialCost || 0;
                var salesVolume = chartDataForPeriod.salesVolume || 0;
                
                // Calculate absolute margin (Sales - Material Cost)
                var absoluteMargin = sales - materialCost;
                
                // Calculate margin per kg
                var marginPerKg = salesVolume > 0 ? absoluteMargin / salesVolume : 0;
                
                // Calculate margin as percentage of sales for gauge needle
                var marginPercent = sales > 0 ? (absoluteMargin / sales) * 100 : 0;
                
                // Format absolute value for display (in millions)
                var absoluteValue = (absoluteMargin / 1000000).toFixed(1) + 'M';
                
                // Format per kg value for display (xx.xx format)
                var perKgValue = marginPerKg.toFixed(2);
                
                // EXACT same color logic as ModernMarginGauge.js
                var color;
                if (period.customColor) {
                    var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                    if (scheme) {
                        color = scheme.primary;
                    }
                } else {
                    // EXACT same color assignment logic
                    if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                        color = '#FF6B35'; // Orange (light red)
                    } else if (period.month === 'January') {
                        color = '#FFD700'; // Yellow
                    } else if (period.month === 'Year') {
                        color = '#288cfa'; // Blue
                    } else if (period.type === 'Budget') {
                        color = '#2E865F'; // Green
                    } else if (index === 0) {
                        color = '#FFD700'; // Default first period - yellow
                    } else if (index === 1) {
                        color = '#288cfa'; // Default second period - blue
                    } else if (index === 2) {
                        color = '#003366'; // Default third period - dark blue
                    } else {
                        color = defaultColors[index % defaultColors.length]; // Cycle through default colors
                    }
                }
                
                return {
                    index: index,
                    value: Math.max(0, Math.min(100, marginPercent)), // Clamp between 0-100 for gauge
                    absoluteValue: absoluteValue,
                    perKgValue: perKgValue,
                    color: color,
                    period: period,
                    sales: sales,
                    materialCost: materialCost,
                    salesVolume: salesVolume,
                    absRaw: absoluteMargin, // For variance calculations
                    marginPercent: marginPercent, // Store the margin % for relative variance calculation
                    title: period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type,
                    periodKey: periodKey
                };
            });
            
            // EXACT same variance calculation as ModernMarginGauge.js
            var variances = gaugeData.map(function(g, idx) {
                if (idx === 0) return null; // First period has no previous period to compare
                var prevGauge = gaugeData[idx - 1];
                if (prevGauge.marginPercent === 0) return null;
                var variance = ((g.marginPercent - prevGauge.marginPercent) / Math.abs(prevGauge.marginPercent)) * 100;
                return variance;
            });
            
            // Render EXACT same HTML structure as ModernMarginGauge.js with variance indicators
            var gaugesHTML = '<div class="modern-gauge-container" style="display: flex; flex-direction: row; justify-content: center; align-items: flex-end; gap: 15px; width: 100%; margin: 0 auto; padding: 0 20px;">';
            gaugeData.forEach(function(gauge, idx) {
                var needleAngle = -120 + (gauge.value / 100) * 240;
                var progressOffset = 418 - (gauge.value / 100) * 418;
                var angleRad = (Math.PI / 180) * needleAngle;
                var tipX = 100 + 70 * Math.sin(angleRad);
                var tipY = 120 - 70 * Math.cos(angleRad);
                var PERCENT_OFFSET = 45;
                var percentY = tipY - PERCENT_OFFSET;
                
                // Render gauge card
                gaugesHTML += '<div class="modern-gauge-card" style="min-height: 380px;">' +
                    '<div class="gauge-body">' +
                        '<div class="gauge-container">' +
                            '<svg viewBox="0 0 200 140" class="gauge-svg">' +
                                '<path d="M20,120 A80,80 0 0,1 180,120" fill="none" stroke="#e5e7eb" stroke-width="18" stroke-linecap="round" class="gauge-track"></path>' +
                                '<path d="M20,120 A80,80 0 0,1 180,120" fill="none" stroke="' + gauge.color + '" stroke-width="18" stroke-linecap="round" stroke-dasharray="418" stroke-dashoffset="' + progressOffset + '" class="gauge-progress"></path>' +
                                '<g transform="rotate(' + needleAngle + ' 100 120)">' +
                                    '<line x1="100" y1="120" x2="100" y2="50" stroke="#333" stroke-width="4" stroke-linecap="round"></line>' +
                                    '<circle cx="100" cy="120" r="8" fill="#fff" stroke="#333" stroke-width="4"></circle>' +
                                '</g>' +
                                '<text x="' + tipX + '" y="' + percentY + '" text-anchor="middle" font-size="18" font-weight="bold" fill="' + gauge.color + '" style="user-select: none;">' +
                                    gauge.value.toFixed(2) + ' %/Sls' +
                                '</text>' +
                            '</svg>' +
                        '</div>' +
                        '<div class="gauge-absolute" style="font-size: 28px; font-weight: bold; color: ' + gauge.color + '; margin-bottom: 5px;">' +
                            '${getUAEDirhamSymbolHTML()} ' + gauge.absoluteValue +
                        '</div>' +
                        '<div class="gauge-perkg" style="font-size: 16px; font-weight: bold; color: ' + gauge.color + '; margin-bottom: 5px;">' +
                            '${getUAEDirhamSymbolHTML()} ' + gauge.perKgValue + ' per kg' +
                        '</div>' +
                    '</div>' +
                    '<div class="gauge-title" style="background-color: ' + gauge.color + '; color: ' + (gauge.color.toLowerCase() === '#ffd700' ? '#333' : '#fff') + '; border-top: 1px solid ' + gauge.color + '; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; padding: 12px 16px; text-align: center;">' +
                        '<span>' + (function() {
                            var words = gauge.title.split(' ');
                            if (words.length > 1) {
                                var lastWord = words[words.length - 1];
                                var firstPart = words.slice(0, -1).join(' ');
                                return firstPart + '<br />' + lastWord;
                            }
                            return gauge.title;
                        })() + '</span>' +
                    '</div>' +
                '</div>';
                
                // Add variance badge between cards (show variance for the NEXT card)
                if (idx < gaugeData.length - 1) {
                    var variance = variances[idx + 1]; // This shows variance for the next card
                    var badgeColor = '#888';
                    var arrow = '–';
                    if (variance !== null && !isNaN(variance)) {
                        if (variance > 0) { 
                            badgeColor = '#2E865F'; 
                            arrow = '▲'; 
                        } else if (variance < 0) { 
                            badgeColor = '#cf1322'; 
                            arrow = '▼'; 
                        }
                    }
                    
                    gaugesHTML += '<div style="align-self: center; margin: 0 2px; display: flex; flex-direction: column; align-items: center; min-width: 40px; width: 40px; height: 60px; justify-content: center;">';
                    if (variance === null || isNaN(variance)) {
                        gaugesHTML += '<span style="color: #888; font-size: 16px; font-weight: bold; text-align: center;">0%</span>';
                    } else {
                        gaugesHTML += '<span style="font-size: 22px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>' +
                                    '<span style="font-size: 18px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>' +
                                    '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                    }
                    gaugesHTML += '</div>';
                }
            });
            gaugesHTML += '</div>';
            
            chartContainer.innerHTML = gaugesHTML;
        }

         // EXACT same chart options as original ManufacturingCostChart.tsx
         function getManufacturingCostOption() {
             // EXACT same manufacturing ledgers as original
             var MANUFACTURING_LEDGERS = {
                 LABOUR: { label: 'Labour', rowIndex: 9 },
                 DEPRECIATION: { label: 'Depreciation', rowIndex: 10 },
                 ELECTRICITY: { label: 'Electricity', rowIndex: 12 },
                 OTHER_OVERHEADS: { label: 'Others Mfg. Overheads', rowIndex: 13 },
                 TOTAL_DIRECT_COST: { label: 'Total Actual Direct Cost', rowIndex: 14 }
             };
             
             // EXACT same color schemes as original
             var colorSchemes = [
                 { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                 { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                 { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                 { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                 { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
             ];
             var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
             
             // Get all ledger items except the total - EXACT same as original
             var ledgerItems = Object.values(MANUFACTURING_LEDGERS).filter(function(item) {
                 return item !== MANUFACTURING_LEDGERS.TOTAL_DIRECT_COST;
             });
             
             // Limit to 5 periods max - EXACT same as original
             var periodsToUse = visiblePeriods.slice(0, 5);
             
             // EXACT same data processing as original
             var ledgersData = {};
             var periodTotals = {};
             
             // Calculate all period names - EXACT same as original
             var allPeriodNames = periodsToUse.map(function(period) {
                 return period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
             });
             
             // Initialize data structure - EXACT same as original
             ledgerItems.forEach(function(ledger) {
                 ledgersData[ledger.label] = { label: ledger.label, values: {} };
                 allPeriodNames.forEach(function(periodName) {
                     ledgersData[ledger.label].values[periodName] = {
                         amount: 0,
                         percentOfSales: 0,
                         perKg: 0
                     };
                 });
             });
             
             // Initialize all period totals - EXACT same as original
             allPeriodNames.forEach(function(periodName) {
                 periodTotals[periodName] = {
                     amount: 0,
                     percentOfSales: 0,
                     perKg: 0
                 };
             });
             
             // Process each period - EXACT same logic as original
             periodsToUse.forEach(function(period, periodIndex) {
                 var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                 var periodTotal = 0;
                 
                 ledgerItems.forEach(function(ledger) {
                     // Get the base amount using computeCellValue
                     var amount = computeCellValue(ledger.rowIndex, period);
                     var salesValue = computeCellValue(3, period);
                     var salesVolumeValue = computeCellValue(7, period);
                     
                     // Calculate percent of sales - EXACT same as original
                     var percentOfSales = 0;
                     if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                         percentOfSales = (amount / salesValue) * 100;
                     }
                     
                     // Calculate per kg value - EXACT same as original
                     var perKgValue = 0;
                     if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                         perKgValue = amount / salesVolumeValue;
                     }
                     
                     var validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
                     var validPercentOfSales = typeof percentOfSales === 'number' && !isNaN(percentOfSales) ? percentOfSales : 0;
                     var validPerKg = typeof perKgValue === 'number' && !isNaN(perKgValue) ? perKgValue : 0;
                     
                     ledgersData[ledger.label].values[periodName] = {
                         amount: validAmount,
                         percentOfSales: validPercentOfSales,
                         perKg: validPerKg
                     };
                     
                     periodTotal += validAmount;
                 });
                 
                 periodTotals[periodName] = {
                     amount: periodTotal,
                     percentOfSales: 0,
                     perKg: 0
                 };
                 
                 // Get actual totals from dedicated row - EXACT same as original
                 var actualTotal = computeCellValue(MANUFACTURING_LEDGERS.TOTAL_DIRECT_COST.rowIndex, period);
                 var salesValue = computeCellValue(3, period);
                 var salesVolumeValue = computeCellValue(7, period);
                 
                 var totalPercentOfSales = 0;
                 if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                     totalPercentOfSales = (actualTotal / salesValue) * 100;
                 }
                 
                 var totalPerKgValue = 0;
                 if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                     totalPerKgValue = actualTotal / salesVolumeValue;
                 }
                 
                 if (typeof actualTotal === 'number' && !isNaN(actualTotal)) {
                     periodTotals[periodName].amount = actualTotal;
                 }
                 periodTotals[periodName].percentOfSales = totalPercentOfSales;
                 periodTotals[periodName].perKg = totalPerKgValue;
             });
             
             // Sort ledgers by average amount - EXACT same as original
             var ledgersList = Object.values(ledgersData);
             ledgersList.sort(function(a, b) {
                 var aAvg = Object.values(a.values).reduce(function(sum, val) { return sum + (val.amount || 0); }, 0) / Object.values(a.values).length;
                 var bAvg = Object.values(b.values).reduce(function(sum, val) { return sum + (val.amount || 0); }, 0) / Object.values(b.values).length;
                 return bAvg - aAvg;
             });
             
             var ledgerLabels = ledgersList.map(function(ledger) { return ledger.label; });
             var periodNames = allPeriodNames;
             
             // Prepare series for each period - EXACT same as original
             var series = periodsToUse.map(function(period, index) {
                 var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                 
                 // Get color based on period's customColor - EXACT same logic as original
                 var color;
                 if (period.customColor) {
                     var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                     if (scheme) {
                         color = scheme.primary;
                     }
                 } else {
                     if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                         color = '#FF6B35';
                     } else if (period.month === 'January') {
                         color = '#FFD700';
                     } else if (period.month === 'Year') {
                         color = '#288cfa';
                     } else if (period.type === 'Budget') {
                         color = '#2E865F';
                     } else {
                         color = defaultColors[index % defaultColors.length];
                     }
                 }
                 
                 // Determine if color is dark - EXACT same as original
                 var isColorDark = function(hexColor) {
                     var r = parseInt(hexColor.substring(1, 3), 16);
                     var g = parseInt(hexColor.substring(3, 5), 16);
                     var b = parseInt(hexColor.substring(5, 7), 16);
                     return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
                 };
                 
                 var textColor = isColorDark(color) ? '#fff' : '#333';
                 
                 return {
                     name: periodName,
                     type: 'bar',
                     stack: 'total',
                     hoverLayerThreshold: Infinity,
                     label: {
                         show: true,
                         position: 'inside',
                         formatter: function(params) {
                             var data = ledgersList.find(function(l) { return l.label === params.name; })?.values[periodName];
                             if (!data) return '';

                             var millionsValue = (data.amount / 1000000).toFixed(2);
                             var percentValue = data.percentOfSales.toFixed(1);
                             var perKgValue = data.perKg.toFixed(1);

                             return '{uae|} ' + millionsValue + 'M\\n\\n' + percentValue + '%/Sls\\n\\n{uae|} ' + perKgValue + '/kg';
                         },
                         fontSize: 10,
                         fontWeight: 'bold',
                         color: textColor,
                         backgroundColor: 'transparent',
                         padding: [2, 4],
                         borderRadius: 0,
                         textBorderWidth: 0,
                         shadowBlur: 0,
                         lineHeight: 12,
                         align: 'center',
                         verticalAlign: 'middle',
                         rich: {
                             uae: {
                                 width: 10,
                                 height: 10,
                                 lineHeight: 12,
                                 padding: [-1, 2, 0, 0],
                                 align: 'center',
                                 verticalAlign: 'top',
                                 backgroundColor: {
                                     image: getUAESymbolImageDataURL(textColor)
                                 }
                             }
                         }
                     },
                     emphasis: {
                         focus: 'series',
                         blurScope: 'coordinateSystem',
                         label: {
                             fontSize: 11,
                             fontWeight: 'bold'
                         }
                     },
                     data: ledgerLabels.map(function(label) {
                         var ledger = ledgersList.find(function(l) { return l.label === label; });
                         return ledger?.values[periodName]?.amount || 0;
                     }),
                     itemStyle: {
                         color: color,
                         borderRadius: [0, 2, 2, 0]
                     },
                     barWidth: '80%',
                     barGap: '20%',
                     barCategoryGap: '30%'
                 };
             });
             
             // EXACT same ECharts option as original
             return {
                 tooltip: { trigger: 'none', show: false },
                 legend: {
                     data: periodNames,
                     type: 'scroll',
                     top: 0,
                     left: 'center',
                     icon: 'roundRect',
                     itemWidth: 14,
                     itemHeight: 8,
                     textStyle: {
                         fontSize: 16,
                         fontWeight: 'bold',
                         color: '#666'
                     },
                     pageIconColor: '#888',
                     pageTextStyle: {
                         color: '#888'
                     }
                 },
                 grid: {
                     left: '5%',
                     right: '5%',
                     bottom: '3%',
                     top: '40px',
                     containLabel: true
                 },
                 xAxis: {
                     show: true,
                     type: 'value',
                     axisLine: {
                         show: false
                     },
                     axisTick: {
                         show: false
                     },
                     axisLabel: {
                         show: false
                     },
                     splitLine: {
                         show: true,
                         lineStyle: {
                             color: '#eee',
                             type: 'dashed'
                         }
                     },
                     axisPointer: {
                         show: false
                     }
                 },
                 yAxis: {
                     type: 'category',
                     data: ledgerLabels,
                     axisLabel: {
                         fontWeight: 'bold',
                         fontSize: 13,
                         color: '#444',
                         padding: [0, 20, 0, 0],
                         formatter: function(value) {
                             if (value.length > 25) {
                                 return value.substring(0, 22) + '...';
                             }
                             return value;
                         },
                         rich: {
                             a: {
                                 fontWeight: 'bold',
                                 fontSize: 13,
                                 color: '#444',
                                 lineHeight: 20
                             }
                         }
                     },
                     axisLine: {
                         lineStyle: {
                             color: '#ddd'
                         }
                     },
                     axisTick: {
                         show: false
                     },
                     splitLine: {
                         show: false
                     }
                 },
                 series: series
             };
         }

         // EXACT same totals rendering as original ManufacturingCostChart.tsx
         function renderManufacturingCostTotals() {
             var totalsContainer = document.getElementById('manufacturing-cost-totals');
             if (!totalsContainer) return;
             
             // EXACT same manufacturing ledgers as original
             var MANUFACTURING_LEDGERS = {
                 LABOUR: { label: 'Labour', rowIndex: 9 },
                 DEPRECIATION: { label: 'Depreciation', rowIndex: 10 },
                 ELECTRICITY: { label: 'Electricity', rowIndex: 12 },
                 OTHER_OVERHEADS: { label: 'Others Mfg. Overheads', rowIndex: 13 },
                 TOTAL_DIRECT_COST: { label: 'Total Actual Direct Cost', rowIndex: 14 }
             };
             
             var colorSchemes = [
                 { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                 { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                 { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                 { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                 { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
             ];
             var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
             
             // Limit to 5 periods max - EXACT same as original
             var periodsToUse = visiblePeriods.slice(0, 5);
             var periodTotals = {};
             
             // Calculate all period names - EXACT same as original
             var allPeriodNames = periodsToUse.map(function(period) {
                 return period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
             });
             
             // Initialize all period totals - EXACT same as original
             allPeriodNames.forEach(function(periodName) {
                 periodTotals[periodName] = {
                     amount: 0,
                     percentOfSales: 0,
                     perKg: 0
                 };
             });
             
             // Process each period - EXACT same logic as original
             periodsToUse.forEach(function(period, periodIndex) {
                 var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                 
                 // Get actual totals from dedicated row - EXACT same as original
                 var actualTotal = computeCellValue(MANUFACTURING_LEDGERS.TOTAL_DIRECT_COST.rowIndex, period);
                 var salesValue = computeCellValue(3, period);
                 var salesVolumeValue = computeCellValue(7, period);
                 
                 var totalPercentOfSales = 0;
                 if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                     totalPercentOfSales = (actualTotal / salesValue) * 100;
                 }
                 
                 var totalPerKgValue = 0;
                 if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                     totalPerKgValue = actualTotal / salesVolumeValue;
                 }
                 
                 periodTotals[periodName] = {
                     amount: typeof actualTotal === 'number' && !isNaN(actualTotal) ? actualTotal : 0,
                     percentOfSales: totalPercentOfSales,
                     perKg: totalPerKgValue
                 };
             });
             
             // EXACT same HTML structure as original
             var totalsHTML = '<div style="display: flex; flex-wrap: wrap; justify-content: space-around; margin-top: 20px; gap: 5px;">';
             
             periodsToUse.forEach(function(period, index) {
                 var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                 var totals = periodTotals[periodName] || { amount: 0, percentOfSales: 0, perKg: 0 };
                 
                 // Format values with proper decimal places - EXACT same as original
                 var formattedMillions = (totals.amount / 1000000).toFixed(2);
                 var formattedPercent = totals.percentOfSales.toFixed(1);
                 var formattedPerKg = totals.perKg.toFixed(1);
                 
                 // Get color for period - EXACT same logic as original
                 var color;
                 if (period.customColor) {
                     var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                     if (scheme) {
                         color = scheme.primary;
                     }
                 } else {
                     if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                         color = '#FF6B35';
                     } else if (period.month === 'January') {
                         color = '#FFD700';
                     } else if (period.month === 'Year') {
                         color = '#288cfa';
                     } else if (period.type === 'Budget') {
                         color = '#2E865F';
                     } else {
                         color = defaultColors[index % defaultColors.length];
                     }
                 }
                 
                 var isColorDark = function(hexColor) {
                     var r = parseInt(hexColor.substring(1, 3), 16);
                     var g = parseInt(hexColor.substring(3, 5), 16);
                     var b = parseInt(hexColor.substring(5, 7), 16);
                     return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
                 };
                 var textColor = isColorDark(color) ? '#fff' : '#333';
                 
                 // EXACT same card HTML structure as original
                 totalsHTML += '<div class="manufacturing-totals-card" style="background-color: ' + color + '; border: 1px solid ' + color + ';">';
                 totalsHTML += '<div style="font-size: 14px; color: ' + textColor + '; font-weight: 500; margin-top: 8px;">' + periodName + '</div>';
                 totalsHTML += '<div style="font-weight: bold; font-size: 22px; color: ' + textColor + '; margin-top: 8px;">';
                 totalsHTML += '${getUAEDirhamSymbolHTML()} ' + formattedMillions + 'M';
                 totalsHTML += '</div>';
                 totalsHTML += '<div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; padding: 0 8px; font-size: 12px; font-weight: bold; color: ' + textColor + '; margin-top: 8px;">';
                 totalsHTML += '<div>' + formattedPercent + '%/Sls</div>';
                 totalsHTML += '<div>${getUAEDirhamSymbolHTML()} ' + formattedPerKg + '/kg</div>';
                 totalsHTML += '</div>';
                 totalsHTML += '</div>';
                 
                 // Add variance badge between cards - EXACT same as original
                 if (index < periodsToUse.length - 1) {
                     var nextPeriod = periodsToUse[index + 1];
                     var nextPeriodName = nextPeriod.year + ' ' + (nextPeriod.isCustomRange ? nextPeriod.displayName : (nextPeriod.month || '')) + ' ' + nextPeriod.type;
                     var nextTotals = periodTotals[nextPeriodName] || { amount: 0 };
                     
                     var variance = null;
                     if (totals.amount !== 0) {
                         variance = ((nextTotals.amount - totals.amount) / Math.abs(totals.amount)) * 100;
                     }
                     
                     var badgeColor = '#888', arrow = '–';
                     if (variance !== null && !isNaN(variance)) {
                         if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                         else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                     }
                     
                     totalsHTML += '<div style="align-self: center; margin: 0 2px; display: flex; flex-direction: column; align-items: center; min-width: 40px; width: 40px; height: 60px; justify-content: center;">';
                     if (variance === null || isNaN(variance)) {
                         totalsHTML += '<span style="color: #888; font-size: 16px; font-weight: bold; text-align: center;">0%</span>';
                     } else {
                         totalsHTML += '<span style="font-size: 22px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                         totalsHTML += '<span style="font-size: 18px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                         totalsHTML += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                     }
                     totalsHTML += '</div>';
                 }
             });
             
            totalsHTML += '</div>';
            totalsContainer.innerHTML = totalsHTML;
        }

        // Render Below GP Expenses totals - EXACT same as original BelowGPExpensesChart.tsx
        function renderBelowGPExpensesTotals() {
            var totalsContainer = document.getElementById('below-gp-expenses-totals');
            if (!totalsContainer) return;
            
            // EXACT same below GP ledgers as original
            var BELOW_GP_LEDGERS = {
                SELLING_EXPENSES: { label: 'Selling expenses', rowIndex: 31 },
                TRANSPORTATION: { label: 'Transportation', rowIndex: 32 },
                ADMINISTRATION: { label: 'Administration', rowIndex: 40 },
                BANK_INTEREST: { label: 'Bank interest', rowIndex: 42 },
                TOTAL_BELOW_GP_EXPENSES: { label: 'Total Below GP Expenses', rowIndex: 52 }
            };
            
            // EXACT same color schemes as original
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            // Get period data
            var periodsToUse = visiblePeriods.slice(0, 5);
            
            // Calculate totals for each period - EXACT same logic as original
            var periodTotals = {};
            periodsToUse.forEach(function(period) {
                var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                
                // Get actual totals from dedicated row - EXACT same as original
                var actualTotal = computeCellValue(BELOW_GP_LEDGERS.TOTAL_BELOW_GP_EXPENSES.rowIndex, period);
                var salesValue = computeCellValue(3, period);
                var salesVolumeValue = computeCellValue(7, period);
                
                var totalPercentOfSales = 0;
                if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                    totalPercentOfSales = (actualTotal / salesValue) * 100;
                }
                
                var totalPerKgValue = 0;
                if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                    totalPerKgValue = actualTotal / salesVolumeValue;
                }
                
                periodTotals[periodName] = {
                    amount: actualTotal || 0,
                    percentOfSales: totalPercentOfSales,
                    perKg: totalPerKgValue
                };
            });
            
            // Generate HTML - EXACT same structure as original
            var totalsHTML = '<div style="display: flex; flex-wrap: wrap; justify-content: space-around; align-items: flex-end; gap: 5px; margin-top: 20px; margin-bottom: 0; width: 100%;">';
            
            periodsToUse.forEach(function(period, idx) {
                var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                var totals = periodTotals[periodName] || { amount: 0, percentOfSales: 0, perKg: 0 };
                var formattedMillions = (totals.amount / 1000000).toFixed(2);
                var formattedPercent = totals.percentOfSales.toFixed(1);
                var formattedPerKg = totals.perKg.toFixed(1);
                
                // Get color - EXACT same logic as original
                var color;
                if (period.customColor) {
                    var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                    if (scheme) {
                        color = scheme.primary;
                    }
                } else {
                    if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                        color = '#FF6B35';
                    } else if (period.month === 'January') {
                        color = '#FFD700';
                    } else if (period.month === 'Year') {
                        color = '#288cfa';
                    } else if (period.type === 'Budget') {
                        color = '#2E865F';
                    } else {
                        color = defaultColors[idx % defaultColors.length];
                    }
                }
                
                var isColorDark = function(hexColor) {
                    var r = parseInt(hexColor.substring(1, 3), 16);
                    var g = parseInt(hexColor.substring(3, 5), 16);
                    var b = parseInt(hexColor.substring(5, 7), 16);
                    return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
                };
                
                var textColor = isColorDark(color) ? '#fff' : '#333';
                
                totalsHTML += '<div class="below-gp-expenses-totals-card" style="background-color: ' + color + '; border: 1px solid ' + color + ';">';
                totalsHTML += '<div style="font-size: 14px; color: ' + textColor + '; font-weight: 500; margin-top: 8px;">' + periodName + '</div>';
                totalsHTML += '<div style="font-weight: bold; font-size: 22px; color: ' + textColor + '; margin-top: 8px;">';
                totalsHTML += getUAEDirhamSymbolHTML() + ' ' + formattedMillions + 'M';
                totalsHTML += '</div>';
                totalsHTML += '<div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; padding: 0 8px; font-size: 12px; font-weight: bold; color: ' + textColor + '; margin-top: 8px;">';
                totalsHTML += '<div>' + formattedPercent + '%/Sls</div>';
                totalsHTML += '<div>' + getUAEDirhamSymbolHTML() + ' ' + formattedPerKg + '/kg</div>';
                totalsHTML += '</div>';
                totalsHTML += '</div>';
                
                // Add variance badge between cards - EXACT same as original
                if (idx < periodsToUse.length - 1) {
                    var nextPeriod = periodsToUse[idx + 1];
                    var nextPeriodName = nextPeriod.year + ' ' + (nextPeriod.isCustomRange ? nextPeriod.displayName : (nextPeriod.month || '')) + ' ' + nextPeriod.type;
                    var nextTotals = periodTotals[nextPeriodName] || { amount: 0 };
                    var variance = null;
                    if (totals.amount !== 0) {
                        variance = ((nextTotals.amount - totals.amount) / Math.abs(totals.amount)) * 100;
                    }
                    var badgeColor = '#888', arrow = '–';
                    if (variance !== null && !isNaN(variance)) {
                        if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                        else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                    }
                    
                    totalsHTML += '<div style="align-self: center; margin: 0 2px; display: flex; flex-direction: column; align-items: center; min-width: 40px; width: 40px; height: 60px; justify-content: center;">';
                    if (variance === null || isNaN(variance)) {
                        totalsHTML += '<span style="color: #888; font-size: 16px; font-weight: bold; text-align: center;">0%</span>';
                    } else {
                        totalsHTML += '<span style="font-size: 22px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                        totalsHTML += '<span style="font-size: 18px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                        totalsHTML += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                    }
                    totalsHTML += '</div>';
                }
            });
            
            totalsHTML += '</div>';
            totalsContainer.innerHTML = totalsHTML;
        }

        // EXACT same chart options as original BelowGPExpensesChart.tsx
        function getBelowGPExpensesOption() {
            // EXACT same below GP ledgers as original
            var BELOW_GP_LEDGERS = {
                SELLING_EXPENSES: { label: 'Selling expenses', rowIndex: 31 },
                TRANSPORTATION: { label: 'Transportation', rowIndex: 32 },
                ADMINISTRATION: { label: 'Administration', rowIndex: 40 },
                BANK_INTEREST: { label: 'Bank interest', rowIndex: 42 },
                TOTAL_BELOW_GP_EXPENSES: { label: 'Total Below GP Expenses', rowIndex: 52 }
            };
            
            // EXACT same color schemes as original
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            // Get all ledger items except the total - EXACT same as original
            var ledgerItems = Object.values(BELOW_GP_LEDGERS).filter(function(item) {
                return item !== BELOW_GP_LEDGERS.TOTAL_BELOW_GP_EXPENSES;
            });
            
            // Limit to 5 periods max - EXACT same as original
            var periodsToUse = visiblePeriods.slice(0, 5);
            
            // EXACT same data processing as original
            var ledgersData = {};
            var periodTotals = {};
            
            // Calculate all period names - EXACT same as original
            var allPeriodNames = periodsToUse.map(function(period) {
                return period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
            });
            
            // Initialize data structure - EXACT same as original
            ledgerItems.forEach(function(ledger) {
                ledgersData[ledger.label] = { label: ledger.label, values: {} };
                allPeriodNames.forEach(function(periodName) {
                    ledgersData[ledger.label].values[periodName] = {
                        amount: 0,
                        percentOfSales: 0,
                        perKg: 0
                    };
                });
            });
            
            // Initialize all period totals - EXACT same as original
            allPeriodNames.forEach(function(periodName) {
                periodTotals[periodName] = {
                    amount: 0,
                    percentOfSales: 0,
                    perKg: 0
                };
            });
            
            // Process each period - EXACT same logic as original
            periodsToUse.forEach(function(period, periodIndex) {
                var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                var periodTotal = 0;
                
                ledgerItems.forEach(function(ledger) {
                    // Get the base amount using computeCellValue
                    var amount = computeCellValue(ledger.rowIndex, period);
                    var salesValue = computeCellValue(3, period);
                    var salesVolumeValue = computeCellValue(7, period);
                    
                    // Calculate percent of sales - EXACT same as original
                    var percentOfSales = 0;
                    if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                        percentOfSales = (amount / salesValue) * 100;
                    }
                    
                    // Calculate per kg value - EXACT same as original
                    var perKgValue = 0;
                    if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                        perKgValue = amount / salesVolumeValue;
                    }
                    
                    var validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
                    var validPercentOfSales = typeof percentOfSales === 'number' && !isNaN(percentOfSales) ? percentOfSales : 0;
                    var validPerKg = typeof perKgValue === 'number' && !isNaN(perKgValue) ? perKgValue : 0;
                    
                    ledgersData[ledger.label].values[periodName] = {
                        amount: validAmount,
                        percentOfSales: validPercentOfSales,
                        perKg: validPerKg
                    };
                    
                    periodTotal += validAmount;
                });
                
                periodTotals[periodName] = {
                    amount: periodTotal,
                    percentOfSales: 0,
                    perKg: 0
                };
                
                // Get actual totals from dedicated row - EXACT same as original
                var actualTotal = computeCellValue(BELOW_GP_LEDGERS.TOTAL_BELOW_GP_EXPENSES.rowIndex, period);
                var salesValue = computeCellValue(3, period);
                var salesVolumeValue = computeCellValue(7, period);
                
                var totalPercentOfSales = 0;
                if (typeof salesValue === 'number' && !isNaN(salesValue) && salesValue !== 0) {
                    totalPercentOfSales = (actualTotal / salesValue) * 100;
                }
                
                var totalPerKgValue = 0;
                if (typeof salesVolumeValue === 'number' && !isNaN(salesVolumeValue) && salesVolumeValue !== 0) {
                    totalPerKgValue = actualTotal / salesVolumeValue;
                }
                
                if (typeof actualTotal === 'number' && !isNaN(actualTotal)) {
                    periodTotals[periodName].amount = actualTotal;
                }
                periodTotals[periodName].percentOfSales = totalPercentOfSales;
                periodTotals[periodName].perKg = totalPerKgValue;
            });
            
            // Sort ledgers by average amount - EXACT same as original
            var ledgersList = Object.values(ledgersData);
            ledgersList.sort(function(a, b) {
                var aAvg = Object.values(a.values).reduce(function(sum, val) { return sum + (val.amount || 0); }, 0) / Object.values(a.values).length;
                var bAvg = Object.values(b.values).reduce(function(sum, val) { return sum + (val.amount || 0); }, 0) / Object.values(b.values).length;
                return bAvg - aAvg;
            });
            
            var ledgerLabels = ledgersList.map(function(ledger) { return ledger.label; });
            var periodNames = allPeriodNames;
            
            // Prepare series for each period - EXACT same as original
            var series = periodsToUse.map(function(period, index) {
                var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                
                // Get color based on period's customColor - EXACT same logic as original
                var color;
                if (period.customColor) {
                    var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                    if (scheme) {
                        color = scheme.primary;
                    }
                } else {
                    if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                        color = '#FF6B35';
                    } else if (period.month === 'January') {
                        color = '#FFD700';
                    } else if (period.month === 'Year') {
                        color = '#288cfa';
                    } else if (period.type === 'Budget') {
                        color = '#2E865F';
                    } else {
                        color = defaultColors[index % defaultColors.length];
                    }
                }
                
                // Determine if color is dark - EXACT same as original
                var isColorDark = function(hexColor) {
                    var r = parseInt(hexColor.substring(1, 3), 16);
                    var g = parseInt(hexColor.substring(3, 5), 16);
                    var b = parseInt(hexColor.substring(5, 7), 16);
                    return (r * 0.299 + g * 0.587 + b * 0.114) < 150;
                };
                
                var textColor = isColorDark(color) ? '#fff' : '#333';

                return {
                    name: periodName,
                    type: 'bar',
                    stack: 'total',
                    hoverLayerThreshold: Infinity,
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: function(params) {
                            var data = ledgersList.find(function(l) { return l.label === params.name; })?.values[periodName];
                            if (!data) return '';

                            var millionsValue = (data.amount / 1000000).toFixed(2);
                            var percentValue = data.percentOfSales.toFixed(1);
                            var perKgValue = data.perKg.toFixed(1);

                            return '{uae|} ' + millionsValue + 'M\\n\\n' + percentValue + '%/Sls\\n\\n{uae|} ' + perKgValue + '/kg';
                        },
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: textColor,
                        backgroundColor: 'transparent',
                        padding: [2, 4],
                        borderRadius: 0,
                        textBorderWidth: 0,
                        shadowBlur: 0,
                        lineHeight: 12,
                        align: 'center',
                        verticalAlign: 'middle',
                        rich: {
                            uae: {
                                width: 10,
                                height: 10,
                                lineHeight: 12,
                                padding: [-1, 2, 0, 0],
                                align: 'center',
                                verticalAlign: 'top',
                                backgroundColor: {
                                    image: getUAESymbolImageDataURL(textColor)
                                }
                            }
                        }
                    },
                    emphasis: {
                        focus: 'series',
                        blurScope: 'coordinateSystem',
                        label: {
                            fontSize: 11,
                            fontWeight: 'bold'
                        }
                    },
                    data: ledgerLabels.map(function(label) {
                        var ledger = ledgersList.find(function(l) { return l.label === label; });
                        return ledger?.values[periodName]?.amount || 0;
                    }),
                    itemStyle: {
                        color: color,
                        borderRadius: [0, 2, 2, 0]
                    },
                    barWidth: '80%',
                    barGap: '20%',
                    barCategoryGap: '30%'
                };
            });
            
            // EXACT same ECharts option as original
            return {
                tooltip: { trigger: 'none', show: false },
                legend: {
                    data: periodNames,
                    type: 'scroll',
                    top: 0,
                    left: 'center',
                    icon: 'roundRect',
                    itemWidth: 14,
                    itemHeight: 8,
                    textStyle: {
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#666'
                    },
                    pageIconColor: '#888',
                    pageTextStyle: {
                        color: '#888'
                    }
                },
                grid: {
                    left: '5%',
                    right: '5%',
                    bottom: '3%',
                    top: '40px',
                    containLabel: true
                },
                xAxis: {
                    show: true,
                    type: 'value',
                    axisLine: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    axisLabel: {
                        show: false
                    },
                    splitLine: {
                        show: true,
                        lineStyle: {
                            color: '#eee',
                            type: 'dashed'
                        }
                    },
                    axisPointer: {
                        show: false
                    }
                },
                yAxis: {
                    type: 'category',
                    data: ledgerLabels,
                    axisLabel: {
                        fontWeight: 'bold',
                        fontSize: 13,
                        color: '#444',
                        padding: [0, 20, 0, 0],
                        formatter: function(value) {
                            if (value.length > 25) {
                                return value.substring(0, 22) + '...';
                            }
                            return value;
                        },
                        rich: {
                            a: {
                                fontWeight: 'bold',
                                fontSize: 13,
                                color: '#444',
                                lineHeight: 20
                            }
                        }
                    },
                    axisLine: {
                        lineStyle: {
                            color: '#ddd'
                        }
                    },
                    axisTick: {
                        show: false
                    },
                    splitLine: {
                        show: false
                    }
                },
                series: series
            };
        }

        // Divisional KPIs rendering function - uses captured KPI data
        function renderDivisionalKPIs() {
            console.log('renderDivisionalKPIs called - using captured KPI data');
            var kpisContainer = document.getElementById('full-divisional-kpis-chart');
            if (!kpisContainer) {
                console.error('full-divisional-kpis-chart container not found!');
                return;
            }
            console.log('full-divisional-kpis-chart container found');
            
            // Use the captured KPI HTML that was generated during export
            var capturedKpiHTML = kpiSummaryHTML;
            kpisContainer.innerHTML = capturedKpiHTML;
            console.log('Divisional KPIs rendered successfully using captured data');
        }

        // P&L Financial rendering function - uses captured P&L table data
        function renderPLFinancial() {
            console.log('renderPLFinancial called - using captured P&L data');
            var plContainer = document.getElementById('full-pl-financial-chart');
            if (!plContainer) {
                console.error('full-pl-financial-chart container not found!');
                return;
            }
            console.log('full-pl-financial-chart container found');
            
            // Get division name for the title
            var divisionName = getDivisionDisplayName();
            
            // Use the EXACT same structure as ComprehensiveHTMLExport
            var capturedPLHTML = plFinancialTableHTML;
            var plHTML = '<div class="pl-table-container">' +
                capturedPLHTML +
                '</div>';
            
            plContainer.innerHTML = plHTML;
            console.log('P&L Financial rendered successfully using captured data with proper structure');
        }

        // Product Group rendering function - uses captured Product Group table data
        function renderProductGroup() {
            console.log('renderProductGroup called - using captured Product Group data');
            var productGroupContainer = document.getElementById('full-product-group-chart');
            if (!productGroupContainer) {
                console.error('full-product-group-chart container not found!');
                return;
            }
            console.log('full-product-group-chart container found');
            
            // Get division name for the title
            var divisionName = getDivisionDisplayName();
            
            // Use the EXACT same structure as ComprehensiveHTMLExport with currency symbol
            var capturedProductGroupHTML = '${productGroupTableHTML}';
            var productGroupHTML = '<div class="product-group-table-container">' +
                capturedProductGroupHTML +
                '</div>';
            
            productGroupContainer.innerHTML = productGroupHTML;
            console.log('Product Group rendered successfully using captured data with proper structure');
        }

        // Sales by Customer rendering function - uses captured Sales by Customer table data
        function renderSalesCustomer() {
            console.log('renderSalesCustomer called - using captured Sales by Customer data');
            var salesCustomerContainer = document.getElementById('full-sales-customer-chart');
            if (!salesCustomerContainer) {
                console.error('full-sales-customer-chart container not found!');
                return;
            }
            console.log('full-sales-customer-chart container found');
            
            // Get division name for the title
            var divisionName = getDivisionDisplayName();
            
            // Use the EXACT same structure as ComprehensiveHTMLExport with currency symbol
            var capturedSalesCustomerHTML = '${salesCustomerTableHTML}';
            
            // Determine title based on the Hide Sales Rep setting captured during export
            var titleText = 'Sales by Customer (Top 20)';
            var hideSalesRep = ${hideSalesRepState};
            
            console.log('🔍 DEBUG RENDER: hideSalesRepState from template =', hideSalesRep);
            
            // Fallback: Check the captured HTML for sales rep columns
            var hasSalesRepColumn = capturedSalesCustomerHTML.includes('Sales Rep') || 
                                   capturedSalesCustomerHTML.includes('Salesman') ||
                                   capturedSalesCustomerHTML.includes('sales rep') ||
                                   capturedSalesCustomerHTML.includes('salesman');
            
            console.log('🔍 DEBUG RENDER: hasSalesRepColumn =', hasSalesRepColumn);
            console.log('🔍 DEBUG RENDER: captured HTML preview:', capturedSalesCustomerHTML.substring(0, 500));
            
            // Use the checkbox setting - if hideSalesRep is false, show "& Sales Rep"
            if (!hideSalesRep) {
                titleText = 'Sales by Customer & Sales Rep (Top 20)';
            }
            
            console.log('Hide Sales Rep setting:', hideSalesRep ? 'HIDDEN' : 'VISIBLE');
            console.log('Title will be:', titleText);
            
            // Update the blue ribbon header title dynamically
            var headerTitleElement = document.getElementById('sales-customer-header-title');
            if (headerTitleElement) {
                headerTitleElement.textContent = titleText;
                console.log('Updated blue ribbon header title to:', titleText);
            }
            
            var salesCustomerHTML = '<div class="sales-customer-table-container">' +
                capturedSalesCustomerHTML +
                '</div>' +
                '<div class="table-footer-note" style="text-align:center; margin-top:8px; font-size:13px; color:#666;">' +
                    '<span style="color:#FFD700">★</span> = Sorting by Base Period (' + '${getBasePeriodText()}' + ') highest to lowest | Δ% shows percentage change between consecutive periods' +
                '</div>';
            
            salesCustomerContainer.innerHTML = salesCustomerHTML;
            console.log('Sales by Customer rendered successfully using captured data with proper structure');
        }

        // Sales by Sales Rep rendering function - uses captured Sales Rep table data
        function renderSalesRep() {
            console.log('renderSalesRep called - using captured Sales Rep data');
            var salesRepContainer = document.getElementById('full-sales-rep-chart');
            if (!salesRepContainer) {
                console.error('full-sales-rep-chart container not found!');
                return;
            }
            console.log('full-sales-rep-chart container found');
            
            var divisionName = getDivisionDisplayName();
            var capturedSalesRepHTML = \`${salesRepTableHTML.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
            
            var headerTitleElement = document.getElementById('sales-rep-header-title');
            if (headerTitleElement) {
                headerTitleElement.textContent = 'Sales by Sales Reps';
            }
            
            var salesRepHTML = '<div class="sales-rep-table-container">' +
                capturedSalesRepHTML +
                '</div>' +
                '<div class="table-footer-note" style="text-align:center; margin-top:8px; font-size:13px; color:#666;">' +
                    '<span style="color:#FFD700">★</span> = Sorting by Base Period (' + '${getBasePeriodText()}' + ') highest to lowest | Δ% shows percentage change between consecutive periods' +
                '</div>';
            
            salesRepContainer.innerHTML = salesRepHTML;
            console.log('Sales by Sales Rep rendered successfully using captured data with proper structure');
        }

        // Sales by Country rendering function - uses captured Sales by Country table data
        function renderSalesCountry() {
            console.log('renderSalesCountry called - using captured Sales by Country data');
            var salesCountryContainer = document.getElementById('full-sales-country-chart');
            if (!salesCountryContainer) {
                console.error('full-sales-country-chart container not found!');
                return;
            }
            console.log('full-sales-country-chart container found');
            
            // Get division name for the title
            var divisionName = getDivisionDisplayName();
            
            // Use the EXACT same structure as Sales by Customer
            var capturedSalesCountryHTML = \`${salesCountryTableHTML.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
            
            // Determine title based on the Hide Budget & Forecast setting captured during export
            var titleText = 'Sales by Country';
            var hideBudgetForecast = ${hideBudgetForecastState};
            
            console.log('🔍 DEBUG RENDER: hideBudgetForecastState from template =', hideBudgetForecast);
            
            // Check if Budget/Forecast columns are in the captured HTML
            var hasBudgetForecast = capturedSalesCountryHTML.includes('Budget') || 
                                   capturedSalesCountryHTML.includes('Forecast');
            
            console.log('🔍 DEBUG RENDER: hasBudgetForecast =', hasBudgetForecast);
            
            // Optionally adjust title based on budget visibility (can be customized)
            // For now, title remains "Sales by Country" regardless
            
            console.log('Hide Budget & Forecast setting:', hideBudgetForecast ? 'HIDDEN' : 'VISIBLE');
            console.log('Title will be:', titleText);
            
            // Update the blue ribbon header title dynamically
            var headerTitleElement = document.getElementById('sales-country-header-title');
            if (headerTitleElement) {
                headerTitleElement.textContent = titleText;
                console.log('Updated blue ribbon header title to:', titleText);
            }
            
            var salesCountryHTML = '<div class="sales-country-table-container">' +
                capturedSalesCountryHTML +
                '</div>' +
                '<div class="table-footer-note" style="text-align:center; margin-top:8px; font-size:13px; color:#666;">' +
                    '<span style="color:#FFD700">★</span> = Sorting by Base Period (' + '${getBasePeriodText()}' + ') highest to lowest | Δ% shows percentage change between consecutive periods' +
                '</div>';
            
            salesCountryContainer.innerHTML = salesCountryHTML;
            console.log('Sales by Country rendered successfully using captured data with proper structure');
        }

        // EXACT same as ExpencesChart + Profitchart - Card-based HTML rendering
        function initializeCombinedTrends() {
            console.log('initializeCombinedTrends called');
            
            // Get periods to use
            var periodsToUse = visiblePeriods.slice(0, 5);
            console.log('Periods to use:', periodsToUse.length);
            
            // Color schemes - EXACT same as original
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            // Helper function to get period color - EXACT same as original
            function getPeriodColor(period, idx) {
                if (period.customColor) {
                    var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                    if (scheme) {
                        return scheme.primary;
                    }
                }
                
                if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                    return '#FF6B35';
                } else if (period.month === 'January') {
                    return '#FFD700';
                } else if (period.month === 'Year') {
                    return '#288cfa';
                } else if (period.type === 'Budget') {
                    return '#2E865F';
                } else {
                    return defaultColors[idx % defaultColors.length];
                }
            }
            
            // Helper function to calculate variance - EXACT same as original
            function calcVariance(current, prev) {
                if (prev === 0) return null;
                return ((current - prev) / Math.abs(prev)) * 100;
            }
            
            // Render Combined Trends in ONE container - EXACT same as original charts
            var combinedHTML = '<div style="margin-top: 30px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 20px 20px 20px 20px; width: 95%; margin-left: auto; margin-right: auto; box-sizing: border-box; min-height: 800px; overflow: visible;">';

            // Add Period Legend at the top
            combinedHTML += '<div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">';
            periodsToUse.forEach(function(period, idx) {
                var periodName = period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type;
                var color = getPeriodColor(period, idx);
                combinedHTML += '<div style="display: flex; align-items: center; gap: 8px;">';
                combinedHTML += '<div style="width: 20px; height: 20px; background-color: ' + color + '; border-radius: 4px;"></div>';
                combinedHTML += '<span style="font-size: 14px; font-weight: 500; color: #333;">' + periodName + '</span>';
                combinedHTML += '</div>';
            });
            combinedHTML += '</div>';

            // Expenses Trend Section
            combinedHTML += '<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; color: #333; font-weight: 600;">Expenses Trend</h2>';
            combinedHTML += '<div style="display: flex; flex-wrap: nowrap; align-items: center; gap: 5px; margin-top: 20px; margin-bottom: 0; width: 100%; padding: 0 24px;">';
            
            // Build expenses cards - EXACT same as ExpencesChart
            var expensesCards = periodsToUse.map(function(period, idx) {
                var value = computeCellValue(52, period); // Total Below GP Expenses
                var sales = computeCellValue(3, period);
                var salesVolume = computeCellValue(7, period);
                var percentOfSales = (typeof sales === 'number' && sales !== 0) ? (value / sales) * 100 : 0;
                var perKg = (typeof salesVolume === 'number' && salesVolume !== 0) ? value / salesVolume : 0;
                
                return {
                    periodName: period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type,
                    value: typeof value === 'number' && !isNaN(value) ? value : 0,
                    percentOfSales: percentOfSales,
                    perKg: perKg,
                    color: getPeriodColor(period, idx),
                    textColor: getPeriodColor(period, idx) === '#FFD700' ? '#333' : '#fff'
                };
            });
            
            // Calculate variances for expenses
            var expensesVariances = expensesCards.map(function(card, idx) {
                if (idx === 0) return null;
                return calcVariance(card.value, expensesCards[idx - 1].value);
            });
            
            // Render expenses cards with variances
            expensesCards.forEach(function(card, idx) {
                // Card with hover effects
                combinedHTML += '<div class="hover-card" style="padding: 12px 15px; border-radius: 6px; background-color: ' + card.color + '; border: 1px solid ' + card.color + '; box-shadow: 0 2px 6px rgba(0,0,0,0.07); flex: 1 1 0; min-width: 0; text-align: center; position: relative; overflow: hidden; color: ' + card.textColor + '; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease;">';
                combinedHTML += '<div style="font-size: 14px; color: ' + card.textColor + '; font-weight: 500; margin-top: 4px;">' + card.periodName + '</div>';
                combinedHTML += '<div style="font-weight: bold; font-size: 22px; color: ' + card.textColor + '; margin-top: 8px;">${getUAEDirhamSymbolHTML()} ' + (card.value ? (card.value / 1000000).toFixed(2) + 'M' : '0.00M') + '</div>';
                combinedHTML += '<div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: ' + card.textColor + '; margin-top: 8px; width: 100%;">';
                combinedHTML += '<div>' + card.percentOfSales.toFixed(1) + '%/Sls</div>';
                combinedHTML += '<div>' + card.perKg.toFixed(1) + ' per kg</div>';
                combinedHTML += '</div></div>';

                // Variance badge between cards OR invisible spacer after last card
                if (idx < expensesCards.length - 1) {
                    var variance = expensesVariances[idx + 1];
                    var badgeColor = '#888', arrow = '–';
                    if (variance !== null && !isNaN(variance)) {
                        if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                        else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                    }

                    combinedHTML += '<div style="flex: 0 0 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">';
                    if (variance === null || isNaN(variance)) {
                        combinedHTML += '<span style="color: #888; font-size: 12px; font-weight: bold; text-align: center;">N/A</span>';
                    } else {
                        combinedHTML += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                        combinedHTML += '<span style="font-size: 14px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                        combinedHTML += '<span style="font-size: 12px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                    }
                    combinedHTML += '</div>';
                } else {
                    // Add invisible spacer after last card to balance layout
                    combinedHTML += '<div style="flex: 0 0 40px;"></div>';
                }
            });
            
            combinedHTML += '</div>';
            
            // PROFIT KPIS - EXACT same as Profitchart
            var PROFIT_KPIS = [
                { label: 'Net Profit', rowIndex: 54 },
                { label: 'EBIT', rowIndex: 'calculated', isEBIT: true },
                { label: 'EBITDA', rowIndex: 56 }
            ];
            
            PROFIT_KPIS.forEach(function(kpi, rowIdx) {
                // Build cards for this KPI
                var profitCards = periodsToUse.map(function(period, idx) {
                    var value;
                    if (kpi.isEBIT) {
                        // Calculate EBIT as Net Profit + Bank Interest (Row 54 + Row 42)
                        var netProfit = computeCellValue(54, period);
                        var bankInterest = computeCellValue(42, period);
                        value = (typeof netProfit === 'number' ? netProfit : 0) + (typeof bankInterest === 'number' ? bankInterest : 0);
                    } else {
                        value = computeCellValue(kpi.rowIndex, period);
                    }
                    
                    var sales = computeCellValue(3, period);
                    var salesVolume = computeCellValue(7, period);
                    var percentOfSales = (typeof sales === 'number' && sales !== 0) ? (value / sales) * 100 : 0;
                    var perKg = (typeof salesVolume === 'number' && salesVolume !== 0) ? value / salesVolume : 0;
                    
                    return {
                        periodName: period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type,
                        value: typeof value === 'number' && !isNaN(value) ? value : 0,
                        percentOfSales: percentOfSales,
                        perKg: perKg,
                        color: getPeriodColor(period, idx),
                        textColor: getPeriodColor(period, idx) === '#FFD700' ? '#333' : '#fff'
                    };
                });
                
                // Calculate variances for this KPI
                var profitVariances = profitCards.map(function(card, idx) {
                    if (idx === 0) return null;
                    return calcVariance(card.value, profitCards[idx - 1].value);
                });
                
                // Render HTML for this KPI in same container
                combinedHTML += '<div style="margin-bottom: ' + (rowIdx < PROFIT_KPIS.length - 1 ? '30px' : '0') + '; padding-bottom: 0; overflow: hidden;">';
                combinedHTML += '<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; color: #333; font-weight: 600;">' + kpi.label + ' Trend</h2>';
                combinedHTML += '<div style="display: flex; flex-wrap: nowrap; align-items: center; gap: 5px; margin-top: 10px; margin-bottom: 0; padding-bottom: 0; width: 100%; padding: 0 24px;">';
                
                profitCards.forEach(function(card, idx) {
                    // Card with hover effects
                    combinedHTML += '<div class="hover-card" style="padding: 12px 15px; border-radius: 6px; background-color: ' + card.color + '; border: 1px solid ' + card.color + '; box-shadow: 0 2px 6px rgba(0,0,0,0.07); flex: 1 1 0; min-width: 0; text-align: center; position: relative; overflow: hidden; color: ' + card.textColor + '; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease;">';
                    combinedHTML += '<div style="font-size: 14px; color: ' + card.textColor + '; font-weight: 500; margin-top: 4px;">' + card.periodName + '</div>';
                    combinedHTML += '<div style="font-weight: bold; font-size: 22px; color: ' + card.textColor + '; margin-top: 8px;">${getUAEDirhamSymbolHTML()} ' + (card.value ? (card.value / 1000000).toFixed(2) + 'M' : '0.00M') + '</div>';
                    combinedHTML += '<div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: ' + card.textColor + '; margin-top: 8px; width: 100%;">';
                    combinedHTML += '<div>' + card.percentOfSales.toFixed(1) + '%/Sls</div>';
                    combinedHTML += '<div>' + card.perKg.toFixed(1) + ' per kg</div>';
                    combinedHTML += '</div></div>';

                    // Variance badge between cards OR invisible spacer after last card
                    if (idx < profitCards.length - 1) {
                        var variance = profitVariances[idx + 1];
                        var badgeColor = '#888', arrow = '–';
                        if (variance !== null && !isNaN(variance)) {
                            if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                            else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                        }

                        combinedHTML += '<div style="flex: 0 0 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">';
                        if (variance === null || isNaN(variance)) {
                            combinedHTML += '<span style="color: #888; font-size: 12px; font-weight: bold; text-align: center;"></span>';
                        } else {
                            combinedHTML += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                            combinedHTML += '<span style="font-size: 14px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                            combinedHTML += '<span style="font-size: 12px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                        }
                        combinedHTML += '</div>';
                    } else {
                        // Add invisible spacer after last card to balance layout
                        combinedHTML += '<div style="flex: 0 0 40px;"></div>';
                    }
                });
                
                combinedHTML += '</div></div>';
            });
            
            combinedHTML += '</div>';
            
            // Update single container - NO nested containers!
            var expensesContainer = document.getElementById('full-expenses-chart');
            
            if (expensesContainer) {
                expensesContainer.innerHTML = combinedHTML;
                console.log('Combined cards rendered in single container - no nested containers');
            } else {
                console.error('Expenses container not found');
            }
            
            charts['combined-trends'] = true;
            console.log('Combined Trends cards rendering complete');
            
            // Add hover effects after rendering
            setTimeout(function() {
                var hoverCards = document.querySelectorAll('.hover-card');
                hoverCards.forEach(function(card) {
                    card.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-5px) scale(1.05)';
                        this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    });
                    card.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0px) scale(1)';
                        this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.07)';
                    });
                });
                console.log('Hover effects added to', hoverCards.length, 'cards');
            }, 100);
        }

        function getExpensesOption() {
            var periodsToUse = visiblePeriods.slice(0, 5);
            var expensesData = periodsToUse.map(function(period) {
                return computeCellValue(52, period); // Total Below GP Expenses
            });
            var periodNames = periodsToUse.map(function(period) {
                return period.year + ' ' + (period.month || period.type) + ' ' + period.type;
            });
            
            return {
                title: {
                    text: 'Expenses Trend',
                    left: 'center',
                    textStyle: { fontSize: 16 }
                },
                grid: {
                    left: '8%',
                    right: '8%',
                    bottom: 80,
                    top: 60,
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: periodNames,
                    axisLabel: {
                        rotate: 45,
                        fontSize: 12
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: function(value) {
                            return (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                series: [{
                    data: expensesData,
                    type: 'bar',
                    itemStyle: { color: '#288cfa' }
                }]
            };
        }

        function getProfitOption() {
            var periodsToUse = visiblePeriods.slice(0, 5);
            var profitData = periodsToUse.map(function(period) {
                return computeCellValue(54, period); // Net Profit
            });
            var periodNames = periodsToUse.map(function(period) {
                return period.year + ' ' + (period.month || period.type) + ' ' + period.type;
            });
            
            return {
                title: {
                    text: 'Net Profit Trend',
                    left: 'center',
                    textStyle: { fontSize: 16 }
                },
                grid: {
                    left: '8%',
                    right: '8%',
                    bottom: 80,
                    top: 60,
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: periodNames,
                    axisLabel: {
                        rotate: 45,
                        fontSize: 12
                    }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: {
                        formatter: function(value) {
                            return (value / 1000000).toFixed(1) + 'M';
                        }
                    }
                },
                series: [{
                    data: profitData,
                    type: 'bar',
                    itemStyle: { color: '#2E865F' }
                }]
            };
        }

        // EXACT same as ExpencesChart - Card-based HTML with growth percentages
        function renderExpensesTrend() {
            console.log('renderExpensesTrend called');
            var expensesTrendContainer = document.getElementById('expenses-trend-section');
            if (!expensesTrendContainer) {
                console.error('expenses-trend-section container not found!');
                return;
            }
            console.log('expenses-trend-section container found');
            
            // EXACT same as ExpencesChart - Row 52 (Total Below GP Expenses)
            var KPI_ROW = 52;
            
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            var periodsToUse = visiblePeriods.slice(0, 5);
            
            // Extract data for each period - EXACT same as ExpencesChart
            var cards = periodsToUse.map(function(period, idx) {
                var value = computeCellValue(KPI_ROW, period);
                var sales = computeCellValue(3, period);
                var salesVolume = computeCellValue(7, period);
                var percentOfSales = (typeof sales === 'number' && sales !== 0) ? (value / sales) * 100 : 0;
                var perKg = (typeof salesVolume === 'number' && salesVolume !== 0) ? value / salesVolume : 0;
                
                // Use period-based colors - EXACT same logic as ExpencesChart
                var color;
                if (period.customColor) {
                    var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                    if (scheme) {
                        color = scheme.primary;
                    }
                } else {
                    if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                        color = '#FF6B35';
                    } else if (period.month === 'January') {
                        color = '#FFD700';
                    } else if (period.month === 'Year') {
                        color = '#288cfa';
                    } else if (period.type === 'Budget') {
                        color = '#2E865F';
                    } else {
                        color = defaultColors[idx % defaultColors.length];
                    }
                }
                
                return {
                    periodName: period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type,
                    value: typeof value === 'number' && !isNaN(value) ? value : 0,
                    percentOfSales: percentOfSales,
                    perKg: perKg,
                    color: color,
                    textColor: color === '#FFD700' ? '#333' : '#fff'
                };
            });
            
            // Calculate variances between cards - EXACT same as ExpencesChart
            var variances = cards.map(function(card, idx) {
                if (idx === 0) return null;
                var prev = cards[idx - 1].value;
                if (prev === 0) return null;
                return ((card.value - prev) / Math.abs(prev)) * 100;
            });
            
            // Render HTML - EXACT same structure as ExpencesChart
            var html = '<div style="margin-top: 60px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 20px; width: 95%; margin-left: auto; margin-right: auto; box-sizing: border-box;">';
            html += '<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; color: #333; font-weight: 600;">Expenses Trend</h2>';
            html += '<div style="display: flex; flex-wrap: nowrap; justify-content: space-around; align-items: flex-end; gap: 5px; margin-top: 20px; margin-bottom: 0; width: 100%; padding: 0 24px;">';
            
            cards.forEach(function(card, idx) {
                // Card
                html += '<div style="padding: 12px 15px; border-radius: 6px; background-color: ' + card.color + '; border: 1px solid ' + card.color + '; box-shadow: 0 2px 6px rgba(0,0,0,0.07); min-width: 150px; max-width: 180px; flex: 1; text-align: center; position: relative; overflow: hidden; color: ' + card.textColor + '; display: flex; flex-direction: column; align-items: center;">';
                html += '<div style="font-size: 14px; color: ' + card.textColor + '; font-weight: 500; margin-top: 4px;">' + card.periodName + '</div>';
                html += '<div style="font-weight: bold; font-size: 22px; color: ' + card.textColor + '; margin-top: 8px;">${getUAEDirhamSymbolHTML()} ' + (card.value ? (card.value / 1000000).toFixed(2) + 'M' : '0.00M') + '</div>';
                html += '<div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: ' + card.textColor + '; margin-top: 8px; width: 100%;">';
                html += '<div>' + card.percentOfSales.toFixed(1) + '%/Sls</div>';
                html += '<div>' + card.perKg.toFixed(1) + ' per kg</div>';
                html += '</div></div>';
                
                // Variance badge between cards
                if (idx < cards.length - 1) {
                    var variance = variances[idx + 1];
                    var badgeColor = '#888', arrow = '–';
                    if (variance !== null && !isNaN(variance)) {
                        if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                        else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                    }
                    
                    html += '<div style="align-self: center; margin: 0 2px; display: flex; flex-direction: column; align-items: center; min-width: 40px; width: 40px; height: 60px; justify-content: center;">';
                    if (variance === null || isNaN(variance)) {
                        html += '<span style="color: #888; font-size: 16px; font-weight: bold; text-align: center;">N/A</span>';
                    } else {
                        html += '<span style="font-size: 22px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                        html += '<span style="font-size: 18px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                        html += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                    }
                    html += '</div>';
                }
            });
            
            html += '</div></div>';
            expensesTrendContainer.innerHTML = html;
            console.log('Expenses Trend HTML rendered, cards count:', cards.length);
        }

        // EXACT same as Profitchart - Card-based HTML with growth percentages
        function renderProfitTrends() {
            console.log('renderProfitTrends called');
            var profitTrendsContainer = document.getElementById('profit-trends-section');
            if (!profitTrendsContainer) {
                console.error('profit-trends-section container not found!');
                return;
            }
            console.log('profit-trends-section container found');
            
            // EXACT same as Profitchart - 3 KPIs
            var PROFIT_KPIS = [
                { label: 'Net Profit', rowIndex: 54 },
                { label: 'EBIT', rowIndex: 'calculated', isEBIT: true },
                { label: 'EBITDA', rowIndex: 56 }
            ];
            
            var colorSchemes = [
                { name: 'blue', label: 'Blue', primary: '#288cfa', secondary: '#103766', isDark: true },
                { name: 'green', label: 'Green', primary: '#2E865F', secondary: '#C6F4D6', isDark: true },
                { name: 'yellow', label: 'Yellow', primary: '#FFD700', secondary: '#FFFDE7', isDark: false },
                { name: 'orange', label: 'Orange', primary: '#FF6B35', secondary: '#FFE0B2', isDark: false },
                { name: 'boldContrast', label: 'Bold Contrast', primary: '#003366', secondary: '#FF0000', isDark: true }
            ];
            var defaultColors = ['#FFD700', '#288cfa', '#003366', '#91cc75', '#5470c6'];
            
            var periodsToUse = visiblePeriods.slice(0, 5);
            
            var html = '<div style="margin-top: 30px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); padding: 20px; width: 95%; margin-left: auto; margin-right: auto; box-sizing: border-box;">';
            
            // Render each KPI - EXACT same as Profitchart
            PROFIT_KPIS.forEach(function(kpi, rowIdx) {
                // Build cards for this KPI
                var cards = periodsToUse.map(function(period, idx) {
                    var value;
                    if (kpi.isEBIT) {
                        // Calculate EBIT as Net Profit + Bank Interest (Row 54 + Row 42)
                        var netProfit = computeCellValue(54, period);
                        var bankInterest = computeCellValue(42, period);
                        value = (typeof netProfit === 'number' ? netProfit : 0) + (typeof bankInterest === 'number' ? bankInterest : 0);
                    } else {
                        value = computeCellValue(kpi.rowIndex, period);
                    }
                    
                    var sales = computeCellValue(3, period);
                    var salesVolume = computeCellValue(7, period);
                    var percentOfSales = (typeof sales === 'number' && sales !== 0) ? (value / sales) * 100 : 0;
                    var perKg = (typeof salesVolume === 'number' && salesVolume !== 0) ? value / salesVolume : 0;
                    
                    // Use period-based colors - EXACT same logic as Profitchart
                    var color;
                    if (period.customColor) {
                        var scheme = colorSchemes.find(function(s) { return s.name === period.customColor; });
                        if (scheme) {
                            color = scheme.primary;
                        }
                    } else {
                        if (period.month === 'Q1' || period.month === 'Q2' || period.month === 'Q3' || period.month === 'Q4') {
                            color = '#FF6B35';
                        } else if (period.month === 'January') {
                            color = '#FFD700';
                        } else if (period.month === 'Year') {
                            color = '#288cfa';
                        } else if (period.type === 'Budget') {
                            color = '#2E865F';
                        } else {
                            color = defaultColors[idx % defaultColors.length];
                        }
                    }
                    
                    return {
                        periodName: period.year + ' ' + (period.isCustomRange ? period.displayName : (period.month || '')) + ' ' + period.type,
                        value: typeof value === 'number' && !isNaN(value) ? value : 0,
                        percentOfSales: percentOfSales,
                        perKg: perKg,
                        color: color,
                        textColor: color === '#FFD700' ? '#333' : '#fff'
                    };
                });
                
                // Calculate variances between cards - EXACT same as Profitchart
                var variances = cards.map(function(card, idx) {
                    if (idx === 0) return null;
                    var prev = cards[idx - 1].value;
                    if (prev === 0) return null;
                    return ((card.value - prev) / Math.abs(prev)) * 100;
                });
                
                // Render HTML for this KPI - EXACT same structure as Profitchart
                html += '<div style="margin-bottom: ' + (rowIdx < PROFIT_KPIS.length - 1 ? '30px' : '0') + ';">';
                html += '<h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; color: #333; font-weight: 600;">' + kpi.label + ' Trend</h2>';
                html += '<div style="display: flex; flex-wrap: nowrap; justify-content: space-around; align-items: flex-end; gap: 5px; margin-top: 10px; margin-bottom: 0; width: 100%; padding: 0 24px;">';
                
                cards.forEach(function(card, idx) {
                    // Card
                    html += '<div style="padding: 12px 15px; border-radius: 6px; background-color: ' + card.color + '; border: 1px solid ' + card.color + '; box-shadow: 0 2px 6px rgba(0,0,0,0.07); min-width: 150px; max-width: 180px; flex: 1; text-align: center; position: relative; overflow: hidden; color: ' + card.textColor + '; display: flex; flex-direction: column; align-items: center;">';
                    html += '<div style="font-size: 14px; color: ' + card.textColor + '; font-weight: 500; margin-top: 4px;">' + card.periodName + '</div>';
                    html += '<div style="font-weight: bold; font-size: 22px; color: ' + card.textColor + '; margin-top: 8px;">${getUAEDirhamSymbolHTML()} ' + (card.value ? (card.value / 1000000).toFixed(2) + 'M' : '0.00M') + '</div>';
                    html += '<div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: ' + card.textColor + '; margin-top: 8px; width: 100%;">';
                    html += '<div>' + card.percentOfSales.toFixed(1) + '%/Sls</div>';
                    html += '<div>' + card.perKg.toFixed(1) + ' per kg</div>';
                    html += '</div></div>';
                    
                    // Variance badge between cards
                    if (idx < cards.length - 1) {
                        var variance = variances[idx + 1];
                        var badgeColor = '#888', arrow = '–';
                        if (variance !== null && !isNaN(variance)) {
                            if (variance > 0) { badgeColor = '#2E865F'; arrow = '▲'; }
                            else if (variance < 0) { badgeColor = '#cf1322'; arrow = '▼'; }
                        }
                        
                        html += '<div style="align-self: center; margin: 0 2px; display: flex; flex-direction: column; align-items: center; min-width: 40px; width: 40px; height: 60px; justify-content: center;">';
                        if (variance === null || isNaN(variance)) {
                            html += '<span style="color: #888; font-size: 16px; font-weight: bold; text-align: center;"></span>';
                        } else {
                            html += '<span style="font-size: 22px; font-weight: bold; color: ' + badgeColor + '; line-height: 1;">' + arrow + '</span>';
                            html += '<span style="font-size: 18px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">' + Math.abs(variance).toFixed(1) + '</span>';
                            html += '<span style="font-size: 16px; font-weight: bold; color: ' + badgeColor + '; line-height: 1.1;">%</span>';
                        }
                        html += '</div>';
                    }
                });
                
                html += '</div></div>';
            });
            
            html += '</div>';
            profitTrendsContainer.innerHTML = html;
            console.log('Profit Trends HTML rendered, KPIs count:', PROFIT_KPIS.length, 'periods count:', periodsToUse.length);
        }
    </script>
</body>
</html>`;

      // Create blob and download
      console.log('📄 HTML content length:', html.length);
      
      const blob = new Blob([html], { type: 'text/html' });
      console.log('📦 Blob created:', { size: blob.size, type: blob.type });
      
      const url = URL.createObjectURL(blob);
      console.log('🔗 Object URL created:', url.substring(0, 50) + '...');
      
      const link = document.createElement('a');
      link.href = url;
      
      const fileNameDivision = (selectedDivision || 'Division').replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, ' ').trim();
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `${fileNameDivision} - Comprehensive Report - ${timestamp}.html`;
      
      console.log('📁 Download details:', {
        fileName: link.download,
        blobSize: blob.size,
        url: url.substring(0, 50) + '...'
      });
      
      // Add some attributes to ensure download works
      link.style.display = 'none';
      link.setAttribute('download', link.download);
      
      document.body.appendChild(link);
      console.log('🔽 Triggering download...');
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      localStorage.removeItem('exportHideSalesRep'); // Clean up temporary storage
      localStorage.removeItem('exportHideBudgetForecast'); // Clean up temporary storage
      console.log('✅ Download triggered and cleanup completed');
      
      console.log('[SUCCESS] Comprehensive Charts HTML export completed successfully');
      
    } catch (err) {
      console.error('[ERROR] Comprehensive Charts export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      id="multichart-export-btn"
      onClick={() => {
        console.log('🔥 Export All Charts button clicked');
        handleExport();
      }}
      disabled={isExporting || !dataGenerated}
      className="export-btn html-export"
      style={{ marginLeft: '10px' }}
    >
      {isExporting ? 'Exporting...' : 'Export HTML'}
    </button>
  );
};

export default MultiChartHTMLExport;