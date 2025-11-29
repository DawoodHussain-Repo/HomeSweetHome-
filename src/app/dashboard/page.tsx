"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks";
import { useLanguage } from "@/context/LanguageContext";
import { format } from "date-fns";
import {
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Voucher type mapping
const VOUCHER_TYPE_MAP: Record<
  number,
  { name: string; isReceipt: boolean; isPayment: boolean }
> = {
  101: { name: "Cash Receipt", isReceipt: true, isPayment: false },
  102: { name: "Cash Payment", isReceipt: false, isPayment: true },
  201: { name: "Journal Entry", isReceipt: false, isPayment: false },
  301: { name: "Opening Balance", isReceipt: false, isPayment: false },
};

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart and Quick Actions Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, monthlyData, recentTransactions, isLoading, error, refetch } =
    useDashboard();
  const { t } = useLanguage();

  const getVoucherTypeName = (code: number): string => {
    return VOUCHER_TYPE_MAP[code]?.name || `Voucher ${code}`;
  };

  const formatCurrency = (amount: number): string => {
    return `Rs. ${Math.abs(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
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
            Error loading dashboard
          </p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="heading-primary text-foreground">
            {t("dashboard.welcome")} 👋
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Here&apos;s your financial overview for{" "}
            {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" className="sm:size-default">
            <Link href="/dashboard/vouchers">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">New</span> Voucher
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <Card className="card-hover glass-card">
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Total Accounts
                </p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums">
                  {stats.totalAccounts}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover glass-card">
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Total Transactions
                </p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums">
                  {stats.totalTransactions.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {stats.thisMonthTransactions} this month
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover glass-card">
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Cash Balance
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold tabular-nums ${
                    stats.cashBalance >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(stats.cashBalance)}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover glass-card">
          <CardContent className="p-4 sm:pt-6 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Net This Month
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold tabular-nums ${
                    stats.monthlyIncome - stats.monthlyExpense >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(stats.monthlyIncome - stats.monthlyExpense)}
                </p>
                <div className="flex gap-2 mt-0.5 text-[10px] sm:text-xs">
                  <span className="text-green-400">
                    ↑ {formatCurrency(stats.monthlyIncome)}
                  </span>
                  <span className="text-red-400">
                    ↓ {formatCurrency(stats.monthlyExpense)}
                  </span>
                </div>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Monthly Overview</span>
              <span className="sm:hidden">Overview</span>
              <span className="text-muted-foreground font-normal text-xs sm:text-sm">
                (6 Months)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="h-48 sm:h-64 flex items-end justify-around gap-1 sm:gap-2">
              {monthlyData.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-0.5 sm:gap-1 justify-center items-end h-36 sm:h-48">
                    {/* Income Bar */}
                    <div
                      className="w-3 sm:w-5 bg-green-500 rounded-t transition-all duration-500"
                      style={{
                        height: `${(m.income / maxMonthlyValue) * 100}%`,
                        minHeight: m.income > 0 ? "4px" : "0",
                      }}
                      title={`Income: ${formatCurrency(m.income)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-3 sm:w-5 bg-red-500 rounded-t transition-all duration-500"
                      style={{
                        height: `${(m.expense / maxMonthlyValue) * 100}%`,
                        minHeight: m.expense > 0 ? "4px" : "0",
                      }}
                      title={`Expense: ${formatCurrency(m.expense)}`}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
                    {m.month}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mt-3 sm:mt-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Income
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Expense
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-2 sm:space-y-3">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-2.5 sm:py-3 glass border-white/10"
            >
              <Link href="/dashboard/vouchers?type=101">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-green-500/20 flex items-center justify-center mr-2 sm:mr-3">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">
                    Cash Receipt
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-urdu">
                    نقد وصولی
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-2.5 sm:py-3 glass border-white/10"
            >
              <Link href="/dashboard/vouchers?type=102">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-red-500/20 flex items-center justify-center mr-2 sm:mr-3">
                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">
                    Cash Payment
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-urdu">
                    نقد ادائیگی
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-2.5 sm:py-3 glass border-white/10"
            >
              <Link href="/dashboard/vouchers?type=201">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-blue-500/20 flex items-center justify-center mr-2 sm:mr-3">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">
                    Journal Entry
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-urdu">
                    جنرل اندراج
                  </p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-2.5 sm:py-3 glass border-white/10"
            >
              <Link href="/dashboard/reports">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-purple-500/20 flex items-center justify-center mr-2 sm:mr-3">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base">
                    View Reports
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-urdu">
                    رپورٹس دیکھیں
                  </p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Recent Transactions</span>
            <span className="sm:hidden">Recent</span>
          </CardTitle>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm"
          >
            <Link href="/dashboard/reports">
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No recent transactions</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table className="text-xs sm:text-sm glass-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 sm:w-24 pl-4 sm:pl-0">
                      Date
                    </TableHead>
                    <TableHead className="w-14 sm:w-20 hidden sm:table-cell">
                      V.No
                    </TableHead>
                    <TableHead className="w-24 sm:w-32">Type</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Account
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Narration
                    </TableHead>
                    <TableHead className="text-right w-20 sm:w-32 pr-4 sm:pr-0">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => {
                    const typeName = getVoucherTypeName(tx.voucherType);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono pl-4 sm:pl-0">
                          {format(new Date(tx.date), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="font-mono hidden sm:table-cell">
                          {tx.voucherNo || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] sm:text-xs ${
                              typeName.includes("Receipt")
                                ? "border-green-500/50 text-green-400"
                                : typeName.includes("Payment")
                                ? "border-red-500/50 text-red-400"
                                : "border-white/20"
                            }`}
                          >
                            <span className="hidden sm:inline">{typeName}</span>
                            <span className="sm:hidden">
                              {typeName.split(" ")[0]}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate hidden md:table-cell">
                          {tx.accountName}
                        </TableCell>
                        <TableCell className="max-w-xs truncate hidden lg:table-cell">
                          {tx.narration}
                        </TableCell>
                        <TableCell className="text-right font-mono pr-4 sm:pr-0">
                          <span
                            className={`flex items-center justify-end gap-0.5 sm:gap-1 ${
                              tx.isDebit ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {tx.isDebit ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">
              Total Debits & Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Debit
                </p>
                <p className="text-lg sm:text-xl font-bold text-green-400 tabular-nums">
                  {formatCurrency(stats.totalDebit)}
                </p>
              </div>
              <div className="h-10 sm:h-12 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Credit
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-400 tabular-nums">
                  {formatCurrency(stats.totalCredit)}
                </p>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Difference
                </span>
                <span
                  className={`font-bold text-sm sm:text-base tabular-nums ${
                    stats.totalDebit - stats.totalCredit >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(
                    Math.abs(stats.totalDebit - stats.totalCredit)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 grid grid-cols-2 gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-9 glass border-white/10"
            >
              <Link href="/dashboard/accounts">
                <span className="hidden sm:inline">Chart of Accounts</span>
                <span className="sm:hidden">Accounts</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-9 glass border-white/10"
            >
              <Link href="/dashboard/ledger">
                <span className="hidden sm:inline">Account</span> Ledger
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-9 glass border-white/10"
            >
              <Link href="/dashboard/reports?report=trial-balance">
                Trial Balance
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-8 sm:h-9 glass border-white/10"
            >
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
