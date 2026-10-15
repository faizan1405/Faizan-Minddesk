import { format, parseISO, subDays, getDay } from "date-fns";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import {
  DayMapCube,
  DailyTimeSummary,
  PlannerCategory,
  PlannerRoutine,
  PlannerRoutineException,
  TimeBlockStatus,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";

/**
 * Converts "HH:mm" to minutes from midnight (0 - 1440).
 */
export function parseHHMM(timeStr: string): number {
  if (!timeStr) return 0;
  const [hoursStr, minutesStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:mm".
 */
export function formatMinutesToHHMM(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Converts minutes to friendly 12-hour format e.g. "9:00 AM", "12:30 PM".
 */
export function formatMinutesTo12h(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minStr = mins === 0 ? "00" : String(mins).padStart(2, "0");
  return `${hours12}:${minStr} ${period}`;
}

/**
 * Resolves category color dynamically.
 * Rule: Changing category color updates all associated blocks immediately!
 */
export function resolveCategoryColor(
  categoryId?: string,
  blockColor?: string,
  categories: PlannerCategory[] = DEFAULT_PLANNER_CATEGORIES
): string {
  if (categoryId) {
    const found = categories.find((c) => c.id === categoryId);
    if (found?.color) return found.color;
  }
  return blockColor || "#4f46e5";
}

/**
 * Normalizes intervals by merging overlaps so double counting never occurs.
 */
export function mergeIntervals(
  intervals: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Checks if interval [start, end] collides with any occupied interval.
 */
export function checkIntervalCollision(
  start: number,
  end: number,
  occupied: Array<{ start: number; end: number }>,
  excludeId?: string
): boolean {
  for (const interval of occupied) {
    if (start < interval.end && end > interval.start) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates the 48 cubes representing the 24 hours of the given date.
 * Handles row crossings, overnight blocks from previous day, fractional occupancy,
 * and preserves category colors.
 */
export function calculateDayMapCubes(
  dateStr: string,
  allBlocks: ScheduledTaskBlock[],
  categories: PlannerCategory[] = DEFAULT_PLANNER_CATEGORIES,
  activeBlockId?: string
): DayMapCube[] {
  const cubes: DayMapCube[] = [];
  const currentDate = parseISO(dateStr);
  const previousDateStr = format(subDays(currentDate, 1), "yyyy-MM-dd");

  // Blocks for today
  const todaysBlocks = allBlocks.filter((b) => b.date === dateStr);
  // Blocks for yesterday to check for overnight spillover into today
  const yesterdaysBlocks = allBlocks.filter((b) => b.date === previousDateStr);

  // Collect intervals relevant to today:
  interface EffectiveBlockInterval {
    block: ScheduledTaskBlock;
    startMins: number; // 0 to 1440
    endMins: number; // 0 to 1440
    isOvernightSpillover?: boolean;
  }

  const effectiveIntervals: EffectiveBlockInterval[] = [];

  // 1. Process today's blocks
  for (const block of todaysBlocks) {
    const startMins = parseHHMM(block.startTime);
    let endMins = parseHHMM(block.endTime);

    // If overnight block (e.g. 23:00 to 07:00)
    if (endMins <= startMins && block.durationMinutes > 0) {
      // On today, it occupies from startMins to 1440 (midnight)
      effectiveIntervals.push({
        block,
        startMins,
        endMins: 1440,
      });
    } else {
      effectiveIntervals.push({
        block,
        startMins,
        endMins: Math.min(1440, endMins),
      });
    }
  }

  // 2. Process yesterday's overnight blocks spilling into today (00:00 to endTime)
  for (const block of yesterdaysBlocks) {
    const yStart = parseHHMM(block.startTime);
    const yEnd = parseHHMM(block.endTime);

    if (yEnd <= yStart && block.durationMinutes > 0 && yEnd > 0) {
      // Spills from 00:00 to yEnd today!
      effectiveIntervals.push({
        block,
        startMins: 0,
        endMins: yEnd,
        isOvernightSpillover: true,
      });
    }
  }

  // Build the 48 cubes (each 30m)
  for (let index = 0; index < 48; index++) {
    const row = Math.floor(index / 12); // 0..3 (4 rows of 12)
    const col = index % 12; // 0..11
    const cubeStart = index * 30;
    const cubeEnd = (index + 1) * 30;

    // Find all blocks that overlap with this cube's 30-minute window
    const matchingIntervals = effectiveIntervals.filter(
      (item) => cubeStart < item.endMins && cubeEnd > item.startMins
    );

    let fillPercent = 0;
    let primaryBlock: ScheduledTaskBlock | undefined;
    let status: TimeBlockStatus | undefined;
    let color: string | undefined;

    if (matchingIntervals.length > 0) {
      // Pick primary block (active block prioritized, else first)
      const activeMatch = matchingIntervals.find((m) => m.block.id === activeBlockId);
      const chosen = activeMatch || matchingIntervals[0];
      primaryBlock = chosen.block;

      // Calculate fractional occupancy
      let totalOccupiedMinutesInCube = 0;
      for (const item of matchingIntervals) {
        const overlapStart = Math.max(cubeStart, item.startMins);
        const overlapEnd = Math.min(cubeEnd, item.endMins);
        totalOccupiedMinutesInCube += Math.max(0, overlapEnd - overlapStart);
      }

      fillPercent = Math.min(100, Math.round((totalOccupiedMinutesInCube / 30) * 100));

      // Resolve color from categories
      color = resolveCategoryColor(primaryBlock.categoryId, primaryBlock.color, categories);

      // Resolve status
      if (primaryBlock.id === activeBlockId) {
        status = "active";
      } else if (primaryBlock.status) {
        status = primaryBlock.status;
      } else if (primaryBlock.completed) {
        status = "completed";
      } else {
        status = "confirmed";
      }
    }

    cubes.push({
      index,
      row,
      col,
      startMinutes: cubeStart,
      endMinutes: cubeEnd,
      timeLabel: formatMinutesToHHMM(cubeStart),
      formattedLabel: formatMinutesTo12h(cubeStart),
      blocks: matchingIntervals.map((m) => m.block),
      primaryBlock,
      fillPercent,
      color,
      status,
      isSpanningRowStart: col === 0 && fillPercent > 0,
      isSpanningRowEnd: col === 11 && fillPercent > 0,
    });
  }

  return cubes;
}

/**
 * Calculates restrained daily time summary:
 * - Confirmed planned hours
 * - Tentatively suggested hours
 * - Unallocated hours (24h - confirmed - suggested)
 * - Actual focused time
 * Overlapping intervals are merged to prevent double-counting.
 */
export function calculateDailyTimeSummary(
  dateStr: string,
  allBlocks: ScheduledTaskBlock[],
  focusSessions: Array<{ date: string; focusedMinutes: number }> = []
): DailyTimeSummary {
  const dayBlocks = allBlocks.filter((b) => b.date === dateStr);

  const confirmedIntervals: Array<{ start: number; end: number }> = [];
  const suggestedIntervals: Array<{ start: number; end: number }> = [];

  for (const block of dayBlocks) {
    if (block.status === "skipped") continue;

    const start = parseHHMM(block.startTime);
    let end = parseHHMM(block.endTime);
    if (end <= start && block.durationMinutes > 0) {
      end = 1440; // Clamped for today's allocation
    }

    if (block.status === "suggested" || block.isFlexibleSuggestion) {
      suggestedIntervals.push({ start, end });
    } else {
      confirmedIntervals.push({ start, end });
    }
  }

  const mergedConfirmed = mergeIntervals(confirmedIntervals);
  const confirmedMinutes = mergedConfirmed.reduce(
    (acc, curr) => acc + (curr.end - curr.start),
    0
  );

  const mergedSuggested = mergeIntervals(suggestedIntervals);
  const suggestedMinutes = mergedSuggested.reduce(
    (acc, curr) => acc + (curr.end - curr.start),
    0
  );

  const unallocatedMinutes = Math.max(0, 1440 - confirmedMinutes - suggestedMinutes);

  const dayFocusSessions = focusSessions.filter((s) => s.date === dateStr);
  const focusedMinutes = dayFocusSessions.reduce(
    (acc, curr) => acc + (curr.focusedMinutes || 0),
    0
  );

  return {
    confirmedMinutes,
    suggestedMinutes,
    unallocatedMinutes,
    focusedMinutes,
  };
}

/**
 * Smart Deterministic Scheduling for Flexible Routines.
 * Transparent, no AI black box, respects preferences and constraints:
 * 1. Respect already-confirmed commitments.
 * 2. Respect fixed recurring routines.
 * 3. Respect flexible routine's allowed time window.
 * 4. Prefer its explicitly configured preferred start time.
 * 5. If unavailable, suggest the nearest reasonable free interval.
 * 6. Never silently overlap or replace confirmed blocks.
 */
export function scheduleFlexibleRoutines(
  dateStr: string,
  routines: PlannerRoutine[],
  exceptions: PlannerRoutineException[],
  confirmedBlocks: ScheduledTaskBlock[],
  categories: PlannerCategory[] = DEFAULT_PLANNER_CATEGORIES
): {
  suggestedBlocks: ScheduledTaskBlock[];
  unplacedRoutines: Array<{ routine: PlannerRoutine; reason: string }>;
} {
  const currentDate = parseISO(dateStr);
  const dayOfWeek = getDay(currentDate); // 0=Sun .. 6=Sat

  // Filter flexible routines applicable to today
  const activeFlexibleRoutines = routines.filter((r) => {
    if (!r.isActive || r.type !== "flexible") return false;
    return r.daysOfWeek.includes(dayOfWeek);
  });

  // Collect occupied intervals on this date
  const dayConfirmed = confirmedBlocks.filter(
    (b) => b.date === dateStr && b.status !== "skipped"
  );
  const occupiedIntervals: Array<{ start: number; end: number }> = [];

  for (const b of dayConfirmed) {
    const s = parseHHMM(b.startTime);
    let e = parseHHMM(b.endTime);
    if (e <= s && b.durationMinutes > 0) e = 1440;
    occupiedIntervals.push({ start: s, end: e });
  }

  const mergedOccupied = mergeIntervals(occupiedIntervals);

  const suggestedBlocks: ScheduledTaskBlock[] = [];
  const unplacedRoutines: Array<{ routine: PlannerRoutine; reason: string }> = [];

  for (const routine of activeFlexibleRoutines) {
    // Check for exception on this date
    const exception = exceptions.find(
      (ex) => ex.routineId === routine.id && ex.date === dateStr
    );

    if (exception && exception.type === "skip") {
      continue; // Routine explicitly skipped for today
    }

    const duration = exception?.overrideDurationMinutes || routine.durationMinutes;
    const prefStart = parseHHMM(exception?.overrideStartTime || routine.preferredStartTime);
    const windowStart = parseHHMM(routine.windowStartTime || "06:00");
    const windowEnd = parseHHMM(routine.windowEndTime || "22:00");

    // Check if preferred start time fits within allowed window
    let candidateStart: number | null = null;

    if (
      prefStart >= windowStart &&
      prefStart + duration <= windowEnd &&
      !checkIntervalCollision(prefStart, prefStart + duration, mergedOccupied)
    ) {
      candidateStart = prefStart;
    } else {
      // Search outward from preferred start in 30-minute steps
      let bestDistance = Infinity;
      let bestStart: number | null = null;

      // Step across allowed window in 30-minute increments
      for (let t = windowStart; t + duration <= windowEnd; t += 30) {
        if (!checkIntervalCollision(t, t + duration, mergedOccupied)) {
          const distance = Math.abs(t - prefStart);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestStart = t;
          }
        }
      }

      candidateStart = bestStart;
    }

    if (candidateStart !== null) {
      const candidateEnd = candidateStart + duration;
      const categoryColor = resolveCategoryColor(
        exception?.overrideCategoryId || routine.categoryId,
        undefined,
        categories
      );

      const block: ScheduledTaskBlock = {
        id: `sug-${routine.id}-${dateStr}`,
        title: exception?.overrideTitle || routine.title,
        date: dateStr,
        startTime: formatMinutesToHHMM(candidateStart),
        endTime: formatMinutesToHHMM(candidateEnd),
        durationMinutes: duration,
        categoryId: exception?.overrideCategoryId || routine.categoryId,
        color: categoryColor,
        completed: false,
        status: "suggested",
        createdAt: new Date().toISOString(),
        blockType: "routine",
        isFlexibleSuggestion: true,
        flexibleRoutineId: routine.id,
      };

      suggestedBlocks.push(block);
      // Mark occupied so subsequent flexible routines don't collide
      mergedOccupied.push({ start: candidateStart, end: candidateEnd });
      mergedOccupied.sort((a, b) => a.start - b.start);
    } else {
      // Unplaced routine
      const windowStr = `${formatMinutesTo12h(windowStart)} – ${formatMinutesTo12h(windowEnd)}`;
      unplacedRoutines.push({
        routine,
        reason: `No free ${duration}m slot available between ${windowStr}.`,
      });
    }
  }

  return { suggestedBlocks, unplacedRoutines };
}

/**
 * Generates confirmed blocks for Fixed Routines on the specified date.
 */
export function generateFixedRoutineBlocks(
  dateStr: string,
  routines: PlannerRoutine[],
  exceptions: PlannerRoutineException[],
  categories: PlannerCategory[] = DEFAULT_PLANNER_CATEGORIES
): ScheduledTaskBlock[] {
  const currentDate = parseISO(dateStr);
  const dayOfWeek = getDay(currentDate);

  const activeFixedRoutines = routines.filter((r) => {
    if (!r.isActive || r.type !== "fixed") return false;
    return r.daysOfWeek.includes(dayOfWeek);
  });

  const generated: ScheduledTaskBlock[] = [];

  for (const routine of activeFixedRoutines) {
    const exception = exceptions.find(
      (ex) => ex.routineId === routine.id && ex.date === dateStr
    );

    if (exception && exception.type === "skip") {
      continue;
    }

    const startTime = exception?.overrideStartTime || routine.fixedStartTime || "09:00";
    const endTime = exception?.overrideEndTime || routine.fixedEndTime || "10:00";
    const duration = exception?.overrideDurationMinutes || routine.durationMinutes;

    const categoryColor = resolveCategoryColor(
      exception?.overrideCategoryId || routine.categoryId,
      undefined,
      categories
    );

    generated.push({
      id: `fix-${routine.id}-${dateStr}`,
      title: exception?.overrideTitle || routine.title,
      date: dateStr,
      startTime,
      endTime,
      durationMinutes: duration,
      categoryId: exception?.overrideCategoryId || routine.categoryId,
      color: categoryColor,
      completed: false,
      status: "confirmed",
      createdAt: routine.createdAt,
      blockType: "routine",
      isRecurringInstance: true,
      recurringSeriesId: routine.id,
    });
  }

  return generated;
}
