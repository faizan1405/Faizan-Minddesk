"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { ScheduledTaskBlock, PlannerTask } from "@/features/calendar/types";
import {
  format,
  isToday,
  addDays,
  subDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
  Coffee,
  Brain,
} from "lucide-react";
import {
  layoutOverlappingEvents,
  layoutOverlappingBlocks,
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
} from "@/features/calendar/services/calendar-layout";

interface MyScheduleTimelineProps {
  currentDateStr: string;
  onDateChange: (newDateStr: string) => void;
  onOpenQuickBlock: (timeStr: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // 60px per hour

export function MyScheduleTimeline({
  currentDateStr,
  onDateChange,
  onOpenQuickBlock,
}: MyScheduleTimelineProps) {
  const {
    getEventsForRange,
    scheduledBlocks,
    scheduleTaskBlock,
    updateTaskBlock,
    deleteTaskBlock,
    toggleTaskComplete,
    settings,
    categories,
    addEvent,
  } = useCalendar();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const currentDateObj = useMemo(() => {
    const [year, month, day] = currentDateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [currentDateStr]);
  const isCurrentDay = isToday(currentDateObj);

  // Events on this date
  const dayEvents = useMemo(() => {
    return getEventsForRange(currentDateObj, currentDateObj).filter((e) => !e.allDay);
  }, [getEventsForRange, currentDateObj]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Blocks on this date
  const dayBlocks = useMemo(() => {
    return scheduledBlocks.filter((b) => b.date === currentDateStr);
  }, [scheduledBlocks, currentDateStr]);

  const positionedEvents = useMemo(
    () => layoutOverlappingEvents(dayEvents),
    [dayEvents]
  );

  const positionedBlocks = useMemo(
    () => layoutOverlappingBlocks(dayBlocks),
    [dayBlocks]
  );

  // Scroll to 8 AM on load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, [currentDateStr]);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  // Conflict detection: returns overlapping items
  const checkConflicts = (blockStart: number, blockEnd: number, blockId: string) => {
    const overlapping = [];
    for (const evt of dayEvents) {
      const eStart = parseTimeToMinutes(evt.startTime, 9 * 60);
      const eEnd = parseTimeToMinutes(evt.endTime, eStart + 60);
      if (blockStart < eEnd && blockEnd > eStart) {
        overlapping.push(evt.title);
      }
    }
    for (const b of dayBlocks) {
      if (b.id === blockId) continue;
      const bStart = parseTimeToMinutes(b.startTime, 9 * 60);
      const bEnd = parseTimeToMinutes(b.endTime, bStart + b.durationMinutes);
      if (blockStart < bEnd && blockEnd > bStart) {
        overlapping.push(b.title);
      }
    }
    return overlapping;
  };

  // Drag and drop from MyTasksPanel onto hourly slot
  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverHour(hour);
  };

  const handleDragLeave = (hour: number) => {
    if (dragOverHour === hour) setDragOverHour(null);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (raw) {
        const task: PlannerTask = JSON.parse(raw);
        const startTime = `${String(hour).padStart(2, "0")}:00`;
        scheduleTaskBlock(task.id, currentDateStr, startTime, task.estimatedMinutes || 60);
        return;
      }
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
        const startTime = `${String(hour).padStart(2, "0")}:00`;
        scheduleTaskBlock(taskId, currentDateStr, startTime, 60);
      }
    } catch (err) {
      console.error("Drop task block failed:", err);
    }
  };

  // Quick 1-click presets
  const handleAddPreset = (title: string, durationMinutes: number, categoryId = "cat-personal") => {
    const defaultHour = Math.max(9, Math.min(18, new Date().getHours() + 1));
    const startTime = `${String(defaultHour).padStart(2, "0")}:00`;
    const endTime = minutesToTimeString(defaultHour * 60 + durationMinutes);

    addEvent({
      title,
      startDate: currentDateStr,
      startTime,
      endDate: currentDateStr,
      endTime,
      allDay: false,
      categoryId,
    });
  };

  // Resize block duration
  const handleResizeBlock = (e: React.MouseEvent, block: ScheduledTaskBlock) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origDuration = block.durationMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round((deltaY / HOUR_HEIGHT) * 60 / 15) * 15;
      const newDuration = Math.max(15, Math.min(240, origDuration + deltaMins));
      const [h, m] = block.startTime.split(":").map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + newDuration;
      updateTaskBlock(block.id, {
        durationMinutes: newDuration,
        endTime: minutesToTimeString(endMins),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden select-none">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => onDateChange(format(subDays(currentDateObj, 1), "yyyy-MM-dd"))}
              className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDateChange(format(addDays(currentDateObj, 1), "yyyy-MM-dd"))}
              className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            {format(currentDateObj, "EEEE, MMMM d, yyyy")}
          </h2>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 hidden xl:inline">
            Quick Block:
          </span>
          <button
            type="button"
            onClick={() => handleAddPreset("Coffee Break", 15, "cat-personal")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <Coffee size={12} className="text-amber-500" />
            <span>+15m Break</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset("Deep Work Session", 60, "cat-work")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
          >
            <Brain size={12} className="text-blue-500" />
            <span>+60m Deep Work</span>
          </button>
        </div>
      </div>

      {/* Vertical timeline schedule */}
      <div
        ref={scrollRef}
        className="relative flex-1 max-h-[640px] overflow-y-auto grid grid-cols-[65px_1fr]"
      >
        {/* Time labels column */}
        <div className="border-r border-slate-200/80 bg-slate-50/40">
          {HOURS.map((hour) => {
            const timeStr = formatTimeDisplay(`${String(hour).padStart(2, "0")}:00`, settings.timeFormat);
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative -top-2.5 pr-2.5 text-right text-[10px] font-semibold text-slate-400"
              >
                {hour !== 0 && timeStr}
              </div>
            );
          })}
        </div>

        {/* Timeline droppable grid */}
        <div className="relative bg-white" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {HOURS.map((hour) => {
            const isOver = dragOverHour === hour;
            const hourTime = `${String(hour).padStart(2, "0")}:00`;

            return (
              <div
                key={hour}
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={() => handleDragLeave(hour)}
                onDrop={(e) => handleDrop(e, hour)}
                onClick={() => onOpenQuickBlock(hourTime)}
                className={`absolute inset-x-0 border-b border-slate-100 transition-colors cursor-pointer group ${
                  isOver ? "bg-blue-50/80 ring-2 ring-inset ring-blue-500" : "hover:bg-slate-50/60"
                }`}
              >
                <div className="absolute top-1/2 inset-x-0 border-b border-dashed border-slate-50 opacity-50" />
                {isOver && (
                  <span className="absolute left-4 top-2 text-xs font-bold text-blue-600">
                    Drop task here at {hourTime}
                  </span>
                )}
              </div>
            );
          })}

          {/* Current time line */}
          {isCurrentDay && (
            <div
              style={{ top: `${currentTimeTop}px` }}
              className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
            >
              <div className="size-2.5 rounded-full bg-rose-500 shadow-xs -ml-1 ring-2 ring-white" />
              <div className="h-0.5 flex-1 bg-rose-500 shadow-xs" />
            </div>
          )}

          {/* Calendar Events rendered in timeline */}
          {positionedEvents.map((item) => {
            const { event: evt, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(26, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;
            const cat = categoryMap.get(evt.categoryId);
            const bg = evt.customColor || cat?.color || "#2563eb";

            return (
              <div
                key={evt.id}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1.5}%`,
                }}
                className="absolute z-10 rounded-xl p-2.5 text-white shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div
                  className="absolute inset-0 opacity-90 rounded-xl"
                  style={{ backgroundColor: bg }}
                />
                <div className="relative z-10 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-xs truncate leading-tight drop-shadow-2xs">
                      {evt.title}
                    </p>
                    <span className="rounded bg-white/20 px-1 py-0.2 text-[9px] font-bold uppercase shrink-0">
                      Event
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 font-medium mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    <span>
                      {formatTimeDisplay(evt.startTime, settings.timeFormat)} –{" "}
                      {formatTimeDisplay(evt.endTime, settings.timeFormat)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Scheduled Task Blocks rendered in timeline */}
          {positionedBlocks.map((item) => {
            const { block, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(26, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;

            const conflicts = checkConflicts(startMinutes, startMinutes + durationMinutes, block.id);
            const hasConflict = conflicts.length > 0;

            return (
              <div
                key={block.id}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1.5}%`,
                }}
                className={`absolute z-10 rounded-xl p-2.5 border shadow-xs overflow-hidden flex flex-col justify-between group transition-all ${
                  block.completed
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 opacity-80"
                    : "bg-indigo-50/95 text-indigo-950 border-indigo-200/90 hover:bg-indigo-100"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskComplete(block.taskId);
                        }}
                        className="cursor-pointer"
                      >
                        {block.completed ? (
                          <CheckSquare size={14} className="text-emerald-600" />
                        ) : (
                          <Square size={14} className="text-indigo-600" />
                        )}
                      </button>
                      <p
                        className={`font-bold text-xs truncate ${
                          block.completed ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {block.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTaskBlock(block.id);
                      }}
                      title="Remove time block"
                      className="p-0.5 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {formatTimeDisplay(block.startTime, settings.timeFormat)} · {block.durationMinutes}m focus
                  </p>

                  {/* Conflict notification pill if overlapping */}
                  {hasConflict && !block.completed && (
                    <div className="mt-1 flex items-center gap-1 rounded bg-amber-100/90 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      <AlertTriangle size={10} className="shrink-0" />
                      <span className="truncate">Overlaps with {conflicts[0]}</span>
                    </div>
                  )}
                </div>

                {/* Resize Handle at bottom */}
                <div
                  onMouseDown={(e) => handleResizeBlock(e, block)}
                  className="relative z-20 h-2 w-full cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-slate-300/40 rounded-b transition-opacity flex items-center justify-center"
                >
                  <div className="h-0.5 w-6 rounded bg-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
