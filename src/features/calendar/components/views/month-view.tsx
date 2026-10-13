"use client";

import { useMemo, useState } from "react";
import { useCalendar } from "../../calendar-context";
import { ExpandedCalendarEvent, PlannerTask, ScheduledTaskBlock } from "../../types";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  parseISO,
} from "date-fns";
import { CheckSquare, Square, X, ChevronRight } from "lucide-react";
import { formatTimeDisplay } from "../../services/calendar-layout";

interface MonthViewProps {
  onSelectEvent: (event: ExpandedCalendarEvent) => void;
  onDateClick: (dateStr: string) => void;
}

export function MonthView({ onSelectEvent, onDateClick }: MonthViewProps) {
  const {
    selectedDate,
    categories,
    settings,
    getEventsForRange,
    rescheduleEvent,
    rescheduleTaskBlock,
    scheduledBlocks,
    tasks,
    toggleTaskComplete,
  } = useCalendar();

  // Selected date popover for "+ more" overflow
  const [moreEventsDate, setMoreEventsDate] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Month grid date intervals
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: settings.weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: settings.weekStartsOn });

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  // Expanded events for the visible calendar window
  const visibleEvents = useMemo(
    () => getEventsForRange(calendarStart, calendarEnd),
    [getEventsForRange, calendarStart, calendarEnd]
  );

  // Category visibility lookup
  const visibleCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.isVisible).map((c) => c.id)),
    [categories]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ExpandedCalendarEvent[]>();
    for (const evt of visibleEvents) {
      if (!visibleCategoryIds.has(evt.categoryId)) continue;

      const evtStart = parseISO(evt.startDate);
      const evtEnd = evt.endDate ? parseISO(evt.endDate) : evtStart;

      for (const day of calendarDays) {
        const dayStr = format(day, "yyyy-MM-dd");
        if (
          isSameDay(day, evtStart) || isSameDay(day, evtEnd) || (day >= evtStart && day <= evtEnd)
        ) {
          const list = map.get(dayStr) || [];
          list.push(evt);
          map.set(dayStr, list);
        }
      }
    }
    return map;
  }, [visibleEvents, visibleCategoryIds, calendarDays]);

  // Tasks by due date
  const tasksByDate = useMemo(() => {
    if (!settings.showTasksOnCalendar) return new Map<string, PlannerTask[]>();
    const map = new Map<string, PlannerTask[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) || [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    return map;
  }, [tasks, settings.showTasksOnCalendar]);

  // Scheduled task blocks by date
  const blocksByDate = useMemo(() => {
    const map = new Map<string, ScheduledTaskBlock[]>();
    for (const b of scheduledBlocks) {
      const list = map.get(b.date) || [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [scheduledBlocks]);

  const weekDayHeaders = useMemo(() => {
    const week = eachDayOfInterval({
      start: calendarStart,
      end: endOfWeek(calendarStart, { weekStartsOn: settings.weekStartsOn }),
    });
    return week.map((d) => format(d, "EEE"));
  }, [calendarStart, settings.weekStartsOn]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(eventId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  };

  const handleDragLeave = (dateStr: string) => {
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain") || draggedEventId;
    if (eventId) {
      // Check if item is a scheduled block
      const blk = scheduledBlocks.find((b) => b.id === eventId);
      if (blk) {
        rescheduleTaskBlock(blk.id, targetDate, blk.startTime, blk.endTime);
        setDraggedEventId(null);
        setDragOverDate(null);
        return;
      }

      const evt = visibleEvents.find((ev) => ev.id === eventId || ev.originalEventId === eventId);
      if (evt) {
        rescheduleEvent(evt.originalEventId || evt.id, targetDate, evt.startTime, targetDate, evt.endTime);
      }
    }
    setDraggedEventId(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/60 text-center text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider py-2">
        {weekDayHeaders.map((day, idx) => (
          <div key={idx} className="truncate px-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border bg-border/40">
        {calendarDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isCurrentDay = isToday(day);
          const dayEvents = eventsByDate.get(dayStr) || [];
          const dayBlocks = blocksByDate.get(dayStr) || [];
          const dayTasks = tasksByDate.get(dayStr) || [];
          const totalItems = dayEvents.length + dayBlocks.length + dayTasks.length;
          const isOver = dragOverDate === dayStr;

          const MAX_DISPLAY = 3;
          const displayEvents = dayEvents.slice(0, MAX_DISPLAY);
          const remainingSlotsAfterEvents = Math.max(0, MAX_DISPLAY - displayEvents.length);
          const displayBlocks = dayBlocks.slice(0, remainingSlotsAfterEvents);
          const overflowCount = totalItems - MAX_DISPLAY;

          return (
            <div
              key={dayStr}
              onClick={() => onDateClick(dayStr)}
              onDragOver={(e) => handleDragOver(e, dayStr)}
              onDragLeave={() => handleDragLeave(dayStr)}
              onDrop={(e) => handleDrop(e, dayStr)}
              className={`min-h-[95px] sm:min-h-[115px] lg:min-h-[125px] p-1 sm:p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                isCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"
              } ${isOver ? "bg-primary/10 ring-2 ring-inset ring-primary" : "hover:bg-muted/50"}`}
            >
              {/* Day number header */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {totalItems > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline-block">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                )}
              </div>

              {/* Event, Block & Task chips */}
              <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                {/* Event chips */}
                {displayEvents.map((evt) => {
                  const cat = categoryMap.get(evt.categoryId);
                  const isMultiDay = evt.endDate && evt.endDate !== evt.startDate;
                  const chipColor = evt.customColor || cat?.color || "#2563eb";

                  return (
                    <div
                      key={evt.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, evt.originalEventId || evt.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(evt);
                      }}
                      title={`${evt.title} (${evt.allDay ? "All day" : evt.startTime || ""})`}
                      className={`group flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight truncate transition-all hover:brightness-95 active:scale-98 cursor-pointer ${
                        isMultiDay
                          ? "text-white shadow-2xs font-semibold"
                          : `${cat?.bgClass || "bg-primary/10 text-primary border border-primary/20"}`
                      }`}
                      style={{
                        backgroundColor: isMultiDay ? chipColor : undefined,
                      }}
                    >
                      {!isMultiDay && (
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: chipColor }}
                        />
                      )}
                      {!evt.allDay && evt.startTime && (
                        <span className="text-[10px] font-semibold opacity-75 shrink-0 hidden sm:inline">
                          {formatTimeDisplay(evt.startTime, settings.timeFormat)}
                        </span>
                      )}
                      <span className="truncate">{evt.title}</span>
                    </div>
                  );
                })}

                {/* Scheduled Block chips */}
                {displayBlocks.map((block) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    title={`Time Block: ${block.title} (${block.startTime})`}
                    className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate transition-all cursor-pointer border ${
                      block.completed
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 line-through"
                        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20"
                    }`}
                  >
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: block.color || "#6366f1" }}
                    />
                    <span className="text-[9px] font-bold opacity-75 shrink-0 hidden sm:inline">
                      {formatTimeDisplay(block.startTime, settings.timeFormat)}
                    </span>
                    <span className="truncate">{block.title}</span>
                  </div>
                ))}

                {/* Task chips if slot remains */}
                {dayEvents.length < MAX_DISPLAY &&
                  dayTasks.slice(0, MAX_DISPLAY - dayEvents.length).map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskComplete(t.id);
                      }}
                      title={`Task: ${t.title}`}
                      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate transition-all cursor-pointer ${
                        t.completed
                          ? "bg-muted text-muted-foreground line-through"
                          : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                      }`}
                    >
                      {t.completed ? (
                        <CheckSquare size={11} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Square size={11} className="text-primary shrink-0" />
                      )}
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}

                {/* +N more indicator */}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreEventsDate(dayStr);
                    }}
                    className="w-full text-left text-[10px] font-bold text-primary hover:underline px-1 py-0.5 cursor-pointer"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow Date Popover */}
      {moreEventsDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-2xl motion-safe:animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-foreground">
                {format(parseISO(moreEventsDate), "EEEE, MMMM d, yyyy")}
              </h3>
              <button
                type="button"
                onClick={() => setMoreEventsDate(null)}
                aria-label="Close"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5">
              {(eventsByDate.get(moreEventsDate) || []).map((evt) => {
                const cat = categoryMap.get(evt.categoryId);
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => {
                      setMoreEventsDate(null);
                      onSelectEvent(evt);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-muted transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: evt.customColor || cat?.color || "#2563eb" }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                          {evt.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {evt.allDay ? "All day" : formatTimeDisplay(evt.startTime, settings.timeFormat)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}

              {(tasksByDate.get(moreEventsDate) || []).map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTaskComplete(t.id)}
                  className="flex items-center gap-2 rounded-xl p-2 hover:bg-muted cursor-pointer transition-colors"
                >
                  {t.completed ? (
                    <CheckSquare size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Square size={14} className="text-primary shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium truncate ${
                      t.completed ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    Task: {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
