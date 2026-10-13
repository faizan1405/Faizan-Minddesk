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
