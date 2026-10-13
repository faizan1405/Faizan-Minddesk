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
import type { DeskData, TaskItem, TaskList } from "./types";
import { useUIStore } from "@/stores/ui-store";
import type { AuthUserSummary } from "@/types/domain";

export const STORAGE_KEY = "minddesk-prototype-v1";
const SYNCED_KEY_PREFIX = "minddesk_synced_user_";
const PROTOTYPE_CLAIMED_BY_KEY = "minddesk_prototype_claimed_by";

// Known legacy prototype demo IDs to avoid mistaking them for user-created local content
const DEMO_ITEM_IDS = new Set([
  "task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7", "task-8", "task-9", "task-10",
  "note-1", "note-2", "note-3", "note-roadmap", "note-architecture",
  "northstar", "fieldnotes", "launch", "personal",
  "map-1",
  "evt-standup-recurring", "evt-lunch", "evt-sprint-review", "evt-quarterly-planning", "evt-gym", "evt-tech-webinar",
  "habit-water", "habit-reading", "habit-workout", "habit-plan-day",
  "routine-morning", "routine-evening",
  "list-skills", "list-projects", "list-routine", "list-goals",
]);

export function getUserStorageKey(userId: string): string {
  return `minddesk-user-${userId}`;
}

export interface DeskContextValue {
  data: DeskData;
  isLoading: boolean;
  loadError: string | null;
  update: (recipe: (current: DeskData) => DeskData) => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
  hasUnsyncedLocalData: boolean;
  syncLocalDataToAccount: () => Promise<{ success: boolean; error?: string }>;
  refetchFromServer: () => Promise<void>;
  persistImmediately: () => Promise<void>;
  registerDeletedId: (type: "task" | "note" | "map" | "taskList" | "project", id: string) => void;
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

  // If user is authenticated, start in authoritative loading state to prevent content flashing
  const [data, setData] = useState<DeskData>(() => initialData || initialDeskData);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(user?.id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hasUnsyncedLocalData, setHasUnsyncedLocalData] = useState(false);

  // Synchronization refs to avoid race conditions & lost saves
  const latestDataRef = useRef<DeskData>(initialData || initialDeskData);
  const lastSavedJsonRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const hasPendingWriteRef = useRef(false);
  const isUserDirtyRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  // Deletion tracking sets for MySQL cross-tenant synchronization
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());
  const deletedNoteIdsRef = useRef<Set<string>>(new Set());
  const deletedMapIdsRef = useRef<Set<string>>(new Set());
  const deletedTaskListIdsRef = useRef<Set<string>>(new Set());
  const deletedProjectIdsRef = useRef<Set<string>>(new Set());

  // Sync latestDataRef whenever data changes
  latestDataRef.current = data;

  // Account switching detection: if logged-in user changes, reset state immediately
  useEffect(() => {
    if (user?.id) {
      if (previousUserIdRef.current && previousUserIdRef.current !== user.id) {
        isUserDirtyRef.current = false;
        lastSavedJsonRef.current = "";
        deletedTaskIdsRef.current.clear();
        deletedNoteIdsRef.current.clear();
        deletedMapIdsRef.current.clear();
        deletedTaskListIdsRef.current.clear();
        deletedProjectIdsRef.current.clear();
        setData(initialDeskData);
        latestDataRef.current = initialDeskData;
        setHasUnsyncedLocalData(false);
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
        deletedProjectIdsRef.current.size > 0;

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
        }
      } catch {
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
      deletedProjectIdsRef.current.size > 0;

    if (isUserDirtyRef.current || hasPendingDeletions) {
      isUserDirtyRef.current = false;
      await persistToServer(latestDataRef.current);
    }
  }, [persistToServer]);

  // Register deleted item ID for MySQL deletion
  const registerDeletedId = useCallback(
    (type: "task" | "note" | "map" | "taskList" | "project", id: string) => {
      if (type === "task") deletedTaskIdsRef.current.add(id);
      else if (type === "note") deletedNoteIdsRef.current.add(id);
      else if (type === "map") deletedMapIdsRef.current.add(id);
      else if (type === "taskList") deletedTaskListIdsRef.current.add(id);
      else if (type === "project") deletedProjectIdsRef.current.add(id);
      isUserDirtyRef.current = true;
    },
    []
  );

  // 1. Initial Load: Hydrate authoritatively from MySQL
  const loadWorkspaceData = useCallback(async () => {
    if (existing) return;

    const currentUserId = user?.id;

    if (!currentUserId) {
      // Unauthenticated / Guest preview mode: initialize clean empty workspace
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
        const serverData: DeskData = payload.data;
        const migrated = migrateDeskData(serverData);

        setData(migrated);
        latestDataRef.current = migrated;
        lastSavedJsonRef.current = JSON.stringify(migrated);
        useUIStore.getState().setSaveStatus("saved");

        // Cache authoritatively for this user
        window.localStorage.setItem(
          getUserStorageKey(currentUserId),
          JSON.stringify(migrated)
        );

        // Check if user has legacy prototype local data that needs migration
        const claimedBy = window.localStorage.getItem(PROTOTYPE_CLAIMED_BY_KEY);
        const syncKey = `${SYNCED_KEY_PREFIX}${currentUserId}`;
        const alreadySynced = window.localStorage.getItem(syncKey) === "true";

        if (!alreadySynced && (!claimedBy || claimedBy === currentUserId)) {
          const rawLocal = window.localStorage.getItem(STORAGE_KEY);
          if (rawLocal) {
            try {
              const parsed = JSON.parse(rawLocal);
              const genuineUserTasks = (parsed.tasks || []).filter(
                (t: { id: string }) => !DEMO_ITEM_IDS.has(t.id)
              );
              const genuineUserNotes = (parsed.notes || []).filter(
                (n: { id: string }) => !DEMO_ITEM_IDS.has(n.id)
              );
              if (genuineUserTasks.length > 0 || genuineUserNotes.length > 0) {
                setHasUnsyncedLocalData(true);
              }
            } catch {
              // Ignore parse error
            }
          }
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
      setIsLoading(false);
    }
  }, [existing, user?.id]);

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

    if (!isLoading) {
      // Cache user-scoped state locally
      try {
        if (user?.id) {
          window.localStorage.setItem(
            getUserStorageKey(user.id),
            JSON.stringify(data)
          );
        }
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
          const serverJson = JSON.stringify(payload.data);
          if (serverJson !== lastSavedJsonRef.current) {
            const migrated = migrateDeskData(payload.data);
            setData(migrated);
            latestDataRef.current = migrated;
            lastSavedJsonRef.current = serverJson;
            window.localStorage.setItem(
              getUserStorageKey(user.id),
              serverJson
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

  // 5. Safe Migration of Local Prototype Data to Cloud Account
  const syncLocalDataToAccount = useCallback(async () => {
    if (!user?.id) {
      return { success: false, error: "Authentication required." };
    }

    try {
      useUIStore.getState().setSaveStatus("saving");
      const current = latestDataRef.current;
      const res = await fetch("/api/minddesk/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localData: current, dryRun: false }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      if (result?.success) {
        window.localStorage.setItem(
          `${SYNCED_KEY_PREFIX}${user.id}`,
          "true"
        );
        window.localStorage.setItem(PROTOTYPE_CLAIMED_BY_KEY, user.id);
        window.localStorage.setItem(
          getUserStorageKey(user.id),
          JSON.stringify(current)
        );
        setHasUnsyncedLocalData(false);
        lastSavedJsonRef.current = JSON.stringify(current);
        useUIStore.getState().setSaveStatus("saved");
        return { success: true };
      } else {
        useUIStore.getState().setSaveStatus("error");
        return { success: false, error: result?.error || "Import failed." };
      }
    } catch (err: unknown) {
      useUIStore.getState().setSaveStatus("error");
      return {
        success: false,
        error: err instanceof Error ? err.message : "Sync failed.",
      };
    }
  }, [user?.id]);

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
        hasUnsyncedLocalData,
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
    maps: Array.isArray(candidate.maps) ? candidate.maps : [],
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
