/**
 * Trial Balance Report Component
 */

import { BaseReport } from './BaseReport.js';
import { formatDate, formatCurrency, escapeHtml } from '../utils/formatters.js';
import { generateHeader, generateTable } from '../utils/printTemplateGenerator.js';

export class TrialBalanceReport extends BaseReport {
  constructor() {
    super('trial-balance');
  }

  generateHTML(data) {
    const header = this.createMinimalHeader('Trial Balance', [
      { label: 'As of', value: formatDate(data.as_of_date) }
    ]);

    const columns = [
      { label: 'Code', width: '12%', align: 'left' },
      { label: 'Account', width: '40%', align: 'left' },
      { label: 'Type', width: '15%', align: 'left' },
      { label: 'Debit', width: '16%', align: 'right' },
      { label: 'Credit', width: '16%', align: 'right' }
    ];

    const rows = [
      ...data.accounts.map(a => ({
        cells: [
          { value: a.account_code || '—' },
          { value: escapeHtml(a.account_name) },
          { value: a.account_type },
          { 
            value: a.debit_balance > 0 ? formatCurrency(a.debit_balance) : '—',
            className: a.debit_balance > 0 ? 'amount-debit' : ''
          },
          { 
            value: a.credit_balance > 0 ? formatCurrency(a.credit_balance) : '—',
            className: a.credit_balance > 0 ? 'amount-credit' : ''
          }
        ]
      })),
      {
        className: 'report-totals-row',
        cells: [
          { value: '<strong>Total</strong>' },
          { value: '' },
          { value: '' },
          { value: `<strong>${formatCurrency(data.total_debit)}</strong>` },
          { value: `<strong>${formatCurrency(data.total_credit)}</strong>` }
        ]
      }
    ];

    const table = this.createTable(columns, rows);

    const summary = `
      <div class="report-summary">
        <span class="badge ${data.is_balanced ? 'badge-success' : 'badge-danger'}">
          ${data.is_balanced ? '✓ Balanced' : '✗ Not Balanced'}
        </span>
      </div>
    `;

    return this.createReportCard(header + table + summary);
  }

  generatePrintContent(data) {
    const header = generateHeader([
      { label: 'As of', value: formatDate(data.as_of_date) }
    ]);

    const columns = [
      { label: 'Code', width: '12%' },
      { label: 'Account', width: '40%' },
      { label: 'Type', width: '15%' },
      { label: 'Debit', width: '16%', align: 'right' },
      { label: 'Credit', width: '16%', align: 'right' }
    ];

    const rows = [
      ...data.accounts.map(a => ({
        cells: [
          { value: a.account_code || '—' },
          { value: escapeHtml(a.account_name) },
          { value: a.account_type },
          { 
            value: a.debit_balance > 0 ? formatCurrency(a.debit_balance) : '—',
            className: a.debit_balance > 0 ? 'amount-debit' : ''
          },
          { 
            value: a.credit_balance > 0 ? formatCurrency(a.credit_balance) : '—',
            className: a.credit_balance > 0 ? 'amount-credit' : ''
          }
        ]
      })),
      {
        className: 'totals-row',
        cells: [
          { value: '<strong>Total</strong>' },
          { value: '' },
          { value: '' },
          { value: `<strong>${formatCurrency(data.total_debit)}</strong>` },
          { value: `<strong>${formatCurrency(data.total_credit)}</strong>` }
        ]
      }
    ];

    const table = generateTable(columns, rows);

    return header + table;
  }

  getFilename(params) {
    const date = params.date.replace(/-/g, '');
    return `TrialBalance_${date}`;
  }
}
