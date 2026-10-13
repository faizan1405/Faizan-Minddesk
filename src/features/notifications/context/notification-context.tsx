"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { parseISO, addMinutes } from "date-fns";
import type {
  NotificationRecord,
  NotificationPreferences,
} from "../types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types";
import { useCalendar } from "@/features/calendar/calendar-context";
import { useOptionalDeskData } from "@/features/minddesk/store";
import { useHabits } from "@/features/habits/context/habits-context";
import {
  loadMindDeskStore,
  saveMindDeskStore,
  STORAGE_EVENT_NAME,
} from "@/features/calendar/services/calendar-storage";
import {
  evaluateAllSmartReminders,
  sendBrowserNotification,
} from "../services/notification-scheduler";

export interface NotificationContextType {
  notifications: NotificationRecord[];
  activeNotifications: NotificationRecord[];
  unreadCount: number;
  preferences: NotificationPreferences;
  activeToast: NotificationRecord | null;

  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  snoozeNotification: (id: string, minutes: number) => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  requestBrowserPermission: () => Promise<NotificationPermission | "unsupported">;
  clearActiveToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const calendarContext = useCalendar();
  const habitsContext = useHabits();
  const deskContext = useOptionalDeskData();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [activeToast, setActiveToast] = useState<NotificationRecord | null>(null);

  // Load from store on mount
  useEffect(() => {
    const store = loadMindDeskStore();
    if (store.notifications && Array.isArray(store.notifications)) {
      setNotifications(store.notifications);
    }
    if (store.notificationPreferences && typeof store.notificationPreferences === "object") {
      setPreferences({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...store.notificationPreferences,
      });
    }

    const handleStorageChange = () => {
      const updated = loadMindDeskStore();
      if (updated.notifications) setNotifications(updated.notifications);
      if (updated.notificationPreferences) {
        setPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...updated.notificationPreferences,
        });
      }
    };

    window.addEventListener(STORAGE_EVENT_NAME, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const persistNotificationsData = useCallback(
    (nextNotifs: NotificationRecord[], nextPrefs?: NotificationPreferences) => {
      setNotifications(nextNotifs);
      if (nextPrefs) setPreferences(nextPrefs);

      const store = loadMindDeskStore();
      const updated = {
        ...store,
        notifications: nextNotifs,
        notificationPreferences: nextPrefs ?? preferences,
      };
      saveMindDeskStore(updated);

      if (deskContext?.update) {
        deskContext.update((curr) => ({
          ...curr,
          notifications: nextNotifs,
          notificationPreferences: nextPrefs ?? curr.notificationPreferences,
        }));
      }
    },
    [preferences, deskContext]
  );

  // Runtime reminder evaluation
  const runEvaluation = useCallback(() => {
    if (!calendarContext || !habitsContext) return;

    const now = new Date();

    // Check snoozed items: if snooze expired, revive them
    let hasRevivedSnooze = false;
    const currentNotifs = notifications.map((n) => {
      if (n.snoozedUntil && new Date() >= parseISO(n.snoozedUntil)) {
        hasRevivedSnooze = true;
        return {
          ...n,
          snoozedUntil: null,
          read: false,
          dismissed: false,
        };
      }
      return n;
    });

    const newlyGenerated = evaluateAllSmartReminders({
      tasks: calendarContext.tasks || [],
      events: calendarContext.events || [],
      scheduledBlocks: calendarContext.scheduledBlocks || [],
      habits: habitsContext.habits || [],
      habitCompletions: habitsContext.habitCompletions || [],
      routines: habitsContext.routines || [],
      routineSessions: habitsContext.routineSessions || [],
      preferences,
      existingNotifications: currentNotifs,
      now,
    });

    if (newlyGenerated.length > 0 || hasRevivedSnooze) {
      const merged = [...newlyGenerated, ...currentNotifs];
      persistNotificationsData(merged);

      // Trigger toast & browser notification for first new item
      if (newlyGenerated.length > 0) {
        const topItem = newlyGenerated[0];
        setActiveToast(topItem);

        if (preferences.browserNotificationsEnabled) {
          sendBrowserNotification(topItem.title, topItem.message, topItem.actionUrl);
        }
      }
    }
  }, [
    calendarContext,
    habitsContext,
    notifications,
    preferences,
    persistNotificationsData,
  ]);

  // Singleton heartbeat interval (every 30s) + visibility change recovery
  useEffect(() => {
    // Initial run on mount
    runEvaluation();

    const interval = setInterval(() => {
      runEvaluation();
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runEvaluation();
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [runEvaluation]);

  // Mark as read
  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      persistNotificationsData(updated);
      if (activeToast?.id === id) {
        setActiveToast(null);
      }
    },
    [notifications, activeToast, persistNotificationsData]
  );

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotificationsData(updated);
    setActiveToast(null);
  }, [notifications, persistNotificationsData]);

  // Dismiss notification
  const dismissNotification = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n));
      persistNotificationsData(updated);
      if (activeToast?.id === id) {
        setActiveToast(null);
      }
    },
    [notifications, activeToast, persistNotificationsData]
  );

  // Smart Snooze
  const snoozeNotification = useCallback(
    (id: string, minutes: number) => {
      const snoozedUntil = addMinutes(new Date(), minutes).toISOString();
      const updated = notifications.map((n) =>
        n.id === id
          ? {
              ...n,
              snoozedUntil,
              read: true,
            }
          : n
      );
      persistNotificationsData(updated);
      if (activeToast?.id === id) {
        setActiveToast(null);
      }
    },
    [notifications, activeToast, persistNotificationsData]
  );

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      const next = { ...preferences, ...updates };
      persistNotificationsData(notifications, next);
    },
    [preferences, notifications, persistNotificationsData]
  );

  // Request browser permission
  const requestBrowserPermission = useCallback(async (): Promise<
    NotificationPermission | "unsupported"
  > => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        updatePreferences({ browserNotificationsEnabled: true });
      } else {
        updatePreferences({ browserNotificationsEnabled: false });
      }
      return perm;
    } catch {
      return "denied";
    }
  }, [updatePreferences]);

  const clearActiveToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const activeNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.dismissed) return false;
      if (n.snoozedUntil && new Date() < parseISO(n.snoozedUntil)) return false;
      return true;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.read).length;
  }, [activeNotifications]);

  const value = useMemo(
    () => ({
      notifications,
      activeNotifications,
      unreadCount,
      preferences,
      activeToast,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      snoozeNotification,
      updatePreferences,
      requestBrowserPermission,
      clearActiveToast,
    }),
    [
      notifications,
      activeNotifications,
      unreadCount,
      preferences,
      activeToast,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      snoozeNotification,
      updatePreferences,
      requestBrowserPermission,
      clearActiveToast,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
