"use client";

import { useLanguage } from "@/context/LanguageContext";

export function SidebarLogo() {
  const { language } = useLanguage();

  return (
    <div className="px-8 py-6 mb-8 animate-in-left">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] dark:shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        <span className="font-bold text-xl tracking-tight-custom text-foreground">
          {language === "ur" ? "حساب کتاب" : "Hisaab"}
        </span>
      </div>
    </div>
  );
}
