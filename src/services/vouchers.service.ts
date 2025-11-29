/**
 * Voucher Service
 * Handles all voucher and transaction database operations
 */

import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { VOUCHER_TYPES, VOUCHER_TYPE_BY_CODE } from "@/config/constants";
import type { Voucher, Transaction, VoucherWithTransactions } from "@/types";

const supabase = createClient();

/**
 * Generate the next voucher number
 */
export async function getNextVoucherNumber(
  voucherTypeCode: number,
  date: Date = new Date()
): Promise<string> {
  const voucherType = VOUCHER_TYPE_BY_CODE[voucherTypeCode];
  if (!voucherType) {
    throw new Error(`Invalid voucher type code: ${voucherTypeCode}`);
  }

  const prefix = voucherType.prefix;
  const yearMonth = format(date, "yyyyMM");
  const pattern = `${prefix}-${yearMonth}-%`;

  const { data } = await supabase
    .from("vouchers")
    .select("voucher_no")
    .eq("voucher_type", voucherTypeCode)
    .like("voucher_no", pattern)
    .order("voucher_no", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastNo = data[0].voucher_no;
    const parts = lastNo.split("-");
    if (parts.length === 3) {
      nextNum = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${yearMonth}-${nextNum.toString().padStart(4, "0")}`;
}

/**
 * Create a voucher with its transactions
 */
export async function createVoucher(params: {
  voucherDate: string;
  voucherType: number;
  narration?: string;
  totalAmount: number;
  createdBy: string;
  transactions: Array<{
    accountId: string;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
  }>;
}): Promise<Voucher> {
  const voucherNo = await getNextVoucherNumber(
    params.voucherType,
    new Date(params.voucherDate)
  );

  // Create voucher
  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .insert({
      voucher_no: voucherNo,
      voucher_date: params.voucherDate,
      voucher_type: params.voucherType,
      narration: params.narration || null,
      total_amount: params.totalAmount,
      status: "posted",
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (voucherError) {
    console.error("Error creating voucher:", voucherError);
    throw new Error(voucherError.message || "Failed to create voucher");
  }

  // Create transactions
  const transactionRows = params.transactions.map((t) => ({
    voucher_id: voucher.id,
    account_id: t.accountId,
    debit_amount: t.debitAmount,
    credit_amount: t.creditAmount,
    narration: t.narration || params.narration || null,
  }));

  const { error: txError } = await supabase
    .from("transactions")
    .insert(transactionRows);

  if (txError) {
    // Rollback voucher if transactions fail
    await supabase.from("vouchers").delete().eq("id", voucher.id);
    console.error("Error creating transactions:", txError);
    throw new Error(txError.message || "Failed to create transactions");
  }

  return voucher;
}

/**
 * Get vouchers with pagination and filters
 */
export async function getVouchers(options?: {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  voucherType?: number;
  search?: string;
}): Promise<{ vouchers: Voucher[]; total: number }> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 25;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("vouchers")
    .select("*", { count: "exact" })
    .order("voucher_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.startDate) {
    query = query.gte("voucher_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("voucher_date", options.endDate);
  }

  if (options?.voucherType) {
    query = query.eq("voucher_type", options.voucherType);
  }

  if (options?.search) {
    query = query.or(
      `voucher_no.ilike.%${options.search}%,narration.ilike.%${options.search}%`
    );
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching vouchers:", error);
    throw new Error("Failed to fetch vouchers");
  }

  return {
    vouchers: data || [],
    total: count || 0,
  };
}

/**
 * Get a single voucher with its transactions
 */
export async function getVoucherWithTransactions(
  voucherId: string
): Promise<VoucherWithTransactions | null> {
  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .select("*")
    .eq("id", voucherId)
    .single();

  if (voucherError || !voucher) {
    console.error("Error fetching voucher:", voucherError);
    return null;
  }

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select(
      `
      *,
      accounts:account_id (
        id,
        account_code,
        account_name,
        account_type
      )
    `
    )
    .eq("voucher_id", voucherId);

  if (txError) {
    console.error("Error fetching transactions:", txError);
    return null;
  }

  return {
    ...voucher,
    transactions: transactions || [],
  };
}

/**
 * Get recent transactions for dashboard
 */
export async function getRecentTransactions(limit: number = 10) {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      debit_amount,
      credit_amount,
      narration,
      vouchers!inner (
        voucher_date,
        voucher_type,
        voucher_no
      ),
      accounts!inner (
        account_name
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent transactions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get transaction count
 */
export async function getTransactionsCount(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<number> {
  let query = supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });

  if (options?.startDate) {
    query = query.gte("transaction_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("transaction_date", options.endDate);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error counting transactions:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get totals for debit and credit
 */
export async function getTransactionTotals(): Promise<{
  totalDebit: number;
  totalCredit: number;
}> {
  const { data, error } = await supabase
    .from("transaction_details")
    .select("debit_amount, credit_amount");

  if (error) {
    console.error("Error fetching totals:", error);
    return { totalDebit: 0, totalCredit: 0 };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  data?.forEach((t) => {
    totalDebit += parseFloat(String(t.debit_amount)) || 0;
    totalCredit += parseFloat(String(t.credit_amount)) || 0;
  });

  return { totalDebit, totalCredit };
}
