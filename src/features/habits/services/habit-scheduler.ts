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
  startOfWeek,
  endOfWeek,
} from "date-fns";
import type {
  Habit,
  HabitCompletion,
  HabitOccurrenceStatus,
  HabitStreakStats,
} from "../types";

/**
 * Normalizes a Date or date string to YYYY-MM-DD in local timezone.
 */
export function toDateString(date: Date | string): string {
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    return format(parseISO(date), "yyyy-MM-dd");
  }
  return format(date, "yyyy-MM-dd");
}

/**
 * Checks whether a habit is scheduled or eligible on a given local calendar date (YYYY-MM-DD).
 * Correctly preserves historical schedule prior to pausing and distinguishes
 * unscheduled days from missed days.
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

  // Check if date falls inside a paused period
  if (Array.isArray(habit.pausePeriods) && habit.pausePeriods.length > 0) {
    const isInsidePeriod = habit.pausePeriods.some((p) => {
      if (dateStr >= p.pausedAt) {
        if (!p.resumedAt || dateStr < p.resumedAt) {
          return true;
        }
      }
      return false;
    });
    if (isInsidePeriod) return false;
  } else if (habit.isPaused) {
    if (habit.pausedAt) {
      if (dateStr >= habit.pausedAt) return false;
    } else {
      // Legacy habit with isPaused: true without pausedAt
      return false;
    }
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
      // For flexible N times per week, any active day is an eligible candidate day.
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

export interface WeeklyHabitProgress {
  target: number;
  completedCount: number;
  skippedCount: number;
  isGoalMet: boolean;
  weekStart: string; // YYYY-MM-DD (ISO Monday)
  weekEnd: string; // YYYY-MM-DD (ISO Sunday)
}

/**
 * Calculates current weekly progress for flexible times_per_week habits.
 */
export function getWeeklyHabitProgress(
  habit: Habit,
  dateStr: string,
  completions: HabitCompletion[]
): WeeklyHabitProgress {
  const targetDate = parseISO(dateStr);
  const weekStartObj = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEndObj = endOfWeek(targetDate, { weekStartsOn: 1 });
  const weekStart = format(weekStartObj, "yyyy-MM-dd");
  const weekEnd = format(weekEndObj, "yyyy-MM-dd");

  const habitCompletions = completions.filter(
    (c) => c.habitId === habit.id && c.date >= weekStart && c.date <= weekEnd
  );

  const completedCount = habitCompletions.filter((c) => c.completed).length;
  const skippedCount = habitCompletions.filter((c) => c.skipped).length;
  const target = habit.schedule.timesPerWeek || 3;

  return {
    target,
    completedCount,
    skippedCount,
    isGoalMet: completedCount >= target,
    weekStart,
    weekEnd,
  };
}

/**
 * Evaluates occurrence status on a given date among the 5 distinct states:
 * Completed, Partially Completed, Pending, Missed, or Explicitly Skipped.
 */
export function getHabitOccurrenceStatus(
  habit: Habit,
  dateStr: string,
  completions: HabitCompletion[],
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): HabitOccurrenceStatus {
  if (!isHabitScheduledOnDate(habit, dateStr)) {
    return "unscheduled";
  }

  const completion = completions.find(
    (c) => c.habitId === habit.id && c.date === dateStr
  );

  if (completion?.completed) {
    return "completed";
  }

  if (completion?.skipped) {
    return "skipped";
  }

  const target = habit.target || 1;
  const currentVal = completion?.currentValue ?? 0;
  if (currentVal > 0 && currentVal < target) {
    return "partially_completed";
  }

  // Flexible weekly habit evaluation
  if (habit.schedule.frequency === "times_per_week") {
    const progress = getWeeklyHabitProgress(habit, dateStr, completions);
    if (progress.weekEnd < todayStr) {
      return progress.isGoalMet ? "completed" : "missed";
    }
    return "pending";
  }

  // Daily, weekdays, specific_days, every_n_days, monthly
  if (dateStr < todayStr) {
    return "missed";
  }

  return "pending";
}

/**
 * Calculates genuine streaks and consistency stats for a habit.
 *
 * STREAK RULES:
 * 1. Current streak counts consecutive scheduled occurrences completed.
 * 2. An explicit skip acts as a "Streak Freeze" (protects streak from breaking, but does not increment count).
 * 3. Unscheduled days and paused periods NEVER break a streak and are not counted as missed.
 * 4. Future dates NEVER count as missed.
 * 5. Today (if not completed yet) does NOT break the streak; user still has time to complete it.
 * 6. Repeated completions on the same day never inflate streaks (deduplicated by date).
 * 7. Flexible weekly frequency tracks weekly targets accurately (completing target = 100% weekly achievement).
 */
export function calculateHabitStreak(
  habit: Habit,
  completions: HabitCompletion[],
  refDateStr: string = format(new Date(), "yyyy-MM-dd")
): HabitStreakStats {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  const completionMap = new Map<string, HabitCompletion>();
  for (const c of habitCompletions) {
    if (!completionMap.has(c.date) || c.completed) {
      completionMap.set(c.date, c);
    }
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

  // CASE 1: Flexible Weekly Frequency (times_per_week)
  if (habit.schedule.frequency === "times_per_week") {
    const targetPerWeek = Math.max(1, habit.schedule.timesPerWeek || 3);
    const startWeek = startOfWeek(startDay, { weekStartsOn: 1 });
    const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });

    interface WeekBucket {
      startStr: string;
      endStr: string;
      completions: number;
      skips: number;
      isGoalMet: boolean;
      isCurrentWeek: boolean;
    }

    const weeks: WeekBucket[] = [];
    let iterWeek = startWeek;
    while (!isBefore(currentWeekStart, iterWeek)) {
      const wStartStr = format(iterWeek, "yyyy-MM-dd");
      const wEndStr = format(endOfWeek(iterWeek, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const isCurrent = wStartStr === format(currentWeekStart, "yyyy-MM-dd");

      let wComp = 0;
      let wSkip = 0;
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = addDays(iterWeek, dayOffset);
        const dayStr = format(dayDate, "yyyy-MM-dd");
        if (isBefore(dayDate, startDay)) continue;
        const record = completionMap.get(dayStr);
        if (record?.completed) wComp += 1;
        else if (record?.skipped) wSkip += 1;
      }

      weeks.push({
        startStr: wStartStr,
        endStr: wEndStr,
        completions: wComp,
        skips: wSkip,
        isGoalMet: wComp >= targetPerWeek,
        isCurrentWeek: isCurrent,
      });

      iterWeek = addDays(iterWeek, 7);
    }

    let totalCompletions = 0;
    let totalSkipped = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const w of weeks) {
      totalCompletions += w.completions;
      totalSkipped += w.skips;

      if (w.isGoalMet) {
        tempStreak += 1;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else if (w.skips > 0 && w.completions + w.skips >= targetPerWeek) {
        // Streak frozen for this week
      } else if (!w.isCurrentWeek) {
        tempStreak = 0;
      }
    }

    // Walking backwards for currentStreak
    let currentStreak = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      const w = weeks[i];
      if (w.isCurrentWeek) {
        if (w.isGoalMet) {
          currentStreak += 1;
        } else {
          // Current week in progress, do not break streak from previous weeks
          continue;
        }
      } else {
        if (w.isGoalMet) {
          currentStreak += 1;
        } else if (w.skips > 0 && w.completions + w.skips >= targetPerWeek) {
          // Frozen week, continue backwards
          continue;
        } else {
          break;
        }
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Weekly consistency (last 4 weeks)
    const recent4Weeks = weeks.slice(-4);
    const recent4Met = recent4Weeks.filter((w) => w.isGoalMet || (w.isCurrentWeek && w.completions >= Math.min(targetPerWeek, 1))).length;
    const weeklyConsistency = recent4Weeks.length > 0 ? Math.round((recent4Met / recent4Weeks.length) * 100) : 100;

    // Monthly consistency (last 12 weeks ~ 3 months)
    const recent12Weeks = weeks.slice(-12);
    const recent12Met = recent12Weeks.filter((w) => w.isGoalMet || (w.isCurrentWeek && w.completions >= Math.min(targetPerWeek, 1))).length;
    const monthlyConsistency = recent12Weeks.length > 0 ? Math.round((recent12Met / recent12Weeks.length) * 100) : 100;

    const totalScheduled = weeks.length * targetPerWeek;
    const completionRate = totalScheduled > 0 ? Math.min(100, Math.round((totalCompletions / totalScheduled) * 100)) : 100;

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

  // CASE 2: Standard Daily, Weekdays, Specific Days, Every N Days, Monthly
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
      totalSkipped += 1;
      // Streak freeze: does not increment streak, does not reset
    } else {
      if (dStr !== todayStr) {
        tempStreak = 0;
      }
    }
  }

  let currentStreak = 0;
  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    const dStr = scheduledDates[i];
    const record = completionMap.get(dStr);

    if (dStr === todayStr) {
      if (record?.completed) {
        currentStreak += 1;
      } else {
        // Today is pending or skipped: keep evaluating backwards, does not break streak
        continue;
      }
    } else {
      if (record?.completed) {
        currentStreak += 1;
      } else if (record?.skipped) {
        // Streak freeze: protect streak, keep evaluating earlier
        continue;
      } else {
        // First past missed scheduled day stops current streak
        break;
      }
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const totalScheduled = scheduledDates.length;
  const completionRate = totalScheduled > 0 ? Math.round((totalCompletions / totalScheduled) * 100) : 0;

  const past28Days = scheduledDates.filter((dStr) => {
    const d = parseISO(dStr);
    return differenceInCalendarDays(todayDate, d) < 28;
  });
  const past28Completions = past28Days.filter((dStr) => completionMap.get(dStr)?.completed).length;
  const weeklyConsistency = past28Days.length > 0 ? Math.round((past28Completions / past28Days.length) * 100) : completionRate;

  const past90Days = scheduledDates.filter((dStr) => {
    const d = parseISO(dStr);
    return differenceInCalendarDays(todayDate, d) < 90;
  });
  const past90Completions = past90Days.filter((dStr) => completionMap.get(dStr)?.completed).length;
  const monthlyConsistency = past90Days.length > 0 ? Math.round((past90Completions / past90Days.length) * 100) : completionRate;

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
  totalSkipped: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0=none, 1=1-33%, 2=34-66%, 3=67-99%, 4=100%
  completedHabitNames: string[];
  pendingHabitNames: string[];
  skippedHabitNames: string[];
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
    const skippedHabitNames: string[] = [];

    for (const h of scheduledToday) {
      const completion = completions.find(
        (c) => c.habitId === h.id && c.date === dateStr
      );
      if (completion?.completed) {
        completedHabitNames.push(h.name);
      } else if (completion?.skipped) {
        skippedHabitNames.push(h.name);
      } else {
        pendingHabitNames.push(h.name);
      }
    }

    const totalScheduled = scheduledToday.length;
    const totalCompleted = completedHabitNames.length;
    const totalSkipped = skippedHabitNames.length;

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
      totalSkipped,
      intensity,
      completedHabitNames,
      pendingHabitNames,
      skippedHabitNames,
    });
  }

  return results;
}
