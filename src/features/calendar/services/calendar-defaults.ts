import {
  CalendarCategory,
  CalendarSettings,
  MindDeskStoreData,
} from "../types";
import {
  getInitialDefaultHabits,
  getInitialDefaultCompletions,
  getInitialDefaultRoutines,
} from "@/features/habits/services/habit-defaults";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/features/notifications/types";

export const DEFAULT_CALENDAR_CATEGORIES: CalendarCategory[] = [
  {
    id: "cat-work",
    name: "Work",
    color: "#2563eb",
    bgClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    textClass: "text-blue-700 dark:text-blue-400",
    borderClass: "border-blue-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-personal",
    name: "Personal",
    color: "#10b981",
    bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-meetings",
    name: "Meetings",
    color: "#8b5cf6",
    bgClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    textClass: "text-purple-700 dark:text-purple-400",
    borderClass: "border-purple-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-learning",
    name: "Learning",
    color: "#f59e0b",
    bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-health",
    name: "Health",
    color: "#06b6d4",
    bgClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    textClass: "text-cyan-700 dark:text-cyan-400",
    borderClass: "border-cyan-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-important",
    name: "Important",
    color: "#ef4444",
    bgClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    textClass: "text-rose-700 dark:text-rose-400",
    borderClass: "border-rose-500/40",
    isVisible: true,
    isDefault: true,
  },
  {
    id: "cat-other",
    name: "Other",
    color: "#64748b",
    bgClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
    textClass: "text-slate-700 dark:text-slate-400",
    borderClass: "border-slate-500/40",
    isVisible: true,
    isDefault: true,
  },
];

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  showTasksOnCalendar: true,
  timeFormat: "12h",
  defaultView: "month",
  weekStartsOn: 1, // Monday
  defaultDurationMinutes: 60,
};

export function getInitialSeedData(): MindDeskStoreData {
  return {
    version: 3,
    events: [],
    categories: DEFAULT_CALENDAR_CATEGORIES,
    exceptions: [],
    scheduledBlocks: [],
    tasks: [],
    dailyPlans: {},
    settings: DEFAULT_CALENDAR_SETTINGS,
    projects: [],
    notes: [],
    habits: getInitialDefaultHabits(),
    habitCompletions: getInitialDefaultCompletions(),
    habitProgressLogs: [],
    routines: getInitialDefaultRoutines(),
    routineSessions: [],
    notifications: [],
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    plannerCategories: [
      { id: "cat-work-focus", name: "Work & Focus", color: "#4f46e5", isDefault: true },
      { id: "cat-health", name: "Health", color: "#10b981", isDefault: true },
      { id: "cat-personal", name: "Personal", color: "#8b5cf6", isDefault: true },
      { id: "cat-breaks", name: "Breaks", color: "#f59e0b", isDefault: true },
      { id: "cat-sleep", name: "Sleep", color: "#64748b", isDefault: true },
      { id: "cat-general", name: "General", color: "#6b7280", isDefault: true },
    ],
    plannerRoutines: [],
    plannerExceptions: [],
    focusSessions: [],
  };
}
