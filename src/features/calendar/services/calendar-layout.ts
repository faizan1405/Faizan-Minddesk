import { ExpandedCalendarEvent, ScheduledTaskBlock } from "../types";

export interface PositionedEvent {
  event: ExpandedCalendarEvent;
  startMinutes: number; // minutes from 00:00 (e.g. 9:30 = 570)
  endMinutes: number;
  durationMinutes: number;
  column: number; // 0-indexed column in overlapping cluster
  totalColumns: number; // total columns in overlapping cluster
}

export interface PositionedBlock {
  block: ScheduledTaskBlock;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  column: number;
  totalColumns: number;
}

export function parseTimeToMinutes(timeStr?: string, defaultMinutes = 0): number {
  if (!timeStr) return defaultMinutes;
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return defaultMinutes;
  return parts[0] * 60 + parts[1];
}

export function minutesToTimeString(minutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Computes side-by-side positioning for overlapping timed events on a single day.
 * Ensures that overlapping events are assigned side-by-side columns without clipping or hiding.
 */
export function layoutOverlappingEvents(
  events: ExpandedCalendarEvent[]
): PositionedEvent[] {
  if (events.length === 0) return [];

  // Filter only timed events
  const timed = events.map((e) => {
    const startMinutes = parseTimeToMinutes(e.startTime, 9 * 60);
    let endMinutes = parseTimeToMinutes(e.endTime, startMinutes + 60);
    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(24 * 60, startMinutes + 30); // minimum 30 min display
    }
    return {
      event: e,
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
      column: 0,
      totalColumns: 1,
    };
  });

  // Sort by startMinutes asc, then duration desc
  timed.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.durationMinutes - a.durationMinutes;
  });

  // Cluster overlapping events
  const clusters: PositionedEvent[][] = [];
  let currentCluster: PositionedEvent[] = [];
  let clusterEnd = -1;

  for (const item of timed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMinutes;
    } else {
      if (item.startMinutes < clusterEnd) {
        // Overlaps with current cluster
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMinutes);
      } else {
        // Start a new cluster
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEnd = item.endMinutes;
      }
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // For each cluster, assign columns (greedy graph coloring)
  for (const cluster of clusters) {
    const columns: PositionedEvent[][] = [];

    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (lastInCol.endMinutes <= item.startMinutes) {
          columns[c].push(item);
          item.column = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.column = columns.length;
        columns.push([item]);
      }
    }

    const totalColumns = columns.length;
    for (const item of cluster) {
      item.totalColumns = totalColumns;
    }
  }

  return timed;
}

/**
 * Computes side-by-side positioning for scheduled task blocks on a single day.
 */
export function layoutOverlappingBlocks(
  blocks: ScheduledTaskBlock[]
): PositionedBlock[] {
  if (blocks.length === 0) return [];

  const timed = blocks.map((b) => {
    const startMinutes = parseTimeToMinutes(b.startTime, 9 * 60);
    let endMinutes = parseTimeToMinutes(b.endTime, startMinutes + b.durationMinutes);
    if (endMinutes <= startMinutes) {
      endMinutes = Math.min(24 * 60, startMinutes + (b.durationMinutes || 60));
    }
    return {
      block: b,
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
      column: 0,
      totalColumns: 1,
    };
  });

  timed.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.durationMinutes - a.durationMinutes;
  });

  const columns: PositionedBlock[][] = [];
  for (const item of timed) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1];
      if (lastInCol.endMinutes <= item.startMinutes) {
        columns[c].push(item);
        item.column = c;
        placed = true;
        break;
      }
    }
    if (!placed) {
      item.column = columns.length;
      columns.push([item]);
    }
  }

  const totalCols = Math.max(1, columns.length);
  for (const item of timed) {
    item.totalColumns = totalCols;
  }

  return timed;
}

/**
 * Formats time according to 12h or 24h setting.
 */
export function formatTimeDisplay(timeStr?: string, timeFormat: "12h" | "24h" = "12h"): string {
  if (!timeStr) return "";
  const [hoursStr, minsStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10);
  const mins = parseInt(minsStr, 10);
  if (isNaN(hours)) return timeStr;

  if (timeFormat === "24h") {
    return `${String(hours).padStart(2, "0")}:${String(mins || 0).padStart(2, "0")}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(mins || 0).padStart(2, "0")} ${period}`;
}

/**
 * Calculates total occupied minutes from an array of time intervals by computing
 * their mathematical union, strictly preventing double-counting of overlapping time slots.
 */
export function calculateMergedOccupiedMinutes(
  intervals: Array<{ startMinutes: number; endMinutes: number }>
): number {
  if (intervals.length === 0) return 0;

  // Filter valid intervals
  const valid = intervals
    .map((i) => ({
      start: Math.max(0, Math.min(24 * 60, i.startMinutes)),
      end: Math.max(0, Math.min(24 * 60, i.endMinutes)),
    }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  if (valid.length === 0) return 0;

  let totalMinutes = 0;
  let currentStart = valid[0].start;
  let currentEnd = valid[0].end;

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i];
    if (next.start <= currentEnd) {
      // Overlaps or contiguous: extend current range
      currentEnd = Math.max(currentEnd, next.end);
    } else {
      // Disjoint: commit current interval and start new
      totalMinutes += currentEnd - currentStart;
      currentStart = next.start;
      currentEnd = next.end;
    }
  }

  totalMinutes += currentEnd - currentStart;
  return totalMinutes;
}

export interface ConflictItem {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Detects whether a target interval conflicts with any items in a list of existing scheduled items.
 */
export function checkIntervalConflict(
  newItem: { startMinutes: number; endMinutes: number; id?: string },
  existingItems: ConflictItem[]
): {
  hasConflict: boolean;
  conflictingTitles: string[];
  conflictingItems: ConflictItem[];
} {
  const conflicting = existingItems.filter(
    (item) =>
      item.id !== newItem.id &&
      newItem.startMinutes < item.endMinutes &&
      newItem.endMinutes > item.startMinutes
  );

  return {
    hasConflict: conflicting.length > 0,
    conflictingTitles: conflicting.map((c) => c.title),
    conflictingItems: conflicting,
  };
}

export interface UnifiedTimelineItem {
  id: string;
  type: "event" | "block";
  title: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  column: number;
  totalColumns: number;
  event?: ExpandedCalendarEvent;
  block?: ScheduledTaskBlock;
}

/**
 * Computes unified side-by-side positioning for both calendar events and scheduled blocks
 * so that any overlapping items are laid out side-by-side and never completely cover each other.
 */
export function layoutUnifiedTimelineItems(
  events: ExpandedCalendarEvent[],
  blocks: ScheduledTaskBlock[]
): UnifiedTimelineItem[] {
  const items: UnifiedTimelineItem[] = [];

  for (const evt of events) {
    if (evt.allDay) continue;
    const startMinutes = parseTimeToMinutes(evt.startTime, 9 * 60);
    let endMinutes = parseTimeToMinutes(evt.endTime, startMinutes + 60);
    if (endMinutes <= startMinutes) endMinutes = Math.min(24 * 60, startMinutes + 30);
    items.push({
      id: evt.id,
      type: "event",
      title: evt.title,
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
      column: 0,
      totalColumns: 1,
      event: evt,
    });
  }

  for (const block of blocks) {
    const startMinutes = parseTimeToMinutes(block.startTime, 9 * 60);
    let endMinutes = parseTimeToMinutes(block.endTime, startMinutes + (block.durationMinutes || 60));
    if (endMinutes <= startMinutes) endMinutes = Math.min(24 * 60, startMinutes + (block.durationMinutes || 60));
    items.push({
      id: block.id,
      type: "block",
      title: block.title,
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
      column: 0,
      totalColumns: 1,
      block,
    });
  }

  if (items.length === 0) return [];

  // Sort items by startMinutes asc, then duration desc
  items.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.durationMinutes - a.durationMinutes;
  });

  // Cluster overlapping items
  const clusters: UnifiedTimelineItem[][] = [];
  let currentCluster: UnifiedTimelineItem[] = [];
  let clusterEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMinutes;
    } else {
      if (item.startMinutes < clusterEnd) {
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMinutes);
      } else {
        clusters.push(currentCluster);
        currentCluster = [item];
        clusterEnd = item.endMinutes;
      }
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign columns for each cluster
  for (const cluster of clusters) {
    const columns: UnifiedTimelineItem[][] = [];

    for (const item of cluster) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        const lastInCol = columns[c][columns[c].length - 1];
        if (lastInCol.endMinutes <= item.startMinutes) {
          columns[c].push(item);
          item.column = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.column = columns.length;
        columns.push([item]);
      }
    }

    const totalColumns = columns.length;
    for (const item of cluster) {
      item.totalColumns = totalColumns;
    }
  }

  return items;
}

