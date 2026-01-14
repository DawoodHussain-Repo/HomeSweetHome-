/**
 * Reports Page - Refactored
 * Coordinator for all financial reports
 * Uses report components for generation and display
 */

import { TrialBalanceReport } from '../reports/TrialBalanceReport.js';
import { IncomeStatementReport } from '../reports/IncomeStatementReport.js';
import { LedgerReport } from '../reports/LedgerReport.js';
import { VouchersReport } from '../reports/VouchersReport.js';
import { ReportFilters } from '../components/ReportFilters.js';
import { setQuickDate, setQuickDateRange } from '../utils/dateHelpers.js';
import { viewVoucher, editVoucher, deleteVoucher } from '../utils/voucherActions.js';
import { executeReport, findAccount } from '../utils/reportHelpers.js';

const ReportsPage = {
  companyInfo: null,
  accounts: [],
  
  // Report instances
  trialBalanceReport: new TrialBalanceReport(),
  incomeStatementReport: new IncomeStatementReport(),
  ledgerReport: new LedgerReport(),
  vouchersReport: new VouchersReport(),

  async render() {
    const content = document.getElementById("page-content");
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Financial Reports</h1>
          <p class="page-subtitle">Generate and view financial statements</p>
        </div>
      </div>
      
      <div class="tabs">
        <button class="tab active" data-tab="trial-balance">Trial Balance</button>
        <button class="tab" data-tab="income">Income Statement</button>
        <button class="tab" data-tab="ledger">Ledger</button>
        <button class="tab" data-tab="vouchers">Vouchers</button>
      </div>
      
      <div id="tab-trial-balance" class="tab-content active">${ReportFilters.renderTrialBalance()}</div>
      <div id="tab-income" class="tab-content">${ReportFilters.renderIncomeStatement()}</div>
      <div id="tab-ledger" class="tab-content">${ReportFilters.renderLedger()}</div>
      <div id="tab-vouchers" class="tab-content">${ReportFilters.renderVouchers()}</div>
    `;

    await this.init();
    this.bindEvents();
  },

  async init() {
    [this.companyInfo, this.accounts] = await Promise.all([
      window.api.company.getInfo(),
      window.api.accounts.getAll(),
    ]);

    // Populate account dropdowns
    this.populateAccountDropdowns();
  },

  populateAccountDropdowns() {
    const accountOptions = this.accounts.map(a => ({
      value: a.account_id,
      label: `${a.account_code ? `${a.account_code} - ` : ''}${a.account_name}`,
      code: a.account_code
    }));

    // Ledger account searchable select
    const ledgerInput = document.getElementById("ledger-account-input");
    if (ledgerInput) {
      if (ledgerInput.searchableSelect) {
        ledgerInput.searchableSelect.destroy();
      }
      ledgerInput.searchableSelect = new window.SearchableSelect(
        'ledger-account-input',
        accountOptions,
        (option) => {
          ledgerInput.dataset.accountId = option.value;
        }
      );
    }

    // Voucher account searchable select
    const voucherInput = document.getElementById("v-account-input");
    if (voucherInput) {
      if (voucherInput.searchableSelect) {
        voucherInput.searchableSelect.destroy();
      }
      voucherInput.searchableSelect = new window.SearchableSelect(
        'v-account-input',
        accountOptions,
        (option) => {
          voucherInput.dataset.accountId = option.value;
        }
      );
    }
  },

  bindEvents() {
    // Tab switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
      });
    });

    // Quick date buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-date-btn')) {
        const btn = e.target.closest('.quick-date-btn');
        setQuickDate(btn.dataset.input, btn.dataset.type);
      }
      if (e.target.closest('.quick-date-range-btn')) {
        const btn = e.target.closest('.quick-date-range-btn');
        setQuickDateRange(btn.dataset.start, btn.dataset.end, btn.dataset.type);
      }
      // Voucher action buttons
      if (e.target.closest('.voucher-action-btn')) {
        const btn = e.target.closest('.voucher-action-btn');
        const action = btn.dataset.action;
        const voucherId = btn.dataset.voucherId;
        
        if (action === 'view') {
          viewVoucher(voucherId);
        } else if (action === 'edit') {
          editVoucher(voucherId);
        } else if (action === 'delete') {
          deleteVoucher(voucherId, () => this.searchVouchers());
        }
      }
    });

    // Report generation buttons
    document.getElementById("btn-tb").addEventListener("click", () => this.generateTrialBalance());
    document.getElementById("btn-is").addEventListener("click", () => this.generateIncomeStatement());
    document.getElementById("btn-ledger").addEventListener("click", () => this.generateLedger());
    document.getElementById("btn-vouchers").addEventListener("click", () => this.searchVouchers());

    // Print buttons
    document.getElementById("btn-print-tb").addEventListener("click", () => this.printTrialBalance());
    document.getElementById("btn-print-is").addEventListener("click", () => this.printIncomeStatement());
    document.getElementById("btn-print-ledger").addEventListener("click", () => this.printLedger());
    document.getElementById("btn-print-vouchers").addEventListener("click", () => this.printVouchers());
  },

  // Trial Balance
  async generateTrialBalance() {
    const date = document.getElementById("tb-date").value;
    await executeReport(
      () => window.api.reports.trialBalance(date),
      (data) => this.trialBalanceReport.render('tb-report', data)
    );
  },

  async printTrialBalance() {
    const date = document.getElementById("tb-date").value;
    await executeReport(
      () => window.api.reports.trialBalance(date),
      null,
      (data) => this.trialBalanceReport.print(data, { date })
    );
  },

  // Income Statement
  async generateIncomeStatement() {
    const start = document.getElementById("is-start").value;
    const end = document.getElementById("is-end").value;
    await executeReport(
      async () => {
        const data = await window.api.reports.incomeStatement(start, end);
        data.start_date = start;
        data.end_date = end;
        return data;
      },
      (data) => this.incomeStatementReport.render('is-report', data)
    );
  },

  async printIncomeStatement() {
    const start = document.getElementById("is-start").value;
    const end = document.getElementById("is-end").value;
    await executeReport(
      async () => {
        const data = await window.api.reports.incomeStatement(start, end);
        data.start_date = start;
        data.end_date = end;
        return data;
      },
      null,
      (data) => this.incomeStatementReport.print(data, { start, end })
    );
  },

  // Ledger
  async generateLedger() {
    const accountName = document.getElementById("ledger-account-input").value;
    const start = document.getElementById("ledger-start").value;
    const end = document.getElementById("ledger-end").value;
    const account = findAccount(this.accounts, accountName);
    
    if (!account) {
      Toast.warning("Select a valid account");
      return;
    }

    await executeReport(
      async () => {
        const data = await window.api.reports.ledgerReport(account.account_id, start, end);
        if (!data.success) throw new Error(data.error || "Failed");
        data.start_date = start;
        data.end_date = end;
        return data;
      },
      (data) => this.ledgerReport.render('ledger-report', data)
    );
  },

  async printLedger() {
    const accountName = document.getElementById("ledger-account-input").value;
    const start = document.getElementById("ledger-start").value;
    const end = document.getElementById("ledger-end").value;
    const account = findAccount(this.accounts, accountName);
    
    if (!account) {
      Toast.warning("Select a valid account");
      return;
    }

    await executeReport(
      async () => {
        const data = await window.api.reports.ledgerReport(account.account_id, start, end);
        if (!data.success) throw new Error(data.error || "Failed");
        data.start_date = start;
        data.end_date = end;
        return data;
      },
      null,
      (data) => this.ledgerReport.print(data, { accountName: account.account_name, start, end })
    );
  },

  // Vouchers
  async searchVouchers() {
    const type = document.getElementById("v-type").value;
    const start = document.getElementById("v-start").value;
    const end = document.getElementById("v-end").value;
    const search = document.getElementById("v-search").value;
    const accountName = document.getElementById("v-account-input").value;

    const account = accountName ? findAccount(this.accounts, accountName) : null;

    const searchParams = {
      voucher_type: type || undefined,  // Changed from 'type' to 'voucher_type'
      start_date: start,
      end_date: end,
      search: search || undefined,
      account_id: account?.account_id,
    };

    try {
      showLoading();
      console.log('Searching vouchers with params:', searchParams);
      
      const vouchers = await window.api.vouchers.search(searchParams);

      console.log('Search results:', vouchers);
      console.log('Number of vouchers found:', vouchers?.length || 0);

      const container = document.getElementById("vouchers-report");
      if (!vouchers || !vouchers.length) {
        container.innerHTML = '<div class="card"><div class="empty-state"><h3>No vouchers found</h3><p>Try adjusting your search filters</p></div></div>';
        return;
      }

      this.vouchersReport.render('vouchers-report', { start, end }, vouchers);
    } catch (err) {
      console.error('Search error:', err);
      Toast.error("Failed to search: " + (err.message || "Unknown error"));
    } finally {
      hideLoading();
    }
  },

  async printVouchers() {
    // Print functionality can be added later
  }
};


export default ReportsPage;