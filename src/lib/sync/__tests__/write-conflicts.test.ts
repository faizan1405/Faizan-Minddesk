import { describe, expect, it } from "vitest";
import {
  reconcileProfilePreferences,
  type SaveDeskDataOptions,
} from "../sync-repository";
import type { ProfilePreferencesJson } from "@/features/auth/types";
import type { DeskData } from "@/features/minddesk/types";

describe("Milestone 1 — Task 4: Cross-Device Write Conflicts on Profile.preferences", () => {
  const initialPrefs: ProfilePreferencesJson = {
    _version: 1,
    _updatedAt: "2026-10-13T10:00:00.000Z",
    theme: "light",
    calendar: {
      events: [
        {
          id: "evt-standup",
          title: "Daily Standup",
          date: "2026-10-14",
          startTime: "09:30",
          endTime: "10:00",
          color: "blue",
        },
      ],
      categories: [],
      exceptions: [],
    },
    planner: {
      scheduledBlocks: [],
      dailyPlans: {
        "2026-10-14": {
          date: "2026-10-14",
          topThreeTaskIds: ["task-a", "task-b"],
        },
      },
    },
    habits: {
      habits: [
        {
          id: "habit-water",
          name: "Drink 2L Water",
          targetDays: 7,
          category: "health",
          period: "daily",
        },
      ],
      habitCompletions: [
        {
          id: "comp-1",
          habitId: "habit-water",
          date: "2026-10-13",
          completed: true,
        },
      ],
      habitProgressLogs: [],
    },
    routines: {
      routines: [],
      routineSessions: [],
    },
    notifications: {
      notifications: [],
    },
  };

  it("INVESTIGATION: demonstrates that naive object replacement destroys concurrent writes", () => {
    // Session A loads initialPrefs at 10:00
    // Session B loads initialPrefs at 10:00

    // Session A modifies habits at 10:01
    const sessionAHabits = [
      ...initialPrefs.habits!.habits!,
      {
        id: "habit-reading",
        name: "Read 20 mins",
        targetDays: 5,
        category: "learning",
        period: "daily" as const,
      },
    ];

    // Naive server update for Session A:
    const serverPrefs: ProfilePreferencesJson = {
      ...initialPrefs,
      habits: {
        ...initialPrefs.habits,
        habits: sessionAHabits,
      },
    };
    expect(serverPrefs.habits?.habits?.length).toBe(2);

    // Session B (which still has initialPrefs with 1 habit) modifies calendar at 10:02
    const sessionBEvents = [
      ...initialPrefs.calendar!.events!,
      {
        id: "evt-doctor",
        title: "Doctor Appointment",
        date: "2026-10-15",
        startTime: "14:00",
        endTime: "15:00",
        color: "amber",
      },
    ];

    // NAIVE write from Session B sends its whole snapshot, including its stale habits (length 1):
    const naiveWriteB: ProfilePreferencesJson = {
      ...serverPrefs,
      calendar: {
        ...serverPrefs.calendar,
        events: sessionBEvents,
      },
      habits: {
        ...serverPrefs.habits,
        habits: initialPrefs.habits!.habits!, // Stale habits from Session B!
      },
    };

    // Demonstrates data loss: Session A's newly added habit was completely wiped out!
    expect(naiveWriteB.habits?.habits?.length).toBe(1);
    expect(naiveWriteB.habits?.habits?.some((h) => h.id === "habit-reading")).toBe(false);
  });

  it("RECONCILIATION: targeted conflict-control strategy preserves both Session A's and Session B's concurrent writes", () => {
    // Both sessions read serverPrefs at version 1
    const serverState = { ...initialPrefs };

    // Step 1: Session A writes at version 1, adding habit "habit-reading"
    const sessionAData: Partial<DeskData> = {
      habits: [
        ...serverState.habits!.habits!,
        {
          id: "habit-reading",
          name: "Read 20 mins",
          targetDays: 5,
          category: "learning",
          period: "daily",
        },
      ],
    };
    const step1 = reconcileProfilePreferences(serverState, sessionAData, {
      clientPreferencesVersion: 1,
    });

    expect(step1.conflictReconciled).toBe(false);
    expect(step1.preferencesVersion).toBe(2);
    expect(step1.preferences.habits?.habits?.length).toBe(2);

    // Step 2: Session B writes at version 1 (concurrent conflict!), adding event "evt-doctor"
    const sessionBData: Partial<DeskData> = {
      // Session B still holds stale habits (only 1 habit)
      habits: initialPrefs.habits!.habits!,
      // But Session B adds a new calendar event
      events: [
        ...initialPrefs.calendar!.events!,
        {
          id: "evt-doctor",
          title: "Doctor Appointment",
          date: "2026-10-15",
          startTime: "14:00",
          endTime: "15:00",
          color: "amber",
        },
      ],
    };

    const step2 = reconcileProfilePreferences(step1.preferences, sessionBData, {
      clientPreferencesVersion: 1, // Stale base version from Session B!
    });

    // Conflict was successfully detected and reconciled
    expect(step2.conflictReconciled).toBe(true);
    expect(step2.preferencesVersion).toBe(3);

    // ZERO DATA LOSS:
    // 1. Session A's habit is PRESERVED!
    const reconciledHabitIds = step2.preferences.habits?.habits?.map((h) => h.id);
    expect(reconciledHabitIds).toContain("habit-water");
    expect(reconciledHabitIds).toContain("habit-reading");

    // 2. Session B's calendar event was ADDED!
    const reconciledEventIds = step2.preferences.calendar?.events?.map((e) => e.id);
    expect(reconciledEventIds).toContain("evt-standup");
    expect(reconciledEventIds).toContain("evt-doctor");
  });

  it("RECONCILIATION: merges daily plans across different dates without overwriting", () => {
    const serverPrefs = { ...initialPrefs };

    // Session A plans for 2026-10-15
    const step1 = reconcileProfilePreferences(
      serverPrefs,
      {
        dailyPlans: {
          "2026-10-14": { date: "2026-10-14", topThreeTaskIds: ["task-a", "task-b"] },
          "2026-10-15": { date: "2026-10-15", topThreeTaskIds: ["task-c"] },
        },
      },
      { clientPreferencesVersion: 1 }
    );
    expect(step1.preferencesVersion).toBe(2);

    // Session B concurrently plans for 2026-10-16 from stale version 1
    const step2 = reconcileProfilePreferences(
      step1.preferences,
      {
        dailyPlans: {
          "2026-10-14": { date: "2026-10-14", topThreeTaskIds: ["task-a", "task-b"] },
          "2026-10-16": { date: "2026-10-16", topThreeTaskIds: ["task-d"] },
        },
      },
      { clientPreferencesVersion: 1 }
    );
    expect(step2.conflictReconciled).toBe(true);

    // Both dates 2026-10-15 AND 2026-10-16 are preserved in dailyPlans!
    const planDates = Object.keys(step2.preferences.planner?.dailyPlans || {});
    expect(planDates).toContain("2026-10-14");
    expect(planDates).toContain("2026-10-15");
    expect(planDates).toContain("2026-10-16");
  });

  it("RECONCILIATION: respects explicit item deletions and does not resurrect deleted items", () => {
    // Current server has 2 habits
    const serverPrefs: ProfilePreferencesJson = {
      ...initialPrefs,
      _version: 2,
      habits: {
        habits: [
          { id: "habit-water", name: "Drink 2L Water", targetDays: 7, category: "health", period: "daily" },
          { id: "habit-workout", name: "Workout", targetDays: 3, category: "fitness", period: "daily" },
        ],
      },
    };

    // Client at version 1 explicitly deletes "habit-water"
    const options: SaveDeskDataOptions = {
      clientPreferencesVersion: 1,
      deletedHabitIds: ["habit-water"],
    };

    const reconciled = reconcileProfilePreferences(
      serverPrefs,
      { habits: [] },
      options
    );

    const habitIds = reconciled.preferences.habits?.habits?.map((h) => h.id);
    expect(habitIds).not.toContain("habit-water");
    expect(habitIds).toContain("habit-workout");
  });
});
