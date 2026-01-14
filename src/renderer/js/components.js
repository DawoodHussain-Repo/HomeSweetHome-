/**
 * Reusable UI Components
 */

// Toast Notifications
const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
  },
  
  show(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close">&times;</button>
    `;
    
    const close = () => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    };
    
    toast.querySelector('.toast-close').addEventListener('click', close);
    this.container.appendChild(toast);
    
    if (duration > 0) setTimeout(close, duration);
    return toast;
  },
  
  success(msg) { return this.show(msg, 'success'); },
  error(msg) { return this.show(msg, 'error', 6000); },
  warning(msg) { return this.show(msg, 'warning', 5000); }
};

// Modal System
const Modal = {
  container: null,
  
  init() {
    this.container = document.getElementById('modal-container');
    this.container.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
    this.container.querySelector('.modal-close').addEventListener('click', () => this.close());
  },
  
  open(title, content, options = {}) {
    const modal = this.container.querySelector('.modal');
    modal.className = `modal ${options.size ? `modal-${options.size}` : ''}`;
    
    this.container.querySelector('.modal-title').textContent = title;
    this.container.querySelector('.modal-body').innerHTML = content;
    
    this.container.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    if (options.onOpen) options.onOpen(this.container.querySelector('.modal-body'));
  },
  
  close() {
    this.container.classList.add('hidden');
    document.body.style.overflow = '';
  },
  
  confirm(message, onConfirm) {
    this.open('Confirm', `
      <p style="margin-bottom: 20px;">${escapeHtml(message)}</p>
      <div class="modal-footer" style="padding: 0; border: none;">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-confirm">Confirm</button>
      </div>
    `);
    
    document.getElementById('modal-cancel').addEventListener('click', () => this.close());
    document.getElementById('modal-confirm').addEventListener('click', () => {
      this.close();
      onConfirm();
    });
  }
};



// Data Table
class DataTable {
  constructor(container, options = {}) {
    this.container = container;
    this.columns = options.columns || [];
    this.data = options.data || [];
    this.onRowClick = options.onRowClick;
    this.emptyMessage = options.emptyMessage || 'No data';
    this.render();
  }
  
  render() {
    if (!this.data.length) {
      this.container.innerHTML = `<div class="empty-state"><h3>${this.emptyMessage}</h3></div>`;
      return;
    }
    
    const header = this.columns.map(c => 
      `<th class="${c.align === 'right' ? 'text-right' : ''}">${escapeHtml(c.label)}</th>`
    ).join('');
    
    const rows = this.data.map((row, i) => {
      const cells = this.columns.map(c => {
        let val = row[c.key];
        val = c.render ? c.render(val, row, i) : escapeHtml(val);
        return `<td class="${c.align === 'right' ? 'text-right' : ''}">${val}</td>`;
      }).join('');
      return `<tr data-index="${i}">${cells}</tr>`;
    }).join('');
    
    this.container.innerHTML = `
      <div class="table-container">
        <table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
      </div>
    `;
    
    if (this.onRowClick) {
      this.container.querySelectorAll('tbody tr').forEach(tr => {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => this.onRowClick(this.data[parseInt(tr.dataset.index)]));
      });
    }
  }
  
  setData(data) { this.data = data; this.render(); }
}

// Loading Overlay
function showLoading() {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  document.getElementById('loading-overlay')?.remove();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  Modal.init();
});
