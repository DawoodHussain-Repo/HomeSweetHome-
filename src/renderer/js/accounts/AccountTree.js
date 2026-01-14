/**
 * Account Tree Component
 * Renders accounts in hierarchical tree format
 */

import { formatCurrency, escapeHtml } from '../utils/formatters.js';
import { ACCOUNT_TYPE } from '../utils/constants.js';

export const AccountTree = {
  render(containerId, accounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const grouped = this.groupByType(accounts);

    container.innerHTML = `
      <div class="space-y-4">
        ${Object.entries(grouped).map(([type, accts]) => this.renderGroup(type, accts)).join('')}
      </div>
    `;
  },

  groupByType(accounts) {
    const types = Object.values(ACCOUNT_TYPE);
    const grouped = {};

    types.forEach(type => {
      grouped[type] = accounts.filter(a => a.account_type === type);
    });

    return grouped;
  },

  renderGroup(type, accounts) {
    if (!accounts.length) return '';

    const total = accounts.reduce((sum, a) => sum + (a.opening_balance || 0), 0);

    return `
      <div class="card">
        <div class="card-header">
          <div class="flex justify-between items-center">
            <h3 class="card-title">${type}</h3>
            <span class="text-sm font-semibold text-muted-foreground">
              ${accounts.length} account${accounts.length !== 1 ? 's' : ''}
              ${total ? ` • ${formatCurrency(total)}` : ''}
            </span>
          </div>
        </div>
        <div class="p-4">
          <div class="space-y-2">
            ${accounts.map(a => this.renderAccount(a)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderAccount(account) {
    return `
      <div class="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            ${account.account_code ? `<span class="text-xs font-mono text-muted-foreground">${account.account_code}</span>` : ''}
            <span class="font-medium">${escapeHtml(account.account_name)}</span>
            ${!account.is_active ? '<span class="badge">Inactive</span>' : ''}
          </div>
          ${account.opening_balance ? `
            <div class="text-sm text-muted-foreground mt-1">
              Opening: ${formatCurrency(account.opening_balance)}
            </div>
          ` : ''}
        </div>
        <div class="action-buttons">
          <button class="action-btn" onclick="AccountsPage.viewLedger(${account.account_id})" title="Ledger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </button>
          <button class="action-btn" onclick="AccountsPage.editAccount(${account.account_id})" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="action-btn danger" onclick="AccountsPage.deleteAccount(${account.account_id})" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
};
