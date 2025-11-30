"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Save,
  X,
  Receipt,
  CreditCard,
  FileText,
  BookOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SearchableAccountSelect } from "@/components/shared/SearchableAccountSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

type VoucherType = "receipt" | "payment" | "journal" | "opening";

const VOUCHER_TYPE_CODES: Record<VoucherType, number> = {
  receipt: 101,
  payment: 102,
  journal: 201,
  opening: 301,
};

export default function VouchersPage() {
  const supabase = createClient();

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [voucherType, setVoucherType] = useState<VoucherType>("receipt");
  const [voucherDate, setVoucherDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [narration, setNarration] = useState("");

  // Cash voucher state (receipt/payment)
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const [amount, setAmount] = useState("");

  // Journal voucher state
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { id: "1", accountId: "", accountName: "", debit: 0, credit: 0 },
    { id: "2", accountId: "", accountName: "", debit: 0, credit: 0 },
  ]);

  // Cash account
  const [cashAccount, setCashAccount] = useState<Account | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastVoucherNo, setLastVoucherNo] = useState<string | null>(null);

  // Check auth from localStorage on mount - check both storage keys
  useEffect(() => {
    // Try new auth key first
    const authData = localStorage.getItem("hisaab_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.userId) {
          setUserId(parsed.userId);
          setAuthChecked(true);
          return;
        }
      } catch {
        console.error("Failed to parse hisaab_auth");
      }
    }

    // Fallback to old user key
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.id) {
          setUserId(parsed.id);
          // Migrate to new format
          localStorage.setItem(
            "hisaab_auth",
            JSON.stringify({
              userId: parsed.id,
              email: parsed.email,
              name: parsed.name,
            })
          );
        }
      } catch {
        console.error("Failed to parse user data");
      }
    }

    setAuthChecked(true);
  }, []);

  // Fetch cash account
  useEffect(() => {
    const fetchCashAccount = async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, account_code, account_name, account_type")
        .or("account_name.ilike.%cash%,account_code.eq.100")
        .eq("is_header", false)
        .limit(1)
        .single();

      if (data) {
        setCashAccount(data);
      }
    };
    fetchCashAccount();
  }, [supabase]);

  // Get next voucher number
  const getNextVoucherNo = useCallback(async () => {
    const prefix = voucherType.charAt(0).toUpperCase();
    const yearMonth = format(new Date(voucherDate), "yyyyMM");

    const { data } = await supabase
      .from("transactions")
      .select("voucher_number")
      .like("voucher_number", `${prefix}-${yearMonth}-%`)
      .order("voucher_number", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0 && data[0].voucher_number) {
      const lastNo = data[0].voucher_number;
      const parts = lastNo.split("-");
      if (parts.length === 3) {
        nextNum = parseInt(parts[2], 10) + 1;
      }
    }

    return `${prefix}-${yearMonth}-${nextNum.toString().padStart(4, "0")}`;
  }, [supabase, voucherType, voucherDate]);

  // Reset form
  const resetForm = () => {
    setNarration("");
    setSelectedAccountId("");
    setSelectedAccountName("");
    setAmount("");
    setJournalLines([
      { id: "1", accountId: "", accountName: "", debit: 0, credit: 0 },
      { id: "2", accountId: "", accountName: "", debit: 0, credit: 0 },
    ]);
    setMessage(null);
    setLastVoucherNo(null);
  };

  // Handle voucher type change
  const handleVoucherTypeChange = (type: VoucherType) => {
    setVoucherType(type);
    resetForm();
  };

  // Add journal line
  const addJournalLine = () => {
    setJournalLines([
      ...journalLines,
      {
        id: Date.now().toString(),
        accountId: "",
        accountName: "",
        debit: 0,
        credit: 0,
      },
    ]);
  };

  // Remove journal line
  const removeJournalLine = (id: string) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((line) => line.id !== id));
    }
  };

  // Update journal line - supports single field or multiple fields
  const updateJournalLine = (
    id: string,
    fieldOrUpdates: keyof JournalLine | Partial<JournalLine>,
    value?: string | number
  ) => {
    setJournalLines((prevLines) =>
      prevLines.map((line) => {
        if (line.id !== id) return line;
        // If fieldOrUpdates is a string, it's a single field update
        if (typeof fieldOrUpdates === "string") {
          return { ...line, [fieldOrUpdates]: value };
        }
        // Otherwise it's a partial update object
        return { ...line, ...fieldOrUpdates };
      })
    );
  };

  // Calculate totals for journal
  const journalTotals = journalLines.reduce(
    (acc, line) => ({
      debit: acc.debit + (line.debit || 0),
      credit: acc.credit + (line.credit || 0),
    }),
    { debit: 0, credit: 0 }
  );

  const isJournalBalanced =
    Math.abs(journalTotals.debit - journalTotals.credit) < 0.01;

  // Save voucher
  const saveVoucher = async () => {
    if (!userId) {
      setMessage({ type: "error", text: "Please login to save vouchers" });
      return;
    }

    if (
      !cashAccount &&
      (voucherType === "receipt" || voucherType === "payment")
    ) {
      setMessage({
        type: "error",
        text: "Cash account not found. Please set up a Cash account.",
      });
      return;
    }

    // Validation
    if (voucherType === "receipt" || voucherType === "payment") {
      if (!selectedAccountId) {
        setMessage({ type: "error", text: "Please select an account" });
        return;
      }
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        setMessage({ type: "error", text: "Please enter a valid amount" });
        return;
      }
    } else if (voucherType === "journal") {
      const validLines = journalLines.filter(
        (l) => l.accountId && (l.debit > 0 || l.credit > 0)
      );
      if (validLines.length < 2) {
        setMessage({
          type: "error",
          text: "Journal entry needs at least 2 lines",
        });
        return;
      }
      if (!isJournalBalanced) {
        setMessage({ type: "error", text: "Debit and Credit must be equal" });
        return;
      }
    } else if (voucherType === "opening") {
      if (!selectedAccountId) {
        setMessage({ type: "error", text: "Please select an account" });
        return;
      }
      const numAmount = parseFloat(amount);
      if (numAmount === 0 || isNaN(numAmount)) {
        setMessage({
          type: "error",
          text: "Please enter a valid opening balance amount",
        });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      const voucherNo = await getNextVoucherNo();
      const typeCode = VOUCHER_TYPE_CODES[voucherType];
      const numAmount = parseFloat(amount) || 0;

      // Create transaction (voucher header) using voucher_type_code directly
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          transaction_date: voucherDate,
          voucher_type_code: typeCode,
          voucher_number: voucherNo,
          narration: narration || null,
          total_amount:
            voucherType === "journal" ? journalTotals.debit : numAmount,
          is_posted: true,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction details (line items)
      const details: {
        transaction_id: string;
        account_id: string;
        debit_amount: number;
        credit_amount: number;
        description: string | null;
        line_order: number;
      }[] = [];

      if (voucherType === "receipt") {
        // Cash Receipt: Debit Cash, Credit selected account
        details.push({
          transaction_id: transaction.id,
          account_id: cashAccount!.id,
          debit_amount: numAmount,
          credit_amount: 0,
          description: narration || null,
          line_order: 0,
        });
        details.push({
          transaction_id: transaction.id,
          account_id: selectedAccountId,
          debit_amount: 0,
          credit_amount: numAmount,
          description: narration || null,
          line_order: 1,
        });
      } else if (voucherType === "payment") {
        // Cash Payment: Credit Cash, Debit selected account
        details.push({
          transaction_id: transaction.id,
          account_id: selectedAccountId,
          debit_amount: numAmount,
          credit_amount: 0,
          description: narration || null,
          line_order: 0,
        });
        details.push({
          transaction_id: transaction.id,
          account_id: cashAccount!.id,
          debit_amount: 0,
          credit_amount: numAmount,
          description: narration || null,
          line_order: 1,
        });
      } else if (voucherType === "journal") {
        // Journal: Multiple lines as entered with account names
        journalLines.forEach((line, index) => {
          if (line.accountId && (line.debit > 0 || line.credit > 0)) {
            details.push({
              transaction_id: transaction.id,
              account_id: line.accountId,
              debit_amount: line.debit || 0,
              credit_amount: line.credit || 0,
              description: line.accountName || narration || null,
              line_order: index,
            });
          }
        });
      } else if (voucherType === "opening") {
        // Opening: Single entry based on amount sign
        if (numAmount > 0) {
          details.push({
            transaction_id: transaction.id,
            account_id: selectedAccountId,
            debit_amount: numAmount,
            credit_amount: 0,
            description: narration || "Opening Balance",
            line_order: 0,
          });
        } else {
          details.push({
            transaction_id: transaction.id,
            account_id: selectedAccountId,
            debit_amount: 0,
            credit_amount: Math.abs(numAmount),
            description: narration || "Opening Balance",
            line_order: 0,
          });
        }
      }

      const { error: detailsError } = await supabase
        .from("transaction_details")
        .insert(details);
      if (detailsError) throw detailsError;

      // Show success toast
      toast.success(`Voucher ${voucherNo} saved successfully!`, {
        description: `${
          voucherType.charAt(0).toUpperCase() + voucherType.slice(1)
        } voucher created`,
        duration: 4000,
      });

      setMessage({
        type: "success",
        text: `Voucher ${voucherNo} saved successfully!`,
      });
      setLastVoucherNo(voucherNo);
      resetForm();
    } catch (error: unknown) {
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        // Handle Supabase error objects
        const errObj = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };
        errorMessage =
          errObj.message || errObj.details || JSON.stringify(error);
        if (errObj.hint) errorMessage += ` (Hint: ${errObj.hint})`;
      }
      console.error("Save error:", errorMessage, error);

      // Show error toast
      toast.error("Failed to save voucher", {
        description: errorMessage,
        duration: 5000,
      });

      setMessage({
        type: "error",
        text: `Failed to save voucher: ${errorMessage}`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!userId) {
    return (
      <div className="p-6">
        <div className="spotlight-card bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">
                Authentication Required
              </h3>
              <p className="text-sm text-red-300/80 mt-1">
                Please{" "}
                <a
                  href="/login"
                  className="underline font-medium text-red-400 hover:text-red-300"
                >
                  login
                </a>{" "}
                to create vouchers.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight-custom">
            Voucher Entry
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Create cash receipts, payments, and journal entries
          </p>
        </div>
        {lastVoucherNo && (
          <div className="text-sm py-1 px-3 bg-secondary border border-border rounded-xl text-muted-foreground backdrop-blur-sm">
            Last: {lastVoucherNo}
          </div>
        )}
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={cn(
            "rounded-xl p-4 border backdrop-blur-sm",
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-red-500/10 border-red-500/20"
          )}
        >
          <div className="flex items-start gap-3">
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            )}
            <div>
              <h3
                className={cn(
                  "font-medium",
                  message.type === "success"
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {message.type === "success" ? "Success" : "Error"}
              </h3>
              <p
                className={cn(
                  "text-sm mt-1",
                  message.type === "success"
                    ? "text-emerald-300/80"
                    : "text-red-300/80"
                )}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="spotlight-card bg-card backdrop-blur-xl rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <Tabs
            value={voucherType}
            onValueChange={(v) => handleVoucherTypeChange(v as VoucherType)}
          >
            <TabsList className="grid w-full grid-cols-4 bg-secondary p-1 rounded-xl">
              <TabsTrigger
                value="receipt"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Receipt</span>
                <span className="sm:hidden">Receipt</span>
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Payment</span>
                <span className="sm:hidden">Payment</span>
              </TabsTrigger>
              <TabsTrigger
                value="journal"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Journal Entry</span>
                <span className="sm:hidden">Journal</span>
              </TabsTrigger>
              <TabsTrigger
                value="opening"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Opening Balance</span>
                <span className="sm:hidden">Opening</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="p-6 space-y-6">
          {/* Common Fields: Date and Narration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="voucherDate"
                className="text-foreground text-sm font-medium"
              >
                Date
              </Label>
              <Input
                id="voucherDate"
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="bg-background border-border text-foreground rounded-xl focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="narration"
                className="text-foreground text-sm font-medium"
              >
                Narration / Description
              </Label>
              <Input
                id="narration"
                placeholder="Enter description..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-ring"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Cash Receipt Form */}
          {voucherType === "receipt" && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  <strong>Cash Receipt:</strong> Money received into Cash
                  account from another account. Cash will be{" "}
                  <span className="font-semibold text-emerald-400">
                    debited
                  </span>
                  , and the selected account will be{" "}
                  <span className="font-semibold text-red-400">credited</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm font-medium">
                    Received From (Credit Account)
                  </Label>
                  <SearchableAccountSelect
                    value={selectedAccountId}
                    onValueChange={(id, account) => {
                      setSelectedAccountId(id);
                      setSelectedAccountName(account?.account_name || "");
                    }}
                    placeholder="Search and select account..."
                    excludeAccountId={cashAccount?.id}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-foreground text-sm font-medium"
                  >
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-ring"
                  />
                </div>
              </div>

              {cashAccount && (
                <div className="bg-secondary/50 p-3 rounded-xl border border-border flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Cash A/C:
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {cashAccount.account_name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cash Payment Form */}
          {voucherType === "payment" && (
            <div className="space-y-4">
              <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                <p className="text-sm text-orange-400">
                  <strong>Cash Payment:</strong> Money paid from Cash account to
                  another account. The selected account will be{" "}
                  <span className="font-semibold text-emerald-400">
                    debited
                  </span>
                  , and Cash will be{" "}
                  <span className="font-semibold text-red-400">credited</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm font-medium">
                    Paid To (Debit Account)
                  </Label>
                  <SearchableAccountSelect
                    value={selectedAccountId}
                    onValueChange={(id, account) => {
                      setSelectedAccountId(id);
                      setSelectedAccountName(account?.account_name || "");
                    }}
                    placeholder="Search and select account..."
                    excludeAccountId={cashAccount?.id}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-foreground text-sm font-medium"
                  >
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-ring"
                  />
                </div>
              </div>

              {cashAccount && (
                <div className="bg-secondary/50 p-3 rounded-xl border border-border flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Cash A/C:
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {cashAccount.account_name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Journal Entry Form */}
          {voucherType === "journal" && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                <p className="text-sm text-purple-400">
                  <strong>Journal Entry:</strong> Record transfers between any
                  accounts. Total debits must equal total credits.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-[40%] text-muted-foreground text-xs sm:text-sm">
                        Account
                      </TableHead>
                      <TableHead className="w-[25%] text-right text-muted-foreground text-xs sm:text-sm">
                        Debit
                      </TableHead>
                      <TableHead className="w-[25%] text-right text-muted-foreground text-xs sm:text-sm">
                        Credit
                      </TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalLines.map((line, index) => (
                      <TableRow
                        key={line.id}
                        className="border-border hover:bg-secondary/50"
                      >
                        <TableCell>
                          <SearchableAccountSelect
                            value={line.accountId}
                            onValueChange={(id, account) => {
                              updateJournalLine(line.id, {
                                accountId: id,
                                accountName: account?.account_name || "",
                              });
                            }}
                            placeholder="Select account..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={line.debit || ""}
                            onChange={(e) =>
                              updateJournalLine(
                                line.id,
                                "debit",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            className="text-right bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={line.credit || ""}
                            onChange={(e) =>
                              updateJournalLine(
                                line.id,
                                "credit",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            className="text-right bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeJournalLine(line.id)}
                            disabled={journalLines.length <= 2}
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-secondary/50 border-border font-medium">
                      <TableCell className="text-muted-foreground text-xs sm:text-sm">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-foreground text-xs sm:text-sm">
                        {journalTotals.debit.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-foreground text-xs sm:text-sm">
                        {journalTotals.credit.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addJournalLine}
                  className="border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>

                {!isJournalBalanced && journalTotals.debit > 0 && (
                  <div className="text-sm py-1 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    Difference:{" "}
                    {Math.abs(
                      journalTotals.debit - journalTotals.credit
                    ).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </div>
                )}
                {isJournalBalanced && journalTotals.debit > 0 && (
                  <div className="text-sm py-1 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Balanced
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opening Balance Form */}
          {voucherType === "opening" && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-sm text-emerald-400">
                  <strong>Opening Balance:</strong> Set initial balance for an
                  account. Positive amount ={" "}
                  <span className="font-semibold">Debit</span> balance, Negative
                  amount =<span className="font-semibold"> Credit</span>{" "}
                  balance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm font-medium">
                    Account
                  </Label>
                  <SearchableAccountSelect
                    value={selectedAccountId}
                    onValueChange={(id, account) => {
                      setSelectedAccountId(id);
                      setSelectedAccountName(account?.account_name || "");
                    }}
                    placeholder="Search and select account..."
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-foreground text-sm font-medium"
                  >
                    Opening Balance
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00 (positive=debit, negative=credit)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border" />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={resetForm}
              className="border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <button
              onClick={saveVoucher}
              disabled={saving}
              className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Voucher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
