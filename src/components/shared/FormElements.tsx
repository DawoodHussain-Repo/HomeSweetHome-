"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormInputProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  error,
  children,
  className,
}: FormInputProps) {
  return (
    <div className={className}>
      <label className="block text-xs sm:text-sm font-medium text-foreground mb-1">
        {label} {required && "*"}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full px-3 sm:px-4 py-2 border rounded-lg text-sm",
        "bg-background text-foreground border-border",
        "focus:ring-2 focus:ring-primary/50 focus:border-primary",
        "placeholder:text-muted-foreground",
        error && "border-red-500 focus:ring-red-500/50",
        className
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full px-3 sm:px-4 py-2 border rounded-lg text-sm",
        "bg-background text-foreground border-border",
        "focus:ring-2 focus:ring-primary/50 focus:border-primary",
        error && "border-red-500 focus:ring-red-500/50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface FormCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function FormCard({ title, children, className }: FormCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 sm:p-6 border border-border",
        className
      )}
    >
      {title && (
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

interface AlertProps {
  type: "error" | "success" | "warning" | "info";
  message: string;
  className?: string;
}

export function Alert({ type, message, className }: AlertProps) {
  const styles = {
    error: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    success:
      "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    warning:
      "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className={cn("p-3 border rounded-lg text-sm", styles[type], className)}
    >
      {message}
    </div>
  );
}
