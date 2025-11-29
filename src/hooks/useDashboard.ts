/**
 * useDashboard Hook
 * Provides dashboard statistics and data
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, getMonthlyData } from "@/services/reports.service";
import { getRecentTransactions } from "@/services/vouchers.service";
import type { DashboardStats, MonthlyData } from "@/types";

interface RecentTransaction {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: number;
  accountName: string;
  narration: string;
  amount: number;
  isDebit: boolean;
}

interface UseDashboardReturn {
  stats: DashboardStats;
  monthlyData: MonthlyData[];
  recentTransactions: RecentTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const initialStats: DashboardStats = {
  totalAccounts: 0,
  totalTransactions: 0,
  thisMonthTransactions: 0,
  totalDebit: 0,
  totalCredit: 0,
  cashBalance: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
};

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsData, monthly, recent] = await Promise.all([
        getDashboardStats(),
        getMonthlyData(6),
        getRecentTransactions(10),
      ]);

      setStats(statsData);
      setMonthlyData(monthly);

      // Transform recent transactions
      // Data structure: transactions table with transaction_details as child and voucher_types
      const transformed: RecentTransaction[] = recent.map(
        (t: Record<string, unknown>) => {
          const details = (t.transaction_details || []) as Array<{
            debit_amount: unknown;
            credit_amount: unknown;
            account_id: string;
            accounts: { account_name: string } | null;
          }>;

          const voucherType = t.voucher_types as {
            code: number;
            title: string;
          } | null;

          // Sum up debits and credits from details
          const totalDebit = details.reduce(
            (sum, d) => sum + (parseFloat(String(d.debit_amount)) || 0),
            0
          );
          const totalCredit = details.reduce(
            (sum, d) => sum + (parseFloat(String(d.credit_amount)) || 0),
            0
          );

          // Get first account name from details
          const firstAccount = details[0]?.accounts?.account_name || "Multiple";

          return {
            id: t.id as string,
            date: t.transaction_date as string,
            voucherNo: (t.voucher_number as string) || "-",
            voucherType: voucherType?.code || 0,
            accountName: firstAccount,
            narration: (t.narration as string) || "",
            amount: Math.max(totalDebit, totalCredit),
            isDebit: totalDebit > totalCredit,
          };
        }
      );

      setRecentTransactions(transformed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch dashboard data";
      setError(message);
      console.error("useDashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    monthlyData,
    recentTransactions,
    isLoading,
    error,
    refetch: fetchData,
  };
}
