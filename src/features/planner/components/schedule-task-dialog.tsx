"use client";

import { useState, useEffect } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { PlannerTask } from "@/features/calendar/types";
import { X, Clock } from "lucide-react";

interface ScheduleTaskDialogProps {
  isOpen: boolean;
  task: PlannerTask | null;
  defaultDate: string;
  defaultTime?: string;
  onClose: () => void;
}

const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "120 min", value: 120 },
];

export function ScheduleTaskDialog({
  isOpen,
  task,
  defaultDate,
  defaultTime = "10:00",
  onClose,
}: ScheduleTaskDialogProps) {
  const { scheduleTaskBlock } = useCalendar();

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setStartTime(defaultTime);
      setDuration(task?.estimatedMinutes || 60);
    }
  }, [isOpen, defaultDate, defaultTime, task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleTaskBlock(task.id, date, startTime, duration);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock size={16} />
            </span>
            <h2 className="text-base font-bold text-foreground">Schedule Focus Block</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Task Title card */}
        <div className="mt-3.5 rounded-xl bg-muted/40 p-3 border border-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Task</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">{task.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DURATIONS.map((d) => {
                const isSel = duration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSel
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-3.5 py-1.5 font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-1.5 font-semibold text-primary-foreground shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Add to Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
