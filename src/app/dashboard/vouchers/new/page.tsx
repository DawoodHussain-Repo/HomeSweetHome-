"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Account, VoucherType } from "@/types/database";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

interface VoucherLine {
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
}

export default function NewVoucherPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    voucher_type_id: typeParam || "",
    voucher_number: "",
    cheque_number: "",
    cheque_date: "",
    narration: "",
  });
  const [lines, setLines] = useState<VoucherLine[]>([
    { account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
    { account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
  ]);
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch voucher types
    const { data: types } = await supabase
      .from("voucher_types")
      .select("*")
      .eq("is_active", true)
      .order("code");

    setVoucherTypes(types || []);

    // Fetch postable accounts (non-header)
    const { data: accts } = await supabase
      .from("accounts")
      .select("*")
      .eq("is_header", false)
      .eq("is_active", true)
      .order("account_code");

    setAccounts(accts || []);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { account_id: "", description: "", debit_amount: 0, credit_amount: 0 },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return; // Minimum 2 lines
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (
    index: number,
    field: keyof VoucherLine,
    value: string | number
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Auto-clear opposite side when entering amount
    if (field === "debit_amount" && value) {
      newLines[index].credit_amount = 0;
    } else if (field === "credit_amount" && value) {
      newLines[index].debit_amount = 0;
    }

    setLines(newLines);
  };

  const totalDebit = lines.reduce(
    (sum, line) => sum + (parseFloat(line.debit_amount.toString()) || 0),
    0
  );
  const totalCredit = lines.reduce(
    (sum, line) => sum + (parseFloat(line.credit_amount.toString()) || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.voucher_type_id) {
      setError("Please select a voucher type");
      return;
    }

    if (!isBalanced) {
      setError("Debit and Credit must be equal");
      return;
    }

    const validLines = lines.filter(
      (l) => l.account_id && (l.debit_amount || l.credit_amount)
    );
    if (validLines.length < 2) {
      setError("At least 2 valid entries are required");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Create transaction
    const { data: txn, error: txnError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        transaction_date: formData.transaction_date,
        voucher_type_id: formData.voucher_type_id,
        voucher_number: formData.voucher_number || null,
        cheque_number: formData.cheque_number || null,
        cheque_date: formData.cheque_date || null,
        narration: formData.narration || null,
        total_amount: totalDebit,
        is_posted: false,
      })
      .select()
      .single();

    if (txnError) {
      setError(txnError.message);
      setLoading(false);
      return;
    }

    // Create transaction details
    const detailsToInsert = validLines.map((line, index) => ({
      transaction_id: txn.id,
      account_id: line.account_id,
      description: line.description || null,
      debit_amount: parseFloat(line.debit_amount.toString()) || 0,
      credit_amount: parseFloat(line.credit_amount.toString()) || 0,
      line_order: index,
    }));

    const { error: detailsError } = await supabase
      .from("transaction_details")
      .insert(detailsToInsert);

    if (detailsError) {
      // Rollback transaction
      await supabase.from("transactions").delete().eq("id", txn.id);
      setError(detailsError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/vouchers");
  };

  const getVoucherTypeLabel = (vt: VoucherType) => {
    return language === "ur" && vt.title_urdu ? vt.title_urdu : vt.title;
  };

  const getAccountLabel = (acc: Account) => {
    const name =
      language === "ur" && acc.account_name_urdu
        ? acc.account_name_urdu
        : acc.account_name;
    return `${acc.account_code} - ${name}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vouchers"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t("vouchers.new")}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create a new transaction voucher
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Voucher Header */}
        <div className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border border-border">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">
            Voucher Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Voucher Type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-foreground/80 mb-1">
                {t("vouchers.type")} *
              </label>
              <select
                required
                value={formData.voucher_type_id}
                onChange={(e) =>
                  setFormData({ ...formData, voucher_type_id: e.target.value })
                }
                className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
              >
                <option value="">Select Type</option>
                {voucherTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {getVoucherTypeLabel(vt)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t("vouchers.date")} *
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
              />
            </div>

            {/* Voucher Number */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Voucher No.
              </label>
              <input
                type="text"
                value={formData.voucher_number}
                onChange={(e) =>
                  setFormData({ ...formData, voucher_number: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                placeholder="Auto-generated if empty"
              />
            </div>

            {/* Cheque Number */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Cheque No.
              </label>
              <input
                type="text"
                value={formData.cheque_number}
                onChange={(e) =>
                  setFormData({ ...formData, cheque_number: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
              />
            </div>

            {/* Cheque Date */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                Cheque Date
              </label>
              <input
                type="date"
                value={formData.cheque_date}
                onChange={(e) =>
                  setFormData({ ...formData, cheque_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
              />
            </div>

            {/* Narration */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t("vouchers.narration")}
              </label>
              <input
                type="text"
                value={formData.narration}
                onChange={(e) =>
                  setFormData({ ...formData, narration: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                placeholder="Transaction description..."
              />
            </div>
          </div>
        </div>

        {/* Voucher Lines */}
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Transaction Entries
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 px-3 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
            >
              <Plus size={18} />
              Add Line
            </button>
          </div>

          {/* Lines Header */}
          <div className="grid grid-cols-12 gap-2 mb-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-5">Account</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2 text-right">{t("vouchers.debit")}</div>
            <div className="col-span-2 text-right">{t("vouchers.credit")}</div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select
                    value={line.account_id}
                    onChange={(e) =>
                      updateLine(index, "account_id", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {getAccountLabel(acc)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) =>
                      updateLine(index, "description", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                    placeholder="Details..."
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit_amount || ""}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "debit_amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 text-sm text-right border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit_amount || ""}
                    onChange={(e) =>
                      updateLine(
                        index,
                        "credit_amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 text-sm text-right border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 2}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-12 gap-2 mt-4 pt-4 border-t border-border">
            <div className="col-span-8 text-right font-semibold text-foreground">
              {t("vouchers.total")}:
            </div>
            <div className="col-span-2 text-right font-bold text-foreground">
              Rs. {totalDebit.toLocaleString()}
            </div>
            <div className="col-span-2 text-right font-bold text-foreground">
              Rs. {totalCredit.toLocaleString()}
            </div>
          </div>

          {/* Balance Status */}
          <div
            className={`mt-2 text-right text-sm font-medium ${
              isBalanced ? "text-green-600" : "text-red-600"
            }`}
          >
            {isBalanced
              ? "✓ Balanced"
              : `✗ Difference: Rs. ${Math.abs(
                  totalDebit - totalCredit
                ).toLocaleString()}`}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !isBalanced}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {t("vouchers.save")}
          </button>
          <Link
            href="/dashboard/vouchers"
            className="px-6 py-2 text-muted-foreground hover:bg-secondary font-medium rounded-lg transition-colors"
          >
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
