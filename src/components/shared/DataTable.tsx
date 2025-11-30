"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render?: (item: T) => ReactNode;
  getValue?: (item: T) => string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  emptyMessage = "No data available",
  className,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl", className)}>
      <table className="w-full min-w-[300px]">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground",
                  col.hideOnMobile && "hidden sm:table-cell",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "hover:bg-secondary/30 transition-colors",
                onRowClick && "cursor-pointer",
                rowClassName?.(item)
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 px-3 sm:px-4 text-xs sm:text-sm text-foreground",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(item)
                    : col.getValue
                    ? col.getValue(item)
                    : (item as Record<string, unknown>)[col.key]?.toString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TableCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function TableCard({
  title,
  description,
  actions,
  children,
  className,
}: TableCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-4 sm:p-6",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            {title && (
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

interface AmountCellProps {
  amount: number;
  type?: "debit" | "credit" | "auto";
  showSign?: boolean;
}

export function AmountCell({
  amount,
  type = "auto",
  showSign = false,
}: AmountCellProps) {
  const isPositive = type === "credit" || (type === "auto" && amount >= 0);
  const displayAmount = Math.abs(amount).toLocaleString("en-PK");

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      {showSign && (isPositive ? "+" : "-")}
      Rs. {displayAmount}
    </span>
  );
}

interface BadgeCellProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function BadgeCell({
  children,
  variant = "default",
  className,
}: BadgeCellProps) {
  const variants = {
    default: "bg-secondary text-foreground",
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    error: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
