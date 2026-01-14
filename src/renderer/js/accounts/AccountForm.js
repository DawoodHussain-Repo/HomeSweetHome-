/**
 * Account Form Component
 * Form for creating/editing accounts
 */

import { ACCOUNT_TYPE } from '../utils/constants.js';

export const AccountForm = {
  render(account = null, allAccounts = []) {
    const types = Object.values(ACCOUNT_TYPE);
    const parentAccounts = allAccounts.filter(a => a.is_active && (!account || a.account_id !== account.account_id));

    return `
      <form id="account-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Account Code</label>
            <input type="text" id="account-code" class="form-input" 
                   value="${account?.account_code || ''}" placeholder="Optional">
          </div>
          <div>
            <label class="form-label required">Account Type</label>
            <select id="account-type" class="form-select" required>
              <option value="">Select Type</option>
              ${types.map(t => `
                <option value="${t}" ${account?.account_type === t ? 'selected' : ''}>${t}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div>
          <label class="form-label required">Account Name</label>
          <input type="text" id="account-name" class="form-input" 
                 value="${account?.account_name || ''}" placeholder="Enter account name" required>
        </div>

        <div>
          <label class="form-label">Parent Account</label>
          <select id="parent-account" class="form-select">
            <option value="">None (Top Level)</option>
            ${parentAccounts.map(a => `
              <option value="${a.account_id}" ${account?.parent_account_id === a.account_id ? 'selected' : ''}>
                ${a.account_code ? `${a.account_code} - ` : ''}${a.account_name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Opening Balance</label>
            <input type="number" id="opening-balance" class="form-input" 
                   value="${account?.opening_balance || ''}" step="1" placeholder="0">
          </div>
          <div>
            <label class="form-label">Balance Type</label>
            <select id="balance-type" class="form-select">
              <option value="Debit" ${account?.opening_balance_type === 'Debit' ? 'selected' : ''}>Debit</option>
              <option value="Credit" ${account?.opening_balance_type === 'Credit' ? 'selected' : ''}>Credit</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input type="checkbox" id="is-active" class="w-4 h-4" 
                 ${account?.is_active !== false ? 'checked' : ''}>
          <label for="is-active" class="text-sm font-medium">Active</label>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">
            ${account ? 'Update' : 'Create'} Account
          </button>
        </div>
      </form>
    `;
  },

  bindEvents(accountId, onSuccess) {
    const form = document.getElementById('account-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        account_code: document.getElementById('account-code').value.trim(),
        account_name: document.getElementById('account-name').value.trim(),
        account_type: document.getElementById('account-type').value,
        parent_account_id: document.getElementById('parent-account').value || null,
        opening_balance: parseFloat(document.getElementById('opening-balance').value) || 0,
        opening_balance_type: document.getElementById('balance-type').value,
        is_active: document.getElementById('is-active').checked
      };

      try {
        showLoading();
        const result = accountId 
          ? await window.api.accounts.update(accountId, formData)
          : await window.api.accounts.create(formData);

        if (result.success) {
          Toast.success(`Account ${accountId ? 'updated' : 'created'} successfully`);
          Modal.close();
          if (onSuccess) onSuccess();
        } else {
          Toast.error(result.error || 'Failed to save account');
        }
      } catch (err) {
        Toast.error('Failed to save account');
        console.error(err);
      } finally {
        hideLoading();
      }
    });
  }
};
