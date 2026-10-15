"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";

import { initialDeskData, initialTaskLists } from "./seed";
import type { DeskData, NoteItem, TaskItem, TaskList } from "./types";
import type { Habit, Routine } from "@/features/habits/types";
import { sanitizeMapIdentifiers } from "./utils/mind-map-utils";
import { useUIStore } from "@/stores/ui-store";
import type { AuthUserSummary } from "@/types/domain";

export const STORAGE_KEY = "minddesk-prototype-v1";

export function getUserStorageKey(userId: string): string {
  return `minddesk-user-${userId}`;
}

export function getPendingTombstonesKey(userId: string): string {
  return `minddesk-tombstones-${userId}`;
}

interface PendingTombstonesData {
  tasks?: string[];
  notes?: string[];
  maps?: string[];
  taskLists?: string[];
  projects?: string[];
  habits?: string[];
  routines?: string[];
}

function loadPendingTombstones(userId: string): PendingTombstonesData {
  if (typeof window === "undefined" || !userId) return {};
  try {
    const raw = window.localStorage.getItem(getPendingTombstonesKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePendingTombstones(
  userId: string,
  tombstones: {
    tasks: Set<string>;
    notes: Set<string>;
    maps: Set<string>;
    taskLists: Set<string>;
    projects: Set<string>;
    habits: Set<string>;
    routines: Set<string>;
  }
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const payload: PendingTombstonesData = {
      tasks: Array.from(tombstones.tasks),
      notes: Array.from(tombstones.notes),
      maps: Array.from(tombstones.maps),
      taskLists: Array.from(tombstones.taskLists),
      projects: Array.from(tombstones.projects),
      habits: Array.from(tombstones.habits),
      routines: Array.from(tombstones.routines),
    };
    window.localStorage.setItem(getPendingTombstonesKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore quota errors
  }
}

export interface DeskContextValue {
  data: DeskData;
  isLoading: boolean;
  loadError: string | null;
  update: (recipe: (current: DeskData) => DeskData) => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
  hasUnsyncedLocalData?: boolean;
  syncLocalDataToAccount?: () => Promise<{ success: boolean; error?: string }>;
  refetchFromServer: () => Promise<void>;
  persistImmediately: () => Promise<void>;
  registerDeletedId: (
    type: "task" | "note" | "map" | "taskList" | "project" | "habit" | "routine",
    id: string
  ) => void;
  retryInitialLoad: () => void;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export interface MindDeskProviderProps {
  children: ReactNode;
  user?: AuthUserSummary | null;
  initialData?: DeskData;
}

export function MindDeskProvider({ children, user, initialData }: MindDeskProviderProps) {
  const existing = useContext(DeskContext);
  const { setTheme } = useTheme();

  // Deletion tracking sets with user-scoped localStorage persistence across refreshes
  const effectiveUserId = user?.id || "guest";
  const initialTombstones = loadPendingTombstones(effectiveUserId);
  const deletedTaskIdsRef = useRef<Set<string>>(new Set(initialTombstones.tasks || []));
  const deletedNoteIdsRef = useRef<Set<string>>(new Set(initialTombstones.notes || []));
  const deletedMapIdsRef = useRef<Set<string>>(new Set(initialTombstones.maps || []));
  const deletedTaskListIdsRef = useRef<Set<string>>(new Set(initialTombstones.taskLists || []));
  const deletedProjectIdsRef = useRef<Set<string>>(new Set(initialTombstones.projects || []));
  const deletedHabitIdsRef = useRef<Set<string>>(new Set(initialTombstones.habits || []));
  const deletedRoutineIdsRef = useRef<Set<string>>(new Set(initialTombstones.routines || []));

  // If user is authenticated, start in authoritative loading state to prevent content flashing
  const [data, setData] = useState<DeskData>(() => {
    if (initialData) return initialData;
    if (typeof window !== "undefined" && !user?.id) {
      try {
        const cached = window.localStorage.getItem(getUserStorageKey("guest"));
        if (cached) {
          const parsed = JSON.parse(cached);
          const sanitized: DeskData = {
            ...parsed,
            notes: (parsed.notes || []).filter(
              (n: NoteItem) => !initialTombstones.notes?.includes(n.id)
            ),
          };
          return migrateDeskData(sanitized);
        }
      } catch {
        // ignore
      }
    }
    return initialDeskData;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(user?.id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const isHydratedRef = useRef(false);

  // Synchronization refs to avoid race conditions & lost saves
  const latestDataRef = useRef<DeskData>(initialData || initialDeskData);
  const lastSavedJsonRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const hasPendingWriteRef = useRef(false);
  const isUserDirtyRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  // Sync latestDataRef whenever data changes
  latestDataRef.current = data;

  // Account switching detection: if logged-in user changes, reset state immediately
  useEffect(() => {
    if (user?.id) {
      if (previousUserIdRef.current && previousUserIdRef.current !== user.id) {
        isUserDirtyRef.current = false;
        lastSavedJsonRef.current = "";
        const loaded = loadPendingTombstones(user.id);
        deletedTaskIdsRef.current = new Set(loaded.tasks || []);
        deletedNoteIdsRef.current = new Set(loaded.notes || []);
        deletedMapIdsRef.current = new Set(loaded.maps || []);
        deletedTaskListIdsRef.current = new Set(loaded.taskLists || []);
        deletedProjectIdsRef.current = new Set(loaded.projects || []);
        deletedHabitIdsRef.current = new Set(loaded.habits || []);
        deletedRoutineIdsRef.current = new Set(loaded.routines || []);
        setData(initialDeskData);
        latestDataRef.current = initialDeskData;
        setIsLoading(true);
        setLoadError(null);
      }
      previousUserIdRef.current = user.id;
    } else {
      previousUserIdRef.current = null;
      setIsLoading(false);
    }
  }, [user?.id]);

  // Cloud Save to MySQL with atomic payload and tracked deletions
  const persistToServer = useCallback(
    async (dataToSave: DeskData) => {
      if (!user?.id) return;
      if (isSavingRef.current) {
        hasPendingWriteRef.current = true;
        return;
      }

      const currentJson = JSON.stringify(dataToSave);
      const hasDeletions =
        deletedTaskIdsRef.current.size > 0 ||
        deletedNoteIdsRef.current.size > 0 ||
        deletedMapIdsRef.current.size > 0 ||
        deletedTaskListIdsRef.current.size > 0 ||
        deletedProjectIdsRef.current.size > 0 ||
        deletedHabitIdsRef.current.size > 0 ||
        deletedRoutineIdsRef.current.size > 0;

      if (currentJson === lastSavedJsonRef.current && !hasDeletions) {
        useUIStore.getState().setSaveStatus("saved");
        return;
      }

      isSavingRef.current = true;
      useUIStore.getState().setSaveStatus("saving");

      const deletedTaskIds = Array.from(deletedTaskIdsRef.current);
      const deletedNoteIds = Array.from(deletedNoteIdsRef.current);
      const deletedMapIds = Array.from(deletedMapIdsRef.current);
      const deletedTaskListIds = Array.from(deletedTaskListIdsRef.current);
      const deletedProjectIds = Array.from(deletedProjectIdsRef.current);
      const deletedHabitIds = Array.from(deletedHabitIdsRef.current);
      const deletedRoutineIds = Array.from(deletedRoutineIdsRef.current);

      try {
        const res = await fetch("/api/minddesk/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: dataToSave,
            deletedTaskIds,
            deletedNoteIds,
            deletedMapIds,
            deletedTaskListIds,
            deletedProjectIds,
            deletedHabitIds,
            deletedRoutineIds,
            clientPreferencesVersion: dataToSave.preferencesVersion,
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => null);
          const diagnosticSuffix = errorJson?.diagnosticId
            ? ` [Ref: ${errorJson.diagnosticId}]`
            : "";
          const errorMsg =
            (errorJson?.error || `HTTP ${res.status}`) + diagnosticSuffix;
          throw new Error(errorMsg);
        }

        const result = await res.json();
        if (result?.success) {
          // Clear confirmed deletions
          deletedTaskIds.forEach((id) => deletedTaskIdsRef.current.delete(id));
          deletedNoteIds.forEach((id) => deletedNoteIdsRef.current.delete(id));
          deletedMapIds.forEach((id) => deletedMapIdsRef.current.delete(id));
          deletedTaskListIds.forEach((id) => deletedTaskListIdsRef.current.delete(id));
          deletedProjectIds.forEach((id) => deletedProjectIdsRef.current.delete(id));
          deletedHabitIds.forEach((id) => deletedHabitIdsRef.current.delete(id));
          deletedRoutineIds.forEach((id) => deletedRoutineIdsRef.current.delete(id));

          if (user?.id) {
            savePendingTombstones(user.id, {
              tasks: deletedTaskIdsRef.current,
              notes: deletedNoteIdsRef.current,
              maps: deletedMapIdsRef.current,
              taskLists: deletedTaskListIdsRef.current,
              projects: deletedProjectIdsRef.current,
              habits: deletedHabitIdsRef.current,
              routines: deletedRoutineIdsRef.current,
            });
          }

          if (result?.preferencesVersion) {
            setData((curr) => ({
              ...curr,
              preferencesVersion: result.preferencesVersion,
            }));
            latestDataRef.current = {
              ...latestDataRef.current,
              preferencesVersion: result.preferencesVersion,
            };
          }

          lastSavedJsonRef.current = currentJson;
          useUIStore.getState().setSaveStatus("saved");

          // Update user-scoped local cache
          window.localStorage.setItem(
            getUserStorageKey(user.id),
            currentJson
          );
        } else {
          useUIStore.getState().setSaveStatus("error");
          isUserDirtyRef.current = true;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[MindDesk Save Failed]", errorMsg);

        // Keep dirty flag so user edits are preserved and can be retried
        isUserDirtyRef.current = true;

        useUIStore.getState().setSaveStatus(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "error"
        );
      } finally {
        isSavingRef.current = false;
        if (hasPendingWriteRef.current) {
          hasPendingWriteRef.current = false;
          persistToServer(latestDataRef.current);
        }
      }
    },
    [user?.id]
  );

  // Immediate persistence trigger (used on unmount, note navigation, blur, or beforeunload)
  const persistImmediately = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const hasPendingDeletions =
      deletedNoteIdsRef.current.size > 0 ||
      deletedTaskIdsRef.current.size > 0 ||
      deletedMapIdsRef.current.size > 0 ||
      deletedTaskListIdsRef.current.size > 0 ||
      deletedProjectIdsRef.current.size > 0 ||
      deletedHabitIdsRef.current.size > 0 ||
      deletedRoutineIdsRef.current.size > 0;

    if (isUserDirtyRef.current || hasPendingDeletions) {
      isUserDirtyRef.current = false;
      await persistToServer(latestDataRef.current);
    }
  }, [persistToServer]);

  // Register deleted item ID for MySQL deletion
  const registerDeletedId = useCallback(
    (
      type: "task" | "note" | "map" | "taskList" | "project" | "habit" | "routine",
      id: string
    ) => {
      if (type === "task") deletedTaskIdsRef.current.add(id);
      else if (type === "note") deletedNoteIdsRef.current.add(id);
      else if (type === "map") deletedMapIdsRef.current.add(id);
      else if (type === "taskList") deletedTaskListIdsRef.current.add(id);
      else if (type === "project") deletedProjectIdsRef.current.add(id);
      else if (type === "habit") deletedHabitIdsRef.current.add(id);
      else if (type === "routine") deletedRoutineIdsRef.current.add(id);
      isUserDirtyRef.current = true;

      const targetUserId = user?.id || "guest";
      savePendingTombstones(targetUserId, {
        tasks: deletedTaskIdsRef.current,
        notes: deletedNoteIdsRef.current,
        maps: deletedMapIdsRef.current,
        taskLists: deletedTaskListIdsRef.current,
        projects: deletedProjectIdsRef.current,
        habits: deletedHabitIdsRef.current,
        routines: deletedRoutineIdsRef.current,
      });
    },
    [user?.id]
  );

  // 1. Initial Load: Hydrate authoritatively from MySQL
  const loadWorkspaceData = useCallback(async () => {
    if (existing) return;

    const currentUserId = user?.id;

    if (!currentUserId) {
      // Unauthenticated / Guest preview mode: load from guest offline cache if present
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(getUserStorageKey("guest"));
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const sanitized: DeskData = {
              ...parsed,
              notes: (parsed.notes || []).filter(
                (n: NoteItem) => !deletedNoteIdsRef.current.has(n.id)
              ),
              habits: (parsed.habits || []).filter(
                (h: Habit) => !deletedHabitIdsRef.current.has(h.id)
              ),
              routines: (parsed.routines || []).filter(
                (r: Routine) => !deletedRoutineIdsRef.current.has(r.id)
              ),
            };
            const migrated = migrateDeskData(sanitized);
            setData(migrated);
            latestDataRef.current = migrated;
          } catch {
            // Ignore corrupted guest cache
          }
        }
      }
      isHydratedRef.current = true;
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    useUIStore.getState().setSaveStatus("loading");

    try {
      const res = await fetch("/api/minddesk/sync", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const diagnosticSuffix = errorJson?.diagnosticId
          ? ` [Ref: ${errorJson.diagnosticId}]`
          : "";
        const errorMsg =
          (errorJson?.error || `Server returned HTTP ${res.status}`) +
          diagnosticSuffix;
        throw new Error(errorMsg);
      }

      const payload = await res.json();
      if (payload?.success && payload?.data) {
        const rawServerData: DeskData = payload.data;
        // Filter out any locally pending tombstones to ensure zero resurrection of deleted items
        const sanitizedServerData: DeskData = {
          ...rawServerData,
          notes: (rawServerData.notes || []).filter(
            (n) => !deletedNoteIdsRef.current.has(n.id)
          ),
          tasks: (rawServerData.tasks || []).filter(
            (t) => !deletedTaskIdsRef.current.has(t.id)
          ),
          projects: (rawServerData.projects || []).filter(
            (p) => !deletedProjectIdsRef.current.has(p.id)
          ),
          maps: (rawServerData.maps || []).filter(
            (m) => !deletedMapIdsRef.current.has(m.id)
          ),
          taskLists: (rawServerData.taskLists || []).filter(
            (l) => !deletedTaskListIdsRef.current.has(l.id)
          ),
          habits: (rawServerData.habits || []).filter(
            (h) => !deletedHabitIdsRef.current.has(h.id)
          ),
          routines: (rawServerData.routines || []).filter(
            (r) => !deletedRoutineIdsRef.current.has(r.id)
          ),
        };
        const migrated = migrateDeskData(sanitizedServerData);

        setData(migrated);
        latestDataRef.current = migrated;
        lastSavedJsonRef.current = JSON.stringify(migrated);
        useUIStore.getState().setSaveStatus("saved");

        // Cache authoritatively for this user
        window.localStorage.setItem(
          getUserStorageKey(currentUserId),
          JSON.stringify(migrated)
        );

        // If there are unconfirmed pending deletions from a previous crash/refresh, flush them to server
        const hasPendingDeletions =
          deletedNoteIdsRef.current.size > 0 ||
          deletedTaskIdsRef.current.size > 0 ||
          deletedMapIdsRef.current.size > 0 ||
          deletedTaskListIdsRef.current.size > 0 ||
          deletedProjectIdsRef.current.size > 0 ||
          deletedHabitIdsRef.current.size > 0 ||
          deletedRoutineIdsRef.current.size > 0;
        if (hasPendingDeletions) {
          persistToServer(migrated);
        }
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: unknown) {
      // Network failure or database error: inspect user-scoped offline cache
      const cached = window.localStorage.getItem(getUserStorageKey(currentUserId));
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const migrated = migrateDeskData(parsed);
          setData(migrated);
          latestDataRef.current = migrated;
          useUIStore.getState().setSaveStatus("offline");
        } catch {
          setLoadError(err instanceof Error ? err.message : "Failed to load workspace");
          useUIStore.getState().setSaveStatus("error");
        }
      } else {
        setLoadError(err instanceof Error ? err.message : "Failed to connect to MySQL database");
        useUIStore.getState().setSaveStatus("error");
      }
    } finally {
      isHydratedRef.current = true;
      setIsLoading(false);
    }
  }, [existing, persistToServer, user?.id]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // 2. User Interaction Mutator
  const update = useCallback(
    (recipe: (current: DeskData) => DeskData) => {
      isUserDirtyRef.current = true;
      if (user?.id) {
        useUIStore.getState().setSaveStatus("saving");
      }
      setData((current) => {
        const next = recipe(current);
        latestDataRef.current = next;
        return next;
      });
    },
    [user?.id]
  );

  // 3. Theme, Local Cache, and Debounced Auto-Save
  useEffect(() => {
    if (existing) return;
    document.documentElement.classList.toggle("dark", data.theme === "dark");
    setTheme?.(data.theme);

    if (!isLoading && isHydratedRef.current) {
      // Cache user-scoped state locally
      try {
        const targetKey = getUserStorageKey(user?.id || "guest");
        window.localStorage.setItem(targetKey, JSON.stringify(data));
      } catch {
        // Ignore quota errors
      }

      // Schedule debounced server save ONLY if user made an actual modification
      if (user?.id && isUserDirtyRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          isUserDirtyRef.current = false;
          persistToServer(latestDataRef.current);
        }, 350);
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, existing, isLoading, persistToServer, setTheme, user?.id]);

  // 4. Refetch on Window Focus (Cross-device consistency when returning from mobile or Incognito)
  const refetchFromServer = useCallback(async () => {
    if (!user?.id || isSavingRef.current || isUserDirtyRef.current) return;

    try {
      const res = await fetch("/api/minddesk/sync", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && payload?.data) {
          const rawServer = payload.data;
          const sanitizedServerData: DeskData = {
            ...rawServer,
            notes: (rawServer.notes || []).filter(
              (n: { id: string }) => !deletedNoteIdsRef.current.has(n.id)
            ),
            tasks: (rawServer.tasks || []).filter(
              (t: { id: string }) => !deletedTaskIdsRef.current.has(t.id)
            ),
            projects: (rawServer.projects || []).filter(
              (p: { id: string }) => !deletedProjectIdsRef.current.has(p.id)
            ),
            maps: (rawServer.maps || []).filter(
              (m: { id: string }) => !deletedMapIdsRef.current.has(m.id)
            ),
            taskLists: (rawServer.taskLists || []).filter(
              (l: { id: string }) => !deletedTaskListIdsRef.current.has(l.id)
            ),
          };
          const migrated = migrateDeskData(sanitizedServerData);
          const sanitizedJson = JSON.stringify(migrated);
          if (sanitizedJson !== lastSavedJsonRef.current) {
            setData(migrated);
            latestDataRef.current = migrated;
            lastSavedJsonRef.current = sanitizedJson;
            window.localStorage.setItem(
              getUserStorageKey(user.id),
              sanitizedJson
            );
            useUIStore.getState().setSaveStatus("saved");
          }
        }
      }
    } catch {
      // Ignore background refresh failure
    }
  }, [user?.id]);

  // Window Focus, Online, and BeforeUnload event handlers
  useEffect(() => {
    if (!user?.id) return;

    const handleFocus = () => {
      refetchFromServer();
    };

    const handleRetry = () => {
      isUserDirtyRef.current = true;
      persistToServer(latestDataRef.current);
    };

    const handleOnline = () => {
      refetchFromServer();
      if (isUserDirtyRef.current) {
        persistToServer(latestDataRef.current);
      }
    };

    const handleBeforeUnload = () => {
      if (isUserDirtyRef.current) {
        // Flush pending changes before page unloads
        persistImmediately();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("minddesk:sync-retry", handleRetry);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("minddesk:sync-retry", handleRetry);
    };
  }, [persistImmediately, persistToServer, refetchFromServer, user?.id]);

  // Decommissioned: Safe no-op kept for interface compatibility
  const syncLocalDataToAccount = useCallback(async () => {
    return { success: true };
  }, []);

  if (existing) {
    return <>{children}</>;
  }

  return (
    <DeskContext.Provider
      value={{
        data,
        isLoading,
        loadError,
        update,
        selectedItem,
        setSelectedItem,
        hasUnsyncedLocalData: false,
        syncLocalDataToAccount,
        refetchFromServer,
        persistImmediately,
        registerDeletedId,
        retryInitialLoad: loadWorkspaceData,
      }}
    >
      {children}
    </DeskContext.Provider>
  );
}

export function useOptionalDeskData(): DeskContextValue | null {
  return useContext(DeskContext);
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

  const rawTasks = Array.isArray(candidate.tasks) ? candidate.tasks : [];
  const migratedTasks: TaskItem[] = rawTasks.map((task, index) => {
    let assignedListId = task.listId;
    if (!assignedListId || !lists.some((l) => l.id === assignedListId)) {
      assignedListId = defaultListId;
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
    notes: Array.isArray(candidate.notes) ? candidate.notes : [],
    maps: Array.isArray(candidate.maps)
      ? candidate.maps.map(sanitizeMapIdentifiers)
      : [],
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    events: candidate.events || [],
    categories: candidate.categories || initialDeskData.categories,
    exceptions: candidate.exceptions || [],
    scheduledBlocks: candidate.scheduledBlocks || [],
    dailyPlans: candidate.dailyPlans || {},
    calendarSettings: candidate.calendarSettings || initialDeskData.calendarSettings,
    habits: candidate.habits || [],
    habitCompletions: candidate.habitCompletions || [],
    habitProgressLogs: candidate.habitProgressLogs || [],
    routines: candidate.routines || [],
    routineSessions: candidate.routineSessions || [],
    notifications: candidate.notifications || [],
    notificationPreferences: candidate.notificationPreferences || initialDeskData.notificationPreferences,
  };
}
