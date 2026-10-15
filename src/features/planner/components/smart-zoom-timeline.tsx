"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
  AlertTriangle,
  Undo2,
  Check,
  X,
} from "lucide-react";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import { usePomodoro } from "../pomodoro-context";
import {
  ZoomTimeWindow,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";
import {
  parseHHMM,
  formatMinutesToHHMM,
  formatMinutesTo12h,
  resolveCategoryColor,
  checkIntervalCollision,
  scheduleFlexibleRoutines,
  generateFixedRoutineBlocks,
} from "../services/smart-scheduler";

interface SmartZoomTimelineProps {
  currentDateStr: string;
  onDateChange?: (dateStr: string) => void;
  selectedTimeSlot?: string | null;
  onClearSelectedTimeSlot?: () => void;
}

const WINDOW_FILTERS: Array<{ id: ZoomTimeWindow; label: string; startHour: number; endHour: number }> = [
  { id: "all", label: "24 Hours", startHour: 0, endHour: 24 },
  { id: "morning", label: "Morning (6a–12p)", startHour: 6, endHour: 12 },
  { id: "afternoon", label: "Afternoon (12p–6p)", startHour: 12, endHour: 18 },
  { id: "evening", label: "Evening (6p–12a)", startHour: 18, endHour: 24 },
  { id: "night", label: "Night (12a–6a)", startHour: 0, endHour: 6 },
];

export function SmartZoomTimeline({
  currentDateStr,
  selectedTimeSlot,
  onClearSelectedTimeSlot,
}: SmartZoomTimelineProps) {
  const {
    scheduledBlocks,
    scheduleTaskBlock,
    updateTaskBlock,
    deleteTaskBlock,
    plannerCategories,
    plannerRoutines,
    plannerExceptions,
    addPlannerException,
  } = useCalendar();

  const { startPomodoro, openFocusModal } = usePomodoro();
  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  // Timeline zoom & window view
  const [zoomWindow, setZoomWindow] = useState<ZoomTimeWindow>("all");
  const [hourHeight, setHourHeight] = useState<number>(68); // 52, 68, 92

  // Scroll ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Quick Create / Edit Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduledTaskBlock | null>(null);

  // Quick Create fields
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockCategoryId, setBlockCategoryId] = useState("cat-work-focus");
  const [blockDescription, setBlockDescription] = useState("");

  // Undo delete stack
  const [lastDeletedBlock, setLastDeletedBlock] = useState<ScheduledTaskBlock | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Overlap warning banner
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // React to selected time slot from Visual 24-Hour Map
  useEffect(() => {
    if (selectedTimeSlot) {
      setBlockStartTime(selectedTimeSlot);
      setEditingBlock(null);
      setBlockTitle("");
      setIsEditorOpen(true);

      // Scroll timeline to that hour
      const hour = parseInt(selectedTimeSlot.split(":")[0], 10) || 0;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = Math.max(0, (hour - 1) * hourHeight);
      }

      if (onClearSelectedTimeSlot) onClearSelectedTimeSlot();
    }
  }, [selectedTimeSlot, hourHeight, onClearSelectedTimeSlot]);

  // Active window hours
  const activeWindowConfig = useMemo(() => {
    return WINDOW_FILTERS.find((w) => w.id === zoomWindow) || WINDOW_FILTERS[0];
  }, [zoomWindow]);

  const visibleHours = useMemo(() => {
    const list: number[] = [];
    for (let h = activeWindowConfig.startHour; h < activeWindowConfig.endHour; h++) {
      list.push(h);
    }
    return list;
  }, [activeWindowConfig]);

  // Combine user scheduled blocks + generated fixed routines
  const fixedRoutineBlocks = useMemo(() => {
    return generateFixedRoutineBlocks(
      currentDateStr,
      plannerRoutines,
      plannerExceptions,
      categories
    );
  }, [currentDateStr, plannerRoutines, plannerExceptions, categories]);

  // All confirmed day blocks
  const allDayBlocks = useMemo(() => {
    const userBlocks = scheduledBlocks.filter((b) => b.date === currentDateStr);
    // Combine with fixed routine blocks that are not overridden
    const combined = [...userBlocks];
    for (const fix of fixedRoutineBlocks) {
      if (!combined.some((b) => b.id === fix.id || (b.recurringSeriesId && b.recurringSeriesId === fix.recurringSeriesId))) {
        combined.push(fix);
      }
    }
    return combined;
  }, [scheduledBlocks, currentDateStr, fixedRoutineBlocks]);

  // Flexible routines suggestions for today
  const { suggestedBlocks: flexibleSuggestions } = useMemo(() => {
    return scheduleFlexibleRoutines(
      currentDateStr,
      plannerRoutines,
      plannerExceptions,
      allDayBlocks,
      categories
    );
  }, [currentDateStr, plannerRoutines, plannerExceptions, allDayBlocks, categories]);

  // Handlers for flexible routine suggestions
  const handleConfirmSuggestion = (sug: ScheduledTaskBlock) => {
    scheduleTaskBlock({
      title: sug.title,
      date: sug.date,
      startTime: sug.startTime,
      endTime: sug.endTime,
      durationMinutes: sug.durationMinutes,
      categoryId: sug.categoryId,
      color: sug.color,
      completed: false,
      blockType: "routine",
      recurringSeriesId: sug.flexibleRoutineId,
    });
  };

  const handleSkipSuggestion = (sug: ScheduledTaskBlock) => {
    if (sug.flexibleRoutineId) {
      addPlannerException({
        routineId: sug.flexibleRoutineId,
        date: currentDateStr,
        type: "skip",
      });
    }
  };

  const handleOpenQuickCreate = (startTimeStr = "10:00") => {
    setEditingBlock(null);
    setBlockTitle("");
    setBlockStartTime(startTimeStr);
    setBlockDuration(60);
    setBlockCategoryId("cat-work-focus");
    setBlockDescription("");
    setConflictNotice(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (block: ScheduledTaskBlock) => {
    setEditingBlock(block);
    setBlockTitle(block.title);
    setBlockStartTime(block.startTime);
    setBlockDuration(block.durationMinutes || 60);
    setBlockCategoryId(block.categoryId || "cat-work-focus");
    setBlockDescription(block.description || "");
    setConflictNotice(null);
    setIsEditorOpen(true);
  };

  const handleDeleteWithUndo = (block: ScheduledTaskBlock) => {
    setLastDeletedBlock(block);
    setUndoToastVisible(true);
    deleteTaskBlock(block.id);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToastVisible(false);
      setLastDeletedBlock(null);
    }, 6000);
  };

  const handleUndoDelete = () => {
    if (lastDeletedBlock) {
      scheduleTaskBlock({
        title: lastDeletedBlock.title,
        date: lastDeletedBlock.date,
        startTime: lastDeletedBlock.startTime,
        endTime: lastDeletedBlock.endTime,
        durationMinutes: lastDeletedBlock.durationMinutes,
        categoryId: lastDeletedBlock.categoryId,
        color: lastDeletedBlock.color,
        completed: lastDeletedBlock.completed,
        description: lastDeletedBlock.description,
      });
      setUndoToastVisible(false);
      setLastDeletedBlock(null);
    }
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = blockTitle.trim();
    if (!trimmedTitle) return;

    const startMins = parseHHMM(blockStartTime);
    const endMins = startMins + blockDuration;
    const computedEndTime = formatMinutesToHHMM(endMins);

    // Conflict detection: check against other day blocks
    const otherIntervals = allDayBlocks
      .filter((b) => !editingBlock || b.id !== editingBlock.id)
      .map((b) => ({
        start: parseHHMM(b.startTime),
        end: parseHHMM(b.startTime) + (b.durationMinutes || 60),
      }));

    const hasCollision = checkIntervalCollision(startMins, endMins, otherIntervals);
    if (hasCollision && !conflictNotice) {
      setConflictNotice("Note: This block overlaps with an existing scheduled commitment. Click Save again to proceed anyway.");
      return;
    }

    const resolvedColor = resolveCategoryColor(blockCategoryId, undefined, categories);

    if (editingBlock) {
      updateTaskBlock(editingBlock.id, {
        title: trimmedTitle,
        startTime: blockStartTime,
        endTime: computedEndTime,
        durationMinutes: blockDuration,
        categoryId: blockCategoryId,
        color: resolvedColor,
        description: blockDescription,
      });
    } else {
      scheduleTaskBlock({
        title: trimmedTitle,
        date: currentDateStr,
        startTime: blockStartTime,
        endTime: computedEndTime,
        durationMinutes: blockDuration,
        categoryId: blockCategoryId,
        color: resolvedColor,
        completed: false,
        description: blockDescription,
      });
    }

    setIsEditorOpen(false);
    setEditingBlock(null);
    setConflictNotice(null);
  };

  const handleNudgeDuration = (block: ScheduledTaskBlock, deltaMinutes: number) => {
    const newDur = Math.max(15, (block.durationMinutes || 60) + deltaMinutes);
    const startMins = parseHHMM(block.startTime);
    const endMins = startMins + newDur;
    updateTaskBlock(block.id, {
      durationMinutes: newDur,
      endTime: formatMinutesToHHMM(endMins),
    });
  };

  const handleLaunchPomodoro = (block: ScheduledTaskBlock) => {
    startPomodoro(block);
    openFocusModal();
  };

  return (
    <section
      aria-label="Smart Zoom Timeline Editor"
      className="flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
    >
      {/* 1. TIMELINE TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4 border-b border-border bg-muted/20">
        {/* Left: Window Filter tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {WINDOW_FILTERS.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => setZoomWindow(wf.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                zoomWindow === wf.id
                  ? "bg-background text-primary shadow-2xs border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {wf.label}
            </button>
          ))}
        </div>

        {/* Right: Zoom controls & Quick Create Button */}
        <div className="flex items-center gap-2">
          {/* Zoom height presets */}
          <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setHourHeight(52)}
              className={`px-2 py-0.5 text-2xs font-bold rounded cursor-pointer ${
                hourHeight === 52 ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Compact View"
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setHourHeight(68)}
              className={`px-2 py-0.5 text-2xs font-bold rounded cursor-pointer ${
                hourHeight === 68 ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Standard View"
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setHourHeight(92)}
              className={`px-2 py-0.5 text-2xs font-bold rounded cursor-pointer ${
                hourHeight === 92 ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Expanded View"
            >
              Relaxed
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenQuickCreate()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* 2. SUGGESTED ROUTINES BANNER (If any flexible routine is suggested for today) */}
      {flexibleSuggestions.length > 0 && (
        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200/80 dark:border-amber-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Sparkles size={12} />
              </span>
              <span className="text-xs font-bold text-foreground">
                Flexible Routine Suggestions ({flexibleSuggestions.length})
              </span>
            </div>
            <span className="text-2xs text-muted-foreground">
              Based on your available free time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {flexibleSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="flex items-center justify-between p-2 rounded-xl bg-background border border-amber-300/60 dark:border-amber-700/60 shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sug.color }}
                    />
                    <span className="text-xs font-bold text-foreground truncate">
                      {sug.title}
                    </span>
                  </div>
                  <div className="text-2xs text-muted-foreground pl-4">
                    {formatMinutesTo12h(parseHHMM(sug.startTime))} – {formatMinutesTo12h(parseHHMM(sug.endTime))} ({sug.durationMinutes}m)
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConfirmSuggestion(sug)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-2xs font-bold hover:opacity-90 cursor-pointer shadow-2xs"
                    title="Confirm this suggestion"
                  >
                    <Check size={11} />
                    <span>Confirm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkipSuggestion(sug)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted text-2xs cursor-pointer"
                    title="Skip today"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE 24-HOUR / ZOOMED TIMELINE CANVAS */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto max-h-[640px] select-none"
      >
        <div
          className="relative w-full"
          style={{ height: visibleHours.length * hourHeight }}
        >
          {/* Hour grid lines & time labels */}
          {visibleHours.map((hour, idx) => {
            const timeLabel = `${String(hour).padStart(2, "0")}:00`;
            const displayLabel = formatMinutesTo12h(hour * 60);

            return (
              <div
                key={hour}
                style={{
                  top: idx * hourHeight,
                  height: hourHeight,
                }}
                className="absolute inset-x-0 border-b border-border/50 group flex items-start"
              >
                {/* Left Time Column (70px) */}
                <div className="w-16 sm:w-20 shrink-0 p-1.5 text-right pr-2 sm:pr-3 text-2xs font-mono font-medium text-muted-foreground select-none">
                  {displayLabel}
                </div>

                {/* Right Interactive Hour Slot Canvas */}
                <div
                  onClick={() => handleOpenQuickCreate(timeLabel)}
                  className="flex-1 h-full border-l border-border/40 relative cursor-pointer hover:bg-muted/20 transition-colors"
                  title={`Click to schedule at ${displayLabel}`}
                >
                  {/* Half-hour subtle dashed line */}
                  <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-border/30 pointer-events-none" />

                  {/* Empty slot quick hover plus */}
                  <div className="absolute left-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-2xs text-muted-foreground flex items-center gap-1 font-semibold pointer-events-none">
                    <Plus size={11} />
                    <span>Schedule at {displayLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scheduled Blocks Render Layer */}
          {allDayBlocks.map((block) => {
            const startMins = parseHHMM(block.startTime);
            const duration = block.durationMinutes || 60;
            const endMins = startMins + duration;

            // Clamping for current window view
            const windowStartMins = activeWindowConfig.startHour * 60;
            const windowEndMins = activeWindowConfig.endHour * 60;

            if (endMins <= windowStartMins || startMins >= windowEndMins) {
              return null; // Not in this window view
            }

            const clampedStart = Math.max(windowStartMins, startMins);
            const clampedEnd = Math.min(windowEndMins, endMins);
            const clampedDuration = Math.max(15, clampedEnd - clampedStart);

            // Compute top offset & height
            const topPx = ((clampedStart - windowStartMins) / 60) * hourHeight;
            const heightPx = Math.max(34, (clampedDuration / 60) * hourHeight - 2);

            const isDone = block.completed;
            const isRoutine = block.blockType === "routine";
            const blockColor = resolveCategoryColor(block.categoryId, block.color, categories);

            return (
              <div
                key={block.id}
                style={{
                  top: topPx,
                  height: heightPx,
                  left: "5rem",
                  right: "1rem",
                  backgroundColor: `${blockColor}15`,
                  borderColor: `${blockColor}60`,
                  borderLeftWidth: "4px",
                  borderLeftColor: blockColor,
                }}
                className={`
                  absolute rounded-xl border p-2 shadow-2xs transition-all duration-150 group z-10 flex flex-col justify-between overflow-hidden
                  ${isDone ? "opacity-65" : "hover:shadow-md hover:brightness-105"}
                `}
              >
                {/* Block header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTaskBlock(block.id, { completed: !block.completed });
                      }}
                      className="cursor-pointer text-muted-foreground hover:text-emerald-500 shrink-0"
                      title={isDone ? "Mark incomplete" : "Mark completed"}
                    >
                      <CheckCircle2
                        size={15}
                        className={isDone ? "text-emerald-500 fill-emerald-500/20" : ""}
                      />
                    </button>

                    <span
                      onClick={() => handleOpenEdit(block)}
                      className={`text-xs font-bold truncate cursor-pointer hover:underline ${
                        isDone ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {block.title}
                    </span>

                    {isRoutine && (
                      <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                        Routine
                      </span>
                    )}
                  </div>

                  {/* Quick Action Buttons (shown on hover or tap) */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Launch Pomodoro */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchPomodoro(block);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-2xs cursor-pointer"
                      title="Start Pomodoro on this block"
                    >
                      <Play size={11} className="ml-0.5" />
                    </button>

                    {/* Quick +/- 15m resize nudges */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNudgeDuration(block, -15);
                      }}
                      className="h-6 px-1.5 rounded-md bg-muted text-foreground text-[10px] font-bold hover:bg-muted/80"
                      title="Shorten by 15 mins"
                    >
                      -15m
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNudgeDuration(block, 15);
                      }}
                      className="h-6 px-1.5 rounded-md bg-muted text-foreground text-[10px] font-bold hover:bg-muted/80"
                      title="Extend by 15 mins"
                    >
                      +15m
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(block);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Edit block"
                    >
                      <Edit2 size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWithUndo(block);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete block (with Undo)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Block footer details */}
                <div className="flex items-center justify-between text-2xs text-muted-foreground">
                  <span className="font-mono">
                    {formatMinutesTo12h(startMins)} – {formatMinutesTo12h(endMins)} ({duration}m)
                  </span>

                  {block.description && (
                    <span className="truncate max-w-[180px] italic hidden sm:block">
                      {block.description}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. INSTANT UNDO NOTIFICATION TOAST */}
      {undoToastVisible && lastDeletedBlock && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-xl text-xs animate-in slide-in-from-bottom-3">
          <span className="font-semibold text-foreground">
            Deleted block “{lastDeletedBlock.title}”
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
          >
            <Undo2 size={13} />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* 5. QUICK CREATE / EDIT MODAL & BOTTOM SHEET */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {editingBlock ? "Edit Time Block" : "Quick Create Block"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingBlock(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {conflictNotice && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{conflictNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveBlock} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-muted-foreground">What will you focus on?</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="e.g. Code Review, Client Proposal, Gym..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-primary shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    required
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2 text-xs font-bold text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-muted-foreground">Duration</label>
                  <select
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background p-2 text-xs font-bold text-foreground"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-muted-foreground">Category</label>
                <select
                  value={blockCategoryId}
                  onChange={(e) => setBlockCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 text-xs font-bold text-foreground"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-muted-foreground">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={blockDescription}
                  onChange={(e) => setBlockDescription(e.target.value)}
                  placeholder="Key sub-goals, URLs or reminders for this block..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs font-medium text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingBlock(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSaveBlock}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingBlock ? "Save Changes" : "Create Block"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
