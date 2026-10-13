"use client";

import React from "react";
import { format, addDays } from "date-fns";
import { X, CheckCircle2, Flame, Calendar, Sparkles, Check } from "lucide-react";
import { useHabits } from "../context/habits-context";
import {
  calculateHabitStreak,
  getHabitCompletionOnDate,
  isHabitScheduledOnDate,
} from "../services/habit-scheduler";
import { Button } from "@/components/ui/button";

interface DailyHabitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyHabitSummaryModal({ isOpen, onClose }: DailyHabitSummaryModalProps) {
  const {
    activeHabits,
    habitCompletions,
    toggleHabitComplete,
    skipHabitOccurrence,
    routineSessions,
  } = useHabits();

  if (!isOpen) return null;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  // Scheduled today
  const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDate(h, todayStr));
  const completedToday = scheduledToday.filter((h) => {
    const c = getHabitCompletionOnDate(h.id, todayStr, habitCompletions);
    return c?.completed;
  });
  const incompleteToday = scheduledToday.filter((h) => {
    const c = getHabitCompletionOnDate(h.id, todayStr, habitCompletions);
    return !c?.completed && !c?.skipped;
  });

  // Scheduled tomorrow
  const scheduledTomorrow = activeHabits.filter((h) => isHabitScheduledOnDate(h, tomorrowStr));

  // Today's Routine sessions
  const todaysSessions = routineSessions.filter((s) => s.date === todayStr);
  const completedRoutines = todaysSessions.filter((s) => s.status === "completed");

  const completionPct =
    scheduledToday.length > 0
      ? Math.round((completedToday.length / scheduledToday.length) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary text-base">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Daily Habit Review</h2>
              <p className="text-xs text-muted-foreground">
                End-of-day reflection on today&apos;s consistency and tomorrow&apos;s cue.
              </p>
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

        {/* Scorecard Strip */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-muted/20 text-center py-3 text-xs">
          <div>
            <div className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
              {completedToday.length} / {scheduledToday.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Habits Completed</div>
          </div>
          <div>
            <div className="font-black text-primary text-lg">{completionPct}%</div>
            <div className="text-[10px] text-muted-foreground">Daily Score</div>
          </div>
          <div>
            <div className="font-black text-foreground text-lg">
              {completedRoutines.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Routines Done</div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 minddesk-scrollbar text-xs">
          {/* Pending Habits section */}
          {incompleteToday.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                  Pending Habits ({incompleteToday.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Quick complete or skip</span>
              </div>

              <div className="space-y-1.5">
                {incompleteToday.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{habit.emoji}</span>
                      <span className="font-semibold text-foreground">{habit.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => skipHabitOccurrence(habit.id, todayStr)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                        title="Skip occurrence (streak protected)"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHabitComplete(habit.id, todayStr)}
                        className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                      >
                        <Check size={12} strokeWidth={3} /> Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Habits section */}
          <div className="space-y-2">
            <span className="font-bold text-foreground text-xs">
              Completed Today ({completedToday.length})
            </span>
            <div className="space-y-1">
              {completedToday.map((habit) => {
                const streak = calculateHabitStreak(habit, habitCompletions, todayStr);
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={15} className="text-emerald-500" />
                      <span className="font-medium text-foreground">{habit.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-500">
                      <Flame size={12} fill="currentColor" /> {streak.currentStreak}d streak
                    </span>
                  </div>
                );
              })}
              {completedToday.length === 0 && (
                <p className="text-muted-foreground italic py-1">No habits checked off yet today.</p>
              )}
            </div>
          </div>

          {/* Tomorrow's Schedule Preview */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span className="font-bold text-foreground text-xs">Tomorrow&apos;s Cue</span>
              <span className="text-muted-foreground">({scheduledTomorrow.length} scheduled)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scheduledTomorrow.map((habit) => (
                <span
                  key={habit.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
                >
                  <span>{habit.emoji}</span>
                  <span>{habit.name}</span>
                  {habit.preferredTime && (
                    <span className="text-muted-foreground">({habit.preferredTime})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end">
          <Button onClick={onClose} className="rounded-xl text-xs font-semibold px-5">
            Done Review
          </Button>
        </div>
      </div>
    </div>
  );
}
