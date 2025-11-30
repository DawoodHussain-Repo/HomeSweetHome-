/**
 * Recent Transactions List Component
 * Displays clickable list of recent transactions
 */

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowUpRight, ArrowDownRight, FileText } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: number;
  accountName: string;
  narration: string;
  amount: number;
  isDebit: boolean;
}

interface RecentTransactionsListProps {
  transactions: Transaction[];
  limit?: number;
}

const VOUCHER_TYPE_MAP: Record<
  number,
  { name: string; nameUrdu: string; isReceipt: boolean; isPayment: boolean }
> = {
  101: {
    name: "Cash Receipt",
    nameUrdu: "نقد وصولی",
    isReceipt: true,
    isPayment: false,
  },
  102: {
    name: "Cash Payment",
    nameUrdu: "نقد ادائیگی",
    isReceipt: false,
    isPayment: true,
  },
  201: {
    name: "Journal",
    nameUrdu: "جرنل",
    isReceipt: false,
    isPayment: false,
  },
  301: {
    name: "Opening",
    nameUrdu: "ابتدائی",
    isReceipt: false,
    isPayment: false,
  },
};

export function RecentTransactionsList({
  transactions,
  limit = 5,
}: RecentTransactionsListProps) {
  const { language } = useLanguage();

  const getVoucherTypeName = (code: number): string => {
    const type = VOUCHER_TYPE_MAP[code];
    if (!type) return `Voucher ${code}`;
    return language === "ur" ? type.nameUrdu : type.name;
  };

  const displayedTransactions = transactions.slice(0, limit);

  return (
    <div className="spotlight-card rounded-2xl p-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">
          {language === "ur" ? "حالیہ" : "Recent"}
        </h3>
        <Link
          href="/dashboard/reports"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          {language === "ur" ? "سب دیکھیں" : "View All"}
        </Link>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-border">
        {displayedTransactions.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-muted-foreground">
            <FileText
              className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 opacity-50"
              strokeWidth={1.5}
            />
            <p className="text-xs sm:text-sm">
              {language === "ur"
                ? "کوئی حالیہ لین دین نہیں"
                : "No recent transactions"}
            </p>
          </div>
        ) : (
          displayedTransactions.map((tx) => {
            const typeInfo = VOUCHER_TYPE_MAP[tx.voucherType];
            const isIncome = typeInfo?.isReceipt;
            const isExpense = typeInfo?.isPayment;

            return (
              <Link
                key={tx.id}
                href={`/dashboard/vouchers/${tx.id}`}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      isIncome
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : isExpense
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownRight
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        strokeWidth={1.5}
                      />
                    ) : isExpense ? (
                      <ArrowUpRight
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <FileText
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-foreground">
                      {getVoucherTypeName(tx.voucherType)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {tx.voucherNo || format(new Date(tx.date), "dd MMM")}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-xs sm:text-sm font-medium ${
                    isIncome
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isExpense
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  }`}
                >
                  {isIncome ? "+" : isExpense ? "-" : ""}Rs.
                  {tx.amount.toLocaleString()}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
