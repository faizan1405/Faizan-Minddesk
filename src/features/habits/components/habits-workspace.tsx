"use client";

import React, { useState, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import {
  Plus,
  Flame,
  CheckCircle2,
  CalendarDays,
  Download,
  Layers,
  Activity,
  ChevronLeft,
  ChevronRight,
  Pause,
  Archive,
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
type AllHabitsFilter = "active" | "paused" | "archived";

export function HabitsWorkspace() {
  const { habits, activeHabits, habitCompletions, exportHabitsData, routines } = useHabits();

  const [activeTab, setActiveTab] = useState<HabitTab>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [allHabitsFilter, setAllHabitsFilter] = useState<AllHabitsFilter>("active");

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

  // Filter categories from active habits
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

  // Total active streaks sum
  const totalStreaksSum = useMemo(() => {
    return activeHabits.reduce((acc, h) => {
      const stats = calculateHabitStreak(h, habitCompletions, dateStr);
      return acc + (stats.currentStreak > 0 ? 1 : 0);
    }, 0);
  }, [activeHabits, habitCompletions, dateStr]);

  // Categorized habits for All Habits management
  const activeUnpausedHabits = useMemo(
    () => habits.filter((h) => !h.isArchived && !h.isPaused),
    [habits]
  );
  const pausedHabits = useMemo(
    () => habits.filter((h) => !h.isArchived && h.isPaused),
    [habits]
  );
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.isArchived),
    [habits]
  );

  const displayedAllHabits = useMemo(() => {
    if (allHabitsFilter === "paused") return pausedHabits;
    if (allHabitsFilter === "archived") return archivedHabits;
    return activeUnpausedHabits;
  }, [allHabitsFilter, pausedHabits, archivedHabits, activeUnpausedHabits]);

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

  const openNewHabitModal = () => {
    setHabitToEdit(null);
    setHabitModalOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-6">
      {/* Primary Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 minddesk-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "routines"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Activity size={14} />
            <span>Routines ({routines.filter((r) => !r.isArchived).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "heatmap"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CalendarDays size={14} />
            <span>Heatmap & Trends</span>
          </button>
        </div>

        {/* Global Tab Action Slot */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === "today" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDailySummaryOpen(true)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                <CheckCircle2 size={13} className="mr-1.5 text-emerald-500" /> Daily Review
              </Button>
              <Button
                size="sm"
                onClick={openNewHabitModal}
                className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <Plus size={14} className="mr-1" /> New Habit
              </Button>
            </div>
          )}

          {activeTab === "all" && (
            <Button
              size="sm"
              onClick={openNewHabitModal}
              className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
            >
              <Plus size={14} className="mr-1" /> New Habit
            </Button>
          )}

          {activeTab === "heatmap" && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportHabitsData}
              title="Export habits data as JSON backup"
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Download size={13} className="mr-1.5" /> Export Data
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: TODAY'S HABITS */}
      {activeTab === "today" && (
        <div className="space-y-5">
          {/* Contextual Heading & Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {isToday ? "Today's Habits" : `Habits for ${format(selectedDate, "MMMM d, yyyy")}`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isToday
                  ? "Track today's commitments, log measured progress, and sustain active streaks."
                  : `Viewing habit schedule and recorded history for ${format(selectedDate, "MMM d, yyyy")}.`}
              </p>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted cursor-pointer"
                title="Previous Day"
                aria-label="Previous Day"
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
                aria-label="Next Day"
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
          </div>

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

          {/* Daily Progress Shelf */}
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
                {categoryFilter !== "All"
                  ? `No habits found under category "${categoryFilter}" for this day.`
                  : "No habits are configured for this date. Create a new habit or adjust your schedule."}
              </p>
              <Button
                size="sm"
                onClick={openNewHabitModal}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus size={13} className="mr-1" /> Create Habit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL HABITS MANAGEMENT */}
      {activeTab === "all" && (
        <div className="space-y-5">
          {/* Contextual Heading & Segmented Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                All Habits
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your habit definitions, pause or archive routines, and review historical schedules.
              </p>
            </div>

            {/* Filter Pills: Active / Paused / Archived */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAllHabitsFilter("active")}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  allHabitsFilter === "active"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active ({activeUnpausedHabits.length})
              </button>

              <button
                type="button"
                onClick={() => setAllHabitsFilter("paused")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  allHabitsFilter === "paused"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pause size={11} className="text-amber-500" />
                <span>Paused ({pausedHabits.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAllHabitsFilter("archived")}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  allHabitsFilter === "archived"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Archive size={11} />
                <span>Archived ({archivedHabits.length})</span>
              </button>
            </div>
          </div>

          {/* Habit Cards Grid */}
          {displayedAllHabits.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAllHabits.map((habit) => (
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
                {allHabitsFilter === "paused" ? (
                  <Pause size={24} />
                ) : allHabitsFilter === "archived" ? (
                  <Archive size={24} />
                ) : (
                  <Layers size={24} />
                )}
              </span>
              <h3 className="text-base font-bold text-foreground">
                {allHabitsFilter === "paused"
                  ? "No paused habits"
                  : allHabitsFilter === "archived"
                  ? "No archived habits"
                  : "No active habits found"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {allHabitsFilter === "paused"
                  ? "You can pause habits at any time from the habit card menu to take a break without breaking your historical streak."
                  : allHabitsFilter === "archived"
                  ? "Archived habits are preserved here with full history and can be restored at any time."
                  : "You haven't created any habits yet. Create your first habit to build momentum!"}
              </p>
              {allHabitsFilter === "active" && (
                <Button
                  size="sm"
                  onClick={openNewHabitModal}
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Plus size={13} className="mr-1" /> Create Habit
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROUTINES */}
      {activeTab === "routines" && <RoutinesView />}

      {/* TAB 4: HEATMAP & TRENDS */}
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
