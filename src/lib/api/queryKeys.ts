/**
 * Query Keys Registry
 * Centralized query key management for caching and invalidation
 */

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    monthly: (months: number) =>
      [...queryKeys.dashboard.all, "monthly", months] as const,
    recent: (limit: number) =>
      [...queryKeys.dashboard.all, "recent", limit] as const,
  },

  // Accounts
  accounts: {
    all: ["accounts"] as const,
    list: (filters?: { type?: string; isHeader?: boolean }) =>
      [...queryKeys.accounts.all, "list", filters] as const,
    tree: () => [...queryKeys.accounts.all, "tree"] as const,
    detail: (id: string) => [...queryKeys.accounts.all, "detail", id] as const,
    ledger: (id: string, dateRange?: { from: string; to: string }) =>
      [...queryKeys.accounts.all, "ledger", id, dateRange] as const,
  },

  // Transactions/Vouchers
  transactions: {
    all: ["transactions"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.transactions.all, "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.all, "detail", id] as const,
    byType: (type: number) =>
      [...queryKeys.transactions.all, "type", type] as const,
  },

  // Reports
  reports: {
    all: ["reports"] as const,
    trialBalance: (dateRange?: { from: string; to: string }) =>
      [...queryKeys.reports.all, "trial-balance", dateRange] as const,
    ledger: (accountId: string, dateRange?: { from: string; to: string }) =>
      [...queryKeys.reports.all, "ledger", accountId, dateRange] as const,
    incomeStatement: (dateRange?: { from: string; to: string }) =>
      [...queryKeys.reports.all, "income-statement", dateRange] as const,
    balanceSheet: (date?: string) =>
      [...queryKeys.reports.all, "balance-sheet", date] as const,
  },
} as const;

/**
 * Get cache key string from query key array
 */
export function getCacheKey(key: readonly unknown[]): string {
  return key
    .map((k) => (typeof k === "object" ? JSON.stringify(k) : String(k)))
    .join(":");
}
