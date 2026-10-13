export type ReminderType =
  | "task_due_soon"
  | "task_due_today"
  | "task_overdue"
  | "calendar_upcoming"
  | "calendar_starting_now"
  | "block_starting_soon"
  | "block_starting_now"
  | "block_ended"
  | "block_missed"
  | "habit_scheduled"
  | "habit_pending_review"
  | "habit_daily_summary"
  | "routine_scheduled"
  | "routine_starting_soon"
  | "routine_unfinished";

export type NotificationCategory =
  | "tasks"
  | "calendar"
  | "time_blocks"
  | "habits"
  | "routines"
  | "summary"
  | "system";

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: ReminderType;
  timestamp: string; // ISO string when generated
  fireAt: string; // ISO string when it should appear
  read: boolean;
  dismissed: boolean;
  snoozedUntil?: string | null; // ISO string if snoozed
  entityType?: "task" | "event" | "block" | "habit" | "routine";
  entityId?: string;
  actionUrl?: string; // Link to navigate e.g. /habits, /tasks, /calendar, /plan-your-day
  dedupKey?: string; // Stable key to prevent spamming
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabled: boolean;
  browserNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "07:00"
  categories: {
    tasks: boolean;
    calendar: boolean;
    time_blocks: boolean;
    habits: boolean;
    routines: boolean;
    summary: boolean;
  };
  defaultReminderOffsetMinutes: number; // e.g. 10
  dailySummaryTime: string; // e.g. "20:00"
  dailySummaryEnabled: boolean;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  browserNotificationsEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  categories: {
    tasks: true,
    calendar: true,
    time_blocks: true,
    habits: true,
    routines: true,
    summary: true,
  },
  defaultReminderOffsetMinutes: 10,
  dailySummaryTime: "20:00",
  dailySummaryEnabled: true,
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
};
