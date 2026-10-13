import { describe, expect, it } from "vitest";
import {
  formatRecurrenceLabel,
  getNextOccurrenceDate,
  handleTaskCompletion,
} from "../recurrence";
import type { TaskItem } from "../../types";

describe("Recurrence Engine", () => {
  it("computes next daily occurrence correctly", () => {
    const next = getNextOccurrenceDate("2026-05-10", {
      frequency: "daily",
      interval: 1,
    });
    expect(next).toBe("2026-05-11");

    const next3 = getNextOccurrenceDate("2026-05-10", {
      frequency: "daily",
      interval: 3,
    });
    expect(next3).toBe("2026-05-13");
  });

  it("computes next weekday occurrence skipping weekends", () => {
    // 2026-05-15 is a Friday
    const nextFromFriday = getNextOccurrenceDate("2026-05-15", {
      frequency: "weekdays",
    });
    // Next weekday must be Monday 2026-05-18
    expect(nextFromFriday).toBe("2026-05-18");

    // 2026-05-18 is Monday, next must be Tuesday 2026-05-19
    const nextFromMonday = getNextOccurrenceDate("2026-05-18", {
      frequency: "weekdays",
    });
    expect(nextFromMonday).toBe("2026-05-19");
  });

  it("computes weekly occurrence with specific days of week", () => {
    // 2026-05-11 is Monday (day 1). Target weekdays: Mon (1), Wed (3), Fri (5)
    const nextWed = getNextOccurrenceDate("2026-05-11", {
      frequency: "weekly",
      weekdays: [1, 3, 5],
    });
    expect(nextWed).toBe("2026-05-13"); // Wednesday

    // From Friday (day 5), next must jump to following Monday 2026-05-18
    const nextMon = getNextOccurrenceDate("2026-05-15", {
      frequency: "weekly",
      weekdays: [1, 3, 5],
    });
    expect(nextMon).toBe("2026-05-18");
  });

  it("handles month-end safe clamping (Jan 31 -> Feb 28 in non-leap year)", () => {
    // 2027 is a non-leap year. Jan 31 -> Feb 28
    const nextFeb = getNextOccurrenceDate("2027-01-31", {
      frequency: "monthly",
      interval: 1,
      monthDay: 31,
    });
    expect(nextFeb).toBe("2027-02-28");

    // Aug 31 -> Sep 30
    const nextSep = getNextOccurrenceDate("2026-08-31", {
      frequency: "monthly",
      interval: 1,
      monthDay: 31,
    });
    expect(nextSep).toBe("2026-09-30");
  });

  it("respects endDate boundary", () => {
    const expired = getNextOccurrenceDate("2026-06-30", {
      frequency: "daily",
      endDate: "2026-06-30",
    });
    expect(expired).toBeNull();
  });

  it("handles completion and generates next occurrence with matching series id", () => {
    const task: TaskItem = {
      id: "task-rec-1",
      listId: "list-routine",
      title: "Daily Standup Preparation",
      note: "Review sprint board",
      due: "2026-10-15",
      priority: "medium",
      complete: false,
      starred: true,
      order: 0,
      subtasks: [],
      recurrence: {
        frequency: "daily",
        interval: 1,
      },
    };

    const { updatedCurrent, nextOccurrence } = handleTaskCompletion(task, [task]);
    expect(updatedCurrent.complete).toBe(true);
    expect(updatedCurrent.completedAt).toBeDefined();
    expect(updatedCurrent.recurringSeriesId).toBe("task-rec-1");

    expect(nextOccurrence).not.toBeNull();
    expect(nextOccurrence?.complete).toBe(false);
    expect(nextOccurrence?.recurringSeriesId).toBe("task-rec-1");
    expect(nextOccurrence?.due).toBe("2026-10-16");
    expect(nextOccurrence?.title).toBe("Daily Standup Preparation");
  });

  it("prevents duplicate active occurrences for the same recurring series", () => {
    const activeTask: TaskItem = {
      id: "task-rec-active",
      listId: "list-routine",
      title: "Daily Walk",
      note: "",
      due: "2026-10-16",
      priority: "low",
      complete: false,
      starred: false,
      order: 0,
      subtasks: [],
      recurringSeriesId: "series-walk-123",
      recurrence: { frequency: "daily" },
    };

    const oldTask: TaskItem = {
      id: "task-rec-old",
      listId: "list-routine",
      title: "Daily Walk",
      note: "",
      due: "2026-10-15",
      priority: "low",
      complete: false,
      starred: false,
      order: 1,
      subtasks: [],
      recurringSeriesId: "series-walk-123",
      recurrence: { frequency: "daily" },
    };

    // When completing oldTask, but activeTask already exists in the list for this series:
    const { nextOccurrence } = handleTaskCompletion(oldTask, [activeTask, oldTask]);
    expect(nextOccurrence).toBeNull();
  });

  it("formats user-friendly recurrence labels", () => {
    expect(formatRecurrenceLabel({ frequency: "daily" })).toBe("Every day");
    expect(formatRecurrenceLabel({ frequency: "daily", interval: 2 })).toBe("Every 2 days");
    expect(formatRecurrenceLabel({ frequency: "weekdays" })).toBe("Every weekday (Mon–Fri)");
    expect(formatRecurrenceLabel({ frequency: "monthly" })).toBe("Every month");
    expect(formatRecurrenceLabel({ frequency: "yearly" })).toBe("Every year");
  });
});
