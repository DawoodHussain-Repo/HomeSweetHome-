"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  labelUrdu: string;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      labelUrdu: "ڈیش بورڈ",
    },
    {
      href: "/dashboard/accounts",
      icon: BookOpen,
      label: "Accounts",
      labelUrdu: "اکاؤنٹس",
    },
    {
      href: "/dashboard/vouchers",
      icon: FileText,
      label: "Vouchers",
      labelUrdu: "واؤچرز",
    },
    {
      href: "/dashboard/reports",
      icon: BarChart3,
      label: "Reports",
      labelUrdu: "رپورٹس",
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
      label: "Settings",
      labelUrdu: "سیٹنگز",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const label = language === "ur" ? item.labelUrdu : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-xl transition-all duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                  active && "bg-primary/20"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    active && "scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-medium truncate max-w-full text-center",
                  language === "ur" && "font-urdu"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
