"use client";

import { useMemo } from "react";
import { useCalendar } from "../../calendar-context";
import { ExpandedCalendarEvent } from "../../types";
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  parseISO,
  isSameDay,
} from "date-fns";
import {
  Clock,
  MapPin,
  Video,
  ExternalLink,
  CheckSquare,
  Square,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { formatTimeDisplay } from "../../services/calendar-layout";

interface AgendaViewProps {
  onSelectEvent: (event: ExpandedCalendarEvent) => void;
  onSelectDate?: (dateStr: string) => void;
}

export function AgendaView({ onSelectEvent }: AgendaViewProps) {
  const {
    selectedDate,
    categories,
    settings,
    getEventsForRange,
    tasks,
    toggleTaskComplete,
  } = useCalendar();

  // Scan 14 days forward from selectedDate
  const agendaRange = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 14; i++) {
      days.push(addDays(selectedDate, i));
    }
    return days;
  }, [selectedDate]);

  const startDate = agendaRange[0];
  const endDate = agendaRange[agendaRange.length - 1];

  const visibleEvents = useMemo(
    () => getEventsForRange(startDate, endDate),
    [getEventsForRange, startDate, endDate]
  );

  const visibleCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.isVisible).map((c) => c.id)),
    [categories]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Group events and tasks by day
  const groupedAgenda = useMemo(() => {
    return agendaRange.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");

      const dayEvents = visibleEvents.filter((evt) => {
        if (!visibleCategoryIds.has(evt.categoryId)) return false;
        const eStart = parseISO(evt.startDate);
        const eEnd = evt.endDate ? parseISO(evt.endDate) : eStart;
        return isSameDay(day, eStart) || (day >= eStart && day <= eEnd);
      });

      // Sort timed events
      dayEvents.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return (a.startTime || "").localeCompare(b.startTime || "");
      });

      const dayTasks = settings.showTasksOnCalendar
        ? tasks.filter((t) => t.dueDate === dayStr)
        : [];

      return {
        day,
        dayStr,
        events: dayEvents,
        tasks: dayTasks,
        isEmpty: dayEvents.length === 0 && dayTasks.length === 0,
      };
    });
  }, [agendaRange, visibleEvents, visibleCategoryIds, tasks, settings.showTasksOnCalendar]);

  const hasAnyItems = groupedAgenda.some((g) => !g.isEmpty);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-xs p-4 sm:p-6 space-y-6">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <span>Upcoming Agenda (Next 14 Days)</span>
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
        </span>
      </div>

      {!hasAnyItems ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <CalendarDays size={40} className="stroke-1 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">No events or tasks scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create an event or schedule a task to populate your agenda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedAgenda.map((group) => {
            const { day, dayStr, events: dayEvents, tasks: dayTasks, isEmpty } = group;
            if (isEmpty) return null; // Collapse empty days

            const isCurrent = isToday(day);
            const isTmrw = isTomorrow(day);
            const relativeLabel = isCurrent
              ? "Today"
              : isTmrw
              ? "Tomorrow"
              : format(day, "EEEE");

            return (
              <div key={dayStr} className="space-y-2.5">
                {/* Date Group Header */}
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span
                    className={`text-xs sm:text-sm font-bold tracking-tight ${
                      isCurrent ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {relativeLabel} · {format(day, "MMMM d")}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary border border-primary/20">
                      Today
                    </span>
                  )}
                </div>

                {/* Day Items */}
                <div className="space-y-2">
                  {dayEvents.map((evt) => {
                    const cat = categoryMap.get(evt.categoryId);
                    const color = evt.customColor || cat?.color || "#2563eb";

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          {/* Time badge */}
                          <div className="w-24 shrink-0">
                            {evt.allDay ? (
                              <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                All day
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <Clock size={12} className="text-muted-foreground shrink-0" />
                                {formatTimeDisplay(evt.startTime, settings.timeFormat)}
                              </span>
                            )}
                          </div>

                          {/* Color bar & Title */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="size-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary">
                                {evt.title}
                              </p>
                              {evt.location && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                  <MapPin size={11} className="shrink-0" />
                                  <span>{evt.location}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side: Category & Meeting Action */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t pt-2 sm:border-0 sm:pt-0">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              cat?.bgClass || "bg-muted text-foreground"
                            }`}
                          >
                            {cat?.name}
                          </span>

                          {evt.meetingUrl && (
                            <a
                              href={evt.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Video size={12} />
                              <span>Join</span>
                              <ExternalLink size={10} />
                            </a>
                          )}

                          <ChevronRight size={15} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Tasks on this day */}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleTaskComplete(t.id)}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 transition-all cursor-pointer ${
                        t.completed
                          ? "border-border bg-muted/30 text-muted-foreground"
                          : "border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {t.completed ? (
                          <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Square size={16} className="text-primary shrink-0" />
                        )}
                        <span
                          className={`text-xs font-semibold truncate ${
                            t.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          Task: {t.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
                        Task Due
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
