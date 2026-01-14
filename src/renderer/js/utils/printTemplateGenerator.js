/**
 * Print Template Generator
 * Reusable print layout generator for all reports
 */

import { PRINT } from './constants.js';
import { LOGO_BASE64 } from './logoBase64.js';

/**
 * Generate common print styles
 */
function getPrintStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 8pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }
    
    .page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 0;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6mm;
      padding-bottom: 3mm;
      border-bottom: 2px solid #000;
    }
    
    .header-left {
      flex-shrink: 0;
    }
    
    .header-logo {
      width: 25mm;
      height: auto;
    }
    
    .header-right {
      text-align: right;
      flex-grow: 1;
      padding-left: 5mm;
    }
    
    .company-name {
      font-size: 18pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 2mm;
      letter-spacing: 0.5px;
    }
    
    .report-info {
      font-size: 9pt;
      color: #333;
      margin-bottom: 1mm;
    }
    
    .report-info strong {
      font-weight: 600;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #000;
      margin: 5mm 0 3mm 0;
      padding-bottom: 2mm;
      border-bottom: 2px solid #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      table-layout: auto;
    }
    
    thead {
      background: #f5f5f5;
    }
    
    th {
      padding: 2mm 1.5mm;
      text-align: left;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      border: 1px solid #000;
      white-space: nowrap;
      background: #f5f5f5;
    }
    
    th.text-right { text-align: right; }
    
    td {
      padding: 1.5mm 1mm;
      border: 1px solid #000;
      font-size: 8pt;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    
    td.wrap {
      white-space: normal;
      word-wrap: break-word;
    }
    
    td.text-right { 
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    
    .opening-row, .closing-row {
      background: #f0f0f0 !important;
      font-weight: 700;
    }
    
    .totals-row {
      background: #e5e5e5 !important;
      font-weight: 700;
      border-top: 2px solid #000;
    }
    
    .totals-row td {
      border-top: 2px solid #000 !important;
    }
    
    .amount-debit { color: #dc2626; font-weight: 600; }
    .amount-credit { color: #16a34a; font-weight: 600; }
    
    .badge {
      display: inline-block;
      padding: 1mm 2mm;
      border-radius: 2px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .badge-debit { background: #fee; color: #dc2626; }
    .badge-credit { background: #efe; color: #16a34a; }
    .badge-journal { background: #eef; color: #2563eb; }
    
    .net-profit {
      text-align: center;
      margin-top: 5mm;
      padding: 3mm;
      background: #f0f0f0;
      border: 2px solid #000;
      font-size: 11pt;
      font-weight: 700;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .page {
        max-width: 190mm;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      table {
        page-break-inside: auto;
        width: 100%;
        table-layout: fixed;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      thead {
        display: table-header-group;
      }
      
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
    }
    
    @media screen {
      body {
        padding: 10mm;
        background: #f5f5f5;
      }
      
      .page {
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        padding: 10mm;
        margin: 10mm auto;
      }
    }
  `;
}

/**
 * Generate report header HTML with logo on left, title on right
 */
function generateHeader(reportInfo) {
  const infoLines = reportInfo.map(info => 
    `<div class="report-info"><strong>${info.label}:</strong> ${info.value}</div>`
  ).join('');
  
  return `
    <div class="header">
      <div class="header-left">
        <img src="${LOGO_BASE64}" alt="Logo" class="header-logo" onerror="this.style.display='none'">
      </div>
      <div class="header-right">
        <div class="company-name">${PRINT.COMPANY_NAME}</div>
        ${infoLines}
      </div>
    </div>
  `;
}

/**
 * Generate table HTML
 */
function generateTable(columns, rows, options = {}) {
  const { hasHeader = true, className = '' } = options;
  
  const headerHtml = hasHeader ? `
    <thead>
      <tr>
        ${columns.map(col => `
          <th class="${col.align === 'right' ? 'text-right' : ''}" style="width: ${col.width}">
            ${col.label}
          </th>
        `).join('')}
      </tr>
    </thead>
  ` : '';
  
  const rowsHtml = rows.map(row => `
    <tr class="${row.className || ''}">
      ${row.cells.map((cell, index) => `
        <td class="${columns[index].align === 'right' ? 'text-right' : ''} ${cell.className || ''}"
            ${cell.title ? `title="${cell.title}"` : ''}
            ${cell.style ? `style="${cell.style}"` : ''}>
          ${cell.value}
        </td>
      `).join('')}
    </tr>
  `).join('');
  
  return `
    <table class="${className}">
      ${headerHtml}
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

/**
 * Generate complete print document
 */
export function generatePrintDocument(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${getPrintStyles()}</style>
</head>
<body>
  <div class="page">
    ${content}
  </div>
</body>
</html>`;
}

/**
 * Save report as HTML file
 */
export async function saveReportAsHTML(title, content) {
  try {
    const result = await window.api.file.saveHTML(title, content);
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    if (result.success) {
      return { success: true, filePath: result.filePath };
    } else {
      throw new Error(result.error || 'Failed to save file');
    }
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}

// Export helper functions
export { generateHeader, generateTable, getPrintStyles };
