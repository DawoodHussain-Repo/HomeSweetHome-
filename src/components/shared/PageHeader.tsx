"use client";

import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

interface ActionButtonProps {
  onClick?: () => void;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export function ActionButton({
  onClick,
  icon: Icon,
  children,
  variant = "secondary",
  size = "md",
  disabled,
  loading,
  type = "button",
  className,
}: ActionButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary:
      "bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
    ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-2 rounded-xl transition-all font-medium",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}
