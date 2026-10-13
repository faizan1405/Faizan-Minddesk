import { describe, it, expect } from "vitest";
import {
  layoutOverlappingEvents,
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
} from "@/features/calendar/services/calendar-layout";
import { ExpandedCalendarEvent } from "@/features/calendar/types";

describe("Calendar Layout Engine", () => {
  it("converts time string to minutes and back accurately", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("14:45")).toBe(885);
    expect(parseTimeToMinutes("23:59")).toBe(1439);

    expect(minutesToTimeString(0)).toBe("00:00");
    expect(minutesToTimeString(570)).toBe("09:30");
    expect(minutesToTimeString(885)).toBe("14:45");
  });

  it("formats 12-hour and 24-hour time strings correctly", () => {
    expect(formatTimeDisplay("09:00", "12h")).toBe("9:00 AM");
    expect(formatTimeDisplay("12:00", "12h")).toBe("12:00 PM");
    expect(formatTimeDisplay("15:30", "12h")).toBe("3:30 PM");
    expect(formatTimeDisplay("00:15", "12h")).toBe("12:15 AM");

    expect(formatTimeDisplay("09:00", "24h")).toBe("09:00");
    expect(formatTimeDisplay("15:30", "24h")).toBe("15:30");
  });

  it("assigns single column for non-overlapping events", () => {
    const events: ExpandedCalendarEvent[] = [
      {
        id: "e1",
        title: "Morning Meeting",
        startDate: "2026-10-13",
        startTime: "09:00",
        endDate: "2026-10-13",
        endTime: "10:00",
        allDay: false,
        categoryId: "cat-work",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
      {
        id: "e2",
        title: "Afternoon Sync",
        startDate: "2026-10-13",
        startTime: "11:00",
        endDate: "2026-10-13",
        endTime: "12:00",
        allDay: false,
        categoryId: "cat-work",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
    ];

    const positioned = layoutOverlappingEvents(events);
    expect(positioned).toHaveLength(2);
    expect(positioned[0].column).toBe(0);
    expect(positioned[0].totalColumns).toBe(1);
    expect(positioned[1].column).toBe(0);
    expect(positioned[1].totalColumns).toBe(1);
  });

  it("computes side-by-side columns for overlapping events", () => {
    const events: ExpandedCalendarEvent[] = [
      {
        id: "e1",
        title: "Event 1",
        startDate: "2026-10-13",
        startTime: "10:00",
        endDate: "2026-10-13",
        endTime: "11:30",
        allDay: false,
        categoryId: "cat-work",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
      {
        id: "e2",
        title: "Event 2 (Overlapping)",
        startDate: "2026-10-13",
        startTime: "10:30",
        endDate: "2026-10-13",
        endTime: "12:00",
        allDay: false,
        categoryId: "cat-meetings",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
    ];

    const positioned = layoutOverlappingEvents(events);
    expect(positioned).toHaveLength(2);

    // Both belong to cluster of 2 columns
    expect(positioned[0].totalColumns).toBe(2);
    expect(positioned[1].totalColumns).toBe(2);

    // Columns should be distinct: 0 and 1
    const columns = [positioned[0].column, positioned[1].column].sort();
    expect(columns).toEqual([0, 1]);
  });
});
