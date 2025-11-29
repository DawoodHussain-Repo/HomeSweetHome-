"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { format } from "date-fns";
import {
  Plus,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  FileText,
  RefreshCw,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
}

interface VoucherType {
  id: string;
  code: number;
  title: string;
  title_urdu?: string;
  prefix: string;
}

interface VoucherLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export default function VouchersPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [, setVoucherTypes] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Form state
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>(
    initialType || "101"
  );
  const [voucherDate, setVoucherDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState<VoucherLine[]>([
    {
      id: "1",
      accountId: "",
      accountName: "",
      debit: 0,
      credit: 0,
      description: "",
    },
    {
      id: "2",
      accountId: "",
      accountName: "",
      debit: 0,
      credit: 0,
      description: "",
    },
  ]);

  // Tips section
  const [showTips, setShowTips] = useState(true);

  useLanguage();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialType) {
      setSelectedVoucherType(initialType);
    }
  }, [initialType]);

  const fetchData = async () => {
    setLoading(true);

    const [accountsRes, typesRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("is_header", false)
        .order("account_code"),
      supabase.from("voucher_types").select("*").order("code"),
    ]);

    setAccounts(accountsRes.data || []);
    setVoucherTypes(typesRes.data || []);
    setLoading(false);
  };

  const getVoucherTypeInfo = useCallback(() => {
    const code = parseInt(selectedVoucherType);
    switch (code) {
      case 101:
        return {
          title: "Cash Receipt",
          titleUrdu: "نقد وصولی",
          icon: TrendingUp,
          color: "text-green-600",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          description:
            "Record money received in cash. Debit Cash, Credit the source account.",
        };
      case 102:
        return {
          title: "Cash Payment",
          titleUrdu: "نقد ادائیگی",
          icon: TrendingDown,
          color: "text-red-600",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          description:
            "Record cash paid out. Credit Cash, Debit the expense/payee account.",
        };
      case 201:
        return {
          title: "Journal Entry",
          titleUrdu: "جنرل اندراج",
          icon: FileText,
          color: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          description:
            "General purpose entry for transfers and adjustments. Debits must equal credits.",
        };
      case 301:
        return {
          title: "Opening Balance",
          titleUrdu: "ابتدائی بیلنس",
          icon: RefreshCw,
          color: "text-purple-600",
          bgColor: "bg-purple-100 dark:bg-purple-900/30",
          description:
            "Record opening balances for accounts at the start of a period.",
        };
      default:
        return {
          title: `Voucher ${code}`,
          titleUrdu: "",
          icon: FileText,
          color: "text-gray-600",
          bgColor: "bg-gray-100 dark:bg-gray-900/30",
          description: "Custom voucher entry.",
        };
    }
  }, [selectedVoucherType]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Date.now().toString(),
        accountId: "",
        accountName: "",
        debit: 0,
        credit: 0,
        description: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (
    id: string,
    field: keyof VoucherLine,
    value: string | number
  ) => {
    setLines(
      lines.map((l) => {
        if (l.id === id) {
          const updated = { ...l, [field]: value };
          // If account changes, update account name
          if (field === "accountId") {
            const account = accounts.find((a) => a.id === value);
            updated.accountName = account?.account_name || "";
          }
          return updated;
        }
        return l;
      })
    );
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const resetForm = () => {
    setNarration("");
    setLines([
      {
        id: "1",
        accountId: "",
        accountName: "",
        debit: 0,
        credit: 0,
        description: "",
      },
      {
        id: "2",
        accountId: "",
        accountName: "",
        debit: 0,
        credit: 0,
        description: "",
      },
    ]);
  };

  const saveVoucher = async () => {
    if (!isBalanced) {
      alert("Debit and Credit must be equal!");
      return;
    }

    const validLines = lines.filter(
      (l) => l.accountId && (l.debit || l.credit)
    );
    if (validLines.length < 2) {
      alert("Please add at least 2 account lines with amounts");
      return;
    }

    setSaving(true);

    try {
      // Get user ID from localStorage
      const authData = localStorage.getItem("hisaab_auth");
      const userId = authData ? JSON.parse(authData).userId : null;

      if (!userId) {
        alert("Please login again");
        setSaving(false);
        return;
      }

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          voucher_type_code: parseInt(selectedVoucherType),
          transaction_date: voucherDate,
          narration: narration,
          total_amount: totalDebit,
          is_posted: false,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction details
      const details = validLines.map((line) => ({
        transaction_id: transaction.id,
        account_id: line.accountId,
        debit_amount: line.debit || 0,
        credit_amount: line.credit || 0,
        description: line.description || null,
      }));

      const { error: detailsError } = await supabase
        .from("transaction_details")
        .insert(details);

      if (detailsError) throw detailsError;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving voucher. Please try again.");
    }

    setSaving(false);
  };

  const voucherInfo = getVoucherTypeInfo();
  const VoucherIcon = voucherInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {showSuccess && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <span>Voucher saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Voucher Entry</h1>
          <p className="text-muted-foreground mt-1">
            Create new transaction vouchers
          </p>
        </div>
      </div>

      {/* Voucher Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            code: "101",
            title: "Cash Receipt",
            urdu: "نقد وصولی",
            icon: TrendingUp,
            color: "green",
          },
          {
            code: "102",
            title: "Cash Payment",
            urdu: "نقد ادائیگی",
            icon: TrendingDown,
            color: "red",
          },
          {
            code: "201",
            title: "Journal",
            urdu: "جنرل",
            icon: FileText,
            color: "blue",
          },
          {
            code: "301",
            title: "Opening",
            urdu: "ابتدائی",
            icon: RefreshCw,
            color: "purple",
          },
        ].map((vt) => (
          <button
            key={vt.code}
            onClick={() => setSelectedVoucherType(vt.code)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedVoucherType === vt.code
                ? `border-${vt.color}-500 bg-${vt.color}-50 dark:bg-${vt.color}-900/20`
                : "border-border hover:border-muted-foreground/50"
            }`}
          >
            <vt.icon
              className={`h-8 w-8 mx-auto mb-2 ${
                selectedVoucherType === vt.code
                  ? `text-${vt.color}-600`
                  : "text-muted-foreground"
              }`}
            />
            <p className="font-medium text-sm">{vt.title}</p>
            <p className="text-xs text-muted-foreground" dir="rtl">
              {vt.urdu}
            </p>
          </button>
        ))}
      </div>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${voucherInfo.bgColor}`}>
                <VoucherIcon className={`h-6 w-6 ${voucherInfo.color}`} />
              </div>
              <div>
                <CardTitle>{voucherInfo.title}</CardTitle>
                {voucherInfo.titleUrdu && (
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {voucherInfo.titleUrdu}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1">
              New
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Narration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="narration">Narration / Description</Label>
              <Input
                id="narration"
                placeholder="Enter transaction description..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Tips */}
          <Collapsible open={showTips} onOpenChange={setShowTips}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  💡 Quick Tips for {voucherInfo.title}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showTips ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground mt-2">
                {voucherInfo.description}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Account Lines */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-32">Debit</TableHead>
                  <TableHead className="text-right w-32">Credit</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select
                        value={line.accountId}
                        onValueChange={(val) =>
                          updateLine(line.id, "accountId", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <span className="font-mono text-xs mr-2">
                                {acc.account_code}
                              </span>
                              {acc.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Line description"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.id, "description", e.target.value)
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.debit || ""}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "debit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="text-right h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.credit || ""}
                        onChange={(e) =>
                          updateLine(
                            line.id,
                            "credit",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="text-right h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 2}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    Rs.{" "}
                    {totalDebit.toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    Rs.{" "}
                    {totalCredit.toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Add Line Button */}
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-2" />
            Add Line
          </Button>

          {/* Balance Status */}
          <div
            className={`p-4 rounded-lg flex items-center justify-between ${
              isBalanced
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <span>Voucher is balanced</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5" />
                  <span>
                    Difference: Rs.{" "}
                    {Math.abs(totalDebit - totalCredit).toLocaleString(
                      "en-PK",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </>
              )}
            </div>
            <span className="text-sm">
              Debit: Rs. {totalDebit.toLocaleString()} | Credit: Rs.{" "}
              {totalCredit.toLocaleString()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button onClick={saveVoucher} disabled={saving || !isBalanced}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Voucher"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
