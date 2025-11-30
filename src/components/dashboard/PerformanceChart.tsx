/**
 * Performance Chart Component
 * Displays monthly income/expense bar chart
 */

"use client";

import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatCurrency } from "@/lib/api/utils";
import type { MonthlyData } from "@/types";

interface PerformanceChartProps {
  data: MonthlyData[];
  className?: string;
}

export function PerformanceChart({
  data,
  className = "",
}: PerformanceChartProps) {
  const { language } = useLanguage();

  const maxValue = useMemo(() => {
    return Math.max(...data.map((m) => Math.max(m.income, m.expense)), 1);
  }, [data]);

  const hasData = data.some((m) => m.income > 0 || m.expense > 0);

  return (
    <div
      className={`spotlight-card rounded-2xl p-4 sm:p-6 h-72 sm:h-80 relative ${className}`}
    >
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {language === "ur" ? "کارکردگی" : "Performance"}
          </h3>
          {!hasData && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              {language === "ur" ? "کوئی ڈیٹا نہیں" : "No data available"}
            </p>
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">
              {language === "ur" ? "آمدنی" : "Income"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-muted-foreground">
              {language === "ur" ? "اخراجات" : "Expense"}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 h-44 sm:h-52 flex items-end justify-around gap-1 sm:gap-2 pt-4">
        {data.map((m, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center group">
            {/* Tooltip */}
            <div className="hidden group-hover:block absolute -top-2 left-1/2 transform -translate-x-1/2 bg-card border border-border rounded-lg px-3 py-2 text-xs z-20 whitespace-nowrap shadow-lg">
              <div className="font-medium text-foreground mb-1">{m.month}</div>
              <div className="text-emerald-600 dark:text-emerald-400">
                {language === "ur" ? "آمدنی" : "Income"}:{" "}
                {formatCurrency(m.income)}
              </div>
              <div className="text-red-600 dark:text-red-400">
                {language === "ur" ? "اخراجات" : "Expense"}:{" "}
                {formatCurrency(m.expense)}
              </div>
            </div>

            {/* Bars */}
            <div className="w-full flex gap-0.5 sm:gap-1 justify-center items-end h-36 sm:h-44">
              {/* Income Bar */}
              <div
                className="w-3 sm:w-6 bg-emerald-500/80 hover:bg-emerald-500 rounded-t transition-all duration-500 cursor-pointer"
                style={{
                  height: hasData
                    ? `${Math.max(
                        (m.income / maxValue) * 100,
                        m.income > 0 ? 3 : 0
                      )}%`
                    : "0%",
                  animationDelay: `${idx * 100}ms`,
                }}
                title={`${
                  language === "ur" ? "آمدنی" : "Income"
                }: ${formatCurrency(m.income)}`}
              />
              {/* Expense Bar */}
              <div
                className="w-3 sm:w-6 bg-red-500/80 hover:bg-red-500 rounded-t transition-all duration-500 cursor-pointer"
                style={{
                  height: hasData
                    ? `${Math.max(
                        (m.expense / maxValue) * 100,
                        m.expense > 0 ? 3 : 0
                      )}%`
                    : "0%",
                  animationDelay: `${idx * 100}ms`,
                }}
                title={`${
                  language === "ur" ? "اخراجات" : "Expense"
                }: ${formatCurrency(m.expense)}`}
              />
            </div>

            {/* Month Label */}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 font-medium">
              {m.monthShort}
            </p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground/60">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm">
              {language === "ur"
                ? "آمدنی/اخراجات کے لین دین شامل کریں"
                : "Add income/expense transactions"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
