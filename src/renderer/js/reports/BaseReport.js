/**
 * BaseReport - Abstract base class for all reports
 * Provides common functionality for report generation and printing
 */

import { generateHeader, generateTable, generatePrintDocument, saveReportAsHTML } from '../utils/printTemplateGenerator.js';
import { formatDate, formatCurrency, escapeHtml } from '../utils/formatters.js';
import { PRINT } from '../utils/constants.js';

export class BaseReport {
  constructor(reportType) {
    this.reportType = reportType;
  }

  /**
   * Generate report HTML for display
   * @abstract
   */
  generateHTML(data) {
    throw new Error('generateHTML must be implemented by subclass');
  }

  /**
   * Generate print content
   * @abstract
   */
  generatePrintContent(data) {
    throw new Error('generatePrintContent must be implemented by subclass');
  }

  /**
   * Get report filename
   * @abstract
   */
  getFilename(params) {
    throw new Error('getFilename must be implemented by subclass');
  }

  /**
   * Render report to container
   */
  render(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }
    container.innerHTML = this.generateHTML(data);
  }

  /**
   * Print report
   */
  async print(data, params) {
    try {
      showLoading();
      const filename = this.getFilename(params);
      const content = this.generatePrintContent(data);
      const document = generatePrintDocument(filename, content);
      
      const result = await saveReportAsHTML(filename, document);
      
      if (result.success) {
        Toast.success(`Report saved to: ${result.filePath}`);
      } else if (!result.canceled) {
        Toast.error('Failed to save report');
      }
    } catch (error) {
      console.error('Print error:', error);
      Toast.error('Failed to save report: ' + error.message);
    } finally {
      hideLoading();
    }
  }

  /**
   * Create report card wrapper
   */
  createReportCard(content) {
    return `
      <div class="card report-card">
        ${content}
      </div>
    `;
  }

  /**
   * Create minimal report header
   */
  createMinimalHeader(title, info) {
    return `
      <div class="report-header-minimal">
        <div class="report-company-name-minimal">${PRINT.COMPANY_NAME}</div>
        ${info.map(item => `
          <div class="report-info-minimal"><strong>${item.label}:</strong> ${item.value}</div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Create report table
   */
  createTable(columns, rows, className = 'report-table') {
    const headers = columns.map(col => `
      <th class="${col.align === 'right' ? 'text-right' : ''}" style="width: ${col.width}">
        ${col.label}
      </th>
    `).join('');

    const rowsHtml = rows.map(row => `
      <tr class="${row.className || ''}">
        ${row.cells.map((cell, idx) => `
          <td class="${columns[idx].align === 'right' ? 'text-right' : ''} ${cell.className || ''}">
            ${cell.value}
          </td>
        `).join('')}
      </tr>
    `).join('');

    return `
      <div class="table-container">
        <table class="${className}">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }
}
