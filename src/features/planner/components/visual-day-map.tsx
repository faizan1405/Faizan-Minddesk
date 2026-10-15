"use client";

import React, { useMemo, useState } from "react";
import { isToday, parseISO } from "date-fns";
import {
  Clock,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CheckCircle2,
  Layers,
} from "lucide-react";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  DayMapCube,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";
import {
  calculateDayMapCubes,
  formatMinutesTo12h,
  parseHHMM,
} from "../services/smart-scheduler";

interface VisualDayMapProps {
  currentDateStr: string;
  allBlocks: ScheduledTaskBlock[];
  activeBlockId?: string;
  onSelectTimeSlot: (timeHHMM: string) => void;
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
  const { plannerCategories } = useCalendar();
  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  const [hoveredCube, setHoveredCube] = useState<DayMapCube | null>(null);

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

  return (
    <section
      aria-label="24-Hour Visual Day Map"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            A continuous visual map of your entire 24 hours. Click any cube to jump into that time slot.
          </p>
        </div>

        {/* Occupancy stats pill & category link */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Scheduled:</span>
            <span className="font-bold text-foreground">{allocatedHoursFormatted}</span>
            <span className="text-muted-foreground/60">({overallOccupancyPercent}%)</span>
          </div>

          {onManageCategories && (
            <button
              type="button"
              onClick={onManageCategories}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Layers size={13} />
              <span>Categories</span>
            </button>
          )}
        </div>
      </div>

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
                  const isActive = cube.status === "active";

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
                      onMouseEnter={() => setHoveredCube(cube)}
                      onMouseLeave={() => setHoveredCube(null)}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTimeSlot(cube.timeLabel)}
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
                        <div className="relative z-10 flex flex-col justify-between h-full p-1 sm:p-1.5 select-none">
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
                                className={`text-[8px] font-bold leading-none ${
                                  cube.fillPercent >= 60 ? "text-white/90 drop-shadow-xs" : "text-foreground/80"
                                }`}
                              >
                                {isSuggested ? "★ Suggestion" : cube.fillPercent < 100 ? `${Math.round((cube.fillPercent * 30) / 100)}m` : "30m"}
                              </span>
                            ) : (
                              <span className="text-[8px] text-muted-foreground/40 leading-none">
                                free
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Active pulsing border when active in focus mode */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse pointer-events-none" />
                        )}
                      </button>

                      {/* Tooltip on hover */}
                      {hoveredCube?.index === cube.index && (
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
                            </div>
                          ) : (
                            <p className="text-2xs text-muted-foreground italic">
                              Free 30-minute block. Click to schedule here.
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
          {categories.slice(0, 5).map((cat) => (
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
    </section>
  );
}
