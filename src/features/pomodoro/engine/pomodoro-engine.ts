/**
 * MINDDESK — POMODORO & FOCUS SUBSYSTEM
 * Central Pomodoro Engine & State Store
 *
 * Implements absolute timestamp-driven calculations, sleep/resume synchronization,
 * cross-tab synchronization, and separation of planned time from actual focused time.
 */

import { create } from "zustand";
import {
  PomodoroState,
  PomodoroSessionType,
  PomodoroPreset,
  PomodoroSettings,
  TimeBlockRef,
  FocusSessionRecord,
  ActiveTimerSnapshot,
} from "../types";
import {
  DEFAULT_POMODORO_SETTINGS,
  DEFAULT_ACTIVE_TIMER,
  loadPomodoroSettings,
  savePomodoroSettings,
  loadActiveTimerSnapshot,
  saveActiveTimerSnapshot,
  loadFocusHistory,
  appendFocusSessionRecord,
  enrichBlockWithActualFocus,
} from "../services/pomodoro-storage";
import { soundService } from "../services/sound-service";
import { notificationService } from "../services/notification-service";
import { crossTabSyncBus } from "../services/cross-tab-sync";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "sess-" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export interface PomodoroEngineStore extends ActiveTimerSnapshot {
  settings: PomodoroSettings;
  history: FocusSessionRecord[];
  isFocusModeOpen: boolean;
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;

  // Actions
  start: (block?: TimeBlockRef) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skipBreak: () => void;
  endSession: (completed?: boolean) => void;
  completeSession: () => void;
  setPreset: (preset: PomodoroPreset, customSettings?: Partial<PomodoroSettings>) => void;
  updateSettings: (updates: Partial<PomodoroSettings>) => void;
  selectTimeBlock: (block: TimeBlockRef | null) => void;
  clearTimeBlock: () => void;
  setFocusModeOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  recheckTimingAfterSleep: () => void;
  syncFromRemote: (snapshot: ActiveTimerSnapshot) => void;
}

let tickIntervalId: NodeJS.Timeout | null = null;
let isInitialized = false;

export const usePomodoroStore = create<PomodoroEngineStore>((set, get) => {
  const initialSettings = typeof window !== "undefined" ? loadPomodoroSettings() : DEFAULT_POMODORO_SETTINGS;
  const initialSnapshot = typeof window !== "undefined" ? loadActiveTimerSnapshot() : DEFAULT_ACTIVE_TIMER;
  const initialHistory = typeof window !== "undefined" ? loadFocusHistory() : [];

  return {
    ...initialSnapshot,
    settings: initialSettings,
    history: initialHistory,
    isFocusModeOpen: false,
    isSettingsOpen: false,
    isHistoryOpen: false,

    start: (blockRef) => {
      const state = get();
      const currentBlock = blockRef || state.currentBlock;
      const targetSeconds = state.targetSeconds > 0 ? state.targetSeconds : state.settings.focusDurationMinutes * 60;
      const remainingSeconds = state.remainingSeconds > 0 ? state.remainingSeconds : targetSeconds;

      const now = Date.now();
      const targetEndTimestamp = now + remainingSeconds * 1000;
      const runningState: PomodoroState =
        state.sessionType === "focus"
          ? "focusing"
          : state.sessionType === "short_break"
          ? "short_break"
          : "long_break";

      const sessionId = state.sessionId || generateUUID();

      const nextSnapshot: ActiveTimerSnapshot = {
        state: runningState,
        sessionType: state.sessionType,
        preset: state.preset,
        targetSeconds,
        remainingSeconds,
        startTimestamp: now,
        targetEndTimestamp,
        pausedAtTimestamp: null,
        elapsedBeforePauseSeconds: state.elapsedBeforePauseSeconds || 0,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: currentBlock ? enrichBlockWithActualFocus(currentBlock, state.history) : null,
        sessionId,
        lastTickTimestamp: now,
      };

      set(nextSnapshot);
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

      if (state.settings.soundEnabled) {
        soundService.playStartCue(state.settings.soundVolume);
      }

      startTicker();
    },

    pause: () => {
      const state = get();
      if (state.state !== "focusing" && state.state !== "short_break" && state.state !== "long_break") {
        return;
      }

      const now = Date.now();
      let remaining = state.remainingSeconds;
      if (state.targetEndTimestamp) {
        remaining = Math.max(0, Math.ceil((state.targetEndTimestamp - now) / 1000));
      }

      const elapsedDuringThisRun = state.startTimestamp ? Math.max(0, Math.floor((now - state.startTimestamp) / 1000)) : 0;
      const elapsedBeforePause = state.elapsedBeforePauseSeconds + elapsedDuringThisRun;

      const nextSnapshot: ActiveTimerSnapshot = {
        state: "paused",
        sessionType: state.sessionType,
        preset: state.preset,
        targetSeconds: state.targetSeconds,
        remainingSeconds: remaining,
        startTimestamp: null,
        targetEndTimestamp: null,
        pausedAtTimestamp: now,
        elapsedBeforePauseSeconds: elapsedBeforePause,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: state.currentBlock,
        sessionId: state.sessionId,
        lastTickTimestamp: now,
      };

      set(nextSnapshot);
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

      stopTicker();
    },

    resume: () => {
      const state = get();
      if (state.state !== "paused") return;

      const now = Date.now();
      const targetEndTimestamp = now + state.remainingSeconds * 1000;
      const runningState: PomodoroState =
        state.sessionType === "focus"
          ? "focusing"
          : state.sessionType === "short_break"
          ? "short_break"
          : "long_break";

      const nextSnapshot: ActiveTimerSnapshot = {
        state: runningState,
        sessionType: state.sessionType,
        preset: state.preset,
        targetSeconds: state.targetSeconds,
        remainingSeconds: state.remainingSeconds,
        startTimestamp: now,
        targetEndTimestamp,
        pausedAtTimestamp: null,
        elapsedBeforePauseSeconds: state.elapsedBeforePauseSeconds,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: state.currentBlock,
        sessionId: state.sessionId || generateUUID(),
        lastTickTimestamp: now,
      };

      set(nextSnapshot);
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

      if (state.settings.soundEnabled) {
        soundService.playStartCue(state.settings.soundVolume);
      }

      startTicker();
    },

    reset: () => {
      const state = get();
      let defaultDuration = state.settings.focusDurationMinutes * 60;
      if (state.sessionType === "short_break") {
        defaultDuration = state.settings.shortBreakDurationMinutes * 60;
      } else if (state.sessionType === "long_break") {
        defaultDuration = state.settings.longBreakDurationMinutes * 60;
      }

      const nextSnapshot: ActiveTimerSnapshot = {
        state: "idle",
        sessionType: state.sessionType,
        preset: state.preset,
        targetSeconds: defaultDuration,
        remainingSeconds: defaultDuration,
        startTimestamp: null,
        targetEndTimestamp: null,
        pausedAtTimestamp: null,
        elapsedBeforePauseSeconds: 0,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: state.currentBlock,
        sessionId: "",
        lastTickTimestamp: Date.now(),
      };

      set(nextSnapshot);
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

      stopTicker();
    },

    skipBreak: () => {
      const state = get();
      const focusDuration = state.settings.focusDurationMinutes * 60;

      const nextSnapshot: ActiveTimerSnapshot = {
        state: "idle",
        sessionType: "focus",
        preset: state.preset,
        targetSeconds: focusDuration,
        remainingSeconds: focusDuration,
        startTimestamp: null,
        targetEndTimestamp: null,
        pausedAtTimestamp: null,
        elapsedBeforePauseSeconds: 0,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: state.currentBlock,
        sessionId: "",
        lastTickTimestamp: Date.now(),
      };

      set(nextSnapshot);
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

      stopTicker();
    },

    endSession: (completed = false) => {
      const state = get();
      const now = Date.now();

      // Compute actual elapsed seconds
      let actualElapsed = state.elapsedBeforePauseSeconds;
      if (state.startTimestamp && (state.state === "focusing" || state.state === "short_break" || state.state === "long_break")) {
        actualElapsed += Math.max(0, Math.floor((now - state.startTimestamp) / 1000));
      }
      actualElapsed = Math.min(state.targetSeconds, Math.max(0, actualElapsed));

      // Only log if at least 15 seconds were elapsed or explicitly marked complete
      if (actualElapsed >= 15 || completed) {
        const record: FocusSessionRecord = {
          id: generateUUID(),
          sessionId: state.sessionId || generateUUID(),
          blockId: state.currentBlock?.id || null,
          blockTitle: state.currentBlock?.title || (state.sessionType === "focus" ? "Deep Focus" : "Recharge Break"),
          categoryColor: state.currentBlock?.color,
          sessionType: state.sessionType,
          plannedDurationMinutes: Math.round(state.targetSeconds / 60),
          actualDurationSeconds: actualElapsed,
          startedAt: new Date(now - actualElapsed * 1000).toISOString(),
          completedAt: new Date(now).toISOString(),
          completed,
        };

        const updatedHistory = appendFocusSessionRecord(record);
        set({ history: updatedHistory });
        crossTabSyncBus.broadcast({ type: "SESSION_RECORD_ADDED", payload: record });
      }

      state.reset();
    },

    completeSession: () => {
      const state = get();

      // Safeguard against duplicate session logging across tabs
      if (state.sessionId && state.history.some((h) => h.sessionId === state.sessionId)) {
        state.reset();
        return;
      }

      const now = Date.now();
      const isFocus = state.sessionType === "focus";

      // 1. Record completed session in history
      const record: FocusSessionRecord = {
        id: generateUUID(),
        sessionId: state.sessionId || generateUUID(),
        blockId: state.currentBlock?.id || null,
        blockTitle: state.currentBlock?.title || (isFocus ? "Deep Focus" : "Recharge Break"),
        categoryColor: state.currentBlock?.color,
        sessionType: state.sessionType,
        plannedDurationMinutes: Math.round(state.targetSeconds / 60),
        actualDurationSeconds: state.targetSeconds,
        startedAt: new Date(now - state.targetSeconds * 1000).toISOString(),
        completedAt: new Date(now).toISOString(),
        completed: true,
      };

      const updatedHistory = appendFocusSessionRecord(record);
      crossTabSyncBus.broadcast({ type: "SESSION_RECORD_ADDED", payload: record });

      // 2. Play sound chime and send notification
      if (state.settings.soundEnabled) {
        soundService.playCompletionChime(state.settings.soundVolume);
      }

      const nextCompletedCount = isFocus ? state.completedSessionsCount + 1 : state.completedSessionsCount;
      const nextIsLongBreak = isFocus && nextCompletedCount > 0 && nextCompletedCount % state.settings.longBreakInterval === 0;

      if (state.settings.notificationsEnabled) {
        if (isFocus) {
          notificationService.notifyFocusCompleted(record.blockTitle, nextIsLongBreak);
        } else {
          notificationService.notifyBreakCompleted(state.currentBlock?.title || "Next Focus Session");
        }
      }

      // 3. Transition to next state
      if (isFocus) {
        const nextSessionType: PomodoroSessionType = nextIsLongBreak ? "long_break" : "short_break";
        const breakSeconds = nextIsLongBreak
          ? state.settings.longBreakDurationMinutes * 60
          : state.settings.shortBreakDurationMinutes * 60;

        const shouldAutoStart = state.settings.autoStartBreaks;
        const targetEndTimestamp = shouldAutoStart ? now + breakSeconds * 1000 : null;
        const nextRunningState: PomodoroState = shouldAutoStart ? (nextIsLongBreak ? "long_break" : "short_break") : "idle";

        const nextSnapshot: ActiveTimerSnapshot = {
          state: nextRunningState,
          sessionType: nextSessionType,
          preset: state.preset,
          targetSeconds: breakSeconds,
          remainingSeconds: breakSeconds,
          startTimestamp: shouldAutoStart ? now : null,
          targetEndTimestamp,
          pausedAtTimestamp: null,
          elapsedBeforePauseSeconds: 0,
          completedSessionsCount: nextCompletedCount,
          currentBlock: state.currentBlock ? enrichBlockWithActualFocus(state.currentBlock, updatedHistory) : null,
          sessionId: shouldAutoStart ? generateUUID() : "",
          lastTickTimestamp: now,
        };

        set({ ...nextSnapshot, history: updatedHistory });
        saveActiveTimerSnapshot(nextSnapshot);
        crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

        if (shouldAutoStart) {
          startTicker();
        } else {
          stopTicker();
        }
      } else {
        // Break finished -> Transition to focus
        const focusSeconds = state.settings.focusDurationMinutes * 60;
        const shouldAutoStart = state.settings.autoStartFocus;
        const targetEndTimestamp = shouldAutoStart ? now + focusSeconds * 1000 : null;
        const nextRunningState: PomodoroState = shouldAutoStart ? "focusing" : "idle";

        const nextSnapshot: ActiveTimerSnapshot = {
          state: nextRunningState,
          sessionType: "focus",
          preset: state.preset,
          targetSeconds: focusSeconds,
          remainingSeconds: focusSeconds,
          startTimestamp: shouldAutoStart ? now : null,
          targetEndTimestamp,
          pausedAtTimestamp: null,
          elapsedBeforePauseSeconds: 0,
          completedSessionsCount: state.completedSessionsCount,
          currentBlock: state.currentBlock ? enrichBlockWithActualFocus(state.currentBlock, updatedHistory) : null,
          sessionId: shouldAutoStart ? generateUUID() : "",
          lastTickTimestamp: now,
        };

        set({ ...nextSnapshot, history: updatedHistory });
        saveActiveTimerSnapshot(nextSnapshot);
        crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });

        if (shouldAutoStart) {
          startTicker();
        } else {
          stopTicker();
        }
      }
    },

    setPreset: (preset, customSettings) => {
      const state = get();
      let updatedSettings = { ...state.settings };

      if (preset === "25_5") {
        updatedSettings = {
          ...updatedSettings,
          focusDurationMinutes: 25,
          shortBreakDurationMinutes: 5,
        };
      } else if (preset === "50_10") {
        updatedSettings = {
          ...updatedSettings,
          focusDurationMinutes: 50,
          shortBreakDurationMinutes: 10,
        };
      } else if (customSettings) {
        updatedSettings = {
          ...updatedSettings,
          ...customSettings,
        };
      }

      savePomodoroSettings(updatedSettings);

      const targetDuration =
        state.sessionType === "focus"
          ? updatedSettings.focusDurationMinutes * 60
          : state.sessionType === "short_break"
          ? updatedSettings.shortBreakDurationMinutes * 60
          : updatedSettings.longBreakDurationMinutes * 60;

      // If idle, apply new duration immediately
      const isIdle = state.state === "idle";
      const nextRemaining = isIdle ? targetDuration : state.remainingSeconds;
      const nextTarget = isIdle ? targetDuration : state.targetSeconds;

      const nextSnapshot: ActiveTimerSnapshot = {
        state: state.state,
        sessionType: state.sessionType,
        preset,
        targetSeconds: nextTarget,
        remainingSeconds: nextRemaining,
        startTimestamp: state.startTimestamp,
        targetEndTimestamp: state.targetEndTimestamp,
        pausedAtTimestamp: state.pausedAtTimestamp,
        elapsedBeforePauseSeconds: state.elapsedBeforePauseSeconds,
        completedSessionsCount: state.completedSessionsCount,
        currentBlock: state.currentBlock,
        sessionId: state.sessionId,
        lastTickTimestamp: Date.now(),
      };

      set({ ...nextSnapshot, settings: updatedSettings });
      saveActiveTimerSnapshot(nextSnapshot);
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: nextSnapshot });
    },

    updateSettings: (updates) => {
      const state = get();
      const updated = { ...state.settings, ...updates };
      savePomodoroSettings(updated);
      set({ settings: updated });
      crossTabSyncBus.broadcast({ type: "SETTINGS_UPDATED", payload: updated });
    },

    selectTimeBlock: (block) => {
      const state = get();
      if (!block) {
        set({ currentBlock: null });
        saveActiveTimerSnapshot({ ...get() });
        return;
      }

      const enriched = enrichBlockWithActualFocus(block, state.history);
      set({ currentBlock: enriched });
      saveActiveTimerSnapshot({ ...get() });
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: get() });
    },

    clearTimeBlock: () => {
      set({ currentBlock: null });
      saveActiveTimerSnapshot({ ...get() });
      crossTabSyncBus.broadcast({ type: "TIMER_STATE_SYNC", payload: get() });
    },

    setFocusModeOpen: (open) => {
      set({ isFocusModeOpen: open });
    },

    setSettingsOpen: (open) => {
      set({ isSettingsOpen: open });
    },

    setHistoryOpen: (open) => {
      set({ isHistoryOpen: open });
    },

    recheckTimingAfterSleep: () => {
      const state = get();
      if (state.state !== "focusing" && state.state !== "short_break" && state.state !== "long_break") {
        return;
      }

      if (!state.targetEndTimestamp) return;

      const now = Date.now();
      const diffMs = state.targetEndTimestamp - now;

      if (diffMs <= 0) {
        // Timer completed during backgrounding or device sleep!
        state.completeSession();
      } else {
        const remaining = Math.max(0, Math.ceil(diffMs / 1000));
        if (remaining !== state.remainingSeconds) {
          set({ remainingSeconds: remaining, lastTickTimestamp: now });
        }
      }
    },

    syncFromRemote: (remoteSnapshot) => {
      const current = get();
      // Only apply if the snapshot differs
      if (
        current.state !== remoteSnapshot.state ||
        current.remainingSeconds !== remoteSnapshot.remainingSeconds ||
        current.sessionType !== remoteSnapshot.sessionType
      ) {
        set({ ...remoteSnapshot });
        if (
          remoteSnapshot.state === "focusing" ||
          remoteSnapshot.state === "short_break" ||
          remoteSnapshot.state === "long_break"
        ) {
          startTicker();
        } else {
          stopTicker();
        }
      }
    },
  };
});

function startTicker() {
  if (tickIntervalId) return;

  tickIntervalId = setInterval(() => {
    const store = usePomodoroStore.getState();
    if (store.state !== "focusing" && store.state !== "short_break" && store.state !== "long_break") {
      stopTicker();
      return;
    }

    if (!store.targetEndTimestamp) return;

    const now = Date.now();
    const diffMs = store.targetEndTimestamp - now;

    if (diffMs <= 0) {
      store.completeSession();
    } else {
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      if (remaining !== store.remainingSeconds) {
        usePomodoroStore.setState({ remainingSeconds: remaining, lastTickTimestamp: now });
      }
    }
  }, 250);
}

function stopTicker() {
  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
}

/**
 * Initializes global browser event listeners (visibility change, window focus, cross-tab bus).
 * Safe to call on client-side mount.
 */
export function initializePomodoroSubsystem(): () => void {
  if (typeof window === "undefined" || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  const handleVisibilityOrFocus = () => {
    usePomodoroStore.getState().recheckTimingAfterSleep();
  };

  document.addEventListener("visibilitychange", handleVisibilityOrFocus);
  window.addEventListener("focus", handleVisibilityOrFocus);

  const unsubscribeSync = crossTabSyncBus.subscribe((message) => {
    if (message.type === "TIMER_STATE_SYNC") {
      usePomodoroStore.getState().syncFromRemote(message.payload);
    } else if (message.type === "SESSION_RECORD_ADDED") {
      const existing = usePomodoroStore.getState().history;
      const isDuplicate = existing.some(
        (r) =>
          r.id === message.payload.id ||
          (Boolean(r.sessionId) &&
            Boolean(message.payload.sessionId) &&
            r.sessionId === message.payload.sessionId)
      );
      if (!isDuplicate) {
        usePomodoroStore.setState({ history: [message.payload, ...existing] });
      }
    } else if (message.type === "SETTINGS_UPDATED") {
      usePomodoroStore.setState({ settings: message.payload });
    }
  });

  // Recheck immediately upon initialization
  usePomodoroStore.getState().recheckTimingAfterSleep();

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    window.removeEventListener("focus", handleVisibilityOrFocus);
    unsubscribeSync();
    stopTicker();
    isInitialized = false;
  };
}
