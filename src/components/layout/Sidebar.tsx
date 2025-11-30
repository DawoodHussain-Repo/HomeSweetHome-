"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  BookMarked,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarLogo } from "./SidebarLogo";
import { SidebarNav, NavItem } from "./SidebarNav";
import { LanguageToggle } from "./LanguageToggle";
import { UserMenu } from "./UserMenu";
import { MobileMenuButton } from "./MobileMenuButton";

interface SidebarProps {
  user: { email?: string; name?: string };
}

export default function Sidebar({ user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, isRTL } = useLanguage();

  const navItems: NavItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { href: "/dashboard/accounts", icon: BookOpen, label: t("nav.accounts") },
    { href: "/dashboard/vouchers", icon: FileText, label: t("nav.vouchers") },
    { href: "/dashboard/ledger", icon: BookMarked, label: t("nav.ledger") },
    { href: "/dashboard/reports", icon: BarChart3, label: t("nav.reports") },
    { href: "/dashboard/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <>
      <MobileMenuButton isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Carbon Style */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 z-40 w-64 bg-sidebar border-r border-sidebar-border",
          "flex flex-col justify-between py-8 overflow-x-hidden",
          "transform transition-transform duration-300 ease-in-out lg:transform-none",
          isRTL ? "right-0" : "left-0",
          isOpen
            ? "translate-x-0"
            : isRTL
            ? "translate-x-full lg:translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <SidebarLogo />

        {/* Navigation */}
        <SidebarNav items={navItems} onItemClick={() => setIsOpen(false)} />

        {/* Bottom Section */}
        <div className="space-y-2">
          {/* Theme & Language Toggles */}
          <div className="px-6 flex items-center justify-center gap-2 animate-in-left delay-200">
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* User Menu */}
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  );
}
