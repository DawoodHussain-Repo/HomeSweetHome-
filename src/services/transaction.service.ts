/**
 * Transaction Service
 * Handles CRUD operations for transactions/vouchers
 */

import { createClient } from "@/lib/supabase/client";
import { invalidateDashboardCache } from "./dashboard.service";
import { parseAmount } from "@/lib/api/utils";
import { cache } from "@/lib/cache";

const supabase = createClient();

export interface TransactionLine {
  id?: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  line_order: number;
}

export interface CreateTransactionInput {
  transaction_date: string;
  voucher_type_code: number;
  voucher_number?: string;
  narration?: string;
  total_amount: number;
  user_id: string;
  lines: TransactionLine[];
}

export interface UpdateTransactionInput {
  transaction_date?: string;
  narration?: string;
  lines?: TransactionLine[];
}

/**
 * Get transaction by ID with full details
 */
export async function getTransaction(id: string) {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      transaction_date,
      voucher_type_code,
      voucher_number,
      narration,
      total_amount,
      is_posted,
      legacy_tr_no,
      created_at,
      transaction_details (
        id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        line_order,
        accounts (
          id,
          account_code,
          account_name,
          account_type
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }

  return data;
}

/**
 * Create a new transaction with details
 */
export async function createTransaction(input: CreateTransactionInput) {
  const { lines, ...transactionData } = input;

  // Generate voucher number if not provided
  if (!transactionData.voucher_number) {
    const prefix = getVoucherPrefix(input.voucher_type_code);
    const sequence = await getNextVoucherSequence(input.voucher_type_code);
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    transactionData.voucher_number = `${prefix}-${year}${month}-${sequence
      .toString()
      .padStart(4, "0")}`;
  }

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert(transactionData)
    .select()
    .single();

  if (txError || !transaction) {
    console.error("Error creating transaction:", txError);
    throw new Error(txError?.message || "Failed to create transaction");
  }

  // Create transaction details
  const detailsData = lines.map((line) => ({
    ...line,
    transaction_id: transaction.id,
  }));

  const { error: detailsError } = await supabase
    .from("transaction_details")
    .insert(detailsData);

  if (detailsError) {
    // Rollback transaction
    await supabase.from("transactions").delete().eq("id", transaction.id);
    console.error("Error creating transaction details:", detailsError);
    throw new Error(detailsError.message);
  }

  // Invalidate caches
  invalidateDashboardCache();
  cache.invalidatePattern("reports:*");

  return transaction;
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput
) {
  const { lines, ...transactionData } = input;

  // Update transaction if there are transaction-level changes
  if (Object.keys(transactionData).length > 0) {
    const { error } = await supabase
      .from("transactions")
      .update(transactionData)
      .eq("id", id);

    if (error) {
      console.error("Error updating transaction:", error);
      throw new Error(error.message);
    }
  }

  // Update lines if provided
  if (lines) {
    // Delete existing lines
    await supabase
      .from("transaction_details")
      .delete()
      .eq("transaction_id", id);

    // Insert new lines
    const detailsData = lines.map((line) => ({
      ...line,
      transaction_id: id,
    }));

    const { error: detailsError } = await supabase
      .from("transaction_details")
      .insert(detailsData);

    if (detailsError) {
      console.error("Error updating transaction details:", detailsError);
      throw new Error(detailsError.message);
    }

    // Recalculate total
    const totalDebit = lines.reduce(
      (sum, l) => sum + parseAmount(l.debit_amount),
      0
    );
    await supabase
      .from("transactions")
      .update({ total_amount: totalDebit })
      .eq("id", id);
  }

  // Invalidate caches
  invalidateDashboardCache();
  cache.invalidatePattern("reports:*");

  return getTransaction(id);
}

/**
 * Update a single transaction detail line
 */
export async function updateTransactionLine(
  lineId: string,
  updates: {
    debit_amount?: number;
    credit_amount?: number;
    description?: string;
  }
) {
  const { error } = await supabase
    .from("transaction_details")
    .update(updates)
    .eq("id", lineId);

  if (error) {
    console.error("Error updating transaction line:", error);
    throw new Error(error.message);
  }

  // Get the transaction ID to update total
  const { data: line } = await supabase
    .from("transaction_details")
    .select("transaction_id")
    .eq("id", lineId)
    .single();

  if (line) {
    await recalculateTransactionTotal(line.transaction_id);
  }

  // Invalidate caches
  invalidateDashboardCache();

  return true;
}

/**
 * Recalculate transaction total from its lines
 */
async function recalculateTransactionTotal(transactionId: string) {
  const { data: lines } = await supabase
    .from("transaction_details")
    .select("debit_amount, credit_amount")
    .eq("transaction_id", transactionId);

  if (lines) {
    const totalDebit = lines.reduce(
      (sum, l) => sum + parseAmount(l.debit_amount),
      0
    );

    await supabase
      .from("transactions")
      .update({ total_amount: totalDebit })
      .eq("id", transactionId);
  }
}

/**
 * Delete a transaction and its details
 */
export async function deleteTransaction(id: string) {
  // Delete details first (due to foreign key)
  const { error: detailsError } = await supabase
    .from("transaction_details")
    .delete()
    .eq("transaction_id", id);

  if (detailsError) {
    console.error("Error deleting transaction details:", detailsError);
    throw new Error(detailsError.message);
  }

  // Delete transaction
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting transaction:", error);
    throw new Error(error.message);
  }

  // Invalidate caches
  invalidateDashboardCache();
  cache.invalidatePattern("reports:*");

  return true;
}

/**
 * Get next voucher sequence number
 */
async function getNextVoucherSequence(
  voucherTypeCode: number
): Promise<number> {
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("voucher_type_code", voucherTypeCode);

  return (count || 0) + 1;
}

/**
 * Get voucher prefix from type code
 */
function getVoucherPrefix(code: number): string {
  switch (code) {
    case 101:
      return "CR";
    case 102:
      return "CP";
    case 201:
      return "JV";
    case 301:
      return "OB";
    default:
      return "VOU";
  }
}

/**
 * Validate transaction balance (debits must equal credits)
 */
export function validateTransactionBalance(lines: TransactionLine[]): boolean {
  const totalDebit = lines.reduce(
    (sum, l) => sum + parseAmount(l.debit_amount),
    0
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + parseAmount(l.credit_amount),
    0
  );

  // Allow small floating point differences
  return Math.abs(totalDebit - totalCredit) < 0.01;
}
