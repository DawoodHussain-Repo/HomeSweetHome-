"use client";

import { useLanguage } from "@/context/LanguageContext";

export function SidebarLogo() {
  const { language } = useLanguage();

  return (
    <div className="p-6 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-xl">📒</span>
        </div>
        <div>
          <h1 className="font-bold text-foreground">
            {language === "ur" ? "حساب کتاب" : "Hisaab Kitaab"}
          </h1>
          <p className="text-xs text-muted-foreground">Accounting System</p>
        </div>
      </div>
    </div>
  );
}
