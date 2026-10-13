"use client";

import React from "react";
import { format } from "date-fns";
import {
  Check,
  Flame,
  MoreVertical,
  Pause,
  Play,
  Archive,
  Trash2,
  Calendar,
  History,
  Edit,
  Clock,
  Plus,
  Minus,
  ShieldCheck,
  FastForward,
} from "lucide-react";
import type { Habit } from "../types";
import { useHabits } from "../context/habits-context";
import {
  calculateHabitStreak,
  getHabitCompletionOnDate,
  isHabitScheduledOnDate,
} from "../services/habit-scheduler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HabitCardProps {
  habit: Habit;
  dateStr?: string;
  onEdit: (habit: Habit) => void;
  onViewHistory: (habit: Habit) => void;
  onSchedule: (habit: Habit) => void;
}

export function HabitCard({
  habit,
  dateStr = format(new Date(), "yyyy-MM-dd"),
  onEdit,
  onViewHistory,
  onSchedule,
}: HabitCardProps) {
  const {
    habitCompletions,
    toggleHabitComplete,
    skipHabitOccurrence,
    logHabitProgress,
    pauseHabit,
    resumeHabit,
    archiveHabit,
    deleteHabit,
  } = useHabits();

  const isScheduled = isHabitScheduledOnDate(habit, dateStr);
  const completion = getHabitCompletionOnDate(habit.id, dateStr, habitCompletions);
  const streakStats = calculateHabitStreak(habit, habitCompletions, dateStr);

  const isCompleted = completion?.completed ?? false;
  const isSkipped = completion?.skipped ?? false;
  const currentValue = completion?.currentValue ?? 0;
  const target = habit.target || 1;
  const progressPercent = Math.min(100, Math.round((currentValue / target) * 100));

  const handleToggle = () => {
    toggleHabitComplete(habit.id, dateStr);
  };

  const handleSkip = () => {
    skipHabitOccurrence(habit.id, dateStr, "User skipped occurrence (streak frozen)");
  };

  const handleQuickAdd = (increment: number) => {
    const nextVal = Math.max(0, currentValue + increment);
    logHabitProgress(habit.id, nextVal, dateStr);
  };

  // Determine human-readable frequency text
  const getFrequencyLabel = () => {
    switch (habit.schedule.frequency) {
      case "daily":
        return "Daily";
      case "weekdays":
        return "Mon - Fri";
      case "specific_days":
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return (habit.schedule.daysOfWeek || []).map((d) => days[d]).join(", ") || "Custom";
      case "every_n_days":
        return `Every ${habit.schedule.interval} days`;
      case "monthly":
        return `Monthly on day ${habit.schedule.dayOfMonth || 1}`;
      case "times_per_week":
        return `${habit.schedule.timesPerWeek || 3}x / week`;
      default:
        return "Scheduled";
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15"
          : isSkipped
          ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15 opacity-80"
          : !isScheduled
          ? "border-border/60 bg-muted/20 opacity-75"
          : "border-border bg-card hover:border-border/80 hover:shadow-xs"
      }`}
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Emoji & Title */}
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-xs transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${habit.color}15`,
                border: `1px solid ${habit.color}35`,
              }}
            >
              {habit.emoji}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {habit.name}
                </h3>
                {habit.isPaused && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    <Pause size={10} /> Paused
                  </span>
                )}
              </div>

              {habit.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {habit.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                  {habit.category}
                </span>

                <span className="text-muted-foreground font-medium">
                  {getFrequencyLabel()}
                </span>

                {habit.preferredTime && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock size={11} /> {habit.preferredTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Habit options"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onEdit(habit)}>
                <Edit className="mr-2 size-3.5" /> Edit Habit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSchedule(habit)}>
                <Calendar className="mr-2 size-3.5" /> Schedule in Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(habit)}>
                <History className="mr-2 size-3.5" /> View History & Stats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isScheduled && !isCompleted && !isSkipped && (
                <DropdownMenuItem onClick={handleSkip}>
                  <ShieldCheck className="mr-2 size-3.5 text-amber-500" /> Skip (Freeze Streak)
                </DropdownMenuItem>
              )}
              {habit.isPaused ? (
                <DropdownMenuItem onClick={() => resumeHabit(habit.id)}>
                  <Play className="mr-2 size-3.5 text-emerald-500" /> Resume Habit
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => pauseHabit(habit.id)}>
                  <Pause className="mr-2 size-3.5 text-amber-500" /> Pause Habit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => archiveHabit(habit.id)}>
                <Archive className="mr-2 size-3.5" /> Archive Habit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => deleteHabit(habit.id)}
              >
                <Trash2 className="mr-2 size-3.5" /> Delete Habit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tracking Controls */}
        <div className="mt-4 pt-3 border-t border-border/50">
          {habit.type === "checkbox" ? (
            /* Checkbox Habit */
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {isCompleted ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check size={14} className="stroke-[3]" /> Completed today
                  </span>
                ) : isSkipped ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck size={14} /> Skipped (Streak safe)
                  </span>
                ) : !isScheduled ? (
                  <span className="text-muted-foreground italic">
                    Not scheduled for this day
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Tap to check off
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isCompleted && !isSkipped && isScheduled && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    title="Skip occurrence (preserves your streak)"
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <FastForward size={12} /> Skip
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggle}
                  aria-label={isCompleted ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
                  className={`flex size-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <Check size={18} className={isCompleted ? "stroke-[2.5]" : "opacity-40"} />
                </button>
              </div>
            </div>
          ) : habit.type === "duration" ? (
            /* Duration Habit (Minutes) */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {currentValue} / {target} {habit.unit || "mins"}
                </span>
                <span className="font-bold text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: isCompleted ? "#10b981" : habit.color,
                  }}
                />
              </div>

              {/* Quick Log Buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(-5)}
                    disabled={currentValue <= 0}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                    title="-5 minutes"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(5)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(15)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(30)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted cursor-pointer"
                  >
                    +30m
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggle}
                  aria-label="Toggle completed"
                  className={`flex size-8 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* Quantity Habit (Counter) */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {currentValue} / {target} {habit.unit || "times"}
                </span>
                <span className="font-bold text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: isCompleted ? "#10b981" : habit.color,
                  }}
                />
              </div>

              {/* Increment / Decrement controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(-1)}
                    disabled={currentValue <= 0}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
                    title="Decrease by 1"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="min-w-6 text-center text-xs font-bold text-foreground">
                    {currentValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(1)}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer"
                    title="Increase by 1"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleToggle}
                  aria-label="Toggle completed"
                  className={`flex size-8 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Streak & Consistency */}
      <div className="flex items-center justify-between rounded-b-2xl border-t border-border/40 bg-muted/20 px-4 py-2.5 text-[11px]">
        {/* Streak Flame */}
        <div className="flex items-center gap-1.5">
          <Flame
            size={14}
            className={`${
              streakStats.currentStreak > 0
                ? "text-orange-500 fill-orange-500 animate-pulse"
                : "text-muted-foreground"
            }`}
          />
          <span className="font-bold text-foreground">
            {streakStats.currentStreak}{" "}
            <span className="font-normal text-muted-foreground">
              {streakStats.currentStreak === 1 ? "day streak" : "days streak"}
            </span>
          </span>
        </div>

        {/* Consistency */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Best: <strong className="text-foreground">{streakStats.longestStreak}d</strong></span>
          <span>•</span>
          <span>{streakStats.completionRate}% rate</span>
        </div>
      </div>
    </div>
  );
}
