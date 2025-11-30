/**
 * Dashboard Service
 * Handles dashboard statistics and chart data
 */

import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cache, CACHE_TTL, CACHE_KEYS, withCache } from "@/lib/cache";
import { parseAmount } from "@/lib/api/utils";
import type { DashboardStats, MonthlyData } from "@/types";

const supabase = createClient();

/**
 * Get dashboard statistics with caching
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return withCache(
    CACHE_KEYS.DASHBOARD_STATS,
    async () => {
      const today = new Date();
      const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

      // Parallel fetch for performance
      const [
        accountsResult,
        transactionsResult,
        monthTransactionsResult,
        totalsResult,
        cashResult,
        monthDetailsResult,
      ] = await Promise.all([
        // Count accounts
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("is_header", false),
        // Count all transactions
        supabase
          .from("transactions")
          .select("*", { count: "exact", head: true }),
        // Count this month's transactions
        supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .gte("transaction_date", monthStart)
          .lte("transaction_date", monthEnd),
        // Get all totals
        supabase
          .from("transaction_details")
          .select("debit_amount, credit_amount"),
        // Get cash accounts
        getCashBalance(),
        // Get monthly income/expense
        getMonthlyIncomeExpense(monthStart, monthEnd),
      ]);

      // Calculate totals
      let totalDebit = 0;
      let totalCredit = 0;
      totalsResult.data?.forEach((t) => {
        totalDebit += parseAmount(t.debit_amount);
        totalCredit += parseAmount(t.credit_amount);
      });

      return {
        totalAccounts: accountsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        thisMonthTransactions: monthTransactionsResult.count || 0,
        totalDebit,
        totalCredit,
        cashBalance: cashResult,
        monthlyIncome: monthDetailsResult.income,
        monthlyExpense: monthDetailsResult.expense,
      };
    },
    { ttl: CACHE_TTL.DASHBOARD }
  );
}

/**
 * Get cash balance from cash accounts
 */
async function getCashBalance(): Promise<number> {
  // Get cash account IDs
  const { data: cashAccounts } = await supabase
    .from("accounts")
    .select("id")
    .or("account_name.ilike.%cash%,account_code.like.1%")
    .eq("is_header", false)
    .limit(5);

  if (!cashAccounts?.length) return 0;

  const cashIds = cashAccounts.map((c) => c.id);
  const { data: cashTotals } = await supabase
    .from("transaction_details")
    .select("debit_amount, credit_amount")
    .in("account_id", cashIds);

  let balance = 0;
  cashTotals?.forEach((t) => {
    balance += parseAmount(t.debit_amount) - parseAmount(t.credit_amount);
  });

  return balance;
}

/**
 * Get monthly income and expense
 */
async function getMonthlyIncomeExpense(
  monthStart: string,
  monthEnd: string
): Promise<{ income: number; expense: number }> {
  const { data } = await supabase
    .from("transaction_details")
    .select(
      `
      debit_amount,
      credit_amount,
      accounts!inner(account_type),
      transactions!inner(transaction_date)
    `
    )
    .gte("transactions.transaction_date", monthStart)
    .lte("transactions.transaction_date", monthEnd);

  let income = 0;
  let expense = 0;

  data?.forEach((d: Record<string, unknown>) => {
    const accounts = d.accounts as
      | { account_type: string }
      | { account_type: string }[];
    const acctType = Array.isArray(accounts)
      ? accounts[0]?.account_type
      : accounts?.account_type;

    if (acctType === "income") {
      income += parseAmount(d.credit_amount);
    } else if (acctType === "expense") {
      expense += parseAmount(d.debit_amount);
    }
  });

  return { income, expense };
}

/**
 * Get monthly chart data with caching
 */
export async function getMonthlyChartData(
  months: number = 6
): Promise<MonthlyData[]> {
  const cacheKey = `${CACHE_KEYS.DASHBOARD_MONTHLY}:${months}`;

  return withCache(
    cacheKey,
    async () => {
      const result: MonthlyData[] = [];
      const today = new Date();

      // Fetch all data in parallel
      const promises = Array.from({ length: months }, (_, i) => {
        const monthDate = subMonths(today, months - 1 - i);
        const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

        return fetchMonthData(monthDate, monthStart, monthEnd);
      });

      const monthlyResults = await Promise.all(promises);
      return monthlyResults;
    },
    { ttl: CACHE_TTL.DASHBOARD }
  );
}

/**
 * Fetch data for a single month
 */
async function fetchMonthData(
  monthDate: Date,
  monthStart: string,
  monthEnd: string
): Promise<MonthlyData> {
  // First get income accounts
  const { data: incomeAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("account_type", "income")
    .eq("is_header", false);

  // Get expense accounts
  const { data: expenseAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("account_type", "expense")
    .eq("is_header", false);

  const incomeIds = incomeAccounts?.map((a) => a.id) || [];
  const expenseIds = expenseAccounts?.map((a) => a.id) || [];

  // Fetch transaction details for income
  let income = 0;
  if (incomeIds.length > 0) {
    const { data: incomeData } = await supabase
      .from("transaction_details")
      .select(
        `
        credit_amount,
        transactions!inner(transaction_date)
      `
      )
      .in("account_id", incomeIds)
      .gte("transactions.transaction_date", monthStart)
      .lte("transactions.transaction_date", monthEnd);

    incomeData?.forEach((d) => {
      income += parseAmount(d.credit_amount);
    });
  }

  // Fetch transaction details for expense
  let expense = 0;
  if (expenseIds.length > 0) {
    const { data: expenseData } = await supabase
      .from("transaction_details")
      .select(
        `
        debit_amount,
        transactions!inner(transaction_date)
      `
      )
      .in("account_id", expenseIds)
      .gte("transactions.transaction_date", monthStart)
      .lte("transactions.transaction_date", monthEnd);

    expenseData?.forEach((d) => {
      expense += parseAmount(d.debit_amount);
    });
  }

  return {
    month: format(monthDate, "MMM yyyy"),
    monthShort: format(monthDate, "MMM"),
    income,
    expense,
  };
}

/**
 * Get recent transactions with caching
 */
export async function getRecentTransactions(limit: number = 10) {
  const cacheKey = `${CACHE_KEYS.RECENT_TRANSACTIONS}:${limit}`;

  return withCache(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          transaction_date,
          voucher_number,
          voucher_type_code,
          narration,
          total_amount,
          is_posted,
          transaction_details (
            debit_amount,
            credit_amount,
            accounts (account_name)
          )
        `
        )
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent transactions:", error);
        return [];
      }

      return data || [];
    },
    { ttl: CACHE_TTL.SHORT }
  );
}

/**
 * Invalidate dashboard cache
 * Call this after any transaction changes
 */
export function invalidateDashboardCache(): void {
  cache.invalidatePattern("dashboard:*");
}
