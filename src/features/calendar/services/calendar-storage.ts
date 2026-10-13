import { MindDeskStoreData } from "../types";
import { getInitialSeedData } from "./calendar-defaults";

export const STORAGE_KEY = "minddesk-prototype-v1";
export const STORAGE_EVENT_NAME = "minddesk:storage-change";

/**
 * Safely loads MindDesk calendar & planner data from localStorage.
 * Performs non-destructive migration if previous versions or partial keys exist,
 * strictly preserving existing tasks, task lists, notes, mind maps, projects and theme.
 */
export function loadMindDeskStore(): MindDeskStoreData {
  if (typeof window === "undefined") {
    return getInitialSeedData();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedData();
      saveMindDeskStore(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    const initial = getInitialSeedData();

    // Preserve any existing MindDesk data non-destructively
    const sanitized: MindDeskStoreData = {
      version: typeof parsed.version === "number" ? Math.max(parsed.version, 3) : 3,
      events: Array.isArray(parsed.events)
        ? parsed.events
        : Array.isArray(parsed.calendarEvents)
        ? parsed.calendarEvents
        : initial.events,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : Array.isArray(parsed.calendarCategories)
        ? parsed.calendarCategories
        : initial.categories,
      exceptions: Array.isArray(parsed.exceptions)
        ? parsed.exceptions
        : Array.isArray(parsed.calendarExceptions)
        ? parsed.calendarExceptions
        : initial.exceptions,
      scheduledBlocks: Array.isArray(parsed.scheduledBlocks)
        ? parsed.scheduledBlocks
        : initial.scheduledBlocks,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      dailyPlans:
        typeof parsed.dailyPlans === "object" && parsed.dailyPlans !== null
          ? parsed.dailyPlans
          : initial.dailyPlans,
      settings:
        typeof parsed.settings === "object" && parsed.settings !== null
          ? { ...initial.settings, ...parsed.settings }
          : typeof parsed.calendarSettings === "object" && parsed.calendarSettings !== null
          ? { ...initial.settings, ...parsed.calendarSettings }
          : initial.settings,
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      maps: Array.isArray(parsed.maps) ? parsed.maps : undefined,
      taskLists: Array.isArray(parsed.taskLists) ? parsed.taskLists : undefined,
      theme: parsed.theme === "dark" ? "dark" : "light",
      habits: Array.isArray(parsed.habits) ? parsed.habits : initial.habits,
      habitCompletions: Array.isArray(parsed.habitCompletions) ? parsed.habitCompletions : initial.habitCompletions,
      habitProgressLogs: Array.isArray(parsed.habitProgressLogs) ? parsed.habitProgressLogs : initial.habitProgressLogs,
      routines: Array.isArray(parsed.routines) ? parsed.routines : initial.routines,
      routineSessions: Array.isArray(parsed.routineSessions) ? parsed.routineSessions : initial.routineSessions,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : initial.notifications,
      notificationPreferences:
        typeof parsed.notificationPreferences === "object" && parsed.notificationPreferences !== null
          ? { ...initial.notificationPreferences, ...parsed.notificationPreferences }
          : initial.notificationPreferences,
    };

    return sanitized;
  } catch (error) {
    console.error("[MindDesk Storage] Failed to parse localStorage data, falling back to seed data:", error);
    return getInitialSeedData();
  }
}

/**
 * Saves store to localStorage non-destructively, merging with any raw existing state
 * so that maps, taskLists, notes, habits, routines and notifications are NEVER removed or overwritten.
 * Broadcasts update event for live synchronization across components and tabs.
 */
export function saveMindDeskStore(data: MindDeskStoreData): void {
  if (typeof window === "undefined") return;

  try {
    let existingRaw: Record<string, unknown> = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        existingRaw = JSON.parse(raw);
      }
    } catch {
      // Ignore read error during save
    }

    const merged = {
      ...existingRaw,
      version: Math.max((existingRaw.version as number) || 0, data.version || 3),
      events: data.events,
      categories: data.categories,
      exceptions: data.exceptions,
      scheduledBlocks: data.scheduledBlocks,
      tasks: data.tasks,
      dailyPlans: data.dailyPlans,
      settings: data.settings,
      projects: data.projects ?? existingRaw.projects,
      notes: data.notes ?? existingRaw.notes,
      maps: data.maps ?? existingRaw.maps,
      taskLists: data.taskLists ?? existingRaw.taskLists,
      theme: data.theme ?? existingRaw.theme,
      habits: data.habits ?? existingRaw.habits,
      habitCompletions: data.habitCompletions ?? existingRaw.habitCompletions,
      habitProgressLogs: data.habitProgressLogs ?? existingRaw.habitProgressLogs,
      routines: data.routines ?? existingRaw.routines,
      routineSessions: data.routineSessions ?? existingRaw.routineSessions,
      notifications: data.notifications ?? existingRaw.notifications,
      notificationPreferences: data.notificationPreferences ?? existingRaw.notificationPreferences,
    };

    const json = JSON.stringify(merged);
    window.localStorage.setItem(STORAGE_KEY, json);

    // Broadcast in-app event for immediate reactive re-render
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: data }));
  } catch (error) {
    console.error("[MindDesk Storage] Failed to write to localStorage:", error);
  }
}

/**
 * Exports current store as a downloadable JSON file for backup.
 */
export function exportCalendarBackup(data: MindDeskStoreData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `minddesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports habit and routine history as a dedicated JSON backup.
 */
export function exportHabitsAndRoutinesBackup(data: MindDeskStoreData): void {
  const habitsData = {
    exportedAt: new Date().toISOString(),
    version: data.version || 3,
    habits: data.habits || [],
    habitCompletions: data.habitCompletions || [],
    habitProgressLogs: data.habitProgressLogs || [],
    routines: data.routines || [],
    routineSessions: data.routineSessions || [],
  };
  const blob = new Blob([JSON.stringify(habitsData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `minddesk-habits-routines-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Restores store from a JSON string with schema validation.
 */
export function importCalendarBackup(jsonString: string): MindDeskStoreData {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid backup file: content is not an object.");
  }
  const initial = getInitialSeedData();
  const restored: MindDeskStoreData = {
    version: parsed.version || 3,
    events: Array.isArray(parsed.events) ? parsed.events : initial.events,
    categories: Array.isArray(parsed.categories) ? parsed.categories : initial.categories,
    exceptions: Array.isArray(parsed.exceptions) ? parsed.exceptions : initial.exceptions,
    scheduledBlocks: Array.isArray(parsed.scheduledBlocks) ? parsed.scheduledBlocks : initial.scheduledBlocks,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : initial.tasks,
    dailyPlans: parsed.dailyPlans || initial.dailyPlans,
    settings: { ...initial.settings, ...(parsed.settings || {}) },
    projects: parsed.projects || initial.projects,
    notes: parsed.notes || initial.notes,
    maps: parsed.maps,
    taskLists: parsed.taskLists,
    theme: parsed.theme,
    habits: Array.isArray(parsed.habits) ? parsed.habits : initial.habits,
    habitCompletions: Array.isArray(parsed.habitCompletions) ? parsed.habitCompletions : initial.habitCompletions,
    habitProgressLogs: Array.isArray(parsed.habitProgressLogs) ? parsed.habitProgressLogs : initial.habitProgressLogs,
    routines: Array.isArray(parsed.routines) ? parsed.routines : initial.routines,
    routineSessions: Array.isArray(parsed.routineSessions) ? parsed.routineSessions : initial.routineSessions,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : initial.notifications,
    notificationPreferences: parsed.notificationPreferences || initial.notificationPreferences,
  };
  saveMindDeskStore(restored);
  return restored;
}
