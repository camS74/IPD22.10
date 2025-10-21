import React, { useRef, useEffect, useState } from 'react';
import { useFilter } from '../../../contexts/FilterContext';
import { useExcelData } from '../../../contexts/ExcelDataContext';
import BarChart from './BarChart';
import ModernMarginGauge from './ModernMarginGauge';
import ManufacturingCostChart from './ManufacturingCostChart.tsx';
import BelowGPExpensesChart from './BelowGPExpensesChart.tsx';
import ExpencesChart from './ExpencesChart';
import Profitchart from './Profitchart';
import './ChartContainer.css';
import { computeCellValue as sharedComputeCellValue } from '../../../utils/computeCellValue';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// Import the same logo used in the browser
import interplastLogo from '../../../assets/Ip Logo.png';


/**
 * Complete replacement for the original ChartContainer.js.
 * --------------------------------------------------------
 * Key changes:
 * 1.  AI Write-up is exported as vector **text** on an **A4 portrait** page using `jspdf.html`,
 *     so the panel chrome is gone and original typography/spacing is preserved.
 * 2.  All chart pages are still exported one-per-page in **A4 landscape** with ultra-narrow
 *     side margins (20 pt) so each chart fills the sheet.
 * 3.  No other functional changes have been made – state, refs, logging, rendering etc. are
 *     identical to the prior version.
 */

const ChartContainer = ({ tableData, selectedPeriods, onExportRefsReady }) => {
  /* --------------------------------------------------
   * CONTEXTS & HOOKS
   * -------------------------------------------------- */
  const { excelData, selectedDivision } = useExcelData();
  const { 
    columnOrder, 
    basePeriodIndex,
    chartVisibleColumns, 
    isColumnVisibleInChart,
    dataGenerated
  } = useFilter();

  /* --------------------------------------------------
   * REFS FOR EXPORT
   * -------------------------------------------------- */
  const barChartRef = useRef(null);
  const modernMarginGaugeRef = useRef(null);
  const manufacturingCostChartRef = useRef(null);
  const belowGPExpensesChartRef = useRef(null);
  const combinedTrendsRef = useRef(null);

  /* --------------------------------------------------
   * HELPER: computeCellValue (delegates to shared util)
   * -------------------------------------------------- */
  const divisionData = excelData[selectedDivision] || [];
  const computeCellValue = (rowIndex, column) =>
    sharedComputeCellValue(divisionData, rowIndex, column);

  /* --------------------------------------------------
   * BUILD CHART DATA (unchanged-from-original block)
   * -------------------------------------------------- */
  const periods = columnOrder;
  const basePeriod = periods[basePeriodIndex];
  const visiblePeriods = periods.filter(p => isColumnVisibleInChart(p.id));
  
  // State to track PDF export mode for optimization
  const [isPDFExporting, setIsPDFExporting] = useState(false);

  const chartData = {};
  const colsToIterate = visiblePeriods.length ? visiblePeriods : periods;

  colsToIterate.forEach(col => {
    let key;
    if (col.isCustomRange) {
      key = `${col.year}-${col.month}-${col.type}`;
    } else {
      key = `${col.year}-${col.month || 'Year'}-${col.type}`;
    }
    
    const sales = computeCellValue(3, col);
    const material = computeCellValue(5, col);
    const salesVol = computeCellValue(7, col);
    const prodVol = computeCellValue(8, col);
    chartData[key] = {
      sales,
      materialCost: material,
      salesVolume: salesVol,
      productionVolume: prodVol,
      marginPerKg: salesVol > 0 ? (sales - material) / salesVol : null
    };
  });

  /* --------------------------------------------------
   * EXPORT HANDLER – NEW IMPLEMENTATION
   * -------------------------------------------------- */
  const handleExportAllCharts = async () => {
    setIsPDFExporting(true); // Enable PDF export mode
    try {
      // Division full names mapping
      const divisionNames = {
        FP: 'Flexible Packaging',
        SB: 'Shopping Bags',
        TF: 'Thermoforming Products',
        HCM: 'Preforms and Closures'
      };

      // Find and click the Charts tab to ensure charts are visible
      const allTabs = document.querySelectorAll('.tab-button');
      let chartsTabElement = null;
      
      allTabs.forEach(tab => {
        if (tab.textContent.includes('Charts')) {
          chartsTabElement = tab;
        }
      });
      
      if (!chartsTabElement) {
        alert('Charts tab not found. Please ensure the Charts view is available.');
        return;
      }
      
      // Check if Charts tab is not already active
      if (!chartsTabElement.classList.contains('active')) {
        // Click the Charts tab
        chartsTabElement.click();
        // Wait for tab switch and charts to render
        await new Promise(r => setTimeout(r, 1500));
      }

      // Additional wait to ensure charts are fully rendered
      await new Promise(r => setTimeout(r, 500));

      /* 1 ► create doc in landscape orientation */
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      /* 1.5 ► Add title page in landscape */
      const pageW = 842; // A4 landscape width
      const pageH = 595; // A4 landscape height
      
      // Get division full name
      const divisionFullName = divisionNames[selectedDivision] || selectedDivision;
      
      // Add logo to top left - SYNCHRONOUS APPROACH
      try {
        console.log('Adding logo synchronously...');
        
        // Create a promise for image loading to make it synchronous
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = function() {
            try {
              // Get actual image dimensions
              const originalWidth = this.naturalWidth;
              const originalHeight = this.naturalHeight;
              const aspectRatio = originalWidth / originalHeight;
              
              // Set PDF logo size maintaining exact aspect ratio - DOUBLED SIZE
              const pdfLogoWidth = 320; // Doubled from 160
              const pdfLogoHeight = pdfLogoWidth / aspectRatio;
              
              console.log(`Original: ${originalWidth}x${originalHeight}, PDF: ${pdfLogoWidth}x${pdfLogoHeight}`);
              
              // Add with perfect proportions
              pdf.addImage(interplastLogo, 'PNG', 30, 45, pdfLogoWidth, pdfLogoHeight);
              console.log('Logo added successfully');
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = function() {
            reject(new Error('Failed to load logo image'));
          };
          img.src = interplastLogo;
        });
        
      } catch (logoError) {
        console.warn('Could not add logo:', logoError);
        // Fallback - add logo with fixed dimensions (doubled from 160x40 to 320x80)
        pdf.addImage(interplastLogo, 'PNG', 30, 45, 320, 80);
      }
      
      // Add title to the first page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(0, 51, 102); // Logo blue color instead of dark gray
      
      // Center the title
      const titleText = `${divisionFullName} Financial Report`;
      const titleWidth = pdf.getTextWidth(titleText);
      const titleX = (pageW - titleWidth) / 2;
      pdf.text(titleText, titleX, pageH / 2 - 50);
      
      // Add subtitle with Period information
      pdf.setFont('helvetica', 'bold'); // Keep it bold as requested
      pdf.setFontSize(16);
      pdf.setTextColor(0, 51, 102); // Logo blue color instead of gray
      

      
      // Format base period text from the period object
      if (basePeriod && basePeriodIndex !== null) {
        // Line 1: Year and Quarter/Month (handle custom ranges)
        let periodLine1 = '';
        if (basePeriod.isCustomRange) {
          // For custom ranges, use displayName
          periodLine1 = `Period: ${basePeriod.year} ${basePeriod.displayName}`;
        } else if (basePeriod.month) {
          // For regular monthly periods
          periodLine1 = `Period: ${basePeriod.year} ${basePeriod.month}`;
        } else {
          // For yearly periods
          periodLine1 = `Period: ${basePeriod.year}`;
        }
        
        // Line 2: Type (Actual, Budget, etc.)
        const periodLine2 = basePeriod.type || '';
        
        // Calculate positions for centered text
        const line1Width = pdf.getTextWidth(periodLine1);
        const line2Width = pdf.getTextWidth(periodLine2);
        const line1X = (pageW - line1Width) / 2;
        const line2X = (pageW - line2Width) / 2;
        
        // Display on separate lines with good spacing
        pdf.text(periodLine1, line1X, pageH / 2 + 10);
        pdf.text(periodLine2, line2X, pageH / 2 + 35);
      } else {
        // If no base period is set
        const noBasePeriodText = 'No Period Set';
        const noBasePeriodWidth = pdf.getTextWidth(noBasePeriodText);
        const noBasePeriodX = (pageW - noBasePeriodWidth) / 2;
        pdf.text(noBasePeriodText, noBasePeriodX, pageH / 2 + 20);
      }

      /* 2 ► Set up dimensions for chart pages - OPTIMIZED FOR MAXIMUM CHART SIZE */
      const landscapePageW = pageW; // 842 pt
      const landscapePageH = pageH; // 595 pt
      const margin = 8; // Reduced from 20 to 8 for maximum chart space
      const contentW = landscapePageW - margin * 2;
      const contentH = landscapePageH - margin * 2;

      /* 3 ► list of visual chart refs (AI panel handled separately) */
      const chartRefs = [
        { ref: barChartRef, selector: '.echarts-for-react', name: 'Bar Chart' },
        { ref: modernMarginGaugeRef, selector: '.echarts-for-react', name: 'Margin Gauge' },
        { ref: manufacturingCostChartRef, selector: null, isManufacturing: true, name: 'Manufacturing Cost' },
        { ref: belowGPExpensesChartRef, selector: null, isBelowGP: true, name: 'Below GP Expenses' },
        { ref: combinedTrendsRef, selector: null, name: 'Combined Trends' }
      ];

      /* 4 ► iterate over charts */
      let capturedCharts = 0;
      for (let i = 0; i < chartRefs.length; i++) {
        const { ref, selector, isManufacturing, isBelowGP, name } = chartRefs[i];
        
        // Determine if this chart should use reduced quality for smaller file size
        const isLargeChart = name === 'Manufacturing Cost' || name === 'Below GP Expenses' || name === 'Combined Trends';
        const quality = isLargeChart ? 0.4 : 0.85; // 40% quality for large charts, 85% for others
        const scale = isLargeChart ? 0.8 : 1.5; // Much lower scale for large charts
        const containerNode = ref.current;
        
        // Add new page for first chart (after title page)
        if (i === 0) {
          pdf.addPage('landscape', 'a4');
        }
        
        if (!containerNode) {
          console.warn(`Chart ref not found for ${name}`);
          continue;
        }

        // Check if container is visible
        const rect = containerNode.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn(`Chart ${name} has no dimensions, skipping`);
            continue;
        }

        console.log(`Processing ${name}:`, { width: rect.width, height: rect.height });



        // Hide any tooltips before capture
        const tooltips = document.querySelectorAll('.ant-tooltip, [role="tooltip"], .echarts-tooltip, .tooltip');
        tooltips.forEach(tooltip => {
          if (tooltip) tooltip.style.display = 'none';
        });

        // OPTIMIZE CHART FOR PDF - Remove padding/margins temporarily
        const originalStyles = new Map();
        
        // Store original styles and apply PDF-optimized ones
        const optimizeElementForPDF = (element, removeMargins = true) => {
          if (!element) return;
          
          originalStyles.set(element, {
            padding: element.style.padding,
            margin: element.style.margin,
            marginTop: element.style.marginTop,
            marginBottom: element.style.marginBottom,
            width: element.style.width,
            minWidth: element.style.minWidth,
            maxWidth: element.style.maxWidth
          });
          
          if (removeMargins) {
            element.style.padding = '10px'; // Minimal padding
            element.style.margin = '0';
            element.style.marginTop = '0';
            element.style.marginBottom = '0';
          }
          
          // Make charts use full available width
          element.style.width = '100%';
          element.style.minWidth = '100%';
          element.style.maxWidth = 'none';
        };

        // Apply optimizations
        optimizeElementForPDF(containerNode);
        
        // Also optimize child elements that might have excessive padding
        const chartElements = containerNode.querySelectorAll('.modern-margin-gauge-panel, .echarts-for-react, .react_for_echarts');
        chartElements.forEach(el => optimizeElementForPDF(el));

        // Wait for content to settle with new styles
        await new Promise(r => setTimeout(r, 300));

        // Special handling for Combined Trends - ensure components are fully rendered
        if (name === 'Combined Trends') {
          console.log('Giving Combined Trends extra time to render...');
          await new Promise(r => setTimeout(r, 1000));
        }

        let canvas;
        
        try {
          /* Resize ECharts instance (if any) to maximise quality */
          if (typeof containerNode.getEchartsInstance === 'function') {
            const inst = containerNode.getEchartsInstance();
            if (inst) {
              // Hide tooltip before resize
              inst.dispatchAction({
                type: 'hideTip'
              });
              inst.resize({ width: contentW, height: contentH });
              await new Promise(r => setTimeout(r, 300));
            }
            
            /* Capture bitmap for ECharts */
            const chartElement = containerNode.querySelector(selector) || containerNode;
            canvas = await html2canvas(chartElement, {
              scale: scale, // Use dynamic scale based on chart type
              backgroundColor: '#ffffff',
              useCORS: true,
              allowTaint: true,
              logging: false
            });
              } else {
            /* For non-ECharts components - capture the entire container */
            canvas = await html2canvas(containerNode, {
              scale: scale, // Use dynamic scale based on chart type
              backgroundColor: '#ffffff',
              useCORS: true,
              allowTaint: true,
              logging: false,
              onclone: (clonedDoc, element) => {
                // Ensure visibility in cloned document
                element.style.display = 'block';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                
                // Make sure panel and title are visible
                const panel = element.querySelector('.modern-margin-gauge-panel');
                if (panel) {
                  panel.style.display = 'block';
                  panel.style.visibility = 'visible';
                  panel.style.backgroundColor = '#ffffff';
                }
                
                const title = element.querySelector('.modern-gauge-heading, h2');
                if (title) {
                  title.style.display = 'block';
                  title.style.visibility = 'visible';
                  title.style.color = '#333';
                }
              }
            });
          }
          
          if (!canvas || canvas.width === 0 || canvas.height === 0) {
            console.error(`Failed to capture ${name} - invalid canvas:`, {
              canvas: !!canvas,
              width: canvas?.width,
              height: canvas?.height,
              containerDimensions: { width: rect.width, height: rect.height }
            });
          continue;
        }

          // Create image data - Use JPEG for large charts to reduce file size, PNG for others
          const format = isLargeChart ? 'image/jpeg' : 'image/png';
          const imgData = canvas.toDataURL(format, quality);

          /* Calculate dimensions to fit on page */
          const imgRatio = canvas.width / canvas.height;
          const pageRatio = contentW / contentH;
          
          let drawW, drawH, x, y;
          
          if (imgRatio > pageRatio) {
            // Image is wider than page ratio
            drawW = contentW;
            drawH = contentW / imgRatio;
            x = margin;
            y = margin + (contentH - drawH) / 2;
          } else {
            // Image is taller than page ratio
            drawH = contentH;
            drawW = contentH * imgRatio;
            x = margin + (contentW - drawW) / 2;
            y = margin;
          }
          
          // Validate dimensions
          if (drawW > 0 && drawH > 0 && !isNaN(x) && !isNaN(y)) {
            // Add image to PDF with appropriate format
            const pdfFormat = isLargeChart ? 'JPEG' : 'PNG';
            pdf.addImage(imgData, pdfFormat, x, y, drawW, drawH);
            capturedCharts++;
            
            /* Add a new page for next chart (except last) */
            if (i < chartRefs.length - 1) {
              pdf.addPage('landscape', 'a4');
            }
          } else {
            console.error(`Invalid dimensions for ${name}:`, { drawW, drawH, x, y });
          }
        } catch (err) {
          console.error(`Error capturing ${name}:`, err);
        }

        // RESTORE ORIGINAL STYLES after capture
        originalStyles.forEach((styles, element) => {
          if (element && styles) {
            Object.keys(styles).forEach(prop => {
              if (styles[prop] !== undefined) {
                element.style[prop] = styles[prop];
              }
            });
          }
        });
      }

      /* 5 ► Add table export after all charts */
      try {
        console.log('Starting table export process...');
        
        // Check if data is generated first
        if (!dataGenerated) {
          console.warn('Data not generated yet, skipping table export');
        } else {
          // Switch to Data Table tab to capture the table
          const dataTableTab = Array.from(allTabs).find(tab => tab.textContent.includes('Data Table'));
          console.log('Data Table tab found:', !!dataTableTab);
          
          if (dataTableTab && !dataTableTab.classList.contains('active')) {
            console.log('Switching to Data Table tab...');
            dataTableTab.click();
            await new Promise(r => setTimeout(r, 1500)); // Increased wait time
          }

          // Wait a bit more for table to render
          await new Promise(r => setTimeout(r, 1000));

          // Find the table element
          const tableElement = document.querySelector('.table-view');
          console.log('Table element found:', !!tableElement);
          
          if (tableElement) {
            // Check if table has data
            const financialTable = tableElement.querySelector('.financial-table');
            console.log('Financial table found:', !!financialTable);
            
            if (financialTable) {
              console.log('Table rows count:', financialTable.querySelectorAll('tr').length);
              
              // Simple approach first - try direct capture
              console.log('Attempting direct table capture...');
              const directCanvas = await html2canvas(financialTable, {
                scale: 0.9, // Reduced scale for table
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: true,
                width: financialTable.scrollWidth,
                height: financialTable.scrollHeight
              });
              
              if (directCanvas && directCanvas.width > 0 && directCanvas.height > 0) {
                console.log('Direct table capture successful!');
                pdf.addPage('landscape', 'a4');
                
                const a4PageW = pdf.internal.pageSize.getWidth();
                const a4PageH = pdf.internal.pageSize.getHeight();
                const a4Margin = 20;
                const a4ContentW = a4PageW - a4Margin * 2;
                const a4ContentH = a4PageH - a4Margin * 2;
                
                const tableImgData = directCanvas.toDataURL('image/jpeg', 0.6); // Reduced table quality
                const tableImgRatio = directCanvas.width / directCanvas.height;
                const a4PageRatio = a4ContentW / a4ContentH;
                
                let tableDrawW, tableDrawH, tableX, tableY;
                
                if (tableImgRatio > a4PageRatio) {
                  tableDrawW = a4ContentW;
                  tableDrawH = a4ContentW / tableImgRatio;
                  tableX = a4Margin;
                  tableY = a4Margin + (a4ContentH - tableDrawH) / 2;
                } else {
                  tableDrawH = a4ContentH;
                  tableDrawW = a4ContentH * tableImgRatio;
                  tableX = a4Margin + (a4ContentW - tableDrawW) / 2;
                  tableY = a4Margin;
                }
                
                pdf.addImage(tableImgData, 'JPEG', tableX, tableY, tableDrawW, tableDrawH);
                capturedCharts++;
                console.log('Direct table added to PDF successfully');
              } else {
                console.log('Direct capture failed, trying container approach...');
                
                // Create a cloned container for the table
                const tableContainer = document.createElement('div');
                tableContainer.style.fontFamily = 'Arial, sans-serif';
                tableContainer.style.padding = '20px';
                tableContainer.style.backgroundColor = 'white';
                tableContainer.style.width = '100%';
                tableContainer.style.minHeight = '500px';
                
                // Get the table title
                const titleContainer = tableElement.querySelector('.table-title');
                if (titleContainer) {
                  console.log('Adding table title...');
                  const clonedTitle = titleContainer.cloneNode(true);
                  // Remove the PDF export button from the cloned title
                  const exportBtn = clonedTitle.querySelector('.pdf-export-controls');
                  if (exportBtn) {
                    exportBtn.remove();
                  }
                  tableContainer.appendChild(clonedTitle);
                }
                
                // Clone the financial table
                const clonedTable = financialTable.cloneNode(true);
                tableContainer.appendChild(clonedTable);
                
                // Temporarily add to document for proper rendering
                tableContainer.style.position = 'absolute';
                tableContainer.style.left = '-9999px';
                tableContainer.style.top = '-9999px';
                tableContainer.style.zIndex = '-1';
                document.body.appendChild(tableContainer);
                
                // Wait for rendering
                await new Promise(r => setTimeout(r, 500));
                
                console.log('Table container dimensions:', {
                  width: tableContainer.scrollWidth,
                  height: tableContainer.scrollHeight,
                  offsetWidth: tableContainer.offsetWidth,
                  offsetHeight: tableContainer.offsetHeight
                });
                
                // Add a new page for the table (A4 landscape for better table fit)
                pdf.addPage('landscape', 'a4');
                console.log('Added new A4 landscape page for table');
                
                // A4 landscape dimensions (841.89 × 595.28 pt)
                const a4PageW = pdf.internal.pageSize.getWidth();
                const a4PageH = pdf.internal.pageSize.getHeight();
                const a4Margin = 20;
                const a4ContentW = a4PageW - a4Margin * 2;
                const a4ContentH = a4PageH - a4Margin * 2;
                
                console.log('A4 page dimensions:', { a4PageW, a4PageH, a4ContentW, a4ContentH });
                
                // Capture the table with enhanced options
                console.log('Starting table capture...');
                const tableCanvas = await html2canvas(tableContainer, {
                  scale: 0.8, // Reduced scale for backup table capture
                  backgroundColor: '#ffffff',
                  useCORS: true,
                  allowTaint: true,
                  logging: true, // Enable logging for debugging
                  width: tableContainer.scrollWidth,
                  height: tableContainer.scrollHeight,
                  windowWidth: tableContainer.scrollWidth,
                  windowHeight: tableContainer.scrollHeight,
                  foreignObjectRendering: false
                });
                
                console.log('Table canvas created:', {
                  width: tableCanvas.width,
                  height: tableCanvas.height,
                  valid: !!(tableCanvas && tableCanvas.width > 0 && tableCanvas.height > 0)
                });
                
                // Remove the temporary container
                document.body.removeChild(tableContainer);
                
                if (tableCanvas && tableCanvas.width > 0 && tableCanvas.height > 0) {
                  const tableImgData = tableCanvas.toDataURL('image/jpeg', 0.5); // Further reduced table quality
                  console.log('Table image data created, length:', tableImgData.length);
                  
                  // Calculate table dimensions to fit A4 page
                  const tableImgRatio = tableCanvas.width / tableCanvas.height;
                  const a4PageRatio = a4ContentW / a4ContentH;
                  
                  let tableDrawW, tableDrawH, tableX, tableY;
                  
                  if (tableImgRatio > a4PageRatio) {
                    // Table is wider than page ratio
                    tableDrawW = a4ContentW;
                    tableDrawH = a4ContentW / tableImgRatio;
                    tableX = a4Margin;
                    tableY = a4Margin + (a4ContentH - tableDrawH) / 2;
                  } else {
                    // Table is taller than page ratio
                    tableDrawH = a4ContentH;
                    tableDrawW = a4ContentH * tableImgRatio;
                    tableX = a4Margin + (a4ContentW - tableDrawW) / 2;
                    tableY = a4Margin;
                  }
                  
                  console.log('Table positioning:', { tableDrawW, tableDrawH, tableX, tableY });
                  
                  // Add table to PDF
                  pdf.addImage(tableImgData, 'JPEG', tableX, tableY, tableDrawW, tableDrawH);
                  capturedCharts++; // Count table as captured content
                  console.log('Table successfully added to PDF');
                } else {
                  console.error('Failed to capture table - invalid canvas:', {
                    canvas: !!tableCanvas,
                    width: tableCanvas?.width,
                    height: tableCanvas?.height
                  });
                }
              }
            } else {
              console.error('Financial table not found in table view');
            }
          } else {
            console.error('Table view element not found');
            
            // Alternative approach - try to find table in current document
            const alternativeTable = document.querySelector('.financial-table');
            console.log('Alternative table search:', !!alternativeTable);
            
            if (alternativeTable) {
              console.log('Found alternative table, attempting capture...');
              // Try to capture the alternative table directly
              const altCanvas = await html2canvas(alternativeTable, {
                scale: 0.7, // Reduced scale for alternative table
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: true
              });
              
              if (altCanvas && altCanvas.width > 0 && altCanvas.height > 0) {
                pdf.addPage('landscape', 'a4');
                const altImgData = altCanvas.toDataURL('image/jpeg', 0.4); // Much reduced alternative table quality
                const a4PageW = pdf.internal.pageSize.getWidth();
                const a4PageH = pdf.internal.pageSize.getHeight();
                const a4Margin = 20;
                pdf.addImage(altImgData, 'JPEG', a4Margin, a4Margin, a4PageW - 2*a4Margin, a4PageH - 2*a4Margin);
                capturedCharts++;
                console.log('Alternative table capture successful');
              }
            }
          }
          
          // Switch back to Charts tab
          if (chartsTabElement) {
            console.log('Switching back to Charts tab...');
            chartsTabElement.click();
            await new Promise(r => setTimeout(r, 500));
          }
        }
      } catch (tableErr) {
        console.error('Error adding table to PDF:', tableErr);
        console.error('Table error stack:', tableErr.stack);
        // Continue with export even if table fails
      }

      if (capturedCharts === 0) {
        alert('No charts could be captured. Please ensure you are on the Charts tab and charts are visible.');
        return;
      }

      /* 6 ► save with compression and enhanced quality settings */
      pdf.save(`${divisionFullName}_Financial_Report_A4.pdf`, { 
        compress: true,
        precision: 16, // Higher precision for better quality
        userUnit: 1.0 // Standard unit for better rendering
      });
      
      console.log(`Successfully exported ${capturedCharts} items (charts + table) to A4 landscape PDF with enhanced quality`);
    } catch (err) {
      // eslint-disable-next-line no-alert
      console.error('PDF export failed:', err);
      alert('Failed to export PDF – check console for details.');
    } finally {
      setIsPDFExporting(false); // Disable PDF export mode
    }
  };

  /* --------------------------------------------------
   * EXPOSE EXPORT FUNCTION TO PARENT
   * -------------------------------------------------- */
  useEffect(() => {
    if (onExportRefsReady) {
      onExportRefsReady({
        exportFunction: handleExportAllCharts,
        refs: {
          barChartRef,
          modernMarginGaugeRef,
          manufacturingCostChartRef,
          belowGPExpensesChartRef,
          combinedTrendsRef
        }
      });
    }
  }, [onExportRefsReady]);

  /* --------------------------------------------------
   * RENDER – identical structure to original
   * -------------------------------------------------- */
  return (
    <div className="chart-container-root">
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: 16, background: '#f5f5f5', borderRadius: 12 }}>
      {/* CHARTS */}
      <div ref={barChartRef} className="modern-margin-gauge-panel" style={{ marginTop: 20 }}>
        <BarChart data={chartData} periods={visiblePeriods} basePeriod={basePeriod ? (basePeriod.isCustomRange ? `${basePeriod.year}-${basePeriod.month}-${basePeriod.type}` : `${basePeriod.year}-${basePeriod.month || 'Year'}-${basePeriod.type}`) : ''} />
      </div>

      <div ref={modernMarginGaugeRef} className="modern-margin-gauge-panel" style={{ marginTop: 40 }}>
        <ModernMarginGauge data={chartData} periods={visiblePeriods} basePeriod={basePeriod ? (basePeriod.isCustomRange ? `${basePeriod.year}-${basePeriod.month}-${basePeriod.type}` : `${basePeriod.year}-${basePeriod.month || 'Year'}-${basePeriod.type}`) : ''} style={{ margin: 0, backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }} />
      </div>

      <div ref={manufacturingCostChartRef} className="modern-margin-gauge-panel" style={{ marginTop: 40 }}>
        <ManufacturingCostChart 
          tableData={tableData} 
          selectedPeriods={visiblePeriods} 
          computeCellValue={computeCellValue}
          basePeriod={basePeriod ? (basePeriod.isCustomRange ? `${basePeriod.year}-${basePeriod.month}-${basePeriod.type}` : `${basePeriod.year}-${basePeriod.month || 'Year'}-${basePeriod.type}`) : ''}
          style={isPDFExporting ? { padding: '8px', marginTop: '0', margin: 0, backgroundColor: 'transparent', boxShadow: 'none' } : { margin: 0, backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }}
        />
      </div>

      <div ref={belowGPExpensesChartRef} className="modern-margin-gauge-panel" style={{ marginTop: 40 }}>
        <BelowGPExpensesChart 
          tableData={tableData} 
          selectedPeriods={visiblePeriods} 
          computeCellValue={computeCellValue}
          style={isPDFExporting ? { padding: '8px', marginTop: '0', margin: 0, backgroundColor: 'transparent', boxShadow: 'none' } : { margin: 0, backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }}
        />
      </div>

      <div ref={combinedTrendsRef} style={{ marginTop: 40 }}>
          <div className="modern-margin-gauge-panel" style={{ padding: 0, margin: 0, backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderRadius: '8px', width: '95%', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box', paddingBottom: '5%' }}>
          <ExpencesChart tableData={tableData} selectedPeriods={visiblePeriods} computeCellValue={computeCellValue} style={{ margin: 0, backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }} />
          <Profitchart tableData={tableData} selectedPeriods={visiblePeriods} computeCellValue={computeCellValue} style={{ margin: 0, backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartContainer; 
