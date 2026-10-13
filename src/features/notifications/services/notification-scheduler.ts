import { format } from "date-fns";
import type {
  NotificationRecord,
  NotificationPreferences,
} from "../types";
import type { CalendarEvent, PlannerTask, ScheduledTaskBlock } from "@/features/calendar/types";
import type { Habit, HabitCompletion, Routine, RoutineSession } from "@/features/habits/types";
import { isHabitScheduledOnDate, getHabitCompletionOnDate } from "@/features/habits/services/habit-scheduler";

/**
 * Checks whether current local time falls within user-configured quiet hours.
 */
export function isWithinQuietHours(preferences: NotificationPreferences, now: Date = new Date()): boolean {
  if (!preferences.quietHoursEnabled) return false;

  const currentHM = format(now, "HH:mm");
  const start = preferences.quietHoursStart; // e.g. "22:00"
  const end = preferences.quietHoursEnd; // e.g. "07:00"

  if (start < end) {
    // Single-day quiet hours e.g. 13:00 to 15:00
    return currentHM >= start && currentHM <= end;
  } else {
    // Overnight quiet hours e.g. 22:00 to 07:00
    return currentHM >= start || currentHM <= end;
  }
}

function timeToMinutes(hmStr: string): number {
  const [h, m] = hmStr.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Scans tasks, calendar events, time blocks, habits, and routines to generate smart,
 * non-duplicate notification records based on genuine user state.
 */
export function evaluateAllSmartReminders(params: {
  tasks: PlannerTask[];
  events: CalendarEvent[];
  scheduledBlocks: ScheduledTaskBlock[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  routines: Routine[];
  routineSessions: RoutineSession[];
  preferences: NotificationPreferences;
  existingNotifications: NotificationRecord[];
  now?: Date;
}): NotificationRecord[] {
  const {
    tasks,
    events,
    scheduledBlocks,
    habits,
    habitCompletions,
    routines,
    routineSessions,
    preferences,
    existingNotifications,
  } = params;

  if (!preferences.enabled) return [];

  const now = params.now || new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const currentHM = format(now, "HH:mm");
  const currentTotalMins = timeToMinutes(currentHM);

  const quietHours = isWithinQuietHours(preferences, now);
  const nowISO = now.toISOString();

  // Set of already fired dedup keys to prevent duplicate spamming
  const firedKeys = new Set(
    existingNotifications.map((n) => n.dedupKey).filter(Boolean)
  );

  const newlyGenerated: NotificationRecord[] = [];

  const addIfNew = (item: Omit<NotificationRecord, "id" | "timestamp" | "read" | "dismissed">) => {
    if (item.dedupKey && firedKeys.has(item.dedupKey)) {
      return;
    }
    if (quietHours) {
      // Defer delivery to quiet hours end
      return;
    }

    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const record: NotificationRecord = {
      ...item,
      id,
      timestamp: nowISO,
      read: false,
      dismissed: false,
    };
    newlyGenerated.push(record);
    if (item.dedupKey) {
      firedKeys.add(item.dedupKey);
    }
  };

  // 1. Task Reminders
  if (preferences.categories.tasks) {
    for (const task of tasks) {
      if (task.completed) continue;

      const taskDueDate = task.dueDate || task.due;
      if (!taskDueDate) continue;

      // Due Today
      if (taskDueDate === todayStr || taskDueDate === "Today") {
        if (task.dueTime) {
          const taskMins = timeToMinutes(task.dueTime);
          const diff = taskMins - currentTotalMins;

          // Due soon (within configured offset or 15 mins)
          if (diff > 0 && diff <= (preferences.defaultReminderOffsetMinutes || 15)) {
            addIfNew({
              title: "Task Due Soon",
              message: `"${task.title}" is due at ${task.dueTime}.`,
              category: "tasks",
              type: "task_due_soon",
              fireAt: nowISO,
              entityType: "task",
              entityId: task.id,
              actionUrl: "/tasks",
              dedupKey: `task-${task.id}-soon-${todayStr}`,
            });
          }
        } else {
          // Due today reminder (morning alert)
          addIfNew({
            title: "Task Due Today",
            message: `"${task.title}" is scheduled for today.`,
            category: "tasks",
            type: "task_due_today",
            fireAt: nowISO,
            entityType: "task",
            entityId: task.id,
            actionUrl: "/tasks",
            dedupKey: `task-${task.id}-today-${todayStr}`,
          });
        }
      }

      // Overdue Task
      if (taskDueDate < todayStr && taskDueDate !== "Today" && taskDueDate !== "Tomorrow") {
        addIfNew({
          title: "Overdue Task",
          message: `"${task.title}" was due on ${taskDueDate}.`,
          category: "tasks",
          type: "task_overdue",
          fireAt: nowISO,
          entityType: "task",
          entityId: task.id,
          actionUrl: "/tasks",
          dedupKey: `task-${task.id}-overdue-${todayStr}`,
        });
      }
    }
  }

  // 2. Calendar Event Reminders
  if (preferences.categories.calendar) {
    for (const event of events) {
      if (event.startDate !== todayStr || event.allDay || !event.startTime) continue;

      const eventStartMins = timeToMinutes(event.startTime);
      const diff = eventStartMins - currentTotalMins;
      const offset = event.reminderMinutes || preferences.defaultReminderOffsetMinutes || 10;

      // Event starting soon
      if (diff > 0 && diff <= offset) {
        addIfNew({
          title: "Upcoming Event",
          message: `"${event.title}" starts in ${diff} minutes (${event.startTime}).`,
          category: "calendar",
          type: "calendar_upcoming",
          fireAt: nowISO,
          entityType: "event",
          entityId: event.id,
          actionUrl: "/calendar",
          dedupKey: `event-${event.id}-upcoming-${todayStr}`,
        });
      } else if (diff === 0 || (diff < 0 && diff >= -2)) {
        // Event starting now
        addIfNew({
          title: "Event Starting Now",
          message: `"${event.title}" is starting right now (${event.startTime}).`,
          category: "calendar",
          type: "calendar_starting_now",
          fireAt: nowISO,
          entityType: "event",
          entityId: event.id,
          actionUrl: "/calendar",
          dedupKey: `event-${event.id}-now-${todayStr}`,
        });
      }
    }
  }

  // 3. Time Block Reminders
  if (preferences.categories.time_blocks) {
    for (const block of scheduledBlocks) {
      if (block.date !== todayStr) continue;

      const blockStartMins = timeToMinutes(block.startTime);
      const blockEndMins = timeToMinutes(block.endTime);
      const diffStart = blockStartMins - currentTotalMins;

      // Block starting soon
      if (!block.completed && diffStart > 0 && diffStart <= 10) {
        addIfNew({
          title: "Focus Block Starting Soon",
          message: `"${block.title}" begins in ${diffStart} mins (${block.startTime}).`,
          category: "time_blocks",
          type: "block_starting_soon",
          fireAt: nowISO,
          entityType: "block",
          entityId: block.id,
          actionUrl: "/plan-your-day",
          dedupKey: `block-${block.id}-soon-${todayStr}`,
        });
      } else if (!block.completed && (diffStart === 0 || (diffStart < 0 && diffStart >= -2))) {
        // Block begins now
        addIfNew({
          title: "Scheduled Session Begins",
          message: `Time to focus: "${block.title}" is starting now.`,
          category: "time_blocks",
          type: "block_starting_now",
          fireAt: nowISO,
          entityType: "block",
          entityId: block.id,
          actionUrl: "/plan-your-day",
          dedupKey: `block-${block.id}-now-${todayStr}`,
        });
      } else if (!block.completed && currentTotalMins > blockEndMins && currentTotalMins <= blockEndMins + 15) {
        // Block ended but not completed
        addIfNew({
          title: "Focus Session Ended",
          message: `"${block.title}" has concluded. Mark completed or reschedule?`,
          category: "time_blocks",
          type: "block_ended",
          fireAt: nowISO,
          entityType: "block",
          entityId: block.id,
          actionUrl: "/plan-your-day",
          dedupKey: `block-${block.id}-ended-${todayStr}`,
        });
      }
    }
  }

  // 4. Habit Reminders
  if (preferences.categories.habits) {
    for (const habit of habits) {
      if (habit.isArchived || habit.isPaused) continue;
      if (!isHabitScheduledOnDate(habit, todayStr)) continue;

      const completion = getHabitCompletionOnDate(habit.id, todayStr, habitCompletions);
      if (completion?.completed || completion?.skipped) continue;

      if (habit.preferredTime) {
        const prefMins = timeToMinutes(habit.preferredTime);
        const diff = prefMins - currentTotalMins;

        // Reminder near preferred time
        if (diff <= 5 && diff >= -15) {
          addIfNew({
            title: "Scheduled Habit Reminder",
            message: `${habit.emoji} Time for "${habit.name}" (preferred time: ${habit.preferredTime}).`,
            category: "habits",
            type: "habit_scheduled",
            fireAt: nowISO,
            entityType: "habit",
            entityId: habit.id,
            actionUrl: "/habits",
            dedupKey: `habit-${habit.id}-reminder-${todayStr}`,
          });
        }
      }
    }
  }

  // 5. Routine Reminders
  if (preferences.categories.routines) {
    for (const routine of routines) {
      if (routine.isArchived || !routine.schedule?.preferredTime) continue;

      const routineMins = timeToMinutes(routine.schedule.preferredTime);
      const diff = routineMins - currentTotalMins;

      // Has this routine been completed today?
      const completedSession = routineSessions.find(
        (s) => s.routineId === routine.id && s.date === todayStr && s.status === "completed"
      );
      if (completedSession) continue;

      if (diff <= 10 && diff >= -5) {
        addIfNew({
          title: "Routine Starting Soon",
          message: `${routine.emoji} "${routine.title}" scheduled for ${routine.schedule.preferredTime}.`,
          category: "routines",
          type: "routine_starting_soon",
          fireAt: nowISO,
          entityType: "routine",
          entityId: routine.id,
          actionUrl: "/habits",
          dedupKey: `routine-${routine.id}-soon-${todayStr}`,
        });
      }
    }
  }

  // 6. Daily Summary Reminder
  if (preferences.categories.summary && preferences.dailySummaryEnabled) {
    const summaryMins = timeToMinutes(preferences.dailySummaryTime || "20:00");
    if (currentTotalMins >= summaryMins && currentTotalMins <= summaryMins + 30) {
      addIfNew({
        title: "Daily Habit Review Ready",
        message: "Reflect on today's consistency and prepare tomorrow's routine in MindDesk.",
        category: "summary",
        type: "habit_daily_summary",
        fireAt: nowISO,
        actionUrl: "/habits",
        dedupKey: `daily-summary-${todayStr}`,
      });
    }
  }

  return newlyGenerated;
}

/**
 * Triggers native browser Notification if supported and permitted.
 */
export function sendBrowserNotification(title: string, message: string, actionUrl?: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body: message,
        icon: "/favicon.ico",
        tag: title,
      });

      if (actionUrl) {
        notif.onclick = () => {
          window.focus();
          window.location.href = actionUrl;
        };
      }
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
