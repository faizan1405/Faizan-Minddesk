"use client";

import React, { useState, useMemo } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { format, addDays, subDays, parseISO } from "date-fns";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  FileText,
  Flame,
  ChevronLeft,
  ChevronRight,
  Tag,
  Repeat,
  Brain,
} from "lucide-react";
import { ScheduleHabitDialog } from "@/features/habits/components/schedule-habit-dialog";
import { DailyProgressCard } from "./daily-progress-card";
import { SmartZoomTimeline } from "./smart-zoom-timeline";
import { VisualDayMap } from "./visual-day-map";
import { PlannerCategoriesModal } from "./planner-categories-modal";
import { PlannerRoutinesModal } from "./planner-routines-modal";
import { PomodoroProvider, usePomodoro } from "../pomodoro-context";
import { PomodoroFocusView } from "./pomodoro-focus-view";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import { generateFixedRoutineBlocks } from "../services/smart-scheduler";

function DailyPlannerWorkspaceContent() {
  const {
    isLoaded,
    getDailyPlan,
    updateDailyNotes,
    scheduledBlocks,
    plannerRoutines,
    plannerExceptions,
    plannerCategories,
  } = useCalendar();

  const { openFocusModal } = usePomodoro();

  const [currentDateStr, setCurrentDateStr] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  // Selection and navigation state
  const [navigateToTimeSlot, setNavigateToTimeSlot] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [scheduleHabitOpen, setScheduleHabitOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [routinesModalOpen, setRoutinesModalOpen] = useState(false);

  // Daily intention / notes
  const plan = getDailyPlan(currentDateStr);
  const [dailyNotes, setDailyNotes] = useState(plan.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Combine user scheduled blocks + generated fixed recurring routines for Day Map
  const allDayBlocks = useMemo(() => {
    const fixed = generateFixedRoutineBlocks(
      currentDateStr,
      plannerRoutines,
      plannerExceptions,
      plannerCategories
    );
    const combined = [...scheduledBlocks];
    for (const fix of fixed) {
      if (!combined.some((b) => b.id === fix.id || (b.recurringSeriesId && b.recurringSeriesId === fix.recurringSeriesId))) {
        combined.push(fix);
      }
    }
    return combined;
  }, [scheduledBlocks, currentDateStr, plannerRoutines, plannerExceptions, plannerCategories]);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-20 w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
        <div className="h-44 w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
        <div className="h-28 w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
        <div className="h-[650px] w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
      </div>
    );
  }

  const handleSelectCubeTimeSlot = (timeHHMM: string, block?: ScheduledTaskBlock) => {
    setNavigateToTimeSlot(timeHHMM);
    if (block) {
      setSelectedBlockId(block.id);
    } else {
      setSelectedBlockId(null);
    }
  };

  const handleSaveNotes = () => {
    updateDailyNotes(currentDateStr, dailyNotes);
    setIsEditingNotes(false);
  };

  const handlePrevDay = () => {
    try {
      const d = parseISO(currentDateStr);
      setCurrentDateStr(format(subDays(d, 1), "yyyy-MM-dd"));
    } catch {
      // Fallback
    }
  };

  const handleNextDay = () => {
    try {
      const d = parseISO(currentDateStr);
      setCurrentDateStr(format(addDays(d, 1), "yyyy-MM-dd"));
    } catch {
      // Fallback
    }
  };

  const handleToday = () => {
    setCurrentDateStr(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner Header */}
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Personal Calendar</span>
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
              <Sparkles size={12} className="text-amber-500" />
              <span>Time Blocking Engine</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Plan Your Day
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pick a task → Allocate dedicated time → Work according to your schedule → Mark progress.
          </p>
        </div>

        {/* Date Navigator & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Day Navigator */}
          <div className="flex items-center rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Pomodoro Focus Mode button */}
          <button
            type="button"
            onClick={openFocusModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 shadow-2xs transition-all cursor-pointer"
            title="Launch Distraction-Free Pomodoro Focus Mode"
          >
            <Brain size={14} />
            <span>Focus Mode</span>
          </button>

          {/* Categories Modal Button */}
          <button
            type="button"
            onClick={() => setCategoriesModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all cursor-pointer"
          >
            <Tag size={13} />
            <span>Categories</span>
          </button>

          {/* Routines Modal Button */}
          <button
            type="button"
            onClick={() => setRoutinesModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all cursor-pointer"
          >
            <Repeat size={13} />
            <span>Routines</span>
          </button>

          {/* Daily Intention Button & Schedule Habit Button */}
          <button
            type="button"
            onClick={() => setScheduleHabitOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all cursor-pointer"
          >
            <Flame size={14} className="text-orange-500" />
            <span>Schedule Habit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditingNotes(!isEditingNotes)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground shadow-2xs transition-all cursor-pointer"
          >
            <FileText size={14} />
            <span>{isEditingNotes ? "Close Intention" : "Daily Intention"}</span>
          </button>
        </div>
      </header>

      {/* Expandable Daily Intention Card */}
      {isEditingNotes && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-2xs motion-safe:animate-fade-in space-y-2">
          <label className="block text-xs font-bold text-foreground">
            What is your core intention or mindset for today?
          </label>
          <textarea
            rows={2}
            value={dailyNotes}
            onChange={(e) => setDailyNotes(e.target.value)}
            placeholder="e.g. Focus on finishing the enterprise demo deck before lunch. Keep afternoon free for team sync..."
            className="w-full rounded-xl border border-input bg-background p-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary resize-none shadow-2xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer shadow-2xs"
            >
              Save Intention
            </button>
          </div>
        </div>
      )}

      {/* THE CENTERPIECE: 24-HOUR VISUAL DAY MAP (48 Cubes across 4 Chronological Rows of 12) */}
      <VisualDayMap
        currentDateStr={currentDateStr}
        allBlocks={allDayBlocks}
        activeBlockId={selectedBlockId || undefined}
        onSelectTimeSlot={handleSelectCubeTimeSlot}
        onManageCategories={() => setCategoriesModalOpen(true)}
      />

      {/* Daily Progress & Analytics Header */}
      <DailyProgressCard currentDateStr={currentDateStr} />

      {/* Interactive Time Blocking Timeline & Smart Zoom Editor */}
      <SmartZoomTimeline
        currentDateStr={currentDateStr}
        onDateChange={setCurrentDateStr}
        navigateToTimeSlot={navigateToTimeSlot}
        onClearNavigateToTimeSlot={() => setNavigateToTimeSlot(null)}
        selectedBlockId={selectedBlockId}
        onSelectBlock={(blockId) => setSelectedBlockId(blockId)}
      />

      {/* Schedule Habit / Routine Dialog */}
      <ScheduleHabitDialog
        isOpen={scheduleHabitOpen}
        defaultDate={currentDateStr}
        onClose={() => setScheduleHabitOpen(false)}
      />

      {/* Categories Manager Modal */}
      <PlannerCategoriesModal
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
      />

      {/* Recurring Routines Manager Modal */}
      <PlannerRoutinesModal
        isOpen={routinesModalOpen}
        onClose={() => setRoutinesModalOpen(false)}
        currentDateStr={currentDateStr}
      />

      {/* Integrated Persistent Pomodoro Mini-Timer & Focus Mode Modal */}
      <PomodoroFocusView />
    </div>
  );
}

export function DailyPlannerWorkspace() {
  return (
    <PomodoroProvider>
      <DailyPlannerWorkspaceContent />
    </PomodoroProvider>
  );
}
