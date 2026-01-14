/**
 * Account List Component
 * Renders accounts in table format
 */

import { formatCurrency, escapeHtml } from '../utils/formatters.js';

export const AccountList = {
  render(containerId, accounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!accounts.length) {
      container.innerHTML = `
        <div class="card p-4">
          <div class="empty-state">
            <h3 class="text-lg font-semibold">No accounts found</h3>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th class="text-right">Opening Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${accounts.map(a => this.renderRow(a)).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderRow(account) {
    return `
      <tr>
        <td class="font-mono text-sm">${account.account_code || '—'}</td>
        <td class="font-semibold">${escapeHtml(account.account_name)}</td>
        <td>
          <span class="badge">
            ${account.account_type}
          </span>
        </td>
        <td class="text-right font-mono text-sm">
          ${account.opening_balance ? formatCurrency(account.opening_balance) : '—'}
        </td>
        <td>
          ${account.is_active 
            ? '<span class="badge">Active</span>' 
            : '<span class="badge">Inactive</span>'}
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm" onclick="AccountsPage.viewLedger(${account.account_id})" title="Ledger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </button>
            <button class="btn btn-sm" onclick="AccountsPage.editAccount(${account.account_id})" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn btn-sm" onclick="AccountsPage.deleteAccount(${account.account_id})" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }
};
