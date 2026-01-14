/**
 * Application Constants
 * Centralized configuration values
 */

// Date Formats
export const DATE_FORMAT = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  FULL: 'MMMM DD, YYYY'
};

// Currency
export const CURRENCY = {
  SYMBOL: '',
  DECIMAL_PLACES: 2,
  THOUSAND_SEPARATOR: ',',
  DECIMAL_SEPARATOR: '.'
};

// Voucher Types
export const VOUCHER_TYPE = {
  DEBIT: 'Debit',
  CREDIT: 'Credit',
  JOURNAL: 'Journal'
};

// Account Types
export const ACCOUNT_TYPE = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  INCOME: 'Income',
  EXPENSE: 'Expense',
  EQUITY: 'Equity'
};

// Report Types
export const REPORT_TYPE = {
  TRIAL_BALANCE: 'trial-balance',
  INCOME_STATEMENT: 'income-statement',
  LEDGER: 'ledger',
  VOUCHERS: 'vouchers'
};

// UI Constants
export const UI = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  MODAL_ANIMATION_DURATION: 200,
  SIDEBAR_WIDTH: 280,
  TITLEBAR_HEIGHT: 32
};

// Validation Rules
export const VALIDATION = {
  MIN_ACCOUNT_NAME_LENGTH: 3,
  MAX_ACCOUNT_NAME_LENGTH: 100,
  MIN_VOUCHER_ENTRIES: 2,
  MAX_NARRATION_LENGTH: 500
};

// Print Settings
export const PRINT = {
  PAGE_SIZE: 'A4',
  ORIENTATION: 'portrait',
  MARGIN: '15mm 20mm',
  FONT_SIZE: '9pt',
  COMPANY_NAME: 'Home Sweet Home'
};

// File Paths
export const PATHS = {
  LOGO: '../assets/Logo.png',
  DATABASE: 'app-data/database.db'
};
