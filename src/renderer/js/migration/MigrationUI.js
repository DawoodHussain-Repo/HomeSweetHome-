/**
 * Migration UI - Main Layout and Files
 */
export class MigrationUI {
  static renderMainLayout() {
    return `
      <div class="page-header">
        <h1 class="page-title">Legacy Data Import</h1>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-scan-files">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Scan for Files
          </button>
        </div>
      </div>
      
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">Import Instructions</h3>
        </div>
        <div style="padding: 0 20px 20px;">
          <p>Place your legacy data files (CSV, JSON) in the <code>legacy-data</code> folder located in the application directory.</p>
          <p style="margin-top: 8px;">Supported formats:</p>
          <ul style="margin-left: 20px; margin-top: 8px;">
            <li>CSV files with headers</li>
            <li>JSON files (array of objects)</li>
          </ul>
          <p style="margin-top: 8px; color: var(--color-text-muted);">
            The system will attempt to detect date, amount, and account fields automatically.
          </p>
        </div>
      </div>
      
      <div class="tabs">
        <button class="tab active" data-tab="files">Available Files</button>
        <button class="tab" data-tab="batches">Import Batches</button>
        <button class="tab" data-tab="mapping">Account Mapping</button>
      </div>
      
      <div id="tab-files" class="tab-content active">
        <div class="card">
          <div id="files-list">
            <div class="empty-state">
              <p>Click "Scan for Files" to detect importable files</p>
            </div>
          </div>
        </div>
      </div>
      
      <div id="tab-batches" class="tab-content">
        <div class="card">
          <div id="batches-list"></div>
        </div>
      </div>
      
      <div id="tab-mapping" class="tab-content">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Account Mapping Rules</h3>
            <button class="btn btn-sm btn-primary" id="btn-add-mapping">Add Rule</button>
          </div>
          <div id="mapping-rules"></div>
        </div>
      </div>
    `;
  }

  static renderFilesList(files) {
    if (files.length === 0) {
      return `
        <div class="empty-state">
          <p>No importable files found in the legacy-data folder</p>
        </div>
      `;
    }
    
    return `
      <table>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Modified</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${files.map(f => `
            <tr>
              <td>${escapeHtml(f.name)}</td>
              <td><span class="badge">${f.sourceType}</span></td>
              <td>${(f.size / 1024).toFixed(1)} KB</td>
              <td>${formatDate(f.modified)}</td>
              <td class="text-right">
                <button class="btn btn-sm btn-primary" onclick="MigrationPage.importFile('${escapeHtml(f.path)}', '${f.sourceType}')">
                  Import
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  static renderBatchesList(batches) {
    if (batches.length === 0) {
      return `
        <div class="empty-state">
          <p>No import batches yet</p>
        </div>
      `;
    }
    
    return `
      <table>
        <thead>
          <tr>
            <th>Batch ID</th>
            <th>Source File</th>
            <th>Type</th>
            <th>Records</th>
            <th>Status</th>
            <th>Imported</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${batches.map(b => this.renderBatchRow(b)).join('')}
        </tbody>
      </table>
    `;
  }

  static renderBatchRow(batch) {
    return `
      <tr>
        <td>#${batch.batch_id}</td>
        <td>${escapeHtml(batch.source_file)}</td>
        <td><span class="badge">${batch.source_type}</span></td>
        <td>${batch.total_records} (${batch.processed_records} processed, ${batch.failed_records} failed)</td>
        <td><span class="badge ${getStatusBadgeClass(batch.status)}">${batch.status}</span></td>
        <td>${formatDate(batch.imported_at)}</td>
        <td class="text-right">
          <div class="action-buttons">
            <button class="btn btn-sm btn-secondary" onclick="MigrationPage.viewBatch(${batch.batch_id})">
              View
            </button>
            ${this.renderBatchActions(batch)}
          </div>
        </td>
      </tr>
    `;
  }

  static renderBatchActions(batch) {
    if (batch.status === 'pending') {
      return `<button class="btn btn-sm btn-primary" onclick="MigrationPage.processBatch(${batch.batch_id}, 'normalize')">Normalize</button>`;
    }
    if (batch.status === 'normalized') {
      return `<button class="btn btn-sm btn-primary" onclick="MigrationPage.processBatch(${batch.batch_id}, 'validate')">Validate</button>`;
    }
    if (batch.status === 'validated') {
      return `<button class="btn btn-sm btn-success" onclick="MigrationPage.processBatch(${batch.batch_id}, 'post')">Post Vouchers</button>`;
    }
    return '';
  }

  static renderMappingRules(rules) {
    if (rules.length === 0) {
      return `
        <div class="empty-state">
          <p>No mapping rules defined. Add rules to automatically map legacy account names to your chart of accounts.</p>
        </div>
      `;
    }
    
    return `
      <table>
        <thead>
          <tr>
            <th>Legacy Text Pattern</th>
            <th>Maps To Account</th>
            <th>Priority</th>
            <th>Auto Apply</th>
          </tr>
        </thead>
        <tbody>
          ${rules.map(r => `
            <tr>
              <td><code>${escapeHtml(r.legacy_text_pattern)}</code></td>
              <td>${escapeHtml(r.account_name)}</td>
              <td>${r.priority}</td>
              <td>${r.auto_apply ? '<span class="badge badge-success">Yes</span>' : '<span class="badge">No</span>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  static renderMappingForm(accounts) {
    const accountOptions = accounts
      .filter(a => a.is_active)
      .map(a => `<option value="${a.account_id}">${a.account_code ? `${a.account_code} - ` : ''}${a.account_name}</option>`)
      .join('');
    
    return `
      <form id="mapping-form">
        <div class="form-group">
          <label class="form-label required">Legacy Text Pattern</label>
          <input type="text" class="form-input" id="mapping-pattern" required
                 placeholder="e.g., cash, bank, rent">
          <div class="form-hint">Text to match in legacy data (case-insensitive)</div>
        </div>
        
        <div class="form-group">
          <label class="form-label required">Map To Account</label>
          <select class="form-select" id="mapping-account" required>
            <option value="">Select Account</option>
            ${accountOptions}
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Priority</label>
            <input type="number" class="form-input" id="mapping-priority" value="0">
            <div class="form-hint">Higher priority rules are checked first</div>
          </div>
          <div class="form-group">
            <label class="form-label">Auto Apply</label>
            <select class="form-select" id="mapping-auto">
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
        </div>
        
        <div class="modal-footer" style="margin-top: 20px; padding: 0; border: none;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Rule</button>
        </div>
      </form>
    `;
  }
}
