"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "en" | "ur";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.accounts": "Chart of Accounts",
    "nav.vouchers": "Voucher Entry",
    "nav.ledger": "Account Ledger",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.logout": "Logout",

    // Dashboard
    "dashboard.welcome": "Welcome",
    "dashboard.totalAccounts": "Total Accounts",
    "dashboard.totalTransactions": "Total Transactions",
    "dashboard.cashBalance": "Cash Balance",
    "dashboard.recentTransactions": "Recent Transactions",
    "dashboard.quickActions": "Quick Actions",

    // Accounts
    "accounts.title": "Chart of Accounts",
    "accounts.addNew": "Add Account",
    "accounts.code": "Account Code",
    "accounts.name": "Account Name",
    "accounts.type": "Account Type",
    "accounts.balance": "Balance",
    "accounts.asset": "Asset",
    "accounts.liability": "Liability",
    "accounts.equity": "Equity",
    "accounts.income": "Income",
    "accounts.expense": "Expense",

    // Vouchers
    "vouchers.title": "Voucher Entry",
    "vouchers.new": "New Voucher",
    "vouchers.date": "Date",
    "vouchers.type": "Voucher Type",
    "vouchers.narration": "Narration",
    "vouchers.debit": "Debit",
    "vouchers.credit": "Credit",
    "vouchers.total": "Total",
    "vouchers.save": "Save Voucher",
    "vouchers.cashReceipt": "Cash Receipt",
    "vouchers.cashPayment": "Cash Payment",
    "vouchers.bankReceipt": "Bank Receipt",
    "vouchers.bankPayment": "Bank Payment",
    "vouchers.journal": "Journal Voucher",

    // Reports
    "reports.title": "Reports",
    "reports.trialBalance": "Trial Balance",
    "reports.ledger": "Account Ledger",
    "reports.profitLoss": "Profit & Loss",
    "reports.balanceSheet": "Balance Sheet",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.noData": "No data available",
    "common.actions": "Actions",
  },
  ur: {
    // Navigation
    "nav.dashboard": "ڈیش بورڈ",
    "nav.accounts": "کھاتوں کی فہرست",
    "nav.vouchers": "ووچر اندراج",
    "nav.ledger": "کھاتہ لیجر",
    "nav.reports": "رپورٹس",
    "nav.settings": "ترتیبات",
    "nav.logout": "لاگ آؤٹ",

    // Dashboard
    "dashboard.welcome": "خوش آمدید",
    "dashboard.totalAccounts": "کل کھاتے",
    "dashboard.totalTransactions": "کل لین دین",
    "dashboard.cashBalance": "نقد بیلنس",
    "dashboard.recentTransactions": "حالیہ لین دین",
    "dashboard.quickActions": "فوری اقدامات",

    // Accounts
    "accounts.title": "کھاتوں کی فہرست",
    "accounts.addNew": "نیا کھاتہ",
    "accounts.code": "کھاتہ کوڈ",
    "accounts.name": "کھاتہ نام",
    "accounts.type": "کھاتہ قسم",
    "accounts.balance": "بیلنس",
    "accounts.asset": "اثاثے",
    "accounts.liability": "واجبات",
    "accounts.equity": "ایکویٹی",
    "accounts.income": "آمدنی",
    "accounts.expense": "اخراجات",

    // Vouchers
    "vouchers.title": "ووچر اندراج",
    "vouchers.new": "نیا ووچر",
    "vouchers.date": "تاریخ",
    "vouchers.type": "ووچر کی قسم",
    "vouchers.narration": "تفصیل",
    "vouchers.debit": "ڈیبٹ",
    "vouchers.credit": "کریڈٹ",
    "vouchers.total": "کل",
    "vouchers.save": "ووچر محفوظ کریں",
    "vouchers.cashReceipt": "نقد وصولی",
    "vouchers.cashPayment": "نقد ادائیگی",
    "vouchers.bankReceipt": "بینک وصولی",
    "vouchers.bankPayment": "بینک ادائیگی",
    "vouchers.journal": "جنرل ووچر",

    // Reports
    "reports.title": "رپورٹس",
    "reports.trialBalance": "ٹرائل بیلنس",
    "reports.ledger": "کھاتہ لیجر",
    "reports.profitLoss": "نفع و نقصان",
    "reports.balanceSheet": "بیلنس شیٹ",

    // Common
    "common.save": "محفوظ کریں",
    "common.cancel": "منسوخ",
    "common.delete": "حذف کریں",
    "common.edit": "ترمیم",
    "common.search": "تلاش",
    "common.loading": "لوڈ ہو رہا ہے...",
    "common.noData": "کوئی ڈیٹا دستیاب نہیں",
    "common.actions": "اقدامات",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "en" || saved === "ur")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ur";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className={isRTL ? "font-urdu" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
