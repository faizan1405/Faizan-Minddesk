import { describe, expect, it } from "vitest";
import {
  isWithinQuietHours,
  evaluateAllSmartReminders,
} from "../services/notification-scheduler";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types";
import type { NotificationPreferences, NotificationRecord } from "../types";
import type { CalendarEvent, PlannerTask } from "@/features/calendar/types";
import type { Habit, HabitCompletion } from "@/features/habits/types";

describe("Notification Scheduler & Smart Reminders (Phase 7)", () => {
  const basePrefs: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    enabled: true,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  };

  describe("isWithinQuietHours", () => {
    it("returns false if quiet hours are disabled", () => {
      const prefs = { ...basePrefs, quietHoursEnabled: false };
      const lateNight = new Date("2026-10-15T23:30:00");
      expect(isWithinQuietHours(prefs, lateNight)).toBe(false);
    });

    it("evaluates overnight quiet hours across midnight (22:00 to 07:00)", () => {
      const lateNight = new Date("2026-10-15T23:15:00");
      const earlyMorning = new Date("2026-10-15T05:45:00");
      const daytime = new Date("2026-10-15T14:30:00");

      expect(isWithinQuietHours(basePrefs, lateNight)).toBe(true);
      expect(isWithinQuietHours(basePrefs, earlyMorning)).toBe(true);
      expect(isWithinQuietHours(basePrefs, daytime)).toBe(false);
    });

    it("evaluates single-day quiet hours (e.g. 13:00 to 15:00)", () => {
      const prefs: NotificationPreferences = {
        ...basePrefs,
        quietHoursStart: "13:00",
        quietHoursEnd: "15:00",
      };

      const duringNap = new Date("2026-10-15T14:00:00");
      const afterNap = new Date("2026-10-15T16:00:00");

      expect(isWithinQuietHours(prefs, duringNap)).toBe(true);
      expect(isWithinQuietHours(prefs, afterNap)).toBe(false);
    });
  });

  describe("evaluateAllSmartReminders", () => {
    const fixedNow = new Date("2026-10-15T10:00:00");

    const sampleTaskDueSoon: PlannerTask = {
      id: "t-1",
      title: "Send Client Invoice",
      completed: false,
      isStarred: false,
      dueDate: "2026-10-15",
      dueTime: "10:10", // 10 minutes away
      priority: "high",
      createdAt: "2026-10-01T00:00:00Z",
    };

    const sampleTaskOverdue: PlannerTask = {
      id: "t-2",
      title: "File Monthly Tax Form",
      completed: false,
      isStarred: false,
      dueDate: "2026-10-10", // in the past
      priority: "high",
      createdAt: "2026-10-01T00:00:00Z",
    };

    const sampleEventUpcoming: CalendarEvent = {
      id: "ev-1",
      title: "Product Design Review",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "10:08", // 8 minutes away
      endTime: "11:00",
      allDay: false,
      categoryId: "cat-1",
      reminderMinutes: 10,
      customColor: "purple",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const sampleHabit: Habit = {
      id: "hab-1",
      name: "Mid-Morning Water Intake",
      category: "Health",
      color: "blue",
      emoji: "💧",
      type: "quantity",
      target: 8,
      unit: "glasses",
      schedule: { frequency: "daily" },
      startDate: "2026-10-01",
      preferredTime: "10:00",
      isPaused: false,
      isArchived: false,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const emptyParams = {
      tasks: [],
      events: [],
      scheduledBlocks: [],
      habits: [],
      habitCompletions: [],
      routines: [],
      routineSessions: [],
      preferences: basePrefs,
      existingNotifications: [],
      now: fixedNow,
    };

    it("returns empty array if notifications are globally disabled", () => {
      const disabledPrefs = { ...basePrefs, enabled: false };
      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        tasks: [sampleTaskDueSoon],
        preferences: disabledPrefs,
      });
      expect(notifs).toHaveLength(0);
    });

    it("suppresses notifications during quiet hours", () => {
      const nightTime = new Date("2026-10-15T23:30:00");
      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        tasks: [sampleTaskDueSoon],
        now: nightTime,
      });
      expect(notifs).toHaveLength(0);
    });

    it("generates task_due_soon and task_overdue alerts", () => {
      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        tasks: [sampleTaskDueSoon, sampleTaskOverdue],
      });

      expect(notifs.some((n) => n.type === "task_due_soon" && n.entityId === "t-1")).toBe(true);
      expect(notifs.some((n) => n.type === "task_overdue" && n.entityId === "t-2")).toBe(true);
    });

    it("generates calendar_upcoming alert for imminent event", () => {
      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        events: [sampleEventUpcoming],
      });

      expect(notifs.some((n) => n.type === "calendar_upcoming" && n.entityId === "ev-1")).toBe(true);
    });

    it("generates habit_scheduled alert near preferred time if not yet completed", () => {
      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        habits: [sampleHabit],
      });

      expect(notifs.some((n) => n.type === "habit_scheduled" && n.entityId === "hab-1")).toBe(true);
    });

    it("does not generate habit alert if habit is already completed today", () => {
      const completedRecord: HabitCompletion = {
        id: "c-1",
        habitId: "hab-1",
        date: "2026-10-15",
        completed: true,
        completedAt: "2026-10-15T09:30:00Z",
      };

      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        habits: [sampleHabit],
        habitCompletions: [completedRecord],
      });

      expect(notifs.some((n) => n.type === "habit_scheduled" && n.entityId === "hab-1")).toBe(false);
    });

    it("deduplicates alerts using dedupKey against existing notifications", () => {
      const existing: NotificationRecord[] = [
        {
          id: "existing-1",
          title: "Task Due Soon",
          message: "Existing alert",
          category: "tasks",
          type: "task_due_soon",
          timestamp: "2026-10-15T09:55:00Z",
          fireAt: "2026-10-15T09:55:00Z",
          read: false,
          dismissed: false,
          entityId: "t-1",
          dedupKey: "task-t-1-soon-2026-10-15",
        },
      ];

      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        tasks: [sampleTaskDueSoon],
        existingNotifications: existing,
      });

      expect(notifs.some((n) => n.entityId === "t-1")).toBe(false);
    });

    it("respects category disabling in preferences", () => {
      const disabledCategoryPrefs: NotificationPreferences = {
        ...basePrefs,
        categories: {
          ...basePrefs.categories,
          tasks: false,
        },
      };

      const notifs = evaluateAllSmartReminders({
        ...emptyParams,
        tasks: [sampleTaskDueSoon, sampleTaskOverdue],
        preferences: disabledCategoryPrefs,
      });

      expect(notifs).toHaveLength(0);
    });
  });
});
