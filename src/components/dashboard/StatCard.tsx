"use client";

import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: string; up: boolean } | null;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "bg-primary",
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-lg", iconColor)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <span
              className={cn(
                "flex items-center text-sm font-medium",
                trend.up ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.up ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {trend.value}
            </span>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          <p className="text-muted-foreground text-sm mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
