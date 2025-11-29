/**
 * useAccounts Hook
 * Provides account data and operations
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAccounts,
  getCashAccount,
  getAccountsWithBalances,
  createAccount,
} from "@/services/accounts.service";
import type { Account, AccountWithBalance } from "@/types";

interface UseAccountsOptions {
  includeHeaders?: boolean;
  type?: string;
  withBalances?: boolean;
}

interface UseAccountsReturn {
  accounts: Account[] | AccountWithBalance[];
  cashAccount: Account | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addAccount: (
    account: Omit<Account, "id" | "created_at" | "updated_at">
  ) => Promise<Account>;
}

export function useAccounts(options?: UseAccountsOptions): UseAccountsReturn {
  const [accounts, setAccounts] = useState<Account[] | AccountWithBalance[]>(
    []
  );
  const [cashAccount, setCashAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [accountsData, cash] = await Promise.all([
        options?.withBalances
          ? getAccountsWithBalances()
          : getAccounts({
              includeHeaders: options?.includeHeaders,
              type: options?.type,
            }),
        getCashAccount(),
      ]);

      setAccounts(accountsData);
      setCashAccount(cash);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch accounts";
      setError(message);
      console.error("useAccounts error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options?.includeHeaders, options?.type, options?.withBalances]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAccount = useCallback(
    async (accountData: Omit<Account, "id" | "created_at" | "updated_at">) => {
      const newAccount = await createAccount(
        accountData as Parameters<typeof createAccount>[0]
      );
      await fetchData();
      return newAccount;
    },
    [fetchData]
  );

  return {
    accounts,
    cashAccount,
    isLoading,
    error,
    refetch: fetchData,
    addAccount,
  };
}
