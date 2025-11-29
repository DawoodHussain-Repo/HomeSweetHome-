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
    .from("transactions")
    .select("voucher_number")
    .like("voucher_number", pattern)
    .order("voucher_number", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].voucher_number) {
    const lastNo = data[0].voucher_number;
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
}): Promise<Transaction> {
  const voucherNo = await getNextVoucherNumber(
    params.voucherType,
    new Date(params.voucherDate)
  );

  // Get voucher_type_id from voucher_types table
  const { data: voucherTypeData, error: vtError } = await supabase
    .from("voucher_types")
    .select("id")
    .eq("code", params.voucherType)
    .single();

  if (vtError || !voucherTypeData) {
    console.error("Error finding voucher type:", vtError);
    throw new Error("Voucher type not found");
  }

  // Create transaction (voucher header)
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: params.createdBy,
      transaction_date: params.voucherDate,
      voucher_type_id: voucherTypeData.id,
      voucher_number: voucherNo,
      narration: params.narration || null,
      total_amount: params.totalAmount,
      is_posted: true,
    })
    .select()
    .single();

  if (txError) {
    console.error("Error creating transaction:", txError);
    throw new Error(txError.message || "Failed to create transaction");
  }

  // Create transaction details
  const detailRows = params.transactions.map((t, index) => ({
    transaction_id: transaction.id,
    account_id: t.accountId,
    debit_amount: t.debitAmount,
    credit_amount: t.creditAmount,
    description: t.narration || params.narration || null,
    line_order: index,
  }));

  const { error: detailsError } = await supabase
    .from("transaction_details")
    .insert(detailRows);

  if (detailsError) {
    // Rollback transaction if details fail
    await supabase.from("transactions").delete().eq("id", transaction.id);
    console.error("Error creating transaction details:", detailsError);
    throw new Error(
      detailsError.message || "Failed to create transaction details"
    );
  }

  return transaction;
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
}): Promise<{ vouchers: Transaction[]; total: number }> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 25;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("transactions")
    .select("*, voucher_types(code, title)", { count: "exact" })
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.startDate) {
    query = query.gte("transaction_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("transaction_date", options.endDate);
  }

  if (options?.search) {
    query = query.or(
      `voucher_number.ilike.%${options.search}%,narration.ilike.%${options.search}%`
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
  transactionId: string
): Promise<VoucherWithTransactions | null> {
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*, voucher_types(code, title)")
    .eq("id", transactionId)
    .single();

  if (txError || !transaction) {
    console.error("Error fetching transaction:", txError);
    return null;
  }

  const { data: details, error: detailsError } = await supabase
    .from("transaction_details")
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
    .eq("transaction_id", transactionId)
    .order("line_order", { ascending: true });

  if (detailsError) {
    console.error("Error fetching transaction details:", detailsError);
    return null;
  }

  return {
    ...transaction,
    transactions: details || [],
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
      transaction_date,
      voucher_number,
      narration,
      total_amount,
      voucher_type_id,
      transaction_details (
        debit_amount,
        credit_amount,
        account_id,
        accounts (
          account_name
        )
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

  // Fetch voucher types separately to avoid join issues
  if (data && data.length > 0) {
    const voucherTypeIds = [...new Set(data.map((t) => t.voucher_type_id))];
    const { data: voucherTypes } = await supabase
      .from("voucher_types")
      .select("id, code, title")
      .in("id", voucherTypeIds);

    const vtMap = new Map(voucherTypes?.map((vt) => [vt.id, vt]) || []);

    return data.map((t) => ({
      ...t,
      voucher_types: vtMap.get(t.voucher_type_id) || null,
    }));
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
