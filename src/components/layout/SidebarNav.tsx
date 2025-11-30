"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface SidebarNavProps {
  items: NavItem[];
  onItemClick?: () => void;
}

export function SidebarNav({ items, onItemClick }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
      {items.map((item, index) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn("nav-link animate-in-left", isActive && "active")}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
