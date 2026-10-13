import { describe, it, expect } from "vitest";
import { expandEventsForRange } from "@/features/calendar/services/recurrence-engine";
import { CalendarEvent, RecurrenceException } from "@/features/calendar/types";
import { parseISO } from "date-fns";

describe("Calendar Recurrence Engine", () => {
  it("expands non-recurring events within the requested window", () => {
    const events: CalendarEvent[] = [
      {
        id: "evt-1",
        title: "Team Standup",
        startDate: "2026-10-15",
        startTime: "09:00",
        endDate: "2026-10-15",
        endTime: "09:30",
        allDay: false,
        categoryId: "cat-meetings",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
      {
        id: "evt-outside",
        title: "Future Event",
        startDate: "2026-11-20",
        endDate: "2026-11-20",
        allDay: false,
        categoryId: "cat-meetings",
        createdAt: "2026-10-01",
        updatedAt: "2026-10-01",
      },
    ];

    const rangeStart = parseISO("2026-10-10");
    const rangeEnd = parseISO("2026-10-20");

    const expanded = expandEventsForRange(events, [], rangeStart, rangeEnd);
    expect(expanded).toHaveLength(1);
    expect(expanded[0].id).toBe("evt-1");
  });

  it("correctly generates daily recurring events", () => {
    const recurringDaily: CalendarEvent = {
      id: "rec-daily",
      title: "Daily Standup",
      startDate: "2026-10-10",
      startTime: "10:00",
      endDate: "2026-10-10",
      endTime: "10:30",
      allDay: false,
      categoryId: "cat-meetings",
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endType: "never",
      },
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    };

    const rangeStart = parseISO("2026-10-12");
    const rangeEnd = parseISO("2026-10-16");

    const expanded = expandEventsForRange([recurringDaily], [], rangeStart, rangeEnd);
    // 5 days: Oct 12, 13, 14, 15, 16
    expect(expanded).toHaveLength(5);
    expect(expanded.map((e) => e.startDate)).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
    ]);
  });

  it("handles weekday-only recurrence (skipping weekends)", () => {
    const weekdayEvent: CalendarEvent = {
      id: "rec-weekday",
      title: "Weekday Market Review",
      startDate: "2026-10-09", // Friday
      startTime: "08:30",
      endDate: "2026-10-09",
      endTime: "09:00",
      allDay: false,
      categoryId: "cat-work",
      recurrence: {
        frequency: "WEEKDAY",
        interval: 1,
        endType: "never",
      },
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    };

    // Range spanning Friday Oct 9 through Tuesday Oct 13 (Oct 10 Sat, Oct 11 Sun)
    const rangeStart = parseISO("2026-10-09");
    const rangeEnd = parseISO("2026-10-13");

    const expanded = expandEventsForRange([weekdayEvent], [], rangeStart, rangeEnd);
    // Should produce Oct 9 (Fri), Oct 12 (Mon), Oct 13 (Tue)
    expect(expanded).toHaveLength(3);
    expect(expanded.map((e) => e.startDate)).toEqual([
      "2026-10-09",
      "2026-10-12",
      "2026-10-13",
    ]);
  });

  it("respects recurrence count limits", () => {
    const limitedEvent: CalendarEvent = {
      id: "rec-count",
      title: "Sprint Retrospective",
      startDate: "2026-10-01",
      startTime: "16:00",
      endDate: "2026-10-01",
      endTime: "17:00",
      allDay: false,
      categoryId: "cat-work",
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endType: "count",
        count: 3, // only 3 occurrences total: Oct 1, Oct 2, Oct 3
      },
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    };

    const rangeStart = parseISO("2026-10-01");
    const rangeEnd = parseISO("2026-10-10");

    const expanded = expandEventsForRange([limitedEvent], [], rangeStart, rangeEnd);
    expect(expanded).toHaveLength(3);
    expect(expanded.map((e) => e.startDate)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("omits cancelled occurrences using RecurrenceException", () => {
    const recurringEvent: CalendarEvent = {
      id: "rec-ex-test",
      title: "Daily Sync",
      startDate: "2026-10-10",
      startTime: "09:00",
      endDate: "2026-10-10",
      endTime: "09:30",
      allDay: false,
      categoryId: "cat-meetings",
      recurrence: {
        frequency: "DAILY",
        interval: 1,
        endType: "never",
      },
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    };

    // Cancel occurrence on 2026-10-12
    const exceptions: RecurrenceException[] = [
      {
        id: "ex-1",
        originalEventId: "rec-ex-test",
        exceptionDate: "2026-10-12",
        isCancelled: true,
      },
    ];

    const rangeStart = parseISO("2026-10-11");
    const rangeEnd = parseISO("2026-10-13");

    const expanded = expandEventsForRange([recurringEvent], exceptions, rangeStart, rangeEnd);
    // Should include 2026-10-11 and 2026-10-13, but NOT 2026-10-12
    expect(expanded.map((e) => e.startDate)).toEqual(["2026-10-11", "2026-10-13"]);
  });

  it("applies override modifications to a single occurrence", () => {
    const recurringEvent: CalendarEvent = {
      id: "rec-override-test",
      title: "Weekly Planning",
      startDate: "2026-10-05",
      startTime: "10:00",
      endDate: "2026-10-05",
      endTime: "11:00",
      allDay: false,
      categoryId: "cat-work",
      recurrence: {
        frequency: "WEEKLY",
        interval: 1,
        endType: "never",
      },
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    };

    // Override title and time on 2026-10-12
    const exceptions: RecurrenceException[] = [
      {
        id: "ex-override",
        originalEventId: "rec-override-test",
        exceptionDate: "2026-10-12",
        isCancelled: false,
        overrideData: {
          title: "Special All-Hands Planning",
          startTime: "14:00",
          endTime: "16:00",
        },
      },
    ];

    const rangeStart = parseISO("2026-10-11");
    const rangeEnd = parseISO("2026-10-13");

    const expanded = expandEventsForRange([recurringEvent], exceptions, rangeStart, rangeEnd);
    expect(expanded).toHaveLength(1);
    expect(expanded[0].title).toBe("Special All-Hands Planning");
    expect(expanded[0].startTime).toBe("14:00");
    expect(expanded[0].isException).toBe(true);
  });
});
