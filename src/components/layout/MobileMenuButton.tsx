"use client";

import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="lg:hidden fixed top-4 left-4 z-50"
    >
      {isOpen ? <X size={24} /> : <Menu size={24} />}
    </Button>
  );
}
