/**
 * Utility functions for the accounting app
 */

// Format currency without symbol (no decimals)
function formatCurrency(amount, showSign = false) {
  const num = parseFloat(amount) || 0;
  const rounded = Math.round(Math.abs(num));
  const formatted = rounded.toLocaleString('en-US');
  
  if (showSign && num !== 0) {
    return num >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format date for input fields
function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Get first day of current month
function getFirstDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

// Get last day of current month
function getLastDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

// Get first day of financial year (April 1st)
function getFinancialYearStart() {
  const today = new Date();
  const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-04-01`;
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Deep clone object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
function isEmpty(obj) {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

// Validate required fields
function validateRequired(data, fields) {
  const errors = {};
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = 'This field is required';
    }
  }
  return errors;
}

// Parse amount string to number
function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
}

// Account type helpers
const ACCOUNT_TYPES = ['Asset', 'Liability', 'Income', 'Expense', 'Equity'];

const VOUCHER_TYPES = ['Debit', 'Credit', 'Journal'];

function isDebitNormalAccount(type) {
  return ['Asset', 'Expense'].includes(type);
}

function getAccountTypeColor(type) {
  const colors = {
    'Asset': '#0366d6',
    'Liability': '#6f42c1',
    'Income': '#28a745',
    'Expense': '#dc3545',
    'Equity': '#fd7e14'
  };
  return colors[type] || '#6a737d';
}

function getVoucherTypeBadgeClass(type) {
  const classes = {
    'Debit': 'badge-danger',
    'Credit': 'badge-success',
    'Journal': 'badge-primary'
  };
  return classes[type] || '';
}

// Status badge helpers
function getStatusBadgeClass(status) {
  const classes = {
    'pending': 'badge-warning',
    'processing': 'badge-primary',
    'normalized': 'badge-primary',
    'validated': 'badge-success',
    'posted': 'badge-success',
    'failed': 'badge-danger',
    'raw': 'badge-warning',
    'mapped': 'badge-primary',
    'skipped': 'badge-warning'
  };
  return classes[status] || '';
}

// Export to PDF using pdfmake (loaded in main process)
async function exportToPDF(content, filename) {
  // This would be implemented with pdfmake in the main process
  // For now, we'll use the print functionality
  window.print();
}

// Download data as file
function downloadFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Sort array of objects by key
function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Group array by key
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}
