/**
 * Quick Actions Component
 * Displays quick action buttons for common operations
 */

"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  BookOpen,
  BarChart3,
} from "lucide-react";

interface QuickAction {
  href: string;
  icon: React.ElementType;
  label: string;
  labelUrdu: string;
  color: string;
  bgColor: string;
  hoverBg: string;
  borderColor: string;
}

const actions: QuickAction[] = [
  {
    href: "/dashboard/vouchers?type=receipt",
    icon: TrendingUp,
    label: "Receipt",
    labelUrdu: "وصولی",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    hoverBg: "group-hover:bg-emerald-500/30",
    borderColor: "group-hover:border-emerald-500/50",
  },
  {
    href: "/dashboard/vouchers?type=payment",
    icon: TrendingDown,
    label: "Payment",
    labelUrdu: "ادائیگی",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    hoverBg: "group-hover:bg-red-500/30",
    borderColor: "group-hover:border-red-500/50",
  },
  {
    href: "/dashboard/vouchers?type=journal",
    icon: FileText,
    label: "Journal",
    labelUrdu: "جرنل",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    hoverBg: "group-hover:bg-purple-500/30",
    borderColor: "group-hover:border-purple-500/50",
  },
  {
    href: "/dashboard/accounts",
    icon: Users,
    label: "Accounts",
    labelUrdu: "اکاؤنٹس",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    hoverBg: "group-hover:bg-blue-500/30",
    borderColor: "group-hover:border-blue-500/50",
  },
  {
    href: "/dashboard/ledger",
    icon: BookOpen,
    label: "Ledger",
    labelUrdu: "لیجر",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    hoverBg: "group-hover:bg-amber-500/30",
    borderColor: "group-hover:border-amber-500/50",
  },
  {
    href: "/dashboard/reports",
    icon: BarChart3,
    label: "Reports",
    labelUrdu: "رپورٹس",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    hoverBg: "group-hover:bg-cyan-500/30",
    borderColor: "group-hover:border-cyan-500/50",
  },
];

export function QuickActions() {
  const { language } = useLanguage();

  return (
    <div className="spotlight-card rounded-2xl p-4 sm:p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {language === "ur" ? "فوری کارروائیاں" : "Quick Actions"}
      </h3>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 min-w-[60px] sm:min-w-[70px] cursor-pointer group"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${action.bgColor} ${action.hoverBg} flex items-center justify-center transition-all border border-transparent ${action.borderColor}`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${action.color}`}
                  strokeWidth={1.5}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center">
                {language === "ur" ? action.labelUrdu : action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
