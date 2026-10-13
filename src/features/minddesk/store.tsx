"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";

import { initialDeskData, initialTaskLists } from "./seed";
import type { DeskData, TaskItem, TaskList } from "./types";
import { useUIStore } from "@/stores/ui-store";

const STORAGE_KEY = "minddesk-prototype-v1";

interface DeskContextValue {
  data: DeskData;
  update: (recipe: (current: DeskData) => DeskData) => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export function MindDeskProvider({ children }: { children: ReactNode }) {
  const existing = useContext(DeskContext);
  const { setTheme } = useTheme();
  const [data, setData] = useState<DeskData>(initialDeskData);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (existing) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isDeskData(parsed)) {
          const migrated = migrateDeskData(parsed);
          setData(migrated);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, [existing]);

  useEffect(() => {
    if (existing) return;
    document.documentElement.classList.toggle("dark", data.theme === "dark");
    setTheme?.(data.theme);
    if (ready) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        useUIStore.getState().setSaveStatus("saved");
      } catch {
        useUIStore.getState().setSaveStatus("offline");
      }
    }
  }, [data, existing, ready, setTheme]);

  if (existing) {
    return <>{children}</>;
  }

  return (
    <DeskContext.Provider
      value={{
        data,
        update: (recipe) => setData(recipe),
        selectedItem,
        setSelectedItem,
      }}
    >
      {children}
    </DeskContext.Provider>
  );
}

export function useDeskData() {
  const context = useContext(DeskContext);
  if (!context)
    throw new Error("useDeskData must be rendered inside MindDeskProvider");
  return context;
}

export function migrateDeskData(candidate: DeskData): DeskData {
  const lists: TaskList[] =
    Array.isArray(candidate.taskLists) && candidate.taskLists.length > 0
      ? [...candidate.taskLists].sort((a, b) => a.order - b.order)
      : initialTaskLists;

  const defaultListId = lists[0]?.id || "list-my-tasks";

  const migratedTasks: TaskItem[] = (
    Array.isArray(candidate.tasks) ? candidate.tasks : initialDeskData.tasks
  ).map((task, index) => {
    let assignedListId = task.listId;
    if (!assignedListId || !lists.some((l) => l.id === assignedListId)) {
      if (task.projectId === "launch") {
        assignedListId = "list-projects";
      } else if (task.projectId === "fieldnotes") {
        assignedListId = "list-skills";
      } else if (task.projectId === "personal") {
        assignedListId = "list-routine";
      } else {
        assignedListId = defaultListId;
      }
    }

    return {
      ...task,
      listId: assignedListId,
      order: typeof task.order === "number" ? task.order : index,
      note: task.note ?? "",
      subtasks: Array.isArray(task.subtasks)
        ? task.subtasks.map((s, sIdx) => ({
            ...s,
            order: typeof s.order === "number" ? s.order : sIdx,
          }))
        : [],
    };
  });

  return {
    ...candidate,
    version: 3,
    taskLists: lists,
    tasks: migratedTasks,
    notes: Array.isArray(candidate.notes) ? candidate.notes : initialDeskData.notes,
    maps: Array.isArray(candidate.maps) ? candidate.maps : initialDeskData.maps,
    projects: Array.isArray(candidate.projects) ? candidate.projects : initialDeskData.projects,
    events: candidate.events,
    categories: candidate.categories,
    exceptions: candidate.exceptions,
    scheduledBlocks: candidate.scheduledBlocks,
    dailyPlans: candidate.dailyPlans,
    calendarSettings: candidate.calendarSettings,
    habits: candidate.habits,
    habitCompletions: candidate.habitCompletions,
    habitProgressLogs: candidate.habitProgressLogs,
    routines: candidate.routines,
    routineSessions: candidate.routineSessions,
    notifications: candidate.notifications,
    notificationPreferences: candidate.notificationPreferences,
  };
}

function isDeskData(value: unknown): value is DeskData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DeskData>;
  return (
    Array.isArray(candidate.tasks) ||
    Array.isArray(candidate.notes) ||
    Array.isArray(candidate.maps)
  );
}

