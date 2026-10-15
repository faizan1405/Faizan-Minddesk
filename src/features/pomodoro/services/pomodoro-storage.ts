/**
 * MINDDESK — POMODORO & FOCUS SUBSYSTEM
 * Persistence Layer
 *
 * Implements non-destructive, schema-validated local storage persistence
 * for active timer state, settings, and session history records.
 */

import {
  ActiveTimerSnapshot,
  FocusSessionRecord,
  PomodoroSettings,
  BlockFocusSummary,
  TimeBlockRef,
} from "../types";

export const POMODORO_STORAGE_KEYS = {
  ACTIVE: "minddesk:pomodoro-active-v1",
  SETTINGS: "minddesk:pomodoro-settings-v1",
  HISTORY: "minddesk:pomodoro-history-v1",
} as const;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusDurationMinutes: 25,
  shortBreakDurationMinutes: 5,
  longBreakDurationMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 0.7,
  notificationsEnabled: false,
};

export const DEFAULT_ACTIVE_TIMER: ActiveTimerSnapshot = {
  state: "idle",
  sessionType: "focus",
  preset: "25_5",
  targetSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  startTimestamp: null,
  targetEndTimestamp: null,
  pausedAtTimestamp: null,
  elapsedBeforePauseSeconds: 0,
  completedSessionsCount: 0,
  currentBlock: null,
  sessionId: "",
  lastTickTimestamp: 0,
};

/**
 * Loads persisted settings or returns defaults.
 */
export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === "undefined") return { ...DEFAULT_POMODORO_SETTINGS };

  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_POMODORO_SETTINGS };

    const parsed = JSON.parse(raw);
    return {
      focusDurationMinutes:
        typeof parsed.focusDurationMinutes === "number" && parsed.focusDurationMinutes > 0
          ? parsed.focusDurationMinutes
          : DEFAULT_POMODORO_SETTINGS.focusDurationMinutes,
      shortBreakDurationMinutes:
        typeof parsed.shortBreakDurationMinutes === "number" && parsed.shortBreakDurationMinutes > 0
          ? parsed.shortBreakDurationMinutes
          : DEFAULT_POMODORO_SETTINGS.shortBreakDurationMinutes,
      longBreakDurationMinutes:
        typeof parsed.longBreakDurationMinutes === "number" && parsed.longBreakDurationMinutes > 0
          ? parsed.longBreakDurationMinutes
          : DEFAULT_POMODORO_SETTINGS.longBreakDurationMinutes,
      longBreakInterval:
        typeof parsed.longBreakInterval === "number" && parsed.longBreakInterval > 0
          ? parsed.longBreakInterval
          : DEFAULT_POMODORO_SETTINGS.longBreakInterval,
      autoStartBreaks: Boolean(parsed.autoStartBreaks),
      autoStartFocus: Boolean(parsed.autoStartFocus),
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
      soundVolume:
        typeof parsed.soundVolume === "number"
          ? Math.max(0, Math.min(1, parsed.soundVolume))
          : DEFAULT_POMODORO_SETTINGS.soundVolume,
      notificationsEnabled: Boolean(parsed.notificationsEnabled),
    };
  } catch {
    return { ...DEFAULT_POMODORO_SETTINGS };
  }
}

/**
 * Saves settings to localStorage.
 */
export function savePomodoroSettings(settings: PomodoroSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(POMODORO_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("[Pomodoro Storage] Failed to persist settings:", error);
  }
}

/**
 * Loads the active timer state.
 */
export function loadActiveTimerSnapshot(): ActiveTimerSnapshot {
  if (typeof window === "undefined") return { ...DEFAULT_ACTIVE_TIMER };

  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEYS.ACTIVE);
    if (!raw) return { ...DEFAULT_ACTIVE_TIMER };

    const parsed = JSON.parse(raw);
    return {
      state: parsed.state || "idle",
      sessionType: parsed.sessionType || "focus",
      preset: parsed.preset || "25_5",
      targetSeconds: typeof parsed.targetSeconds === "number" ? parsed.targetSeconds : 25 * 60,
      remainingSeconds: typeof parsed.remainingSeconds === "number" ? parsed.remainingSeconds : 25 * 60,
      startTimestamp: typeof parsed.startTimestamp === "number" ? parsed.startTimestamp : null,
      targetEndTimestamp: typeof parsed.targetEndTimestamp === "number" ? parsed.targetEndTimestamp : null,
      pausedAtTimestamp: typeof parsed.pausedAtTimestamp === "number" ? parsed.pausedAtTimestamp : null,
      elapsedBeforePauseSeconds:
        typeof parsed.elapsedBeforePauseSeconds === "number" ? parsed.elapsedBeforePauseSeconds : 0,
      completedSessionsCount:
        typeof parsed.completedSessionsCount === "number" ? parsed.completedSessionsCount : 0,
      currentBlock: parsed.currentBlock || null,
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : "",
      lastTickTimestamp: typeof parsed.lastTickTimestamp === "number" ? parsed.lastTickTimestamp : 0,
    };
  } catch {
    return { ...DEFAULT_ACTIVE_TIMER };
  }
}

/**
 * Persists active timer snapshot.
 */
export function saveActiveTimerSnapshot(snapshot: ActiveTimerSnapshot): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(POMODORO_STORAGE_KEYS.ACTIVE, JSON.stringify(snapshot));
  } catch (error) {
    console.error("[Pomodoro Storage] Failed to persist active timer:", error);
  }
}

/**
 * Clears active timer snapshot.
 */
export function clearActiveTimerSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(POMODORO_STORAGE_KEYS.ACTIVE);
  } catch {
    // Ignore
  }
}

/**
 * Loads full focus session history.
 */
export function loadFocusHistory(): FocusSessionRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEYS.HISTORY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is FocusSessionRecord =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.actualDurationSeconds === "number" &&
        typeof item.startedAt === "string"
    );
  } catch {
    return [];
  }
}

export type FocusSessionPersistenceHandler = (record: FocusSessionRecord) => void;
const persistenceHandlers: Set<FocusSessionPersistenceHandler> = new Set();

export function registerFocusSessionPersistenceHandler(
  handler: FocusSessionPersistenceHandler
): () => void {
  persistenceHandlers.add(handler);
  return () => {
    persistenceHandlers.delete(handler);
  };
}

export function notifyFocusSessionPersistence(record: FocusSessionRecord): void {
  persistenceHandlers.forEach((handler) => {
    try {
      handler(record);
    } catch (err) {
      console.error("[Pomodoro Storage] Persistence handler error:", err);
    }
  });
}

/**
 * Persists a new focus session record non-destructively, preventing duplicates by id or sessionId.
 */
export function appendFocusSessionRecord(record: FocusSessionRecord): FocusSessionRecord[] {
  if (typeof window === "undefined") {
    notifyFocusSessionPersistence(record);
    return [record];
  }

  try {
    const existing = loadFocusHistory();
    // Prevent duplicate entries by deterministic ID or active cycle sessionId
    const duplicateIndex = existing.findIndex(
      (s) =>
        s.id === record.id ||
        (Boolean(s.sessionId) &&
          Boolean(record.sessionId) &&
          s.sessionId === record.sessionId)
    );
    if (duplicateIndex !== -1) {
      return existing;
    }

    const updated = [record, ...existing];
    window.localStorage.setItem(POMODORO_STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    notifyFocusSessionPersistence(record);
    return updated;
  } catch (error) {
    console.error("[Pomodoro Storage] Failed to append focus record:", error);
    notifyFocusSessionPersistence(record);
    return [record];
  }
}

/**
 * Calculates total actual focused seconds and minutes for a specific block or overall.
 */
export function getBlockFocusSummary(blockId: string, history?: FocusSessionRecord[]): BlockFocusSummary {
  const records = history || loadFocusHistory();
  const blockRecords = records.filter(
    (r) => r.blockId === blockId && r.sessionType === "focus"
  );

  const totalFocusedSeconds = blockRecords.reduce((acc, curr) => acc + curr.actualDurationSeconds, 0);
  const totalFocusedMinutes = Math.round(totalFocusedSeconds / 60);

  return {
    blockId,
    totalFocusedSeconds,
    totalFocusedMinutes,
    completedSessions: blockRecords.filter((r) => r.completed).length,
    history: blockRecords,
  };
}

/**
 * Enriches a TimeBlockRef with actual focused minutes computed from persisted history.
 */
export function enrichBlockWithActualFocus(block: TimeBlockRef, history?: FocusSessionRecord[]): TimeBlockRef {
  const summary = getBlockFocusSummary(block.id, history);
  return {
    ...block,
    actualFocusedMinutes: summary.totalFocusedMinutes,
  };
}
