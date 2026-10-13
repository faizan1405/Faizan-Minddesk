"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import {
  Plus,
  Flame,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  Download,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useHabits } from "../context/habits-context";
import { HabitCard } from "./habit-card";
import { HabitModal } from "./habit-modal";
import { HabitHeatmap } from "./habit-heatmap";
import { HabitHistoryModal } from "./habit-history-modal";
import { ScheduleHabitDialog } from "./schedule-habit-dialog";
import { DailyHabitSummaryModal } from "./daily-habit-summary-modal";
import { RoutinesView } from "./routines-view";
import {
  calculateHabitStreak,
  getHabitCompletionOnDate,
  isHabitScheduledOnDate,
} from "../services/habit-scheduler";
import type { Habit } from "../types";
import { Button } from "@/components/ui/button";

type HabitTab = "today" | "all" | "routines" | "heatmap";

export function HabitsWorkspace() {
  const { activeHabits, habitCompletions, exportHabitsData } = useHabits();

  const [activeTab, setActiveTab] = useState<HabitTab>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modals
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [habitForHistory, setHabitForHistory] = useState<Habit | null>(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [habitToSchedule, setHabitToSchedule] = useState<Habit | null>(null);

  const [dailySummaryOpen, setDailySummaryOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  // Filter categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeHabits.forEach((h) => set.add(h.category));
    return ["All", ...Array.from(set)];
  }, [activeHabits]);

  // Today's scheduled habits
  const scheduledForSelectedDate = useMemo(() => {
    return activeHabits.filter((h) => {
      const isSched = isHabitScheduledOnDate(h, dateStr);
      const matchesCategory = categoryFilter === "All" || h.category === categoryFilter;
      return isSched && matchesCategory;
    });
  }, [activeHabits, dateStr, categoryFilter]);

  // Completed on selected date
  const completedCount = useMemo(() => {
    return scheduledForSelectedDate.filter((h) => {
      const c = getHabitCompletionOnDate(h.id, dateStr, habitCompletions);
      return c?.completed;
    }).length;
  }, [scheduledForSelectedDate, dateStr, habitCompletions]);

  // Total completions across all habits
  const totalStreaksSum = useMemo(() => {
    return activeHabits.reduce((acc, h) => {
      const stats = calculateHabitStreak(h, habitCompletions, dateStr);
      return acc + (stats.currentStreak > 0 ? 1 : 0);
    }, 0);
  }, [activeHabits, habitCompletions, dateStr]);

  const handleEditHabit = (h: Habit) => {
    setHabitToEdit(h);
    setHabitModalOpen(true);
  };

  const handleViewHistory = (h: Habit) => {
    setHabitForHistory(h);
    setHistoryModalOpen(true);
  };

  const handleScheduleHabit = (h: Habit) => {
    setHabitToSchedule(h);
    setScheduleDialogOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-6">
      {/* Top Banner Header */}
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles size={12} className="text-amber-500" />
              <span>Habits & Routines Engine</span>
            </span>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Saved locally
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Habit & Routine Tracker
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Build sustainable daily momentum, track genuine streaks, and block dedicated focus time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDailySummaryOpen(true)}
            className="rounded-xl text-xs font-semibold"
          >
            <CheckCircle2 size={13} className="mr-1.5 text-emerald-500" /> Daily Review
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportHabitsData}
            title="Export habit history as JSON"
            className="rounded-xl text-xs font-semibold"
          >
            <Download size={13} className="mr-1.5" /> Export Data
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setHabitToEdit(null);
              setHabitModalOpen(true);
            }}
            className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
          >
            <Plus size={14} className="mr-1" /> New Habit
          </Button>
        </div>
      </header>

      {/* Tabs & Date Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 minddesk-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "today"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Today&apos;s Habits</span>
            {scheduledForSelectedDate.length > 0 && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTab === "today" ? "bg-white/20 text-white" : "bg-muted text-foreground"
                }`}
              >
                {completedCount}/{scheduledForSelectedDate.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Layers size={14} />
            <span>All Habits ({activeHabits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("routines")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "routines"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Activity size={14} />
            <span>Routines</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "heatmap"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CalendarDays size={14} />
            <span>Heatmap & Trends</span>
          </button>
        </div>

        {/* Date Selector (for Today's habits tab) */}
        {activeTab === "today" && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="min-w-32 text-center text-foreground font-bold">
              {isToday ? "Today, " : ""}
              {format(selectedDate, "MMM d, yyyy")}
            </span>

            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="ml-1 rounded-lg border border-border bg-secondary px-2 py-1 text-[11px] font-bold text-secondary-foreground hover:bg-muted cursor-pointer"
              >
                Today
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Today's Habits */}
      {activeTab === "today" && (
        <div className="space-y-5">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 minddesk-scrollbar text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Progress Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 font-black">
                <Flame size={20} fill="currentColor" />
              </div>
              <div>
                <span className="font-bold text-foreground">
                  {totalStreaksSum} Active Streaks In Play
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Streaks freeze safely on explicit skip. Future dates are never counted as missed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Progress today:</span>
              <span className="font-black text-foreground">
                {completedCount} / {scheduledForSelectedDate.length} habits
              </span>
              <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden ml-1">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      scheduledForSelectedDate.length > 0
                        ? Math.round((completedCount / scheduledForSelectedDate.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Habits Cards Grid */}
          {scheduledForSelectedDate.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledForSelectedDate.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  dateStr={dateStr}
                  onEdit={handleEditHabit}
                  onViewHistory={handleViewHistory}
                  onSchedule={handleScheduleHabit}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CheckCircle2 size={24} />
              </span>
              <h3 className="text-base font-bold text-foreground">No habits scheduled</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No habits are configured for this day under the current filter. Create a new habit or check your schedule frequency.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setHabitToEdit(null);
                  setHabitModalOpen(true);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                <Plus size={13} className="mr-1" /> Create Habit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: All Habits */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                dateStr={dateStr}
                onEdit={handleEditHabit}
                onViewHistory={handleViewHistory}
                onSchedule={handleScheduleHabit}
              />
            ))}
          </div>

          {activeHabits.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
              No active habits found. Create your first habit!
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Routines */}
      {activeTab === "routines" && <RoutinesView />}

      {/* Tab 4: Heatmap & Trends */}
      {activeTab === "heatmap" && <HabitHeatmap />}

      {/* Modals */}
      <HabitModal
        isOpen={habitModalOpen}
        habitToEdit={habitToEdit}
        onClose={() => setHabitModalOpen(false)}
      />

      <HabitHistoryModal
        isOpen={historyModalOpen}
        habit={habitForHistory}
        onClose={() => setHistoryModalOpen(false)}
      />

      <ScheduleHabitDialog
        isOpen={scheduleDialogOpen}
        habit={habitToSchedule}
        defaultDate={dateStr}
        onClose={() => setScheduleDialogOpen(false)}
      />

      <DailyHabitSummaryModal
        isOpen={dailySummaryOpen}
        onClose={() => setDailySummaryOpen(false)}
      />
    </div>
  );
}
