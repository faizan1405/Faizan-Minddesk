"use client";

import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useHabits } from "../context/habits-context";
import {
  buildHeatmapData,
  calculateHabitStreak,
  type DayHeatmapEntry,
} from "../services/habit-scheduler";
import type { Habit } from "../types";

export function HabitHeatmap() {
  const { habits, activeHabits, habitCompletions } = useHabits();
  const [selectedHabitId, setSelectedHabitId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<DayHeatmapEntry | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Build heatmap entries for past 91 days (13 full weeks)
  const heatmapEntries = useMemo(() => {
    return buildHeatmapData(
      habits,
      habitCompletions,
      91,
      todayStr,
      selectedHabitId === "all" ? undefined : selectedHabitId
    );
  }, [habits, habitCompletions, todayStr, selectedHabitId]);

  // Aggregate consistency stats
  const stats = useMemo(() => {
    let totalScheduled = 0;
    let totalCompleted = 0;

    for (const entry of heatmapEntries) {
      totalScheduled += entry.totalScheduled;
      totalCompleted += entry.totalCompleted;
    }

    const overallRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    // Past 28 days
    const past28Entries = heatmapEntries.slice(heatmapEntries.length - 28);
    let past28Scheduled = 0;
    let past28Completed = 0;
    for (const e of past28Entries) {
      past28Scheduled += e.totalScheduled;
      past28Completed += e.totalCompleted;
    }
    const weeklyRate = past28Scheduled > 0 ? Math.round((past28Completed / past28Scheduled) * 100) : 0;

    // Find most consistent habit
    let mostConsistent: { habit: Habit; rate: number; streak: number } | null = null;
    let highestRate = -1;

    for (const h of activeHabits) {
      const hStats = calculateHabitStreak(h, habitCompletions, todayStr);
      if (hStats.completionRate > highestRate) {
        highestRate = hStats.completionRate;
        mostConsistent = { habit: h, rate: hStats.completionRate, streak: hStats.currentStreak };
      }
    }

    return {
      overallRate,
      weeklyRate,
      totalCompletions: totalCompleted,
      mostConsistent,
    };
  }, [heatmapEntries, activeHabits, habitCompletions, todayStr]);

  // Group heatmap entries into columns of 7 days (weeks)
  const weekColumns = useMemo(() => {
    const columns: DayHeatmapEntry[][] = [];
    let currentWeek: DayHeatmapEntry[] = [];

    for (const entry of heatmapEntries) {
      currentWeek.push(entry);
      if (currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      columns.push(currentWeek);
    }
    return columns;
  }, [heatmapEntries]);

  // Color mapper based on intensity
  const getCellColor = (entry: DayHeatmapEntry) => {
    if (entry.totalScheduled === 0) {
      return "bg-muted/30 border-border/20 text-transparent";
    }
    switch (entry.intensity) {
      case 4:
        return "bg-emerald-500 border-emerald-600 text-white shadow-xs";
      case 3:
        return "bg-emerald-400 dark:bg-emerald-600 border-emerald-500/40 text-white";
      case 2:
        return "bg-emerald-300 dark:bg-emerald-700/80 border-emerald-400/30 text-emerald-950";
      case 1:
        return "bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300/30 text-emerald-900";
      case 0:
      default:
        return "bg-muted/60 border-border/40 hover:border-border";
    }
  };

  if (habits.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Heatmap & Trends
            </h2>
            <p className="text-xs text-muted-foreground">
              Consistency statistics, active momentum, and 90-day activity history.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
            <CalendarDays size={22} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Habit Analytics Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Create and complete habits in Today&apos;s Habits or All Habits to populate your 90-day consistency heatmap, streaks, and momentum scores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Contextual Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Heatmap & Trends
          </h2>
          <p className="text-xs text-muted-foreground">
            Consistency statistics, active momentum, and 90-day activity history.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">90-Day Consistency</span>
            <TrendingUp size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{stats.overallRate}%</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Across all scheduled habits</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Weekly Momentum</span>
            <CheckCircle2 size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{stats.weeklyRate}%</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Last 4 weeks completed</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Total Check-ins</span>
            <Flame size={15} className="text-orange-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{stats.totalCompletions}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Real logged occurrences</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Most Consistent</span>
            <Award size={15} className="text-amber-500" />
          </div>
          <div className="truncate text-base font-bold text-foreground">
            {stats.mostConsistent?.habit.name || "None yet"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats.mostConsistent ? `${stats.mostConsistent.rate}% consistency` : "Start tracking habits"}
          </p>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        {/* Heatmap Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Habit Activity Heatmap
            </h3>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
              Last 90 Days
            </span>
          </div>

          {/* Filter Selector */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-muted-foreground font-medium">View:</label>
            <select
              value={selectedHabitId}
              onChange={(e) => {
                setSelectedHabitId(e.target.value);
                setSelectedDay(null);
              }}
              className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-primary"
            >
              <option value="all">Aggregate (All Habits)</option>
              {activeHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.emoji} {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="mt-5 overflow-x-auto pb-2 minddesk-scrollbar">
          <div className="inline-flex gap-1.5 min-w-full justify-start sm:justify-center p-1">
            {weekColumns.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((entry) => {
                  const isSelected = selectedDay?.date === entry.date;
                  return (
                    <button
                      key={entry.date}
                      type="button"
                      onClick={() => setSelectedDay(entry)}
                      title={`${entry.date}: ${entry.totalCompleted}/${entry.totalScheduled} completed`}
                      className={`size-4 sm:size-4.5 rounded-sm border transition-all cursor-pointer ${getCellColor(
                        entry
                      )} ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-125 z-10"
                          : "hover:scale-125"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>Less activity</span>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-xs border border-border/40 bg-muted/60" />
              <span className="size-3 rounded-xs border border-emerald-300/30 bg-emerald-200 dark:bg-emerald-900/60" />
              <span className="size-3 rounded-xs border border-emerald-400/30 bg-emerald-300 dark:bg-emerald-700/80" />
              <span className="size-3 rounded-xs border border-emerald-500/40 bg-emerald-400 dark:bg-emerald-600" />
              <span className="size-3 rounded-xs border border-emerald-600 bg-emerald-500" />
            </div>
            <span>100% completed</span>
          </div>
        </div>

        {/* Selected Day Inspector */}
        {selectedDay && (
          <div className="mt-5 rounded-xl border border-border/80 bg-muted/30 p-4 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div>
                <span className="text-xs font-bold text-foreground">
                  Activity for {format(parseISO(selectedDay.date), "EEEE, MMMM d, yyyy")}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedDay.totalCompleted} of {selectedDay.totalScheduled} completed)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Completed ({selectedDay.completedHabitNames.length})
                </span>
                {selectedDay.completedHabitNames.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedDay.completedHabitNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">None completed</p>
                )}
              </div>

              {selectedDay.skippedHabitNames && selectedDay.skippedHabitNames.length > 0 && (
                <div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Skipped / Streak Safe ({selectedDay.skippedHabitNames.length})
                  </span>
                  <ul className="space-y-1">
                    {selectedDay.skippedHabitNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <span className="font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Info size={13} /> Incomplete / Unscheduled ({selectedDay.pendingHabitNames.length})
                </span>
                {selectedDay.pendingHabitNames.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedDay.pendingHabitNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">All scheduled habits were completed!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
