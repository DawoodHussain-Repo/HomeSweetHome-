"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { invalidateDashboardCache } from "@/services/dashboard.service";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Trash2,
  Receipt,
  CreditCard,
  FileText,
  BookOpen,
  Loader2,
  Calendar,
  Hash,
  FileType,
  AlignLeft,
  Check,
  AlertCircle,
} from "lucide-react";

interface TransactionDetail {
  id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
  line_order: number;
  accounts:
    | {
        id: string;
        account_code: string;
        account_name: string;
        account_type: string;
      }
    | {
        id: string;
        account_code: string;
        account_name: string;
        account_type: string;
      }[]
    | null;
}

interface Transaction {
  id: string;
  transaction_date: string;
  voucher_type_code: number;
  voucher_number: string;
  narration: string | null;
  total_amount: number;
  is_posted: boolean;
  legacy_tr_no: number | null;
  transaction_details: TransactionDetail[];
}

interface EditableDetail {
  id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

// Helper to extract account from array or object (Supabase returns array for foreign keys)
const getAccount = (accounts: TransactionDetail["accounts"]) => {
  if (!accounts) return null;
  if (Array.isArray(accounts)) return accounts[0] || null;
  return accounts;
};

const VOUCHER_TYPE_INFO: Record<
  number,
  { name: string; icon: React.ElementType; color: string }
> = {
  101: { name: "Cash Receipt", icon: Receipt, color: "text-emerald-400" },
  102: { name: "Cash Payment", icon: CreditCard, color: "text-red-400" },
  201: { name: "Journal Entry", icon: FileText, color: "text-purple-400" },
  301: { name: "Opening Balance", icon: BookOpen, color: "text-blue-400" },
};

export default function VoucherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState("");
  const [editNarration, setEditNarration] = useState("");
  const [editDetails, setEditDetails] = useState<EditableDetail[]>([]);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Fetch transaction data
  const fetchTransaction = useCallback(async () => {
    setLoading(true);

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
      toast.error("Failed to load voucher");
    } else if (data) {
      setTransaction(data as Transaction);
      initializeEditState(data as Transaction);
    }

    setLoading(false);
  }, [id, supabase]);

  // Initialize edit state from transaction
  const initializeEditState = (tx: Transaction) => {
    setEditDate(tx.transaction_date);
    setEditNarration(tx.narration || "");
    setEditDetails(
      tx.transaction_details.map((d) => ({
        id: d.id,
        debit_amount: d.debit_amount || 0,
        credit_amount: d.credit_amount || 0,
        description: d.description || "",
      }))
    );
    setBalanceError(null);
  };

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // Validate balance when edit details change
  useEffect(() => {
    if (editing && editDetails.length > 0) {
      const totalDebit = editDetails.reduce(
        (sum, d) => sum + (d.debit_amount || 0),
        0
      );
      const totalCredit = editDetails.reduce(
        (sum, d) => sum + (d.credit_amount || 0),
        0
      );
      const diff = Math.abs(totalDebit - totalCredit);

      if (diff > 0.01) {
        setBalanceError(
          `Debits (${totalDebit.toFixed(2)}) and Credits (${totalCredit.toFixed(
            2
          )}) don't match. Difference: ${diff.toFixed(2)}`
        );
      } else {
        setBalanceError(null);
      }
    }
  }, [editDetails, editing]);

  // Update detail amount
  const updateDetailAmount = (
    detailId: string,
    field: "debit_amount" | "credit_amount",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setEditDetails((prev) =>
      prev.map((d) => (d.id === detailId ? { ...d, [field]: numValue } : d))
    );
  };

  // Update detail description
  const updateDetailDescription = (detailId: string, value: string) => {
    setEditDetails((prev) =>
      prev.map((d) => (d.id === detailId ? { ...d, description: value } : d))
    );
  };

  const handleSave = async () => {
    if (!transaction) return;

    // Validate balance
    const totalDebit = editDetails.reduce(
      (sum, d) => sum + (d.debit_amount || 0),
      0
    );
    const totalCredit = editDetails.reduce(
      (sum, d) => sum + (d.credit_amount || 0),
      0
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error("Debits and Credits must be equal");
      return;
    }

    setSaving(true);

    try {
      // Update transaction header
      const { error: txError } = await supabase
        .from("transactions")
        .update({
          transaction_date: editDate,
          narration: editNarration || null,
          total_amount: totalDebit,
        })
        .eq("id", id);

      if (txError) throw txError;

      // Update each detail line
      for (const detail of editDetails) {
        const { error: detailError } = await supabase
          .from("transaction_details")
          .update({
            debit_amount: detail.debit_amount,
            credit_amount: detail.credit_amount,
            description: detail.description || null,
          })
          .eq("id", detail.id);

        if (detailError) throw detailError;
      }

      // Invalidate caches
      invalidateDashboardCache();

      toast.success("Voucher updated successfully");
      setEditing(false);
      fetchTransaction();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update voucher");
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this voucher? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      // Delete transaction details first
      const { error: detailsError } = await supabase
        .from("transaction_details")
        .delete()
        .eq("transaction_id", id);

      if (detailsError) throw detailsError;

      // Delete transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Invalidate caches
      invalidateDashboardCache();

      toast.success("Voucher deleted successfully");
      router.push("/dashboard/vouchers");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete voucher");
    }

    setDeleting(false);
  };

  const cancelEdit = () => {
    if (transaction) {
      initializeEditState(transaction);
    }
    setEditing(false);
  };

  const startEditing = () => {
    if (transaction) {
      initializeEditState(transaction);
    }
    setEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="space-y-6">
        <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Voucher Not Found
          </h2>
          <p className="text-muted-foreground mb-4">
            The voucher you're looking for doesn't exist.
          </p>
          <Link
            href="/dashboard/vouchers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vouchers
          </Link>
        </div>
      </div>
    );
  }

  const voucherInfo = VOUCHER_TYPE_INFO[transaction.voucher_type_code] || {
    name: `Voucher ${transaction.voucher_type_code}`,
    icon: FileText,
    color: "text-muted-foreground",
  };
  const VoucherIcon = voucherInfo.icon;

  const totalDebit = transaction.transaction_details.reduce(
    (sum, d) => sum + (d.debit_amount || 0),
    0
  );
  const totalCredit = transaction.transaction_details.reduce(
    (sum, d) => sum + (d.credit_amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/vouchers"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight-custom flex items-center gap-2">
              <VoucherIcon className={`h-6 w-6 ${voucherInfo.color}`} />
              {voucherInfo.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {transaction.voucher_number}
              {transaction.legacy_tr_no &&
                ` (Legacy: ${transaction.legacy_tr_no})`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground rounded-xl transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="px-4 py-2 bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground rounded-xl transition-all flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl transition-all flex items-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Balance Error */}
      {editing && balanceError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {balanceError}
        </div>
      )}

      {/* Voucher Details */}
      <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Voucher Details
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                Date
              </div>
              {editing ? (
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-foreground font-medium">
                  {format(
                    new Date(transaction.transaction_date),
                    "dd MMM yyyy"
                  )}
                </p>
              )}
            </div>

            {/* Voucher Number */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Hash className="h-4 w-4" />
                Voucher No
              </div>
              <p className="text-foreground font-medium font-mono">
                {transaction.voucher_number}
              </p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FileType className="h-4 w-4" />
                Type
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  transaction.voucher_type_code === 101
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : transaction.voucher_type_code === 102
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : transaction.voucher_type_code === 201
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}
              >
                <VoucherIcon className="h-4 w-4" />
                {voucherInfo.name}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Receipt className="h-4 w-4" />
                Amount
              </div>
              <p className="text-foreground font-medium text-xl">
                Rs.{" "}
                {transaction.total_amount.toLocaleString("en-PK", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Narration */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlignLeft className="h-4 w-4" />
              Narration / Description
            </div>
            {editing ? (
              <textarea
                value={editNarration}
                onChange={(e) => setEditNarration(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter description..."
              />
            ) : (
              <p className="text-foreground">
                {transaction.narration || (
                  <span className="text-muted-foreground italic">
                    No description
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Balance Error */}
      {editing && balanceError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {balanceError}
        </div>
      )}

      {/* Transaction Lines */}
      <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Transaction Lines
          </h2>
          {editing && (
            <span className="text-xs text-muted-foreground">
              Click on amounts to edit
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 sm:px-6 py-3 text-muted-foreground text-xs sm:text-sm font-medium">
                  Account
                </th>
                <th className="text-left px-3 sm:px-6 py-3 text-muted-foreground text-xs sm:text-sm font-medium hidden sm:table-cell">
                  Code
                </th>
                <th className="text-left px-3 sm:px-6 py-3 text-muted-foreground text-xs sm:text-sm font-medium hidden md:table-cell">
                  Description
                </th>
                <th className="text-right px-3 sm:px-6 py-3 text-muted-foreground text-xs sm:text-sm font-medium">
                  Debit
                </th>
                <th className="text-right px-3 sm:px-6 py-3 text-muted-foreground text-xs sm:text-sm font-medium">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody>
              {transaction.transaction_details
                .sort((a, b) => a.line_order - b.line_order)
                .map((detail) => {
                  const editDetail = editDetails.find(
                    (ed) => ed.id === detail.id
                  );
                  const account = getAccount(detail.accounts);

                  return (
                    <tr
                      key={detail.id}
                      className="border-b border-border hover:bg-secondary/30"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-foreground font-medium text-xs sm:text-sm">
                        {account?.account_name || "Unknown Account"}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-muted-foreground font-mono text-xs sm:text-sm hidden sm:table-cell">
                        {account?.account_code || "-"}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        {editing ? (
                          <input
                            type="text"
                            value={editDetail?.description || ""}
                            onChange={(e) =>
                              updateDetailDescription(detail.id, e.target.value)
                            }
                            className="w-full px-2 py-1 bg-background border border-border rounded-lg text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Description..."
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">
                            {detail.description || "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        {editing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editDetail?.debit_amount || 0}
                            onChange={(e) =>
                              updateDetailAmount(
                                detail.id,
                                "debit_amount",
                                e.target.value
                              )
                            }
                            className="w-20 sm:w-28 px-2 py-1 bg-background border border-border rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-right text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                        ) : detail.debit_amount > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm">
                            Rs.{" "}
                            {detail.debit_amount.toLocaleString("en-PK", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        {editing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editDetail?.credit_amount || 0}
                            onChange={(e) =>
                              updateDetailAmount(
                                detail.id,
                                "credit_amount",
                                e.target.value
                              )
                            }
                            className="w-20 sm:w-28 px-2 py-1 bg-background border border-border rounded-lg text-red-600 dark:text-red-400 font-mono text-right text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                          />
                        ) : detail.credit_amount > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-mono text-xs sm:text-sm">
                            Rs.{" "}
                            {detail.credit_amount.toLocaleString("en-PK", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/30 font-medium">
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-foreground text-xs sm:text-sm">
                  Total
                </td>
                <td className="hidden sm:table-cell"></td>
                <td className="hidden md:table-cell"></td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-xs sm:text-sm">
                  {editing ? (
                    <span
                      className={
                        Math.abs(
                          editDetails.reduce((s, d) => s + d.debit_amount, 0) -
                            editDetails.reduce((s, d) => s + d.credit_amount, 0)
                        ) < 0.01
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }
                    >
                      Rs.{" "}
                      {editDetails
                        .reduce((s, d) => s + d.debit_amount, 0)
                        .toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Rs.{" "}
                      {totalDebit.toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-xs sm:text-sm">
                  {editing ? (
                    <span
                      className={
                        Math.abs(
                          editDetails.reduce((s, d) => s + d.debit_amount, 0) -
                            editDetails.reduce((s, d) => s + d.credit_amount, 0)
                        ) < 0.01
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                      }
                    >
                      Rs.{" "}
                      {editDetails
                        .reduce((s, d) => s + d.credit_amount, 0)
                        .toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      Rs.{" "}
                      {totalCredit.toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </td>
              </tr>
              {editing && (
                <tr className="bg-secondary/50">
                  <td className="px-3 sm:px-6 py-2 text-xs sm:text-sm">
                    {balanceError ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Unbalanced
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Check className="h-3 w-3" />
                        Balanced
                      </span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell"></td>
                  <td className="hidden md:table-cell"></td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
