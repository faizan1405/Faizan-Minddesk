"use client";

import { useMemo, useEffect, useRef } from "react";
import { useCalendar } from "../../calendar-context";
import { ExpandedCalendarEvent } from "../../types";
import { format, isToday } from "date-fns";
import {
  layoutOverlappingEvents,
  layoutOverlappingBlocks,
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
} from "../../services/calendar-layout";
import { Clock, MapPin, CheckSquare, Square, Plus } from "lucide-react";

interface DayViewProps {
  onSelectEvent: (event: ExpandedCalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // pixels per hour in single day view for extra spaciousness

export function DayView({ onSelectEvent, onSlotClick }: DayViewProps) {
  const {
    selectedDate,
    categories,
    settings,
    getEventsForRange,
    scheduledBlocks,
    rescheduleEvent,
    toggleTaskComplete,
  } = useCalendar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dayStr = format(selectedDate, "yyyy-MM-dd");
  const isCurrentDay = isToday(selectedDate);

  // Expanded events for this day
  const visibleEvents = useMemo(() => {
    return getEventsForRange(selectedDate, selectedDate);
  }, [getEventsForRange, selectedDate]);

  const visibleCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.isVisible).map((c) => c.id)),
    [categories]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const allDayEvents = useMemo(
    () => visibleEvents.filter((e) => e.allDay && visibleCategoryIds.has(e.categoryId)),
    [visibleEvents, visibleCategoryIds]
  );

  const timedEvents = useMemo(
    () => visibleEvents.filter((e) => !e.allDay && visibleCategoryIds.has(e.categoryId)),
    [visibleEvents, visibleCategoryIds]
  );

  const dayBlocks = useMemo(
    () => scheduledBlocks.filter((b) => b.date === dayStr),
    [scheduledBlocks, dayStr]
  );

  const positionedEvents = useMemo(
    () => layoutOverlappingEvents(timedEvents),
    [timedEvents]
  );

  const positionedBlocks = useMemo(
    () => layoutOverlappingBlocks(dayBlocks),
    [dayBlocks]
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, [selectedDate]);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  const handleResizeStart = (e: React.MouseEvent, evt: ExpandedCalendarEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origStartMins = parseTimeToMinutes(evt.startTime, 9 * 60);
    const origEndMins = parseTimeToMinutes(evt.endTime, origStartMins + 60);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
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
      {/* Day header banner */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-6 py-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {timedEvents.length} scheduled {timedEvents.length === 1 ? "event" : "events"} ·{" "}
            {dayBlocks.length} focus {dayBlocks.length === 1 ? "session" : "sessions"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSlotClick(dayStr, "10:00")}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted shadow-2xs transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Add to this day</span>
        </button>
      </div>

      {/* All day events bar */}
      {allDayEvents.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            ALL DAY:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allDayEvents.map((evt) => {
              const cat = categoryMap.get(evt.categoryId);
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => onSelectEvent(evt)}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-2xs hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: evt.customColor || cat?.color || "#2563eb" }}
                >
                  {evt.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline container */}
      <div
        ref={scrollContainerRef}
        className="relative max-h-[700px] overflow-y-auto grid grid-cols-[70px_1fr]"
      >
        {/* Time labels */}
        <div className="border-r border-border bg-muted/30">
          {HOURS.map((hour) => {
            const timeStr = formatTimeDisplay(`${String(hour).padStart(2, "0")}:00`, settings.timeFormat);
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative -top-2.5 pr-3 text-right text-[11px] font-semibold text-muted-foreground"
              >
                {hour !== 0 && timeStr}
              </div>
            );
          })}
        </div>

        {/* Schedule grid */}
        <div className="relative bg-card" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              onClick={() => onSlotClick(dayStr, `${String(hour).padStart(2, "0")}:00`)}
              className="absolute inset-x-0 border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              <div className="absolute top-1/2 inset-x-0 border-b border-dashed border-border/30 opacity-60" />
            </div>
          ))}

          {/* Current time red marker */}
          {isCurrentDay && (
            <div
              style={{ top: `${currentTimeTop}px` }}
              className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
            >
              <div className="size-2.5 rounded-full bg-rose-500 shadow-xs -ml-1 ring-2 ring-background" />
              <div className="h-0.5 flex-1 bg-rose-500 shadow-xs" />
            </div>
          )}

          {/* Positioned Events */}
          {positionedEvents.map((item) => {
            const { event: evt, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(30, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;
            const cat = categoryMap.get(evt.categoryId);
            const bg = evt.customColor || cat?.color || "#2563eb";

            return (
              <div
                key={evt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(evt);
                }}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1.5}%`,
                }}
                className="absolute z-10 rounded-xl p-3 text-white shadow-sm transition-all hover:z-30 hover:brightness-105 active:scale-98 cursor-pointer overflow-hidden flex flex-col justify-between group"
              >
                <div
                  className="absolute inset-0 opacity-95 rounded-xl"
                  style={{ backgroundColor: bg }}
                />

                <div className="relative z-10 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs sm:text-sm leading-tight truncate">
                      {evt.title}
                    </p>
                    <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0">
                      {cat?.name}
                    </span>
                  </div>

                  <p className="text-[11px] opacity-90 font-medium flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>
                      {formatTimeDisplay(evt.startTime, settings.timeFormat)} –{" "}
                      {formatTimeDisplay(evt.endTime, settings.timeFormat)}
                    </span>
                  </p>

                  {evt.location && (
                    <p className="text-[11px] opacity-80 flex items-center gap-1 truncate">
                      <MapPin size={11} />
                      <span>{evt.location}</span>
                    </p>
                  )}
                </div>

                {/* Resize Handle */}
                <div
                  onMouseDown={(e) => handleResizeStart(e, evt)}
                  className="relative z-20 h-2.5 w-full cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded-b transition-opacity flex items-center justify-center"
                >
                  <div className="h-0.5 w-8 rounded bg-white/60" />
                </div>
              </div>
            );
          })}

          {/* Positioned Scheduled Task Blocks */}
          {positionedBlocks.map((item) => {
            const { block, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(30, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;

            return (
              <div
                key={block.id}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1.5}%`,
                }}
                className={`absolute z-10 rounded-xl p-3 border shadow-xs transition-all hover:z-30 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  block.completed
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 line-through dark:text-emerald-400"
                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskComplete(block.taskId);
                      }}
                      className="cursor-pointer"
                    >
                      {block.completed ? (
                        <CheckSquare size={16} className="text-emerald-600" />
                      ) : (
                        <Square size={16} className="text-primary" />
                      )}
                    </button>
                    <p className="font-bold text-xs sm:text-sm truncate">{block.title}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground font-medium pl-6">
                    {formatTimeDisplay(block.startTime, settings.timeFormat)} · {block.durationMinutes} min focus session
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
