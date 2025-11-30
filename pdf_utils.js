/**
 * PDF Generation Utilities
 * 
 * This utility file provides shared functions for PDF generation with dynamic row heights
 * and multi-line text support. These functions handle automatic text wrapping, dynamic
 * row height calculation, and proper spacing between rows in PDF tables.
 * 
 * Used across multiple dashboards: Investment, Income, Expense, Task
 * 
 * Key Features:
 * - Automatic text wrapping based on column widths
 * - Dynamic row height calculation based on content
 * - Proper spacing between rows for readability
 * - Support for multi-line text in table cells
 * - Configurable styling options
 */

/**
 * Calculate dynamic row height based on text wrapping in all cells
 * 
 * This function analyzes each cell in a row to determine how many lines of text
 * are needed after wrapping, then calculates the appropriate row height to accommodate
 * the cell with the most lines. This ensures that all wrapped text is visible.
 * 
 * @param {Object} doc - jsPDF document instance (required for text measurement)
 * @param {Array} rowData - Array of cell values for the row (strings or numbers)
 * @param {Array} colWidths - Array of column widths in mm (must match rowData length)
 * @param {Object} options - Configuration options
 * @param {number} options.baseHeight - Base height for single-line text in mm (default: 5)
 * @param {number} options.lineSpacing - Spacing between lines in mm (default: 4)
 * @param {number} options.padding - Padding on each side in mm (default: 4, total 4mm = 2mm left + 2mm right)
 * @returns {Object} Object containing:
 *   - maxLines: Maximum number of lines needed across all cells
 *   - cellHeight: Calculated height for the cell in mm
 *   - lineHeights: Array of line counts for each cell
 */
function calculateDynamicRowHeight(doc, rowData, colWidths, options = {}) {
  const {
    baseHeight = 5,        // Base height for single-line text in mm (increased from 4)
    lineSpacing = 4,       // Spacing between lines in mm (increased from 3)
    padding = 4            // Padding on each side (total 4mm = 2mm left + 2mm right)
  } = options;

  let maxLines = 1;
  const lineHeights = [];
  
  // Calculate number of lines needed for each cell
  rowData.forEach((cell, i) => {
    const cellWidth = colWidths[i];
    const cellText = String(cell || '');
    const maxTextWidth = cellWidth - padding; // Available width for text
    
    try {
      const lines = doc.splitTextToSize(cellText, maxTextWidth);
      const numLines = lines.length;
      lineHeights[i] = numLines;
      
      if (numLines > maxLines) {
        maxLines = numLines;
      }
    } catch (e) {
      // If splitTextToSize fails, assume single line
      lineHeights[i] = 1;
    }
  });
  
  // Calculate dynamic cell height based on maximum lines
  const cellHeight = baseHeight + ((maxLines - 1) * lineSpacing);
  
  return {
    maxLines,
    cellHeight,
    lineHeights
  };
}

/**
 * Render a table row with dynamic height and multi-line text support
 * 
 * This function renders a complete table row with automatic text wrapping, dynamic height,
 * and proper spacing. It calculates how many lines each cell needs, determines the row height
 * based on the cell with the most lines, then renders all cells with proper text positioning.
 * 
 * Features:
 * - Automatic text wrapping using jsPDF's splitTextToSize
 * - Dynamic row height based on content
 * - Alternating row colors (Excel-style)
 * - Proper vertical centering of text
 * - Configurable styling (colors, fonts, spacing)
 * - Page break handling support
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {Object} params - Row rendering parameters
 * @param {number} params.rowY - Y position of the row start (optional, uses currentY if not provided)
 * @param {number} params.currentY - Current Y position for page breaks
 * @param {Array} params.rowData - Array of cell values for the row (strings or numbers)
 * @param {Array} params.colWidths - Array of column widths in mm (must match rowData length)
 * @param {number} params.tableStartX - Starting X position of the table
 * @param {number} params.totalTableWidth - Total width of the table
 * @param {number} params.rowIndex - Index of the row (for alternating colors: 0, 1, 2, ...)
 * @param {Function} params.checkPageBreak - Optional function to check/add page breaks (currentY, cellHeight)
 * @param {Object} options - Configuration options
 * @param {number} options.baseHeight - Base height for single-line text in mm (default: 5)
 * @param {number} options.lineSpacing - Spacing between lines in mm (default: 4)
 * @param {number} options.padding - Padding on each side in mm (default: 4)
 * @param {number} options.fontSize - Font size (default: 7)
 * @param {string} options.fontFamily - Font family (default: 'helvetica')
 * @param {string} options.fontStyle - Font style (default: 'normal')
 * @param {Array} options.evenRowColor - RGB color for even rows (default: [242, 242, 242])
 * @param {Array} options.oddRowColor - RGB color for odd rows (default: [255, 255, 255])
 * @param {Array} options.borderColor - RGB color for borders (default: [200, 200, 200])
 * @param {number} options.borderWidth - Border width (default: 0.1)
 * @param {Array} options.textColor - RGB color for text (default: [0, 0, 0])
 * @returns {number} New Y position after rendering the row (for next row placement)
 */
function renderTableRowWithDynamicHeight(doc, params, options = {}) {
  const {
    rowY,
    currentY,
    rowData,
    colWidths,
    tableStartX,
    totalTableWidth,
    rowIndex,
    checkPageBreak = null  // Optional function to check/add page breaks
  } = params;
  
  const {
    baseHeight = 5,        // Base height for single-line text in mm (increased from 4)
    lineSpacing = 4,       // Spacing between lines in mm (increased from 3)
    padding = 4,           // Padding on each side (total 4mm = 2mm left + 2mm right)
    fontSize = 7,          // Font size
    fontFamily = 'helvetica',
    fontStyle = 'normal',
    evenRowColor = [242, 242, 242],  // Light gray #F2F2F2
    oddRowColor = [255, 255, 255],   // White
    borderColor = [200, 200, 200],   // Light gray border
    borderWidth = 0.1,
    textColor = [0, 0, 0]  // Black
  } = options;
  
  // Calculate dynamic row height
  const rowHeightInfo = calculateDynamicRowHeight(doc, rowData, colWidths, {
    baseHeight,
    lineSpacing,
    padding
  });
  
  const { maxLines, cellHeight, lineHeights } = rowHeightInfo;
  
  // Check for page break if function provided
  if (checkPageBreak && typeof checkPageBreak === 'function') {
    checkPageBreak(currentY, cellHeight);
  }
  
  const actualRowY = currentY;
  
  // Set font for text rendering
  doc.setFontSize(fontSize);
  doc.setFont(fontFamily, fontStyle);
  
  // Draw alternating row background
  if (rowIndex % 2 === 1) {
    doc.setFillColor(...evenRowColor);
    doc.rect(tableStartX, actualRowY, totalTableWidth, cellHeight, 'F');
  } else {
    doc.setFillColor(...oddRowColor);
    doc.rect(tableStartX, actualRowY, totalTableWidth, cellHeight, 'F');
  }
  
  // Set text color
  doc.setTextColor(...textColor);
  
  // Draw cells
  let x = tableStartX;
  rowData.forEach((cell, i) => {
    const cellWidth = colWidths[i];
    const cellText = String(cell || '');
    const maxTextWidth = cellWidth - padding; // Available width for text
    const numLines = lineHeights[i] || 1;
    
    // Draw cell border
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(borderWidth);
    doc.rect(x, actualRowY, cellWidth, cellHeight, 'S');
    
    // Calculate text position (vertically centered)
    const textX = x + (padding / 2); // 2mm padding from left
    const totalTextHeight = baseHeight + ((numLines - 1) * lineSpacing);
    const startTextY = actualRowY + (padding / 2) + (baseHeight / 2); // Start 2mm from top, then center
    
    // Split and draw text
    try {
      const lines = doc.splitTextToSize(cellText, maxTextWidth);
      
      // Draw all lines of text
      lines.forEach((line, lineIdx) => {
        const lineY = startTextY + (lineIdx * lineSpacing);
        doc.text(line, textX, lineY, { maxWidth: maxTextWidth });
      });
    } catch (e) {
      // Fallback if splitTextToSize fails
      const fallbackY = actualRowY + (padding / 2) + (baseHeight / 2);
      doc.text(cellText, textX, fallbackY, { maxWidth: maxTextWidth });
    }
    
    x += cellWidth; // Move to next cell
  });
  
  // Return new Y position after the row
  // Note: Spacing between rows is now handled by the caller for flexibility in scaling
  return actualRowY + cellHeight;
}

/**
 * Calculate optimal column widths based on actual text measurements
 * 
 * This function calculates the optimal width for each column in a PDF table by measuring
 * the actual rendered width of text (both headers and data). It ensures that columns are
 * wide enough to display content without truncation, while fitting within the page width.
 * 
 * Features:
 * - Uses actual text width measurement (not character count) for accuracy
 * - Measures both header and data text to find the widest content
 * - Supports fixed-width columns (e.g., dates, amounts)
 * - Automatically scales variable columns if total width exceeds page width
 * - Maintains minimum widths to ensure readability
 * 
 * @param {Object} doc - jsPDF document instance (required for text measurement)
 * @param {Array} dataArray - Array of data objects (each object represents a row)
 * @param {Array} headersArray - Array of header strings (column names)
 * @param {Function} formatDateFunc - Optional function to format dates before measurement
 * @param {Object} options - Configuration options
 * @param {number} options.padding - Padding for each cell in mm (default: 12)
 * @param {number} options.minWidth - Minimum column width in mm (default: 12)
 * @param {number} options.inchToMm - Conversion factor for inches to mm (default: 25.4)
 * @param {number} options.fontSize - Font size for measurement (default: 7)
 * @param {string} options.fontFamily - Font family (default: 'helvetica')
 * @param {string} options.fontStyle - Font style (default: 'normal')
 * @param {Array} options.fixedWidthColumns - Array of column indices with fixed widths
 * @param {Array} options.fixedWidthValues - Array of fixed width values (mm) corresponding to fixedWidthColumns
 * @returns {Array} Array of column widths in mm (same length as headersArray)
 */
function calculateOptimalColumnWidths(doc, dataArray, headersArray, formatDateFunc = null, options = {}) {
  const {
    padding = 12,          // Padding for each cell in mm
    minWidth = 12,         // Minimum column width in mm
    inchToMm = 25.4,      // 1 inch = 25.4mm
    fontSize = 7,          // Font size for measurement
    fontFamily = 'helvetica',
    fontStyle = 'normal',
    fixedWidthColumns = [], // Array of column indices with fixed widths (e.g., dates, amounts)
    fixedWidthValues = []   // Array of fixed width values corresponding to fixedWidthColumns
  } = options;
  
  // Set font for accurate measurement
  doc.setFontSize(fontSize);
  doc.setFont(fontFamily, fontStyle);
  
  // Helper to format dates
  const formatDateLocal = (dateStr) => {
    if (!dateStr) return '';
    if (formatDateFunc) return formatDateFunc(dateStr);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr || '');
    return date.toISOString().split('T')[0].replace(/-/g, '/');
  };
  
  const widths = [];
  const maxAvailableWidth = 277; // Landscape A4 - 20mm margins = 277mm
  
  try {
    // Measure each column
    headersArray.forEach((header, i) => {
      // Check if this column has a fixed width
      const fixedIndex = fixedWidthColumns.indexOf(i);
      if (fixedIndex >= 0 && fixedWidthValues[fixedIndex]) {
        widths[i] = fixedWidthValues[fixedIndex];
        return;
      }
      
      // Measure header width
      const headerWidth = doc.getTextWidth(header);
      
      // Measure data widths
      let maxDataWidth = 0;
      dataArray.forEach(row => {
        let cellValue = '';
        // Handle both array of arrays and array of objects
        if (Array.isArray(row)) {
          // Array of arrays: row[i] gives us the cell value directly
          cellValue = String(row[i] || '');
        } else if (row && typeof row === 'object') {
          // Array of objects: try to extract by column index
          const keys = Object.keys(row);
          if (keys[i]) {
            cellValue = String(row[keys[i]] || '');
          }
        } else {
          cellValue = String(row || '');
        }
        
        if (cellValue) {
          const measuredWidth = doc.getTextWidth(cellValue);
          if (measuredWidth > maxDataWidth) {
            maxDataWidth = measuredWidth;
          }
        }
      });
      
      // Calculate width based on max of header and data
      const calculatedWidth = Math.max(headerWidth, maxDataWidth) + padding;
      
      // Apply minimum width
      widths[i] = Math.max(minWidth, calculatedWidth);
    });
    
    // Scale down if total width exceeds available width
    const totalWidth = widths.reduce((sum, w) => sum + w, 0);
    if (totalWidth > maxAvailableWidth) {
      // Calculate fixed columns width (columns with fixed widths)
      const fixedColumnsWidth = fixedWidthColumns.reduce((sum, colIdx) => {
        return sum + (widths[colIdx] || 0);
      }, 0);
      
      // Calculate variable columns width
      const variableColumnsWidth = totalWidth - fixedColumnsWidth;
      const remainingWidth = maxAvailableWidth - fixedColumnsWidth;
      
      if (remainingWidth > 0 && variableColumnsWidth > 0) {
        const scaleFactor = remainingWidth / variableColumnsWidth;
        
        // Scale down variable columns (keep fixed columns unchanged)
        widths.forEach((width, i) => {
          if (fixedWidthColumns.indexOf(i) < 0) {
            widths[i] = Math.max(minWidth, width * scaleFactor);
          }
        });
      }
    }
    
  } catch (e) {
    console.error('Error calculating column widths:', e);
    // Fallback to equal widths
    const equalWidth = maxAvailableWidth / headersArray.length;
    headersArray.forEach((_, i) => {
      widths[i] = equalWidth;
    });
  }
  
  return widths;
}

/**
 * Draw filter criteria as colored blocks/cards in PDF
 * 
 * This function displays filter criteria as colored rectangular blocks/cards,
 * similar to the Investment Dashboard PDF export. Filters are displayed in
 * rows of 3 cards each, with each filter having a unique light color.
 * 
 * Features:
 * - Light colored background rectangles for each filter
 * - Dark text for readability on light backgrounds
 * - Multiple rows with proper spacing
 * - Configurable cards per row (default: 3)
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {Array} filterCriteria - Array of filter objects with:
 *   - label: Filter label (e.g., "Category", "Date From")
 *   - value: Filter value (e.g., "Fixed Deposit", "2024/01/01")
 *   - color: RGB color array [r, g, b] (original color - will be converted to light version)
 * @param {number} startY - Starting Y position for filters (default: 32)
 * @param {number} pageWidth - Page width in mm (default: 297 for landscape A4)
 * @param {Object} options - Configuration options
 * @param {number} options.cardHeight - Height of each filter card in mm (default: 7)
 * @param {number} options.cardSpacing - Spacing between cards in mm (default: 3)
 * @param {number} options.cardsPerRow - Number of cards per row (default: 3)
 * @param {number} options.marginX - Horizontal margin in mm (default: 10)
 * @param {number} options.fontSize - Font size for filter text (default: 9)
 * @returns {number} Y position after filters (for starting table below)
 */
function drawFilterCriteria(doc, filterCriteria, startY = 26, pageWidth = 297, options = {}) {
  const {
    cardHeight = 6,
    cardSpacing = 2,
    cardsPerRow = 3,
    marginX = 10,
    fontSize = 9
  } = options;
  
  // Light color palette for filter backgrounds
  const lightColors = [
    [173, 216, 230],  // Light blue
    [144, 238, 144],  // Light green
    [255, 182, 193],  // Light pink
    [255, 218, 185],  // Peach
    [221, 160, 221],  // Plum
    [176, 224, 230],  // Powder blue
    [255, 228, 196],  // Bisque
    [240, 230, 140],  // Khaki
    [152, 251, 152],  // Pale green
    [255, 239, 213]   // Papaya whip
  ];
  
  let filterY = startY;

  // Normalize and optionally filter out redundant criteria
  // Currently: hide Expanse_Ac_Tag because data is already grouped by this field in reports
  const visibleCriteria = (filterCriteria || []).filter(fc => fc && fc.label !== 'Expanse_Ac_Tag');
  
  if (visibleCriteria.length > 0) {
    // Calculate card width (distribute available width across cards per row)
    const availableWidth = pageWidth - (marginX * 2);
    const cardWidth = (availableWidth - (cardSpacing * (cardsPerRow - 1))) / cardsPerRow;
    
    // Calculate total width needed for filter cards (for centering)
    // For each row, calculate the number of cards and center that row
    const filterRows = Math.ceil(visibleCriteria.length / cardsPerRow);
    
    visibleCriteria.forEach((filter, index) => {
      // Determine which row this card belongs to
      const currentRow = Math.floor(index / cardsPerRow);
      
      // Calculate how many cards are in this row
      const cardsInCurrentRow = Math.min(cardsPerRow, visibleCriteria.length - (currentRow * cardsPerRow));
      
      // Calculate total width for this row
      const rowTotalWidth = (cardsInCurrentRow * cardWidth) + (cardSpacing * (cardsInCurrentRow - 1));
      
      // Calculate starting X position to center this row
      const rowStartX = (pageWidth - rowTotalWidth) / 2;
      
      // Calculate position within the row (0, 1, 2, etc.)
      const positionInRow = index % cardsPerRow;
      
      // Calculate X position for this card
      const cardX = rowStartX + (positionInRow * (cardWidth + cardSpacing));
      
      // Calculate Y position for this row
      filterY = startY + (currentRow * (cardHeight + cardSpacing));
      
      // Use light color from palette (cycle through if more filters than colors)
      const lightColor = lightColors[index % lightColors.length];
      
      // Draw light colored background rectangle
      doc.setFillColor(lightColor[0], lightColor[1], lightColor[2]);
      doc.rect(cardX, filterY, cardWidth, cardHeight, 'F');
      
      // Draw dark text for readability on light backgrounds
      doc.setTextColor(0, 0, 0); // Black text
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      
      const filterText = `${filter.label}: ${filter.value}`;
      const textX = cardX + cardWidth / 2;
      // Center text vertically in card - adjusted for better centering
      // jsPDF uses baseline for text, so we adjust to center properly
      const textY = filterY + (cardHeight / 2) + (fontSize * 0.25);
      doc.text(filterText, textX, textY, {
        align: 'center',
        maxWidth: cardWidth - 4
      });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
    });
    
    // Calculate total height used by filters
    const filterTotalHeight = filterRows * (cardHeight + cardSpacing) - cardSpacing;
    // Gap below filters should match gap above filters (title at y=10, filters start at y=18 = 8mm gap)
    filterY = startY + filterTotalHeight + 8; // Match spacing above filters
  } else {
    // No filters - show default message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('No filters applied', pageWidth / 2, filterY, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    filterY = filterY + 8;
  }
  
  return filterY;
}

/**
 * Calculate centered table start position when table is narrower than page width
 * 
 * This function calculates the X position to start the table so it's horizontally
 * centered on the page when the total table width is less than the available page width.
 * 
 * @param {number} totalTableWidth - Total width of all columns in mm
 * @param {number} pageWidth - Total page width in mm (default: 297 for landscape A4)
 * @param {number} margin - Margin on each side in mm (default: 10)
 * @returns {number} Centered table start X position in mm
 */
function calculateCenteredTableStart(totalTableWidth, pageWidth = 297, margin = 10) {
  const availableWidth = pageWidth - (2 * margin);
  
  // If table width is less than available width, center it
  if (totalTableWidth < availableWidth) {
    return (pageWidth - totalTableWidth) / 2;
  }
  
  // Otherwise, start at margin
  return margin;
}

/**
 * Draw table headers in PDF with navy blue background and golden text
 * 
 * This function draws table headers with custom formatting:
 * - Navy blue background
 * - Golden text (bold, center aligned)
 * - White borders between header cells
 * - Black outer border
 * - Text wrapping support for long headers
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {Array} headers - Array of header strings
 * @param {Array} colWidths - Array of column widths in mm (must match headers length)
 * @param {number} tableStartX - Starting X position of the table (can be centered automatically)
 * @param {number} headerY - Y position where headers should be drawn
 * @param {Object} options - Configuration options
 * @param {number} options.headerHeight - Height of header row in mm (default: 8)
 * @param {number} options.fontSize - Font size for headers (default: 9)
 * @param {Array} options.headerBgColor - RGB color for header background (default: [0, 32, 96] - navy blue)
 * @param {Array} options.headerTextColor - RGB color for header text (default: [255, 215, 0] - golden)
 * @param {Array} options.borderColor - RGB color for cell borders (default: [255, 255, 255] - white)
 * @param {number} options.padding - Padding inside header cells in mm (default: 2)
 * @param {number} options.pageWidth - Page width in mm (optional, for auto-centering)
 * @param {boolean} options.autoCenter - Auto-center table if narrower than page (default: true)
 * @returns {number} Y position after headers (for starting data rows)
 */
function drawTableHeaders(doc, headers, colWidths, tableStartX, headerY, options = {}) {
  const {
    headerHeight = 8,
    fontSize = 9,
    headerBgColor = [0, 32, 96],      // Navy blue
    headerTextColor = [255, 215, 0],  // Golden
    borderColor = [255, 255, 255],     // White borders
    padding = 2,
    pageWidth = null,
    autoCenter = true
  } = options;
  
  const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  
  // Auto-center table if narrower than page width
  let actualTableStartX = tableStartX;
  if (autoCenter && pageWidth && totalTableWidth < pageWidth - 20) {
    actualTableStartX = calculateCenteredTableStart(totalTableWidth, pageWidth, 10);
  }
  
  // Draw header background rectangle
  doc.setFillColor(...headerBgColor);
  doc.rect(actualTableStartX, headerY, totalTableWidth, headerHeight, 'F');
  
  // Draw header borders for each cell
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.2);
  let x = actualTableStartX;
  headers.forEach((header, i) => {
    const cellWidth = colWidths[i];
    if (i > 0) {
      // Draw vertical border between cells
      doc.line(x, headerY, x, headerY + headerHeight);
    }
    x += cellWidth;
  });
  
  // Draw header text with proper spacing (bold, center aligned, golden color)
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...headerTextColor);
  
  x = actualTableStartX;
  headers.forEach((header, i) => {
    const cellWidth = colWidths[i];
    // Center text horizontally in cell
    const textX = x + (cellWidth / 2);
    // Center text vertically in cell - adjusted for better centering
    // jsPDF uses baseline for text, so we adjust to center properly
    const textY = headerY + (headerHeight / 2) + (fontSize * 0.25);
    const maxTextWidth = cellWidth - (padding * 2);
    
    try {
      // Split header text to fit within column width
      const lines = doc.splitTextToSize(header, maxTextWidth);
      // Always center align the text
      doc.text(lines[0] || header, textX, textY, { 
        align: 'center',
        maxWidth: maxTextWidth 
      });
    } catch (e) {
      // Always center align the text
      doc.text(header, textX, textY, { 
        align: 'center',
        maxWidth: maxTextWidth 
      });
    }
    x += cellWidth;
  });
  
  // Reset text color for data rows
  doc.setTextColor(0, 0, 0);
  
  // Draw outer border around entire header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(actualTableStartX, headerY, totalTableWidth, headerHeight, 'S');
  
  // Always store actual table start X in doc for use in other functions (centered or not)
  doc._centeredTableStartX = actualTableStartX;
  doc._tableTotalWidth = totalTableWidth;
  
  // Return Y position below header (small spacing after header)
  // Backward compatible: returns number, but also stores centered X in doc
  return headerY + headerHeight + 1;
}

/**
 * Draw footer with page numbers, total records, and generation date
 * 
 * This function draws a footer at the bottom of each page with:
 * - Page numbers in format "Page X/Y"
 * - Total record count in center
 * - Generation date/time on the right
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {number} currentPage - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalRecords - Total number of records in the report
 * @param {number} pageWidth - Page width in mm (default: 297 for landscape A4)
 * @param {Object} options - Configuration options
 * @param {number} options.fontSize - Font size for footer (default: 8)
 * @param {number} options.marginBottom - Bottom margin in mm (default: 10)
 * @param {number} options.marginLeft - Left margin in mm (default: 20)
 * @param {number} options.marginRight - Right margin in mm (default: 20)
 * @param {Date} options.generationDate - Date object for generation time (default: new Date())
 */
function drawFooter(doc, currentPage, totalPages, totalRecords, pageWidth = 297, options = {}) {
  const {
    fontSize = 8,
    marginBottom = 10,
    marginLeft = 20,
    marginRight = 20,
    generationDate = new Date()
  } = options;
  
  const pageHeight = doc.internal.pageSize.height;
  const pageY = pageHeight - marginBottom;
  
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Page format: current page / total pages (e.g., "Page 2/8")
  doc.text(`Page ${currentPage}/${totalPages}`, marginLeft, pageY);
  
  // Total records in center
  doc.text(`Total Records: ${totalRecords}`, pageWidth / 2, pageY, { align: 'center' });
  
  // Generation date/time on the right
  doc.text(`Generated: ${generationDate.toLocaleString()}`, pageWidth - marginRight, pageY, { align: 'right' });
}

/**
 * Add new page and redraw headers
 * 
 * This function adds a new page to the PDF document and redraws the table headers.
 * It's used when data rows span multiple pages. The function also updates the
 * current page counter and draws the footer on the new page.
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {Array} headers - Array of header strings
 * @param {Array} colWidths - Array of column widths in mm
 * @param {number} tableStartX - Starting X position of the table
 * @param {number} startY - Starting Y position for subsequent pages (default: 30)
 * @param {Object} state - State object with page tracking (will be updated)
 * @param {number} state.currentPage - Current page number (will be incremented)
 * @param {number} state.totalPagesEstimate - Total pages estimate (will be updated)
 * @param {number} state.currentY - Current Y position (will be set to headerY + headerHeight + 1)
 * @param {Function} drawFooterFunc - Function to draw footer (will be called)
 * @param {Object} headerOptions - Options for drawTableHeaders (optional)
 * @returns {number} New currentY position after headers
 */
function addNewPageWithHeaders(doc, headers, colWidths, tableStartX, startY = 20, state, drawFooterFunc, headerOptions = {}) {
  doc.addPage();
  state.currentPage++;
  state.totalPagesEstimate = Math.max(state.totalPagesEstimate, state.currentPage);
  
  // On new pages, start at specified Y position (below title, before header)
  state.currentY = startY;
  
  // Draw footer on new page
  if (typeof drawFooterFunc === 'function') {
    drawFooterFunc();
  }
  
  // Use stored centered table start X if available (from previous page), otherwise use provided
  const actualTableStartX = doc._centeredTableStartX !== undefined ? doc._centeredTableStartX : tableStartX;
  
  // Redraw headers on new page with same centering as first page
  state.currentY = drawTableHeaders(doc, headers, colWidths, actualTableStartX, state.currentY, headerOptions);
  
  // Reset font for data rows
  doc.setFont('helvetica', 'normal');
  
  return state.currentY;
}

/**
 * Draw summary tiles for subtotals and grand total
 * 
 * This function draws rectangular tiles (blocks) to display subtotals and grand total
 * in a visually appealing way, similar to the image template:
 * - Subtotal tiles in top row (can be arranged horizontally)
 * - Grand total tile in bottom row (centered)
 * 
 * @param {Object} doc - jsPDF document instance
 * @param {Array} subtotals - Array of subtotal objects with:
 *   - label: String - Label for the subtotal (e.g., "Subtotal for 15SM")
 *   - amount: Number - Amount value
 *   - currency: String - Currency code (e.g., "CAD")
 *   - bgColor: Array - RGB color for background [r, g, b] (default: varies by index)
 *   - textColor: Array - RGB color for text [r, g, b] (default: [0, 0, 0])
 * @param {Object} grandTotal - Grand total object with:
 *   - label: String - Label (e.g., "Grand Total")
 *   - amount: Number - Total amount
 *   - currency: String - Currency code (optional)
 *   - bgColor: Array - RGB color for background [r, g, b] (default: [0, 0, 0] - black)
 *   - textColor: Array - RGB color for text [r, g, b] (default: [255, 255, 0] - yellow)
 * @param {number} startY - Y position to start drawing tiles
 * @param {number} pageWidth - Page width in mm (default: 297 for landscape A4)
 * @param {Object} options - Configuration options
 * @param {number} options.margin - Margin on each side in mm (default: 10)
 * @param {number} options.tileHeight - Height of each tile in mm (default: 12)
 * @param {number} options.tileSpacing - Spacing between tiles in mm (default: 5)
 * @param {number} options.rowSpacing - Spacing between rows in mm (default: 8)
 * @param {number} options.fontSize - Font size for tile text (default: 10)
 * @param {number} options.labelFontSize - Font size for labels (default: 9)
 * @param {number} options.borderWidth - Border width in mm (default: 0.5)
 * @param {number} options.padding - Padding inside tiles in mm (default: 3)
 * @returns {number} Y position after all tiles (for footer spacing)
 */
function drawSummaryTiles(doc, subtotals = [], grandTotal = null, startY, pageWidth = 297, options = {}) {
  const {
    margin = 10,
    tileHeight = 15, // Increased for better text spacing
    tileSpacing = 5,
    rowSpacing = 8,
    fontSize = 10,
    labelFontSize = 8, // Slightly smaller label
    borderWidth = 0.5,
    padding = 3 // Padding for proper spacing
  } = options;
  
  let currentY = startY;
  const availableWidth = pageWidth - (2 * margin);
  
  // Default colors for subtotals if not provided
  const defaultSubtotalColors = [
    [255, 248, 220], // Light yellow/beige
    [230, 230, 230], // Light grey
    [220, 255, 220], // Light green
    [255, 228, 225],  // Light pink
    [225, 225, 255], // Light blue
    [255, 250, 205]  // Light cream
  ];
  
  // Draw subtotal tiles in top row
  if (subtotals && subtotals.length > 0) {
    const numTiles = subtotals.length;
    const totalTileWidth = availableWidth - (tileSpacing * (numTiles - 1));
    const tileWidth = totalTileWidth / numTiles;
    
    let tileX = margin;
    
    subtotals.forEach((subtotal, index) => {
      const bgColor = subtotal.bgColor || defaultSubtotalColors[index % defaultSubtotalColors.length];
      const textColor = subtotal.textColor || [0, 0, 0];
      
      // Draw tile background
      doc.setFillColor(...bgColor);
      doc.rect(tileX, currentY, tileWidth, tileHeight, 'F');
      
      // Draw tile border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(borderWidth);
      doc.rect(tileX, currentY, tileWidth, tileHeight, 'S');
      
      // Format amount text
      let amountText = parseFloat(subtotal.amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      if (subtotal.currency && !subtotal.label.includes(subtotal.currency)) {
        amountText = `${amountText} ${subtotal.currency}`;
      }
      
      // Draw text on single line (label and amount together)
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      
      // Format complete text: label and amount on one line
      let displayText = '';
      if (subtotal.label && subtotal.label.trim()) {
        // Format label - include currency in parentheses if not already in label
        let label = subtotal.label;
        if (subtotal.currency && !label.includes(subtotal.currency)) {
          label = `${label} (${subtotal.currency})`;
        }
        displayText = `${label}: ${amountText}`;
      } else {
        displayText = amountText;
      }
      
      // Center text vertically and horizontally within tile
      const tileCenterY = currentY + (tileHeight / 2);
      const textY = tileCenterY + (fontSize * 0.35);
      doc.text(displayText, tileX + tileWidth / 2, textY, { align: 'center' });
      
      // Move to next tile
      tileX += tileWidth + tileSpacing;
    });
    
    currentY += tileHeight + rowSpacing;
  }
  
  // Draw grand total tile (centered, wider, bottom row)
  if (grandTotal) {
    const grandTileWidth = Math.min(availableWidth * 0.6, 150); // 60% of width or max 150mm
    const grandTileX = (pageWidth - grandTileWidth) / 2; // Center horizontally
    const grandTileHeight = tileHeight * 1.2; // Slightly taller
    
    const bgColor = grandTotal.bgColor || [0, 0, 0]; // Default black
    const textColor = grandTotal.textColor || [255, 255, 0]; // Default yellow
    
    // Draw grand total tile background
    doc.setFillColor(...bgColor);
    doc.rect(grandTileX, currentY, grandTileWidth, grandTileHeight, 'F');
    
    // Draw grand total tile border
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(borderWidth * 1.5);
    doc.rect(grandTileX, currentY, grandTileWidth, grandTileHeight, 'S');
    
    // Format grand total amount
    let grandAmountText = parseFloat(grandTotal.amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    if (grandTotal.currency && grandTotal.currency.trim()) {
      grandAmountText = `${grandAmountText} ${grandTotal.currency}`;
    }
    
    // Calculate tile boundaries - ensure all text stays within tile
    const grandTileTop = currentY;
    const grandTileBottom = currentY + grandTileHeight;
    const grandTileMiddle = grandTileTop + (grandTileHeight / 2);
    
    // Draw grand total - no label, just show the amount prominently centered within tile
    doc.setFontSize(fontSize + 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    // Center text vertically - jsPDF baseline positioning
    // Position so text is perfectly centered vertically within the tile
    const grandAmountY = grandTileMiddle + ((fontSize + 3) * 0.3);
    doc.text(grandAmountText, grandTileX + grandTileWidth / 2, grandAmountY, { align: 'center' });
    
    currentY += grandTileHeight;
  }
  
  // Reset text color for subsequent content
  doc.setTextColor(0, 0, 0);
  
  return currentY;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateDynamicRowHeight,
    renderTableRowWithDynamicHeight,
    calculateOptimalColumnWidths,
    drawFilterCriteria,
    calculateCenteredTableStart,
    drawTableHeaders,
    drawFooter,
    addNewPageWithHeaders,
    drawSummaryTiles
  };
}

// Make functions available globally for browser use
if (typeof window !== 'undefined') {
  window.PDFUtils = {
    calculateDynamicRowHeight,
    renderTableRowWithDynamicHeight,
    calculateOptimalColumnWidths,
    drawFilterCriteria,
    calculateCenteredTableStart,
    drawTableHeaders,
    drawFooter,
    addNewPageWithHeaders,
    drawSummaryTiles
  };
}

