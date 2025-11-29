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
          <h1 className="text-2xl font-bold text-foreground">Reports & View</h1>
          <p className="text-muted-foreground mt-1">
            View transactions and generate financial reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                activeTab === "trial-balance"
                  ? trialBalance
                  : filteredTransactions,
                activeTab
              )
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger
            value="trial-balance"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Trial Balance</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Summary</span>
          </TabsTrigger>
        </TabsList>

        {/* Date Range Selector - Common to all tabs */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <DateRangeSelector
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />
          </CardContent>
        </Card>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by narration or voucher no..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
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
                <Button onClick={fetchTransactions} disabled={loading}>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <div ref={printRef}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction List
                  <Badge variant="secondary" className="ml-2">
                    {filteredTransactions.length} records
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                        <TableRow>
                          <TableHead className="w-24">Date</TableHead>
                          <TableHead className="w-20">V.No</TableHead>
                          <TableHead className="w-28">Type</TableHead>
                          <TableHead>Narration</TableHead>
                          <TableHead className="text-right w-28">
                            Debit
                          </TableHead>
                          <TableHead className="text-right w-28">
                            Credit
                          </TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(tx.date), "dd/MM/yy")}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {tx.voucherNo}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  tx.type.includes("Receipt")
                                    ? "border-green-500 text-green-600"
                                    : tx.type.includes("Payment")
                                    ? "border-red-500 text-red-600"
                                    : ""
                                }
                              >
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {tx.narration}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {tx.debit > 0 && formatCurrency(tx.debit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {tx.credit > 0 && formatCurrency(tx.credit)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/dashboard/vouchers/${tx.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
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
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead className="w-24">Type</TableHead>
                          <TableHead className="text-right w-28">
                            Opening
                          </TableHead>
                          <TableHead className="text-right w-28">
                            Debit
                          </TableHead>
                          <TableHead className="text-right w-28">
                            Credit
                          </TableHead>
                          <TableHead className="text-right w-28">
                            Closing
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-sm">
                              {row.accountCode}
                            </TableCell>
                            <TableCell>{row.accountName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {row.accountType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(row.openingBalance)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(row.totalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600">
                              {formatCurrency(row.totalCredit)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-medium ${
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
                          <TableCell colSpan={4} className="text-right">
                            TOTAL
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(totalDebit)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(totalCredit)}
                          </TableCell>
                          <TableCell className="text-right">
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
