export interface AuthActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};

import type {
  CalendarCategory,
  CalendarEvent,
  CalendarSettings,
  DailyPlan,
  RecurrenceException,
  ScheduledTaskBlock,
} from "@/features/calendar/types";
import type {
  Habit,
  HabitCompletion,
  HabitProgressLog,
  Routine,
  RoutineSession,
} from "@/features/habits/types";
import type {
  NotificationPreferences,
  NotificationRecord,
} from "@/features/notifications/types";

export interface ProfilePreferencesJson {
  _version?: number;
  _updatedAt?: string;
  _sectionVersions?: Record<string, number>;
  _tombstones?: {
    taskLists?: string[];
    projects?: string[];
    tasks?: string[];
    notes?: string[];
    maps?: string[];
    habits?: string[];
    routines?: string[];
    events?: string[];
  };
  theme?: "light" | "dark";
  calendar?: {
    events?: CalendarEvent[];
    categories?: CalendarCategory[];
    exceptions?: RecurrenceException[];
    settings?: CalendarSettings | Partial<CalendarSettings>;
  };
  planner?: {
    scheduledBlocks?: ScheduledTaskBlock[];
    dailyPlans?: Record<string, DailyPlan>;
  };
  habits?: {
    habits?: Habit[];
    habitCompletions?: HabitCompletion[];
    habitProgressLogs?: HabitProgressLog[];
  };
  routines?: {
    routines?: Routine[];
    routineSessions?: RoutineSession[];
  };
  notifications?: {
    notifications?: NotificationRecord[];
    preferences?: NotificationPreferences | Partial<NotificationPreferences>;
    settings?: {
      enabled?: boolean;
      browserNotifications?: boolean;
      taskReminders?: boolean;
      calendarReminders?: boolean;
      dailyDigest?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    };
  };
  appearance?: {
    theme?: "light" | "dark" | "system";
    compactMode?: boolean;
    reducedMotion?: boolean;
  };
  productivity?: {
    defaultCalendarView?: "month" | "week" | "day" | "agenda";
    weekStartsOn?: 0 | 1;
    timeFormat?: "12h" | "24h";
    defaultTaskPriority?: "low" | "medium" | "high";
    defaultTaskDueOffsetDays?: number;
    defaultDurationMinutes?: number;
  };
  [key: string]: unknown;
}

