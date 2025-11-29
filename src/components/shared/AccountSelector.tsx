"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_name_urdu?: string;
  account_type: string;
  legacy_code?: number;
}

interface AccountSelectorProps {
  selectedAccountId: string | null;
  onAccountSelect: (account: Account | null) => void;
  label?: string;
  placeholder?: string;
  showAllOption?: boolean;
}

export function AccountSelector({
  selectedAccountId,
  onAccountSelect,
  label = "Select Account",
  placeholder = "Search accounts...",
  showAllOption = true,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    const { data, error } = await supabase
      .from("accounts")
      .select(
        "id, account_code, account_name, account_name_urdu, account_type, legacy_code"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("account_code");

    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  const filteredAccounts = accounts.filter((acc) => {
    const term = searchTerm.toLowerCase();
    return (
      acc.account_name.toLowerCase().includes(term) ||
      acc.account_code.toLowerCase().includes(term) ||
      (acc.account_name_urdu && acc.account_name_urdu.includes(searchTerm))
    );
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const getTypeColor = (type: string) => {
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
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedAccountId || "all"}
        onValueChange={(value) => {
          if (value === "all") {
            onAccountSelect(null);
          } else {
            const account = accounts.find((a) => a.id === value);
            onAccountSelect(account || null);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedAccountId && selectedAccount
              ? `${selectedAccount.account_code} - ${selectedAccount.account_name}`
              : showAllOption
              ? "All Accounts"
              : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="h-60">
            {showAllOption && <SelectItem value="all">All Accounts</SelectItem>}
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No accounts found
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {account.account_code}
                    </span>
                    <span>{account.account_name}</span>
                    <span
                      className={`text-xs ${getTypeColor(
                        account.account_type
                      )}`}
                    >
                      ({account.account_type})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
}
