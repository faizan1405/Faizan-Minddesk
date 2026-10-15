"use client";

import React, { useMemo } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Brain,
} from "lucide-react";
import {
  parseTimeToMinutes,
  calculateMergedOccupiedMinutes,
  checkIntervalConflict,
} from "@/features/calendar/services/calendar-layout";

interface DailyProgressCardProps {
  currentDateStr: string;
}

export function DailyProgressCard({ currentDateStr }: DailyProgressCardProps) {
  const { tasks, scheduledBlocks, getEventsForRange, getDailyPlan, focusSessions } = useCalendar();

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = useMemo(
    () => new Set(plan.topPriorityTaskIds || []),
    [plan.topPriorityTaskIds]
  );

  // Actual focused time recorded via Pomodoro sessions for this date
  const actualFocusedMinutes = useMemo(() => {
    return (focusSessions || [])
      .filter((s) => s.date === currentDateStr)
      .reduce((acc, curr) => acc + (curr.focusedMinutes || 0), 0);
  }, [focusSessions, currentDateStr]);

  // Today's tasks (either marked priority or due today)
  const todayTasks = useMemo(() => {
    return tasks.filter(
      (t) => priorityIds.has(t.id) || t.dueDate === currentDateStr || t.due === "Today"
    );
  }, [tasks, priorityIds, currentDateStr]);

  const completedCount = todayTasks.filter((t) => t.completed).length;
  const totalCount = todayTasks.length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Blocks on this date
  const dayBlocks = useMemo(() => {
    return scheduledBlocks.filter((b) => b.date === currentDateStr);
  }, [scheduledBlocks, currentDateStr]);

  // Calendar events on this date
  const [year, month, day] = currentDateStr.split("-").map(Number);
  const dateObj = useMemo(() => new Date(year, month - 1, day), [year, month, day]);
  const dayEvents = useMemo(() => {
    return getEventsForRange(dateObj, dateObj).filter((e) => !e.allDay);
  }, [getEventsForRange, dateObj]);

  // Convert all items to interval objects
  const eventIntervals = useMemo(() => {
    return dayEvents.map((e) => {
      const start = parseTimeToMinutes(e.startTime, 540);
      const end = parseTimeToMinutes(e.endTime, start + 60);
      return { id: e.id, title: e.title, startMinutes: start, endMinutes: Math.max(start + 15, end) };
    });
  }, [dayEvents]);

  const blockIntervals = useMemo(() => {
    return dayBlocks.map((b) => {
      const start = parseTimeToMinutes(b.startTime, 540);
      const end = parseTimeToMinutes(b.endTime, start + (b.durationMinutes || 60));
      return { id: b.id, title: b.title, startMinutes: start, endMinutes: Math.max(start + 15, end), block: b };
    });
  }, [dayBlocks]);

  const allItems = useMemo(() => [...eventIntervals, ...blockIntervals], [eventIntervals, blockIntervals]);

  // 1. Total scheduled minutes (computed using interval union so overlaps are NOT double-counted)
  const totalScheduledMinutes = useMemo(() => {
    return calculateMergedOccupiedMinutes(allItems);
  }, [allItems]);

  // 2. Focus work minutes
  const focusMinutes = useMemo(() => {
    const focusItems = blockIntervals.filter(
      (b) => b.block.blockType === "focus" || b.block.blockType === "task" || !b.block.blockType
    );
    return calculateMergedOccupiedMinutes(focusItems);
  }, [blockIntervals]);

  // 3. Scheduling conflicts count
  const conflictCount = useMemo(() => {
    let count = 0;
    for (const item of allItems) {
      const { hasConflict } = checkIntervalConflict(item, allItems);
      if (hasConflict) count++;
    }
    // Divide by 2 to get number of conflicting pairs
    return Math.floor(count / 2);
  }, [allItems]);

  // 4. Available time calculation (out of standard 8-hour / 480-minute workday)
  const STANDARD_WORKDAY_MINUTES = 8 * 60; // 480 mins
  const remainingAvailableMinutes = Math.max(0, STANDARD_WORKDAY_MINUTES - totalScheduledMinutes);

  const formatHoursMinutes = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
      {/* Metric 1: Tasks Progress */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Tasks</span>
          <CheckCircle2 size={14} className="text-emerald-500" />
        </div>
        <p className="mt-1 text-base sm:text-xl font-extrabold text-foreground">
          {completedCount} <span className="text-xs font-semibold text-muted-foreground">/ {totalCount}</span>
        </p>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{remainingCount} remaining</span>
          <span className="font-bold text-foreground">{completionPercentage}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Metric 2: Scheduled Time */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Scheduled</span>
          <Clock size={14} className="text-primary" />
        </div>
        <p className="mt-1 text-base sm:text-xl font-extrabold text-primary">
          {formatHoursMinutes(totalScheduledMinutes)}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground font-medium">
          {dayBlocks.length + dayEvents.length} total appointments
        </p>
      </div>

      {/* Metric 3: Focus Hours (Separating Planned Hours from Actual Focused Minutes) */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Focus Work</span>
          <Brain size={14} className="text-indigo-500" />
        </div>
        <p className="mt-1 text-base sm:text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
          {formatHoursMinutes(actualFocusedMinutes)}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground font-medium">
          Planned: {formatHoursMinutes(focusMinutes)}
        </p>
      </div>

      {/* Metric 4: Free Available Time */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Available</span>
          <TrendingUp size={14} className="text-amber-500" />
        </div>
        <p className="mt-1 text-base sm:text-xl font-extrabold text-foreground">
          {formatHoursMinutes(remainingAvailableMinutes)}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground font-medium">
          of 8h work window
        </p>
      </div>

      {/* Metric 5: Conflicts Indicator */}
      <div className="col-span-2 lg:col-span-1 rounded-xl border border-border bg-card text-card-foreground p-3 sm:p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Conflicts</span>
          <AlertTriangle
            size={14}
            className={conflictCount > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"}
          />
        </div>
        <p
          className={`mt-1 text-base sm:text-xl font-extrabold ${
            conflictCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          }`}
        >
          {conflictCount === 0 ? "0" : conflictCount}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground font-medium">
          {conflictCount === 0 ? "Schedule is clear" : `${conflictCount} overlapping block${conflictCount === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
}
