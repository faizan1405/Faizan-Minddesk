import type { CalendarEvent, ScheduledTaskBlock } from "@/features/calendar/types";

export interface ScheduleConflict {
  title: string;
  timeRange: string;
  sourceType: "event" | "block";
  id: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ScheduleConflict[];
  suggestedStartTime: string;
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Checks for time overlaps with existing calendar events and scheduled time blocks on a specific date.
 * If conflicts exist, computes a suggested alternative free slot.
 */
export function checkScheduleConflict(
  date: string,
  startTime: string,
  durationMinutes: number,
  events: CalendarEvent[],
  scheduledBlocks: ScheduledTaskBlock[],
  excludeBlockId?: string
): ConflictCheckResult {
  const proposedStart = timeToMinutes(startTime);
  const proposedEnd = proposedStart + durationMinutes;

  const conflicts: ScheduleConflict[] = [];

  // 1. Check Events for this date
  const dayEvents = events.filter((e) => e.startDate === date && !e.allDay && e.startTime && e.endTime);
  for (const e of dayEvents) {
    const eStart = timeToMinutes(e.startTime!);
    const eEnd = timeToMinutes(e.endTime!);

    // Overlap condition: proposedStart < eEnd && proposedEnd > eStart
    if (proposedStart < eEnd && proposedEnd > eStart) {
      conflicts.push({
        id: e.id,
        title: e.title,
        timeRange: `${e.startTime} - ${e.endTime}`,
        sourceType: "event",
      });
    }
  }

  // 2. Check Scheduled Time Blocks for this date
  const dayBlocks = scheduledBlocks.filter(
    (b) => b.date === date && b.id !== excludeBlockId && b.startTime && b.endTime
  );
  for (const b of dayBlocks) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);

    if (proposedStart < bEnd && proposedEnd > bStart) {
      conflicts.push({
        id: b.id,
        title: b.title,
        timeRange: `${b.startTime} - ${b.endTime}`,
        sourceType: "block",
      });
    }
  }

  if (conflicts.length === 0) {
    return {
      hasConflict: false,
      conflicts: [],
      suggestedStartTime: startTime,
    };
  }

  // 3. Find a free alternative time slot (between 08:00 and 21:00)
  // Gather all busy intervals
  const busyIntervals: Array<{ start: number; end: number }> = [];
  for (const e of dayEvents) {
    busyIntervals.push({ start: timeToMinutes(e.startTime!), end: timeToMinutes(e.endTime!) });
  }
  for (const b of dayBlocks) {
    busyIntervals.push({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) });
  }

  // Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start - b.start);

  // Search in 15-minute increments from 08:00 to 21:00
  let suggested = startTime;
  const dayStart = 8 * 60; // 08:00
  const dayEnd = 21 * 60; // 21:00

  // First try: immediately after the latest conflicting item
  const latestConflictEnd = Math.max(
    ...conflicts.map((c) => {
      const parts = c.timeRange.split("-").map((s) => s.trim());
      return timeToMinutes(parts[1] || "12:00");
    })
  );

  if (latestConflictEnd + durationMinutes <= dayEnd) {
    // Check if slot starting at latestConflictEnd is free
    const candidateStart = latestConflictEnd;
    const candidateEnd = candidateStart + durationMinutes;
    const overlapsCandidate = busyIntervals.some(
      (int) => candidateStart < int.end && candidateEnd > int.start
    );
    if (!overlapsCandidate) {
      suggested = minutesToTime(candidateStart);
    }
  }

  // Fallback scan if latestConflictEnd didn't work
  if (suggested === startTime) {
    for (let slot = dayStart; slot + durationMinutes <= dayEnd; slot += 30) {
      const slotEnd = slot + durationMinutes;
      const overlaps = busyIntervals.some(
        (int) => slot < int.end && slotEnd > int.start
      );
      if (!overlaps) {
        suggested = minutesToTime(slot);
        break;
      }
    }
  }

  return {
    hasConflict: true,
    conflicts,
    suggestedStartTime: suggested,
  };
}
