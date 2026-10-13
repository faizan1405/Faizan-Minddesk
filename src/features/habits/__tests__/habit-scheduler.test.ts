import { describe, expect, it } from "vitest";
import {
  isHabitScheduledOnDate,
  calculateHabitStreak,
  buildHeatmapData,
  toDateString,
} from "../services/habit-scheduler";
import type { Habit, HabitCompletion } from "../types";

describe("Habit Scheduler & Streaks (Phase 7)", () => {
  const baseHabit: Habit = {
    id: "habit-1",
    name: "Morning Run",
    description: "Run 5km every morning",
    category: "Health & Fitness",
    color: "emerald",
    emoji: "🏃",
    type: "checkbox",
    schedule: {
      frequency: "daily",
    },
    startDate: "2026-10-01",
    isPaused: false,
    isArchived: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };

  describe("isHabitScheduledOnDate", () => {
    it("returns false for dates before habit start date", () => {
      expect(isHabitScheduledOnDate(baseHabit, "2026-09-30")).toBe(false);
    });

    it("returns false if habit is paused or archived", () => {
      expect(isHabitScheduledOnDate({ ...baseHabit, isPaused: true }, "2026-10-05")).toBe(false);
      expect(isHabitScheduledOnDate({ ...baseHabit, isArchived: true }, "2026-10-05")).toBe(false);
    });

    it("evaluates daily schedule correctly", () => {
      expect(isHabitScheduledOnDate(baseHabit, "2026-10-01")).toBe(true);
      expect(isHabitScheduledOnDate(baseHabit, "2026-10-02")).toBe(true);
      expect(isHabitScheduledOnDate(baseHabit, "2026-10-03")).toBe(true);
    });

    it("evaluates weekdays schedule correctly (Mon-Fri only)", () => {
      const weekdaysHabit: Habit = {
        ...baseHabit,
        schedule: { frequency: "weekdays" },
        startDate: "2026-10-05", // Monday
      };

      // 2026-10-05 = Monday
      expect(isHabitScheduledOnDate(weekdaysHabit, "2026-10-05")).toBe(true);
      // 2026-10-09 = Friday
      expect(isHabitScheduledOnDate(weekdaysHabit, "2026-10-09")).toBe(true);
      // 2026-10-10 = Saturday
      expect(isHabitScheduledOnDate(weekdaysHabit, "2026-10-10")).toBe(false);
      // 2026-10-11 = Sunday
      expect(isHabitScheduledOnDate(weekdaysHabit, "2026-10-11")).toBe(false);
    });

    it("evaluates specific days of week schedule correctly", () => {
      const specificHabit: Habit = {
        ...baseHabit,
        schedule: {
          frequency: "specific_days",
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        },
        startDate: "2026-10-05", // Monday
      };

      expect(isHabitScheduledOnDate(specificHabit, "2026-10-05")).toBe(true); // Mon
      expect(isHabitScheduledOnDate(specificHabit, "2026-10-06")).toBe(false); // Tue
      expect(isHabitScheduledOnDate(specificHabit, "2026-10-07")).toBe(true); // Wed
      expect(isHabitScheduledOnDate(specificHabit, "2026-10-08")).toBe(false); // Thu
      expect(isHabitScheduledOnDate(specificHabit, "2026-10-09")).toBe(true); // Fri
    });

    it("evaluates every_n_days schedule correctly", () => {
      const every3DaysHabit: Habit = {
        ...baseHabit,
        schedule: {
          frequency: "every_n_days",
          interval: 3,
        },
        startDate: "2026-10-01",
      };

      expect(isHabitScheduledOnDate(every3DaysHabit, "2026-10-01")).toBe(true); // day 0
      expect(isHabitScheduledOnDate(every3DaysHabit, "2026-10-02")).toBe(false); // day 1
      expect(isHabitScheduledOnDate(every3DaysHabit, "2026-10-03")).toBe(false); // day 2
      expect(isHabitScheduledOnDate(every3DaysHabit, "2026-10-04")).toBe(true); // day 3
      expect(isHabitScheduledOnDate(every3DaysHabit, "2026-10-07")).toBe(true); // day 6
    });

    it("evaluates monthly schedule with short month clamping", () => {
      const monthlyHabit: Habit = {
        ...baseHabit,
        schedule: {
          frequency: "monthly",
          dayOfMonth: 31,
        },
        startDate: "2026-01-01",
      };

      expect(isHabitScheduledOnDate(monthlyHabit, "2026-01-31")).toBe(true);
      // February 2026 has 28 days; day 31 clamps to Feb 28
      expect(isHabitScheduledOnDate(monthlyHabit, "2026-02-28")).toBe(true);
      expect(isHabitScheduledOnDate(monthlyHabit, "2026-02-27")).toBe(false);
      // April 2026 has 30 days; clamps to Apr 30
      expect(isHabitScheduledOnDate(monthlyHabit, "2026-04-30")).toBe(true);
    });
  });

  describe("calculateHabitStreak", () => {
    it("returns zero stats when reference date is before start date", () => {
      const stats = calculateHabitStreak(baseHabit, [], "2026-09-20");
      expect(stats.currentStreak).toBe(0);
      expect(stats.totalCompletions).toBe(0);
    });

    it("calculates active streak for continuous completed daily habit", () => {
      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" },
        { id: "c2", habitId: "habit-1", date: "2026-10-02", completed: true, completedAt: "2026-10-02T10:00:00Z" },
        { id: "c3", habitId: "habit-1", date: "2026-10-03", completed: true, completedAt: "2026-10-03T10:00:00Z" },
      ];

      const stats = calculateHabitStreak(baseHabit, completions, "2026-10-03");
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
      expect(stats.totalCompletions).toBe(3);
      expect(stats.completionRate).toBe(100);
    });

    it("does not break streak if today is not completed yet", () => {
      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" },
        { id: "c2", habitId: "habit-1", date: "2026-10-02", completed: true, completedAt: "2026-10-02T10:00:00Z" },
      ];

      // Reference date is 2026-10-03 (today), not completed yet
      const stats = calculateHabitStreak(baseHabit, completions, "2026-10-03");
      expect(stats.currentStreak).toBe(2);
      expect(stats.longestStreak).toBe(2);
    });

    it("resets current streak when a past scheduled day was missed", () => {
      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" },
        // Missed 2026-10-02
        { id: "c3", habitId: "habit-1", date: "2026-10-03", completed: true, completedAt: "2026-10-03T10:00:00Z" },
      ];

      const stats = calculateHabitStreak(baseHabit, completions, "2026-10-03");
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(1);
      expect(stats.totalCompletions).toBe(2);
    });

    it("preserves streak across unscheduled days (e.g. weekdays habit over weekend)", () => {
      const weekdaysHabit: Habit = {
        ...baseHabit,
        schedule: { frequency: "weekdays" },
        startDate: "2026-10-01", // Thursday
      };

      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" }, // Thu
        { id: "c2", habitId: "habit-1", date: "2026-10-02", completed: true, completedAt: "2026-10-02T10:00:00Z" }, // Fri
        // Sat (10-03) and Sun (10-04) are unscheduled days
        { id: "c3", habitId: "habit-1", date: "2026-10-05", completed: true, completedAt: "2026-10-05T10:00:00Z" }, // Mon
      ];

      const stats = calculateHabitStreak(weekdaysHabit, completions, "2026-10-05");
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
    });

    it("uses skip as streak freeze: protects streak without incrementing", () => {
      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" },
        // Skipped on 2026-10-02 (streak freeze)
        { id: "c2", habitId: "habit-1", date: "2026-10-02", completed: false, skipped: true },
        { id: "c3", habitId: "habit-1", date: "2026-10-03", completed: true, completedAt: "2026-10-03T10:00:00Z" },
      ];

      const stats = calculateHabitStreak(baseHabit, completions, "2026-10-03");
      // Current streak: 2 completed days (skipped protected it from resetting to 1)
      expect(stats.currentStreak).toBe(2);
      expect(stats.totalSkipped).toBe(1);
      expect(stats.totalCompletions).toBe(2);
    });

    it("does not inflate streak with duplicate completion entries for same date", () => {
      const completions: HabitCompletion[] = [
        { id: "c1", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T10:00:00Z" },
        // Duplicate entry for same date
        { id: "c1-dup", habitId: "habit-1", date: "2026-10-01", completed: true, completedAt: "2026-10-01T12:00:00Z" },
      ];

      const stats = calculateHabitStreak(baseHabit, completions, "2026-10-01");
      expect(stats.currentStreak).toBe(1);
      expect(stats.totalCompletions).toBe(1);
    });
  });

  describe("buildHeatmapData", () => {
    it("generates correct heatmap days with intensity levels", () => {
      const habitA: Habit = { ...baseHabit, id: "h-a", name: "Habit A" };
      const habitB: Habit = { ...baseHabit, id: "h-b", name: "Habit B" };

      const completions: HabitCompletion[] = [
        // Day 2026-10-05: both completed -> 100% -> intensity 4
        { id: "c1", habitId: "h-a", date: "2026-10-05", completed: true, completedAt: "2026-10-05T10:00:00Z" },
        { id: "c2", habitId: "h-b", date: "2026-10-05", completed: true, completedAt: "2026-10-05T10:00:00Z" },
        // Day 2026-10-04: only 1 completed -> 50% -> intensity 2
        { id: "c3", habitId: "h-a", date: "2026-10-04", completed: true, completedAt: "2026-10-04T10:00:00Z" },
      ];

      const heatmap = buildHeatmapData([habitA, habitB], completions, 7, "2026-10-05");
      expect(heatmap).toHaveLength(7);

      const day5 = heatmap.find((d) => d.date === "2026-10-05");
      expect(day5).toBeDefined();
      expect(day5?.intensity).toBe(4);
      expect(day5?.totalCompleted).toBe(2);
      expect(day5?.completedHabitNames).toEqual(expect.arrayContaining(["Habit A", "Habit B"]));

      const day4 = heatmap.find((d) => d.date === "2026-10-04");
      expect(day4).toBeDefined();
      expect(day4?.intensity).toBe(2);
      expect(day4?.totalCompleted).toBe(1);
      expect(day4?.pendingHabitNames).toContain("Habit B");
    });
  });

  describe("toDateString utility", () => {
    it("handles both Date instances and ISO strings", () => {
      expect(toDateString("2026-10-15")).toBe("2026-10-15");
      expect(toDateString(new Date(2026, 9, 15))).toBe("2026-10-15");
    });
  });
});
