/**
 * Manage Voucher Page
 * Search, view, edit, and delete vouchers
 */

const ManageVoucherPage = {
  currentVoucher: null,
  accounts: [],
  isEditing: false,

  async render() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Manage Voucher</h1>
          <p class="page-subtitle">Search, view, edit, and delete vouchers</p>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Search Voucher</h3>
            <p class="card-description">Enter voucher number or 5-digit code (e.g., 00001)</p>
          </div>
        </div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label">Voucher Number or Code</label>
              <input type="text" id="manage-voucher-number" class="form-input" placeholder="e.g., DBV-2024-00001 or 00001">
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
              <button id="btn-search-voucher" class="btn btn-primary">Search</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="voucher-result"></div>
    `;
    
    this.accounts = await window.api.accounts.getAll();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('btn-search-voucher').addEventListener('click', () => this.searchVoucher());
    document.getElementById('manage-voucher-number').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchVoucher();
    });
  },

  async searchVoucher() {
    const voucherNumber = document.getElementById('manage-voucher-number').value.trim();
    const resultContainer = document.getElementById('voucher-result');

    if (!voucherNumber) {
      Toast.warning('Please enter a voucher number or code');
      return;
    }

    try {
      showLoading();
      const vouchers = await window.api.vouchers.search({ search: voucherNumber });
      
      if (!vouchers || vouchers.length === 0) {
        resultContainer.innerHTML = `
          <div class="card">
            <div class="empty-state">
              <h3>Voucher not found</h3>
              <p>No voucher found matching: ${voucherNumber}</p>
            </div>
          </div>
        `;
        return;
      }

      let voucher;
      if (voucherNumber.length === 5 && /^\d+$/.test(voucherNumber)) {
        voucher = vouchers.find(v => v.voucher_number.endsWith(voucherNumber)) || vouchers[0];
      } else {
        voucher = vouchers.find(v => v.voucher_number === voucherNumber) || vouchers[0];
      }
      
      const fullVoucher = await window.api.vouchers.getById(voucher.voucher_id);
      
      if (!fullVoucher) {
        Toast.error('Failed to load voucher details');
        return;
      }

      this.currentVoucher = fullVoucher;
      this.isEditing = false;
      this.displayVoucher();
    } catch (err) {
      console.error('Search error:', err);
      Toast.error('Failed to search: ' + (err.message || 'Unknown error'));
    } finally {
      hideLoading();
    }
  },

  displayVoucher() {
    const voucher = this.currentVoucher;
    const resultContainer = document.getElementById('voucher-result');
    const shortCode = voucher.voucher_number.split('-').pop();
    
    const entriesHTML = voucher.entries.map(entry => `
      <tr>
        <td style="padding: 8px; border: 1px solid black;">${entry.account_code || '—'}</td>
        <td style="padding: 8px; border: 1px solid black;">${entry.account_name || '—'}</td>
        <td style="padding: 8px; border: 1px solid black; text-align: right;">${entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '—'}</td>
        <td style="padding: 8px; border: 1px solid black; text-align: right;">${entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '—'}</td>
      </tr>
    `).join('');

    resultContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">Voucher Details</h3></div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" id="btn-edit-voucher">Edit</button>
            <button class="btn" id="btn-delete-voucher" style="background: #fee2e2;">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Voucher Number</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black; font-weight: 700; font-size: 18px;">
                <span style="color: #6b7280; font-size: 14px;">${voucher.voucher_number.split('-').slice(0, 2).join('-')}-</span>${shortCode}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black;">
                <span class="badge badge-${voucher.voucher_type === 'Debit' ? 'danger' : voucher.voucher_type === 'Credit' ? 'success' : 'primary'}">${voucher.voucher_type}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black;">${formatDate(voucher.voucher_date)}</div>
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Narration</label>
            <div style="padding: 10px; background: #f3f4f6; border: 1px solid black; min-height: 40px;">${voucher.narration || '—'}</div>
          </div>

          ${voucher.narration_urdu ? `
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Narration (Urdu)</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black; direction: rtl; text-align: right;">${voucher.narration_urdu}</div>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Entries</label>
            <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="width: 20%; padding: 8px; border: 1px solid black; text-align: left;">Code</th>
                  <th style="width: 40%; padding: 8px; border: 1px solid black; text-align: left;">Account</th>
                  <th style="width: 20%; padding: 8px; border: 1px solid black; text-align: right;">Debit</th>
                  <th style="width: 20%; padding: 8px; border: 1px solid black; text-align: right;">Credit</th>
                </tr>
              </thead>
              <tbody>${entriesHTML}</tbody>
              <tfoot>
                <tr style="font-weight: bold; background: #f9fafb;">
                  <td colspan="2" style="padding: 8px; border: 1px solid black; text-align: right;">Total:</td>
                  <td style="padding: 8px; border: 1px solid black; text-align: right;">${formatCurrency(voucher.total_amount)}</td>
                  <td style="padding: 8px; border: 1px solid black; text-align: right;">${formatCurrency(voucher.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-edit-voucher').addEventListener('click', () => this.showEditForm());
    document.getElementById('btn-delete-voucher').addEventListener('click', () => this.deleteVoucher());
  },

  showEditForm() {
    const voucher = this.currentVoucher;
    const resultContainer = document.getElementById('voucher-result');
    const shortCode = voucher.voucher_number.split('-').pop();
    
    const accountOptions = this.accounts.map(a => 
      `<option value="${a.account_id}">${a.account_code ? a.account_code + ' - ' : ''}${a.account_name}</option>`
    ).join('');

    const entriesHTML = voucher.entries.map((entry, i) => `
      <tr class="entry-row" data-index="${i}">
        <td style="padding: 8px; border: 1px solid black;">
          <select class="form-select entry-account" style="width: 100%;">
            ${this.accounts.map(a => 
              `<option value="${a.account_id}" ${a.account_id == entry.account_id ? 'selected' : ''}>${a.account_code ? a.account_code + ' - ' : ''}${a.account_name}</option>`
            ).join('')}
          </select>
        </td>
        <td style="padding: 8px; border: 1px solid black;">
          <input type="number" class="form-input entry-debit" value="${entry.debit_amount || ''}" step="1" min="0" style="text-align: right; width: 100%;">
        </td>
        <td style="padding: 8px; border: 1px solid black;">
          <input type="number" class="form-input entry-credit" value="${entry.credit_amount || ''}" step="1" min="0" style="text-align: right; width: 100%;">
        </td>
      </tr>
    `).join('');

    resultContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">Edit Voucher</h3></div>
          <div style="display: flex; gap: 8px;">
            <button class="btn" id="btn-cancel-edit">Cancel</button>
            <button class="btn btn-primary" id="btn-save-voucher">Save Changes</button>
          </div>
        </div>
        <div class="card-body">
          <div class="form-row" style="margin-bottom: 16px;">
            <div class="form-group">
              <label class="form-label">Voucher Number</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black; font-weight: 700; font-size: 18px;">
                <span style="color: #6b7280; font-size: 14px;">${voucher.voucher_number.split('-').slice(0, 2).join('-')}-</span>${shortCode}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <div style="padding: 10px; background: #f3f4f6; border: 1px solid black;">
                <span class="badge badge-${voucher.voucher_type === 'Debit' ? 'danger' : voucher.voucher_type === 'Credit' ? 'success' : 'primary'}">${voucher.voucher_type}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" id="edit-date" class="form-input" value="${voucher.voucher_date}">
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Narration</label>
            <textarea id="edit-narration" class="form-textarea" rows="2">${voucher.narration || ''}</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label">Narration (Urdu)</label>
            <textarea id="edit-narration-urdu" class="form-textarea" rows="2" dir="rtl">${voucher.narration_urdu || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Entries</label>
            <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="width: 50%; padding: 8px; border: 1px solid black; text-align: left;">Account</th>
                  <th style="width: 25%; padding: 8px; border: 1px solid black; text-align: right;">Debit</th>
                  <th style="width: 25%; padding: 8px; border: 1px solid black; text-align: right;">Credit</th>
                </tr>
              </thead>
              <tbody id="edit-entries">${entriesHTML}</tbody>
              <tfoot>
                <tr style="font-weight: bold; background: #f9fafb;">
                  <td style="padding: 8px; border: 1px solid black; text-align: right;">Total:</td>
                  <td style="padding: 8px; border: 1px solid black; text-align: right;" id="edit-total-debit">0</td>
                  <td style="padding: 8px; border: 1px solid black; text-align: right;" id="edit-total-credit">0</td>
                </tr>
              </tfoot>
            </table>
            <div id="balance-status" style="margin-top: 8px; text-align: center;"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-cancel-edit').addEventListener('click', () => this.displayVoucher());
    document.getElementById('btn-save-voucher').addEventListener('click', () => this.saveVoucher());
    
    document.querySelectorAll('.entry-debit, .entry-credit').forEach(input => {
      input.addEventListener('input', () => this.updateTotals());
    });
    
    this.updateTotals();
  },

  updateTotals() {
    let totalDebit = 0, totalCredit = 0;
    
    document.querySelectorAll('.entry-debit').forEach(input => {
      totalDebit += parseFloat(input.value) || 0;
    });
    document.querySelectorAll('.entry-credit').forEach(input => {
      totalCredit += parseFloat(input.value) || 0;
    });
    
    document.getElementById('edit-total-debit').textContent = formatCurrency(totalDebit);
    document.getElementById('edit-total-credit').textContent = formatCurrency(totalCredit);
    
    const statusEl = document.getElementById('balance-status');
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    
    if (isBalanced && totalDebit > 0) {
      statusEl.innerHTML = '<span style="color: #16a34a; font-weight: bold;">✓ Balanced</span>';
    } else if (totalDebit === 0 && totalCredit === 0) {
      statusEl.innerHTML = '<span style="color: #6b7280;">Enter amounts</span>';
    } else {
      statusEl.innerHTML = '<span style="color: #dc2626; font-weight: bold;">✗ Not Balanced</span>';
    }
  },

  async saveVoucher() {
    try {
      showLoading();
      
      const entries = [];
      document.querySelectorAll('.entry-row').forEach(row => {
        const accountId = row.querySelector('.entry-account').value;
        const debit = parseFloat(row.querySelector('.entry-debit').value) || 0;
        const credit = parseFloat(row.querySelector('.entry-credit').value) || 0;
        
        if (debit > 0 || credit > 0) {
          entries.push({ account_id: parseInt(accountId), debit_amount: debit, credit_amount: credit });
        }
      });
      
      if (entries.length < 2) {
        Toast.error('Voucher must have at least 2 entries');
        return;
      }
      
      const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
      const totalCredit = entries.reduce((sum, e) => sum + e.credit_amount, 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        Toast.error('Voucher is not balanced');
        return;
      }
      
      const result = await window.api.vouchers.update(this.currentVoucher.voucher_id, {
        voucher_date: document.getElementById('edit-date').value,
        narration: document.getElementById('edit-narration').value,
        narration_urdu: document.getElementById('edit-narration-urdu').value,
        entries
      });
      
      if (result.success) {
        Toast.success('Voucher updated successfully');
        this.currentVoucher = await window.api.vouchers.getById(this.currentVoucher.voucher_id);
        this.displayVoucher();
      } else {
        Toast.error(result.error || 'Failed to update voucher');
      }
    } catch (err) {
      console.error('Error updating voucher:', err);
      Toast.error('Failed to update voucher');
    } finally {
      hideLoading();
    }
  },

  deleteVoucher() {
    Modal.confirm('Are you sure you want to delete this voucher?', async () => {
      try {
        showLoading();
        const result = await window.api.vouchers.delete(this.currentVoucher.voucher_id);
        if (result.success) {
          Toast.success('Voucher deleted');
          this.currentVoucher = null;
          document.getElementById('voucher-result').innerHTML = '';
        } else {
          Toast.error(result.error || 'Failed to delete voucher');
        }
      } catch (err) {
        Toast.error('Failed to delete voucher');
      } finally {
        hideLoading();
      }
    });
  }
};

export default ManageVoucherPage;
