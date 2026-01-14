/**
 * Formatting Utilities
 * Currency, date, and text formatting functions
 */

import { CURRENCY } from './constants.js';

/**
 * Format currency value (no decimal places)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  
  const rounded = Math.round(Math.abs(amount));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format date short (DD-MMM-YY) for print tables
 */
export function formatDateShort(dateString) {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get first day of current month
 */
export function getFirstDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * Get financial year start (assuming April 1st)
 */
export function getFinancialYearStart() {
  const today = new Date();
  const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-04-01`;
}

/**
 * Parse amount from string
 */
export function parseAmount(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Extract short 5-digit code from voucher number
 * DBV-2026-00001 -> 00001
 * CRV-2024-12345 -> 12345
 */
export function getVoucherShortCode(voucherNumber) {
  if (!voucherNumber) return '—';
  const parts = voucherNumber.split('-');
  return parts.length >= 3 ? parts[2] : voucherNumber;
}

/**
 * Format voucher number for display
 * For reports: shows only 5-digit code
 * For details: shows full number with emphasis
 */
export function formatVoucherNumber(voucherNumber, options = {}) {
  if (!voucherNumber) return '—';
  
  const { shortOnly = true, showFull = false } = options;
  
  // Default behavior: show only short code
  if (shortOnly && !showFull) {
    return getVoucherShortCode(voucherNumber);
  }
  
  // Show full number with emphasis
  const parts = voucherNumber.split('-');
  if (parts.length >= 3) {
    return `<span style="color: #666; font-size: 0.9em;">${parts[0]}-${parts[1]}-</span><strong style="font-size: 1.1em;">${parts[2]}</strong>`;
  }
  return voucherNumber;
}
