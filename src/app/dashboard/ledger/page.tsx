"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Ledger</h1>
        <p className="text-muted-foreground mt-1">
          View detailed transaction history for any account
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Account & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            >
              {loading ? "Loading..." : "View Ledger"}
            </Button>
            {entries.length > 0 && (
              <>
                <Button variant="outline" size="icon">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Display */}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>
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
                <div className="text-center">
                  <p className="text-muted-foreground">Opening</p>
                  <p
                    className={`font-bold ${
                      openingBalance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(openingBalance)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Closing</p>
                  <p
                    className={`font-bold ${
                      closingBalance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(closingBalance)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found for the selected period</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Date</TableHead>
                        <TableHead className="w-20">V.No</TableHead>
                        <TableHead className="w-28">Type</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead className="text-right w-28">Debit</TableHead>
                        <TableHead className="text-right w-28">
                          Credit
                        </TableHead>
                        <TableHead className="text-right w-32">
                          Balance
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening Balance Row */}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={4} className="font-medium">
                          Opening Balance
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            openingBalance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(openingBalance)}
                          {openingBalance >= 0 ? " Dr" : " Cr"}
                        </TableCell>
                      </TableRow>

                      {entriesWithBalance.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {format(
                              new Date(entry.transaction_date),
                              "dd/MM/yyyy"
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.legacy_tr_no || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getVoucherTypeLabel(entry.voucher_type_code)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {language === "ur" && entry.narration_urdu
                              ? entry.narration_urdu
                              : entry.narration || "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.debit_amount > 0 ? (
                              <span className="text-green-600 flex items-center justify-end gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                {formatCurrency(entry.debit_amount)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.credit_amount > 0 ? (
                              <span className="text-red-600 flex items-center justify-end gap-1">
                                <ArrowDownRight className="h-3 w-3" />
                                {formatCurrency(entry.credit_amount)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-medium ${
                              entry.balance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(entry.balance)}
                            {entry.balance >= 0 ? " Dr" : " Cr"}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(totalDebit)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(totalCredit)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            closingBalance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(closingBalance)}
                          {closingBalance >= 0 ? " Dr" : " Cr"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
