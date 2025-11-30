/**
 * Dashboard Header Component
 * Displays total balance and quick action buttons
 */

"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export function DashboardHeader({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
}: DashboardHeaderProps) {
  const { language } = useLanguage();

  const netBalance = monthlyIncome - monthlyExpense;
  const netPercentage =
    monthlyIncome > 0 ? ((netBalance / monthlyIncome) * 100).toFixed(1) : "0";

  const formatFullAmount = (amount: number): string => {
    return Math.abs(amount).toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border pb-6 sm:pb-8">
      <div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-light tracking-tight text-foreground/80 mb-1">
          {language === "ur" ? "کل بیلنس" : "Total Balance"}
        </h1>
        <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
          <span className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Rs. {formatFullAmount(totalBalance)}
          </span>
          <Badge
            className={`ml-1 sm:ml-4 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border-0 ${
              netBalance >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {netBalance >= 0 ? "+" : ""}
            {netPercentage}%
          </Badge>
        </div>
      </div>

      <div className="flex gap-3 sm:gap-4">
        <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </button>
        <Button
          asChild
          className="px-4 sm:px-6 py-2 bg-white text-zinc-900 text-sm font-semibold rounded-full hover:bg-zinc-100 transition-all"
        >
          <Link href="/dashboard/vouchers">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {language === "ur" ? "نیا ووچر" : "New Voucher"}
            </span>
            <span className="sm:hidden">
              {language === "ur" ? "نیا" : "New"}
            </span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
