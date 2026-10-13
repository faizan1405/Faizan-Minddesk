import type { TaskSubtask } from "@/features/minddesk/types";

export type RecurrenceFrequency = "DAILY" | "WEEKDAY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type DayOfWeek = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 1 week, every 2 days
  daysOfWeek?: DayOfWeek[]; // For custom weekdays e.g. ['MO', 'WE', 'FR']
  endType: "never" | "untilDate" | "count";
  untilDate?: string; // YYYY-MM-DD
  count?: number; // max occurrences
}

export interface RecurrenceException {
  id: string;
  originalEventId: string;
  exceptionDate: string; // YYYY-MM-DD
  isCancelled: boolean;
  overrideData?: Partial<CalendarEvent>;
}

export interface CalendarCategory {
  id: string;
  name: string;
  color: string; // Hex color e.g. #3b82f6
  bgClass: string;
  textClass: string;
  borderClass: string;
  isVisible: boolean;
  isDefault?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (e.g. "09:00")
  endDate: string; // YYYY-MM-DD
  endTime?: string; // HH:mm (e.g. "10:30")
  allDay: boolean;
  categoryId: string;
  customColor?: string;
  location?: string;
  meetingUrl?: string;
  recurrence?: RecurrenceRule;
  reminderMinutes?: number; // 0, 5, 10, 15, 30, 60, 1440
  projectId?: string;
  linkedTaskId?: string;
  linkedNoteId?: string;
  linkedHabitId?: string;
  linkedRoutineId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpandedCalendarEvent extends CalendarEvent {
  isOccurrence?: boolean;
  originalEventId?: string;
  occurrenceDate?: string; // YYYY-MM-DD for this instance
  isRecurringMaster?: boolean;
  isException?: boolean;
}

export type CalendarViewType = "month" | "week" | "day" | "agenda";

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

export type TimeBlockType =
  | "focus"
  | "task"
  | "meeting"
  | "break"
  | "personal"
  | "learning"
  | "habit"
  | "routine";

export interface ScheduledTaskBlock {
  id: string;
  taskId?: string;
  habitId?: string;
  routineId?: string;
  routineSessionId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  color?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  blockType?: TimeBlockType;
  recurrence?: RecurrenceRule;
  recurringSeriesId?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface PlannerTask {
  id: string;
  title: string;
  description?: string;
  note?: string; // MindDesk native note field
  dueDate?: string; // YYYY-MM-DD
  due?: string; // MindDesk native due string
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  completed: boolean;
  complete?: boolean; // MindDesk native completion flag
  isStarred: boolean;
  starred?: boolean; // MindDesk native starred flag
  isTodayPriority?: boolean;
  priorityOrder?: number; // 1, 2, 3
  estimatedMinutes?: number;
  category?: string;
  projectId?: string;
  listId?: string;
  subtasks?: TaskSubtask[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  topPriorityTaskIds: string[]; // up to 3 task IDs
  notes?: string;
  targetFocusMinutes: number;
  updatedAt: string;
}

export interface CalendarSettings {
  showTasksOnCalendar: boolean;
  timeFormat: "12h" | "24h";
  defaultView: CalendarViewType;
  weekStartsOn: 0 | 1; // 0: Sunday, 1: Monday
  defaultDurationMinutes: number;
}

export interface MindDeskStoreData {
  version: number;
  events: CalendarEvent[];
  categories: CalendarCategory[];
  exceptions: RecurrenceException[];
  scheduledBlocks: ScheduledTaskBlock[];
  tasks: PlannerTask[];
  dailyPlans: Record<string, DailyPlan>;
  settings: CalendarSettings;
  projects?: Array<{ id: string; name: string; color?: string; hue?: string; description?: string; icon?: string }>;
  notes?: Array<{ id: string; title: string; excerpt?: string; content?: string; icon?: string; updated?: string; projectId?: string; starred?: boolean }>;
  maps?: unknown[];
  taskLists?: unknown[];
  theme?: "light" | "dark";
  habits?: Habit[];
  habitCompletions?: HabitCompletion[];
  habitProgressLogs?: HabitProgressLog[];
  routines?: Routine[];
  routineSessions?: RoutineSession[];
  notifications?: NotificationRecord[];
  notificationPreferences?: NotificationPreferences;
}
