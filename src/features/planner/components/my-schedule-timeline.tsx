"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useCalendar } from "@/features/calendar/calendar-context";
import { ScheduledTaskBlock } from "@/features/calendar/types";
import {
  format,
  isToday,
  addDays,
  subDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckSquare,
  Square,
  Trash2,
  AlertTriangle,
  Coffee,
  Brain,
  Plus,
  Copy,
  Play,
} from "lucide-react";
import {
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
  layoutOverlappingEvents,
  layoutOverlappingBlocks,
  checkIntervalConflict,
  ConflictItem,
} from "@/features/calendar/services/calendar-layout";
import { TimeBlockEditorModal } from "./time-block-editor-modal";
import { ConflictDialog } from "./conflict-dialog";
import { FocusModeModal } from "./focus-mode-modal";
import { useHabits } from "@/features/habits/context/habits-context";
import { RoutineExecutionModal } from "@/features/habits/components/routine-execution-modal";
import type { Routine } from "@/features/habits/types";

interface MyScheduleTimelineProps {
  currentDateStr: string;
  onDateChange: (newDateStr: string) => void;
  onOpenQuickBlock?: (timeStr: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // 64px per hour for comfortable spacing

export function MyScheduleTimeline({
  currentDateStr,
  onDateChange,
}: MyScheduleTimelineProps) {
  const {
    getEventsForRange,
    scheduledBlocks,
    scheduleTaskBlock,
    updateTaskBlock,
    deleteTaskBlock,
    duplicateTaskBlock,
    rescheduleTaskBlock,
    toggleTaskComplete,
    settings,
    categories,
    tasks,
  } = useCalendar();

  const { toggleHabitComplete, activeRoutines } = useHabits();
  const [executingRoutine, setExecutingRoutine] = useState<Routine | null>(null);
  const [routineExecutionOpen, setRoutineExecutionOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Snapping increment: 5, 15, or 30 minutes
  const [snapIncrement, setSnapIncrement] = useState<5 | 15 | 30>(15);

  // Filter preferred working hours (8:00 AM - 6:00 PM)
  const [highlightWorkingHours, setHighlightWorkingHours] = useState(true);

  // Drag-and-drop state from task library onto timeline
  const [dragPreview, setDragPreview] = useState<{
    startMinutes: number;
    durationMinutes: number;
    title: string;
    taskId?: string;
  } | null>(null);

  // Moving existing block state
  const [movingBlockId, setMovingBlockId] = useState<string | null>(null);

  // Click-and-drag time slot creation state
  const [isDrawingSlot, setIsDrawingSlot] = useState(false);
  const [drawStartMinutes, setDrawStartMinutes] = useState<number | null>(null);
  const [drawCurrentMinutes, setDrawCurrentMinutes] = useState<number | null>(null);

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeBlockToEdit, setActiveBlockToEdit] = useState<ScheduledTaskBlock | null>(null);
  const [editorInitialStartTime, setEditorInitialStartTime] = useState<string>("10:00");
  const [editorInitialDuration, setEditorInitialDuration] = useState<number>(60);
  const [editorInitialTaskId, setEditorInitialTaskId] = useState<string | undefined>(undefined);

  // Conflict Dialog state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [pendingDropPayload, setPendingDropPayload] = useState<{
    taskId?: string;
    title: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    blockIdToMove?: string;
  } | null>(null);
  const [activeConflicts, setActiveConflicts] = useState<ConflictItem[]>([]);

  // Focus Mode state
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [focusBlock, setFocusBlock] = useState<ScheduledTaskBlock | null>(null);

  const currentDateObj = useMemo(() => {
    const [year, month, day] = currentDateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [currentDateStr]);
  const isCurrentDay = isToday(currentDateObj);

  // Calendar events on this date
  const dayEvents = useMemo(() => {
    return getEventsForRange(currentDateObj, currentDateObj).filter((e) => !e.allDay);
  }, [getEventsForRange, currentDateObj]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Scheduled task blocks on this date
  const dayBlocks = useMemo(() => {
    return scheduledBlocks.filter((b) => b.date === currentDateStr);
  }, [scheduledBlocks, currentDateStr]);

  // Layout overlapping events and blocks
  const positionedEvents = useMemo(
    () => layoutOverlappingEvents(dayEvents),
    [dayEvents]
  );

  const positionedBlocks = useMemo(
    () => layoutOverlappingBlocks(dayBlocks),
    [dayBlocks]
  );

  // Auto-scroll on initial load and date change
  useEffect(() => {
    if (scrollRef.current) {
      if (isCurrentDay) {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const targetScroll = Math.max(0, (currentMins / 60) * HOUR_HEIGHT - 120);
        scrollRef.current.scrollTop = targetScroll;
      } else {
        // Scroll to 8:00 AM by default
        scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
      }
    }
  }, [currentDateStr, isCurrentDay]);

  // Current time position
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = (currentMinutes / 60) * HOUR_HEIGHT;

  // Convert all items on timeline to conflict items
  const allConflictItems = useMemo<ConflictItem[]>(() => {
    const list: ConflictItem[] = [];
    for (const evt of dayEvents) {
      const s = parseTimeToMinutes(evt.startTime, 540);
      const e = parseTimeToMinutes(evt.endTime, s + 60);
      list.push({ id: evt.id, title: evt.title, startMinutes: s, endMinutes: e });
    }
    for (const blk of dayBlocks) {
      const s = parseTimeToMinutes(blk.startTime, 540);
      const e = parseTimeToMinutes(blk.endTime, s + blk.durationMinutes);
      list.push({ id: blk.id, title: blk.title, startMinutes: s, endMinutes: e });
    }
    return list;
  }, [dayEvents, dayBlocks]);

  // Helper to calculate snapped minutes from Y coordinate
  const calculateSnappedMinutesFromY = useCallback(
    (clientY: number) => {
      if (!scrollRef.current) return 600;
      const rect = scrollRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top + scrollRef.current.scrollTop;
      const rawMinutes = (relativeY / HOUR_HEIGHT) * 60;
      const snapped = Math.floor(rawMinutes / snapIncrement) * snapIncrement;
      return Math.max(0, Math.min(23 * 60 + (60 - snapIncrement), snapped));
    },
    [snapIncrement]
  );

  // Auto-scroll while dragging near edges
  const handleAutoScrollNearEdges = (clientY: number) => {
    if (!scrollRef.current) return;
    const rect = scrollRef.current.getBoundingClientRect();
    const threshold = 50;
    if (clientY < rect.top + threshold) {
      scrollRef.current.scrollTop -= 15;
    } else if (clientY > rect.bottom - threshold) {
      scrollRef.current.scrollTop += 15;
    }
  };

  // Drag over timeline from Task Library
  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    handleAutoScrollNearEdges(e.clientY);

    const snappedMins = calculateSnappedMinutesFromY(e.clientY);
    const duration = dragPreview?.durationMinutes || 60;

    if (!dragPreview || dragPreview.startMinutes !== snappedMins) {
      setDragPreview((prev) => ({
        startMinutes: snappedMins,
        durationMinutes: prev?.durationMinutes || duration,
        title: prev?.title || "Drop to schedule",
        taskId: prev?.taskId,
      }));
    }
  };

  const handleTimelineDragLeave = (e: React.DragEvent) => {
    // Only reset if exiting container
    if (!scrollRef.current?.contains(e.relatedTarget as Node)) {
      setDragPreview(null);
    }
  };

  // Drop task onto timeline
  const handleTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);

    const snappedMins = calculateSnappedMinutesFromY(e.clientY);
    const startTimeStr = minutesToTimeString(snappedMins);

    try {
      let taskId = "";
      let taskTitle = "Focus Work Session";
      let estimatedDuration = 60;

      const rawJson = e.dataTransfer.getData("application/json");
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        if (parsed.isExistingBlock && parsed.blockId) {
          const block = scheduledBlocks.find((b) => b.id === parsed.blockId);
          if (block) {
            const endMins = snappedMins + block.durationMinutes;
            const newEndTime = minutesToTimeString(endMins);
            rescheduleTaskBlock(block.id, currentDateStr, startTimeStr, newEndTime);
            setMovingBlockId(null);
            return;
          }
        }
        taskId = parsed.taskId || "";
        taskTitle = parsed.title || taskTitle;
        estimatedDuration = parsed.estimatedMinutes || 60;
      } else {
        taskId = e.dataTransfer.getData("text/plain");
        const found = tasks.find((t) => t.id === taskId);
        if (found) {
          taskTitle = found.title;
          estimatedDuration = found.estimatedMinutes || 60;
        }
      }

      const endTimeStr = minutesToTimeString(snappedMins + estimatedDuration);

      // Check conflict
      const { hasConflict, conflictingItems } = checkIntervalConflict(
        { startMinutes: snappedMins, endMinutes: snappedMins + estimatedDuration },
        allConflictItems
      );

      if (hasConflict) {
        setActiveConflicts(conflictingItems);
        setPendingDropPayload({
          taskId,
          title: taskTitle,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes: estimatedDuration,
        });
        setConflictDialogOpen(true);
        return;
      }

      // No conflict: create block immediately
      scheduleTaskBlock(taskId || undefined, currentDateStr, startTimeStr, estimatedDuration, {
        title: taskTitle,
      });
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // Handle moving existing block
  const handleBlockDragStart = (e: React.DragEvent, block: ScheduledTaskBlock) => {
    e.stopPropagation();
    setMovingBlockId(block.id);
    e.dataTransfer.setData("application/json", JSON.stringify({ blockId: block.id, isExistingBlock: true }));
    e.dataTransfer.effectAllowed = "move";
  };

  // Click & drag slot creation handlers
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    // Don't trigger if clicking an existing block or button
    const target = e.target as HTMLElement;
    if (target.closest(".timeline-block-item") || target.closest("button")) {
      return;
    }

    const snapped = calculateSnappedMinutesFromY(e.clientY);
    setIsDrawingSlot(true);
    setDrawStartMinutes(snapped);
    setDrawCurrentMinutes(snapped + snapIncrement);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingSlot || drawStartMinutes === null) return;
    const currentSnapped = calculateSnappedMinutesFromY(e.clientY);
    if (currentSnapped > drawStartMinutes) {
      setDrawCurrentMinutes(currentSnapped);
    }
  };

  const handleTimelineMouseUp = () => {
    if (isDrawingSlot && drawStartMinutes !== null && drawCurrentMinutes !== null) {
      const duration = Math.max(snapIncrement, drawCurrentMinutes - drawStartMinutes);
      const startStr = minutesToTimeString(drawStartMinutes);

      setIsDrawingSlot(false);
      setDrawStartMinutes(null);
      setDrawCurrentMinutes(null);

      // Open TimeBlockEditorModal pre-filled
      setActiveBlockToEdit(null);
      setEditorInitialStartTime(startStr);
      setEditorInitialDuration(duration);
      setEditorInitialTaskId(undefined);
      setEditorOpen(true);
    } else {
      setIsDrawingSlot(false);
      setDrawStartMinutes(null);
      setDrawCurrentMinutes(null);
    }
  };

  // Open editor for existing block
  const handleOpenEditBlock = (block: ScheduledTaskBlock) => {
    setActiveBlockToEdit(block);
    setEditorOpen(true);
  };

  // Resize block from top (adjusts start time & duration)
  const handleResizeTop = (e: React.MouseEvent, block: ScheduledTaskBlock) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origStartMins = parseTimeToMinutes(block.startTime, 600);
    const origEndMins = parseTimeToMinutes(block.endTime, origStartMins + block.durationMinutes);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / snapIncrement) * snapIncrement;
      const newStartMins = Math.max(0, Math.min(origEndMins - snapIncrement, origStartMins + deltaMins));

      rescheduleTaskBlock(
        block.id,
        block.date,
        minutesToTimeString(newStartMins),
        block.endTime
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Resize block from bottom (adjusts end time & duration)
  const handleResizeBottom = (e: React.MouseEvent, block: ScheduledTaskBlock) => {
    e.stopPropagation();
    const startY = e.clientY;
    const origStartMins = parseTimeToMinutes(block.startTime, 600);
    const origEndMins = parseTimeToMinutes(block.endTime, origStartMins + block.durationMinutes);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / snapIncrement) * snapIncrement;
      const newEndMins = Math.max(origStartMins + snapIncrement, Math.min(24 * 60, origEndMins + deltaMins));
      const newDuration = newEndMins - origStartMins;

      updateTaskBlock(block.id, {
        durationMinutes: newDuration,
        endTime: minutesToTimeString(newEndMins),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Quick 1-click presets
  const handleAddPreset = (title: string, durationMinutes: number, blockType: "focus" | "break" | "personal") => {
    const defaultHour = Math.max(9, Math.min(18, new Date().getHours() + 1));
    const startTime = `${String(defaultHour).padStart(2, "0")}:00`;
    const endTime = minutesToTimeString(defaultHour * 60 + durationMinutes);

    scheduleTaskBlock(undefined, currentDateStr, startTime, durationMinutes, {
      title,
      blockType,
      endTime,
      color: blockType === "break" ? "#10b981" : blockType === "focus" ? "#6366f1" : "#06b6d4",
    });
  };

  // Conflict resolution callbacks
  const handleKeepOverlap = () => {
    if (!pendingDropPayload) return;
    if (pendingDropPayload.blockIdToMove) {
      rescheduleTaskBlock(
        pendingDropPayload.blockIdToMove,
        currentDateStr,
        pendingDropPayload.startTime,
        pendingDropPayload.endTime
      );
    } else {
      scheduleTaskBlock(
        pendingDropPayload.taskId,
        currentDateStr,
        pendingDropPayload.startTime,
        pendingDropPayload.durationMinutes,
        { title: pendingDropPayload.title }
      );
    }
    setConflictDialogOpen(false);
    setPendingDropPayload(null);
  };

  const handleChooseAnotherTime = () => {
    if (!pendingDropPayload) return;
    setConflictDialogOpen(false);
    setActiveBlockToEdit(null);
    setEditorInitialStartTime(pendingDropPayload.startTime);
    setEditorInitialDuration(pendingDropPayload.durationMinutes);
    setEditorInitialTaskId(pendingDropPayload.taskId);
    setEditorOpen(true);
    setPendingDropPayload(null);
  };

  const handleCancelConflict = () => {
    setConflictDialogOpen(false);
    setPendingDropPayload(null);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden select-none">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-muted/40 p-3 sm:p-4">
        {/* Left: Date Switcher & Today */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onDateChange(format(new Date(), "yyyy-MM-dd"))}
            className={`rounded-xl border border-border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isCurrentDay
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Today
          </button>

          <div className="flex items-center rounded-xl border border-border bg-background p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => onDateChange(format(subDays(currentDateObj, 1), "yyyy-MM-dd"))}
              aria-label="Previous day"
              className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDateChange(format(addDays(currentDateObj, 1), "yyyy-MM-dd"))}
              aria-label="Next day"
              className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-extrabold text-foreground pl-1">
            {format(currentDateObj, "EEEE, MMMM d, yyyy")}
          </h2>
        </div>

        {/* Right: Snap switch, Presets & Primary + Add Time Block */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Snap increment selector (Section 4) */}
          <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-[10px] font-bold text-muted-foreground">
            <span className="px-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/60 hidden xl:inline">
              Snap:
            </span>
            {([5, 15, 30] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSnapIncrement(s)}
                className={`rounded-lg px-1.5 py-0.5 transition-all cursor-pointer ${
                  snapIncrement === s
                    ? "bg-primary text-primary-foreground shadow-2xs font-extrabold"
                    : "hover:text-foreground"
                }`}
              >
                {s}m
              </button>
            ))}
          </div>

          {/* Toggle Preferred Working Hours Range (Section 2) */}
          <button
            type="button"
            onClick={() => setHighlightWorkingHours((prev) => !prev)}
            className={`hidden md:inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              highlightWorkingHours
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
            title="Toggle Highlight Working Hours (8:00 AM - 6:00 PM)"
          >
            8am-6pm Workday
          </button>

          {/* Quick 1-click Preset Blocks */}
          <button
            type="button"
            onClick={() => handleAddPreset("Coffee Break", 15, "break")}
            className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer shadow-2xs"
          >
            <Coffee size={12} className="text-emerald-500" />
            <span>+15m Break</span>
          </button>

          {/* Primary + Add Time Block Button (Section 6) */}
          <button
            type="button"
            onClick={() => {
              setActiveBlockToEdit(null);
              setEditorInitialStartTime("10:00");
              setEditorInitialDuration(60);
              setEditorInitialTaskId(undefined);
              setEditorOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Add Time Block</span>
          </button>
        </div>
      </div>

      {/* Main Vertical Timeline Schedule (Section 2: Dominant Element) */}
      <div
        ref={scrollRef}
        onDragOver={handleTimelineDragOver}
        onDragLeave={handleTimelineDragLeave}
        onDrop={handleTimelineDrop}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        className="relative flex-1 max-h-[720px] overflow-y-auto grid grid-cols-[68px_1fr] bg-background"
      >
        {/* Left Column: Hour Labels */}
        <div className="border-r border-border bg-muted/20 sticky left-0 z-20">
          {HOURS.map((hour) => {
            const timeStr = formatTimeDisplay(`${String(hour).padStart(2, "0")}:00`, settings.timeFormat);
            const isWorkingHour = hour >= 8 && hour <= 18;

            return (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className={`relative -top-2.5 pr-2.5 text-right text-[10px] font-semibold transition-colors ${
                  isWorkingHour ? "text-foreground/70" : "text-muted-foreground/50"
                }`}
              >
                {hour !== 0 && timeStr}
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Schedule Canvas */}
        <div className="relative bg-card" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour grid lines */}
          {HOURS.map((hour) => {
            const isWorkingHour = hour >= 8 && hour <= 18;

            return (
              <div
                key={hour}
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                className={`absolute inset-x-0 border-b border-border/50 transition-colors ${
                  highlightWorkingHours && isWorkingHour
                    ? "bg-primary/[0.015]"
                    : "bg-muted/[0.04]"
                }`}
              >
                {/* 30-min dashed subdivider */}
                <div className="absolute top-1/2 inset-x-0 border-b border-dashed border-border/25 pointer-events-none" />
              </div>
            );
          })}

          {/* Current time line (Section 15: Pulsing red indicator on today) */}
          {isCurrentDay && (
            <div
              style={{ top: `${currentTimeTop}px` }}
              className="absolute inset-x-0 z-30 pointer-events-none flex items-center"
            >
              <div className="size-2.5 rounded-full bg-rose-500 shadow-sm -ml-1 ring-2 ring-background animate-pulse" />
              <div className="h-0.5 flex-1 bg-rose-500 shadow-xs" />
            </div>
          )}

          {/* Click & Drag selection preview box (Section 5) */}
          {isDrawingSlot && drawStartMinutes !== null && drawCurrentMinutes !== null && (
            <div
              style={{
                top: `${(Math.min(drawStartMinutes, drawCurrentMinutes) / 60) * HOUR_HEIGHT}px`,
                height: `${(Math.abs(drawCurrentMinutes - drawStartMinutes) / 60) * HOUR_HEIGHT}px`,
              }}
              className="absolute inset-x-2 z-25 rounded-xl border-2 border-dashed border-primary bg-primary/15 pointer-events-none flex items-center justify-center"
            >
              <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-2xs">
                {minutesToTimeString(Math.min(drawStartMinutes, drawCurrentMinutes))} –{" "}
                {minutesToTimeString(Math.max(drawStartMinutes, drawCurrentMinutes))} (
                {Math.abs(drawCurrentMinutes - drawStartMinutes)}m)
              </span>
            </div>
          )}

          {/* Drag preview from Task Library (Section 3) */}
          {dragPreview && (
            <div
              style={{
                top: `${(dragPreview.startMinutes / 60) * HOUR_HEIGHT}px`,
                height: `${(dragPreview.durationMinutes / 60) * HOUR_HEIGHT}px`,
              }}
              className="absolute inset-x-2 z-25 rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none p-3 shadow-md motion-safe:animate-fade-in"
            >
              <p className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                + Schedule: {dragPreview.title}
              </p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {formatTimeDisplay(minutesToTimeString(dragPreview.startMinutes), settings.timeFormat)} –{" "}
                {formatTimeDisplay(
                  minutesToTimeString(dragPreview.startMinutes + dragPreview.durationMinutes),
                  settings.timeFormat
                )}{" "}
                ({dragPreview.durationMinutes}m)
              </p>
            </div>
          )}

          {/* Calendar Events rendered cleanly on timeline (Section 8) */}
          {positionedEvents.map((item) => {
            const { event: evt, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(26, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;
            const cat = categoryMap.get(evt.categoryId);
            const bg = evt.customColor || cat?.color || "#2563eb";

            return (
              <div
                key={evt.id}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1}%`,
                }}
                className="timeline-block-item absolute z-15 rounded-xl p-2.5 text-white shadow-2xs overflow-hidden flex flex-col justify-between transition-all hover:z-30 hover:brightness-105"
              >
                <div
                  className="absolute inset-0 opacity-90 rounded-xl"
                  style={{ backgroundColor: bg }}
                />
                <div className="relative z-10 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-xs truncate leading-tight drop-shadow-2xs">
                      {evt.title}
                    </p>
                    <span className="rounded bg-white/20 px-1 py-0.2 text-[9px] font-bold uppercase shrink-0">
                      Event
                    </span>
                  </div>
                  <p className="text-[10px] opacity-90 font-medium mt-0.5 flex items-center gap-1 truncate">
                    <Clock size={10} />
                    <span>
                      {formatTimeDisplay(evt.startTime, settings.timeFormat)} –{" "}
                      {formatTimeDisplay(evt.endTime, settings.timeFormat)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Scheduled Task Blocks (Section 4: Full Interactive Blocks) */}
          {positionedBlocks.map((item) => {
            const { block, startMinutes, durationMinutes, column, totalColumns } = item;
            const top = (startMinutes / 60) * HOUR_HEIGHT;
            const height = Math.max(32, (durationMinutes / 60) * HOUR_HEIGHT);
            const widthPercent = 100 / totalColumns;
            const leftPercent = column * widthPercent;

            const blockColor = block.color || "#6366f1";
            const isCompleted = block.completed;

            // Conflict detection for visual warning pill
            const { hasConflict, conflictingTitles } = checkIntervalConflict(
              { id: block.id, startMinutes, endMinutes: startMinutes + durationMinutes },
              allConflictItems
            );

            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => handleBlockDragStart(e, block)}
                onDragEnd={() => setMovingBlockId(null)}
                onClick={() => {
                  if (block.routineId) {
                    const r = activeRoutines.find((item) => item.id === block.routineId);
                    if (r) {
                      setExecutingRoutine(r);
                      setRoutineExecutionOpen(true);
                      return;
                    }
                  }
                  handleOpenEditBlock(block);
                }}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent - 1}%`,
                  borderLeftColor: blockColor,
                  borderLeftWidth: "4px",
                }}
                className={`timeline-block-item group absolute z-15 rounded-xl p-2.5 border border-border shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:z-30 hover:shadow-md cursor-pointer ${
                  movingBlockId === block.id ? "opacity-40 ring-2 ring-primary ring-dashed" : ""
                } ${
                  isCompleted
                    ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 opacity-75"
                    : "bg-card text-card-foreground hover:bg-muted/40"
                }`}
              >
                {/* Resize Top Handle (Section 4) */}
                <div
                  onMouseDown={(e) => handleResizeTop(e, block)}
                  title="Drag up/down to adjust start time"
                  className="absolute top-0 inset-x-0 h-2.5 z-25 cursor-n-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 rounded-t transition-opacity flex items-center justify-center"
                >
                  <div className="h-0.5 w-6 rounded bg-muted-foreground/60" />
                </div>

                {/* Block Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Completion checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (block.habitId) {
                            toggleHabitComplete(block.habitId, block.date);
                          } else if (block.taskId) {
                            toggleTaskComplete(block.taskId);
                          } else {
                            updateTaskBlock(block.id, { completed: !block.completed });
                          }
                        }}
                        aria-label={`Toggle completion for ${block.title}`}
                        className="cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {isCompleted ? (
                          <CheckSquare size={14} className="text-emerald-500" />
                        ) : (
                          <Square size={14} className="text-primary" />
                        )}
                      </button>

                      <p
                        className={`font-bold text-xs truncate leading-snug ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {block.title}
                      </p>
                    </div>

                    {/* Quick block hover actions: Routine Play, Copy, Delete, Focus */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {block.routineId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const r = activeRoutines.find((item) => item.id === block.routineId);
                            if (r) {
                              setExecutingRoutine(r);
                              setRoutineExecutionOpen(true);
                            }
                          }}
                          title="Start Routine Execution"
                          className="p-1 rounded text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusBlock(block);
                          setFocusModalOpen(true);
                        }}
                        title="Launch Focus Mode"
                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                      >
                        <Brain size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTaskBlock(block.id);
                        }}
                        title="Duplicate Time Block"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTaskBlock(block.id);
                        }}
                        title="Remove Time Block"
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Time & Duration Display */}
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    <span>
                      {formatTimeDisplay(block.startTime, settings.timeFormat)} –{" "}
                      {formatTimeDisplay(block.endTime, settings.timeFormat)} ({block.durationMinutes}m)
                    </span>
                  </p>

                  {/* Conflict indicator pill (Section 9) */}
                  {hasConflict && !isCompleted && (
                    <div className="mt-1 flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30 truncate">
                      <AlertTriangle size={10} className="shrink-0 text-amber-500" />
                      <span className="truncate">Overlaps with {conflictingTitles[0]}</span>
                    </div>
                  )}
                </div>

                {/* Resize Bottom Handle (Section 4) */}
                <div
                  onMouseDown={(e) => handleResizeBottom(e, block)}
                  title="Drag up/down to adjust duration"
                  className="relative z-25 h-2.5 w-full cursor-s-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 rounded-b transition-opacity flex items-center justify-center mt-1"
                >
                  <div className="h-0.5 w-6 rounded bg-muted-foreground/60" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Block Editor Modal */}
      <TimeBlockEditorModal
        isOpen={editorOpen}
        block={activeBlockToEdit}
        initialDate={currentDateStr}
        initialStartTime={editorInitialStartTime}
        initialDurationMinutes={editorInitialDuration}
        initialTaskId={editorInitialTaskId}
        onClose={() => {
          setEditorOpen(false);
          setActiveBlockToEdit(null);
        }}
        onOpenFocusMode={(b) => {
          setFocusBlock(b);
          setFocusModalOpen(true);
        }}
      />

      {/* Conflict Dialog */}
      <ConflictDialog
        isOpen={conflictDialogOpen}
        blockTitle={pendingDropPayload?.title || "Time Block"}
        proposedStartTime={pendingDropPayload?.startTime || "10:00"}
        proposedEndTime={pendingDropPayload?.endTime || "11:00"}
        conflictingItems={activeConflicts}
        onKeepOverlap={handleKeepOverlap}
        onChooseAnotherTime={handleChooseAnotherTime}
        onCancel={handleCancelConflict}
      />

      {/* Focus Mode Timer Modal (Section 13) */}
      <FocusModeModal
        isOpen={focusModalOpen}
        block={focusBlock}
        onClose={() => {
          setFocusModalOpen(false);
          setFocusBlock(null);
        }}
      />

      {/* Routine Execution Runner Modal */}
      <RoutineExecutionModal
        routine={executingRoutine}
        isOpen={routineExecutionOpen}
        onClose={() => {
          setRoutineExecutionOpen(false);
          setExecutingRoutine(null);
        }}
      />
    </div>
  );
}
