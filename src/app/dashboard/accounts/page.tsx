"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Account } from "@/types/database";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  FolderOpen,
  FileText,
} from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>("all");
  const { t, language } = useLanguage();
  const supabase = createClient();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("account_code");

    if (error) {
      console.error("Error fetching accounts:", error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const expandAll = () => {
    setExpandedIds(
      new Set(accounts.filter((a) => a.is_header).map((a) => a.id))
    );
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    const { error } = await supabase.from("accounts").delete().eq("id", id);

    if (error) {
      alert("Error deleting account: " + error.message);
    } else {
      fetchAccounts();
    }
  };

  // Build hierarchical structure
  const buildTree = (accounts: Account[]): Account[] => {
    const accountMap = new Map<string, Account>();
    const rootAccounts: Account[] = [];

    // Create map of all accounts with children array
    accounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Build tree structure
    accounts.forEach((account) => {
      const accountWithChildren = accountMap.get(account.id)!;
      if (account.parent_id && accountMap.has(account.parent_id)) {
        accountMap.get(account.parent_id)!.children!.push(accountWithChildren);
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.account_name_urdu &&
        account.account_name_urdu.includes(searchTerm));

    const matchesType =
      selectedType === "all" || account.account_type === selectedType;

    return matchesSearch && matchesType;
  });

  const accountTree = buildTree(filteredAccounts);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "asset":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "liability":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "equity":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "income":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "expense":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      default:
        return "bg-white/10 text-muted-foreground border border-white/20";
    }
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedIds.has(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 hover:bg-white/5 border-b border-white/5 transition-colors ${
            account.is_header ? "glass" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpand(account.id)}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground ${
              !hasChildren ? "invisible" : ""
            }`}
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* Icon */}
          {account.is_header ? (
            <FolderOpen size={18} className="text-amber-400" />
          ) : (
            <FileText size={18} className="text-muted-foreground" />
          )}

          {/* Account Code */}
          <span className="font-mono text-sm text-muted-foreground w-28">
            {account.account_code}
          </span>

          {/* Account Name */}
          <div className="flex-1">
            <span
              className={`${
                account.is_header ? "font-semibold" : ""
              } text-foreground`}
            >
              {language === "ur" && account.account_name_urdu
                ? account.account_name_urdu
                : account.account_name}
            </span>
          </div>

          {/* Account Type Badge */}
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
              account.account_type
            )}`}
          >
            {t(`accounts.${account.account_type}`)}
          </span>

          {/* Balance */}
          <span className="w-32 text-right font-medium text-foreground tabular-nums">
            {account.opening_balance
              ? `Rs. ${account.opening_balance.toLocaleString()}`
              : "-"}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-4">
            <Link
              href={`/dashboard/accounts/${account.id}/edit`}
              className="p-2 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </Link>
            <button
              onClick={() => handleDelete(account.id)}
              className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("accounts.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your chart of accounts
          </p>
        </div>
        <Link
          href="/dashboard/accounts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          {t("accounts.addNew")}
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={20}
            />
            <input
              type="text"
              placeholder={`${t("common.search")}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 glass border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
          >
            <option value="all">All Types</option>
            <option value="asset">{t("accounts.asset")}</option>
            <option value="liability">{t("accounts.liability")}</option>
            <option value="equity">{t("accounts.equity")}</option>
            <option value="income">{t("accounts.income")}</option>
            <option value="expense">{t("accounts.expense")}</option>
          </select>

          {/* Expand/Collapse */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-muted-foreground hover:text-foreground glass rounded-lg transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-muted-foreground hover:text-foreground glass rounded-lg transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-2 px-4 py-3 glass border-b border-white/10 font-medium text-muted-foreground text-sm">
          <div className="w-6" /> {/* Expand button space */}
          <div className="w-5" /> {/* Icon space */}
          <div className="w-28">{t("accounts.code")}</div>
          <div className="flex-1">{t("accounts.name")}</div>
          <div className="w-24">{t("accounts.type")}</div>
          <div className="w-32 text-right">{t("accounts.balance")}</div>
          <div className="w-24 ml-4">{t("common.actions")}</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            {t("common.loading")}
          </div>
        ) : accountTree.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t("common.noData")}
          </div>
        ) : (
          <div>{accountTree.map((account) => renderAccount(account))}</div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {["asset", "liability", "equity", "income", "expense"].map((type) => {
          const count = accounts.filter((a) => a.account_type === type).length;
          return (
            <div key={type} className="glass-card rounded-lg p-4">
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                  type
                )} mb-2`}
              >
                {t(`accounts.${type}`)}
              </span>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
