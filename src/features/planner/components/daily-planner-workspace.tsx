"use client";

import React, { useState } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { format } from "date-fns";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  CalendarCheck2,
  ListTodo,
  FileText,
  Flame,
} from "lucide-react";
import { ScheduleHabitDialog } from "@/features/habits/components/schedule-habit-dialog";
import { TodaysPrioritiesShelf } from "./todays-priorities-shelf";
import { DailyProgressCard } from "./daily-progress-card";
import { MyTasksPanel } from "./my-tasks-panel";
import { MyScheduleTimeline } from "./my-schedule-timeline";
import { TimeBlockEditorModal } from "./time-block-editor-modal";
import { PlannerTask } from "@/features/calendar/types";

export function DailyPlannerWorkspace() {
  const { isLoaded, getDailyPlan, updateDailyNotes } = useCalendar();

  const [currentDateStr, setCurrentDateStr] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  // Mobile view tab: 'tasks' | 'schedule'
  const [mobileTab, setMobileTab] = useState<"tasks" | "schedule">("schedule");

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState<PlannerTask | null>(null);
  const [scheduleHabitOpen, setScheduleHabitOpen] = useState(false);

  // Daily intention / notes
  const plan = getDailyPlan(currentDateStr);
  const [dailyNotes, setDailyNotes] = useState(plan.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-20 w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
        <div className="h-28 w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
        <div className="h-[650px] w-full rounded-2xl bg-muted/60 skeleton-shimmer" />
      </div>
    );
  }

  const handleOpenScheduleForTask = (task: PlannerTask) => {
    setTaskToSchedule(task);
    setEditorOpen(true);
  };

  const handleSaveNotes = () => {
    updateDailyNotes(currentDateStr, dailyNotes);
    setIsEditingNotes(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner Header */}
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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

        {/* Daily Intention Button & Schedule Habit Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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

      {/* Daily Progress & Analytics Header (Section 11) */}
      <DailyProgressCard currentDateStr={currentDateStr} />

      {/* Today's Top 3 Priorities Shelf (Section 10) */}
      <TodaysPrioritiesShelf
        currentDateStr={currentDateStr}
        onOpenSchedule={handleOpenScheduleForTask}
      />

      {/* Mobile Tab Switcher (Section 14) */}
      <div className="flex items-center rounded-xl bg-muted p-1 border border-border lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("tasks")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "tasks"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListTodo size={15} />
          <span>Task Library</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("schedule")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "schedule"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck2 size={15} />
          <span>Timeline Schedule</span>
        </button>
      </div>

      {/* Two-Panel Workspace Grid (Section 2: Left 30% / Right 70% dominant) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Panel: Task Library (~30% / 4 columns) */}
        <div
          className={`lg:col-span-4 h-[720px] ${
            mobileTab === "tasks" ? "block" : "hidden lg:block"
          }`}
        >
          <MyTasksPanel
            currentDateStr={currentDateStr}
            onScheduleTask={handleOpenScheduleForTask}
          />
        </div>

        {/* Right Panel: Main Time Blocking Timeline (~70% / 8 columns) */}
        <div
          className={`lg:col-span-8 h-[720px] ${
            mobileTab === "schedule" ? "block" : "hidden lg:block"
          }`}
        >
          <MyScheduleTimeline
            currentDateStr={currentDateStr}
            onDateChange={setCurrentDateStr}
          />
        </div>
      </div>

      {/* Contextual Time Block Editor Modal */}
      <TimeBlockEditorModal
        isOpen={editorOpen}
        block={null}
        initialDate={currentDateStr}
        initialStartTime="10:00"
        initialDurationMinutes={taskToSchedule?.estimatedMinutes || 60}
        initialTaskId={taskToSchedule?.id}
        onClose={() => {
          setEditorOpen(false);
          setTaskToSchedule(null);
        }}
      />

      {/* Schedule Habit / Routine Dialog */}
      <ScheduleHabitDialog
        isOpen={scheduleHabitOpen}
        defaultDate={currentDateStr}
        onClose={() => setScheduleHabitOpen(false)}
      />
    </div>
  );
}
