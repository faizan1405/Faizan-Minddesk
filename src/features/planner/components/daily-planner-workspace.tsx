"use client";

import { useState } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { format } from "date-fns";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  CalendarCheck2,
  ListTodo,
  FileText,
} from "lucide-react";
import { TodaysPrioritiesShelf } from "./todays-priorities-shelf";
import { DailyProgressCard } from "./daily-progress-card";
import { MyTasksPanel } from "./my-tasks-panel";
import { MyScheduleTimeline } from "./my-schedule-timeline";
import { ScheduleTaskDialog } from "./schedule-task-dialog";
import { QuickEventComposer } from "@/features/calendar/components/quick-event-composer";
import { PlannerTask } from "@/features/calendar/types";

export function DailyPlannerWorkspace() {
  const { isLoaded, getDailyPlan, updateDailyNotes } = useCalendar();

  const [currentDateStr, setCurrentDateStr] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  // Mobile view tab: 'tasks' | 'schedule'
  const [mobileTab, setMobileTab] = useState<"tasks" | "schedule">("tasks");

  // Modals
  const [scheduleTaskOpen, setScheduleTaskOpen] = useState(false);
  const [taskToSchedule, setTaskToSchedule] = useState<PlannerTask | null>(null);
  const [slotTime, setSlotTime] = useState<string>("10:00");
  const [quickEventOpen, setQuickEventOpen] = useState(false);

  // Daily intention / notes
  const plan = getDailyPlan(currentDateStr);
  const [dailyNotes, setDailyNotes] = useState(plan.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-20 w-full rounded-2xl bg-slate-200/60 skeleton-shimmer" />
        <div className="h-32 w-full rounded-2xl bg-slate-200/60 skeleton-shimmer" />
        <div className="h-[500px] w-full rounded-2xl bg-slate-200/60 skeleton-shimmer" />
      </div>
    );
  }

  const handleOpenSchedule = (task: PlannerTask) => {
    setTaskToSchedule(task);
    setSlotTime("11:00");
    setScheduleTaskOpen(true);
  };

  const handleSlotClick = (timeStr: string) => {
    setSlotTime(timeStr);
    setQuickEventOpen(true);
  };

  const handleSaveNotes = () => {
    updateDailyNotes(currentDateStr, dailyNotes);
    setIsEditingNotes(false);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner Header */}
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Calendar</span>
            </Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-100">
              <Sparkles size={12} className="text-amber-500" />
              <span>Daily Planning Workspace</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Plan Your Day
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select high-impact priorities, block dedicated focus time, and align your schedule.
          </p>
        </div>

        {/* Daily Intention / Notes input button */}
        <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingNotes(!isEditingNotes)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
          >
            <FileText size={14} className="text-slate-500" />
            <span>{isEditingNotes ? "Close Intention" : "Daily Intention"}</span>
          </button>
        </div>
      </header>

      {/* Expandable Daily Intention Card */}
      {isEditingNotes && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/20 p-4 shadow-2xs motion-safe:animate-fade-in space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            What is your core intention or mindset for today?
          </label>
          <textarea
            rows={2}
            value={dailyNotes}
            onChange={(e) => setDailyNotes(e.target.value)}
            placeholder="e.g. Focus on finishing the enterprise demo deck before lunch. Keep afternoon free for unblocking team..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-blue-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
            >
              Save Intention
            </button>
          </div>
        </div>
      )}

      {/* Daily Progress metrics card */}
      <DailyProgressCard currentDateStr={currentDateStr} />

      {/* Today's Top Priorities Shelf */}
      <TodaysPrioritiesShelf
        currentDateStr={currentDateStr}
        onOpenSchedule={handleOpenSchedule}
      />

      {/* Mobile Tab Switcher */}
      <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("tasks")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "tasks"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ListTodo size={15} />
          <span>My Tasks</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("schedule")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "schedule"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarCheck2 size={15} />
          <span>My Schedule</span>
        </button>
      </div>

      {/* Two-Panel Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Panel: My Tasks (5 cols on desktop) */}
        <div
          className={`lg:col-span-5 h-[640px] ${
            mobileTab === "tasks" ? "block" : "hidden lg:block"
          }`}
        >
          <MyTasksPanel
            currentDateStr={currentDateStr}
            onScheduleTask={handleOpenSchedule}
          />
        </div>

        {/* Right Panel: My Schedule (7 cols on desktop) */}
        <div
          className={`lg:col-span-7 h-[640px] ${
            mobileTab === "schedule" ? "block" : "hidden lg:block"
          }`}
        >
          <MyScheduleTimeline
            currentDateStr={currentDateStr}
            onDateChange={setCurrentDateStr}
            onOpenQuickBlock={handleSlotClick}
          />
        </div>
      </div>

      {/* Schedule task modal */}
      <ScheduleTaskDialog
        isOpen={scheduleTaskOpen}
        task={taskToSchedule}
        defaultDate={currentDateStr}
        defaultTime={slotTime}
        onClose={() => {
          setScheduleTaskOpen(false);
          setTaskToSchedule(null);
        }}
      />

      {/* Quick event composer for timeline click */}
      <QuickEventComposer
        isOpen={quickEventOpen}
        onClose={() => setQuickEventOpen(false)}
        onMoreOptions={() => setQuickEventOpen(false)}
        initialDate={currentDateStr}
        initialTime={slotTime}
      />
    </div>
  );
}
