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
  };
}

