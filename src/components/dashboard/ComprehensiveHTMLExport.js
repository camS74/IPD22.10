import React, { useState, useEffect, useCallback } from 'react';
import { useExcelData } from '../../contexts/ExcelDataContext';
import { useFilter } from '../../contexts/FilterContext';
import { KPI_CSS_CONTENT } from '../../utils/sharedStyles';
import ipTransparentLogo from '../../assets/IP transparent-.jpg';

const ComprehensiveHTMLExport = ({ tableRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const { selectedDivision, data, excelData } = useExcelData();
  const { columnOrder, basePeriodIndex, isColumnVisibleInChart } = useFilter();

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
      console.warn('Could not load IP transparent logo for comprehensive export:', error);
      return null;
    }
  };

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

  // Card configuration: KPI Summary first, then Charts, then Tables
  const cardConfigs = [
    // KPI Summary - First Row
    { id: 'kpi-summary', title: 'KPI Summary', icon: '📈', description: 'Key performance indicators' },
    
    // Charts - Second Row
    { id: 'sales-volume-analysis', title: 'Sales & Volume Analysis', icon: '📊', description: 'Sales and volume trends visualization' },
    { id: 'margin-analysis', title: 'Margin Analysis', icon: '📋', description: 'Profit margin insights' },
    { id: 'manufacturing-cost', title: 'Manufacturing Cost', icon: '🏭', description: 'Direct cost analysis' },
    { id: 'below-gp-expenses', title: 'Below GP Expenses', icon: '📊', description: 'Operating expenses breakdown' },
    { id: 'cost-profitability-trend', title: 'Cost & Profitability Trend', icon: '📈', description: 'Profitability trend analysis' },
    
    // Tables - Third Row (P&L Financial first)
    { id: 'financial-pl', title: 'P&L Financial', icon: '💰', description: 'Profit & Loss statement' },
    { id: 'product-group', title: 'Product Group', icon: '📊', description: 'Product group analysis and metrics' },
    { id: 'sales-country', title: 'Sales by Country', icon: '🌍', description: 'Geographic sales distribution' },
    { id: 'sales-customer', title: 'Sales by Customer', icon: '👥', description: 'Customer sales analysis' }
  ];

  // Capture Product Group table HTML
  const captureProductGroupTable = async () => {

    
    // Wait a bit more for table to fully render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // APPROACH 1: Look for Product Group table by class
    const productGroupTable = document.querySelector('table.product-group-table');
    
    if (productGroupTable) {
      
      return productGroupTable.outerHTML;
    }
    
    // APPROACH 2: Look for table with product-header-row (unique to Product Group)
    const tableWithProductHeaders = document.querySelector('table .product-header-row')?.closest('table');
    
    if (tableWithProductHeaders) {
      
      return tableWithProductHeaders.outerHTML;
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
      return productGroupTableByContent.outerHTML;
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
      return fallbackTable.outerHTML;
    }
    
    throw new Error('Product Group table not found. Please visit the Product Group tab first.');
  };

  // Capture P&L Financial table HTML
  const capturePLFinancialTable = async () => {
    
    
    // Look for the P&L Financial table in the DOM
    const allTables = Array.from(document.querySelectorAll('table'));
    console.log('Available tables count for P&L:', allTables.length);
    
    // Find table that looks like P&L Financial - it should have financial metrics
    const plTable = allTables.find(table => {
      const tableText = table.textContent || '';
      const hasFinancialMetrics = tableText.includes('Revenue') || 
                                 tableText.includes('Sales') || 
                                 tableText.includes('Gross Profit') ||
                                 tableText.includes('EBITDA') ||
                                 tableText.includes('Operating') ||
                                 tableText.includes('Net Income') ||
                                 tableText.includes('Cost of Goods') ||
                                 tableText.includes('Margin');
      
      const isInTableView = table.closest('.table-view');
      
      console.log(`Checking table for P&L:`, {
        hasFinancialMetrics,
        isInTableView: !!isInTableView,
        classes: table.className,
        textPreview: tableText.substring(0, 100)
      });
      
      return hasFinancialMetrics && isInTableView;
    });
    
    if (plTable) {
      console.log('✅ Found P&L Financial table');
      return plTable.outerHTML;
    }
    
    // Fallback: look for any table in table-view that might be the financial table
    const fallbackTable = allTables.find(table => {
      const tableView = table.closest('.table-view');
      return tableView && table.querySelector('thead') && table.querySelector('tbody');
    });
    
    if (fallbackTable) {
      console.log('🎯 Using fallback table for P&L Financial');
      return fallbackTable.outerHTML;
    }
    
    throw new Error('P&L Financial table not found. Please visit the P&L tab first.');
  };

  // Capture Sales by Country table HTML
  const captureSalesCountryTable = async () => {
    
    
    // Look for the Sales by Country table in the DOM
    const allTables = Array.from(document.querySelectorAll('table'));
    console.log('Available tables count for Sales Country:', allTables.length);
    
    // Find table that looks like Sales by Country - it should have country names
    const countryTable = allTables.find(table => {
      const tableText = table.textContent || '';
      const hasCountryData = tableText.includes('UAE') || 
                            tableText.includes('KSA') || 
                            tableText.includes('Egypt') ||
                            tableText.includes('Country') ||
                            tableText.includes('Total Sales') ||
                            tableText.includes('%');
      
      const isInTableView = table.closest('.table-view') || table.closest('.sales-country-table');
      
      console.log(`Checking table for Sales Country:`, {
        hasCountryData,
        isInTableView: !!isInTableView,
        classes: table.className,
        textPreview: tableText.substring(0, 100)
      });
      
      return hasCountryData && isInTableView;
    });
    
    if (countryTable) {
      console.log('✅ Found Sales by Country table');
      return countryTable.outerHTML;
    }
    
    // Fallback: look for any table that might be the sales country table
    const fallbackTable = allTables.find(table => {
      const tableView = table.closest('.table-view');
      const hasPercentage = table.textContent?.includes('%');
      return tableView && hasPercentage && table.querySelector('thead') && table.querySelector('tbody');
    });
    
    if (fallbackTable) {
      console.log('🎯 Using fallback table for Sales by Country');
      return fallbackTable.outerHTML;
    }
    
    throw new Error('Sales by Country table not found. Please visit the Sales by Country tab first.');
  };

  // Capture Sales by Customer table HTML
  const captureSalesCustomerTable = async () => {
    console.log('🔍 Capturing Sales by Customer table...');
    
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
    
    if (customerTable) {
      console.log('✅ Found Sales by Customer table');
      return customerTable.outerHTML;
    }
    
    // Fallback: look for any table that might be the sales customer table
    const fallbackTable = allTables.find(table => {
      const tableView = table.closest('.table-view');
      const hasSalesData = table.textContent?.includes('Sales') || table.textContent?.includes('Amount');
      return tableView && hasSalesData && table.querySelector('thead') && table.querySelector('tbody');
    });
    
    if (fallbackTable) {
      console.log('🎯 Using fallback table for Sales by Customer');
      return fallbackTable.outerHTML;
    }
    
    throw new Error('Sales by Customer table not found. Please visit the Sales by Customer tab first.');
  };

  // Helper function to capture element as base64 image (same as htmlExport.js)
  const captureElementAsBase64 = async (element, options = {}) => {
    try {
      // Import html2canvas dynamically 
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        ignoreElements: (element) => {
          // Ignore elements that might cause artifacts
          return element.classList?.contains('pdf-export-button') || 
                 element.style?.boxShadow?.includes('inset');
        },
        ...options
      });
      
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas capture resulted in empty image');
        return null;
      }
      
      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error('Error capturing element:', error);
      return null;
    }
  };

  // Capture Sales & Volume Chart (Bar Chart)
  const captureSalesVolumeChart = async () => {
    
    try {
      // Find the main chart container - following exact same logic as htmlExport.js
      const mainContainer = document.querySelector('[style*="display: flex"][style*="flex-direction: column"][style*="padding: 16"]');
      
      if (!mainContainer) {
        console.warn('Main chart container not found');
        // Fallback: look for the specific bar chart container
        const fallbackContainer = document.querySelector('.modern-margin-gauge-panel');
        if (fallbackContainer) {
          console.log('Using fallback container');
          const chartImage = await captureElementAsBase64(fallbackContainer, {
            scale: 5.0,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            removeContainer: true,
            width: fallbackContainer.offsetWidth,
            height: fallbackContainer.offsetHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
          });
          
          if (chartImage) {
            return `<div class="chart-container">
                      <img src="${chartImage}" alt="Sales & Volume Chart" style="width: 100%; height: auto; max-width: 100%;">
                    </div>`;
          }
        }
        throw new Error('Chart container not found');
      }

      // Get the first child (Sales and Volume Analysis chart)
      const children = Array.from(mainContainer.children).filter(child => {
        const rect = child.getBoundingClientRect();
        const hasStyle = child.style.marginTop;
        const isNotAI = !child.textContent.toLowerCase().includes('ai') && 
                        !child.innerHTML.toLowerCase().includes('writeup');
        return rect.width > 300 && rect.height > 200 && hasStyle && isNotAI;
      });

      if (children.length === 0) {
        throw new Error('No valid chart containers found');
      }

      const salesVolumeContainer = children[0]; // First chart = Sales & Volume Analysis
      
      // Hide the internal chart title before capture
      const titleElements = salesVolumeContainer.querySelectorAll('span');
      const originalTitleDisplays = [];
      
      titleElements.forEach((element, index) => {
        const textContent = element.textContent?.trim().toLowerCase();
        const style = element.style;
        
        // Target the specific title spans: "Sales and Volume" (fontSize: 28) and "(AED)" (fontSize: 18)
        if ((textContent === 'sales and volume' && style.fontSize === '28px') ||
            (textContent === '(aed)' && style.fontSize === '18px')) {
          originalTitleDisplays[index] = element.style.display;
          element.style.display = 'none';
          console.log('🚫 Hiding chart title element:', textContent);
        }
      });
      
      // Hide tooltips and resize charts - same as htmlExport.js
      const echartsElements = salesVolumeContainer.querySelectorAll('.echarts-for-react');
      echartsElements.forEach(echartsEl => {
        if (typeof echartsEl.getEchartsInstance === 'function') {
          const inst = echartsEl.getEchartsInstance();
          if (inst) {
            inst.dispatchAction({ type: 'hideTip' });
            inst.resize();
          }
        }
      });

      // Wait for chart to settle
      await new Promise(r => setTimeout(r, 500));

      // Capture with exact same settings as htmlExport.js
      const salesVolumeImage = await captureElementAsBase64(salesVolumeContainer, {
        scale: 5.0,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        width: salesVolumeContainer.offsetWidth,
        height: salesVolumeContainer.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Restore chart title visibility
      titleElements.forEach((element, index) => {
        if (originalTitleDisplays[index] !== undefined) {
          element.style.display = originalTitleDisplays[index];
          console.log('✅ Restored chart title element visibility');
        }
      });

      if (salesVolumeImage) {
        console.log('✅ Successfully captured Sales & Volume chart');
        return `<div class="chart-container">
                  <img src="${salesVolumeImage}" alt="Sales & Volume Chart" style="width: 100%; height: auto; max-width: 100%;">
                </div>`;
      } else {
        throw new Error('Failed to capture chart image');
      }

    } catch (error) {
      console.error('Error capturing Sales & Volume chart:', error);
      throw new Error(`Sales & Volume Chart capture failed: ${error.message}`);
    }
  };

  // Capture Margin over Material Chart (Gauge Chart)
  const captureMarginAnalysisChart = async () => {
    
    try {
      // Find the main chart container - following exact same logic as htmlExport.js
      const mainContainer = document.querySelector('[style*="display: flex"][style*="flex-direction: column"][style*="padding: 16"]');
      
      if (!mainContainer) {
        console.warn('Main chart container not found');
        // Fallback: look for the specific margin gauge container
        const fallbackContainer = document.querySelector('.modern-margin-gauge-panel');
        if (fallbackContainer) {
          console.log('Using fallback container for margin chart');
          const chartImage = await captureElementAsBase64(fallbackContainer, {
            scale: 5.0,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            removeContainer: true,
            width: fallbackContainer.offsetWidth,
            height: fallbackContainer.offsetHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
          });
          
          if (chartImage) {
            return `<div class="chart-container">
                      <img src="${chartImage}" alt="Margin over Material Chart" style="width: 100%; height: auto; max-width: 100%;">
                    </div>`;
          }
        }
        throw new Error('Margin chart container not found');
      }

      // Get the second child (Margin over Material chart) - same as htmlExport.js
      const children = Array.from(mainContainer.children).filter(child => {
        const rect = child.getBoundingClientRect();
        const hasStyle = child.style.marginTop;
        const isNotAI = !child.textContent.toLowerCase().includes('ai') && 
                        !child.innerHTML.toLowerCase().includes('writeup');
        return rect.width > 300 && rect.height > 200 && hasStyle && isNotAI;
      });

      if (children.length < 2) {
        throw new Error('Margin chart container not found - need at least 2 chart containers');
      }

      const marginContainer = children[1]; // Second chart = Margin over Material
      
      // Hide the internal chart title before capture
      const titleElements = marginContainer.querySelectorAll('h2.modern-gauge-heading');
      const originalTitleDisplays = [];
      
      titleElements.forEach((element, index) => {
        const textContent = element.textContent?.trim().toLowerCase();
        
        // Target the specific title: "Margin over Material"
        if (textContent === 'margin over material') {
          originalTitleDisplays[index] = element.style.display;
          element.style.display = 'none';
          console.log('🚫 Hiding margin chart title element:', textContent);
        }
      });
      
      // Hide tooltips and resize charts - same as htmlExport.js
      const echartsElements = marginContainer.querySelectorAll('.echarts-for-react');
      echartsElements.forEach(echartsEl => {
        if (typeof echartsEl.getEchartsInstance === 'function') {
          const inst = echartsEl.getEchartsInstance();
          if (inst) {
            inst.dispatchAction({ type: 'hideTip' });
            inst.resize();
          }
        }
      });

      // Wait for chart to settle
      await new Promise(r => setTimeout(r, 500));

      // Capture with exact same settings as htmlExport.js
      const marginImage = await captureElementAsBase64(marginContainer, {
        scale: 5.0,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        width: marginContainer.offsetWidth,
        height: marginContainer.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Restore chart title visibility
      titleElements.forEach((element, index) => {
        if (originalTitleDisplays[index] !== undefined) {
          element.style.display = originalTitleDisplays[index];
          console.log('✅ Restored margin chart title element visibility');
        }
      });

      if (marginImage) {
        console.log('✅ Successfully captured Margin over Material chart');
        return `<div class="chart-container">
                  <img src="${marginImage}" alt="Margin over Material Chart" style="width: 100%; height: auto; max-width: 100%;">
                </div>`;
      } else {
        throw new Error('Failed to capture margin chart image');
      }

    } catch (error) {
      console.error('Error capturing Margin over Material chart:', error);
      throw new Error(`Margin over Material Chart capture failed: ${error.message}`);
    }
  };

  // Capture Manufacturing Cost Chart
  const captureManufacturingCostChart = async () => {
    
    try {
      // Find the main chart container - following exact same logic as htmlExport.js
      const mainContainer = document.querySelector('[style*="display: flex"][style*="flex-direction: column"][style*="padding: 16"]');
      
      if (!mainContainer) {
        console.warn('Main chart container not found');
        // Fallback: look for the specific manufacturing cost container
        const fallbackContainer = document.querySelector('.modern-margin-gauge-panel');
        if (fallbackContainer) {
          console.log('Using fallback container for manufacturing cost chart');
          const chartImage = await captureElementAsBase64(fallbackContainer, {
            scale: 5.0, // Increased to 5.0 for ultra-high resolution
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            removeContainer: true,
            width: fallbackContainer.offsetWidth,
            height: fallbackContainer.offsetHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
          });
          
          if (chartImage) {
            return `<div class="chart-container">
                      <img src="${chartImage}" alt="Manufacturing Cost Chart" style="width: 100%; height: auto; max-width: 100%;">
                    </div>`;
          }
        }
        throw new Error('Manufacturing Cost chart container not found');
      }

      // Get the third child (Manufacturing Cost chart)
      const children = Array.from(mainContainer.children).filter(child => {
        const rect = child.getBoundingClientRect();
        const hasStyle = child.style.marginTop;
        const isNotAI = !child.textContent.toLowerCase().includes('ai') && 
                        !child.innerHTML.toLowerCase().includes('writeup');
        return rect.width > 300 && rect.height > 200 && hasStyle && isNotAI;
      });

      if (children.length < 3) {
        throw new Error('Manufacturing Cost chart container not found - need at least 3 chart containers');
      }

      const manufacturingContainer = children[2]; // Third chart = Manufacturing Cost
      
      // Hide the internal chart title before capture
      const titleElements = manufacturingContainer.querySelectorAll('h2.modern-gauge-heading');
      const originalTitleDisplays = [];
      
      titleElements.forEach((element, index) => {
        const textContent = element.textContent?.trim().toLowerCase();
        
        // Target the specific title: "Manufacturing Cost"
        if (textContent === 'manufacturing cost') {
          originalTitleDisplays[index] = element.style.display;
          element.style.display = 'none';
          console.log('🚫 Hiding manufacturing cost chart title element:', textContent);
        }
      });
      
      // Hide tooltips and resize charts - same as htmlExport.js
      const echartsElements = manufacturingContainer.querySelectorAll('.echarts-for-react');
      echartsElements.forEach(echartsEl => {
        if (typeof echartsEl.getEchartsInstance === 'function') {
          const inst = echartsEl.getEchartsInstance();
          if (inst) {
            inst.dispatchAction({ type: 'hideTip' });
            inst.resize();
          }
        }
      });

      // Wait longer for chart to settle and render properly
      await new Promise(r => setTimeout(r, 1000));

      // Capture with higher resolution settings
      const manufacturingImage = await captureElementAsBase64(manufacturingContainer, {
        scale: 5.0, // Increased to 5.0 for ultra-high resolution
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        width: manufacturingContainer.offsetWidth,
        height: manufacturingContainer.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Restore chart title visibility
      titleElements.forEach((element, index) => {
        if (originalTitleDisplays[index] !== undefined) {
          element.style.display = originalTitleDisplays[index];
          console.log('✅ Restored manufacturing cost chart title element visibility');
        }
      });

      if (manufacturingImage) {
        console.log('✅ Successfully captured Manufacturing Cost chart');
        return `<div class="chart-container">
                  <img src="${manufacturingImage}" alt="Manufacturing Cost Chart" style="width: 100%; height: auto; max-width: 100%;">
                </div>`;
      } else {
        throw new Error('Failed to capture manufacturing cost chart image');
      }

    } catch (error) {
      console.error('Error capturing Manufacturing Cost chart:', error);
      throw new Error(`Manufacturing Cost Chart capture failed: ${error.message}`);
    }
  };

  // Capture Below GP Expenses Chart (Index 3) - Following htmlExport.js approach
  const captureBelowGPExpensesChart = async () => {
    console.log('🔍 Capturing Below GP Expenses Chart...');
    try {
      const mainContainer = document.querySelector('[style*="display: flex"][style*="flex-direction: column"][style*="padding: 16"]');
      if (!mainContainer) throw new Error('Main chart container not found');

      const children = Array.from(mainContainer.children).filter(child => {
        const rect = child.getBoundingClientRect();
        const hasStyle = child.style.marginTop;
        const isNotAI = !child.textContent.toLowerCase().includes('ai') && !child.innerHTML.toLowerCase().includes('writeup');
        return rect.width > 300 && rect.height > 200 && hasStyle && isNotAI;
      });

      if (children.length < 4) throw new Error('Below GP Expenses chart not found - need at least 4 containers');
      const container = children[3]; // Fourth chart

      // Hide internal title
      const titleElements = container.querySelectorAll('h2.modern-gauge-heading');
      const originalDisplays = [];
      titleElements.forEach((el, idx) => {
        if (el.textContent?.trim().toLowerCase() === 'below gross profit expenses') {
          originalDisplays[idx] = el.style.display;
          el.style.display = 'none';
        }
      });

      // Hide tooltips and resize charts
      const echartsElements = container.querySelectorAll('.echarts-for-react');
      echartsElements.forEach(echartsEl => {
        if (typeof echartsEl.getEchartsInstance === 'function') {
          const inst = echartsEl.getEchartsInstance();
          if (inst) {
            inst.dispatchAction({ type: 'hideTip' });
            inst.resize();
          }
        }
      });

      // Wait longer for chart to settle and render properly
      await new Promise(r => setTimeout(r, 1000));
      
      const image = await captureElementAsBase64(container, {
        scale: 5.0, // Increased to 5.0 for ultra-high resolution
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        width: container.offsetWidth,
        height: container.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Restore titles
      titleElements.forEach((el, idx) => {
        if (originalDisplays[idx] !== undefined) el.style.display = originalDisplays[idx];
      });

      if (image) {
        console.log('✅ Below GP Expenses chart captured');
        return `<div class="chart-container"><img src="${image}" alt="Below GP Expenses Chart" style="width: 100%; height: auto; max-width: 100%;"></div>`;
      } else {
        throw new Error('Failed to capture image');
      }
    } catch (error) {
      console.error('Below GP Expenses capture error:', error);
      throw new Error(`Below GP Expenses capture failed: ${error.message}`);
    }
  };

  // Capture Cost & Profitability Trend Chart (Index 4) - Following htmlExport.js approach
  const captureCostProfitabilityTrendChart = async () => {
    console.log('🔍 Capturing Cost & Profitability Trend Chart...');
    try {
      const mainContainer = document.querySelector('[style*="display: flex"][style*="flex-direction: column"][style*="padding: 16"]');
      if (!mainContainer) throw new Error('Main chart container not found');

      const children = Array.from(mainContainer.children).filter(child => {
        const rect = child.getBoundingClientRect();
        const hasStyle = child.style.marginTop;
        const isNotAI = !child.textContent.toLowerCase().includes('ai') && !child.innerHTML.toLowerCase().includes('writeup');
        return rect.width > 300 && rect.height > 200 && hasStyle && isNotAI;
      });

      if (children.length < 5) throw new Error('Cost & Profitability chart not found - need at least 5 containers');
      const container = children[4]; // Fifth chart (combinedTrendsRef contains both ExpencesChart + Profitchart)

      // Hide internal titles for both ExpencesChart and Profitchart
      const titleElements = container.querySelectorAll('h2.modern-gauge-heading');
      const originalDisplays = [];
      titleElements.forEach((el, idx) => {
        const text = el.textContent?.trim().toLowerCase();
        if (text?.includes('trend') || text?.includes('expense') || text?.includes('profit')) {
          originalDisplays[idx] = el.style.display;
          el.style.display = 'none';
        }
      });

      await new Promise(r => setTimeout(r, 500));
      const image = await captureElementAsBase64(container, {
        scale: 5.0,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        width: container.offsetWidth,
        height: container.offsetHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });

      // Restore titles
      titleElements.forEach((el, idx) => {
        if (originalDisplays[idx] !== undefined) el.style.display = originalDisplays[idx];
      });

      if (image) {
        console.log('✅ Cost & Profitability Trend chart captured');
        return `<div class="chart-container"><img src="${image}" alt="Cost & Profitability Trend Chart" style="width: 100%; height: auto; max-width: 100%;"></div>`;
      } else {
        throw new Error('Failed to capture image');
      }
    } catch (error) {
      console.error('Cost & Profitability Trend capture error:', error);
      throw new Error(`Cost & Profitability Trend capture failed: ${error.message}`);
    }
  };

  // Capture live KPI data from the current active KPIExecutiveSummary component
  const captureLiveKPIData = () => {
    console.log('🔍 Capturing live KPI data from KPIExecutiveSummary component...');
    
    try {
      // Find the KPI dashboard element
      const kpiDashboard = document.querySelector('.kpi-dashboard');
      if (!kpiDashboard) {
        throw new Error('KPI dashboard not found. Make sure KPI tab is active.');
      }

      const kpiData = {
        '💰 Financial Performance': [],
        '📦 Product Performance': [],
        '🌍 Geographic Distribution': [],
        '👥 Customer Insights': []
      };

      // Extract Financial Performance data
      const financialSections = kpiDashboard.querySelectorAll('.kpi-section');
      
      financialSections.forEach(section => {
        const sectionTitle = section.querySelector('.kpi-section-title')?.textContent?.trim();
        
        if (sectionTitle?.includes('💰 Financial Performance')) {
          const cards = section.querySelectorAll('.kpi-card');
          cards.forEach(card => {
            const icon = card.querySelector('.kpi-icon')?.textContent?.trim() || '';
            const label = card.querySelector('.kpi-label')?.textContent?.trim() || '';
            const value = card.querySelector('.kpi-value')?.textContent?.trim() || '';
            const trend = card.querySelector('.kpi-trend')?.textContent?.trim() || '';
            
            if (label && value) {
              kpiData['💰 Financial Performance'].push({
                icon, label, value, trend, isLarge: false
              });
            }
          });
        }
        
                 else if (sectionTitle?.includes('📦 Product Performance')) {
           // IMPROVED: Capture cards by their container structure to preserve Process vs Material distinction
           const cardContainers = section.querySelectorAll('.kpi-cards');
           cardContainers.forEach((container, containerIndex) => {
             const cards = container.querySelectorAll('.kpi-card');
           
             cards.forEach((card, cardIndex) => {
             const icon = card.querySelector('.kpi-icon')?.textContent?.trim() || '';
             const label = card.querySelector('.kpi-label')?.textContent?.trim() || '';
             const trend = card.querySelector('.kpi-trend')?.textContent?.trim() || '';
             const isLarge = card.classList.contains('large');
             
             // SPECIAL HANDLING for Top Revenue Drivers - extract individual lines
             let value = '';
             if (label.toLowerCase().includes('top revenue drivers')) {
               const valueElement = card.querySelector('.kpi-value');
               if (valueElement) {
                 // Extract individual product lines from the div structure
                 const productLines = valueElement.querySelectorAll('div > div');
                 
                 let extractedData = {
                   products: []
                 };
                 
                 productLines.forEach((div, index) => {
                   // Extract data from individual span elements within each div
                   const spans = div.querySelectorAll('span');
                   
                   if (spans.length >= 4) {
                     // Expected structure: icon, name, sales, growth
                     const icon = spans[0]?.textContent?.trim();
                     const name = spans[1]?.textContent?.trim();
                     const sales = spans[2]?.textContent?.trim();
                     const growth = spans[3]?.textContent?.trim();
                     const rank = index + 1; // Calculate rank from index
                     
                     if (icon && name && sales && growth) {
                       extractedData.products.push({
                         rank: rank,
                         icon: icon,
                         name: name,
                         sales: sales,
                         growth: growth
                       });
                     }
                   } else {
                     // Fallback: parse from full text if span structure is different
                   const fullText = div.textContent?.trim();
                   
                   if (fullText) {
                       // Parse format: "🥇 Product Name 23.0% of sales ▲ 89% growth"
                       const parts = fullText.split(/\s+/);
                       if (parts.length >= 5) {
                         const icon = parts[0];
                         const rank = index + 1; // Calculate rank from index
                         
                         // Find the sales percentage index
                         const salesIndex = parts.findIndex(p => p.includes('%') && p.includes('of'));
                         if (salesIndex > 1) {
                           const name = parts.slice(1, salesIndex - 2).join(' ');
                           const sales = `${parts[salesIndex - 2]} ${parts[salesIndex - 1]} ${parts[salesIndex]}`;
                           const growth = parts.slice(salesIndex + 1).join(' ');
                           
                           if (icon && name && sales && growth) {
                       extractedData.products.push({
                               rank: rank,
                               icon: icon,
                               name: name,
                               sales: sales,
                               growth: growth
                             });
                           }
                         }
                       }
                     }
                   }
                 });
                 
                 value = JSON.stringify(extractedData); // Store as structured data
               }
             } else {
               value = card.querySelector('.kpi-value')?.textContent?.trim() || '';
             }
             
             if (label && value) {
               // Tag cards with their container position to distinguish Process vs Material
               const categoryType = containerIndex === 3 ? 'process' : 
                                  containerIndex === 4 ? 'material' : 'main';
               
               kpiData['📦 Product Performance'].push({
                 icon, label, value, trend, isLarge, categoryType, containerIndex
               });
             }
           });
           });
         }
        
        else if (sectionTitle?.includes('🌍 Geographic Distribution')) {
          const cards = section.querySelectorAll('.kpi-card');
          cards.forEach(card => {
            const icon = card.querySelector('.kpi-icon')?.textContent?.trim() || '';
            const label = card.querySelector('.kpi-label')?.textContent?.trim() || '';
            const value = card.querySelector('.kpi-value')?.textContent?.trim() || '';
            const trend = card.querySelector('.kpi-trend')?.textContent?.trim() || '';
            const isLarge = card.classList.contains('large');
            
            if (label && value) {
              kpiData['🌍 Geographic Distribution'].push({
                icon, label, value, trend, isLarge
              });
            }
          });
        }
        
        else if (sectionTitle?.includes('👥 Customer Insights')) {
          const cards = section.querySelectorAll('.kpi-card');
          cards.forEach(card => {
            const icon = card.querySelector('.kpi-icon')?.textContent?.trim() || '';
            const label = card.querySelector('.kpi-label')?.textContent?.trim() || '';
            const value = card.querySelector('.kpi-value')?.textContent?.trim() || '';
            const trend = card.querySelector('.kpi-trend')?.textContent?.trim() || '';
            
            if (label && value) {
              kpiData['👥 Customer Insights'].push({
                icon, label, value, trend, isLarge: false
              });
            }
          });
        }
      });

      console.log('✅ Live KPI data captured successfully');
      
      return kpiData;
      
    } catch (error) {
      console.error('❌ Failed to capture live KPI data:', error);
      throw new Error(`Failed to capture live KPI data: ${error.message}`);
    }
  };

  // Get shared KPI CSS content - ensures 100% consistency with main KPI tab
  const getKPICSSContent = () => {
    // COMPLETE actual CSS content from KPIExecutiveSummary.css - ensures true consistency
      return `
/* UAE Dirham Symbol Font - EMBEDDED for standalone HTML */
@font-face {
  font-family: 'UAESymbol';
  src: url('data:font/woff2;base64,d09GMgABAAAAAAQYAA0AAAAACBAAAAPDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cBmAAgkIIBBEICoUUhCkLCgABNgIkAxAEIAWEEAcqG7YGUZQPTgfg47Apmy9iLmImDnGZy6goEb/MR/MYQbVG9uze3RO4ALBFhQoAVFiTQhIyGnVcolgBokvV/WSX/+Yu3Al08BwCbQCpXXyYbdB9UFW6f3A5/X/6J1j6rE/3ezTw3xoLs7ZIgImtaUX58mgKJJRpgon2VjNR6jPw3PkpCCJqLwS8uH9zAuBt6/4L8i7/FfljnFKSjqSrOCbPjpcmhICkbMLIBNdp7uaEepj22efcvw5Wmt7ZAQQA+kPIyOgNgcmEAr0Z6Q8UCoHPdb1urXtAQFQEvU+ii99CwG/KpmMPSCNA1LUECtCICg/wHtCKsZEAFz29WmIpx8aWRoXYmKqaKVpzXGPx4xRWxDrOiI46Pi5gYZrFV1nRURULIOacOMpfNA0OOEB0VAaxbJpa9cACVLfusOrAHHCYEXJSxuFMOMlzYrjif0QefiT+CEVJTut5CY9Q3rhrOk6ORKxIhLENPyYHzM7gNTvhyNbOyA+5cTUcxsBAwbYEz4hnOLRLvUv+pPBYyZ4Ao4LQv8rP5M8wVD4AXnPeCDrOY975thcv4RW7Nbu1u8x3fSUbxRt09Qc4BtdqBO+N0k1vktptmTo3z4ok3bC7ANk6w/v5t4cixFb5r4Qx7hewSoO10Pvjr2OEkcAWoYLFurl/zmyEQtN/3YQZ64aAodj/C3GxW7lQ9zTZa4S7P03ykfeRY/qVJdqcKi7WqGtO35P6ItlvOnmk15N2cyckpvH93UXSirc66fagHa6uBbXJS23+ca7vZswQxF4Tj19ElEbnsnt11wOWtsq+/M3LL16ExpEvXqQ0u/l86v/ogX370tJ8DDgwBNdO3jo5y7Zk7uZsJ9gAmutT+WV6dzmMm3ypofBt4uWqfDr5Sk6+TXQxu7ASArJV/NeJSG8NITj3+8alNdaT/zXi/PH0l6svQKMEAht4IsszBuSXAtMLb34AQBZGdrNA4e4LQEIITEcD0O6CAPTgD4HQZD0Ekga7IZANcU+AQlM0C1DqiHyk2hJLCUXRhIlAJ0O3TDJpt4XM5pgnC922yVLfcPicSnfEi9Ol24heLZo060e4qOOK8OXNVwAPRI1eDZp1gN8sDepcv0rmoJrehuYOgEU69WvRr12DegFg0bYL9/j6AID5GjQZ0F7RhlfKFQFm6MoV5GKvJg3HZ9K8EaEdKsu+Rl/BPPnx7NaAJ2NhnNPb1EB8aW8SSjrg9YJvsKefZ8s99YouLvbq09LbOMKbNx80b27D7W7O29uH9qaeKoYJcK2vmgiEfIGINHYBAA==') format('woff2'),
       url('data:font/woff;base64,d09GRk9UVE8AAAqcAAoAAAAAEPwAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAABDRkYgAAADFAAAB2EAAAvxXm5hS0ZGVE0AAAp4AAAAGwAAAByn79bcT1MvMgAAAVAAAABKAAAAYFbVYkhjbWFwAAACxAAAADYAAAFCAA0EkGhlYWQAAAD0AAAANAAAADYrIU8EaGhlYQAAASgAAAAeAAAAJAcfA3xobXR4AAAKlAAAAAgAAAAIB9AACm1heHAAAAFIAAAABgAAAAYAAlAAbmFtZQAAAZwAAAEmAAACEJFXywRwb3N0AAAC/AAAABYAAAAg/7gAM3icY2BkYGAAYv9ztsnx/DZfGbiZXwBFGJ7wtK6D0n8YuP5PZL7P9ATI5WBgAokCAE39DFV4nGNgZGBgevJ/IkMU8wsGIGC+z8DIgAqYAHvCBKIAAAAAUAAAAgAAeJxjYGF+wTiBgZWBgamLaQ8DA0MPhGZ8wGDIyAQUZWDlZIABJgYkEJDmmsLQwPCK4RWzwn8LhiimJwz5QGFGuAIFIGQEAJcQDMsAAHichY4xawJBEIXf6mm4FAlImjRhm4CCd6xrBLE1XJEihaCkNbrcHVzuZD0LIWV+T35Lfk1q3+qaJoW7DPvtzJuZB+AG3xA4nXs8eRYI8e65gSt8em7iET+eA4Ti2nMLt+Lc22b+jUoRhPzpY5djgQ5ePTe4t/DcxAu+PAfU/Hpu4UHceW6jI54xRYUN9rDIkSJDDYkuVujx1VCMEfrkJRWG9Q9gWm32Nk+zWnZXPamVHvXl0pqMpTlKTsgZBdVr9mJe1nldmDVxxlyKHWtuGmYm3RVLQkIPrs+9lgpz3B1zu8SE8X/qKa8xRoQh4+wUSVXWSWVTI3Ws5ET+bSfrcTSMnN1LPhfMWWxZd74kZysMjn7cxcLYbV6VUqlBrJS6MO0ACMhPcwAAeJxjYGBgZoBgGQZGBhCwAfIYwXwWBgUgzQKEIP6r//8h5H9xqEoGRjYGGHPQAHq7BwA4TgedAAB4nGNgZgCD/1sZjIAUIwMaAAAs0wHrAAB4nEVWaWxUVRQ+b9qZDjNdgGmhQKmlDQgCiriSYPIAi0aMVgUTF4osRTGKKNVaY+WhJoJTZVE0ikZRUYRoTSwqauEZNHGJKCCuKFg2oYu20na2zvX77ruD8+POefcs9yzfOfdakp0tlmWF5iytXVJ7V82ii8TyiSXnxgokNsKKlfhiI7NixdmNudaGZHaiNl7vL5FHCkpEBpbIykElUlwS/mWwZFFnuFTIhBn3LKu/b8ntd9SWjV04rmzypMkXTSibf1/NHXefOeD/k/D7XnxULQ9XRVtilS1WS0u8uSWrZUiiOPZ2ujjQkqorilXGm1OVOflKrc1zlIwPuErSH9tKbuTn7MNY5lyOPbUHe+esdpRSflEiSRms5Mm3wHHEUdZ26q2tBru+Aiob6iTSoWR+g6t8R6qlCAqLqLoEPN9YW6n+myHvy8de/3IYzk+7SnWeA8PhSlCt/aACEXB/uxfc7GxQJ1LQkMnQjS13o0q9cb8bVGrrJ9j4KWjnKPXrGhvbyfdsignE3gRlPQj+6XtA+ZbDyOkwDa8Dt68XrgTvxmHxTeAGdotnXTuKBSJtj3OvAWp/hx1zdroiY6r3K+xltYHqqgHlp0bPWdAIlkOu92rGwgi6t7mMin4/hb2BEcglxQlCeamYbObY8ENthJlh75DaY4NdlsuMPeogqANr9PoAePv20pVZMLfvFTFUbCyOyKoQP859j17tgGbyK7B9O+lpK0Mtx5EqPgeS/oRj6tFxhes3IXa+RWvD4FE6lAmxbyKkg09g7/ABqBRuAHXSBXfEGOZ3l8mbScpmen4cGiU32IwG5ZHSKx0dGLzfcp748fd1gkE3Q/bnY6Ljo1eUegyf8XYw0ktZqU3M9qugYgWmSBoM6vQqLEfvZ1VWQ6NzHHKlUlvxnboNIWz+1IkipoVDcKZcVawjhXehP00tJVLiaPgCza+Byr4YHg94kWgswF4Wg5fnWNAmavzJzO7I7OX8Q0hNxJJXbnvZlcGnaOVbLMO3QDiwFWrF1zDjs/E59HssoQ1YcpbT/ByoFc11jUP+JlvDgGAI4dvazeNeZeHG8nMeXW1iRfdlHAxUg8oeSaev1cexPzZq00KKBqfS8wTbpYnCpRoI7LKLsYQPwl6gTuMAn8UvgBryhnjllWGTsBTEsTf8NNWm0V4bD/+HYR7HYs20tS90eipIfwME82YTFmxWa6aYM+U56Fk8Tr6kXo9riqFbzNfoGKfz3wfj3OkU3o29kC4a0+0FMoufDRqTtqmhtc72oC9DfkTTy/C5RNy3sHDhx7qT3Ch2w2+DTrzEXtItn6ID9EKlN7HpphFwS5nJldjrqyccS8XjYlSBUVQtpi9zo14zQm2nlmNeyl0iD3K5+Tz/Eh0Vh1sBOyMCbm8NExsnWDtYgDSotjuJhrM5vfp6mdkuGDw0wzVT59CtrolSpylc5/gNWVDMWEcezXhSsJDQ99y7Ccv4D2w9pSA/epnjTUEJ9FB8j3igUWnWktIqtV48jKokMxw639HTI0hUgkw0Y8hK/koXTSuDbJMbydnMRD4II2EO+zjbZWgQMXdfASODzga3vcZAXv07nVA7qHNjmwH6wyRTOnX8esfsda83yFCqSreaG4x0sgT6g9uPurpno4SS662I5Qman0CKzcNWUCcHgbouD3sHxkPbptHP5oE6jxdFXz0LA/CotrOgm7eXQ249gd3MjHzOnjvomgA1UnShCUaVbDX9oP6az7qsZZJKPVgGMyrrKLgoo9zfRWXMYfX77WKq/0XCNKLa/z6LsoTze5fj9arq1bpETvJ5MUO63SJICNajMxyTuwUrnCgOfegEUqL+eMb1Rqo3yZHDoLIuL2UO1ri4ekeVOUwRdAsXuObCHboXVhKX4owrd3CK7oL2BeM4Y5+E3OjR0Ng9wOVwolyVSyiAal3serNJJfywErrKoVccQcoMZC+iU5cxjkLKbbfNLRzrcrxp5vWMjjf1eQYNqV7b3AuqmTeVvhjQyEq9/IJpbrVqgOg7CuzRHRnw6MAbuoB67/ap1Jf4MCxTVomZEvAkGOk1baQnUmWTvibGTCGmxkwxZ3n9gKODkWPKqnjWUekt25hC7TZuVGT7o1r2QhXDqKcnfNPgOQNPRvENpH0aVWZO9obSuKcdvyExr8w7I5LlnHlxZKaZbvvqeMbtFSgv+vGPdyUAaAAQavaz2huWmehX/bx0/+0GJzkZVPtiZpwX6clux3tw4MImRaf/XsWMz9SYF++poDq+4LzaScY6NlK7be7f1O+i3yngTnM8OKrOWyBy9Fb27neuWY7whu+4DVTPY2DEb4TcqWXCCxx7iUvo6VQ2SHq/6NqC2uGatLGv9QDTje/t9RXSmW0Q7nnJMf62H6Hpy7D32+u297JTrd9o1GCvo4hGK5wMiIAC9eFE3SDNm5DQFaVOAFVewfn880rdVpyRdUViCrBghJspwJdnisKbn+8hkVYxL1evolVOMD/xcGG0KJobim5v3N6Ym9tXGO4r3Lg2N+8/S8tXFAAAAHicY2BgYGQAgvvXThuC6Cc8reug9B8AT0gHRwAD6AAAA+gACg==') format('woff'),
       url('data:font/truetype;base64,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') format('truetype');
  font-display: swap;
}

.uae-dirham-symbol {
  display: inline-block;
  vertical-align: -0.1em;
  width: 1em;
  height: 1em;
  margin-right: 0.2em;
  fill: currentColor;
}

/* KPI Executive Summary Styles - EXACT COPY FROM LIVE COMPONENT */
.kpi-dashboard {
          background: white;
          min-height: 100vh;
  padding: 24px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.kpi-dashboard > h2 {
  text-align: center;
  font-weight: 700;
  font-size: 22px;
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

.kpi-section {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.15);
  backdrop-filter: blur(8px);
}

.kpi-section-title {
  font-size: 1.4em;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
  margin-bottom: 24px;
          text-align: center;
  border-bottom: 3px solid;
  border-image: linear-gradient(135deg, #667eea, #764ba2) 1;
  padding-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
        }
        
        .kpi-cards {
          display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  align-items: stretch;
}

/* Ensure full-width cards span correctly */
.kpi-cards .revenue-drivers {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  min-width: 100% !important;
}

.kpi-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.98));
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(102, 126, 234, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  backdrop-filter: blur(10px);
}

.kpi-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(102, 126, 234, 0.2);
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
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 0 2px 2px 0;
}

.kpi-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2.5rem;
  margin-bottom: 16px;
}

.kpi-label {
  font-size: 1.05em;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 12px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.kpi-value {
  font-size: 1.4em;
  font-weight: 700;
  color: #1a202c;
  text-align: center;
  margin-bottom: 10px;
  line-height: 1.2;
  font-family: 'Segoe UI', sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.kpi-trend {
  font-size: 0.85em;
  text-align: center;
  color: #718096;
  font-weight: 500;
  line-height: 1.3;
  display: block !important;
  margin-top: 4px;
}

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
  font-size: 1.1em !important;
  margin-bottom: 12px !important;
  font-weight: 700 !important;
  color: #1e40af !important;
  text-decoration: underline !important;
  text-decoration-color: #3b82f6 !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 3px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  letter-spacing: 0.8px !important;
}

.uae-icon-container {
  width: 60px;
  height: 60px;
  margin: 0 auto 10px auto;
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
  object-fit: contain;
}

.rotating-emoji-container {
  width: 60px;
  height: 60px;
  margin: 0 auto 10px auto;
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
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

.export-regions {
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 20px !important;
  width: 100% !important;
  overflow: visible !important;
}

.export-regions .kpi-card {
  min-height: 120px;
  padding: 12px;
  text-align: center;
  flex: 1 1 0 !important;
  min-width: 0 !important;
}

.export-regions .kpi-card::before {
  background: #16a085;
}

.export-regions .kpi-card .kpi-trend {
  font-size: 0.75em;
  color: #7f8c8d;
  font-style: italic;
}

/* Category-specific grid layouts for Product Performance */
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card {
  min-height: 220px;
  border-left: 4px solid #e67e22;
}

.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card .kpi-value,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card .kpi-value {
  font-size: 0.95em;
  line-height: 1.4;
  text-align: left;
  margin-bottom: 4px;
}

.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4) .kpi-card .kpi-label,
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) .kpi-card .kpi-label {
  font-size: 1.1em !important;
  margin-bottom: 12px !important;
  font-weight: 700 !important;
  color: #1e40af !important;
  text-decoration: underline !important;
  text-decoration-color: #3b82f6 !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 3px !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  letter-spacing: 0.8px !important;
}

.kpi-section:nth-of-type(2) .kpi-cards:nth-child(4),
.kpi-section:nth-of-type(2) .kpi-cards:nth-child(5) {
  gap: 20px;
  margin-top: 16px;
}

/* Top Revenue Drivers specific styling - Single Card with 3 Internal Rows */
.revenue-drivers {
  grid-column: 1 / -1 !important; /* Force full width across all columns */
  min-height: auto !important;
  width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.revenue-drivers .kpi-label {
  font-weight: 700 !important;
  font-size: 1.05em !important;
  text-transform: uppercase !important;
  letter-spacing: 0.8px !important;
  text-align: center !important;
  margin-bottom: 20px !important;
}

.revenue-drivers .kpi-value {
  width: 100% !important;
  text-align: left !important;
  flex: 1 !important;
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
  font-size: 2.2em !important;
  margin-right: 16px !important;
  min-width: 40px !important;
  text-align: center !important;
}

/* Product details styling */
.revenue-drivers > div > div > div {
  flex: 1;
}

.revenue-drivers > div > div > div > div:first-child {
  font-weight: 600 !important;
  font-size: 1.1em !important;
  color: #1f2937 !important;
  margin-bottom: 4px;
}

.revenue-drivers > div > div > div > div:last-child {
  font-size: 0.9em !important;
  color: #6b7280 !important;
}

/* Improve arrow styling in revenue drivers */
.revenue-drivers .arrow-positive,
.revenue-drivers .arrow-negative {
  font-size: 0.85em;
  padding: 3px 8px;
  margin-left: 8px;
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
    gap: 8px;
  }
}

.customer-names-small {
  font-size: 0.7em;
  color: #999;
  font-weight: 400;
  margin-top: 2px;
  white-space: normal;
  line-height: 1.2;
  overflow: visible;
  text-overflow: unset;
}

/* Process and Material Category Cards: 3 per row, centered */
.kpi-section .kpi-cards.category-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  justify-content: center;
  align-items: start;
}

@media (max-width: 900px) {
  .kpi-section .kpi-cards.category-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.kpi-section .kpi-cards.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  justify-content: center;
  align-items: start;
}

.kpi-section .kpi-cards.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 20px;
  width: 100%;
  justify-items: stretch;
  align-items: start;
}
    `;
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
          await new Promise(resolve => setTimeout(resolve, 1500));
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
      const currencySymbols = clonedComponent.querySelectorAll('.uae-dirham-symbol');
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

  // Helper function to ensure P&L tab is active
  const ensurePLTabActive = () => {
    console.log('🔍 Checking if P&L tab is active...');
    
    // Find the P&L tab specifically
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const plTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return (text === 'P&L' || text === 'P&L Financial' || text.includes('P&L')) && text.length < 50;
    });
    
    if (!plTab) {
      console.warn('⚠️ P&L tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found P&L tab button:', plTab.textContent?.trim());
    
    // Check if it's already active
    const isActive = plTab.classList.contains('active') || 
                    plTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking P&L tab...');
      plTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ P&L tab is already active');
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
      return (text === 'Sales by Country' || text.includes('Country') || text === 'Table') && text.length < 50;
    });
    
    if (!salesCountryTab) {
      console.warn('⚠️ Sales by Country tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found Sales by Country tab button:', salesCountryTab.textContent?.trim());
    
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

  // Helper function to ensure Charts tab is active
  const ensureChartsTabActive = () => {
    console.log('🔍 Checking if Charts tab is active...');
    
    // Find the Charts tab specifically - EXCLUDE export buttons
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const chartsTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      // Must be exactly "Charts" and NOT be an export button
      return text === 'Charts' && 
             !text.includes('Export') && 
             !text.includes('HTML') && 
             !el.classList.contains('export-btn');
    });
    
    if (!chartsTab) {
      console.warn('⚠️ Charts tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found Charts tab button:', chartsTab.textContent?.trim());
    
    // Check if it's already active
    const isActive = chartsTab.classList.contains('active') || 
                    chartsTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking Charts tab...');
      chartsTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait for charts
    } else {
      console.log('✅ Charts tab is already active');
    }
    
    return Promise.resolve();
  };

  // Helper function to ensure KPI tab is active
  const ensureKPITabActive = () => {
    console.log('🔍 Checking if KPI tab is active...');
    
    // Find the KPI tab specifically
    const allButtons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const kpiTab = allButtons.find(el => {
      const text = el.textContent?.trim();
      return (text === 'KPI' || text === 'Executive Summary' || text.includes('KPI')) && text.length < 50;
    });
    
    if (!kpiTab) {
      console.warn('⚠️ KPI tab button not found');
      console.log('Available tab-like buttons:', allButtons.map(b => b.textContent?.trim()).filter(t => t && t.length < 50));
      return Promise.resolve();
    }
    
    console.log('🔍 Found KPI tab button:', kpiTab.textContent?.trim());
    
    // Check if it's already active
    const isActive = kpiTab.classList.contains('active') || 
                    kpiTab.getAttribute('aria-selected') === 'true';
                    
    if (!isActive) {
      console.log('🔄 Clicking KPI tab...');
      kpiTab.click();
      // Give it time to mount and render
      return new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ KPI tab is already active');
    }
    
    return Promise.resolve();
  };

  // Generate comprehensive HTML export
  const handleComprehensiveExport = async () => {
    console.log('🔥🔥🔥 COMPREHENSIVE EXPORT STARTED - This should generate 10 cards!');
    setIsExporting(true);
    setError(null);
    
    try {
      // 🎯 FIRST: Capture live KPI data while the user's selection is active (optional)
      console.log('🔥 Step 1: Capturing live KPI data...');
      let liveKpiData = {};
      try {
        await ensureKPITabActive();
        // Give KPI component time to fully render
        await new Promise(resolve => setTimeout(resolve, 1500));
        liveKpiData = captureLiveKPIData();
        console.log('✅ Live KPI data captured:', liveKpiData);
      } catch (err) {
        console.warn('⚠️ Live KPI data not available:', err.message);
        liveKpiData = {}; // Continue with empty data
      }
      
      // Capture tables by ensuring tabs are active
      let productGroupTableHTML = '';
      try {
        await ensureProductGroupTabActive();
        // Add extra wait for Product Group table to fully render with calculations
        await new Promise(resolve => setTimeout(resolve, 2000));
        productGroupTableHTML = await captureProductGroupTable();
      } catch (err) {
        console.warn('⚠️ Product Group table not available:', err.message);
        productGroupTableHTML = '<div class="placeholder-content"><h3>Product Group</h3><p>Table not available - please visit the Product Group tab first.</p></div>';
      }
      
      let plFinancialTableHTML = '';
      try {
        await ensurePLTabActive();
        plFinancialTableHTML = await capturePLFinancialTable();
      } catch (err) {
        console.warn('⚠️ P&L Financial table not available:', err.message);
        plFinancialTableHTML = '<div class="placeholder-content"><h3>P&L Financial</h3><p>Table not available - please visit the P&L tab first.</p></div>';
      }
      
      let salesCountryTableHTML = '';
      try {
        await ensureSalesCountryTabActive();
        salesCountryTableHTML = await captureSalesCountryTable();
      } catch (err) {
        console.warn('⚠️ Sales by Country table not available:', err.message);
        salesCountryTableHTML = '<div class="placeholder-content"><h3>Sales by Country</h3><p>Table not available - please visit the Sales by Country tab first.</p></div>';
      }
      
      let salesCustomerTableHTML = '';
      try {
        await ensureSalesCustomerTabActive();
        salesCustomerTableHTML = await captureSalesCustomerTable();
      } catch (err) {
        console.warn('⚠️ Sales by Customer table not available:', err.message);
        salesCustomerTableHTML = '<div class="placeholder-content"><h3>Sales by Customer</h3><p>Table not available - please visit the Sales by Customer tab first.</p></div>';
      }
      
      // Capture charts
      await ensureChartsTabActive();
      
      let salesVolumeChartHTML = '';
      let marginAnalysisChartHTML = '';
      let manufacturingCostChartHTML = '';
      let belowGPExpensesChartHTML = '';
      let costProfitabilityTrendChartHTML = '';
      
      try {
        salesVolumeChartHTML = await captureSalesVolumeChart();
      } catch (err) {
        console.warn('⚠️ Sales Volume chart not available:', err.message);
        salesVolumeChartHTML = '<div class="placeholder-content"><h3>Sales & Volume Analysis</h3><p>Chart not available - please visit the Charts tab first.</p></div>';
      }
      
      try {
        marginAnalysisChartHTML = await captureMarginAnalysisChart();
      } catch (err) {
        console.warn('⚠️ Margin Analysis chart not available:', err.message);
        marginAnalysisChartHTML = '<div class="placeholder-content"><h3>Margin Analysis</h3><p>Chart not available - please visit the Charts tab first.</p></div>';
      }
      
      try {
        manufacturingCostChartHTML = await captureManufacturingCostChart();
      } catch (err) {
        console.warn('⚠️ Manufacturing Cost chart not available:', err.message);
        manufacturingCostChartHTML = '<div class="placeholder-content"><h3>Manufacturing Cost</h3><p>Chart not available - please visit the Charts tab first.</p></div>';
      }
      
      try {
        belowGPExpensesChartHTML = await captureBelowGPExpensesChart();
      } catch (err) {
        console.warn('⚠️ Below GP Expenses chart not available:', err.message);
        belowGPExpensesChartHTML = '<div class="placeholder-content"><h3>Below GP Expenses</h3><p>Chart not available - please visit the Charts tab first.</p></div>';
      }
      
      try {
        costProfitabilityTrendChartHTML = await captureCostProfitabilityTrendChart();
      } catch (err) {
        console.warn('⚠️ Cost & Profitability Trend chart not available:', err.message);
        costProfitabilityTrendChartHTML = '<div class="placeholder-content"><h3>Cost & Profitability Trend</h3><p>Chart not available - please visit the Charts tab first.</p></div>';
      }
      
      const logoBase64 = await getBase64Logo();
      const divisionName = getDivisionDisplayName();
      const basePeriod = getBasePeriodText();
      
      
      // Generate KPI summary HTML by capturing live DOM (optional)
      let kpiSummaryHTML = '<div class="placeholder-content"><h3>KPI Summary</h3><p>KPI data not available - please visit the KPI tab first.</p></div>';
      try {
        kpiSummaryHTML = await generateOutstandingKPISummary();
      } catch (err) {
        console.warn('⚠️ KPI Summary not available:', err.message);
      }

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${divisionName} - Comprehensive Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* UAE Dirham Symbol Font - EMBEDDED for standalone HTML */
        @font-face {
            font-family: 'UAESymbol';
            src: url('data:font/woff2;base64,d09GMgABAAAAAAQYAA0AAAAACBAAAAPDAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cBmAAgkIIBBEICoUUhCkLCgABNgIkAxAEIAWEEAcqG7YGUZQPTgfg47Apmy9iLmImDnGZy6goEb/MR/MYQbVG9uze3RO4ALBFhQoAVFiTQhIyGnVcolgBokvV/WSX/+Yu3Al08BwCbQCpXXyYbdB9UFW6f3A5/X/6J1j6rE/3ezTw3xoLs7ZIgImtaUX58mgKJJRpgon2VjNR6jPw3PkpCCJqLwS8uH9zAuBt6/4L8i7/FfljnFKSjqSrOCbPjpcmhICkbMLIBNdp7uaEepj22efcvw5Wmt7ZAQQA+kPIyOgNgcmEAr0Z6Q8UCoHPdb1urXtAQFQEvU+ii99CwG/KpmMPSCNA1LUECtCICg/wHtCKsZEAFz29WmIpx8aWRoXYmKqaKVpzXGPx4xRWxDrOiI46Pi5gYZrFV1nRURULIOacOMpfNA0OOEB0VAaxbJpa9cACVLfusOrAHHCYEXJSxuFMOMlzYrjif0QefiT+CEVJTut5CY9Q3rhrOk6ORKxIhLENPyYHzM7gNTvhyNbOyA+5cTUcxsBAwbYEz4hnOLRLvUv+pPBYyZ4Ao4LQv8rP5M8wVD4AXnPeCDrOY975thcv4RW7Nbu1u8x3fSUbxRt09Qc4BtdqBO+N0k1vktptmTo3z4ok3bC7ANk6w/v5t4cixFb5r4Qx7hewSoO10Pvjr2OEkcAWoYLFurl/zmyEQtN/3YQZ64aAodj/C3GxW7lQ9zTZa4S7P03ykfeRY/qVJdqcKi7WqGtO35P6ItlvOnmk15N2cyckpvH93UXSirc66fagHa6uBbXJS23+ca7vZswQxF4Tj19ElEbnsnt11wOWtsq+/M3LL16ExpEvXqQ0u/l86v/ogX370tJ8DDgwBNdO3jo5y7Zk7uZsJ9gAmutT+WV6dzmMm3ypofBt4uWqfDr5Sk6+TXQxu7ASArJV/NeJSG8NITj3+8alNdaT/zXi/PH0l6svQKMEAht4IsszBuSXAtMLb34AQBZGdrNA4e4LQEIITEcD0O6CAPTgD4HQZD0Ekga7IZANcU+AQlM0C1DqiHyk2hJLCUXRhIlAJ0O3TDJpt4XM5pgnC922yVLfcPicSnfEi9Ol24heLZo060e4qOOK8OXNVwAPRI1eDZp1gN8sDepcv0rmoJrehuYOgEU69WvRr12DegFg0bYL9/j6AID5GjQZ0F7RhlfKFQFm6MoV5GKvJg3HZ9K8EaEdKsu+Rl/BPPnx7NaAJ2NhnNPb1EB8aW8SSjrg9YJvsKefZ8s99YouLvbq09LbOMKbNx80b27D7W7O29uH9qaeKoYJcK2vmgiEfIGINHYBAA==') format('woff2'),
                 url('data:font/woff;base64,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') format('woff'),
                 url('data:font/truetype;base64,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') format('truetype');
            font-display: swap;
        }
        
        .uae-dirham-symbol {
            display: inline-block;
            vertical-align: -0.1em;
            width: 1em;
            height: 1em;
            margin-right: 0.2em;
            fill: currentColor;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .main-container {
            width: 100%;
            max-width: 100vw;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        /* Header Section */
        .header-section {
            text-align: center;
            margin-bottom: 40px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
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
            font-size: 2.5rem;
            color: #2c3e50;
            margin: 20px 0 10px 0;
            font-weight: 700;
        }
        
        .report-subtitle {
            font-size: 1.2rem;
            color: #7f8c8d;
            margin-bottom: 15px;
        }
        
        .period-info {
            font-size: 1.1rem;
            color: #34495e;
            background: #ecf0f1;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: 600;
        }
        
        /* Cards Grid */
        .cards-container {
            display: flex;
            flex-direction: column;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .card-row {
            display: grid;
            gap: 20px;
        }
        
        .card-row.kpi-row {
            grid-template-columns: 1fr;
            justify-items: center;
        }
        
        .card-row.charts-row {
            grid-template-columns: repeat(5, 1fr);
        }
        
        .card-row.tables-row {
            grid-template-columns: repeat(4, 1fr);
        }
        
        .report-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            border: 2px solid transparent;
        }
        
        .report-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            border-color: #3498db;
        }
        
        .card-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .card-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .card-description {
            font-size: 0.9rem;
            color: #7f8c8d;
            line-height: 1.4;
        }
        
        /* Content Pages */
        .content-page {
            display: none;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 15px;
            padding: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            min-height: 600px;
            width: 95vw;
            max-width: 95vw;
        }
        
        .content-page.active {
            display: block;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }
        
        .page-title-container {
            flex-grow: 1;
            text-align: center;
        }
        
        .page-title {
            font-size: 1.8rem;
            color: #2c3e50;
            margin: 0;
            line-height: 1.2;
        }
        
        .page-subtitle {
            font-size: 1.2rem;
            color: #7f8c8d;
            margin-top: 5px;
            font-weight: normal;
            font-style: italic;
        }
        
        .back-button {
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
            color: white;
            border: none;
            width: 120px;
            height: 40px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin: 0;
            transition: all 0.3s ease;
            flex-shrink: 0;
            z-index: 1000;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            line-height: 1.2;
            box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
        }
        
        .back-button:hover {
            background: linear-gradient(135deg, #8e44ad, #732d91);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(155, 89, 182, 0.4);
        }
        
        /* Sticky Back Button Container for Table Pages */
        .sticky-back-container {
            position: sticky;
            top: 0;
            background: white;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e0e0;
            z-index: 1001;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* Table Title Container */
        .table-title-container {
            padding: 20px 20px 10px 20px;
            text-align: center;
        }
        
        .table-title-container .page-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #333;
        }
        
        /* Chart Title Container */
        .chart-title-container {
            padding: 20px 20px 10px 20px;
            text-align: center;
        }
        
        .chart-title-container .page-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: #333;
        }
        
        .chart-title-container .page-subtitle {
            margin: 5px 0 0 0;
            font-size: 16px;
            color: #666;
            font-weight: normal;
            font-style: italic;
        }
        
        /* Table Styles */
        .table-container {
            width: 100%;
            max-width: 100%;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 0 auto;
        }
        
        table {
            width: 100%;
            min-width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            font-size: 14px;
        }
        
        th, td {
            padding: 8px 12px;
            text-align: center;
            border: 1px solid #ddd;
        }
        
        /* FIX: Ensure sticky headers in the P&L table retain their borders when scrolled. */
        #page-financial-pl thead th[style*="background-color"] {
            border-right: 1px solid #ddd !important;
            border-bottom: 1px solid #ddd !important;
        }
        
        /* FIX: Ensure P&L table cells have right borders to prevent missing lines */
        #page-financial-pl table th,
        #page-financial-pl table td {
          border-right: 1px solid #ddd !important;
        }
        
        /* Consistent header row heights */
        thead tr th {
            height: 35px;
            line-height: 1.2;
            vertical-align: middle;
        }
        
        th {
            font-weight: bold;
            position: sticky;
            z-index: 10;
            /* Don't override background-color to preserve original colors */
        }
        
        /* Default: Freeze first 3 header rows (for Product Group, Sales by Country, Sales by Customer) */
        thead tr:nth-child(1) th {
            top: 70px; /* Account for sticky back button container height */
            z-index: 13;
        }
        
        thead tr:nth-child(2) th {
            top: 105px; /* 70px sticky back + 35px first row */
            z-index: 12;
        }
        
        thead tr:nth-child(3) th {
            top: 140px; /* 70px sticky back + 70px first two rows */
            z-index: 11;
        }
        
        /* Make first column cells in frozen header rows white with no borders */
        thead tr:nth-child(1) th:first-child,
        thead tr:nth-child(2) th:first-child,
        thead tr:nth-child(3) th:first-child,
        thead tr:nth-child(4) th:first-child {
            background-color: white;
            border: none;
        }
        
        /* Remove left border from first period column in headers - clean look */
        thead tr:nth-child(2) th:nth-child(2),
        thead tr:nth-child(3) th:nth-child(2),
        thead tr:nth-child(4) th:nth-child(2) {
            border-left: none;
        }
        
        /* P&L Financial Table: Freeze first 4 header rows */
        .content-page[id="page-financial-pl"] thead tr:nth-child(4) th {
            top: 175px; /* 70px sticky back + 105px first three rows */
            z-index: 10;
            position: sticky;
            font-weight: bold;
        }
        
        /* Add thin borders to 4th row cells starting from 2nd column - P&L Financial only */
        .content-page[id="page-financial-pl"] thead tr:nth-child(4) th:nth-child(n+2) {
            border: 1px solid #ddd;
        }
        
        /* Sales by Country Table: Freeze first 4 header rows */
        .content-page[id="page-sales-country"] thead tr:nth-child(1) th {
            top: 70px; /* Account for sticky back button container height */
            z-index: 13;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-country"] thead tr:nth-child(2) th {
            top: 105px; /* 70px sticky back + 35px first row */
            z-index: 12;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-country"] thead tr:nth-child(3) th {
            top: 140px; /* 70px sticky back + 70px first two rows */
            z-index: 11;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-country"] thead tr:nth-child(4) th {
            top: 175px; /* 70px sticky back + 105px first three rows */
            z-index: 10;
            position: sticky;
            font-weight: bold;
        }
        
        /* Sales by Customer Table: Freeze first 4 header rows */
        .content-page[id="page-sales-customer"] thead tr:nth-child(1) th {
            top: 70px; /* Account for sticky back button container height */
            z-index: 13;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-customer"] thead tr:nth-child(2) th {
            top: 105px; /* 70px sticky back + 35px first row */
            z-index: 12;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-customer"] thead tr:nth-child(3) th {
            top: 140px; /* 70px sticky back + 70px first two rows */
            z-index: 11;
            position: sticky;
            font-weight: bold;
        }
        
        .content-page[id="page-sales-customer"] thead tr:nth-child(4) th {
            top: 175px; /* 70px sticky back + 105px first three rows */
            z-index: 10;
            position: sticky;
            font-weight: bold;
        }
        
        .product-header {
            background-color: #1976d2;
            color: white;
            font-weight: bold;
        }
        
        .metric-cell {
            font-size: 14px;
        }
        
        .total-header {
            background-color: #f57c00;
            color: white;
            font-weight: bold;
        }
        
        /* Headers are center aligned */
        th {
            text-align: center;
        }
        
        /* First column data cells left alignment */
        table td:first-child {
            text-align: left;
            padding-left: 12px;
        }
        
        /* Financial Table Bold Formatting - Preserve Original Styles */
        .financial-table .section-header td {
            font-weight: bold;
        }
        
        .financial-table .important-row td {
            font-weight: bold;
        }
        
        .financial-table tr.important-row td:first-child,
        .financial-table tr.important-row td:nth-child(3n+2),
        .financial-table tr.important-row td:nth-child(3n+3),
        .financial-table tr.important-row td:nth-child(3n+4) {
            font-weight: bold;
        }
        
        /* Ensure all cells in section header rows are bold */
        .financial-table .section-header {
            background-color: transparent;
        }
        
        /* Make calculated cells italic */
        .financial-table .calculated-cell {
            font-style: italic;
            color: #000000;
        }
        
        /* Sales by Country Table Formatting */
        .financial-table .country-row {
            background-color: #ffffff;
        }
        
        .financial-table .country-row:hover {
            background-color: #f8f9fa;
        }
        
        .financial-table .percentage-cell {
            font-weight: 500;
        }
        
        .financial-table .delta-cell {
            font-weight: bold;
            font-size: 13px;
        }
        
        /* Sales by Customer Table Formatting */
        .financial-table .customer-row {
            background-color: #ffffff;
        }
        
        .financial-table .customer-row:hover {
            background-color: #f8f9fa;
        }
        
        .financial-table .sales-amount-cell {
            font-weight: 500;
        }
        
        /* Preserve Original Inline Styles - Don't Override Background Colors */
        table th[style*="background-color"],
        table td[style*="background-color"] {
            /* Let inline styles take precedence for background colors */
        }
        
        /* Remove top borders from all colored header cells */
        thead tr th[style*="background-color"] {
            border-top: none;
        }
        
        /* Remove ALL borders from first 4 header rows and eliminate spaces */
        thead tr:nth-child(1) th,
        thead tr:nth-child(2) th,
        thead tr:nth-child(3) th,
        thead tr:nth-child(4) th {
            border: none;
            margin: 0;
            padding: 8px 12px;
            line-height: 1;
        }
        
        /* Ensure no spacing between header rows */
        thead tr:nth-child(1),
        thead tr:nth-child(2),
        thead tr:nth-child(3),
        thead tr:nth-child(4) {
            margin: 0;
            padding: 0;
            border-spacing: 0;
        }
        
        /* Table Footer Note Styling */
        .table-footer-note {
            margin-top: 15px;
            padding: 10px;
            font-size: 12px;
            font-weight: bold;
            font-style: italic;
            color: #666;
            text-align: center;
            background-color: #f8f9fa;
            border-radius: 5px;
            border-left: 3px solid #007bff;
        }
        
        /* Chart Container Styling */
        .chart-full-container {
            width: 100%;
            height: 95vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
        }
        
        .chart-container {
            width: 100%;
            height: 100%;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Specific styling for margin analysis chart centering */
        .chart-container .modern-margin-gauge-panel {
            width: 100% !important;
            max-width: 90vw !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
        }
        
        .chart-container .modern-gauge-heading {
            text-align: center !important;
            width: 100% !important;
            margin-bottom: 30px !important;
        }
        
        .chart-container .modern-gauge-container {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 15px !important;
            margin: 0 auto !important;
            padding: 0 !important;
        }
        
        .chart-container .modern-gauge-card {
            flex: 0 0 auto !important;
            max-width: 200px !important;
        }
        
        .chart-container img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        /* Chart image styling */
        .chart-container img {
            display: block;
            margin: 0 auto;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Text overlays styling */
        .chart-text-overlays {
            background: rgba(248, 249, 250, 0.95);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .text-row {
            margin-bottom: 8px;
        }
        
        .text-row:last-child {
            margin-bottom: 0;
        }
        
        /* For fallback ECharts container */
        .chart-container .echarts-for-react {
            width: 100% !important;
            height: 70vh !important;
        }
        
        /* Product group rows with darker colors */
        .product-header-row td:first-child {
            background-color: #1565c0;
            color: white;
            font-weight: bold;
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
        
        /* KPI Dashboard Styles */
        .kpi-dashboard {
            padding: 20px;
            max-width: 100%;
            margin: 0 auto;
        }
        
        .kpi-section {
            margin-bottom: 40px;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .kpi-section-title {
            font-size: 1.8rem;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 700;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        .kpi-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .kpi-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .kpi-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
            border-color: #3498db;
        }
        
        .kpi-card.large {
            grid-column: span 2;
        }
        
        .kpi-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: block;
        }
        
        .kpi-label {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-bottom: 8px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .kpi-value {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 8px;
            line-height: 1;
        }
        
        .kpi-trend {
            font-size: 0.9rem;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 12px;
            display: block !important;
            margin-top: 4px;
        }
        
        .kpi-trend.up {
            background: #d4edda;
            color: #155724;
        }
        
        .kpi-trend.down {
            background: #f8d7da;
            color: #721c24;
        }
        
        .kpi-trend.neutral {
            background: #e2e3e5;
            color: #383d41;
        }
        
        .kpi-error {
            text-align: center;
            padding: 60px 20px;
            color: #dc3545;
            background: rgba(248, 215, 218, 0.3);
            border-radius: 15px;
            margin: 20px;
        }
        
        .kpi-error .kpi-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.7;
        }
        
        .kpi-error-text {
            font-size: 1.5rem;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .kpi-error-details {
            font-size: 1rem;
            opacity: 0.8;
        }

        /* Coming Soon Style */
        .coming-soon {
            text-align: center;
            padding: 60px 20px;
            color: #7f8c8d;
        }
        
        .coming-soon-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .coming-soon-text {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }
        
        .coming-soon-subtitle {
            font-size: 1rem;
            opacity: 0.7;
        }

        @media (max-width: 768px) {
            .cards-container {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .division-title {
                font-size: 2rem;
            }
            
            .main-container {
                padding: 10px;
            }
            
            /* Reduce sticky header offset on mobile for better space utilization */
            thead tr:nth-child(1) th {
                top: 50px !important; /* Reduced from 70px */
            }
            
            thead tr:nth-child(2) th {
                top: 85px !important; /* Reduced accordingly */
            }
            
            thead tr:nth-child(3) th {
                top: 120px !important; /* Reduced accordingly */
            }
            
            .content-page[id="page-financial-pl"] thead tr:nth-child(4) th,
            .content-page[id="page-sales-country"] thead tr:nth-child(4) th,
            .content-page[id="page-sales-customer"] thead tr:nth-child(4) th {
                top: 155px !important; /* Reduced accordingly */
            }
            
            /* Adjust back button for mobile */
            .back-button {
                width: 100px !important;
                height: 35px !important;
                font-size: 12px !important;
            }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Main Dashboard -->
        <div id="main-dashboard">
            <!-- Header Section -->
            <div class="header-section">
                <div class="logo-container">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="logo">` : ''}
                </div>
                <h1 class="division-title">${divisionName} - Comprehensive Report</h1>
                <div class="period-info">${basePeriod}</div>
            </div>
            
            <!-- Cards Grid -->
            <div class="cards-container">
                <!-- KPI Summary Row -->
                <div class="card-row kpi-row">
                    ${cardConfigs.filter(card => card.id === 'kpi-summary').map(card => `
                        <div class="report-card" onclick="showPage('${card.id}')">
                            <span class="card-icon">${card.icon}</span>
                            <div class="card-title">${card.title}</div>
                            <div class="card-description">${card.description}</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Charts Row -->
                <div class="card-row charts-row">
                    ${cardConfigs.filter(card => ['sales-volume-analysis', 'margin-analysis', 'manufacturing-cost', 'below-gp-expenses', 'cost-profitability-trend'].includes(card.id)).map(card => `
                        <div class="report-card" onclick="showPage('${card.id}')">
                            <span class="card-icon">${card.icon}</span>
                            <div class="card-title">${card.title}</div>
                            <div class="card-description">${card.description}</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Tables Row -->
                <div class="card-row tables-row">
                    ${cardConfigs.filter(card => ['financial-pl', 'product-group', 'sales-country', 'sales-customer'].includes(card.id)).map(card => `
                        <div class="report-card" onclick="showPage('${card.id}')">
                            <span class="card-icon">${card.icon}</span>
                            <div class="card-title">${card.title}</div>
                            <div class="card-description">${card.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <!-- Content Pages -->
        ${cardConfigs.map(card => `
            <div id="page-${card.id}" class="content-page">
                <!-- Sticky Back Button (for table and chart pages) -->
                ${['product-group', 'financial-pl', 'sales-country', 'sales-customer', 'sales-volume-analysis', 'margin-analysis', 'manufacturing-cost', 'below-gp-expenses', 'cost-profitability-trend', 'kpi-summary'].includes(card.id) ? `
                    <div class="sticky-back-container">
                        <button class="back-button" onclick="showDashboard()">
                            ← Back to Dashboard
                        </button>
                    </div>
                ` : `
                <div class="page-header">
                    <button class="back-button" onclick="showDashboard()">
                        ← Back to Dashboard
                    </button>
                    <div class="page-title-container">
                        <h2 class="page-title">${
                            card.id === 'product-group' ? `Product Group - ${divisionName}` :
                                card.id === 'financial-pl' ? `P&L-${divisionName}` :
                            card.id === 'sales-country' ? `Sales by Country - ${divisionName}` :
                            card.id === 'sales-customer' ? `Top 20 Customers - ${divisionName}` :
                            card.id === 'sales-volume-analysis' ? `Sales & Volume Analysis - ${divisionName}` :
                            card.id === 'margin-analysis' ? `Margin over Material - ${divisionName}` :
                            card.id === 'manufacturing-cost' ? `Manufacturing Cost - ${divisionName}` :
                            card.id === 'below-gp-expenses' ? `Below GP Expenses - ${divisionName}` :
                            card.id === 'cost-profitability-trend' ? `Cost & Profitability Trend - ${divisionName}` :
                            `${card.icon} ${card.title}`
                        }</h2>
                        ${card.id === 'sales-volume-analysis' ? '<div class="page-subtitle">(AED)</div>' : ''}
                        ${card.id === 'margin-analysis' ? '<div class="page-subtitle">(AED & AED/Kg)</div>' : ''}
                        ${card.id === 'manufacturing-cost' ? '<div class="page-subtitle">(AED)</div>' : ''}
                        ${card.id === 'below-gp-expenses' ? '<div class="page-subtitle">(AED)</div>' : ''}
                        ${card.id === 'cost-profitability-trend' ? '<div class="page-subtitle">(AED)</div>' : ''}
                    </div>
                    <div style="width: 180px;"></div> <!-- Spacer for balance -->
                </div>
                `}
                <div class="page-content">
                    ${card.id === 'kpi-summary' ? `
                        ${kpiSummaryHTML}
                    ` : card.id === 'product-group' ? `
                        <div class="table-title-container">
                            <h2 class="page-title">Product Group - ${divisionName}</h2>
                        </div>
                        <div class="table-container">
                            ${productGroupTableHTML}
                        </div>
                    ` : card.id === 'financial-pl' ? `
                        <div class="table-title-container">
                            <h2 class="page-title">P&L-${divisionName}</h2>
                        </div>
                        <div class="table-container">
                            ${plFinancialTableHTML}
                        </div>
                    ` : card.id === 'sales-country' ? `
                        <div class="table-title-container">
                            <h2 class="page-title">Sales by Country - ${divisionName}</h2>
                        </div>
                        <div class="table-container">
                            ${salesCountryTableHTML}
                        </div>
                        <div class="table-footer-note">
                            ★ = Sorting by Base Period highest to lowest | Δ% shows percentage change between consecutive periods
                        </div>
                    ` : card.id === 'sales-customer' ? `
                        <div class="table-title-container">
                            <h2 class="page-title">Top 20 Customers - ${divisionName}</h2>
                        </div>
                        <div class="table-container">
                            ${salesCustomerTableHTML}
                        </div>
                        <div class="table-footer-note">
                            ★ = Sorting by Base Period highest to lowest | Δ% shows percentage change between consecutive periods
                        </div>
                    ` : card.id === 'sales-volume-analysis' ? `
                        <div class="chart-title-container">
                            <h2 class="page-title">Sales & Volume Analysis - ${divisionName}</h2>
                            <div class="page-subtitle">(AED)</div>
                        </div>
                        <div class="chart-full-container">
                            ${salesVolumeChartHTML}
                        </div>
                    ` : card.id === 'margin-analysis' ? `
                        <div class="chart-title-container">
                            <h2 class="page-title">Margin over Material - ${divisionName}</h2>
                            <div class="page-subtitle">(AED & AED/Kg)</div>
                        </div>
                        <div class="chart-full-container">
                            ${marginAnalysisChartHTML}
                        </div>
                    ` : card.id === 'manufacturing-cost' ? `
                        <div class="chart-title-container">
                            <h2 class="page-title">Manufacturing Cost - ${divisionName}</h2>
                            <div class="page-subtitle">(AED)</div>
                        </div>
                        <div class="chart-full-container">
                            ${manufacturingCostChartHTML}
                        </div>
                    ` : card.id === 'below-gp-expenses' ? `
                        <div class="chart-title-container">
                            <h2 class="page-title">Below GP Expenses - ${divisionName}</h2>
                            <div class="page-subtitle">(AED)</div>
                        </div>
                        <div class="chart-full-container">
                            ${belowGPExpensesChartHTML}
                        </div>
                    ` : card.id === 'cost-profitability-trend' ? `
                        <div class="chart-title-container">
                            <h2 class="page-title">Cost & Profitability Trend - ${divisionName}</h2>
                            <div class="page-subtitle">(AED)</div>
                        </div>
                        <div class="chart-full-container">
                            ${costProfitabilityTrendChartHTML}
                        </div>
                    ` : `
                        <div class="coming-soon">
                            <div class="coming-soon-icon">${card.icon}</div>
                            <div class="coming-soon-text">${card.title}</div>
                            <div class="coming-soon-subtitle">This report will be available soon</div>
                        </div>
                    `}
                </div>
            </div>
        `).join('')}
    </div>
    
    <script>
        function scrollAllToTop() {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            ['.main-container', '.content-page', '.page-content', '.table-container'].forEach(function(selector) {
                document.querySelectorAll(selector).forEach(function(el) { el.scrollTop = 0; });
            });
            // Scroll the header/title into view as a last resort
            var header = document.querySelector('.page-header');
            if (header) header.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        window.onload = scrollAllToTop;
        function showPage(pageId) {
            document.getElementById('main-dashboard').style.display = 'none';
            const pages = document.querySelectorAll('.content-page');
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById('page-' + pageId).classList.add('active');
            scrollAllToTop();
        }
        function showDashboard() {
            const pages = document.querySelectorAll('.content-page');
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById('main-dashboard').style.display = 'block';
        }
        console.log('✅ Comprehensive Report loaded successfully!');
        console.log('📊 Available reports: ${cardConfigs.length}');
    </script>
</body>
</html>`;

      // Create and download the HTML file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Use the required format for the file name
      const safeDivision = divisionName.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, ' ').trim();
      const safePeriod = basePeriod.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '-');
      link.download = `Comprehensive Report - ${safeDivision} - ${safePeriod}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('✅ Comprehensive HTML export generated and download started.');
      
    } catch (err) {
      console.error('❌ Comprehensive export failed:', err);
      setError(`Export failed: ${err.message}. Check console for details.`);
    } finally {
      setIsExporting(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [exportError, setExportError] = useState(null);

  // This effect will be responsible for triggering the export
  // It uses a button click state to ensure it runs only when needed
  const [triggerExport, setTriggerExport] = useState(false);

  // The actual export logic is now separated
  const comprehensiveExport = async () => {
    if (isExporting) return;
    setIsLoading(true);
    setExportError(null);
    try {
      await handleComprehensiveExport();
        } catch (err) {
      setExportError(err.message);
      console.error("Comprehensive Export failed:", err);
    } finally {
      setIsLoading(false);
      setTriggerExport(false); // Reset the trigger
    }
  };

  useEffect(() => {
    if (triggerExport) {
      comprehensiveExport();
    }
  }, [triggerExport]);


  return (
      <button 
      id="comprehensive-export-btn"
      onClick={() => {
        console.log('🔥 Comprehensive HTML Export button clicked');
        setTriggerExport(true);
      }}
      disabled={isExporting || isLoading}
      className="export-btn html-export"
    >
      {isExporting || isLoading ? 'Exporting...' : 'Generate Comprehensive HTML Report'}
      </button>
  );
};

export default ComprehensiveHTMLExport; 