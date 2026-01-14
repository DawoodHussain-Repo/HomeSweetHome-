/**
 * Vouchers Page - Refactored
 * Handles voucher creation with modular components
 */

import { VoucherValidator } from '../vouchers/VoucherValidator.js';
import { VoucherEntryManager } from '../vouchers/VoucherEntryManager.js';
import { VoucherForm } from '../vouchers/VoucherForm.js';
import { getTodayDate } from '../utils/formatters.js';
import { VOUCHER_TYPE } from '../utils/constants.js';

const VouchersPage = {
  accounts: [],
  entryManager: null,
  currentType: VOUCHER_TYPE.DEBIT,
  
  async render() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Vouchers</h1>
          <p class="page-subtitle">Create and manage accounting vouchers</p>
        </div>
      </div>
      
      ${this.renderTypeSelector()}
      
      <div id="voucher-form-container"></div>
    `;
    
    await this.init();
  },

  async init() {
    console.log('Initializing vouchers page...');
    this.accounts = await window.api.accounts.getAll();
    console.log('Loaded accounts:', this.accounts.length);
    
    if (this.accounts.length === 0) {
      Toast.warning('No accounts found. Please create accounts first.');
    }
    
    this.entryManager = new VoucherEntryManager(this.accounts);
    this.bindEvents();
    this.renderForm();
  },

  renderTypeSelector() {
    return `
      <div class="flex gap-4 mb-6">
        <button class="voucher-type-btn active" data-type="${VOUCHER_TYPE.DEBIT}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
          Debit
        </button>
        <button class="voucher-type-btn" data-type="${VOUCHER_TYPE.CREDIT}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          Credit
        </button>
        <button class="voucher-type-btn" data-type="${VOUCHER_TYPE.JOURNAL}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Journal
        </button>
      </div>
    `;
  },

  bindEvents() {
    document.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.switchType(type);
      });
    });
  },

  switchType(type) {
    this.currentType = type;
    
    // Update button states
    document.querySelectorAll('[data-type]').forEach(btn => {
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    this.renderForm();
  },

  renderForm() {
    const container = document.getElementById('voucher-form-container');
    const formHTML = VoucherForm.render(this.currentType, this.accounts, this.entryManager);
    container.innerHTML = formHTML;
    this.bindFormEvents();
    this.initializeSearchableSelects();
  },
  
  initializeSearchableSelects() {
    const accountOptions = this.accounts.map(a => ({
      value: a.account_id,
      label: `${a.account_code ? a.account_code + ' - ' : ''}${a.account_name}`
    }));
    
    // Initialize searchable selects for both voucher types
    ['payment-account', 'receipt-account'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        // Destroy existing SearchableSelect if any
        if (input.searchableSelect) {
          input.searchableSelect.destroy();
        }
        
        // Create new SearchableSelect
        input.searchableSelect = new window.SearchableSelect(id, accountOptions, (option) => {
          input.dataset.accountId = option.value;
        });
      }
    });
  },

  bindFormEvents() {
    const form = document.getElementById('voucher-form');
    if (!form) return;

    // For Journal vouchers - initialize with exactly 2 entries
    if (this.currentType === VOUCHER_TYPE.JOURNAL) {
      this.entryManager.clearEntries();
      this.entryManager.addEntry();
      this.entryManager.addEntry();
      this.entryManager.renderEntries('voucher-entries-table');
    }

    // Submit button
    const submitBtn = document.getElementById('submit-voucher');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleSubmit());
    }

    // Reset button
    const resetBtn = document.getElementById('reset-voucher');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleReset());
    }
  },

  async handleSubmit() {
    const formData = this.collectFormData();
    console.log('Submitting voucher:', formData);
    
    if (!formData.entries || formData.entries.length === 0) {
      Toast.error('Please fill in all required fields');
      return;
    }
    
    const validation = VoucherValidator.validate(formData);
    if (!validation.isValid) {
      console.error('Validation errors:', validation.errors);
      Toast.error(validation.errors[0]);
      return;
    }

    try {
      showLoading();
      const result = await window.api.vouchers.create(formData);
      
      if (result.success) {
        Toast.success(`Voucher ${result.voucher_number} created successfully`);
        this.handleReset();
      } else {
        console.error('API error:', result.error);
        Toast.error(result.error || 'Failed to create voucher');
      }
    } catch (err) {
      console.error('Exception:', err);
      Toast.error('Failed to create voucher: ' + (err.message || 'Unknown error'));
    } finally {
      hideLoading();
    }
  },

  collectFormData() {
    const type = this.currentType;
    const date = document.getElementById('voucher-date')?.value || getTodayDate();
    const narration = document.getElementById('narration')?.value || '';
    const narration_urdu = document.getElementById('narration-urdu')?.value || '';

    let entries = [];

    if (type === VOUCHER_TYPE.JOURNAL) {
      // Journal: Multiple entries from table
      entries = this.entryManager.getEntries().map(e => ({
        account_id: parseInt(e.account_id),
        debit_amount: parseFloat(e.debit_amount) || 0,
        credit_amount: parseFloat(e.credit_amount) || 0
      }));
    } else {
      // Debit or Credit: Single account with auto cash contra
      entries = this.createSimpleVoucherEntries(type);
    }

    return { 
      voucher_type: type,
      voucher_date: date,
      narration,
      narration_urdu,
      entries
    };
  },

  createSimpleVoucherEntries(type) {
    const isDebit = type === VOUCHER_TYPE.DEBIT;
    const inputId = isDebit ? 'payment-account' : 'receipt-account';
    const amountId = isDebit ? 'payment-amount' : 'receipt-amount';
    
    const accountInput = document.getElementById(inputId);
    const accountId = accountInput?.dataset.accountId;
    const amount = parseFloat(document.getElementById(amountId)?.value) || 0;
    
    if (!accountId || amount <= 0) {
      console.log('Missing account or amount');
      return [];
    }
    
    const cashAccount = this.findCashAccount();
    if (!cashAccount) {
      Toast.error('No cash/bank account found. Please create a "Cash" or "Bank" account first.');
      return [];
    }

    console.log(`${type}: Account ${accountId}, Cash ${cashAccount.account_id}, Amount ${amount}`);
    
    return isDebit ? [
      { account_id: parseInt(accountId), debit_amount: amount, credit_amount: 0 },
      { account_id: cashAccount.account_id, debit_amount: 0, credit_amount: amount }
    ] : [
      { account_id: cashAccount.account_id, debit_amount: amount, credit_amount: 0 },
      { account_id: parseInt(accountId), debit_amount: 0, credit_amount: amount }
    ];
  },

  findCashAccount() {
    const cashKeywords = ['cash', 'bank', 'cash in hand', 'petty cash'];
    
    for (const keyword of cashKeywords) {
      const account = this.accounts.find(a => a.account_name.toLowerCase().includes(keyword));
      if (account) return account;
    }
    
    const assetAccount = this.accounts.find(a => a.account_type === 'Asset');
    if (assetAccount) return assetAccount;
    
    if (this.accounts.length > 0) {
      console.warn('No cash account found, using:', this.accounts[0].account_name);
      return this.accounts[0];
    }
    
    return null;
  },

  handleReset() {
    this.entryManager.clearEntries();
    this.renderForm();
  }
};

export default VouchersPage;
