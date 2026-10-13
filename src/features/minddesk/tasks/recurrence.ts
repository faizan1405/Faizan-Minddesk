import type { RecurrenceRule, TaskItem } from "../types";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parses a date representation into a local midnight Date.
 * Handles "YYYY-MM-DD", "Today", "Tomorrow", "Yesterday", and general date strings.
 */
export function parseLocalDate(input: string): Date {
  const now = new Date();
  const trimmed = input.trim().toLowerCase();

  if (trimmed === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (trimmed === "tomorrow") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  if (trimmed === "yesterday") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  }

  // Check YYYY-MM-DD
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]!, 10);
    const month = parseInt(isoMatch[2]!, 10) - 1;
    const day = parseInt(isoMatch[3]!, 10);
    return new Date(year, month, day);
  }

  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Formats a Date object to YYYY-MM-DD using local timezone.
 */
export function formatLocalDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the next occurrence date for a recurring task.
 * Handles month-end clamp (e.g. Jan 31 -> Feb 28/29), leap years, and daylight savings.
 */
export function getNextOccurrenceDate(
  baseDateString: string,
  rule: RecurrenceRule
): string | null {
  const baseDate = parseLocalDate(baseDateString);
  const interval = Math.max(1, rule.interval ?? 1);
  const next = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  switch (rule.frequency) {
    case "daily": {
      next.setDate(next.getDate() + interval);
      break;
    }

    case "weekdays": {
      // Advance to the next weekday (Mon-Fri)
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      break;
    }

    case "weekly": {
      if (Array.isArray(rule.weekdays) && rule.weekdays.length > 0) {
        const sortedDays = [...rule.weekdays].sort((a, b) => a - b);
        const currentDayOfWeek = next.getDay();
        const nextDay = sortedDays.find((d) => d > currentDayOfWeek);

        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDayOfWeek));
        } else {
          // Wrap to first weekday of next recurrence cycle
          const firstDay = sortedDays[0]!;
          const daysUntilEndOfWeek = 7 - currentDayOfWeek;
          const jumpDays =
            daysUntilEndOfWeek + (interval - 1) * 7 + firstDay;
          next.setDate(next.getDate() + jumpDays);
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;
    }

    case "monthly": {
      const originalDay = rule.monthDay ?? baseDate.getDate();
      const totalMonths = baseDate.getFullYear() * 12 + baseDate.getMonth() + interval;
      const targetYear = Math.floor(totalMonths / 12);
      const normalizedMonth = totalMonths % 12;

      const maxDaysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const safeDay = Math.min(originalDay, maxDaysInTargetMonth);

      const target = new Date(targetYear, normalizedMonth, safeDay);
      next.setTime(target.getTime());
      break;
    }

    case "yearly": {
      const originalMonth = baseDate.getMonth();
      const originalDay = rule.monthDay ?? baseDate.getDate();
      const targetYear = baseDate.getFullYear() + interval;

      const maxDays = new Date(targetYear, originalMonth + 1, 0).getDate();
      const safeDay = Math.min(originalDay, maxDays);

      const target = new Date(targetYear, originalMonth, safeDay);
      next.setTime(target.getTime());
      break;
    }

    case "custom": {
      next.setDate(next.getDate() + interval);
      break;
    }

    default:
      next.setDate(next.getDate() + 1);
  }

  const nextIso = formatLocalDateToISO(next);

  // Check end date bound
  if (rule.endDate && !rule.neverEnds) {
    const endBoundary = formatLocalDateToISO(parseLocalDate(rule.endDate));
    if (nextIso > endBoundary) {
      return null;
    }
  }

  return nextIso;
}

/**
 * Handles completion of a task, creating next occurrence if recurring
 * and avoiding duplicate active tasks for the same series.
 */
export function handleTaskCompletion(
  task: TaskItem,
  allTasks: TaskItem[]
): {
  updatedCurrent: TaskItem;
  nextOccurrence: TaskItem | null;
} {
  const isCompleting = !task.complete;
  const updatedCurrent: TaskItem = {
    ...task,
    complete: isCompleting,
    completedAt: isCompleting ? new Date().toISOString() : undefined,
  };

  if (!isCompleting || !task.recurrence) {
    return { updatedCurrent, nextOccurrence: null };
  }

  const seriesId = task.recurringSeriesId || task.id;
  // Ensure the completed task retains the series id
  updatedCurrent.recurringSeriesId = seriesId;

  // Prevent duplicate: check if an active task for this series already exists
  const existingActive = allTasks.find(
    (t) =>
      t.id !== task.id &&
      t.recurringSeriesId === seriesId &&
      !t.complete
  );

  if (existingActive) {
    return { updatedCurrent, nextOccurrence: null };
  }

  const nextDate = getNextOccurrenceDate(task.due, task.recurrence);
  if (!nextDate) {
    return { updatedCurrent, nextOccurrence: null };
  }

  const nextOccurrence: TaskItem = {
    ...task,
    id: crypto.randomUUID(),
    title: task.title,
    note: task.note,
    listId: task.listId,
    projectId: task.projectId,
    due: nextDate,
    dueTime: task.dueTime,
    priority: task.priority,
    complete: false,
    completedAt: undefined,
    starred: task.starred,
    order: 0,
    recurrence: task.recurrence,
    recurringSeriesId: seriesId,
    // Under Google Tasks rules, recurring tasks do not inherit completed subtasks
    subtasks: [],
  };

  return { updatedCurrent, nextOccurrence };
}

/**
 * Formats a recurrence rule into friendly text for badges and tooltips.
 */
export function formatRecurrenceLabel(rule?: RecurrenceRule): string {
  if (!rule) return "Does not repeat";
  const interval = rule.interval ?? 1;

  switch (rule.frequency) {
    case "daily":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    case "weekdays":
      return "Every weekday (Mon–Fri)";
    case "weekly":
      if (rule.weekdays && rule.weekdays.length > 0) {
        const days = rule.weekdays.map((d) => WEEKDAY_NAMES[d]).join(", ");
        return interval === 1 ? `Every week on ${days}` : `Every ${interval} weeks on ${days}`;
      }
      return interval === 1 ? "Every week" : `Every ${interval} weeks`;
    case "monthly":
      return interval === 1 ? "Every month" : `Every ${interval} months`;
    case "yearly":
      return interval === 1 ? "Every year" : `Every ${interval} years`;
    case "custom":
      return `Every ${interval} days`;
    default:
      return "Repeats";
  }
}
