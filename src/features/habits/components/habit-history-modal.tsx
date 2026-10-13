"use client";

import React from "react";
import { format, subDays } from "date-fns";
import { X, Flame, Check } from "lucide-react";
import type { Habit } from "../types";
import { useHabits } from "../context/habits-context";
import {
  calculateHabitStreak,
  getHabitCompletionOnDate,
  isHabitScheduledOnDate,
} from "../services/habit-scheduler";
import { Button } from "@/components/ui/button";

interface HabitHistoryModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
}

export function HabitHistoryModal({ habit, isOpen, onClose }: HabitHistoryModalProps) {
  const { habitCompletions, toggleHabitComplete } = useHabits();

  if (!isOpen || !habit) return null;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const stats = calculateHabitStreak(habit, habitCompletions, todayStr);

  // Generate list of the past 30 days
  const historyDays = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(today, i);
    const dStr = format(d, "yyyy-MM-dd");
    const isScheduled = isHabitScheduledOnDate(habit, dStr);
    const completion = getHabitCompletionOnDate(habit.id, dStr, habitCompletions);
    return {
      date: d,
      dateStr: dStr,
      isScheduled,
      completion,
      isCompleted: completion?.completed ?? false,
      isSkipped: completion?.skipped ?? false,
      currentValue: completion?.currentValue ?? 0,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: `${habit.color}15`, border: `1px solid ${habit.color}35` }}
            >
              {habit.emoji}
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">{habit.name}</h2>
              <p className="text-xs text-muted-foreground">Completion History & Lifetime Streaks</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 divide-x divide-border border-b border-border bg-muted/20 text-center py-3 text-xs">
          <div>
            <div className="flex items-center justify-center gap-1 font-black text-orange-500">
              <Flame size={13} fill="currentColor" /> {stats.currentStreak}d
            </div>
            <div className="text-[10px] text-muted-foreground">Current Streak</div>
          </div>
          <div>
            <div className="font-black text-foreground">{stats.longestStreak}d</div>
            <div className="text-[10px] text-muted-foreground">Best Streak</div>
          </div>
          <div>
            <div className="font-black text-foreground">{stats.totalCompletions}</div>
            <div className="text-[10px] text-muted-foreground">Completions</div>
          </div>
          <div>
            <div className="font-black text-emerald-600 dark:text-emerald-400">{stats.completionRate}%</div>
            <div className="text-[10px] text-muted-foreground">Hit Rate</div>
          </div>
        </div>

        {/* Past 30 Days List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 minddesk-scrollbar text-xs">
          <h3 className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider mb-2">
            Past 30 Days
          </h3>

          <div className="space-y-1.5">
            {historyDays.map((day) => (
              <div
                key={day.dateStr}
                className={`flex items-center justify-between rounded-xl border p-2.5 transition-colors ${
                  day.isCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15"
                    : day.isSkipped
                    ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15"
                    : !day.isScheduled
                    ? "border-border/40 bg-muted/10 opacity-70"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-2 rounded-full ${
                      day.isCompleted
                        ? "bg-emerald-500"
                        : day.isSkipped
                        ? "bg-amber-500"
                        : !day.isScheduled
                        ? "bg-muted-foreground/30"
                        : "bg-rose-500"
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-foreground">
                      {format(day.date, "EEEE, MMM d")}
                    </span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {day.dateStr === todayStr && "(Today)"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {day.isCompleted
                      ? habit.type === "duration"
                        ? `${day.currentValue}m logged`
                        : habit.type === "quantity"
                        ? `${day.currentValue} ${habit.unit || "units"}`
                        : "Completed"
                      : day.isSkipped
                      ? "Skipped (streak safe)"
                      : !day.isScheduled
                      ? "Unscheduled"
                      : "Missed"}
                  </span>

                  {day.isScheduled && (
                    <button
                      type="button"
                      onClick={() => toggleHabitComplete(habit.id, day.dateStr)}
                      className={`flex size-7 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                        day.isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      title={day.isCompleted ? "Mark incomplete" : "Mark complete"}
                    >
                      <Check size={14} className={day.isCompleted ? "stroke-[3]" : "opacity-40"} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
