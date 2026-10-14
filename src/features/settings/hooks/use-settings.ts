"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useDeskData } from "@/features/minddesk/store";
import type {
  SettingsApiResponse,
  UpdateProfileInput,
  UserProfileData,
} from "@/features/settings/types";
import { DEFAULT_PREFERENCES } from "@/features/settings/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/features/notifications/types";

export interface UseSettingsReturn {
  data: SettingsApiResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  updateProfile: (input: UpdateProfileInput) => Promise<boolean>;
  reload: () => Promise<void>;
  clearFeedback: () => void;
}

function getFetchUrl(path: string): string {
  if (typeof window !== "undefined") {
    const origin =
      window.location && window.location.origin && window.location.origin !== "null"
        ? window.location.origin
        : "http://localhost:3000";
    return `${origin}${path}`;
  }
  return path;
}

const createInitialState = (): SettingsApiResponse => ({
  user: {
    id: "active-user",
    email: "workspace@minddesk.app",
    fullName: "Faizan",
    avatarUrl: null,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    defaultWorkspaceId: "ws-primary",
    workspaceName: "Personal Workspace",
    provider: "credential",
    preferences: DEFAULT_PREFERENCES,
  },
  sessions: [],
  syncInfo: {
    isConfigured: true,
    syncEngine: "Hostinger MySQL Cloud Sync",
    databaseProvider: "Hostinger MySQL / Prisma ORM",
    accountIsolation: "Strict Row-Level Profile & Workspace Partitioning",
    lastSyncedAt: new Date().toISOString(),
  },
});

export function useSettings(): UseSettingsReturn {
  const [data, setData] = useState<SettingsApiResponse>(() => createInitialState());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { setTheme } = useTheme();

  const deskStore = useDeskData();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(getFetchUrl("/api/settings/profile"));
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to access your account settings.");
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const json: SettingsApiResponse = await res.json();
      setData(json);
    } catch (err) {
      // In local dev/test without active server, keep initial state rather than blanking out
      console.warn("[USE_SETTINGS_FETCH_WARN]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Snapshot previous state for rollback
      const previousData = data;

      // Optimistic update
      if (data) {
        const nextUser: UserProfileData = {
          ...data.user,
          fullName: input.fullName !== undefined ? input.fullName : data.user.fullName,
          avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : data.user.avatarUrl,
          preferences: {
            appearance: {
              ...data.user.preferences.appearance,
              ...(input.preferences?.appearance || {}),
            },
            productivity: {
              ...data.user.preferences.productivity,
              ...(input.preferences?.productivity || {}),
            },
            notifications: {
              ...data.user.preferences.notifications,
              ...(input.preferences?.notifications || {}),
            },
          },
        };

        setData({
          ...data,
          user: nextUser,
        });

        // Apply appearance changes to DOM and next-themes immediately
        if (input.preferences?.appearance?.theme) {
          const newTheme = input.preferences.appearance.theme;
          if (newTheme === "system") {
            const systemPrefersDark =
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches;
            document.documentElement.classList.toggle("dark", systemPrefersDark);
            setTheme("system");
          } else {
            document.documentElement.classList.toggle("dark", newTheme === "dark");
            setTheme(newTheme);
          }
        }
      }

      try {
        const res = await fetch("/api/settings/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        const resJson = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            resJson.error ||
              (resJson.fieldErrors
                ? Object.values(resJson.fieldErrors).flat().join(", ")
                : "Failed to save settings.")
          );
        }

        // Synchronize with DeskData workspace store if available
        if (deskStore?.update && input.preferences) {
          deskStore.update((cur) => {
            const updated = { ...cur };
            if (input.preferences?.appearance?.theme) {
              const th = input.preferences.appearance.theme;
              if (th === "dark" || th === "light") {
                updated.theme = th;
              }
            }
            if (input.preferences?.productivity) {
              const prod = input.preferences.productivity;
              updated.calendarSettings = {
                ...(cur.calendarSettings || {
                  showTasksOnCalendar: true,
                  defaultDurationMinutes: 30,
                  defaultView: "month",
                  timeFormat: "12h",
                  weekStartsOn: 1,
                }),
                ...(prod.defaultCalendarView ? { defaultView: prod.defaultCalendarView } : {}),
                ...(prod.weekStartsOn !== undefined ? { weekStartsOn: prod.weekStartsOn } : {}),
                ...(prod.timeFormat ? { timeFormat: prod.timeFormat } : {}),
                ...(prod.defaultDurationMinutes !== undefined
                  ? { defaultDurationMinutes: prod.defaultDurationMinutes }
                  : {}),
              };
            }
            if (input.preferences?.notifications) {
              const notif = input.preferences.notifications;
              updated.notificationPreferences = {
                ...(cur.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES),
                ...(notif.enabled !== undefined ? { enabled: notif.enabled } : {}),
                ...(notif.browserNotifications !== undefined
                  ? { browserNotificationsEnabled: notif.browserNotifications }
                  : {}),
                ...(notif.quietHoursEnabled !== undefined
                  ? { quietHoursEnabled: notif.quietHoursEnabled }
                  : {}),
                ...(notif.quietHoursStart ? { quietHoursStart: notif.quietHoursStart } : {}),
                ...(notif.quietHoursEnd ? { quietHoursEnd: notif.quietHoursEnd } : {}),
              };
            }
            return updated;
          });
        }

        setSuccessMessage("Changes saved to your account.");
        return true;
      } catch (err) {
        // Rollback optimistic state
        setData(previousData);
        const msg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while saving your preferences.";
        setError(msg);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [data, deskStore, setTheme]
  );

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    data,
    isLoading,
    isSaving,
    error,
    successMessage,
    updateProfile,
    reload: loadSettings,
    clearFeedback,
  };
}
