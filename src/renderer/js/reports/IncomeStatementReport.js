/**
 * Income Statement Report Component
 */

import { BaseReport } from './BaseReport.js';
import { formatDate, formatCurrency, escapeHtml } from '../utils/formatters.js';
import { generateHeader, generateTable } from '../utils/printTemplateGenerator.js';

export class IncomeStatementReport extends BaseReport {
  constructor() {
    super('income-statement');
  }

  generateHTML(data) {
    const header = this.createMinimalHeader('Income Statement', [
      { label: 'Period', value: `${formatDate(data.start_date)} to ${formatDate(data.end_date)}` }
    ]);

    const incomeSection = this.createSection('Income', data.income_accounts, data.total_income);
    const expenseSection = this.createSection('Expenses', data.expense_accounts, data.total_expenses);

    const netProfit = `
      <div class="report-summary">
        <div class="report-summary-item">
          <div class="report-summary-label">Net ${data.net_profit >= 0 ? 'Profit' : 'Loss'}</div>
          <div class="report-summary-value" style="color: ${
            data.net_profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)'
          }">
            ${formatCurrency(Math.abs(data.net_profit))}
          </div>
        </div>
      </div>
    `;

    return this.createReportCard(header + incomeSection + expenseSection + netProfit);
  }

  createSection(title, accounts, total) {
    const columns = [
      { label: 'Account', width: '70%', align: 'left' },
      { label: 'Amount', width: '30%', align: 'right' }
    ];

    const rows = [
      ...accounts.map(a => ({
        cells: [
          { value: escapeHtml(a.account_name) },
          { 
            value: formatCurrency(a.balance),
            className: title === 'Income' ? 'amount-credit' : 'amount-debit'
          }
        ]
      })),
      {
        className: 'report-totals-row',
        cells: [
          { value: `<strong>Total ${title}</strong>` },
          { value: `<strong>${formatCurrency(total)}</strong>` }
        ]
      }
    ];

    return `
      <div class="report-section">
        <div class="report-section-title-minimal">${title}</div>
        ${this.createTable(columns, rows)}
      </div>
    `;
  }

  generatePrintContent(data) {
    const header = generateHeader([
      { label: 'Period', value: `${formatDate(data.start_date)} to ${formatDate(data.end_date)}` }
    ]);

    const incomeSection = this.createPrintSection('Income', data.income_accounts, data.total_income);
    const expenseSection = this.createPrintSection('Expenses', data.expense_accounts, data.total_expenses);

    const netProfit = `
      <div class="net-profit" style="color: ${data.net_profit >= 0 ? '#16a34a' : '#dc2626'}">
        Net ${data.net_profit >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(data.net_profit))}
      </div>
    `;

    return header + incomeSection + expenseSection + netProfit;
  }

  createPrintSection(title, accounts, total) {
    const columns = [
      { label: 'Account', width: '70%' },
      { label: 'Amount', width: '30%', align: 'right' }
    ];

    const rows = [
      ...accounts.map(a => ({
        cells: [
          { value: escapeHtml(a.account_name) },
          { 
            value: formatCurrency(a.balance),
            className: title === 'Income' ? 'amount-credit' : 'amount-debit'
          }
        ]
      })),
      {
        className: 'totals-row',
        cells: [
          { value: `<strong>Total ${title}</strong>` },
          { value: `<strong>${formatCurrency(total)}</strong>` }
        ]
      }
    ];

    return `
      <div class="section-title">${title}</div>
      ${generateTable(columns, rows)}
    `;
  }

  getFilename(params) {
    const start = params.start.replace(/-/g, '');
    const end = params.end.replace(/-/g, '');
    return `IncomeStatement_${start}_${end}`;
  }
}
