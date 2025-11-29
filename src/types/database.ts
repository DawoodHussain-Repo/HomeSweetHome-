export interface CompanyInfo {
  id: string;
  user_id: string;
  company_name: string;
  company_name_urdu?: string;
  address?: string;
  address_urdu?: string;
  phone_numbers?: string;
  fax_number?: string;
  email?: string;
  title_short?: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherType {
  id: string;
  user_id: string;
  code: number;
  title: string;
  title_urdu?: string;
  voucher_category:
    | "opening"
    | "receipt"
    | "payment"
    | "journal"
    | "purchase"
    | "sale"
    | "stock";
  affects_cash: boolean;
  affects_inventory: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  parent_id?: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  account_level: number;
  is_header: boolean;
  is_active: boolean;
  opening_balance: number;
  balance_type?: "debit" | "credit";
  created_at: string;
  updated_at: string;
  // Computed fields
  children?: Account[];
  current_balance?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  legacy_tr_no?: number;
  transaction_date: string;
  voucher_type_code: number;
  voucher_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  invoice_number?: string;
  invoice_date?: string;
  narration?: string;
  narration_urdu?: string;
  total_amount: number;
  is_posted: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  voucher_type?: VoucherType;
  details?: TransactionDetail[];
}

export interface TransactionDetail {
  id: string;
  transaction_id: string;
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  line_order: number;
  created_at: string;
  // Relations
  account?: Account;
}

export interface Dictionary {
  id: string;
  user_id?: string;
  english_word: string;
  urdu_word: string;
  created_at: string;
}

export interface PriceList {
  id: string;
  user_id: string;
  effective_date: string;
  remarks?: string;
  aq?: number;
  ar?: number;
  mq?: number;
  mr?: number;
  bq?: number;
  br?: number;
  sq?: number;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  language: "en" | "ur";
  theme: "light" | "dark";
  date_format: string;
  created_at: string;
  updated_at: string;
}

// Form types
export interface TransactionForm {
  transaction_date: string;
  voucher_type_id: string;
  voucher_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  narration?: string;
  details: TransactionDetailForm[];
}

export interface TransactionDetailForm {
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
}

// Report types
export interface TrialBalanceRow {
  id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

export interface LedgerEntry {
  transaction_date: string;
  voucher_number?: string;
  narration?: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
}
