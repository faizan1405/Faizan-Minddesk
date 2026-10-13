"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useCalendar } from "../../calendar-context";
import { ExpandedCalendarEvent, ScheduledTaskBlock } from "../../types";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
} from "date-fns";
import {
  layoutOverlappingEvents,
  layoutOverlappingBlocks,
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
} from "../../services/calendar-layout";
import { CheckSquare, Square, Clock } from "lucide-react";

interface WeekViewProps {
  onSelectEvent: (event: ExpandedCalendarEvent) => void;
  onSelectBlock?: (block: ScheduledTaskBlock) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56; // pixels per hour

export function WeekView({ onSelectEvent, onSelectBlock, onSlotClick }: WeekViewProps) {
  const {
    selectedDate,
    categories,
    settings,
    getEventsForRange,
    scheduledBlocks,
    rescheduleEvent,
    rescheduleTaskBlock,
    updateTaskBlock,
    toggleTaskComplete,
  } = useCalendar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  // Week range
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: settings.weekStartsOn });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: settings.weekStartsOn });
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  // Expanded events
  const visibleEvents = useMemo(
    () => getEventsForRange(weekStart, weekEnd),
    [getEventsForRange, weekStart, weekEnd]
  );

  const visibleCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.isVisible).map((c) => c.id)),
    [categories]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  // Current time line calculation
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  // Separate all-day events vs timed events per day
  const eventsByDay = useMemo(() => {
    const map = new Map<
      string,
      { allDay: ExpandedCalendarEvent[]; timed: ExpandedCalendarEvent[]; blocks: ScheduledTaskBlock[] }
    >();

    for (const day of weekDays) {
      const dayStr = format(day, "yyyy-MM-dd");
      map.set(dayStr, { allDay: [], timed: [], blocks: [] });
    }

    for (const evt of visibleEvents) {
      if (!visibleCategoryIds.has(evt.categoryId)) continue;
      const dayStr = evt.startDate;
      const entry = map.get(dayStr);
      if (entry) {
        if (evt.allDay) {
          entry.allDay.push(evt);
        } else {
          entry.timed.push(evt);
        }
      }
    }

    for (const block of scheduledBlocks) {
      const entry = map.get(block.date);
      if (entry) {
        entry.blocks.push(block);
      }
    }

    return map;
  }, [weekDays, visibleEvents, visibleCategoryIds, scheduledBlocks]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(eventId);
  };

  const handleSlotDrop = (e: React.DragEvent, dayStr: string, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain") || draggedEventId;
    if (!eventId) return;

    // Check if dragged item is a scheduled block
    const blk = scheduledBlocks.find((b) => b.id === eventId);
    if (blk) {
      const origStartMins = parseTimeToMinutes(blk.startTime, 9 * 60);
      const origEndMins = parseTimeToMinutes(blk.endTime, origStartMins + blk.durationMinutes);
      const duration = origEndMins - origStartMins;

      const newStartMins = hour * 60;
      const newEndMins = newStartMins + duration;

      rescheduleTaskBlock(
        blk.id,
        dayStr,
        minutesToTimeString(newStartMins),
        minutesToTimeString(newEndMins)
      );
      setDraggedEventId(null);
      return;
    }

    const evt = visibleEvents.find((ev) => ev.id === eventId || ev.originalEventId === eventId);
    if (evt) {
      const origStartMins = parseTimeToMinutes(evt.startTime, 9 * 60);
      const origEndMins = parseTimeToMinutes(evt.endTime, origStartMins + 60);
      const duration = origEndMins - origStartMins;

      const newStartMins = hour * 60;
      const newEndMins = newStartMins + duration;

      rescheduleEvent(
        evt.originalEventId || evt.id,
        dayStr,
        minutesToTimeString(newStartMins),
        dayStr,
        minutesToTimeString(newEndMins)
      );
    }
    setDraggedEventId(null);
  };

  const handleBlockResizeStart = (e: React.MouseEvent, block: ScheduledTaskBlock) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origDuration = block.durationMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
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

  // Resize handler: drag on bottom handle
  const handleResizeStart = (e: React.MouseEvent, evt: ExpandedCalendarEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origStartMins = parseTimeToMinutes(evt.startTime, 9 * 60);
    const origEndMins = parseTimeToMinutes(evt.endTime, origStartMins + 60);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15; // 15 min snap
      const newEndMins = Math.max(origStartMins + 15, Math.min(24 * 60, origEndMins + deltaMins));
      rescheduleEvent(
        evt.originalEventId || evt.id,
        evt.startDate,
        evt.startTime,
        evt.endDate || evt.startDate,
        minutesToTimeString(newEndMins)
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden select-none">
      {/* Header row: weekday names and dates */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/60">
        <div className="border-r border-border py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase">
          GMT
        </div>
        {weekDays.map((day) => {
          const isCurrent = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`border-r border-border last:border-r-0 py-2 px-1 text-center ${
                isCurrent ? "bg-primary/5" : ""
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE")}
              </p>
              <span
                className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent ? "bg-primary text-primary-foreground shadow-xs" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row if any exist */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30 text-xs">
        <div className="border-r border-border p-2 text-center text-[10px] font-bold text-muted-foreground">
          ALL DAY
        </div>
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const allDayEvents = eventsByDay.get(dayStr)?.allDay || [];
          return (
            <div
              key={dayStr}
              className="border-r border-border last:border-r-0 p-1 space-y-1 min-h-[32px]"
            >
              {allDayEvents.map((evt) => {
                const cat = categoryMap.get(evt.categoryId);
                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="truncate rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-2xs hover:brightness-110 cursor-pointer"
                    style={{ backgroundColor: evt.customColor || cat?.color }}
                  >
                    {evt.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 24-hour timeline scrollable grid */}
      <div
        ref={scrollContainerRef}
        className="relative max-h-[680px] overflow-y-auto grid grid-cols-[60px_repeat(7,1fr)] divide-x divide-border"
      >
        {/* Time labels column */}
        <div className="relative bg-muted/30">
          {HOURS.map((hour) => {
            const timeStr = formatTimeDisplay(`${String(hour).padStart(2, "0")}:00`, settings.timeFormat);
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative -top-2 pr-2 text-right text-[10px] font-semibold text-muted-foreground select-none"
              >
                {hour !== 0 && timeStr}
              </div>
            );
          })}
        </div>

        {/* 7 Days columns */}
        {weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const isCurrent = isToday(day);
          const dayData = eventsByDay.get(dayStr) || { allDay: [], timed: [], blocks: [] };
          const positionedEvents = layoutOverlappingEvents(dayData.timed);
          const positionedBlocks = layoutOverlappingBlocks(dayData.blocks);

          return (
            <div
              key={dayStr}
              className={`relative ${isCurrent ? "bg-primary/5" : "bg-card"}`}
              style={{ height: `${24 * HOUR_HEIGHT}px` }}
            >
              {/* Hour horizontal grid lines & click slots */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  onClick={() => onSlotClick(dayStr, `${String(hour).padStart(2, "0")}:00`)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleSlotDrop(e, dayStr, hour)}
                  className="absolute inset-x-0 border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <div className="absolute top-1/2 inset-x-0 border-b border-dashed border-border/30 opacity-60" />
                </div>
              ))}

              {/* Current time red indicator line */}
              {isCurrent && (
                <div
                  style={{ top: `${currentTimeTop}px` }}
                  className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                >
                  <div className="size-2 rounded-full bg-rose-500 shadow-xs -ml-1 ring-2 ring-background" />
                  <div className="h-0.5 flex-1 bg-rose-500 shadow-xs" />
                </div>
              )}

              {/* Timed Event Blocks */}
              {positionedEvents.map((item) => {
                const { event: evt, startMinutes, durationMinutes, column, totalColumns } = item;
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = Math.max(22, (durationMinutes / 60) * HOUR_HEIGHT);
                const widthPercent = 100 / totalColumns;
                const leftPercent = column * widthPercent;
                const cat = categoryMap.get(evt.categoryId);
                const bg = evt.customColor || cat?.color || "#2563eb";

                return (
                  <div
                    key={evt.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, evt.originalEventId || evt.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(evt);
                    }}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent - 1}%`,
                    }}
                    className="absolute z-10 rounded-lg p-1.5 text-xs text-white shadow-xs transition-all hover:z-30 hover:brightness-105 active:scale-98 cursor-pointer overflow-hidden flex flex-col justify-between group"
                  >
                    <div
                      className="absolute inset-0 opacity-90 rounded-lg"
                      style={{ backgroundColor: bg }}
                    />
                    <div className="relative z-10 min-w-0">
                      <p className="font-bold text-[11px] leading-tight truncate text-white drop-shadow-2xs">
                        {evt.title}
                      </p>
                      <p className="text-[10px] opacity-90 truncate mt-0.5 font-medium flex items-center gap-1">
                        <Clock size={10} />
                        <span>
                          {formatTimeDisplay(evt.startTime, settings.timeFormat)} –{" "}
                          {formatTimeDisplay(evt.endTime, settings.timeFormat)}
                        </span>
                      </p>
                    </div>

                    {/* Resize handle at bottom */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, evt)}
                      className="relative z-20 h-2 w-full cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-b transition-opacity flex items-center justify-center"
                    >
                      <div className="h-0.5 w-6 rounded bg-white/60" />
                    </div>
                  </div>
                );
              })}

              {/* Scheduled Task Blocks */}
              {positionedBlocks.map((item) => {
                const { block, startMinutes, durationMinutes, column, totalColumns } = item;
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = Math.max(22, (durationMinutes / 60) * HOUR_HEIGHT);
                const widthPercent = 100 / totalColumns;
                const leftPercent = column * widthPercent;

                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectBlock) onSelectBlock(block);
                    }}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent - 1}%`,
                    }}
                    className={`group absolute z-10 rounded-lg p-1.5 text-xs border shadow-2xs transition-all hover:z-30 cursor-pointer overflow-hidden flex flex-col justify-between ${
                      block.completed
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 line-through dark:text-emerald-400"
                        : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-bold text-[11px] truncate">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (block.taskId) {
                              toggleTaskComplete(block.taskId);
                            } else {
                              updateTaskBlock(block.id, { completed: !block.completed });
                            }
                          }}
                          className="cursor-pointer shrink-0"
                        >
                          {block.completed ? (
                            <CheckSquare size={12} className="text-emerald-600" />
                          ) : (
                            <Square size={12} className="text-primary" />
                          )}
                        </button>
                        <span className="truncate">{block.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {formatTimeDisplay(block.startTime, settings.timeFormat)} ({block.durationMinutes}m)
                      </p>
                    </div>

                    {/* Resize handle at bottom */}
                    <div
                      onMouseDown={(e) => handleBlockResizeStart(e, block)}
                      className="relative z-20 h-1.5 w-full cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30 rounded-b transition-opacity flex items-center justify-center"
                    >
                      <div className="h-0.5 w-4 rounded bg-primary/40" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
