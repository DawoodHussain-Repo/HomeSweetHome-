/**
 * Accounts Page - Refactored
 * Chart of Accounts Management
 */

import { AccountForm } from '../accounts/AccountForm.js';
import { AccountList } from '../accounts/AccountList.js';
import { AccountTree } from '../accounts/AccountTree.js';
import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { ACCOUNT_TYPE } from '../utils/constants.js';

const AccountsPage = {
  accounts: [],
  filteredAccounts: [],
  
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Chart of Accounts</h1>
          <p class="page-subtitle">Manage your account structure and hierarchy</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-new-account">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Account
          </button>
        </div>
      </div>
      
      ${this.renderFilters()}
      
      <div class="flex gap-3 mb-4">
        <button class="view-toggle-btn active" data-tab="list">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          List View
        </button>
        <button class="view-toggle-btn" data-tab="tree">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          Tree View
        </button>
      </div>
      
      <div id="tab-list" class="tab-content active"></div>
      <div id="tab-tree" class="tab-content hidden"></div>
    `;
    
    this.bindEvents();
    await this.loadAccounts();
  },

  renderFilters() {
    const types = Object.values(ACCOUNT_TYPE);
    return `
      <div class="card p-4 mb-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="form-label">Type</label>
            <select class="form-select" id="filter-type">
              <option value="">All Types</option>
              ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="col-span-2">
            <label class="form-label">Search</label>
            <input type="text" class="form-input" id="filter-search" placeholder="Name or code...">
          </div>
        </div>
      </div>
    `;
  },
  
  bindEvents() {
    document.getElementById('btn-new-account')?.addEventListener('click', () => this.openForm());
    document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilter());
    document.getElementById('filter-search')?.addEventListener('input', () => this.applyFilter());
    
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });
  },

  switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== `tab-${tab}`);
    });
  },
  
  async loadAccounts() {
    try {
      showLoading();
      this.accounts = await window.api.accounts.getAll();
      this.filteredAccounts = this.accounts;
      this.renderViews();
    } catch (err) {
      Toast.error('Failed to load accounts');
    } finally {
      hideLoading();
    }
  },
  
  applyFilter() {
    const type = document.getElementById('filter-type')?.value;
    const search = document.getElementById('filter-search')?.value.toLowerCase();
    
    this.filteredAccounts = this.accounts.filter(a => {
      if (type && a.account_type !== type) return false;
      if (search) {
        const text = `${a.account_name} ${a.account_code || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
    
    this.renderViews();
  },

  renderViews() {
    AccountList.render('tab-list', this.filteredAccounts);
    AccountTree.render('tab-tree', this.filteredAccounts);
  },
  
  openForm(accountId = null) {
    const account = accountId ? this.accounts.find(a => a.account_id === accountId) : null;
    const formHTML = AccountForm.render(account, this.accounts);
    
    Modal.open(account ? 'Edit Account' : 'New Account', formHTML);
    AccountForm.bindEvents(accountId, () => this.loadAccounts());
  },

  async viewLedger(accountId) {
    const account = this.accounts.find(a => a.account_id === accountId);
    if (!account) return;
    
    // Navigate to reports page with ledger pre-filled
    App.navigate('reports');
    setTimeout(() => {
      const input = document.getElementById('ledger-account-input');
      if (input) input.value = account.account_name;
    }, 100);
  },

  editAccount(accountId) {
    this.openForm(accountId);
  },

  async deleteAccount(accountId) {
    const account = this.accounts.find(a => a.account_id === accountId);
    if (!account) return;

    Modal.confirm(
      `Delete account "${account.account_name}"? This cannot be undone.`,
      async () => {
        try {
          showLoading();
          const result = await window.api.accounts.delete(accountId);
          if (result.success) {
            Toast.success('Account deleted');
            await this.loadAccounts();
          } else {
            Toast.error(result.error || 'Failed to delete');
          }
        } catch (err) {
          Toast.error('Failed to delete account');
        } finally {
          hideLoading();
        }
      }
    );
  }
};

export default AccountsPage;
