/**
 * Ledger Report Component
 */

import { BaseReport } from './BaseReport.js';
import { formatDate, formatDateShort, formatCurrency, escapeHtml, formatVoucherNumber, getVoucherShortCode } from '../utils/formatters.js';
import { generateHeader, generateTable } from '../utils/printTemplateGenerator.js';

export class LedgerReport extends BaseReport {
  constructor() {
    super('ledger');
  }

  generateHTML(data) {
    const header = this.createMinimalHeader('Ledger Report', [
      { label: 'Period', value: `${formatDate(data.start_date)} to ${formatDate(data.end_date)}` },
      { label: 'Account', value: escapeHtml(data.account.account_name) }
    ]);

    const columns = [
      { label: 'Date', width: '10%', align: 'left' },
      { label: 'Voucher', width: '15%', align: 'left' },
      { label: 'Narration', width: '35%', align: 'left' },
      { label: 'Debit', width: '13%', align: 'right' },
      { label: 'Credit', width: '13%', align: 'right' },
      { label: 'Balance', width: '14%', align: 'right' }
    ];

    const rows = [
      {
        className: 'report-opening-row',
        cells: [
          { value: '<strong>Opening Balance</strong>' },
          { value: '' },
          { value: '' },
          { value: '—' },
          { value: '—' },
          { value: `<strong>${formatCurrency(data.opening_balance)}</strong>` }
        ]
      },
      ...data.entries.map(e => ({
        cells: [
          { value: formatDate(e.voucher_date) },
          { value: getVoucherShortCode(e.voucher_number), title: e.voucher_number },
          { value: escapeHtml(e.narration || '—') },
          { 
            value: e.debit_amount > 0 ? formatCurrency(e.debit_amount) : '—',
            className: e.debit_amount > 0 ? 'amount-debit' : ''
          },
          { 
            value: e.credit_amount > 0 ? formatCurrency(e.credit_amount) : '—',
            className: e.credit_amount > 0 ? 'amount-credit' : ''
          },
          { value: formatCurrency(e.running_balance) }
        ]
      })),
      {
        className: 'report-totals-row',
        cells: [
          { value: '<strong>Total</strong>' },
          { value: '' },
          { value: '' },
          { value: `<strong>${formatCurrency(data.total_debit)}</strong>` },
          { value: `<strong>${formatCurrency(data.total_credit)}</strong>` },
          { value: '—' }
        ]
      },
      {
        className: 'report-closing-row',
        cells: [
          { value: '<strong>Closing Balance</strong>' },
          { value: '' },
          { value: '' },
          { value: '—' },
          { value: '—' },
          { value: `<strong>${formatCurrency(data.closing_balance)}</strong>` }
        ]
      }
    ];

    const table = this.createTable(columns, rows);

    return this.createReportCard(header + table);
  }

  generatePrintContent(data) {
    const header = generateHeader([
      { label: 'Period', value: `${formatDate(data.start_date)} to ${formatDate(data.end_date)}` },
      { label: 'Account', value: escapeHtml(data.account.account_name) }
    ]);

    const columns = [
      { label: 'Date', width: '10%' },
      { label: 'Voucher', width: '15%' },
      { label: 'Narration', width: '35%' },
      { label: 'Debit', width: '13%', align: 'right' },
      { label: 'Credit', width: '13%', align: 'right' },
      { label: 'Balance', width: '14%', align: 'right' }
    ];

    const rows = [
      {
        className: 'opening-row',
        cells: [
          { value: '<strong>Opening Balance</strong>' },
          { value: '' },
          { value: '' },
          { value: '—' },
          { value: '—' },
          { value: `<strong>${formatCurrency(data.opening_balance)}</strong>` }
        ]
      },
      ...data.entries.map(e => ({
        cells: [
          { value: formatDateShort(e.voucher_date) },
          { value: getVoucherShortCode(e.voucher_number), title: e.voucher_number },
          { 
            value: escapeHtml((e.narration || '—').substring(0, 50)),
            title: escapeHtml(e.narration || '—'),
            className: 'wrap'
          },
          { 
            value: e.debit_amount > 0 ? formatCurrency(e.debit_amount) : '—',
            className: e.debit_amount > 0 ? 'amount-debit' : ''
          },
          { 
            value: e.credit_amount > 0 ? formatCurrency(e.credit_amount) : '—',
            className: e.credit_amount > 0 ? 'amount-credit' : ''
          },
          { value: formatCurrency(e.running_balance) }
        ]
      })),
      {
        className: 'totals-row',
        cells: [
          { value: '<strong>Total</strong>' },
          { value: '' },
          { value: '' },
          { value: `<strong>${formatCurrency(data.total_debit)}</strong>` },
          { value: `<strong>${formatCurrency(data.total_credit)}</strong>` },
          { value: '—' }
        ]
      },
      {
        className: 'closing-row',
        cells: [
          { value: '<strong>Closing Balance</strong>' },
          { value: '' },
          { value: '' },
          { value: '—' },
          { value: '—' },
          { value: `<strong>${formatCurrency(data.closing_balance)}</strong>` }
        ]
      }
    ];

    return header + generateTable(columns, rows);
  }

  getFilename(params) {
    const accountName = params.accountName.replace(/[^a-z0-9]/gi, '_');
    const start = params.start.replace(/-/g, '');
    const end = params.end.replace(/-/g, '');
    return `Ledger_${accountName}_${start}_${end}`;
  }
}
