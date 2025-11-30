"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";

interface UserMenuProps {
  user: { email?: string; name?: string };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
    router.push("/login");
    router.refresh();
  };

  const initials =
    user?.name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    "U";

  return (
    <div className="px-6 py-4 animate-in-left delay-300">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-zinc-500 to-zinc-700 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">
                {user?.name || "User"}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {user?.email || "Premium Plan"}
              </div>
            </div>
            <ChevronDown
              size={14}
              className="text-muted-foreground flex-shrink-0"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t("nav.logout")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
