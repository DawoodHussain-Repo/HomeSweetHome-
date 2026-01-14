/**
 * Voucher Entry Manager
 * Manages voucher entry rows (add, remove, update)
 */

export class VoucherEntryManager {
  constructor(accounts) {
    this.accounts = accounts;
    this.entries = [];
    this.nextId = 1;
  }

  /**
   * Add new entry row
   */
  addEntry(entry = {}) {
    const newEntry = {
      id: this.nextId++,
      account_id: entry.account_id || '',
      debit_amount: entry.debit_amount || '',
      credit_amount: entry.credit_amount || '',
      narration: entry.narration || ''
    };

    this.entries.push(newEntry);
    return newEntry;
  }

  /**
   * Remove entry by ID
   */
  removeEntry(id) {
    const index = this.entries.findIndex(e => e.id === id);
    if (index > -1) {
      this.entries.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update entry
   */
  updateEntry(id, field, value) {
    const entry = this.entries.find(e => e.id === id);
    if (entry) {
      entry[field] = value;
      
      // Clear opposite field when entering amount
      if (field === 'debit_amount' && value) {
        entry.credit_amount = '';
      } else if (field === 'credit_amount' && value) {
        entry.debit_amount = '';
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get all entries
   */
  getEntries() {
    return this.entries;
  }

  /**
   * Clear all entries
   */
  clearEntries() {
    this.entries = [];
    this.nextId = 1;
  }

  /**
   * Calculate totals
   */
  calculateTotals() {
    return this.entries.reduce((acc, entry) => ({
      debit: acc.debit + (parseFloat(entry.debit_amount) || 0),
      credit: acc.credit + (parseFloat(entry.credit_amount) || 0)
    }), { debit: 0, credit: 0 });
  }

  /**
   * Check if balanced
   */
  isBalanced() {
    const totals = this.calculateTotals();
    return Math.abs(totals.debit - totals.credit) < 0.01;
  }

  /**
   * Generate entry row HTML
   */
  generateEntryRowHTML(entry) {
    return `
      <tr data-entry-id="${entry.id}">
        <td>
          <div class="entry-account-container" id="entry-account-${entry.id}"></div>
        </td>
        <td>
          <input type="number" class="form-input entry-debit" data-field="debit_amount" 
                 value="${entry.debit_amount}" step="1" min="0" placeholder="0">
        </td>
        <td>
          <input type="number" class="form-input entry-credit" data-field="credit_amount" 
                 value="${entry.credit_amount}" step="1" min="0" placeholder="0">
        </td>
      </tr>
    `;
  }

  /**
   * Render all entries
   */
  renderEntries(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = this.entries.map(e => this.generateEntryRowHTML(e)).join('');
    this.initializeSearchableSelects();
    this.bindEntryEvents(tbody);
  }

  /**
   * Initialize searchable selects for all entry rows
   */
  initializeSearchableSelects() {
    console.log('[VoucherEntryManager] Initializing searchable selects for', this.entries.length, 'entries');
    
    const accountOptions = this.accounts.map(a => ({
      value: a.account_id,
      label: `${a.account_code ? `${a.account_code} - ` : ''}${a.account_name}`,
      code: a.account_code
    }));

    console.log('[VoucherEntryManager] Account options:', accountOptions.length);

    this.entries.forEach(entry => {
      const containerId = `entry-account-${entry.id}`;
      const inputId = `entry-account-input-${entry.id}`;
      const container = document.getElementById(containerId);
      
      console.log(`[VoucherEntryManager] Processing entry ${entry.id}, container:`, container);
      
      if (!container) {
        console.error(`[VoucherEntryManager] Container not found: ${containerId}`);
        return;
      }
      
      // Check if input already exists
      let input = document.getElementById(inputId);
      
      if (!input) {
        // Create input element
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.id = inputId;
        input.placeholder = 'Type to search accounts...';
        input.autocomplete = 'off';
        container.appendChild(input);
        
        console.log(`[VoucherEntryManager] Created input: ${inputId}`);
      }

      // Destroy existing SearchableSelect if any
      if (input.searchableSelect) {
        console.log(`[VoucherEntryManager] Destroying existing SearchableSelect for ${inputId}`);
        input.searchableSelect.destroy();
      }

      // Initialize new SearchableSelect
      if (window.SearchableSelect) {
        console.log(`[VoucherEntryManager] Creating SearchableSelect for ${inputId}`);
        
        const searchableSelect = new window.SearchableSelect(
          inputId,
          accountOptions,
          (option) => {
            console.log('[VoucherEntryManager] Selected account:', option);
            this.updateEntry(entry.id, 'account_id', option.value);
          }
        );
        
        // Store reference
        input.searchableSelect = searchableSelect;

        // Set initial value if exists
        if (entry.account_id) {
          const selectedAccount = this.accounts.find(a => a.account_id == entry.account_id);
          if (selectedAccount) {
            input.value = `${selectedAccount.account_code ? `${selectedAccount.account_code} - ` : ''}${selectedAccount.account_name}`;
            input.dataset.value = entry.account_id;
            input.dataset.accountId = entry.account_id;
          }
        }
        
        console.log(`[VoucherEntryManager] Initialized SearchableSelect for entry ${entry.id}`);
      } else {
        console.error('[VoucherEntryManager] SearchableSelect not available globally!');
      }
    });
    
    console.log('[VoucherEntryManager] Finished initializing searchable selects');
  }

  /**
   * Bind events to entry rows
   */
  bindEntryEvents(tbody) {
    // Debit amount
    tbody.querySelectorAll('.entry-debit').forEach(input => {
      input.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        const entryId = parseInt(row.dataset.entryId);
        this.updateEntry(entryId, 'debit_amount', e.target.value);
        
        // Clear credit field
        const creditInput = row.querySelector('.entry-credit');
        if (e.target.value && creditInput) {
          creditInput.value = '';
        }
        
        this.updateTotals();
      });
    });

    // Credit amount
    tbody.querySelectorAll('.entry-credit').forEach(input => {
      input.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        const entryId = parseInt(row.dataset.entryId);
        this.updateEntry(entryId, 'credit_amount', e.target.value);
        
        // Clear debit field
        const debitInput = row.querySelector('.entry-debit');
        if (e.target.value && debitInput) {
          debitInput.value = '';
        }
        
        this.updateTotals();
      });
    });
  }

  /**
   * Update totals display
   */
  updateTotals() {
    const totals = this.calculateTotals();
    const debitTotal = document.getElementById('total-debit');
    const creditTotal = document.getElementById('total-credit');
    
    if (debitTotal) debitTotal.textContent = formatCurrency(totals.debit);
    if (creditTotal) creditTotal.textContent = formatCurrency(totals.credit);

    // Update balance status
    const balanced = this.isBalanced();
    const balanceIndicator = document.querySelector('.balance-indicator');
    if (balanceIndicator) {
      balanceIndicator.className = `balance-indicator ${balanced ? 'balanced' : 'unbalanced'}`;
      balanceIndicator.textContent = balanced ? '✓ Balanced' : '✗ Not Balanced';
    }
  }
}
