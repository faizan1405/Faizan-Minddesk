"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, AlertTriangle, ArrowRight } from "lucide-react";
import type { Habit, Routine } from "../types";
import { useHabits } from "../context/habits-context";
import { useCalendar } from "@/features/calendar/calendar-context";
import { checkScheduleConflict, type ConflictCheckResult } from "../services/conflict-detector";
import { Button } from "@/components/ui/button";

interface ScheduleHabitDialogProps {
  isOpen: boolean;
  habit?: Habit | null;
  routine?: Routine | null;
  defaultDate?: string;
  defaultTime?: string;
  onClose: () => void;
  onScheduledSuccess?: () => void;
}

export function ScheduleHabitDialog({
  isOpen,
  habit,
  routine,
  defaultDate = format(new Date(), "yyyy-MM-dd"),
  defaultTime = "10:00",
  onClose,
  onScheduledSuccess,
}: ScheduleHabitDialogProps) {
  const { scheduleHabitAsBlock, scheduleRoutineAsBlock, activeHabits, activeRoutines } = useHabits();
  const { events, scheduledBlocks } = useCalendar();

  const [selectedType, setSelectedType] = useState<"habit" | "routine">("habit");
  const [selectedHabitId, setSelectedHabitId] = useState<string>(habit?.id || activeHabits[0]?.id || "");
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(routine?.id || activeRoutines[0]?.id || "");

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime);
  const [duration, setDuration] = useState(30);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResult | null>(null);
  const [allowOverlap, setAllowOverlap] = useState(false);

  const activeTargetHabit = habit || activeHabits.find((h) => h.id === selectedHabitId) || activeHabits[0];
  const activeTargetRoutine = routine || activeRoutines.find((r) => r.id === selectedRoutineId) || activeRoutines[0];

  const currentTarget = !habit && !routine && selectedType === "routine" ? activeTargetRoutine : activeTargetHabit;
  const isTargetHabit = !habit && !routine ? selectedType === "habit" : Boolean(habit);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setStartTime(defaultTime);
      if (habit) {
        setSelectedType("habit");
        setSelectedHabitId(habit.id);
        const defDur = habit.type === "duration" && habit.target ? habit.target : 30;
        setDuration(defDur);
      } else if (routine) {
        setSelectedType("routine");
        setSelectedRoutineId(routine.id);
        setDuration(routine.estimatedMinutes || 30);
      } else {
        setSelectedType("habit");
        if (activeHabits.length > 0) setSelectedHabitId(activeHabits[0].id);
        setDuration(30);
      }
      setAllowOverlap(false);
    }
  }, [isOpen, habit, routine, defaultDate, defaultTime, activeHabits]);

  // Real-time conflict checking whenever date, startTime or duration changes
  useEffect(() => {
    if (!isOpen) return;
    const result = checkScheduleConflict(date, startTime, duration, events, scheduledBlocks);
    setConflictResult(result);
  }, [date, startTime, duration, events, scheduledBlocks, isOpen]);

  if (!isOpen) return null;

  const title = currentTarget ? ("name" in currentTarget ? currentTarget.name : currentTarget.title) : "Session";
  const emoji = currentTarget?.emoji || "✨";
  const color = currentTarget?.color || "#3b82f6";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflictResult?.hasConflict && !allowOverlap) {
      return;
    }

    if (isTargetHabit && activeTargetHabit) {
      scheduleHabitAsBlock(activeTargetHabit.id, date, startTime, duration, allowOverlap);
    } else if (activeTargetRoutine) {
      scheduleRoutineAsBlock(activeTargetRoutine.id, date, startTime, duration, allowOverlap);
    }

    onScheduledSuccess?.();
    onClose();
  };

  const handleApplySuggested = () => {
    if (conflictResult?.suggestedStartTime) {
      setStartTime(conflictResult.suggestedStartTime);
      setAllowOverlap(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              {emoji}
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Schedule in Calendar
              </h2>
              <p className="text-xs text-muted-foreground">
                Block dedicated focus time in your daily planner & calendar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Item Card */}
          {habit || routine ? (
            <div className="rounded-xl bg-muted/40 p-3 border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {habit ? "Selected Habit" : "Selected Routine"}
              </span>
              <p className="mt-0.5 text-xs font-bold text-foreground">{title}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 p-3 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Schedule What?
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-background p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedType("habit")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedType === "habit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Habit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType("routine")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedType === "routine" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Routine
                  </button>
                </div>
              </div>

              {selectedType === "habit" ? (
                <select
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  {activeHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.emoji} {h.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedRoutineId}
                  onChange={(e) => setSelectedRoutineId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  {activeRoutines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.emoji} {r.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground mb-1 block">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="font-semibold text-foreground mb-1.5 block">
              Block Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={`rounded-xl border py-2 text-center text-xs font-semibold transition-colors cursor-pointer ${
                    duration === mins
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Warning Card */}
          {conflictResult?.hasConflict && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-800 dark:text-amber-300">
                    Scheduling Conflict Detected
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    This time overlaps with:
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                    {conflictResult.conflicts.map((c) => (
                      <li key={c.id}>
                        • {c.title} ({c.timeRange})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Alternative Time Suggestion */}
              {conflictResult.suggestedStartTime && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/15 p-2 text-[11px]">
                  <span>
                    Suggested free slot: <strong>{conflictResult.suggestedStartTime}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleApplySuggested}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
                  >
                    Use this time <ArrowRight size={11} />
                  </button>
                </div>
              )}

              {/* Allow Intentional Overlap Checkbox */}
              <label className="flex items-center gap-2 pt-1 text-[11px] font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOverlap}
                  onChange={(e) => setAllowOverlap(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                <span>Schedule anyway with intentional overlap</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={conflictResult?.hasConflict && !allowOverlap}
              className="rounded-xl px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add Time Block
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
