/**
 * Application Type Definitions
 * Centralized TypeScript types for the entire application
 */

// =============================================================================
// Re-export database types
// =============================================================================

export * from "./database";

// =============================================================================
// Authentication Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  userId: string;
  email: string;
  name?: string;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name?: string;
}

// =============================================================================
// Account Types (Extended)
// =============================================================================

export interface AccountWithBalance {
  id: string;
  user_id?: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  parent_id?: string | null;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  account_level?: number;
  is_header: boolean;
  is_active?: boolean;
  opening_balance?: number;
  balance_type?: "debit" | "credit";
  created_at?: string;
  updated_at?: string;
  // Computed fields
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

// =============================================================================
// Voucher Types
// =============================================================================

export interface Voucher {
  id: string;
  voucher_no: string;
  voucher_date: string;
  voucher_type: number;
  narration?: string | null;
  total_amount: number;
  status: "draft" | "posted" | "void";
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface VoucherWithTransactions extends Voucher {
  transactions: TransactionWithAccount[];
}

export interface TransactionWithAccount {
  id: string;
  voucher_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string | null;
  accounts?: {
    id: string;
    account_code: string;
    account_name: string;
    account_type: string;
  };
}

export interface VoucherFormData {
  voucherDate: string;
  narration: string;
  lines: VoucherLine[];
}

export interface VoucherLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

// =============================================================================
// Report Types
// =============================================================================

export interface TrialBalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface MonthlyData {
  month: string;
  monthShort: string;
  income: number;
  expense: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: number;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface DashboardStats {
  totalAccounts: number;
  totalTransactions: number;
  thisMonthTransactions: number;
  totalDebit: number;
  totalCredit: number;
  cashBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

// =============================================================================
// UI Types
// =============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface ToastMessage {
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
