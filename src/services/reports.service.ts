/**
 * Reports Service
 * Handles report generation and data aggregation
 */

import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { TrialBalanceEntry, MonthlyData, LedgerEntry } from "@/types";

const supabase = createClient();

/**
 * Get trial balance data
 */
export async function getTrialBalance(): Promise<TrialBalanceEntry[]> {
  // Get all non-header accounts
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, account_code, account_name, account_type")
    .eq("is_header", false)
    .order("account_code");

  if (accountsError) {
    console.error("Error fetching accounts:", accountsError);
    return [];
  }

  // Get all transaction totals grouped by account
  const { data: totals, error: totalsError } = await supabase
    .from("transaction_details")
    .select("account_id, debit_amount, credit_amount");

  if (totalsError) {
    console.error("Error fetching totals:", totalsError);
    return [];
  }

  // Aggregate totals by account
  const balances: Record<string, { debit: number; credit: number }> = {};
  totals?.forEach((t) => {
    if (!balances[t.account_id]) {
      balances[t.account_id] = { debit: 0, credit: 0 };
    }
    balances[t.account_id].debit += parseFloat(String(t.debit_amount)) || 0;
    balances[t.account_id].credit += parseFloat(String(t.credit_amount)) || 0;
  });

  // Build trial balance entries
  return (accounts || [])
    .map((account) => {
      const balance = balances[account.id] || { debit: 0, credit: 0 };
      return {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        debit: balance.debit,
        credit: balance.credit,
        balance: balance.debit - balance.credit,
      };
    })
    .filter((entry) => entry.debit !== 0 || entry.credit !== 0);
}

/**
 * Get monthly income/expense data for charts
 */
export async function getMonthlyData(
  months: number = 6
): Promise<MonthlyData[]> {
  const result: MonthlyData[] = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");

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
        income += parseFloat(String(d.credit_amount)) || 0;
      } else if (acctType === "expense") {
        expense += parseFloat(String(d.debit_amount)) || 0;
      }
    });

    result.push({
      month: format(monthDate, "MMM yyyy"),
      monthShort: format(monthDate, "MMM"),
      income,
      expense,
    });
  }

  return result;
}

/**
 * Get account ledger entries
 */
export async function getAccountLedger(
  accountId: string,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<LedgerEntry[]> {
  let query = supabase
    .from("transaction_details")
    .select(
      `
      id,
      debit_amount,
      credit_amount,
      narration,
      transactions!inner (
        id,
        transaction_date,
        vouchers!inner (
          voucher_no,
          voucher_type,
          narration
        )
      )
    `
    )
    .eq("account_id", accountId)
    .order("transactions(transaction_date)", { ascending: true });

  if (options?.startDate) {
    query = query.gte("transactions.transaction_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("transactions.transaction_date", options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching ledger:", error);
    return [];
  }

  // Calculate running balance
  let runningBalance = 0;

  return (data || []).map((entry: Record<string, unknown>) => {
    const debit = parseFloat(String(entry.debit_amount)) || 0;
    const credit = parseFloat(String(entry.credit_amount)) || 0;
    runningBalance += debit - credit;

    const transactions = entry.transactions as {
      transaction_date: string;
      vouchers: { voucher_no: string; voucher_type: number; narration: string };
    };

    return {
      id: entry.id as string,
      date: transactions.transaction_date,
      voucherNo: transactions.vouchers.voucher_no,
      voucherType: transactions.vouchers.voucher_type,
      narration: (entry.narration as string) || transactions.vouchers.narration,
      debit,
      credit,
      balance: runningBalance,
    };
  });
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

  // Get counts
  const [accountsResult, transactionsResult, monthTransactionsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("is_header", false),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd),
    ]);

  // Get totals
  const { data: totals } = await supabase
    .from("transaction_details")
    .select("debit_amount, credit_amount");

  let totalDebit = 0;
  let totalCredit = 0;
  totals?.forEach((t) => {
    totalDebit += parseFloat(String(t.debit_amount)) || 0;
    totalCredit += parseFloat(String(t.credit_amount)) || 0;
  });

  // Get cash balance
  const { data: cashAccounts } = await supabase
    .from("accounts")
    .select("id")
    .or("account_name.ilike.%cash%,account_code.like.1%")
    .eq("is_header", false)
    .limit(5);

  let cashBalance = 0;
  if (cashAccounts && cashAccounts.length > 0) {
    const cashIds = cashAccounts.map((c) => c.id);
    const { data: cashTotals } = await supabase
      .from("transaction_details")
      .select("debit_amount, credit_amount")
      .in("account_id", cashIds);

    cashTotals?.forEach((t) => {
      cashBalance +=
        (parseFloat(String(t.debit_amount)) || 0) -
        (parseFloat(String(t.credit_amount)) || 0);
    });
  }

  // Get this month's income/expense
  const { data: monthDetails } = await supabase
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

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  monthDetails?.forEach((d: Record<string, unknown>) => {
    const accounts = d.accounts as
      | { account_type: string }
      | { account_type: string }[];
    const acctType = Array.isArray(accounts)
      ? accounts[0]?.account_type
      : accounts?.account_type;
    if (acctType === "income") {
      monthlyIncome += parseFloat(String(d.credit_amount)) || 0;
    } else if (acctType === "expense") {
      monthlyExpense += parseFloat(String(d.debit_amount)) || 0;
    }
  });

  return {
    totalAccounts: accountsResult.count || 0,
    totalTransactions: transactionsResult.count || 0,
    thisMonthTransactions: monthTransactionsResult.count || 0,
    totalDebit,
    totalCredit,
    cashBalance,
    monthlyIncome,
    monthlyExpense,
  };
}
