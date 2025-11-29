/**
 * Account Service
 * Handles all account-related database operations
 */

import { createClient } from "@/lib/supabase/client";
import type { Account, AccountWithBalance } from "@/types";

const supabase = createClient();

/**
 * Fetch all accounts with optional filters
 */
export async function getAccounts(options?: {
  includeHeaders?: boolean;
  type?: string;
  search?: string;
}): Promise<Account[]> {
  let query = supabase.from("accounts").select("*").order("account_code");

  if (!options?.includeHeaders) {
    query = query.eq("is_header", false);
  }

  if (options?.type) {
    query = query.eq("account_type", options.type);
  }

  if (options?.search) {
    query = query.or(
      `account_name.ilike.%${options.search}%,account_code.ilike.%${options.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching accounts:", error);
    throw new Error("Failed to fetch accounts");
  }

  return data || [];
}

/**
 * Get a single account by ID
 */
export async function getAccountById(id: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching account:", error);
    return null;
  }

  return data;
}

/**
 * Get the Cash account (for cash vouchers)
 */
export async function getCashAccount(): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .or("account_name.ilike.%cash%,account_code.eq.100")
    .eq("is_header", false)
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching cash account:", error);
    return null;
  }

  return data;
}

/**
 * Get accounts with their calculated balances
 */
export async function getAccountsWithBalances(): Promise<AccountWithBalance[]> {
  // First get all accounts
  const accounts = await getAccounts();

  // Then get all transaction details
  const { data: transactions } = await supabase
    .from("transaction_details")
    .select("account_id, debit_amount, credit_amount");

  // Calculate balances
  const balances: Record<string, { debit: number; credit: number }> = {};

  transactions?.forEach((t) => {
    if (!balances[t.account_id]) {
      balances[t.account_id] = { debit: 0, credit: 0 };
    }
    balances[t.account_id].debit += parseFloat(String(t.debit_amount)) || 0;
    balances[t.account_id].credit += parseFloat(String(t.credit_amount)) || 0;
  });

  return accounts.map((account) => {
    const balance = balances[account.id] || { debit: 0, credit: 0 };
    const netBalance = balance.debit - balance.credit;

    return {
      ...account,
      totalDebit: balance.debit,
      totalCredit: balance.credit,
      balance: netBalance,
    };
  });
}

/**
 * Create a new account
 */
export async function createAccount(account: {
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
  parent_id?: string | null;
  is_header?: boolean;
}): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      ...account,
      is_header: account.is_header ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating account:", error);
    throw new Error(error.message || "Failed to create account");
  }

  return data;
}

/**
 * Update an existing account
 */
export async function updateAccount(
  id: string,
  updates: Partial<Account>
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating account:", error);
    throw new Error(error.message || "Failed to update account");
  }

  return data;
}

/**
 * Get count of all non-header accounts
 */
export async function getAccountsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("is_header", false);

  if (error) {
    console.error("Error counting accounts:", error);
    return 0;
  }

  return count || 0;
}
