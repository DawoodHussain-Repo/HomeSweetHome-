/**
 * Accounts Summary Component
 * Displays total accounts and transactions summary
 */

"use client";

import { useLanguage } from "@/context/LanguageContext";

interface AccountsSummaryProps {
  totalAccounts: number;
  totalTransactions: number;
}

export function AccountsSummary({
  totalAccounts,
  totalTransactions,
}: AccountsSummaryProps) {
  const { language } = useLanguage();

  return (
    <div className="spotlight-card rounded-2xl p-4 sm:p-6 relative overflow-hidden group">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-background/50 rounded-2xl opacity-50" />

      {/* Shine effect */}
      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-5 group-hover:animate-shine" />

      <div className="relative z-10 flex items-center gap-4">
        {/* Logo/Icon */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-border">
          <span className="font-bold tracking-widest text-foreground italic text-sm sm:text-base">
            {language === "ur" ? "حساب" : "Hisaab"}
          </span>
        </div>

        {/* Stats */}
        <div>
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {language === "ur" ? "کل اکاؤنٹس" : "Total Accounts"}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground">
            {totalAccounts}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-2">
            {totalTransactions.toLocaleString()}{" "}
            {language === "ur" ? "لین دین" : "transactions"}
          </div>
        </div>
      </div>
    </div>
  );
}
