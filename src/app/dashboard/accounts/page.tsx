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
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "liability":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "equity":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "income":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "expense":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedIds.has(account.id);

    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 ${
            account.is_header ? "bg-gray-50 dark:bg-gray-800" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpand(account.id)}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
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
            <FolderOpen size={18} className="text-amber-500" />
          ) : (
            <FileText size={18} className="text-gray-400" />
          )}

          {/* Account Code */}
          <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-28">
            {account.account_code}
          </span>

          {/* Account Name */}
          <div className="flex-1">
            <span
              className={`${
                account.is_header ? "font-semibold" : ""
              } text-gray-900 dark:text-white`}
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
          <span className="w-32 text-right font-medium text-gray-900 dark:text-white">
            {account.opening_balance
              ? `Rs. ${account.opening_balance.toLocaleString()}`
              : "-"}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-4">
            <Link
              href={`/dashboard/accounts/${account.id}/edit`}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
            </Link>
            <button
              onClick={() => handleDelete(account.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("accounts.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your chart of accounts
          </p>
        </div>
        <Link
          href="/dashboard/accounts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={20} />
          {t("accounts.addNew")}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder={`${t("common.search")}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
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
              className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-600 dark:text-gray-300 text-sm">
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
            <div
              key={type}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
            >
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                  type
                )} mb-2`}
              >
                {t(`accounts.${type}`)}
              </span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {count}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
