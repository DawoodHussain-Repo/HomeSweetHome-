"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
}

interface SearchableAccountSelectProps {
  value: string;
  onValueChange: (value: string, account: Account | null) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeAccountId?: string;
  className?: string;
}

export function SearchableAccountSelect({
  value,
  onValueChange,
  placeholder = "Select account...",
  disabled = false,
  excludeAccountId,
  className,
}: SearchableAccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase
        .from("accounts")
        .select(
          "id, account_code, account_name, account_name_urdu, account_type"
        )
        .eq("is_header", false)
        .order("account_code");
      setAccounts(data || []);
      setLoading(false);
    };
    fetchAccounts();
  }, [supabase]);

  const filteredAccounts = useMemo(() => {
    if (!excludeAccountId) return accounts;
    return accounts.filter((a) => a.id !== excludeAccountId);
  }, [accounts, excludeAccountId]);

  const selectedAccount = accounts.find((a) => a.id === value);

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "asset":
        return "text-blue-600";
      case "liability":
        return "text-red-600";
      case "equity":
        return "text-purple-600";
      case "income":
        return "text-green-600";
      case "expense":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selectedAccount ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs text-muted-foreground">
                {selectedAccount.account_code}
              </span>
              <span className="truncate">{selectedAccount.account_name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search account by name or code..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.account_code} ${account.account_name}`}
                  onSelect={() => {
                    onValueChange(account.id, account);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {account.account_code}
                      </span>
                      <span>{account.account_name}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs capitalize",
                        getAccountTypeColor(account.account_type)
                      )}
                    >
                      {account.account_type}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
