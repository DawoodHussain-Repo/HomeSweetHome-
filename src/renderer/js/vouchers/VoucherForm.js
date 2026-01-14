/**
 * Voucher Form Component
 * Generates form HTML for different voucher types
 */

import { getTodayDate } from '../utils/formatters.js';
import { VOUCHER_TYPE } from '../utils/constants.js';

export const VoucherForm = {
  render(type, accounts, entryManager) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${this.getTitle(type)}</h3>
          <p class="card-description">${this.getDescription(type)}</p>
        </div>
        
        <form id="voucher-form" class="p-6">
          ${this.renderBasicFields()}
          ${this.renderEntriesSection(type, accounts)}
          ${this.renderNarrationFields()}
          ${this.renderActions()}
        </form>
      </div>
    `;
  },

  getTitle(type) {
    const titles = {
      [VOUCHER_TYPE.DEBIT]: 'Debit Voucher',
      [VOUCHER_TYPE.CREDIT]: 'Credit Voucher',
      [VOUCHER_TYPE.JOURNAL]: 'Journal Voucher'
    };
    return titles[type] || 'Voucher';
  },

  getDescription(type) {
    const descriptions = {
      [VOUCHER_TYPE.DEBIT]: 'Record a debit transaction',
      [VOUCHER_TYPE.CREDIT]: 'Record a credit transaction',
      [VOUCHER_TYPE.JOURNAL]: 'Record a compound journal entry'
    };
    return descriptions[type] || '';
  },

  renderBasicFields() {
    return `
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="form-group">
          <label class="form-label">Voucher Date</label>
          <input type="date" id="voucher-date" class="form-input" value="${getTodayDate()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Voucher Number</label>
          <input type="text" class="form-input" value="Auto-generated" disabled>
        </div>
      </div>
    `;
  },

  renderEntriesSection(type, accounts) {
    if (type === VOUCHER_TYPE.JOURNAL) {
      return this.renderJournalEntries();
    } else if (type === VOUCHER_TYPE.DEBIT) {
      return this.renderPaymentEntries(accounts);
    } else {
      return this.renderReceiptEntries(accounts);
    }
  },

  renderPaymentEntries(accounts) {
    return `
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-4">Debit Details</h4>
        
        <div class="form-group mb-4">
          <label class="form-label">Debit Account</label>
          <div class="searchable-select">
            <input type="text" 
                   id="payment-account" 
                   class="searchable-select-input form-input" 
                   placeholder="Type to search accounts..."
                   autocomplete="off"
                   required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Amount</label>
          <input type="number" id="payment-amount" class="form-input" step="1" min="0" placeholder="0" required>
        </div>
      </div>
    `;
  },

  renderReceiptEntries(accounts) {
    return `
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-4">Credit Details</h4>
        
        <div class="form-group mb-4">
          <label class="form-label">Credit Account</label>
          <div class="searchable-select">
            <input type="text" 
                   id="receipt-account" 
                   class="searchable-select-input form-input" 
                   placeholder="Type to search accounts..."
                   autocomplete="off"
                   required>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Amount</label>
          <input type="number" id="receipt-amount" class="form-input" step="1" min="0" placeholder="0" required>
        </div>
      </div>
    `;
  },

  renderJournalEntries() {
    return `
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-4">Journal Entries</h4>
        
        <div class="table-container">
          <table id="voucher-entries-table" class="report-table">
            <thead>
              <tr>
                <th>Account</th>
                <th class="text-right">Debit</th>
                <th class="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              <!-- Entries will be rendered here -->
            </tbody>
            <tfoot>
              <tr style="background: white; font-weight: 700;">
                <td>Total</td>
                <td class="text-right" id="total-debit">PKR 0.00</td>
                <td class="text-right" id="total-credit">PKR 0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  renderNarrationFields() {
    return `
      <div class="mb-6">
        <div class="form-group mb-4">
          <label class="form-label">Narration (English)</label>
          <textarea id="narration" class="form-textarea" rows="2" placeholder="Enter narration..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Narration (Urdu)</label>
          <textarea id="narration-urdu" class="form-textarea urdu-text" rows="2" placeholder="تفصیل درج کریں..." dir="rtl"></textarea>
        </div>
      </div>
    `;
  },

  renderActions() {
    return `
      <div class="flex justify-end gap-3">
        <button type="button" id="reset-voucher" class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          Reset
        </button>
        <button type="button" id="submit-voucher" class="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Create Voucher
        </button>
      </div>
    `;
  }
};
