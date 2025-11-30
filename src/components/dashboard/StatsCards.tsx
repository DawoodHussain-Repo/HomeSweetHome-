/**
 * Stats Cards Component
 * Displays monthly income and expense with progress bars
 */

"use client";

import { useLanguage } from "@/context/LanguageContext";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/api/utils";

interface StatsCardsProps {
  monthlyIncome: number;
  monthlyExpense: number;
}

export function StatsCards({ monthlyIncome, monthlyExpense }: StatsCardsProps) {
  const { language } = useLanguage();
  const total = monthlyIncome + monthlyExpense || 1;

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {/* Monthly Income */}
      <div className="spotlight-card rounded-2xl p-4 sm:p-6">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
          {language === "ur" ? "ماہانہ آمدنی" : "Monthly Income"}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(monthlyIncome)}
          </span>
          <ArrowUpRight
            className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400"
            strokeWidth={1.5}
          />
        </div>
        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-3 sm:mt-4">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((monthlyIncome / total) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Monthly Expense */}
      <div className="spotlight-card rounded-2xl p-4 sm:p-6">
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
          {language === "ur" ? "ماہانہ اخراجات" : "Monthly Expense"}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(monthlyExpense)}
          </span>
          <ArrowDownRight
            className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 dark:text-red-400"
            strokeWidth={1.5}
          />
        </div>
        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-3 sm:mt-4">
          <div
            className="bg-red-500 h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((monthlyExpense / total) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
