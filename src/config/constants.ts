/**
 * Application Constants
 * Centralized configuration for consistent behavior across the application
 */

// =============================================================================
// Application Metadata
// =============================================================================

export const APP_CONFIG = {
  name: "Hisaab Kitaab",
  nameUrdu: "حساب کتاب",
  tagline: "Home Sweet Home Accounting System",
  version: "1.0.0",
  locale: {
    default: "en" as const,
    supported: ["en", "ur"] as const,
  },
} as const;

// =============================================================================
// Authentication
// =============================================================================

export const AUTH_CONFIG = {
  storageKey: "hisaab_auth",
  userStorageKey: "user",
  sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  routes: {
    login: "/login",
    register: "/register",
    dashboard: "/dashboard",
    home: "/",
  },
} as const;

// =============================================================================
// Voucher Types
// =============================================================================

export const VOUCHER_TYPES = {
  CASH_RECEIPT: {
    code: 101,
    key: "receipt",
    label: "Cash Receipt",
    labelUrdu: "کیش رسید",
    prefix: "R",
    description: "Money received into Cash account",
  },
  CASH_PAYMENT: {
    code: 102,
    key: "payment",
    label: "Cash Payment",
    labelUrdu: "کیش ادائیگی",
    prefix: "P",
    description: "Money paid from Cash account",
  },
  JOURNAL: {
    code: 201,
    key: "journal",
    label: "Journal Entry",
    labelUrdu: "جرنل انٹری",
    prefix: "J",
    description: "Transfer between any accounts",
  },
  OPENING: {
    code: 301,
    key: "opening",
    label: "Opening Balance",
    labelUrdu: "ابتدائی بیلنس",
    prefix: "O",
    description: "Initial account balance",
  },
} as const;

export const VOUCHER_TYPE_BY_CODE: Record<
  number,
  (typeof VOUCHER_TYPES)[keyof typeof VOUCHER_TYPES]
> = {
  101: VOUCHER_TYPES.CASH_RECEIPT,
  102: VOUCHER_TYPES.CASH_PAYMENT,
  201: VOUCHER_TYPES.JOURNAL,
  301: VOUCHER_TYPES.OPENING,
};

// =============================================================================
// Account Types
// =============================================================================

export const ACCOUNT_TYPES = {
  ASSET: {
    key: "asset",
    label: "Asset",
    labelUrdu: "اثاثہ",
    color: "blue",
    normalBalance: "debit",
  },
  LIABILITY: {
    key: "liability",
    label: "Liability",
    labelUrdu: "واجبات",
    color: "red",
    normalBalance: "credit",
  },
  EQUITY: {
    key: "equity",
    label: "Equity",
    labelUrdu: "سرمایہ",
    color: "purple",
    normalBalance: "credit",
  },
  INCOME: {
    key: "income",
    label: "Income",
    labelUrdu: "آمدنی",
    color: "green",
    normalBalance: "credit",
  },
  EXPENSE: {
    key: "expense",
    label: "Expense",
    labelUrdu: "اخراجات",
    color: "orange",
    normalBalance: "debit",
  },
} as const;

// =============================================================================
// UI Configuration
// =============================================================================

export const UI_CONFIG = {
  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  },
  table: {
    maxRowsWithoutPagination: 50,
  },
  dateFormats: {
    display: "dd MMM yyyy",
    displayFull: "EEEE, dd MMMM yyyy",
    input: "yyyy-MM-dd",
    monthYear: "MMMM yyyy",
  },
  currency: {
    code: "PKR",
    symbol: "Rs.",
    locale: "en-PK",
    decimals: 2,
  },
  animation: {
    duration: 200,
    easing: "ease-out",
  },
} as const;

// =============================================================================
// API Configuration
// =============================================================================

export const API_CONFIG = {
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 30000,
} as const;

// =============================================================================
// Validation Rules
// =============================================================================

export const VALIDATION = {
  accountCode: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[A-Za-z0-9-]+$/,
  },
  accountName: {
    minLength: 2,
    maxLength: 100,
  },
  narration: {
    maxLength: 500,
  },
  amount: {
    min: 0,
    max: 999999999999.99,
    decimals: 2,
  },
} as const;
