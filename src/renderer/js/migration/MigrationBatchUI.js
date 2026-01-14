/**
 * Migration Batch UI - Batch Details Rendering
 */
export class MigrationBatchUI {
  static renderBatchDetails(batchId, records, auditLog) {
    return `
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab active" onclick="document.getElementById('batch-records').style.display='block';document.getElementById('batch-audit').style.display='none';this.classList.add('active');this.nextElementSibling.classList.remove('active');">Records (${records.length})</button>
        <button class="tab" onclick="document.getElementById('batch-records').style.display='none';document.getElementById('batch-audit').style.display='block';this.classList.add('active');this.previousElementSibling.classList.remove('active');">Audit Log (${auditLog.length})</button>
      </div>
      
      <div id="batch-records">
        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
          ${this.renderRecordsTable(records)}
        </div>
      </div>
      
      <div id="batch-audit" style="display: none;">
        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
          ${this.renderAuditTable(auditLog)}
        </div>
      </div>
    `;
  }

  static renderRecordsTable(records) {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Debit Account</th>
            <th>Credit Account</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td>${r.raw_id}</td>
              <td>${r.detected_date || '-'}</td>
              <td>${r.detected_amount ? formatCurrency(r.detected_amount) : '-'}</td>
              <td>${escapeHtml(r.detected_debit_account || '-')}</td>
              <td>${escapeHtml(r.detected_credit_account || '-')}</td>
              <td>
                <div class="progress" style="width: 60px;">
                  <div class="progress-bar" style="width: ${(r.confidence_score || 0) * 100}%"></div>
                </div>
              </td>
              <td>
                <span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span>
                ${r.validation_errors ? `<br><small style="color: var(--color-danger)">${escapeHtml(r.validation_errors)}</small>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  static renderAuditTable(auditLog) {
    return `
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Details</th>
            <th>Voucher</th>
          </tr>
        </thead>
        <tbody>
          ${auditLog.map(l => `
            <tr>
              <td>${formatDate(l.created_at)}</td>
              <td><span class="badge">${l.action_taken}</span></td>
              <td>${escapeHtml(l.details || '-')}</td>
              <td>${l.final_voucher_id || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}
