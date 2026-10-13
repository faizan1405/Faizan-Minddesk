"use client";

import { useState, useMemo, useEffect } from "react";
import { useCalendar } from "../calendar-context";
import { ExpandedCalendarEvent, PlannerTask } from "../types";
import { Search, X, CheckSquare, Clock, ArrowRight } from "lucide-react";
import { parseISO } from "date-fns";

interface CalendarSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: ExpandedCalendarEvent) => void;
}

export function CalendarSearchDialog({
  isOpen,
  onClose,
  onSelectEvent,
}: CalendarSearchDialogProps) {
  const { events, tasks, categories, setSelectedDate } = useCalendar();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  // Global keydown listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filteredEvents = useMemo(() => {
    if (!query.trim()) return events.slice(0, 6);
    const q = query.toLowerCase();
    return events.filter((e) => {
      const titleMatch = e.title.toLowerCase().includes(q);
      const descMatch = e.description?.toLowerCase().includes(q);
      const catMatch = categoryMap.get(e.categoryId)?.name.toLowerCase().includes(q);
      return titleMatch || descMatch || catMatch;
    });
  }, [events, query, categoryMap]);

  const filteredTasks = useMemo(() => {
    if (!query.trim()) return tasks.slice(0, 4);
    const q = query.toLowerCase();
    return tasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      return titleMatch || descMatch;
    });
  }, [tasks, query]);

  if (!isOpen) return null;

  const handlePickEvent = (evt: ExpandedCalendarEvent) => {
    try {
      setSelectedDate(parseISO(evt.startDate));
    } catch {}
    onSelectEvent(evt);
    onClose();
  };

  const handlePickTask = (t: PlannerTask) => {
    if (t.dueDate) {
      try {
        setSelectedDate(parseISO(t.dueDate));
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search events, descriptions, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Events Section */}
          <div>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Events ({filteredEvents.length})
            </p>
            {filteredEvents.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No matching events found.</p>
            ) : (
              <div className="space-y-1">
                {filteredEvents.map((evt) => {
                  const cat = categoryMap.get(evt.categoryId);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => handlePickEvent(evt as ExpandedCalendarEvent)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: evt.customColor || cat?.color || "#2563eb" }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                            {evt.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Clock size={11} />
                            <span>{evt.startDate}</span>
                            {evt.startTime && <span>· {evt.startTime}</span>}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="border-t border-border pt-3">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tasks ({filteredTasks.length})
            </p>
            {filteredTasks.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No matching tasks found.</p>
            ) : (
              <div className="space-y-1">
                {filteredTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePickTask(t)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left hover:bg-muted transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckSquare
                        size={15}
                        className={t.completed ? "text-emerald-500" : "text-muted-foreground"}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            t.completed ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {t.title}
                        </p>
                        {t.dueDate && (
                          <p className="text-[11px] text-muted-foreground">Due: {t.dueDate}</p>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with click</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
