/**
 * Vouchers Report Component
 */

import { BaseReport } from './BaseReport.js';
import { formatDate, formatCurrency, escapeHtml, formatVoucherNumber, getVoucherShortCode } from '../utils/formatters.js';
import { generateHeader, generateTable } from '../utils/printTemplateGenerator.js';

export class VouchersReport extends BaseReport {
  constructor() {
    super('vouchers');
  }

  /**
   * Override render to handle vouchers as separate parameter
   */
  render(containerId, data, vouchers) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }
    container.innerHTML = this.generateHTML(data, vouchers);
  }

  generateHTML(data, vouchers) {
    // Handle undefined or null vouchers
    if (!vouchers || !Array.isArray(vouchers)) {
      return this.createReportCard('<div class="empty-state"><h3>No vouchers found</h3></div>');
    }

    const header = this.createMinimalHeader('Vouchers Report', [
      { label: 'Period', value: `${formatDate(data.start)} to ${formatDate(data.end)}` }
    ]);

    const columns = [
      { label: 'Date', width: '10%', align: 'left' },
      { label: 'Code', width: '10%', align: 'left' },
      { label: 'Type', width: '10%', align: 'left' },
      { label: 'Narration', width: '40%', align: 'left' },
      { label: 'Amount', width: '15%', align: 'right' },
      { label: 'Actions', width: '15%', align: 'left' }
    ];

    const rows = vouchers.map(v => ({
      cells: [
        { value: formatDate(v.voucher_date) },
        { value: getVoucherShortCode(v.voucher_number), title: v.voucher_number },
        { value: `<span class="badge ${this.getVoucherBadgeClass(v.voucher_type)}">${v.voucher_type}</span>` },
        { value: escapeHtml(v.narration || '—') },
        { value: formatCurrency(v.total_amount) },
        { value: this.createActionButtons(v.voucher_id) }
      ]
    }));

    const table = this.createTable(columns, rows);

    const footer = `
      <div style="padding: var(--spacing-4); color: hsl(var(--muted-foreground)); font-size: 13px;">
        Found ${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''}
      </div>
    `;

    return this.createReportCard(header + table + footer);
  }

  createActionButtons(voucherId) {
    return `
      <div class="action-buttons">
        <button class="action-btn voucher-action-btn" data-action="view" data-voucher-id="${voucherId}" title="View">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="action-btn voucher-action-btn" data-action="edit" data-voucher-id="${voucherId}" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn danger voucher-action-btn" data-action="delete" data-voucher-id="${voucherId}" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }

  generatePrintContent(data, vouchers) {
    // Handle undefined or null vouchers
    if (!vouchers || !Array.isArray(vouchers)) {
      return '<div style="text-align: center; padding: 20px;">No vouchers found</div>';
    }

    const header = generateHeader([
      { label: 'Period', value: `${formatDate(data.start)} to ${formatDate(data.end)}` }
    ]);

    const columns = [
      { label: 'Date', width: '10%' },
      { label: 'Code', width: '10%' },
      { label: 'Type', width: '10%' },
      { label: 'Narration', width: '50%' },
      { label: 'Amount', width: '20%', align: 'right' }
    ];

    const rows = vouchers.map(v => ({
      cells: [
        { value: formatDate(v.voucher_date) },
        { value: getVoucherShortCode(v.voucher_number), title: v.voucher_number },
        { value: `<span class="badge badge-${v.voucher_type.toLowerCase()}">${v.voucher_type}</span>` },
        { 
          value: escapeHtml((v.narration || '—').substring(0, 80)),
          title: escapeHtml(v.narration || '—'),
          style: 'max-width: 300px;'
        },
        { value: formatCurrency(v.total_amount) }
      ]
    }));

    const table = generateTable(columns, rows);

    const footer = `
      <div style="margin-top: 15px; text-align: center; font-size: 8pt; color: #666;">
        Total: ${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''}
      </div>
    `;

    return header + table + footer;
  }

  getVoucherBadgeClass(type) {
    const classes = {
      'Debit': 'badge-danger',
      'Credit': 'badge-success',
      'Journal': 'badge-primary'
    };
    return classes[type] || 'badge-secondary';
  }

  getFilename(params) {
    const start = params.start.replace(/-/g, '');
    const end = params.end.replace(/-/g, '');
    return `Vouchers_${start}_${end}`;
  }
}
