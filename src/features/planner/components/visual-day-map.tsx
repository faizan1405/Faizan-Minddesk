"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { isToday, parseISO } from "date-fns";
import {
  Clock,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CheckCircle2,
  Layers,
  Plus,
  MousePointer,
  RotateCcw,
  X,
} from "lucide-react";
import type { ScheduledTaskBlock, RecurrenceRule } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import { useOptionalPomodoro } from "../pomodoro-context";
import {
  DayMapCube,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";
import {
  calculateDayMapCubes,
  formatMinutesTo12h,
  formatMinutesToHHMM,
  parseHHMM,
} from "../services/smart-scheduler";
import { DayMapBlockDialog } from "./day-map-block-dialog";

interface VisualDayMapProps {
  currentDateStr: string;
  allBlocks: ScheduledTaskBlock[];
  activeBlockId?: string;
  onSelectTimeSlot?: (timeHHMM: string, block?: ScheduledTaskBlock) => void;
  onManageCategories?: () => void;
}

const ROW_METADATA = [
  {
    index: 0,
    title: "Night & Dawn",
    timeRange: "12:00 AM – 6:00 AM",
    icon: Moon,
    iconColor: "text-indigo-400 dark:text-indigo-300",
  },
  {
    index: 1,
    title: "Morning",
    timeRange: "6:00 AM – 12:00 PM",
    icon: Sunrise,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  {
    index: 2,
    title: "Afternoon",
    timeRange: "12:00 PM – 6:00 PM",
    icon: Sun,
    iconColor: "text-orange-500 dark:text-orange-400",
  },
  {
    index: 3,
    title: "Evening",
    timeRange: "6:00 PM – 12:00 AM",
    icon: Sunset,
    iconColor: "text-purple-500 dark:text-purple-400",
  },
];

export function VisualDayMap({
  currentDateStr,
  allBlocks,
  activeBlockId,
  onSelectTimeSlot,
  onManageCategories,
}: VisualDayMapProps) {
  const {
    plannerCategories,
    scheduleTaskBlock,
    updateTaskBlock,
    deleteTaskBlock,
  } = useCalendar();

  const pomodoro = useOptionalPomodoro();

  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  const [hoveredCube, setHoveredCube] = useState<DayMapCube | null>(null);

  // Drag selection state for desktop
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const hasMovedRef = useRef(false);

  // Mobile two-tap range selection mode
  const [isMobileRangeMode, setIsMobileRangeMode] = useState(false);
  const [mobileRangeStart, setMobileRangeStart] = useState<number | null>(null);

  // Block Dialog State (for creating new block or editing existing block)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogBlock, setDialogBlock] = useState<ScheduledTaskBlock | null>(null);
  const [dialogStartTime, setDialogStartTime] = useState("09:00");
  const [dialogEndTime, setDialogEndTime] = useState("09:30");
  const [dialogDuration, setDialogDuration] = useState(30);

  // Undo deletion state
  const [undoDeletedBlock, setUndoDeletedBlock] = useState<ScheduledTaskBlock | null>(null);

  // Compute 48 cubes using pure scheduler logic
  const cubes = useMemo(() => {
    return calculateDayMapCubes(
      currentDateStr,
      allBlocks,
      categories,
      activeBlockId
    );
  }, [currentDateStr, allBlocks, categories, activeBlockId]);

  // Current time index if viewing today
  const currentHalfHourIndex = useMemo(() => {
    try {
      const parsedDate = parseISO(currentDateStr);
      if (!isToday(parsedDate)) return -1;
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      return Math.floor(currentMins / 30);
    } catch {
      return -1;
    }
  }, [currentDateStr]);

  // Rows of 12 cubes
  const rows = useMemo(() => {
    return [
      cubes.slice(0, 12),
      cubes.slice(12, 24),
      cubes.slice(24, 36),
      cubes.slice(36, 48),
    ];
  }, [cubes]);

  // Total allocated minutes summary for the day map
  const totalAllocatedMinutes = useMemo(() => {
    let sum = 0;
    for (const cube of cubes) {
      if (cube.fillPercent > 0) {
        sum += (cube.fillPercent / 100) * 30;
      }
    }
    return Math.round(sum);
  }, [cubes]);

  const allocatedHoursFormatted = `${Math.floor(totalAllocatedMinutes / 60)}h ${totalAllocatedMinutes % 60}m`;
  const overallOccupancyPercent = Math.min(100, Math.round((totalAllocatedMinutes / 1440) * 100));

  // Determine if a cube index is part of active drag selection or mobile range selection
  const isIndexInActiveRange = (index: number): boolean => {
    if (isMouseDown && dragStartIndex !== null && dragCurrentIndex !== null) {
      const min = Math.min(dragStartIndex, dragCurrentIndex);
      const max = Math.max(dragStartIndex, dragCurrentIndex);
      return index >= min && index <= max;
    }
    if (isMobileRangeMode && mobileRangeStart !== null) {
      return index === mobileRangeStart;
    }
    return false;
  };

  // Helper to open Add Block dialog for a specified cube range
  const openAddBlockForRange = (startIdx: number, endIdx: number) => {
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    const startMins = minIdx * 30;
    const endMins = (maxIdx + 1) * 30;
    const duration = (maxIdx - minIdx + 1) * 30;

    setDialogBlock(null);
    setDialogStartTime(formatMinutesToHHMM(startMins));
    setDialogEndTime(formatMinutesToHHMM(endMins));
    setDialogDuration(duration);
    setIsDialogOpen(true);
  };

  // Open block details/editor for an existing block
  const openBlockEditor = (block: ScheduledTaskBlock) => {
    setDialogBlock(block);
    setDialogStartTime(block.startTime);
    setDialogEndTime(block.endTime);
    setDialogDuration(block.durationMinutes);
    setIsDialogOpen(true);
    if (onSelectTimeSlot) {
      onSelectTimeSlot(block.startTime, block);
    }
  };

  // Global mouseup listener for desktop drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isMouseDown) return;

      if (dragStartIndex !== null && hasMovedRef.current) {
        const targetEnd = dragCurrentIndex ?? dragStartIndex;
        openAddBlockForRange(dragStartIndex, targetEnd);
      }

      setIsMouseDown(false);
      setDragStartIndex(null);
      setDragCurrentIndex(null);
      hasMovedRef.current = false;
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isMouseDown, dragStartIndex, dragCurrentIndex]);

  // Cube Mouse/Click Handlers
  const handleCubeMouseDown = (cube: DayMapCube, e: React.MouseEvent) => {
    // Only handle primary left click
    if (e.button !== 0) return;

    // If cube has an existing block, open its details directly (do not drag)
    if (cube.primaryBlock) {
      openBlockEditor(cube.primaryBlock);
      return;
    }

    // In mobile range mode, ignore mouse down (handled by click/tap)
    if (isMobileRangeMode) return;

    // Desktop: start drag selection on empty cube
    setIsMouseDown(true);
    setDragStartIndex(cube.index);
    setDragCurrentIndex(cube.index);
    hasMovedRef.current = false;
  };

  const handleCubeMouseEnter = (cube: DayMapCube) => {
    setHoveredCube(cube);
    if (isMouseDown && dragStartIndex !== null) {
      if (cube.index !== dragStartIndex) {
        hasMovedRef.current = true;
      }
      setDragCurrentIndex(cube.index);
    }
  };

  const handleCubeClick = (cube: DayMapCube) => {
    // If occupied, open block editor
    if (cube.primaryBlock) {
      openBlockEditor(cube.primaryBlock);
      return;
    }

    // Mobile Range Mode handling
    if (isMobileRangeMode) {
      if (mobileRangeStart === null) {
        setMobileRangeStart(cube.index);
      } else {
        openAddBlockForRange(mobileRangeStart, cube.index);
        setMobileRangeStart(null);
        setIsMobileRangeMode(false);
      }
      return;
    }

    // Direct click or tap on empty cube
    openAddBlockForRange(cube.index, cube.index);
  };

  // Save Block (new or updated)
  const handleSaveBlock = (data: {
    id?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    categoryId: string;
    color: string;
    recurrence?: RecurrenceRule;
  }) => {
    if (data.id) {
      updateTaskBlock(data.id, {
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        categoryId: data.categoryId,
        color: data.color,
        recurrence: data.recurrence,
      });
    } else {
      scheduleTaskBlock(undefined, data.date, data.startTime, data.durationMinutes, {
        title: data.title,
        endTime: data.endTime,
        categoryId: data.categoryId,
        color: data.color,
        recurrence: data.recurrence,
      });
    }
  };

  // Delete Block with Undo
  const handleDeleteBlock = (blockId: string) => {
    const toDelete = allBlocks.find((b) => b.id === blockId);
    if (toDelete) {
      setUndoDeletedBlock(toDelete);
      deleteTaskBlock(blockId);
    }
  };

  // Undo delete
  const handleUndoDelete = () => {
    if (!undoDeletedBlock) return;
    scheduleTaskBlock(undoDeletedBlock.taskId, undoDeletedBlock.date, undoDeletedBlock.startTime, undoDeletedBlock.durationMinutes, {
      title: undoDeletedBlock.title,
      endTime: undoDeletedBlock.endTime,
      categoryId: undoDeletedBlock.categoryId,
      color: undoDeletedBlock.color,
      recurrence: undoDeletedBlock.recurrence,
    });
    setUndoDeletedBlock(null);
  };

  // Toggle Completion
  const handleToggleComplete = (blockId: string) => {
    const block = allBlocks.find((b) => b.id === blockId);
    if (block) {
      updateTaskBlock(blockId, { completed: !block.completed });
    }
  };

  // Start Pomodoro Focus
  const handleStartPomodoro = (block: ScheduledTaskBlock) => {
    if (pomodoro) {
      pomodoro.startPomodoro(block);
      pomodoro.openFocusModal();
    }
  };

  // Standalone Add Block button click (defaults to 10:00 AM or next slot)
  const handleAddBlockStandalone = () => {
    const defaultStart = currentHalfHourIndex >= 0 && currentHalfHourIndex < 47
      ? formatMinutesToHHMM((currentHalfHourIndex + 1) * 30)
      : "10:00";
    const startMins = parseHHMM(defaultStart);
    const endMins = startMins + 30;

    setDialogBlock(null);
    setDialogStartTime(defaultStart);
    setDialogEndTime(formatMinutesToHHMM(endMins));
    setDialogDuration(30);
    setIsDialogOpen(true);
  };

  return (
    <section
      aria-label="24-Hour Visual Day Map"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4 select-none"
    >
      {/* Header bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock size={14} />
              </span>
              <span>24-Hour Day Map</span>
            </h2>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground border border-border">
              48 Blocks × 30m
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Click any empty cube to add a block, drag across cubes to select a duration, or click an existing block to edit.
          </p>
        </div>

        {/* Action Controls & Occupancy stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* + Add Block Button */}
          <button
            type="button"
            onClick={handleAddBlockStandalone}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 shadow-2xs transition-all cursor-pointer"
            title="Create a new time block"
          >
            <Plus size={14} />
            <span>Add Block</span>
          </button>

          {/* Mobile Select Range Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMobileRangeMode(!isMobileRangeMode);
              setMobileRangeStart(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isMobileRangeMode
                ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
            title="Toggle two-tap range selection mode"
          >
            <MousePointer size={13} />
            <span>{isMobileRangeMode ? "Cancel Range" : "Select Range"}</span>
          </button>

          {/* Manage Categories Link */}
          {onManageCategories && (
            <button
              type="button"
              onClick={onManageCategories}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs transition-all cursor-pointer"
            >
              <Layers size={13} />
              <span>Manage Categories</span>
            </button>
          )}

          {/* Occupancy pill */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-xl border border-border/60">
            <span>Scheduled:</span>
            <span className="font-bold text-foreground">{allocatedHoursFormatted}</span>
            <span className="text-muted-foreground/70 text-2xs">({overallOccupancyPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Mobile Range Banner indicator */}
      {isMobileRangeMode && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-2.5 text-xs text-primary flex items-center justify-between animate-in fade-in-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>
              {mobileRangeStart === null
                ? "Tap a start cube on the map to begin range selection."
                : `Start set at ${formatMinutesTo12h(mobileRangeStart * 30)}. Now tap an end cube.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsMobileRangeMode(false);
              setMobileRangeStart(null);
            }}
            className="text-xs font-bold hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 4 Rows of 12 Cubes Grid */}
      <div className="space-y-3 pt-1">
        {rows.map((rowCubes, rowIndex) => {
          const meta = ROW_METADATA[rowIndex];
          const Icon = meta.icon;

          return (
            <div
              key={rowIndex}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-muted/30 p-2 border border-border/50"
            >
              {/* Row Label (left on desktop, top on mobile) */}
              <div className="flex items-center justify-between sm:w-44 shrink-0 sm:pr-2">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className={meta.iconColor} />
                  <span className="text-xs font-bold text-foreground">{meta.title}</span>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">
                  {meta.timeRange}
                </span>
              </div>

              {/* 12 Cubes Grid */}
              <div className="grid grid-cols-12 gap-1 sm:gap-1.5 flex-1 w-full">
                {rowCubes.map((cube) => {
                  const isCurrent = cube.index === currentHalfHourIndex;
                  const hasBlocks = cube.blocks.length > 0;
                  const isSuggested = cube.status === "suggested";
                  const isCompleted = cube.status === "completed";
                  const isSelected = Boolean(activeBlockId && cube.primaryBlock?.id === activeBlockId);
                  const isActive = cube.status === "active" || isSelected;
                  const isInPreviewRange = isIndexInActiveRange(cube.index);

                  // Check if block spans continuously into previous or next cube
                  const prevCube = cube.col > 0 ? rowCubes[cube.col - 1] : null;
                  const nextCube = cube.col < 11 ? rowCubes[cube.col + 1] : null;
                  const spansFromPrev =
                    prevCube &&
                    prevCube.primaryBlock &&
                    cube.primaryBlock &&
                    prevCube.primaryBlock.id === cube.primaryBlock.id;
                  const spansToNext =
                    nextCube &&
                    nextCube.primaryBlock &&
                    cube.primaryBlock &&
                    nextCube.primaryBlock.id === cube.primaryBlock.id;

                  const cubeColor = cube.color || "#4f46e5";

                  return (
                    <div
                      key={cube.index}
                      className="relative group"
                      onMouseEnter={() => handleCubeMouseEnter(cube)}
                      onMouseLeave={() => setHoveredCube(null)}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => handleCubeMouseDown(cube, e)}
                        onClick={() => handleCubeClick(cube)}
                        aria-label={`Time slot ${cube.formattedLabel}: ${
                          hasBlocks ? cube.primaryBlock?.title : "Unscheduled"
                        }`}
                        className={`
                          relative w-full h-11 sm:h-12 rounded-lg border text-left transition-all duration-150 cursor-pointer overflow-hidden
                          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                          ${
                            hasBlocks
                              ? isSuggested
                                ? "border-dashed border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20"
                                : "border-border shadow-2xs hover:brightness-105"
                              : "border-border/60 bg-background/80 hover:bg-muted/80 hover:border-primary/40"
                          }
                          ${isCurrent ? "ring-2 ring-primary ring-offset-1 shadow-xs" : ""}
                          ${isActive ? "ring-2 ring-primary ring-offset-2 z-20 scale-[1.03] shadow-md brightness-110" : ""}
                          ${isInPreviewRange ? "ring-2 ring-primary bg-primary/25 border-primary scale-[1.03] z-20 shadow-xs" : ""}
                          ${spansFromPrev ? "rounded-l-xs border-l-0" : ""}
                          ${spansToNext ? "rounded-r-xs border-r-0" : ""}
                        `}
                      >
                        {/* Proportional fill layer */}
                        {hasBlocks && (
                          <div
                            className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${
                              isCompleted ? "opacity-60" : "opacity-90"
                            }`}
                            style={{
                              height: `${cube.fillPercent}%`,
                              backgroundColor: cubeColor,
                            }}
                          />
                        )}

                        {/* Cube Content Layer */}
                        <div className="relative z-10 flex flex-col justify-between h-full p-1 sm:p-1.5 select-none pointer-events-none">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[9px] sm:text-[10px] font-mono leading-none ${
                                hasBlocks && cube.fillPercent >= 60
                                  ? "text-white font-bold drop-shadow-xs"
                                  : "text-muted-foreground font-medium"
                              }`}
                            >
                              {cube.timeLabel.slice(0, 5)}
                            </span>

                            {/* Spanning or Overnight indicators */}
                            {cube.primaryBlock &&
                              parseHHMM(cube.primaryBlock.endTime) <= parseHHMM(cube.primaryBlock.startTime) &&
                              cube.primaryBlock.durationMinutes > 0 && (
                                <span
                                  title="Overnight Block"
                                  className="text-[8px] leading-none text-white drop-shadow-xs"
                                >
                                  🌙
                                </span>
                              )}
                            {isCurrent && (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                            )}
                          </div>

                          {/* Occupancy indicator dot / category pill */}
                          <div className="flex items-center justify-between text-[8px]">
                            {hasBlocks ? (
                              <span
                                className={`text-[8px] font-bold leading-none truncate max-w-[50px] ${
                                  cube.fillPercent >= 60 ? "text-white/90 drop-shadow-xs" : "text-foreground/80"
                                }`}
                              >
                                {isSuggested ? "★" : cube.fillPercent < 100 ? `${Math.round((cube.fillPercent * 30) / 100)}m` : "30m"}
                              </span>
                            ) : (
                              <span className="text-[8px] text-muted-foreground/40 leading-none">
                                {isInPreviewRange ? "select" : "free"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Active pulsing border when active */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse pointer-events-none" />
                        )}
                      </button>

                      {/* Tooltip on hover */}
                      {hoveredCube?.index === cube.index && !isMouseDown && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 p-2.5 rounded-xl bg-popover text-popover-foreground border border-border shadow-lg text-xs pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100">
                          <div className="flex items-center justify-between pb-1 border-b border-border/60 mb-1.5">
                            <span className="font-bold font-mono text-2xs text-muted-foreground">
                              {cube.formattedLabel} – {formatMinutesTo12h(cube.endMinutes)}
                            </span>
                            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-muted">
                              {cube.fillPercent}% filled
                            </span>
                          </div>

                          {hasBlocks ? (
                            <div className="space-y-1.5">
                              {cube.blocks.map((b) => (
                                <div key={b.id} className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: b.color || cubeColor }}
                                    />
                                    <span className="font-semibold truncate text-foreground">
                                      {b.title}
                                    </span>
                                  </div>
                                  <div className="text-2xs text-muted-foreground pl-3.5 flex items-center gap-1.5">
                                    <span>
                                      {b.startTime} – {b.endTime} ({b.durationMinutes}m)
                                    </span>
                                    {b.status === "suggested" && (
                                      <span className="text-amber-500 font-bold">(Suggested)</span>
                                    )}
                                    {b.completed && (
                                      <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                                        <CheckCircle2 size={10} /> Done
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <p className="text-3xs text-muted-foreground/80 italic pt-1 border-t border-border/40">
                                Click to view or edit this block.
                              </p>
                            </div>
                          ) : (
                            <p className="text-2xs text-muted-foreground italic">
                              Free 30-minute block. Click to schedule or drag to select range.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Quick Category Reference */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-2xs text-muted-foreground border-t border-border/50">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-foreground">Categories:</span>
          {categories.slice(0, 6).map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium text-foreground">{cat.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
            <span>Unscheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-dashed border-amber-500 bg-amber-500/20" />
            <span>Suggested</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>Current Time</span>
          </div>
        </div>
      </div>

      {/* Minimal Add/Edit Block Dialog */}
      <DayMapBlockDialog
        isOpen={isDialogOpen}
        block={dialogBlock}
        initialDate={currentDateStr}
        initialStartTime={dialogStartTime}
        initialEndTime={dialogEndTime}
        initialDurationMinutes={dialogDuration}
        allBlocks={allBlocks}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        onToggleComplete={handleToggleComplete}
        onStartPomodoro={handleStartPomodoro}
      />

      {/* Undo Deletion Floating Banner */}
      {undoDeletedBlock && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="text-xs text-foreground">
            Deleted block <strong>&quot;{undoDeletedBlock.title}&quot;</strong>
          </div>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw size={12} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoDeletedBlock(null)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
