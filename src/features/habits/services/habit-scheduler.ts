import {
  parseISO,
  format,
  isBefore,
  addDays,
  subDays,
  differenceInCalendarDays,
  getDay,
  getDate,
  getDaysInMonth,
} from "date-fns";
import type {
  Habit,
  HabitCompletion,
  HabitStreakStats,
} from "../types";

/**
 * Normalizes a Date or date string to YYYY-MM-DD in local timezone.
 */
export function toDateString(date: Date | string): string {
  if (typeof date === "string") {
    // If already in YYYY-MM-DD format, return trimmed
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    return format(parseISO(date), "yyyy-MM-dd");
  }
  return format(date, "yyyy-MM-dd");
}

/**
 * Checks whether a habit is scheduled on a given local calendar date (YYYY-MM-DD).
 * Correctly distinguishes unscheduled days from missed days.
 */
export function isHabitScheduledOnDate(
  habit: Habit,
  dateStr: string
): boolean {
  if (habit.isArchived) return false;

  const targetDate = parseISO(dateStr);
  const startDate = parseISO(habit.startDate);

  // If date is before habit creation / start date, it is not scheduled
  if (isBefore(targetDate, startDate)) {
    return false;
  }

  // If paused, it is not scheduled
  if (habit.isPaused) {
    return false;
  }

  const schedule = habit.schedule;
  const dayOfWeek = getDay(targetDate); // 0 = Sun, 1 = Mon ... 6 = Sat
  const dayOfMonth = getDate(targetDate); // 1 - 31

  switch (schedule.frequency) {
    case "daily":
      return true;

    case "weekdays":
      // Mon (1) through Fri (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case "specific_days":
      if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0) {
        return schedule.daysOfWeek.includes(dayOfWeek);
      }
      return true;

    case "every_n_days": {
      const interval = Math.max(1, schedule.interval || 1);
      const diffDays = differenceInCalendarDays(targetDate, startDate);
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case "monthly": {
      const targetDay = schedule.dayOfMonth || getDate(startDate);
      const daysInThisMonth = getDaysInMonth(targetDate);
      const clampedTargetDay = Math.min(targetDay, daysInThisMonth);
      return dayOfMonth === clampedTargetDay;
    }

    case "times_per_week": {
      // For flexible N times per week, any day is an eligible candidate day.
      // If target already reached in this week, additional days are still eligible.
      return true;
    }

    default:
      return true;
  }
}

/**
 * Retrieves a completion record for a specific habit and date.
 */
export function getHabitCompletionOnDate(
  habitId: string,
  dateStr: string,
  completions: HabitCompletion[]
): HabitCompletion | undefined {
  return completions.find(
    (c) => c.habitId === habitId && c.date === dateStr
  );
}

/**
 * Calculates genuine streaks and consistency stats for a habit.
 *
 * STREAK RULES:
 * 1. Current streak counts consecutive scheduled days completed or explicitly skipped.
 * 2. An explicit skip acts as a "Streak Freeze" (protects streak from breaking, but does not increment count).
 * 3. Unscheduled days NEVER break a streak.
 * 4. Future dates NEVER count as missed.
 * 5. Today (if not completed yet) does NOT break the streak; user still has time to complete it.
 * 6. Repeated completions on the same day never inflate streaks (deduplicated by date).
 */
export function calculateHabitStreak(
  habit: Habit,
  completions: HabitCompletion[],
  refDateStr: string = format(new Date(), "yyyy-MM-dd")
): HabitStreakStats {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  const completionMap = new Map<string, HabitCompletion>();
  for (const c of habitCompletions) {
    completionMap.set(c.date, c);
  }

  const todayStr = refDateStr;
  const startDay = parseISO(habit.startDate);
  const todayDate = parseISO(todayStr);

  if (isBefore(todayDate, startDay)) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      completionRate: 0,
      weeklyConsistency: 0,
      monthlyConsistency: 0,
      totalScheduled: 0,
      totalSkipped: 0,
    };
  }

  // Generate list of all calendar dates from startDate up to today
  const totalDays = differenceInCalendarDays(todayDate, startDay);
  const scheduledDates: string[] = [];

  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(startDay, i);
    const dStr = format(d, "yyyy-MM-dd");
    if (isHabitScheduledOnDate(habit, dStr)) {
      scheduledDates.push(dStr);
    }
  }

  let totalCompletions = 0;
  let totalSkipped = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  for (const dStr of scheduledDates) {
    const record = completionMap.get(dStr);
    if (record?.completed) {
      tempStreak += 1;
      totalCompletions += 1;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else if (record?.skipped) {
      // Skipped occurrence protects streak without incrementing
      totalSkipped += 1;
    } else {
      // Missed scheduled day
      if (dStr !== todayStr) {
        tempStreak = 0;
      }
    }
  }

  // Calculate current streak walking backwards from today
  let currentStreak = 0;

  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    const dStr = scheduledDates[i];
    const record = completionMap.get(dStr);

    if (dStr === todayStr) {
      if (record?.completed) {
        currentStreak += 1;
      } else if (record?.skipped) {
        // Today is skipped, keep evaluating backwards
        continue;
      } else {
        // Today is not completed yet; does NOT break existing streak from yesterday
        continue;
      }
    } else {
      if (record?.completed) {
        currentStreak += 1;
      } else if (record?.skipped) {
        // Skipped protects streak, keep checking earlier days
        continue;
      } else {
        // First missed scheduled day stops current streak
        break;
      }
    }
  }

  // Longest streak must be at least current streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Completion rate
  const totalScheduled = scheduledDates.length;
  const completionRate =
    totalScheduled > 0
      ? Math.round((totalCompletions / totalScheduled) * 100)
      : 0;

  // Weekly consistency (last 28 days)
  const past28Days = scheduledDates.filter((dStr) => {
    const d = parseISO(dStr);
    return differenceInCalendarDays(todayDate, d) < 28;
  });
  const past28Completions = past28Days.filter(
    (dStr) => completionMap.get(dStr)?.completed
  ).length;
  const weeklyConsistency =
    past28Days.length > 0
      ? Math.round((past28Completions / past28Days.length) * 100)
      : completionRate;

  // Monthly consistency (last 90 days)
  const past90Days = scheduledDates.filter((dStr) => {
    const d = parseISO(dStr);
    return differenceInCalendarDays(todayDate, d) < 90;
  });
  const past90Completions = past90Days.filter(
    (dStr) => completionMap.get(dStr)?.completed
  ).length;
  const monthlyConsistency =
    past90Days.length > 0
      ? Math.round((past90Completions / past90Days.length) * 100)
      : completionRate;

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    weeklyConsistency,
    monthlyConsistency,
    totalScheduled,
    totalSkipped,
  };
}

export interface DayHeatmapEntry {
  date: string;
  totalScheduled: number;
  totalCompleted: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0=none, 1=1-33%, 2=34-66%, 3=67-99%, 4=100%
  completedHabitNames: string[];
  pendingHabitNames: string[];
}

/**
 * Builds real stored contribution heatmap data for a given date range.
 * Supports aggregate (all active habits) or single habit view.
 */
export function buildHeatmapData(
  habits: Habit[],
  completions: HabitCompletion[],
  numDays: number = 90,
  referenceDateStr: string = format(new Date(), "yyyy-MM-dd"),
  filterHabitId?: string
): DayHeatmapEntry[] {
  const refDate = parseISO(referenceDateStr);
  const activeHabits = filterHabitId
    ? habits.filter((h) => h.id === filterHabitId)
    : habits.filter((h) => !h.isArchived);

  const results: DayHeatmapEntry[] = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const d = subDays(refDate, i);
    const dateStr = format(d, "yyyy-MM-dd");

    const scheduledToday = activeHabits.filter((h) =>
      isHabitScheduledOnDate(h, dateStr)
    );

    const completedHabitNames: string[] = [];
    const pendingHabitNames: string[] = [];

    for (const h of scheduledToday) {
      const completion = completions.find(
        (c) => c.habitId === h.id && c.date === dateStr
      );
      if (completion?.completed) {
        completedHabitNames.push(h.name);
      } else {
        pendingHabitNames.push(h.name);
      }
    }

    const totalScheduled = scheduledToday.length;
    const totalCompleted = completedHabitNames.length;

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (totalScheduled > 0 && totalCompleted > 0) {
      const pct = (totalCompleted / totalScheduled) * 100;
      if (pct === 100) intensity = 4;
      else if (pct >= 67) intensity = 3;
      else if (pct >= 34) intensity = 2;
      else intensity = 1;
    }

    results.push({
      date: dateStr,
      totalScheduled,
      totalCompleted,
      intensity,
      completedHabitNames,
      pendingHabitNames,
    });
  }

  return results;
}
