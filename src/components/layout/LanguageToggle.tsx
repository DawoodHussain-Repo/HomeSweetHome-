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
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="w-10 h-10 rounded-full border border-border hover:bg-accent transition-colors"
      title={language === "en" ? "اردو" : "English"}
    >
      <Languages className="w-4 h-4 text-muted-foreground" />
    </Button>
  );
}
