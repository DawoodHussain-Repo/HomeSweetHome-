"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface QuickAction {
  title: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

interface QuickActionsCardProps {
  title: string;
  actions: QuickAction[];
}

export function QuickActionsCard({ title, actions }: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className={cn("p-3 rounded-full", action.color)}>
                <action.icon size={20} />
              </div>
              <span className="text-sm font-medium text-foreground text-center">
                {action.title}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
