import { CalendarEvent, ExpandedCalendarEvent, RecurrenceException, DayOfWeek } from "../types";
import {
  parseISO,
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  getDay,
  getDaysInMonth,
  setDate,
  setMonth,
  isValid,
} from "date-fns";

const DAY_MAP: Record<DayOfWeek, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/**
 * Expands recurring calendar events within a specified window [rangeStart, rangeEnd].
 * Handles recurrence rules, exception overrides, cancellations, and occurrence count limits.
 */
export function expandEventsForRange(
  events: CalendarEvent[],
  exceptions: RecurrenceException[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedCalendarEvent[] {
  const result: ExpandedCalendarEvent[] = [];
  const exceptionMap = new Map<string, RecurrenceException>();

  // Map exceptions by `originalEventId:date`
  for (const ex of exceptions) {
    exceptionMap.set(`${ex.originalEventId}:${ex.exceptionDate}`, ex);
  }

  for (const event of events) {
    if (!event.recurrence) {
      // Non-recurring event: check if it overlaps the requested window
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate || event.startDate);

      if (isValid(start) && isValid(end)) {
        if (!isAfter(start, rangeEnd) && !isBefore(end, rangeStart)) {
          result.push({
            ...event,
            isOccurrence: false,
            originalEventId: event.id,
            occurrenceDate: event.startDate,
          });
        }
      }
      continue;
    }

    // Recurring event expansion
    const expanded = expandSingleRecurringEvent(
      event,
      exceptionMap,
      rangeStart,
      rangeEnd
    );
    result.push(...expanded);
  }

  return result;
}

function expandSingleRecurringEvent(
  event: CalendarEvent,
  exceptionMap: Map<string, RecurrenceException>,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedCalendarEvent[] {
  const rule = event.recurrence!;
  const eventStart = parseISO(event.startDate);
  const eventEnd = event.endDate ? parseISO(event.endDate) : eventStart;
  const daySpan = Math.max(0, Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)));

  if (!isValid(eventStart)) return [];

  const interval = Math.max(1, rule.interval || 1);
  const untilDate = rule.untilDate ? parseISO(rule.untilDate) : null;
  const maxCount = rule.count && rule.count > 0 ? rule.count : Infinity;

  const occurrences: ExpandedCalendarEvent[] = [];
  let occurrenceIndex = 0;
  let currentDate = new Date(eventStart);

  // Hard safety limit to protect against infinite loops
  const MAX_ITERATIONS = 730; // 2 years of daily events
  let iterations = 0;

  // We need to trace from eventStart up to rangeEnd, respecting count and untilDate
  while (iterations < MAX_ITERATIONS && occurrenceIndex < maxCount) {
    iterations++;

    if (untilDate && isAfter(currentDate, untilDate)) {
      break;
    }

    // If current iteration is way past the rangeEnd, we can stop for monotonic progression
    if (isAfter(currentDate, rangeEnd)) {
      break;
    }

    const currentFormatted = format(currentDate, "yyyy-MM-dd");
    const currentOccurrenceEnd = addDays(currentDate, daySpan);
    const endFormatted = format(currentOccurrenceEnd, "yyyy-MM-dd");

    // Check if currentDate falls within [rangeStart, rangeEnd] or current span overlaps range
    const overlapsRange =
      !isAfter(currentDate, rangeEnd) && !isBefore(currentOccurrenceEnd, rangeStart);

    if (overlapsRange && !isBefore(currentDate, eventStart)) {
      occurrenceIndex++;

      // Check for exceptions
      const exceptionKey = `${event.id}:${currentFormatted}`;
      const exception = exceptionMap.get(exceptionKey);

      if (exception?.isCancelled) {
        // Occurrence was deleted for this specific date
      } else {
        const baseEvent: ExpandedCalendarEvent = {
          ...event,
          startDate: currentFormatted,
          endDate: endFormatted,
          isOccurrence: true,
          originalEventId: event.id,
          occurrenceDate: currentFormatted,
          isRecurringMaster: false,
          isException: !!exception,
          ...(exception?.overrideData || {}),
        };
        occurrences.push(baseEvent);
      }
    } else if (isBefore(currentDate, rangeStart) && !isBefore(currentDate, eventStart)) {
      occurrenceIndex++;
    }

    // Advance to next candidate date based on frequency
    currentDate = advanceRecurrenceDate(currentDate, rule, interval);
  }

  return occurrences;
}

function advanceRecurrenceDate(
  currentDate: Date,
  rule: NonNullable<CalendarEvent["recurrence"]>,
  interval: number
): Date {
  switch (rule.frequency) {
    case "DAILY":
      return addDays(currentDate, interval);

    case "WEEKDAY": {
      let next = addDays(currentDate, 1);
      // Skip Saturday (6) and Sunday (0)
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      return next;
    }

    case "WEEKLY": {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Multi-day weekly recurrence: find next matching day of the week
        const targetDays = rule.daysOfWeek.map((d) => DAY_MAP[d]).sort((a, b) => a - b);
        const currentDay = getDay(currentDate);

        // Find the next day in the same week
        const nextDayInWeek = targetDays.find((d) => d > currentDay);
        if (nextDayInWeek !== undefined) {
          const diff = nextDayInWeek - currentDay;
          return addDays(currentDate, diff);
        } else {
          // Wrap to the first matching day in the next interval weeks
          const firstDay = targetDays[0];
          const daysUntilEndOfWeek = 7 - currentDay;
          const weeksToAdd = interval - 1;
          const totalDays = daysUntilEndOfWeek + weeksToAdd * 7 + firstDay;
          return addDays(currentDate, totalDays);
        }
      } else {
        return addWeeks(currentDate, interval);
      }
    }

    case "MONTHLY": {
      // Handle month-end clamping (e.g. 31st -> 30th/28th)
      const targetDay = currentDate.getDate();
      const targetMonthDate = addMonths(currentDate, interval);
      const daysInTargetMonth = getDaysInMonth(targetMonthDate);
      const clampedDay = Math.min(targetDay, daysInTargetMonth);
      return setDate(targetMonthDate, clampedDay);
    }

    case "YEARLY": {
      // Handle leap year (Feb 29 -> Feb 28 on non-leap years)
      const targetYearDate = addYears(currentDate, interval);
      const isLeapDay = currentDate.getMonth() === 1 && currentDate.getDate() === 29;
      if (isLeapDay) {
        const daysInFeb = getDaysInMonth(setMonth(targetYearDate, 1));
        return setDate(targetYearDate, daysInFeb);
      }
      return targetYearDate;
    }

    default:
      return addDays(currentDate, 1);
  }
}
