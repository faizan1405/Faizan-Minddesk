"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Repeat,
  Clock,
  AlertCircle,
  Check,
} from "lucide-react";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  PlannerRoutine,
  PlannerRoutineType,
  RoutineFrequency,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";

interface PlannerRoutinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDateStr: string;
}

const DAYS_OF_WEEK = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

export function PlannerRoutinesModal({
  isOpen,
  onClose,
  currentDateStr,
}: PlannerRoutinesModalProps) {
  const {
    plannerRoutines,
    plannerCategories,
    addPlannerRoutine,
    updatePlannerRoutine,
    deletePlannerRoutine,
    plannerExceptions,
    deletePlannerException,
  } = useCalendar();

  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PlannerRoutineType>("fixed");
  const [categoryId, setCategoryId] = useState("cat-work-focus");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [frequency, setFrequency] = useState<RoutineFrequency>("weekdays");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  // Fixed fields
  const [fixedStartTime, setFixedStartTime] = useState("09:00");
  const [fixedEndTime, setFixedEndTime] = useState("09:30");

  // Flexible fields
  const [preferredStartTime, setPreferredStartTime] = useState("19:00");
  const [windowStartTime, setWindowStartTime] = useState("17:00");
  const [windowEndTime, setWindowEndTime] = useState("22:00");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFrequencyChange = (freq: RoutineFrequency) => {
    setFrequency(freq);
    if (freq === "daily") {
      setDaysOfWeek([0, 1, 2, 3, 4, 5, 6]);
    } else if (freq === "weekdays") {
      setDaysOfWeek([1, 2, 3, 4, 5]);
    } else if (freq === "weekly") {
      setDaysOfWeek([1]); // default to Monday
    }
  };

  const toggleDayOfWeek = (d: number) => {
    setFrequency("custom");
    if (daysOfWeek.includes(d)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((day) => day !== d));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, d].sort());
    }
  };

  const resetForm = () => {
    setTitle("");
    setType("fixed");
    setCategoryId("cat-work-focus");
    setDurationMinutes(30);
    setFrequency("weekdays");
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setFixedStartTime("09:00");
    setFixedEndTime("09:30");
    setPreferredStartTime("19:00");
    setWindowStartTime("17:00");
    setWindowEndTime("22:00");
    setErrorMsg(null);
    setEditingRoutineId(null);
  };

  const handleStartEdit = (routine: PlannerRoutine) => {
    setEditingRoutineId(routine.id);
    setTitle(routine.title);
    setType(routine.type);
    setCategoryId(routine.categoryId);
    setDurationMinutes(routine.durationMinutes);
    setFrequency(routine.frequency);
    setDaysOfWeek(routine.daysOfWeek);
    setFixedStartTime(routine.fixedStartTime || "09:00");
    setFixedEndTime(routine.fixedEndTime || "09:30");
    setPreferredStartTime(routine.preferredStartTime || "19:00");
    setWindowStartTime(routine.windowStartTime || "17:00");
    setWindowEndTime(routine.windowEndTime || "22:00");
    setActiveTab("create");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("Please enter a title for this recurring routine.");
      return;
    }

    if (daysOfWeek.length === 0) {
      setErrorMsg("Please select at least one active day.");
      return;
    }

    if (type === "fixed") {
      // Calculate duration from fixedStartTime and fixedEndTime
      const [sh, sm] = fixedStartTime.split(":").map(Number);
      const [eh, em] = fixedEndTime.split(":").map(Number);
      let calculatedDur = eh * 60 + em - (sh * 60 + sm);
      if (calculatedDur <= 0) calculatedDur += 1440; // overnight support

      if (editingRoutineId) {
        updatePlannerRoutine(editingRoutineId, {
          title: trimmedTitle,
          type: "fixed",
          categoryId,
          durationMinutes: calculatedDur,
          frequency,
          daysOfWeek,
          fixedStartTime,
          fixedEndTime,
        });
      } else {
        addPlannerRoutine({
          title: trimmedTitle,
          type: "fixed",
          categoryId,
          durationMinutes: calculatedDur,
          frequency,
          daysOfWeek,
          fixedStartTime,
          fixedEndTime,
          preferredStartTime: fixedStartTime,
          windowStartTime: fixedStartTime,
          windowEndTime: fixedEndTime,
          isActive: true,
        });
      }
    } else {
      // Flexible routine
      if (editingRoutineId) {
        updatePlannerRoutine(editingRoutineId, {
          title: trimmedTitle,
          type: "flexible",
          categoryId,
          durationMinutes,
          frequency,
          daysOfWeek,
          preferredStartTime,
          windowStartTime,
          windowEndTime,
        });
      } else {
        addPlannerRoutine({
          title: trimmedTitle,
          type: "flexible",
          categoryId,
          durationMinutes,
          frequency,
          daysOfWeek,
          preferredStartTime,
          windowStartTime,
          windowEndTime,
          isActive: true,
        });
      }
    }

    resetForm();
    setActiveTab("list");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Repeat size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Recurring Routines
              </h3>
              <p className="text-xs text-muted-foreground">
                Fixed commitments appear automatically; flexible routines suggest smart slots.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("list");
              resetForm();
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
            }`}
          >
            My Routines ({plannerRoutines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "create" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
            }`}
          >
            {editingRoutineId ? "Edit Routine" : "+ Add Routine"}
          </button>
        </div>

        {/* TAB 1: ROUTINES LIST */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {plannerRoutines.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Sparkles size={28} className="mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">
                  No recurring routines created yet
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add fixed routines (e.g. daily standup, workout) or flexible routines (e.g. reading, coding) to plan your days effortlessly.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs"
                >
                  <Plus size={14} />
                  <span>Create Routine</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {plannerRoutines.map((routine) => {
                  const cat = categories.find((c) => c.id === routine.categoryId);
                  const isFixed = routine.type === "fixed";

                  // Check if skipped for today
                  const exceptionToday = plannerExceptions.find(
                    (e) => e.routineId === routine.id && e.date === currentDateStr
                  );

                  return (
                    <div
                      key={routine.id}
                      className="p-3 rounded-xl border border-border/80 bg-background/90 space-y-2 hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat?.color || "#4f46e5" }}
                          />
                          <span className="text-sm font-bold text-foreground">
                            {routine.title}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                              isFixed
                                ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                                : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {isFixed ? "Fixed" : "Flexible"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(routine)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                            title="Edit Routine"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePlannerRoutine(routine.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Delete Routine"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-2xs text-muted-foreground gap-2 pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {isFixed
                              ? `${routine.fixedStartTime} – ${routine.fixedEndTime}`
                              : `${routine.durationMinutes}m preferred at ${routine.preferredStartTime}`}
                          </span>
                          <span>•</span>
                          <span>
                            {routine.daysOfWeek.length === 7
                              ? "Daily"
                              : routine.daysOfWeek.length === 5 && !routine.daysOfWeek.includes(0) && !routine.daysOfWeek.includes(6)
                              ? "Weekdays"
                              : routine.daysOfWeek.map((d) => DAYS_OF_WEEK[d].label).join(", ")}
                          </span>
                        </div>

                        {exceptionToday && (
                          <div className="flex items-center gap-1 text-amber-500 font-semibold">
                            <span>Skipped today</span>
                            <button
                              type="button"
                              onClick={() => deletePlannerException(exceptionToday.id)}
                              className="underline text-foreground text-2xs hover:text-primary ml-1"
                            >
                              Restore
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREATE / EDIT FORM */}
        {activeTab === "create" && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("fixed")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  type === "fixed"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Fixed Routine</span>
                </div>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Appears automatically at strict start & end time.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setType("flexible")}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  type === "flexible"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Flexible Routine</span>
                </div>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Suggests nearest free slot within an allowed window.
                </p>
              </button>
            </div>

            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Daily Standup, Deep Work, Reading..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium text-foreground focus:outline-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-muted-foreground">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium text-foreground focus:outline-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fixed Time Fields */}
            {type === "fixed" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    value={fixedStartTime}
                    onChange={(e) => setFixedStartTime(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    value={fixedEndTime}
                    onChange={(e) => setFixedEndTime(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                  />
                </div>
              </div>
            ) : (
              /* Flexible Time Fields */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-muted-foreground">Duration (Minutes)</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (1 hour)</option>
                      <option value={90}>90 minutes (1.5 hours)</option>
                      <option value={120}>120 minutes (2 hours)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-muted-foreground">Preferred Start Time</label>
                    <input
                      type="time"
                      value={preferredStartTime}
                      onChange={(e) => setPreferredStartTime(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-muted-foreground">Allowed Window From</label>
                    <input
                      type="time"
                      value={windowStartTime}
                      onChange={(e) => setWindowStartTime(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-muted-foreground">Allowed Window To</label>
                    <input
                      type="time"
                      value={windowEndTime}
                      onChange={(e) => setWindowEndTime(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background p-2 text-xs font-semibold text-foreground"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Days of Week */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-2xs font-bold text-muted-foreground">Active Days</label>
                <div className="flex items-center gap-1.5 text-2xs">
                  <button
                    type="button"
                    onClick={() => handleFrequencyChange("daily")}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      frequency === "daily" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFrequencyChange("weekdays")}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      frequency === "weekdays" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                    }`}
                  >
                    Weekdays
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {DAYS_OF_WEEK.map(({ day, label }) => {
                  const selected = daysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDayOfWeek(day)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("list");
                  resetForm();
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs cursor-pointer"
              >
                <Check size={14} />
                <span>{editingRoutineId ? "Save Changes" : "Save Routine"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
