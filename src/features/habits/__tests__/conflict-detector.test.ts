import { describe, expect, it } from "vitest";
import { checkScheduleConflict } from "../services/conflict-detector";
import type { CalendarEvent, ScheduledTaskBlock } from "@/features/calendar/types";

describe("Schedule Conflict Detector (Phase 7)", () => {
  const sampleEvents: CalendarEvent[] = [
    {
      id: "event-1",
      title: "Team Standup",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "09:00",
      endTime: "10:00",
      allDay: false,
      categoryId: "cat-1",
      customColor: "blue",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    {
      id: "event-2",
      title: "Client Presentation",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "14:00",
      endTime: "15:30",
      allDay: false,
      categoryId: "cat-1",
      customColor: "emerald",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ];

  const sampleBlocks: ScheduledTaskBlock[] = [
    {
      id: "block-1",
      taskId: "task-1",
      title: "Deep Work: Coding",
      date: "2026-10-15",
      startTime: "10:30",
      endTime: "12:00",
      durationMinutes: 90,
      completed: false,
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  ];

  it("detects no conflict when proposed slot is completely free", () => {
    // 12:00 to 13:00 has no events or blocks
    const result = checkScheduleConflict("2026-10-15", "12:00", 60, sampleEvents, sampleBlocks);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.suggestedStartTime).toBe("12:00");
  });

  it("detects conflict with an overlapping calendar event and provides alternative", () => {
    // Proposed 09:30 to 10:30 overlaps with Team Standup (09:00 - 10:00)
    const result = checkScheduleConflict("2026-10-15", "09:30", 60, sampleEvents, sampleBlocks);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].title).toBe("Team Standup");
    expect(result.conflicts[0].sourceType).toBe("event");
    // Suggested time should be an available free slot
    expect(result.suggestedStartTime).toBeDefined();
    expect(result.suggestedStartTime).not.toBe("09:30");
  });

  it("detects conflict with an overlapping scheduled task block", () => {
    // Proposed 11:00 to 11:45 overlaps with block-1 (10:30 - 12:00)
    const result = checkScheduleConflict("2026-10-15", "11:00", 45, sampleEvents, sampleBlocks);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].title).toBe("Deep Work: Coding");
    expect(result.conflicts[0].sourceType).toBe("block");
  });

  it("ignores self when excludeBlockId is specified", () => {
    // Proposed 10:30 to 12:00 matches block-1, but block-1 is being updated
    const result = checkScheduleConflict(
      "2026-10-15",
      "10:30",
      90,
      sampleEvents,
      sampleBlocks,
      "block-1"
    );
    expect(result.hasConflict).toBe(false);
  });

  it("ignores allDay events without specific time ranges", () => {
    const allDayEvents: CalendarEvent[] = [
      {
        id: "all-day-1",
        title: "Company Holiday",
        startDate: "2026-10-15",
        endDate: "2026-10-15",
        allDay: true,
        categoryId: "cat-1",
        customColor: "amber",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    const result = checkScheduleConflict("2026-10-15", "10:00", 60, allDayEvents, []);
    expect(result.hasConflict).toBe(false);
  });
});
