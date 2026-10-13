"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Brain,
  Coffee,
  BookOpen,
  Users,
  CheckSquare,
  Square,
  Repeat,
  ExternalLink,
  Target,
} from "lucide-react";
import {
  ScheduledTaskBlock,
  TimeBlockType,
  RecurrenceRule,
} from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  parseTimeToMinutes,
  minutesToTimeString,
} from "@/features/calendar/services/calendar-layout";
import Link from "next/link";
import { format } from "date-fns";

export interface TimeBlockEditorModalProps {
  isOpen: boolean;
  block: ScheduledTaskBlock | null; // null for creating new block
  initialDate?: string;
  initialStartTime?: string;
  initialDurationMinutes?: number;
  initialTaskId?: string;
  onClose: () => void;
  onOpenFocusMode?: (block: ScheduledTaskBlock) => void;
}

export const BLOCK_TYPES: Array<{
  id: TimeBlockType;
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}> = [
  {
    id: "focus",
    label: "Focus Work",
    color: "#6366f1",
    icon: Brain,
    description: "Deep, uninterrupted outcome-driven focus",
  },
  {
    id: "task",
    label: "Task Session",
    color: "#2563eb",
    icon: CheckSquare,
    description: "Executing specific to-do tasks",
  },
  {
    id: "meeting",
    label: "Meeting / Event",
    color: "#8b5cf6",
    icon: Users,
    description: "Sync, collaboration or external appointment",
  },
  {
    id: "break",
    label: "Break",
    color: "#10b981",
    icon: Coffee,
    description: "Recharge, nutrition or short walk",
  },
  {
    id: "personal",
    label: "Personal Time",
    color: "#06b6d4",
    icon: Target,
    description: "Life maintenance, exercise or reflection",
  },
  {
    id: "learning",
    label: "Learning",
    color: "#f59e0b",
    icon: BookOpen,
    description: "Reading, research or sharpening skills",
  },
];

const PRESET_DURATIONS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "60m", value: 60 },
  { label: "90m", value: 90 },
  { label: "2h", value: 120 },
];

const COLOR_PRESETS = [
  "#6366f1", // Indigo
  "#2563eb", // Blue
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#64748b", // Slate
];

export function TimeBlockEditorModal({
  isOpen,
  block,
  initialDate,
  initialStartTime,
  initialDurationMinutes = 60,
  initialTaskId,
  onClose,
  onOpenFocusMode,
}: TimeBlockEditorModalProps) {
  const {
    tasks,
    scheduleTaskBlock,
    updateTaskBlock,
    deleteTaskBlock,
    duplicateTaskBlock,
    toggleTaskComplete,
  } = useCalendar();

  const isEditing = Boolean(block);

  // Form states
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [blockType, setBlockType] = useState<TimeBlockType>("focus");
  const [color, setColor] = useState("#6366f1");
  const [description, setDescription] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [recurrenceFreq, setRecurrenceFreq] = useState<string>("none");

  // Populate form on open
  useEffect(() => {
    if (!isOpen) return;

    if (block) {
      setTitle(block.title);
      setDate(block.date);
      setStartTime(block.startTime);
      setEndTime(block.endTime);
      setDurationMinutes(block.durationMinutes);
      setBlockType(block.blockType || "focus");
      setColor(block.color || "#6366f1");
      setDescription(block.description || "");
      setSelectedTaskId(block.taskId || "");
      setRecurrenceFreq(block.recurrence ? block.recurrence.frequency.toLowerCase() : "none");
    } else {
      const defDate = initialDate || format(new Date(), "yyyy-MM-dd");
      const defStart = initialStartTime || "10:00";
      const startMins = parseTimeToMinutes(defStart, 600);
      const dur = initialDurationMinutes || 60;
      const defEnd = minutesToTimeString(startMins + dur);

      const preloadedTask = initialTaskId ? tasks.find((t) => t.id === initialTaskId) : null;

      setTitle(preloadedTask ? preloadedTask.title : "");
      setDate(defDate);
      setStartTime(defStart);
      setEndTime(defEnd);
      setDurationMinutes(dur);
      setBlockType(preloadedTask ? "task" : "focus");
      setColor(preloadedTask ? "#2563eb" : "#6366f1");
      setDescription(preloadedTask?.note || preloadedTask?.description || "");
      setSelectedTaskId(initialTaskId || "");
      setRecurrenceFreq("none");
    }
  }, [isOpen, block, initialDate, initialStartTime, initialDurationMinutes, initialTaskId, tasks]);

  // Sync end time when duration or start time changes
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const startMins = parseTimeToMinutes(newStart, 600);
    setEndTime(minutesToTimeString(startMins + durationMinutes));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const startMins = parseTimeToMinutes(startTime, 600);
    const endMins = parseTimeToMinutes(newEnd, startMins + 60);
    if (endMins > startMins) {
      setDurationMinutes(endMins - startMins);
    }
  };

  const handleDurationPreset = (mins: number) => {
    setDurationMinutes(mins);
    const startMins = parseTimeToMinutes(startTime, 600);
    setEndTime(minutesToTimeString(startMins + mins));
  };

  const handleBlockTypeSelect = (typeId: TimeBlockType) => {
    setBlockType(typeId);
    const typeDef = BLOCK_TYPES.find((t) => t.id === typeId);
    if (typeDef) {
      setColor(typeDef.color);
      if (!title || BLOCK_TYPES.some((b) => b.label === title)) {
        setTitle(typeDef.label);
      }
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title);
        setDescription(task.note || task.description || "");
        setBlockType("task");
        if (task.estimatedMinutes) {
          handleDurationPreset(task.estimatedMinutes);
        }
      }
    }
  };

  const linkedTask = useMemo(() => {
    return selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
  }, [selectedTaskId, tasks]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (linkedTask ? linkedTask.title : "Focus Session");

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

    if (block) {
      updateTaskBlock(block.id, {
        title: finalTitle,
        date,
        startTime,
        endTime,
        durationMinutes,
        color,
        description,
        blockType,
        taskId: selectedTaskId || undefined,
        recurrence,
      });
    } else {
      scheduleTaskBlock(selectedTaskId || undefined, date, startTime, durationMinutes, {
        title: finalTitle,
        endTime,
        color,
        description,
        blockType,
        recurrence,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (block) {
      deleteTaskBlock(block.id);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (block) {
      duplicateTaskBlock(block.id);
      onClose();
    }
  };

  const handleFocusClick = () => {
    if (block && onOpenFocusMode) {
      onOpenFocusMode(block);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 text-card-foreground shadow-2xl motion-safe:animate-fade-in-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-xl text-white shadow-2xs"
              style={{ backgroundColor: color }}
            >
              <Clock size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEditing ? "Edit Time Block" : "Schedule Time Block"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Dedicate focused time on your daily schedule
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Block Type Chips */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Block Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {BLOCK_TYPES.map((t) => {
                const isSelected = blockType === t.id;
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleBlockTypeSelect(t.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground font-bold shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      <IconComponent size={12} />
                    </span>
                    <span className="truncate text-xs">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus={!isEditing}
              placeholder="e.g. Build client website, Morning planning..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
            />
          </div>

          {/* Link to Google Task Selector */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Linked Task (Google Tasks)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => handleTaskSelect(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary cursor-pointer shadow-2xs"
            >
              <option value="">(None — Standalone Time Block)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.completed ? "✓ " : ""}
                  {t.title} {t.dueDate ? `(Due ${t.dueDate})` : ""}
                </option>
              ))}
            </select>
            {linkedTask && (
              <div className="mt-1.5 flex items-center justify-between rounded-lg bg-muted/40 p-2 border border-border text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(linkedTask.id)}
                    className="cursor-pointer"
                  >
                    {linkedTask.completed ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <Square size={15} className="text-muted-foreground" />
                    )}
                  </button>
                  <span className={`truncate ${linkedTask.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                    {linkedTask.title}
                  </span>
                </div>
                <Link
                  href="/tasks"
                  target="_blank"
                  className="flex items-center gap-1 text-primary hover:underline text-[10px] shrink-0"
                >
                  <span>Open in Tasks</span>
                  <ExternalLink size={10} />
                </Link>
              </div>
            )}
          </div>

          {/* Date, Start Time & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                step={300} // 5-minute step
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                step={300}
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-primary shadow-2xs"
              />
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Duration: <span className="text-foreground">{durationMinutes} mins</span>
              </label>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {PRESET_DURATIONS.map((p) => {
                const isSelected = durationMinutes === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleDurationPreset(p.value)}
                    className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer text-center ${
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

          {/* Color Presets */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Block Accent Color
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                    className={`size-6 rounded-full transition-transform cursor-pointer ${
                      color === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105 opacity-80"
                    }`}
                  />
                ))}
              </div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Custom color picker"
                className="size-7 rounded-lg border border-border cursor-pointer bg-background p-0.5"
              />
            </div>
          </div>

          {/* Recurrence Rule */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Repeat Schedule
            </label>
            <div className="flex items-center gap-2">
              <Repeat size={14} className="text-muted-foreground" />
              <select
                value={recurrenceFreq}
                onChange={(e) => setRecurrenceFreq(e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-primary cursor-pointer shadow-2xs"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Every day</option>
                <option value="weekday">Every weekday (Monday to Friday)</option>
                <option value="weekly">Every week on {date ? new Date(date).toLocaleDateString("en-US", { weekday: "long" }) : "this day"}</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
          </div>

          {/* Optional Notes / Description */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Description / Intended Outcome
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What specifically will you deliver or accomplish in this block?"
              className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary resize-none shadow-2xs"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Delete Time Block"
                    className="flex items-center gap-1 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    title="Duplicate Block"
                    className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                  {onOpenFocusMode && block && (
                    <button
                      type="button"
                      onClick={handleFocusClick}
                      title="Launch Focus Mode"
                      className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <Brain size={13} />
                      <span>Focus</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                {isEditing ? "Save Changes" : "Create Block"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
