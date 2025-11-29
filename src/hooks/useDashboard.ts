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
      const transformed: RecentTransaction[] = recent.map(
        (t: Record<string, unknown>) => {
          const vouchers = t.vouchers as {
            voucher_date: string;
            voucher_type: number;
            voucher_no: string;
          };
          const accounts = t.accounts as { account_name: string };
          const debit = parseFloat(String(t.debit_amount)) || 0;
          const credit = parseFloat(String(t.credit_amount)) || 0;

          return {
            id: t.id as string,
            date: vouchers.voucher_date,
            voucherNo: vouchers.voucher_no,
            voucherType: vouchers.voucher_type,
            accountName: accounts.account_name,
            narration: (t.narration as string) || "",
            amount: debit > 0 ? debit : credit,
            isDebit: debit > 0,
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
