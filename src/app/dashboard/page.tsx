"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks";
import { useLanguage } from "@/context/LanguageContext";
import { useSpotlightEffect } from "@/components/ui/spotlight-card";
import { format } from "date-fns";
import {
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Voucher type mapping
const VOUCHER_TYPE_MAP: Record<
  number,
  { name: string; nameUrdu: string; isReceipt: boolean; isPayment: boolean }
> = {
  101: {
    name: "Cash Receipt",
    nameUrdu: "نقد وصولی",
    isReceipt: true,
    isPayment: false,
  },
  102: {
    name: "Cash Payment",
    nameUrdu: "نقد ادائیگی",
    isReceipt: false,
    isPayment: true,
  },
  201: {
    name: "Journal Entry",
    nameUrdu: "جنرل اندراج",
    isReceipt: false,
    isPayment: false,
  },
  301: {
    name: "Opening Balance",
    nameUrdu: "اوپننگ بیلنس",
    isReceipt: false,
    isPayment: false,
  },
};

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-end">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-14 w-72" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, monthlyData, recentTransactions, isLoading, error, refetch } =
    useDashboard();
  const { t, language } = useLanguage();

  // Enable spotlight effect on cards
  useSpotlightEffect();

  const getVoucherTypeName = (code: number): string => {
    const type = VOUCHER_TYPE_MAP[code];
    if (!type) return `Voucher ${code}`;
    return language === "ur" ? type.nameUrdu : type.name;
  };

  const formatCurrency = (amount: number): string => {
    return `Rs. ${Math.abs(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatCurrencyCompact = (amount: number): string => {
    const abs = Math.abs(amount);
    if (abs >= 10000000) return `${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${(abs / 1000).toFixed(0)}K`;
    return abs.toLocaleString("en-PK");
  };

  // Calculate max for chart scaling
  const maxMonthlyValue = useMemo(() => {
    return Math.max(
      ...monthlyData.map((m) => Math.max(m.income, m.expense)),
      1
    );
  }, [monthlyData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-center">
          <p className="text-destructive font-medium mb-2">
            {language === "ur"
              ? "ڈیش بورڈ لوڈ کرنے میں خرابی"
              : "Error loading dashboard"}
          </p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline" className="rounded-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === "ur" ? "دوبارہ کوشش کریں" : "Try Again"}
        </Button>
      </div>
    );
  }

  const netBalance = stats.monthlyIncome - stats.monthlyExpense;
  const netPercentage =
    stats.monthlyIncome > 0
      ? ((netBalance / stats.monthlyIncome) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-8">
      {/* Header - Carbon Style */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border pb-8 animate-in-down">
        <div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight-custom text-foreground mb-1">
            {language === "ur" ? "کل بیلنس" : "Total Balance"}
          </h1>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight-custom">
              Rs. {formatCurrencyCompact(stats.cashBalance)}
            </span>
            <span className="text-2xl sm:text-3xl text-muted-foreground font-light">
              .00
            </span>
            <Badge
              className={`ml-2 sm:ml-4 text-xs font-medium px-2 py-1 rounded-full ${
                netBalance >= 0
                  ? "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
                  : "bg-red-400/10 text-red-400 hover:bg-red-400/20"
              }`}
            >
              {netBalance >= 0 ? "+" : ""}
              {netPercentage}%
            </Badge>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4">
          <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
          <Button
            asChild
            className="px-4 sm:px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Link href="/dashboard/vouchers">
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">
                {language === "ur" ? "نیا ووچر" : "New Voucher"}
              </span>
              <span className="sm:hidden">
                {language === "ur" ? "نیا" : "New"}
              </span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <div className="spotlight-card rounded-2xl p-4 sm:p-6 h-72 sm:h-80 relative animate-in-up">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-medium text-muted-foreground">
                {language === "ur" ? "کارکردگی" : "Performance"}
              </h3>
              <div className="flex gap-2">
                <button className="text-xs text-foreground bg-accent px-3 py-1 rounded-md">
                  6M
                </button>
                <button className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 transition-colors">
                  1Y
                </button>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex-1 h-44 sm:h-52 flex items-end justify-around gap-1 sm:gap-2">
              {monthlyData.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-0.5 sm:gap-1 justify-center items-end h-36 sm:h-44">
                    {/* Income Bar */}
                    <div
                      className="w-3 sm:w-6 bg-emerald-500/80 rounded-t transition-all duration-700"
                      style={{
                        height: `${(m.income / maxMonthlyValue) * 100}%`,
                        minHeight: m.income > 0 ? "4px" : "0",
                        animationDelay: `${idx * 100}ms`,
                      }}
                      title={`${
                        language === "ur" ? "آمدنی" : "Income"
                      }: ${formatCurrency(m.income)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-3 sm:w-6 bg-red-500/80 rounded-t transition-all duration-700"
                      style={{
                        height: `${(m.expense / maxMonthlyValue) * 100}%`,
                        minHeight: m.expense > 0 ? "4px" : "0",
                        animationDelay: `${idx * 100}ms`,
                      }}
                      title={`${
                        language === "ur" ? "اخراجات" : "Expense"
                      }: ${formatCurrency(m.expense)}`}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                    {m.month}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Income */}
            <div className="spotlight-card rounded-2xl p-4 sm:p-6 animate-in-up delay-100">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                {language === "ur" ? "ماہانہ آمدنی" : "Monthly Income"}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-2xl font-bold text-emerald-400">
                  {formatCurrency(stats.monthlyIncome)}
                </span>
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
              </div>
              <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-3 sm:mt-4">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      (stats.monthlyIncome /
                        (stats.monthlyIncome + stats.monthlyExpense || 1)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Monthly Expense */}
            <div className="spotlight-card rounded-2xl p-4 sm:p-6 animate-in-up delay-200">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                {language === "ur" ? "ماہانہ اخراجات" : "Monthly Expense"}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-2xl font-bold text-red-400">
                  {formatCurrency(stats.monthlyExpense)}
                </span>
                <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
              </div>
              <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-3 sm:mt-4">
                <div
                  className="bg-red-500 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      (stats.monthlyExpense /
                        (stats.monthlyIncome + stats.monthlyExpense || 1)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="spotlight-card rounded-2xl p-4 sm:p-6 animate-in-up delay-300">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              {language === "ur" ? "فوری کارروائیاں" : "Quick Actions"}
            </h3>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <Link
                href="/dashboard/vouchers?type=receipt"
                className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-all border border-transparent group-hover:border-emerald-500/50">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {language === "ur" ? "وصولی" : "Receipt"}
                </span>
              </Link>

              <Link
                href="/dashboard/vouchers?type=payment"
                className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-all border border-transparent group-hover:border-red-500/50">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {language === "ur" ? "ادائیگی" : "Payment"}
                </span>
              </Link>

              <Link
                href="/dashboard/vouchers?type=journal"
                className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all border border-transparent group-hover:border-blue-500/50">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {language === "ur" ? "جنرل" : "Journal"}
                </span>
              </Link>

              <Link
                href="/dashboard/accounts"
                className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all border border-transparent group-hover:border-purple-500/50">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {language === "ur" ? "اکاؤنٹس" : "Accounts"}
                </span>
              </Link>

              <Link
                href="/dashboard/reports"
                className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-all border border-transparent group-hover:border-orange-500/50">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {language === "ur" ? "رپورٹس" : "Reports"}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="spotlight-card rounded-2xl p-1 relative h-44 sm:h-48 group animate-in-right">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-black/50 rounded-2xl opacity-50" />

            <div className="w-full h-full bg-card rounded-xl border border-border p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              {/* Metal Shine Effect */}
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-5 group-hover:animate-shine" />

              <div className="flex justify-between items-start">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 opacity-50" />
                <span className="font-bold tracking-widest text-foreground italic text-sm sm:text-base">
                  {language === "ur" ? "حساب" : "Hisaab"}
                </span>
              </div>
              <div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  {language === "ur" ? "کل اکاؤنٹس" : "Total Accounts"}
                </div>
                <div className="text-2xl sm:text-3xl font-bold">
                  {stats.totalAccounts}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  {stats.totalTransactions.toLocaleString()}{" "}
                  {language === "ur" ? "لین دین" : "transactions"}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="spotlight-card rounded-2xl p-0 overflow-hidden animate-in-right delay-100">
            <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">
                {language === "ur" ? "حالیہ" : "Recent"}
              </h3>
              <Link
                href="/dashboard/reports"
                className="text-xs text-foreground hover:underline"
              >
                {language === "ur" ? "سب دیکھیں" : "View All"}
              </Link>
            </div>

            <div className="divide-y divide-border">
              {recentTransactions.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-muted-foreground">
                  <FileText
                    className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 opacity-50"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs sm:text-sm">
                    {language === "ur"
                      ? "کوئی حالیہ لین دین نہیں"
                      : "No recent transactions"}
                  </p>
                </div>
              ) : (
                recentTransactions.slice(0, 5).map((tx) => {
                  const typeInfo = VOUCHER_TYPE_MAP[tx.voucherType];
                  const isIncome = typeInfo?.isReceipt;
                  const isExpense = typeInfo?.isPayment;

                  return (
                    <Link
                      key={tx.id}
                      href={`/dashboard/vouchers/${tx.id}`}
                      className="transaction-item hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div
                          className={`transaction-icon ${
                            isIncome
                              ? "!bg-emerald-500/20 !text-emerald-400"
                              : isExpense
                              ? "!bg-red-500/20 !text-red-400"
                              : ""
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownRight
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              strokeWidth={1.5}
                            />
                          ) : isExpense ? (
                            <ArrowUpRight
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              strokeWidth={1.5}
                            />
                          ) : (
                            <FileText
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              strokeWidth={1.5}
                            />
                          )}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-foreground">
                            {getVoucherTypeName(tx.voucherType)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {tx.voucherNo ||
                              format(new Date(tx.date), "dd MMM")}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-medium ${
                          isIncome
                            ? "text-emerald-400"
                            : isExpense
                            ? "text-red-400"
                            : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}Rs.
                        {tx.amount.toLocaleString()}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
