"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Repeat,
  X,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RecurrenceFrequency, RecurrenceRule } from "../types";
import {
  formatLocalDateToISO,
  formatRecurrenceLabel,
  parseLocalDate,
} from "./recurrence";

const WEEKDAYS = [
  { label: "S", value: 0 },
  { label: "M", value: 1 },
  { label: "T", value: 2 },
  { label: "W", value: 3 },
  { label: "T", value: 4 },
  { label: "F", value: 5 },
  { label: "S", value: 6 },
];

export interface TaskDatePickerProps {
  due: string;
  dueTime?: string;
  recurrence?: RecurrenceRule;
  onDueDateChange: (due: string) => void;
  onDueTimeChange: (dueTime?: string) => void;
  onRecurrenceChange: (recurrence?: RecurrenceRule) => void;
  disabled?: boolean;
}

export function TaskDatePicker({
  due,
  dueTime,
  recurrence,
  onDueDateChange,
  onDueTimeChange,
  onRecurrenceChange,
  disabled,
}: TaskDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [showRecurrenceEditor, setShowRecurrenceEditor] = React.useState(false);

  // Quick preset dates
  const todayIso = formatLocalDateToISO(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = formatLocalDateToISO(tomorrow);

  const nextWeek = new Date();
  const daysUntilNextMonday = ((1 + 7 - nextWeek.getDay()) % 7) || 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilNextMonday);
  const nextWeekIso = formatLocalDateToISO(nextWeek);

  const currentIso = due ? formatLocalDateToISO(parseLocalDate(due)) : "";

  function handlePreset(iso: string) {
    onDueDateChange(iso);
  }

  function handleClearDate(e: React.MouseEvent) {
    e.stopPropagation();
    onDueDateChange("");
    onDueTimeChange(undefined);
    onRecurrenceChange(undefined);
    setShowRecurrenceEditor(false);
  }

  function handleFrequencyChange(freq: RecurrenceFrequency | "none") {
    if (freq === "none") {
      onRecurrenceChange(undefined);
      setShowRecurrenceEditor(false);
      return;
    }

    const nextRule: RecurrenceRule = {
      frequency: freq,
      interval: recurrence?.interval ?? 1,
      neverEnds: true,
      ...(freq === "weekly" ? { weekdays: recurrence?.weekdays ?? [new Date().getDay()] } : {}),
      ...(freq === "monthly" ? { monthDay: recurrence?.monthDay ?? new Date().getDate() } : {}),
    };

    onRecurrenceChange(nextRule);
  }

  function toggleWeekday(dayValue: number) {
    if (!recurrence || recurrence.frequency !== "weekly") return;
    const currentDays = recurrence.weekdays ?? [];
    let updated: number[];
    if (currentDays.includes(dayValue)) {
      if (currentDays.length <= 1) return; // Keep at least one
      updated = currentDays.filter((d) => d !== dayValue);
    } else {
      updated = [...currentDays, dayValue].sort((a, b) => a - b);
    }
    onRecurrenceChange({
      ...recurrence,
      weekdays: updated,
    });
  }

  // Label for trigger button
  const formattedDisplay = React.useMemo(() => {
    if (!due) return "Add date/time";

    const base = parseLocalDate(due);
    const today = parseLocalDate("today");
    const diffDays = Math.round(
      (base.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let text = "";
    if (diffDays === 0) text = "Today";
    else if (diffDays === 1) text = "Tomorrow";
    else if (diffDays === -1) text = "Yesterday";
    else {
      text = base.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: base.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }

    if (dueTime) {
      text += `, ${dueTime}`;
    }

    return text;
  }, [due, dueTime]);

  const hasDueDate = Boolean(due);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            hasDueDate
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          aria-label="Set date and time"
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          <span className="truncate max-w-[150px]">{formattedDisplay}</span>
          {recurrence && <Repeat className="size-3 text-primary shrink-0" />}
          {hasDueDate && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearDate}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClearDate(e as unknown as React.MouseEvent);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 text-primary/80 hover:text-primary"
              aria-label="Clear date"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 p-3 shadow-lg border border-border bg-popover text-popover-foreground"
      >
        <div className="space-y-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={currentIso === todayIso ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={() => handlePreset(todayIso)}
            >
              Today
            </Button>
            <Button
              type="button"
              variant={currentIso === tomorrowIso ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={() => handlePreset(tomorrowIso)}
            >
              Tomorrow
            </Button>
            <Button
              type="button"
              variant={currentIso === nextWeekIso ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={() => handlePreset(nextWeekIso)}
            >
              Next week
            </Button>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-1">
            <label htmlFor="custom-date-picker" className="text-[11px] font-medium text-muted-foreground">Date</label>
            <input
              id="custom-date-picker"
              type="date"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              value={currentIso}
              onChange={(e) => onDueDateChange(e.target.value)}
            />
          </div>

          {/* Time Picker */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="custom-time-picker" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> Due time (optional)
              </label>
              {dueTime && (
                <button
                  type="button"
                  onClick={() => onDueTimeChange(undefined)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear time
                </button>
              )}
            </div>
            <input
              id="custom-time-picker"
              type="time"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              value={dueTime ?? ""}
              onChange={(e) => onDueTimeChange(e.target.value || undefined)}
            />
          </div>

          {/* Recurrence Toggle */}
          <div className="border-t border-border pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Repeat className="size-3" /> Repeat
              </span>
              <button
                type="button"
                onClick={() => setShowRecurrenceEditor(!showRecurrenceEditor)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {recurrence ? formatRecurrenceLabel(recurrence) : "Set recurrence"}
                <ChevronDown className={`size-3 transition-transform ${showRecurrenceEditor ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showRecurrenceEditor && (
              <div className="rounded-lg border border-border bg-card/60 p-2.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: "Does not repeat", value: "none" },
                    { label: "Every day", value: "daily" },
                    { label: "Weekdays (M–F)", value: "weekdays" },
                    { label: "Every week", value: "weekly" },
                    { label: "Every month", value: "monthly" },
                    { label: "Every year", value: "yearly" },
                  ].map((item) => {
                    const isSelected =
                      item.value === "none"
                        ? !recurrence
                        : recurrence?.frequency === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleFrequencyChange(item.value as RecurrenceFrequency | "none")}
                        className={`rounded px-2 py-1 text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Weekly Day Selection */}
                {recurrence?.frequency === "weekly" && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted-foreground">Repeat on days</span>
                    <div className="flex items-center justify-between gap-1">
                      {WEEKDAYS.map((day) => {
                        const isDaySelected = recurrence.weekdays?.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            className={`size-6 rounded-full text-[11px] font-medium transition-colors ${
                              isDaySelected
                                ? "bg-primary text-primary-foreground"
                                : "border border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground italic">
                  Note: Google Tasks rules disallow subtasks on recurring items.
                </p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground"
              onClick={handleClearDate}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs h-7"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
