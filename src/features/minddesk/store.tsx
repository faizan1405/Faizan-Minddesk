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

export function getUserStorageKey(userId: string): string {
  return `minddesk-user-${userId}`;
}

interface DeskContextValue {
  data: DeskData;
  update: (recipe: (current: DeskData) => DeskData) => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
  hasUnsyncedLocalData: boolean;
  syncLocalDataToAccount: () => Promise<{ success: boolean; error?: string }>;
  refetchFromServer: () => Promise<void>;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export interface MindDeskProviderProps {
  children: ReactNode;
  user?: AuthUserSummary | null;
}

export function MindDeskProvider({ children, user }: MindDeskProviderProps) {
  const existing = useContext(DeskContext);
  const { setTheme } = useTheme();
  const [data, setData] = useState<DeskData>(initialDeskData);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hasUnsyncedLocalData, setHasUnsyncedLocalData] = useState(false);

  // Synchronization refs to avoid race conditions & unauthorized auto-saves
  const latestDataRef = useRef<DeskData>(initialDeskData);
  const lastSavedJsonRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const hasPendingWriteRef = useRef(false);
  const isUserDirtyRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

  // Sync latestDataRef whenever data changes
  latestDataRef.current = data;

  // Account switching detection: if logged-in user changes, reset state
  useEffect(() => {
    if (user?.id) {
      if (previousUserIdRef.current && previousUserIdRef.current !== user.id) {
        // User account switched: reset memory state to avoid cross-tenant contamination
        isUserDirtyRef.current = false;
        lastSavedJsonRef.current = "";
        setData(initialDeskData);
        latestDataRef.current = initialDeskData;
        setHasUnsyncedLocalData(false);
      }
      previousUserIdRef.current = user.id;
    }
  }, [user?.id]);

  // 1. Initial Load: Load scoped local storage first, then hydrate from MySQL
  useEffect(() => {
    if (existing) return;

    let localCandidate: DeskData | null = null;
    const currentUserId = user?.id;

    try {
      // If user is authenticated, check user-scoped storage key first
      let rawSaved: string | null = null;
      if (currentUserId) {
        rawSaved = window.localStorage.getItem(getUserStorageKey(currentUserId));
      }

      // Fallback to legacy prototype storage only if unclaimed or claimed by this user
      if (!rawSaved) {
        const claimedBy = window.localStorage.getItem(PROTOTYPE_CLAIMED_BY_KEY);
        if (!claimedBy || claimedBy === currentUserId) {
          rawSaved = window.localStorage.getItem(STORAGE_KEY);
        }
      }

      if (rawSaved) {
        const parsed: unknown = JSON.parse(rawSaved);
        if (isDeskData(parsed)) {
          localCandidate = migrateDeskData(parsed);
          setData(localCandidate);
          latestDataRef.current = localCandidate;
        }
      }
    } catch {
      // Ignore local storage read errors
    }

    setReady(true);

    // If authenticated, fetch authoritative data from MySQL
    if (currentUserId) {
      const syncKey = `${SYNCED_KEY_PREFIX}${currentUserId}`;
      const alreadySynced = window.localStorage.getItem(syncKey) === "true";
      const claimedBy = window.localStorage.getItem(PROTOTYPE_CLAIMED_BY_KEY);

      fetch("/api/minddesk/sync")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((payload) => {
          if (payload?.success && payload?.data) {
            const serverData: DeskData = payload.data;
            const hasServerData =
              (serverData.tasks?.length ?? 0) > 0 ||
              (serverData.notes?.length ?? 0) > 0 ||
              (serverData.maps?.length ?? 0) > 0;

            const hasLocalItems =
              (localCandidate?.tasks?.length ?? 0) > 0 ||
              (localCandidate?.notes?.length ?? 0) > 0;

            // If server has data, server is authoritative
            if (hasServerData) {
              const migrated = migrateDeskData(serverData);
              setData(migrated);
              latestDataRef.current = migrated;
              lastSavedJsonRef.current = JSON.stringify(migrated);
              useUIStore.getState().setSaveStatus("saved");
              window.localStorage.setItem(syncKey, "true");
              window.localStorage.setItem(
                getUserStorageKey(currentUserId),
                JSON.stringify(migrated)
              );
            } else if (hasLocalItems && !alreadySynced && (!claimedBy || claimedBy === currentUserId)) {
              // Local has data but server is empty: prompt user for safe import
              setHasUnsyncedLocalData(true);
              useUIStore.getState().setSaveStatus("idle");
            } else {
              // Both empty or already synced
              lastSavedJsonRef.current = JSON.stringify(serverData);
              useUIStore.getState().setSaveStatus("saved");
            }
          }
        })
        .catch(() => {
          // Offline or network error: preserve local state safely
          useUIStore.getState().setSaveStatus("offline");
        });
    }
  }, [existing, user?.id]);

  // 2. Cloud Save to MySQL (Invoked ONLY after user interaction)
  const persistToServer = useCallback(
    async (dataToSave: DeskData) => {
      if (!user?.id) return;
      if (isSavingRef.current) {
        hasPendingWriteRef.current = true;
        return;
      }

      const currentJson = JSON.stringify(dataToSave);
      if (currentJson === lastSavedJsonRef.current) {
        useUIStore.getState().setSaveStatus("saved");
        return;
      }

      isSavingRef.current = true;
      useUIStore.getState().setSaveStatus("saving");

      try {
        const res = await fetch("/api/minddesk/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataToSave }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        if (result?.success) {
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
        useUIStore.getState().setSaveStatus("offline");
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

  // 3. User Interaction Mutator
  const update = useCallback(
    (recipe: (current: DeskData) => DeskData) => {
      isUserDirtyRef.current = true;
      setData((current) => {
        const next = recipe(current);
        latestDataRef.current = next;
        return next;
      });
    },
    []
  );

  // 4. Update Theme, Local Storage, and Debounced Auto-Save (only when dirty)
  useEffect(() => {
    if (existing) return;
    document.documentElement.classList.toggle("dark", data.theme === "dark");
    setTheme?.(data.theme);

    if (ready) {
      // Cache locally
      try {
        if (user?.id) {
          window.localStorage.setItem(
            getUserStorageKey(user.id),
            JSON.stringify(data)
          );
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore local storage quota errors
      }

      // Schedule debounced server save ONLY if user made an actual modification
      if (user?.id && isUserDirtyRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        useUIStore.getState().setSaveStatus("saving");
        saveTimeoutRef.current = setTimeout(() => {
          isUserDirtyRef.current = false;
          persistToServer(latestDataRef.current);
        }, 600);
      }
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, existing, persistToServer, ready, setTheme, user?.id]);

  // 5. Refetch on Window Focus (Cross-device consistency when returning from mobile)
  const refetchFromServer = useCallback(async () => {
    if (!user?.id || isSavingRef.current || isUserDirtyRef.current) return;

    try {
      const res = await fetch("/api/minddesk/sync");
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
      // Ignore background fetch error
    }
  }, [user?.id]);

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

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("minddesk:sync-retry", handleRetry);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("minddesk:sync-retry", handleRetry);
    };
  }, [persistToServer, refetchFromServer, user?.id]);

  // 6. Safe Migration of Local Prototype Data to Cloud Account
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
        update,
        selectedItem,
        setSelectedItem,
        hasUnsyncedLocalData,
        syncLocalDataToAccount,
        refetchFromServer,
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
