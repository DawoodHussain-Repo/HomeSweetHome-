"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type DatePreset = "today" | "month" | "year" | "custom";

interface DateRangeSelectorProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
}

export function DateRangeSelector({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  preset,
  onPresetChange,
}: DateRangeSelectorProps) {
  const today = new Date();

  const handlePresetClick = (newPreset: DatePreset) => {
    onPresetChange(newPreset);

    switch (newPreset) {
      case "today":
        const todayStr = format(today, "yyyy-MM-dd");
        onFromDateChange(todayStr);
        onToDateChange(todayStr);
        break;
      case "month":
        onFromDateChange(format(startOfMonth(today), "yyyy-MM-dd"));
        onToDateChange(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      case "year":
        onFromDateChange(format(startOfYear(today), "yyyy-MM-dd"));
        onToDateChange(format(endOfYear(today), "yyyy-MM-dd"));
        break;
      case "custom":
        // Keep current values for custom
        break;
    }
  };

  const presets: { key: DatePreset; label: string; icon: typeof Calendar }[] = [
    { key: "today", label: "Today", icon: Calendar },
    { key: "month", label: "This Month", icon: CalendarDays },
    { key: "year", label: "This Year", icon: CalendarRange },
  ];

  return (
    <div className="space-y-3">
      {/* Preset Toggles */}
      <div className="flex flex-wrap gap-2">
        {presets.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={preset === key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(key)}
            className={cn(
              "gap-2",
              preset === key && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
        <Button
          variant={preset === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick("custom")}
          className={cn(
            preset === "custom" && "bg-primary text-primary-foreground"
          )}
        >
          Custom Range
        </Button>
      </div>

      {/* Date Inputs */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label htmlFor="fromDate" className="text-xs text-muted-foreground">
            From Date
          </Label>
          <Input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => {
              onFromDateChange(e.target.value);
              onPresetChange("custom");
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="toDate" className="text-xs text-muted-foreground">
            To Date
          </Label>
          <Input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => {
              onToDateChange(e.target.value);
              onPresetChange("custom");
            }}
            className="w-40"
          />
        </div>
      </div>
    </div>
  );
}
