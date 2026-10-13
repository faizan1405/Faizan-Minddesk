import type { DeskData, TaskList } from "./types";
import {
  DEFAULT_CALENDAR_CATEGORIES,
  DEFAULT_CALENDAR_SETTINGS,
} from "@/features/calendar/services/calendar-defaults";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/features/notifications/types";

export const initialTaskLists: TaskList[] = [
  {
    id: "list-my-tasks",
    title: "My Tasks",
    order: 0,
    isDefault: true,
    createdAt: "2026-10-13T00:00:00.000Z",
  },
];

export const initialDeskData: DeskData = {
  theme: "light",
  version: 3,
  taskLists: initialTaskLists,
  projects: [],
  tasks: [],
  notes: [],
  maps: [],
  events: [],
  categories: DEFAULT_CALENDAR_CATEGORIES,
  exceptions: [],
  scheduledBlocks: [],
  dailyPlans: {},
  calendarSettings: DEFAULT_CALENDAR_SETTINGS,
  habits: [],
  habitCompletions: [],
  habitProgressLogs: [],
  routines: [],
  routineSessions: [],
  notifications: [],
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
};
