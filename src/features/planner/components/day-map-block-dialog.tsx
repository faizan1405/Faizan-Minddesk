"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  Trash2,
  Brain,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import {
  ScheduledTaskBlock,
  RecurrenceRule,
} from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";
import {
  parseHHMM,
  formatMinutesToHHMM,
  formatMinutesTo12h,
} from "../services/smart-scheduler";

export interface DayMapBlockDialogProps {
  isOpen: boolean;
  block?: ScheduledTaskBlock | null;
  initialDate: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialDurationMinutes?: number;
  allBlocks?: ScheduledTaskBlock[];
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    categoryId: string;
    color: string;
    recurrence?: RecurrenceRule;
  }) => void;
  onDelete?: (blockId: string) => void;
  onToggleComplete?: (blockId: string) => void;
  onStartPomodoro?: (block: ScheduledTaskBlock) => void;
}

const PRESET_DURATIONS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "1.5h", minutes: 90 },
  { label: "2h", minutes: 120 },
  { label: "3h", minutes: 180 },
  { label: "4h", minutes: 240 },
  { label: "6h", minutes: 360 },
];

export function DayMapBlockDialog({
  isOpen,
  block,
  initialDate,
  initialStartTime = "09:00",
  initialEndTime = "09:30",
  initialDurationMinutes = 30,
  allBlocks = [],
  onClose,
  onSave,
  onDelete,
  onToggleComplete,
  onStartPomodoro,
}: DayMapBlockDialogProps) {
  const { plannerCategories } = useCalendar();
  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  const isEditing = Boolean(block);

  // Form State
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "cat-work-focus");
  const [recurrenceFreq, setRecurrenceFreq] = useState<string>("none");

  // Populate fields on mount or when block/initial props change
  useEffect(() => {
    if (!isOpen) return;

    if (block) {
      setTitle(block.title);
      setStartTime(block.startTime);
      setEndTime(block.endTime);
      setDurationMinutes(block.durationMinutes || 30);
      setCategoryId(block.categoryId || categories[0]?.id || "cat-work-focus");
      setRecurrenceFreq(block.recurrence ? block.recurrence.frequency.toLowerCase() : "none");
    } else {
      setTitle("");
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setDurationMinutes(initialDurationMinutes);
      setCategoryId(categories[0]?.id || "cat-work-focus");
      setRecurrenceFreq("none");
    }
  }, [isOpen, block, initialStartTime, initialEndTime, initialDurationMinutes, categories]);

  // Handle Start Time changes: maintain duration & recalculate end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startMins = parseHHMM(newStart);
    const endMins = startMins + durationMinutes;
    setEndTime(formatMinutesToHHMM(endMins));
  };

  // Handle End Time changes: recalculate duration
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const startMins = parseHHMM(startTime);
    const endMins = parseHHMM(newEnd);
    let diff = endMins - startMins;
    if (diff <= 0) {
      // Crossing midnight or invalid
      diff = 30;
    }
    setDurationMinutes(diff);
  };

  // Handle Duration preset change
  const handleDurationPreset = (mins: number) => {
    setDurationMinutes(mins);
    const startMins = parseHHMM(startTime);
    const endMins = startMins + mins;
    setEndTime(formatMinutesToHHMM(endMins));
  };

  // Active Category details
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  }, [categories, categoryId]);

  // Conflict / Collision detection with other blocks on the same day
  const collision = useMemo(() => {
    const currentStartMins = parseHHMM(startTime);
    const currentEndMins = currentStartMins + durationMinutes;

    for (const b of allBlocks) {
      // Skip the current block being edited
      if (block && b.id === block.id) continue;
      // Skip blocks on different dates
      if (b.date !== initialDate) continue;

      const bStartMins = parseHHMM(b.startTime);
      const bEndMins = bStartMins + b.durationMinutes;

      // Overlap condition: start < bEnd && end > bStart
      if (currentStartMins < bEndMins && currentEndMins > bStartMins) {
        return b;
      }
    }
    return null;
  }, [allBlocks, block, initialDate, startTime, durationMinutes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || activeCategory.name || "Time Block";

    let recurrence: RecurrenceRule | undefined = undefined;
    if (recurrenceFreq === "daily") {
      recurrence = { frequency: "DAILY", interval: 1, endType: "never" };
    } else if (recurrenceFreq === "weekday") {
      recurrence = { frequency: "WEEKDAY", interval: 1, endType: "never" };
    } else if (recurrenceFreq === "weekly") {
      recurrence = { frequency: "WEEKLY", interval: 1, endType: "never" };
    } else if (recurrenceFreq === "monthly") {
      recurrence = { frequency: "MONTHLY", interval: 1, endType: "never" };
    }

    onSave({
      id: block?.id,
      title: finalTitle,
      date: initialDate,
      startTime,
      endTime,
      durationMinutes,
      categoryId: activeCategory.id,
      color: activeCategory.color,
      recurrence,
    });

    onClose();
  };

  const handleDelete = () => {
    if (block && onDelete) {
      onDelete(block.id);
      onClose();
    }
  };

  const handleToggleComplete = () => {
    if (block && onToggleComplete) {
      onToggleComplete(block.id);
    }
  };

  const handleStartPomodoro = () => {
    if (block && onStartPomodoro) {
      onStartPomodoro(block);
      onClose();
    }
  };

  // Friendly formatted time range for display
  const startMins = parseHHMM(startTime);
  const endMins = startMins + durationMinutes;
  const friendlyTimeRange = `${formatMinutesTo12h(startMins)} – ${formatMinutesTo12h(endMins)}`;
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const formattedDuration = `${hours > 0 ? `${hours}h ` : ""}${mins > 0 ? `${mins}m` : ""}`.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 text-card-foreground shadow-2xl animate-in fade-in-up space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-2xs"
              style={{ backgroundColor: activeCategory?.color || "#4f46e5" }}
            >
              <Clock size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? "Edit Time Block" : "Add Time Block"}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {friendlyTimeRange} ({formattedDuration})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conflict / Overlap Alert Banner */}
        {collision && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              <span className="font-bold">Time Conflict Notice:</span>
              <p>
                This range overlaps with existing block{" "}
                <span className="font-semibold">&quot;{collision.title}&quot;</span> (
                {collision.startTime} – {collision.endTime}). Please adjust times or move to a free slot.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Block Name */}
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Block Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Website Development, Deep Coding..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
            />
          </div>

          {/* Time: Start & End */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                step={1800} // 30-min steps
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                step={1800}
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-primary shadow-2xs"
              />
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Duration: <span className="text-foreground font-bold">{formattedDuration}</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {PRESET_DURATIONS.map((p) => {
                const isSelected = durationMinutes === p.minutes;
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => handleDurationPreset(p.minutes)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector with colored indicator */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate text-xs">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeat Schedule */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Repeat (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Repeat size={14} className="text-muted-foreground shrink-0" />
              <select
                value={recurrenceFreq}
                onChange={(e) => setRecurrenceFreq(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-primary cursor-pointer shadow-2xs"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily (Every day)</option>
                <option value="weekday">Every weekday (Monday to Friday)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Actions & Footer */}
          {isEditing && (
            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {onStartPomodoro && block && (
                  <button
                    type="button"
                    onClick={handleStartPomodoro}
                    className="inline-flex items-center gap-1 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer shadow-2xs"
                    title="Launch Pomodoro Focus Mode for this block"
                  >
                    <Brain size={13} />
                    <span>Pomodoro</span>
                  </button>
                )}

                {onToggleComplete && block && (
                  <button
                    type="button"
                    onClick={handleToggleComplete}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                      block.completed
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                    title="Mark block as completed"
                  >
                    <CheckCircle2 size={13} className={block.completed ? "text-emerald-500" : ""} />
                    <span>{block.completed ? "Completed" : "Complete"}</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 rounded-xl border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    title="Delete Time Block"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              {isEditing ? "Save Changes" : "Save Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
