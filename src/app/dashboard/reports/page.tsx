"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  FileSpreadsheet,
  BookOpen,
  TrendingUp,
  Scale,
  Download,
  Printer,
  Eye,
  Search,
  Filter,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DateRangeSelector,
  type DatePreset,
} from "@/components/shared/DateRangeSelector";

interface Transaction {
  id: string;
  date: string;
  voucherNo: string | number;
  type: string;
  narration: string;
  debit: number;
  credit: number;
}

interface TrialBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const initialReport = searchParams.get("report") || "transactions";

  const [activeTab, setActiveTab] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Date filters
  const [fromDate, setFromDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [datePreset, setDatePreset] = useState<DatePreset>("month");

  // Transaction filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Trial Balance
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);

  useLanguage();
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    } else if (activeTab === "trial-balance") {
      fetchTrialBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fromDate, toDate]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("id, account_code, account_name, account_type")
      .eq("is_header", false)
      .order("account_code");
    setAccounts(data || []);
  };

  const fetchTransactions = async () => {
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
        legacy_tr_no,
        transaction_details(debit_amount, credit_amount, account_id)
      `
      )
      .gte("transaction_date", fromDate)
      .lte("transaction_date", toDate)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else if (data) {
      const txns: Transaction[] = data.map((tx: Record<string, unknown>) => {
        const details = (tx.transaction_details || []) as Array<{
          debit_amount: unknown;
          credit_amount: unknown;
          account_id: string;
        }>;
        const totalDebit = details.reduce(
          (sum, d) => sum + (parseFloat(String(d.debit_amount)) || 0),
          0
        );
        const totalCredit = details.reduce(
          (sum, d) => sum + (parseFloat(String(d.credit_amount)) || 0),
          0
        );
        return {
          id: tx.id as string,
          date: tx.transaction_date as string,
          voucherNo:
            (tx.legacy_tr_no as number) || (tx.voucher_number as string) || "-",
          type: getVoucherTypeName(tx.voucher_type_code as number),
          narration: (tx.narration as string) || "-",
          debit: totalDebit,
          credit: totalCredit,
        };
      });
      setTransactions(txns);
    }

    setLoading(false);
  };

  const fetchTrialBalance = async () => {
    setLoading(true);

    // Get all accounts
    const { data: accountsData } = await supabase
      .from("accounts")
      .select("*")
      .eq("is_header", false)
      .order("account_code");

    if (!accountsData) {
      setLoading(false);
      return;
    }

    // Get all transaction details within date range
    const { data: details } = await supabase
      .from("transaction_details")
      .select(
        `
        account_id,
        debit_amount,
        credit_amount,
        transactions!inner(transaction_date)
      `
      )
      .gte("transactions.transaction_date", fromDate)
      .lte("transactions.transaction_date", toDate);

    // Calculate totals per account
    const accountTotals = new Map<string, { debit: number; credit: number }>();
    details?.forEach((d: Record<string, unknown>) => {
      const accId = d.account_id as string;
      const current = accountTotals.get(accId) || { debit: 0, credit: 0 };
      accountTotals.set(accId, {
        debit: current.debit + (parseFloat(String(d.debit_amount)) || 0),
        credit: current.credit + (parseFloat(String(d.credit_amount)) || 0),
      });
    });

    const tbData: TrialBalanceRow[] = accountsData
      .map((acc) => {
        const totals = accountTotals.get(acc.id) || { debit: 0, credit: 0 };
        const opening = acc.opening_balance || 0;
        return {
          id: acc.id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountType: acc.account_type,
          openingBalance: opening,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          closingBalance: opening + totals.debit - totals.credit,
        };
      })
      .filter(
        (row) =>
          row.openingBalance !== 0 ||
          row.totalDebit !== 0 ||
          row.totalCredit !== 0
      );

    setTrialBalance(tbData);
    setLoading(false);
  };

  const getVoucherTypeName = (code: number) => {
    switch (code) {
      case 101:
        return "Cash Receipt";
      case 102:
        return "Cash Payment";
      case 201:
        return "Journal";
      case 301:
        return "Opening";
      default:
        return `V-${code}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${Math.abs(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
    })}`;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.narration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.voucherNo.toString().includes(searchTerm);
    const matchesType = filterType === "all" || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  // Export functions
  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0] as object);
    const rows = data.map((row) =>
      headers.map((h) => (row as Record<string, unknown>)[h]).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report - ${activeTab}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { color: #666; margin: 5px 0; }
            .text-right { text-align: right; }
            .text-green { color: green; }
            .text-red { color: red; }
            .totals { font-weight: bold; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Home Sweet Home</h1>
            <p>گھر کی بہار</p>
            <p>${
              activeTab === "trial-balance"
                ? "Trial Balance"
                : "Transaction Report"
            }</p>
            <p>From ${format(new Date(fromDate), "dd MMM yyyy")} to ${format(
      new Date(toDate),
      "dd MMM yyyy"
    )}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const totalDebit = trialBalance.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalCredit = trialBalance.reduce((sum, r) => sum + r.totalCredit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight-custom">
            Reports & View
          </h1>
          <p className="text-muted-foreground mt-1">
            View transactions and generate financial reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground rounded-xl transition-all flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            onClick={() =>
              exportToCSV(
                activeTab === "trial-balance"
                  ? trialBalance
                  : filteredTransactions,
                activeTab
              )
            }
            className="px-4 py-2 bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-secondary p-1 rounded-xl">
          <TabsTrigger
            value="transactions"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger
            value="trial-balance"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Trial Balance</span>
          </TabsTrigger>
          <TabsTrigger
            value="ledger"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Ledger</span>
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
        </TabsList>

        {/* Date Range Selector - Common to all tabs */}
        <div className="mt-4 spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border p-4">
          <DateRangeSelector
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            preset={datePreset}
            onPresetChange={setDatePreset}
          />
        </div>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by narration or voucher no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 bg-background border-border rounded-xl">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Cash Receipt">Cash Receipt</SelectItem>
                  <SelectItem value="Cash Payment">Cash Payment</SelectItem>
                  <SelectItem value="Journal">Journal</SelectItem>
                  <SelectItem value="Opening">Opening</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Apply
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border overflow-hidden">
            <div ref={printRef}>
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-foreground" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Transaction List
                  </h3>
                  <span className="ml-2 px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-full">
                    {filteredTransactions.length} records
                  </span>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found for the selected period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-24 text-muted-foreground text-xs sm:text-sm">
                            Date
                          </TableHead>
                          <TableHead className="w-20 text-muted-foreground text-xs sm:text-sm">
                            V.No
                          </TableHead>
                          <TableHead className="w-28 text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                            Type
                          </TableHead>
                          <TableHead className="text-muted-foreground text-xs sm:text-sm">
                            Narration
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 text-muted-foreground text-xs sm:text-sm">
                            Debit
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 text-muted-foreground text-xs sm:text-sm">
                            Credit
                          </TableHead>
                          <TableHead className="w-10 sm:w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className="border-border hover:bg-secondary/50"
                          >
                            <TableCell className="font-mono text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(tx.date), "dd/MM/yy")}
                            </TableCell>
                            <TableCell className="font-mono text-xs sm:text-sm text-muted-foreground">
                              {tx.voucherNo}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  tx.type.includes("Receipt")
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : tx.type.includes("Payment")
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                    : "bg-secondary text-muted-foreground border border-border"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[100px] sm:max-w-xs truncate text-foreground text-xs sm:text-sm">
                              {tx.narration}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {tx.debit > 0 && formatCurrency(tx.debit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm text-red-600 dark:text-red-400">
                              {tx.credit > 0 && formatCurrency(tx.credit)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/dashboard/vouchers/${tx.id}`}>
                                <button className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                                  <Eye
                                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <div ref={printRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Trial Balance
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(fromDate), "dd MMM yyyy")} -{" "}
                    {format(new Date(toDate), "dd MMM yyyy")}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : trialBalance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No data for the selected period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20 sm:w-24 text-xs sm:text-sm">
                            Code
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">
                            Account Name
                          </TableHead>
                          <TableHead className="w-20 sm:w-24 hidden md:table-cell text-xs sm:text-sm">
                            Type
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 hidden lg:table-cell text-xs sm:text-sm">
                            Opening
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 text-xs sm:text-sm">
                            Debit
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 text-xs sm:text-sm">
                            Credit
                          </TableHead>
                          <TableHead className="text-right w-24 sm:w-28 text-xs sm:text-sm">
                            Closing
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs sm:text-sm">
                              {row.accountCode}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {row.accountName}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge
                                variant="outline"
                                className="capitalize text-[10px] sm:text-xs"
                              >
                                {row.accountType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm hidden lg:table-cell">
                              {formatCurrency(row.openingBalance)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm text-green-600">
                              {formatCurrency(row.totalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs sm:text-sm text-red-600">
                              {formatCurrency(row.totalCredit)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-medium text-xs sm:text-sm ${
                                row.closingBalance >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(row.closingBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell
                            colSpan={2}
                            className="text-right text-xs sm:text-sm md:hidden"
                          >
                            TOTAL
                          </TableCell>
                          <TableCell
                            colSpan={4}
                            className="text-right text-xs sm:text-sm hidden md:table-cell lg:hidden"
                          >
                            TOTAL
                          </TableCell>
                          <TableCell
                            colSpan={4}
                            className="text-right text-xs sm:text-sm hidden lg:table-cell"
                          >
                            TOTAL
                          </TableCell>
                          <TableCell className="text-right text-green-600 text-xs sm:text-sm">
                            {formatCurrency(totalDebit)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 text-xs sm:text-sm">
                            {formatCurrency(totalCredit)}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                              <span className="text-green-600">✓ Balanced</span>
                            ) : (
                              <span className="text-red-600">
                                Diff: {formatCurrency(totalDebit - totalCredit)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Account Ledger</h3>
              <p className="text-muted-foreground mb-4">
                View detailed ledger for individual accounts
              </p>
              <Button asChild>
                <Link href="/dashboard/ledger">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Go to Ledger Page
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Income Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Coming Soon</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  Expense Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Coming Soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
