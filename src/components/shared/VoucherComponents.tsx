"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableAccountSelect } from "@/components/shared/SearchableAccountSelect";
import { Plus, X, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Info box for voucher types
interface VoucherInfoBoxProps {
  variant: "blue" | "orange" | "purple" | "emerald";
  children: ReactNode;
}

export function VoucherInfoBox({ variant, children }: VoucherInfoBoxProps) {
  const variants = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  };

  return (
    <div className={cn("p-4 rounded-xl border text-sm", variants[variant])}>
      {children}
    </div>
  );
}

// Account amount fields for cash vouchers
interface CashVoucherFieldsProps {
  label: string;
  selectedAccountId: string;
  onAccountChange: (
    id: string,
    account: { account_name: string } | null
  ) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  excludeAccountId?: string;
  amountPlaceholder?: string;
  allowNegative?: boolean;
}

export function CashVoucherFields({
  label,
  selectedAccountId,
  onAccountChange,
  amount,
  onAmountChange,
  excludeAccountId,
  amountPlaceholder = "0.00",
  allowNegative = false,
}: CashVoucherFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-foreground text-sm font-medium">{label}</Label>
        <SearchableAccountSelect
          value={selectedAccountId}
          onValueChange={onAccountChange}
          placeholder="Search and select account..."
          excludeAccountId={excludeAccountId}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-foreground text-sm font-medium">
          {allowNegative ? "Opening Balance" : "Amount"}
        </Label>
        <Input
          id="amount"
          type="number"
          placeholder={amountPlaceholder}
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          min={allowNegative ? undefined : "0"}
          step="0.01"
          className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-ring"
        />
      </div>
    </div>
  );
}

// Cash account display
interface CashAccountDisplayProps {
  accountName: string;
}

export function CashAccountDisplay({ accountName }: CashAccountDisplayProps) {
  return (
    <div className="bg-secondary/50 p-3 rounded-xl border border-border flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Cash A/C:</span>
      <span className="text-sm font-medium text-foreground">{accountName}</span>
    </div>
  );
}

// Journal line type
export interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

// Journal entry table
interface JournalTableProps {
  lines: JournalLine[];
  onLineUpdate: (id: string, updates: Partial<JournalLine>) => void;
  onLineRemove: (id: string) => void;
  onAddLine: () => void;
  totals: { debit: number; credit: number };
  isBalanced: boolean;
}

export function JournalTable({
  lines,
  onLineUpdate,
  onLineRemove,
  onAddLine,
  totals,
  isBalanced,
}: JournalTableProps) {
  return (
    <div className="space-y-4">
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
            {lines.map((line) => (
              <TableRow
                key={line.id}
                className="border-border hover:bg-secondary/50"
              >
                <TableCell>
                  <SearchableAccountSelect
                    value={line.accountId}
                    onValueChange={(id, account) => {
                      onLineUpdate(line.id, {
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
                      onLineUpdate(line.id, {
                        debit: parseFloat(e.target.value) || 0,
                      })
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
                      onLineUpdate(line.id, {
                        credit: parseFloat(e.target.value) || 0,
                      })
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
                    onClick={() => onLineRemove(line.id)}
                    disabled={lines.length <= 2}
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
                {totals.debit.toLocaleString("en-PK", {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right text-foreground text-xs sm:text-sm">
                {totals.credit.toLocaleString("en-PK", {
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
          onClick={onAddLine}
          className="border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>

        {!isBalanced && totals.debit > 0 && (
          <div className="text-sm py-1 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            Difference:{" "}
            {Math.abs(totals.debit - totals.credit).toLocaleString("en-PK", {
              minimumFractionDigits: 2,
            })}
          </div>
        )}
        {isBalanced && totals.debit > 0 && (
          <div className="text-sm py-1 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Balanced
          </div>
        )}
      </div>
    </div>
  );
}

// Status message component
interface StatusMessageProps {
  type: "success" | "error";
  text: string;
}

export function StatusMessage({ type, text }: StatusMessageProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border backdrop-blur-sm",
        type === "success"
          ? "bg-emerald-500/10 border-emerald-500/20"
          : "bg-red-500/10 border-red-500/20"
      )}
    >
      <div className="flex items-start gap-3">
        {type === "success" ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
        ) : (
          <X className="h-5 w-5 text-red-400 mt-0.5" />
        )}
        <div>
          <h3
            className={cn(
              "font-medium",
              type === "success" ? "text-emerald-400" : "text-red-400"
            )}
          >
            {type === "success" ? "Success" : "Error"}
          </h3>
          <p
            className={cn(
              "text-sm mt-1",
              type === "success" ? "text-emerald-300/80" : "text-red-300/80"
            )}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
