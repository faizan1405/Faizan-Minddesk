"use client";

import { useState, useEffect } from "react";
import { useCalendar } from "../calendar-context";
import { format } from "date-fns";
import { X, Clock, Calendar as CalendarIcon, Tag } from "lucide-react";

interface QuickEventComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onMoreOptions: (initialData: QuickEventData) => void;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:mm
}

export interface QuickEventData {
  title: string;
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  allDay: boolean;
  categoryId: string;
}

export function QuickEventComposer({
  isOpen,
  onClose,
  onMoreOptions,
  initialDate,
  initialTime,
}: QuickEventComposerProps) {
  const { categories, addEvent } = useCalendar();

  const defaultCategory = categories[0]?.id || "cat-work";
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(initialDate || format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(initialTime || "10:00");
  const [endDate, setEndDate] = useState(initialDate || format(new Date(), "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState("11:00");
  const [allDay, setAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategory);

  // Sync state whenever composer opens with new initial date or time
  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || format(new Date(), "yyyy-MM-dd");
      setStartDate(dateToUse);
      setEndDate(dateToUse);
      if (initialTime) {
        setStartTime(initialTime);
        const [h, m] = initialTime.split(":").map(Number);
        const nextHour = (h + 1) % 24;
        setEndTime(`${String(nextHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        setAllDay(false);
      } else {
        setStartTime("10:00");
        setEndTime("11:00");
        setAllDay(false);
      }
      setTitle("");
      setCategoryId(defaultCategory);
    }
  }, [isOpen, initialDate, initialTime, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addEvent({
      title: title.trim(),
      startDate,
      startTime: allDay ? undefined : startTime,
      endDate: allDay ? startDate : endDate,
      endTime: allDay ? undefined : endTime,
      allDay,
      categoryId,
    });

    onClose();
  };

  const handleMoreOptions = () => {
    onMoreOptions({
      title,
      startDate,
      startTime: allDay ? undefined : startTime,
      endDate,
      endTime: allDay ? undefined : endTime,
      allDay,
      categoryId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-composer-title"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarIcon size={16} />
            </span>
            <h2 id="quick-composer-title" className="text-base font-bold text-foreground">
              New Event
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="quick-title" className="sr-only">
              Event title
            </label>
            <input
              id="quick-title"
              type="text"
              required
              autoFocus
              placeholder="Add title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2.5 px-3 border border-border">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock size={14} className="text-muted-foreground" />
              All-day event
            </span>
            <input
              type="checkbox"
              id="quick-allday"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {/* Date and time grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary"
                />
              </div>

              {!allDay && (
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Time</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-1/2 rounded-lg border border-input bg-background px-1.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary"
                    />
                    <span className="text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-1/2 rounded-lg border border-input bg-background px-1.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag size={12} />
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-primary font-semibold shadow-xs"
                        : "opacity-80 hover:opacity-100"
                    } ${cat.bgClass}`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={handleMoreOptions}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              More options
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
