"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DateRangeSelector,
  type DatePreset,
} from "@/components/shared/DateRangeSelector";
import { AccountSelector } from "@/components/shared/AccountSelector";
import {
  FileText,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BookOpen,
} from "lucide-react";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
  legacy_code?: number;
}

interface LedgerEntry {
  id: string;
  transaction_id: string;
  transaction_date: string;
  voucher_type_code: number;
  narration: string | null;
  narration_urdu: string | null;
  debit_amount: number;
  credit_amount: number;
  legacy_tr_no: number | null;
}

export default function LedgerPage() {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [fromDate, setFromDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [toDate, setToDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const { language } = useLanguage();
  const supabase = createClient();

  const fetchLedger = async () => {
    if (!selectedAccount) {
      setEntries([]);
      return;
    }

    setLoading(true);

    try {
      // Get transactions for this account within date range
      const { data, error } = await supabase
        .from("transaction_details")
        .select(
          `
          id,
          transaction_id,
          debit_amount,
          credit_amount,
          description,
          description_urdu,
          transactions!inner (
            id,
            transaction_date,
            voucher_type_code,
            narration,
            narration_urdu,
            legacy_tr_no
          )
        `
        )
        .eq("account_id", selectedAccount.id)
        .gte("transactions.transaction_date", fromDate)
        .lte("transactions.transaction_date", toDate)
        .order("transactions(transaction_date)", { ascending: true });

      if (error) {
        console.error("Error fetching ledger:", error);
        setEntries([]);
      } else if (data) {
        // Supabase returns transactions as array even for !inner join
        const ledgerEntries: LedgerEntry[] = data.map((d) => {
          const txn = Array.isArray(d.transactions)
            ? d.transactions[0]
            : d.transactions;
          return {
            id: d.id,
            transaction_id: d.transaction_id,
            transaction_date: txn?.transaction_date || "",
            voucher_type_code: txn?.voucher_type_code || 0,
            narration: d.description || txn?.narration || null,
            narration_urdu: d.description_urdu || txn?.narration_urdu || null,
            debit_amount: parseFloat(String(d.debit_amount)) || 0,
            credit_amount: parseFloat(String(d.credit_amount)) || 0,
            legacy_tr_no: txn?.legacy_tr_no || null,
          };
        });
        setEntries(ledgerEntries);
      }

      // Calculate opening balance (sum of transactions before fromDate)
      const { data: obData } = await supabase
        .from("transaction_details")
        .select(
          `
          debit_amount,
          credit_amount,
          transactions!inner (transaction_date)
        `
        )
        .eq("account_id", selectedAccount.id)
        .lt("transactions.transaction_date", fromDate);

      if (obData) {
        const ob = obData.reduce((sum: number, d) => {
          return (
            sum +
            (parseFloat(String(d.debit_amount)) || 0) -
            (parseFloat(String(d.credit_amount)) || 0)
          );
        }, 0);
        setOpeningBalance(ob);
      }
    } catch (err) {
      console.error("Ledger fetch error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, fromDate, toDate]);

  // Calculate running balance using useMemo to avoid reassignment warnings
  const entriesWithBalance = useMemo(() => {
    let balance = openingBalance;
    return entries.map((entry) => {
      balance += entry.debit_amount - entry.credit_amount;
      return { ...entry, balance };
    });
  }, [entries, openingBalance]);

  const totalDebit = entries.reduce((sum, e) => sum + e.debit_amount, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit_amount, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const getVoucherTypeLabel = (code: number) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Account Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            View detailed transaction history for any account
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border bg-card backdrop-blur-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <FileText
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            Select Account & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <AccountSelector
            selectedAccountId={selectedAccount?.id || null}
            onAccountSelect={setSelectedAccount}
            label="Account"
            placeholder="Select an account to view ledger"
            showAllOption={false}
          />

          <Separator />

          <DateRangeSelector
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            preset={datePreset}
            onPresetChange={setDatePreset}
          />

          <div className="flex gap-2">
            <Button
              onClick={fetchLedger}
              disabled={!selectedAccount || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Loading..." : "View Ledger"}
            </Button>
            {entries.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Printer className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Display */}
      {selectedAccount && (
        <Card className="border bg-card backdrop-blur-sm">
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-foreground">
                  {selectedAccount.account_code} -{" "}
                  {selectedAccount.account_name}
                </CardTitle>
                {selectedAccount.account_name_urdu && (
                  <p className="text-muted-foreground mt-1" dir="rtl">
                    {selectedAccount.account_name_urdu}
                  </p>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center px-4 py-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Opening</p>
                  <p
                    className={`font-bold ${
                      openingBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(openingBalance)}
                  </p>
                </div>
                <div className="text-center px-4 py-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs">Closing</p>
                  <p
                    className={`font-bold ${
                      closingBalance >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(closingBalance)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText
                  className="h-12 w-12 mx-auto mb-4 opacity-50"
                  strokeWidth={1.5}
                />
                <p>No transactions found for the selected period</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-secondary/30 hover:bg-secondary/30">
                        <TableHead className="w-24 text-muted-foreground font-medium text-xs">
                          Date
                        </TableHead>
                        <TableHead className="w-16 text-muted-foreground font-medium text-xs">
                          V.No
                        </TableHead>
                        <TableHead className="w-24 text-muted-foreground font-medium text-xs">
                          Type
                        </TableHead>
                        <TableHead className="text-muted-foreground font-medium text-xs">
                          Narration
                        </TableHead>
                        <TableHead className="text-right w-24 text-muted-foreground font-medium text-xs">
                          Debit
                        </TableHead>
                        <TableHead className="text-right w-24 text-muted-foreground font-medium text-xs">
                          Credit
                        </TableHead>
                        <TableHead className="text-right w-28 text-muted-foreground font-medium text-xs">
                          Balance
                        </TableHead>
                        <TableHead className="w-10 text-muted-foreground font-medium"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance Row */}
                      <TableRow className="border-border bg-secondary/20">
                        <TableCell
                          colSpan={4}
                          className="font-medium text-muted-foreground text-xs"
                        >
                          Opening Balance
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground/50 text-xs">
                          -
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground/50 text-xs">
                          -
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium text-xs ${
                            openingBalance >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {formatCurrency(openingBalance)}
                          {openingBalance >= 0 ? " Dr" : " Cr"}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>

                      {entriesWithBalance.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className="border-border hover:bg-secondary/30"
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(
                              new Date(entry.transaction_date),
                              "dd/MM/yy"
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {entry.legacy_tr_no || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border bg-secondary text-muted-foreground px-1.5 py-0"
                            >
                              {getVoucherTypeLabel(entry.voucher_type_code)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-foreground text-xs">
                            {language === "ur" && entry.narration_urdu
                              ? entry.narration_urdu
                              : entry.narration || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {entry.debit_amount > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                <ArrowUpRight
                                  className="h-2.5 w-2.5"
                                  strokeWidth={1.5}
                                />
                                {formatCurrency(entry.debit_amount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {entry.credit_amount > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center justify-end gap-1">
                                <ArrowDownRight
                                  className="h-2.5 w-2.5"
                                  strokeWidth={1.5}
                                />
                                {formatCurrency(entry.credit_amount)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-medium text-xs ${
                              entry.balance >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatCurrency(entry.balance)}
                            {entry.balance >= 0 ? " Dr" : " Cr"}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/dashboard/vouchers/${entry.transaction_id}`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-secondary text-muted-foreground hover:text-foreground"
                              >
                                <Eye
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Totals Row */}
                      <TableRow className="border-border bg-secondary/30 font-bold">
                        <TableCell
                          colSpan={4}
                          className="text-foreground text-xs"
                        >
                          Total
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 dark:text-rose-400 text-xs">
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-xs ${
                            closingBalance >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {formatCurrency(closingBalance)}
                          {closingBalance >= 0 ? " Dr" : " Cr"}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2">
                  {/* Opening Balance Card */}
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">
                        Opening Balance
                      </span>
                      <span
                        className={`font-mono text-sm font-medium ${
                          openingBalance >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(openingBalance)}{" "}
                        {openingBalance >= 0 ? "Dr" : "Cr"}
                      </span>
                    </div>
                  </div>

                  {/* Transaction Cards */}
                  {entriesWithBalance.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/dashboard/vouchers/${entry.transaction_id}`}
                      className="block"
                    >
                      <div className="p-3 rounded-lg bg-secondary/20 border border-border hover:bg-secondary/30 transition-colors">
                        {/* Top Row - Date and Type */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-mono">
                              {format(
                                new Date(entry.transaction_date),
                                "dd/MM/yy"
                              )}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-border bg-secondary text-muted-foreground px-1.5 py-0"
                            >
                              {getVoucherTypeLabel(entry.voucher_type_code)}
                            </Badge>
                          </div>
                          {entry.legacy_tr_no && (
                            <span className="text-muted-foreground/70 text-xs font-mono">
                              #{entry.legacy_tr_no}
                            </span>
                          )}
                        </div>

                        {/* Narration */}
                        {(entry.narration || entry.narration_urdu) && (
                          <p className="text-foreground text-xs mb-2 line-clamp-1">
                            {language === "ur" && entry.narration_urdu
                              ? entry.narration_urdu
                              : entry.narration}
                          </p>
                        )}

                        {/* Amounts Row */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-3">
                            {entry.debit_amount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-0.5">
                                <ArrowUpRight className="h-2.5 w-2.5" />
                                {formatCurrency(entry.debit_amount)}
                              </span>
                            )}
                            {entry.credit_amount > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-mono flex items-center gap-0.5">
                                <ArrowDownRight className="h-2.5 w-2.5" />
                                {formatCurrency(entry.credit_amount)}
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-mono font-medium ${
                              entry.balance >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatCurrency(entry.balance)}{" "}
                            {entry.balance >= 0 ? "Dr" : "Cr"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {/* Total Card */}
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-foreground font-medium">Total</span>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(totalDebit)}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono">
                          {formatCurrency(totalCredit)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-muted-foreground text-xs">
                        Closing Balance
                      </span>
                      <span
                        className={`font-mono text-sm font-medium ${
                          closingBalance >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(closingBalance)}{" "}
                        {closingBalance >= 0 ? "Dr" : "Cr"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Showing {entries.length} transactions from{" "}
                  {format(new Date(fromDate), "dd MMM yyyy")} to{" "}
                  {format(new Date(toDate), "dd MMM yyyy")}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
