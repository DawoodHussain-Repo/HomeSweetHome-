/**
 * Settings Page - Company Info and App Settings
 */
const SettingsPage = {
  async render() {
    const content = document.getElementById('page-content');
    const info = await window.api.company.getInfo();
    
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure company information and preferences</p>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Company Information</h3>
            <p class="card-description">Update your company details</p>
          </div>
        </div>
        <div class="card-body">
          <form id="company-form">
            <div class="form-group">
              <label class="form-label">Company Name *</label>
              <input type="text" class="form-input" id="c-name" value="${escapeHtml(info?.company_name || '')}" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Address</label>
              <textarea class="form-textarea" id="c-address" rows="2">${escapeHtml(info?.address || '')}</textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="text" class="form-input" id="c-phone" value="${escapeHtml(info?.phone || '')}">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="c-email" value="${escapeHtml(info?.email || '')}">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tax ID / Registration</label>
                <input type="text" class="form-input" id="c-tax" value="${escapeHtml(info?.tax_id || '')}">
              </div>
              <div class="form-group">
                <label class="form-label">Financial Year Start</label>
                <select class="form-select" id="c-fy">
                  <option value="01-01" ${info?.financial_year_start === '01-01' ? 'selected' : ''}>January 1</option>
                  <option value="04-01" ${info?.financial_year_start === '04-01' ? 'selected' : ''}>April 1</option>
                  <option value="07-01" ${info?.financial_year_start === '07-01' ? 'selected' : ''}>July 1</option>
                  <option value="10-01" ${info?.financial_year_start === '10-01' ? 'selected' : ''}>October 1</option>
                </select>
              </div>
            </div>
            
            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Database</h3>
            <p class="card-description">Backup and export your data</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn" id="btn-backup">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export Backup
            </button>
            <button class="btn" id="btn-export-csv">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">About</h3>
            <p class="card-description">Application information</p>
          </div>
        </div>
        <div class="card-body">
          <p style="font-weight: 600; margin-bottom: 8px;">HSH Accounting v1.0.0</p>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 16px;">
            Professional offline-first desktop accounting with double-entry bookkeeping.
          </p>
          <p style="font-size: 13px;">
            <strong>Data Location:</strong> 
            <code style="background: #f3f4f6; padding: 4px 8px; border: 1px solid black; font-family: monospace;">app-data/database.db</code>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">
            Copy the entire folder to move your data to another computer.
          </p>
        </div>
      </div>
    `;
    
    this.bindEvents();
  },
  
  bindEvents() {
    document.getElementById('company-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.save();
    });
    
    document.getElementById('btn-backup').addEventListener('click', () => this.exportBackup());
    document.getElementById('btn-export-csv').addEventListener('click', () => this.exportCSV());
  },
  
  async save() {
    const data = {
      company_name: document.getElementById('c-name').value,
      address: document.getElementById('c-address').value || null,
      phone: document.getElementById('c-phone').value || null,
      email: document.getElementById('c-email').value || null,
      tax_id: document.getElementById('c-tax').value || null,
      financial_year_start: document.getElementById('c-fy').value
    };
    
    try {
      await window.api.company.updateInfo(data);
      Toast.success('Settings saved');
    } catch (err) {
      Toast.error('Failed to save');
    }
  },
  
  async exportBackup() {
    try {
      const result = await window.api.database.backup();
      if (result.success) {
        Toast.success(`Backup saved: ${result.path}`);
      } else {
        Toast.error(result.error || 'Backup failed');
      }
    } catch (err) {
      Toast.error('Backup failed');
    }
  },
  
  async exportCSV() {
    try {
      showLoading();
      const result = await window.api.database.exportCSV();
      hideLoading();
      
      if (result.success) {
        Toast.success(`Exported to: ${result.path}`);
      } else {
        Toast.error(result.error || 'Export failed');
      }
    } catch (err) {
      hideLoading();
      Toast.error('Export failed');
    }
  }
};
