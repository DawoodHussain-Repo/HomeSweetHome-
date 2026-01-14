/**
 * Report Filters Component
 * Generates filter UI for all report types
 */

import { getTodayDate, getFirstDayOfMonth, getFinancialYearStart } from '../utils/formatters.js';

export const ReportFilters = {
  renderTrialBalance() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Trial Balance</h3>
            <p class="card-description">View account balances as of a specific date</p>
          </div>
        </div>
        
        <div class="report-filter-section">
          <div class="filter-group">
            <label class="filter-label">As of Date</label>
            <input type="date" class="form-input" id="tb-date" value="${getTodayDate()}" style="max-width: 200px;">
          </div>
          
          ${this.renderQuickDateButtons('tb-date', ['today', 'month-end', 'year-end'])}
          
          <div class="filter-actions">
            ${this.renderActionButtons('btn-tb', 'btn-print-tb')}
          </div>
        </div>
      </div>
      <div id="tb-report"></div>
    `;
  },

  renderIncomeStatement() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Income Statement</h3>
            <p class="card-description">Profit & loss statement for a date range</p>
          </div>
        </div>
        
        <div class="report-filter-section">
          <div class="filter-group">
            <label class="filter-label">From Date</label>
            <input type="date" class="form-input" id="is-start" value="${getFinancialYearStart()}" style="max-width: 200px;">
          </div>
          
          <div class="filter-group">
            <label class="filter-label">To Date</label>
            <input type="date" class="form-input" id="is-end" value="${getTodayDate()}" style="max-width: 200px;">
          </div>
          
          ${this.renderQuickDateRangeButtons('is-start', 'is-end', ['this-month', 'last-month', 'this-year'])}
          
          <div class="filter-actions">
            ${this.renderActionButtons('btn-is', 'btn-print-is')}
          </div>
        </div>
      </div>
      <div id="is-report"></div>
    `;
  },

  renderLedger() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Account Ledger</h3>
            <p class="card-description">Detailed transaction history for an account</p>
          </div>
        </div>
        
        <div class="report-filter-section">
          <div class="filter-group" style="flex: 1; min-width: 250px;">
            <label class="filter-label">Select Account</label>
            <input type="text" class="form-input" id="ledger-account-input" placeholder="Type to search accounts...">
          </div>
          
          <div class="filter-group">
            <label class="filter-label">From Date</label>
            <input type="date" class="form-input" id="ledger-start" value="${getFinancialYearStart()}" style="max-width: 200px;">
          </div>
          
          <div class="filter-group">
            <label class="filter-label">To Date</label>
            <input type="date" class="form-input" id="ledger-end" value="${getTodayDate()}" style="max-width: 200px;">
          </div>
          
          ${this.renderQuickDateRangeButtons('ledger-start', 'ledger-end', ['this-month', 'this-year'])}
          
          <div class="filter-actions">
            ${this.renderActionButtons('btn-ledger', 'btn-print-ledger')}
          </div>
        </div>
      </div>
      <div id="ledger-report"></div>
    `;
  },

  renderVouchers() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Search Vouchers</h3>
            <p class="card-description">Find and view transaction vouchers</p>
          </div>
        </div>
        
        <div class="report-filter-section">
          <div class="filter-group">
            <label class="filter-label">Voucher Type</label>
            <select class="form-select" id="v-type" style="max-width: 180px;">
              <option value="">All Types</option>
              <option value="Debit">Payment</option>
              <option value="Credit">Receipt</option>
              <option value="Journal">Journal</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">From Date</label>
            <input type="date" class="form-input" id="v-start" value="${getFirstDayOfMonth()}" style="max-width: 200px;">
          </div>
          
          <div class="filter-group">
            <label class="filter-label">To Date</label>
            <input type="date" class="form-input" id="v-end" value="${getTodayDate()}" style="max-width: 200px;">
          </div>
          
          ${this.renderQuickDateRangeButtons('v-start', 'v-end', ['this-month', 'last-month'])}

          <div class="filter-group" style="min-width: 200px;">
            <label class="filter-label">Account</label>
            <input type="text" class="form-input" id="v-account-input" placeholder="Type to search accounts...">
          </div>
          
          <div class="filter-group" style="flex: 1; min-width: 200px;">
            <label class="filter-label">Search</label>
            <input type="text" class="form-input" id="v-search" placeholder="Voucher no. or narration...">
          </div>
          
          <div class="filter-actions">
            ${this.renderActionButtons('btn-vouchers', 'btn-print-vouchers', 'Search')}
          </div>
        </div>
      </div>
      <div id="vouchers-report"></div>
    `;
  },

  renderQuickDateButtons(inputId, types) {
    const buttons = types.map(type => {
      const label = type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `<button class="btn btn-sm btn-outline quick-date-btn" data-input="${inputId}" data-type="${type}">${label}</button>`;
    }).join('');

    return `
      <div class="quick-date-section">
        <span class="quick-date-label">Quick Select:</span>
        <div class="quick-date-buttons">
          ${buttons}
        </div>
      </div>
    `;
  },

  renderQuickDateRangeButtons(startId, endId, types) {
    const buttons = types.map(type => {
      const label = type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `<button class="btn btn-sm btn-outline quick-date-range-btn" data-start="${startId}" data-end="${endId}" data-type="${type}">${label}</button>`;
    }).join('');

    return `
      <div class="quick-date-section">
        <span class="quick-date-label">Quick Select:</span>
        <div class="quick-date-buttons">
          ${buttons}
        </div>
      </div>
    `;
  },

  renderActionButtons(generateId, printId, generateLabel = 'Generate Report') {
    return `
      <button class="btn btn-primary" id="${generateId}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        ${generateLabel}
      </button>
      <button class="btn btn-secondary" id="${printId}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print
      </button>
    `;
  }
};
