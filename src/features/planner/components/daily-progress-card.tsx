"use client";

import { useCalendar } from "@/features/calendar/calendar-context";
import { CheckCircle2, Clock, Calendar, TrendingUp } from "lucide-react";
import { parseTimeToMinutes } from "@/features/calendar/services/calendar-layout";

interface DailyProgressCardProps {
  currentDateStr: string;
}

export function DailyProgressCard({ currentDateStr }: DailyProgressCardProps) {
  const { tasks, scheduledBlocks, getEventsForRange, getDailyPlan } = useCalendar();

  const plan = getDailyPlan(currentDateStr);
  const priorityIds = new Set(plan.topPriorityTaskIds || []);

  // Today's tasks (either marked priority or due today)
  const todayTasks = tasks.filter(
    (t) => priorityIds.has(t.id) || t.dueDate === currentDateStr
  );

  const completedCount = todayTasks.filter((t) => t.completed).length;
  const totalCount = todayTasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Scheduled Focus Time from task blocks
  const dayBlocks = scheduledBlocks.filter((b) => b.date === currentDateStr);
  const totalFocusMinutes = dayBlocks.reduce((acc, b) => acc + (b.durationMinutes || 60), 0);

  // Scheduled calendar events time
  const [year, month, day] = currentDateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayEvents = getEventsForRange(dateObj, dateObj).filter((e) => !e.allDay);

  const totalEventMinutes = dayEvents.reduce((acc, e) => {
    const s = parseTimeToMinutes(e.startTime, 9 * 60);
    const end = parseTimeToMinutes(e.endTime, s + 60);
    return acc + Math.max(0, end - s);
  }, 0);

  // Total committed minutes out of standard 8-hour (480 min) workday
  const STANDARD_WORKDAY_MINUTES = 8 * 60; // 480 mins
  const committedMinutes = totalFocusMinutes + totalEventMinutes;
  const remainingAvailableMinutes = Math.max(0, STANDARD_WORKDAY_MINUTES - committedMinutes);

  const formatHoursMinutes = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Metric 1: Tasks Done */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
          <CheckCircle2 size={15} className="text-emerald-500" />
        </div>
        <p className="mt-1 text-lg sm:text-xl font-extrabold text-foreground">
          {completedCount} <span className="text-xs font-semibold text-muted-foreground">/ {totalCount}</span>
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Metric 2: Focus Time Blocked */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider">Focus Blocked</span>
          <Clock size={15} className="text-primary" />
        </div>
        <p className="mt-1 text-lg sm:text-xl font-extrabold text-primary">
          {formatHoursMinutes(totalFocusMinutes)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
          {dayBlocks.length} scheduled {dayBlocks.length === 1 ? "block" : "blocks"}
        </p>
      </div>

      {/* Metric 3: Meetings & Events */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider">Events</span>
          <Calendar size={15} className="text-purple-500" />
        </div>
        <p className="mt-1 text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400">
          {formatHoursMinutes(totalEventMinutes)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
          {dayEvents.length} calendar {dayEvents.length === 1 ? "event" : "events"}
        </p>
      </div>

      {/* Metric 4: Free Time Left */}
      <div className="rounded-xl border border-border bg-card text-card-foreground p-3.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
          <TrendingUp size={15} className="text-amber-500" />
        </div>
        <p className="mt-1 text-lg sm:text-xl font-extrabold text-foreground">
          {formatHoursMinutes(remainingAvailableMinutes)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
          of 8h work window
        </p>
      </div>
    </div>
  );
}
