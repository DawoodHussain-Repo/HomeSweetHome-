"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
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
    const typeCode = VOUCHER_TYPE_CODES[voucherType];
    const prefix = voucherType.charAt(0).toUpperCase();
    const yearMonth = format(new Date(voucherDate), "yyyyMM");

    const { data } = await supabase
      .from("vouchers")
      .select("voucher_no")
      .eq("voucher_type", typeCode)
      .like("voucher_no", `${prefix}-${yearMonth}-%`)
      .order("voucher_no", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNo = data[0].voucher_no;
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

  // Update journal line
  const updateJournalLine = (
    id: string,
    field: keyof JournalLine,
    value: string | number
  ) => {
    setJournalLines(
      journalLines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
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
    }

    setSaving(true);
    setMessage(null);

    try {
      const voucherNo = await getNextVoucherNo();
      const typeCode = VOUCHER_TYPE_CODES[voucherType];
      const numAmount = parseFloat(amount) || 0;

      // Create voucher
      const { data: voucher, error: voucherError } = await supabase
        .from("vouchers")
        .insert({
          voucher_no: voucherNo,
          voucher_date: voucherDate,
          voucher_type: typeCode,
          narration: narration || null,
          total_amount:
            voucherType === "journal" ? journalTotals.debit : numAmount,
          status: "posted",
          created_by: userId,
        })
        .select()
        .single();

      if (voucherError) throw voucherError;

      // Create transactions
      const transactions: {
        voucher_id: string;
        account_id: string;
        debit_amount: number;
        credit_amount: number;
        narration: string | null;
      }[] = [];

      if (voucherType === "receipt") {
        // Cash Receipt: Debit Cash, Credit selected account
        transactions.push({
          voucher_id: voucher.id,
          account_id: cashAccount!.id,
          debit_amount: numAmount,
          credit_amount: 0,
          narration: narration || null,
        });
        transactions.push({
          voucher_id: voucher.id,
          account_id: selectedAccountId,
          debit_amount: 0,
          credit_amount: numAmount,
          narration: narration || null,
        });
      } else if (voucherType === "payment") {
        // Cash Payment: Credit Cash, Debit selected account
        transactions.push({
          voucher_id: voucher.id,
          account_id: selectedAccountId,
          debit_amount: numAmount,
          credit_amount: 0,
          narration: narration || null,
        });
        transactions.push({
          voucher_id: voucher.id,
          account_id: cashAccount!.id,
          debit_amount: 0,
          credit_amount: numAmount,
          narration: narration || null,
        });
      } else if (voucherType === "journal") {
        // Journal: Multiple lines as entered
        for (const line of journalLines) {
          if (line.accountId && (line.debit > 0 || line.credit > 0)) {
            transactions.push({
              voucher_id: voucher.id,
              account_id: line.accountId,
              debit_amount: line.debit || 0,
              credit_amount: line.credit || 0,
              narration: narration || null,
            });
          }
        }
      } else if (voucherType === "opening") {
        // Opening: Single entry based on amount sign
        if (numAmount > 0) {
          transactions.push({
            voucher_id: voucher.id,
            account_id: selectedAccountId,
            debit_amount: numAmount,
            credit_amount: 0,
            narration: narration || "Opening Balance",
          });
        } else {
          transactions.push({
            voucher_id: voucher.id,
            account_id: selectedAccountId,
            debit_amount: 0,
            credit_amount: Math.abs(numAmount),
            narration: narration || "Opening Balance",
          });
        }
      }

      const { error: txError } = await supabase
        .from("transactions")
        .insert(transactions);
      if (txError) throw txError;

      setMessage({
        type: "success",
        text: `Voucher ${voucherNo} saved successfully!`,
      });
      setLastVoucherNo(voucherNo);
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      setMessage({
        type: "error",
        text: "Failed to save voucher. Please try again.",
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please{" "}
            <a href="/login" className="underline font-medium">
              login
            </a>{" "}
            to create vouchers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voucher Entry</h1>
          <p className="text-muted-foreground">
            Create cash receipts, payments, and journal entries
          </p>
        </div>
        {lastVoucherNo && (
          <Badge variant="outline" className="text-sm py-1 px-3">
            Last: {lastVoucherNo}
          </Badge>
        )}
      </div>

      {/* Message Alert */}
      {message && (
        <Alert
          variant={message.type === "error" ? "destructive" : "default"}
          className={
            message.type === "success"
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : ""
          }
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {message.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Main Form Card */}
      <Card>
        <CardHeader className="pb-4">
          <Tabs
            value={voucherType}
            onValueChange={(v) => handleVoucherTypeChange(v as VoucherType)}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="receipt" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Receipt</span>
                <span className="sm:hidden">Receipt</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Payment</span>
                <span className="sm:hidden">Payment</span>
              </TabsTrigger>
              <TabsTrigger value="journal" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Journal Entry</span>
                <span className="sm:hidden">Journal</span>
              </TabsTrigger>
              <TabsTrigger value="opening" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Opening Balance</span>
                <span className="sm:hidden">Opening</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Common Fields: Date and Narration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voucherDate">Date</Label>
              <Input
                id="voucherDate"
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="narration">Narration / Description</Label>
              <Input
                id="narration"
                placeholder="Enter description..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Cash Receipt Form */}
          {voucherType === "receipt" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Cash Receipt:</strong> Money received into Cash
                  account from another account. Cash will be{" "}
                  <span className="font-semibold">debited</span>, and the
                  selected account will be{" "}
                  <span className="font-semibold">credited</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received From (Credit Account)</Label>
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
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {cashAccount && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Cash Account:{" "}
                    <span className="font-medium text-foreground">
                      {cashAccount.account_name}
                    </span>
                    <span className="ml-2 font-mono text-xs">
                      ({cashAccount.account_code})
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cash Payment Form */}
          {voucherType === "payment" && (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Cash Payment:</strong> Money paid from Cash account to
                  another account. The selected account will be{" "}
                  <span className="font-semibold">debited</span>, and Cash will
                  be <span className="font-semibold">credited</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paid To (Debit Account)</Label>
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
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {cashAccount && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Cash Account:{" "}
                    <span className="font-medium text-foreground">
                      {cashAccount.account_name}
                    </span>
                    <span className="ml-2 font-mono text-xs">
                      ({cashAccount.account_code})
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Journal Entry Form */}
          {voucherType === "journal" && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <strong>Journal Entry:</strong> Record transfers between any
                  accounts. Total debits must equal total credits.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Account</TableHead>
                    <TableHead className="w-[25%] text-right">Debit</TableHead>
                    <TableHead className="w-[25%] text-right">Credit</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <SearchableAccountSelect
                          value={line.accountId}
                          onValueChange={(id, account) => {
                            updateJournalLine(line.id, "accountId", id);
                            updateJournalLine(
                              line.id,
                              "accountName",
                              account?.account_name || ""
                            );
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
                          className="text-right"
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
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeJournalLine(line.id)}
                          disabled={journalLines.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {journalTotals.debit.toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {journalTotals.credit.toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addJournalLine}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>

                {!isJournalBalanced && journalTotals.debit > 0 && (
                  <Badge variant="destructive">
                    Difference:{" "}
                    {Math.abs(
                      journalTotals.debit - journalTotals.credit
                    ).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </Badge>
                )}
                {isJournalBalanced && journalTotals.debit > 0 && (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Balanced
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Opening Balance Form */}
          {voucherType === "opening" && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Opening Balance:</strong> Set initial balance for an
                  account. Positive amount = Debit balance, Negative amount =
                  Credit balance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account</Label>
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
                  <Label htmlFor="amount">Opening Balance</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00 (positive=debit, negative=credit)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button onClick={saveVoucher} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Voucher
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
