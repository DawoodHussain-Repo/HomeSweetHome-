"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Account } from "@/types/database";
import { ArrowLeft, Save } from "lucide-react";

export default function NewAccountPage() {
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_name_urdu: "",
    parent_id: "",
    account_type: "asset" as Account["account_type"],
    is_header: false,
    opening_balance: 0,
    balance_type: "debit" as "debit" | "credit",
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("is_header", true)
      .order("account_code");

    setAccounts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    // Calculate account level based on parent
    let accountLevel = 1;
    if (formData.parent_id) {
      const parent = accounts.find((a) => a.id === formData.parent_id);
      if (parent) {
        accountLevel = parent.account_level + 1;
      }
    }

    const { error: insertError } = await supabase.from("accounts").insert({
      user_id: user.id,
      account_code: formData.account_code,
      account_name: formData.account_name,
      account_name_urdu: formData.account_name_urdu || null,
      parent_id: formData.parent_id || null,
      account_type: formData.account_type,
      account_level: accountLevel,
      is_header: formData.is_header,
      opening_balance: formData.opening_balance,
      balance_type: formData.balance_type,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      router.push("/dashboard/accounts");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/accounts"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t("accounts.addNew")}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create a new account in your chart of accounts
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border border-border space-y-6"
      >
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Account Code */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              {t("accounts.code")} *
            </label>
            <input
              type="text"
              required
              value={formData.account_code}
              onChange={(e) =>
                setFormData({ ...formData, account_code: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
              placeholder="e.g., 10100"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              {t("accounts.type")} *
            </label>
            <select
              required
              value={formData.account_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  account_type: e.target.value as Account["account_type"],
                })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
            >
              <option value="asset">{t("accounts.asset")}</option>
              <option value="liability">{t("accounts.liability")}</option>
              <option value="equity">{t("accounts.equity")}</option>
              <option value="income">{t("accounts.income")}</option>
              <option value="expense">{t("accounts.expense")}</option>
            </select>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              {t("accounts.name")} (English) *
            </label>
            <input
              type="text"
              required
              value={formData.account_name}
              onChange={(e) =>
                setFormData({ ...formData, account_name: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
              placeholder="Account Name"
            />
          </div>

          {/* Account Name Urdu */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              {t("accounts.name")} (اردو)
            </label>
            <input
              type="text"
              dir="rtl"
              value={formData.account_name_urdu}
              onChange={(e) =>
                setFormData({ ...formData, account_name_urdu: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
              placeholder="کھاتے کا نام"
            />
          </div>

          {/* Parent Account */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              Parent Account
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) =>
                setFormData({ ...formData, parent_id: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
            >
              <option value="">-- No Parent (Root Account) --</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_code} - {account.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Is Header */}
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_header}
                onChange={(e) =>
                  setFormData({ ...formData, is_header: e.target.checked })
                }
                className="w-4 h-4 sm:w-5 sm:h-5 text-primary border-border rounded focus:ring-primary"
              />
              <span className="text-xs sm:text-sm font-medium text-foreground">
                This is a header/group account (cannot post transactions)
              </span>
            </label>
          </div>

          {/* Opening Balance */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              Opening Balance
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.opening_balance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  opening_balance: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
              placeholder="0.00"
            />
          </div>

          {/* Balance Type */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
              Balance Type
            </label>
            <select
              value={formData.balance_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  balance_type: e.target.value as "debit" | "credit",
                })
              }
              className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background text-foreground text-sm"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {t("common.save")}
          </button>
          <Link
            href="/dashboard/accounts"
            className="px-4 sm:px-6 py-2 text-muted-foreground hover:bg-secondary text-sm font-medium rounded-lg transition-colors"
          >
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
