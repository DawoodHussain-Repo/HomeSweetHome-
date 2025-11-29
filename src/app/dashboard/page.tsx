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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("dashboard.welcome")} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your financial overview for{" "}
            {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/vouchers">
              <Plus className="h-4 w-4 mr-2" />
              New Voucher
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{stats.totalAccounts}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold">
                  {stats.totalTransactions.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.thisMonthTransactions} this month
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.cashBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(stats.cashBalance)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net This Month</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.monthlyIncome - stats.monthlyExpense >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(stats.monthlyIncome - stats.monthlyExpense)}
                </p>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-green-600">
                    ↑ {formatCurrency(stats.monthlyIncome)}
                  </span>
                  <span className="text-red-600">
                    ↓ {formatCurrency(stats.monthlyExpense)}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Overview (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-around gap-2">
              {monthlyData.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-1 justify-center items-end h-48">
                    {/* Income Bar */}
                    <div
                      className="w-5 bg-green-500 rounded-t transition-all duration-500"
                      style={{
                        height: `${(m.income / maxMonthlyValue) * 100}%`,
                        minHeight: m.income > 0 ? "4px" : "0",
                      }}
                      title={`Income: ${formatCurrency(m.income)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-5 bg-red-500 rounded-t transition-all duration-500"
                      style={{
                        height: `${(m.expense / maxMonthlyValue) * 100}%`,
                        minHeight: m.expense > 0 ? "4px" : "0",
                      }}
                      title={`Expense: ${formatCurrency(m.expense)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {m.month}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm text-muted-foreground">Expense</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-3"
            >
              <Link href="/dashboard/vouchers?type=101">
                <div className="h-8 w-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Cash Receipt</p>
                  <p className="text-xs text-muted-foreground">نقد وصولی</p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-3"
            >
              <Link href="/dashboard/vouchers?type=102">
                <div className="h-8 w-8 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Cash Payment</p>
                  <p className="text-xs text-muted-foreground">نقد ادائیگی</p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-3"
            >
              <Link href="/dashboard/vouchers?type=201">
                <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Journal Entry</p>
                  <p className="text-xs text-muted-foreground">جنرل اندراج</p>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full justify-start h-auto py-3"
            >
              <Link href="/dashboard/reports">
                <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Reports</p>
                  <p className="text-xs text-muted-foreground">رپورٹس دیکھیں</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/reports">
              View All
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent transactions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-20">V.No</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right w-32">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => {
                    const typeName = getVoucherTypeName(tx.voucherType);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(tx.date), "dd/MM/yy")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.voucherNo || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              typeName.includes("Receipt")
                                ? "border-green-500 text-green-600"
                                : typeName.includes("Payment")
                                ? "border-red-500 text-red-600"
                                : ""
                            }
                          >
                            {typeName}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {tx.accountName}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {tx.narration}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span
                            className={`flex items-center justify-end gap-1 ${
                              tx.isDebit ? "text-green-600" : "text-red-600"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Debits & Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Debit</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.totalDebit)}
                </p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Credit</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(stats.totalCredit)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Difference
                </span>
                <span
                  className={`font-bold ${
                    stats.totalDebit - stats.totalCredit >= 0
                      ? "text-green-600"
                      : "text-red-600"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/accounts">Chart of Accounts</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/ledger">Account Ledger</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/reports?report=trial-balance">
                Trial Balance
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
