"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ur" : "en");
  };

  return (
    <div className="p-4 border-t border-border">
      <Button
        variant="ghost"
        onClick={toggleLanguage}
        className="w-full justify-center gap-2"
      >
        <Languages size={20} />
        <span>{language === "en" ? "اردو" : "English"}</span>
      </Button>
    </div>
  );
}
