"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  usePomodoroStore,
  initializePomodoroSubsystem,
  registerFocusSessionPersistenceHandler,
  FocusSessionRecord,
  PomodoroSessionType,
  TimeBlockRef,
} from "@/features/pomodoro";
import type { PomodoroPreset, PomodoroState } from "./types";

interface PomodoroContextType {
  state: PomodoroState;
  isFocusModalOpen: boolean;
  startPomodoro: (block?: ScheduledTaskBlock) => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  resetPomodoro: () => void;
  skipPhase: () => void;
  setPreset: (preset: PomodoroPreset, customFocus?: number, customBreak?: number) => void;
  toggleSound: () => void;
  openFocusModal: () => void;
  closeFocusModal: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { addFocusSession, focusSessions } = useCalendar();
  const store = usePomodoroStore();

  // Initialize browser listeners and cross-tab bus
  useEffect(() => {
    const cleanup = initializePomodoroSubsystem();
    return cleanup;
  }, []);

  // Bridge authoritative session completions to MySQL sync repository via addFocusSession
  useEffect(() => {
    const unsubscribe = registerFocusSessionPersistenceHandler((record: FocusSessionRecord) => {
      const dateStr = (record.startedAt || record.completedAt || new Date().toISOString()).slice(0, 10);
      const focusedMins = Math.max(1, Math.round(record.actualDurationSeconds / 60));

      addFocusSession({
        id: record.id,
        sessionId: record.sessionId,
        blockId: record.blockId || undefined,
        blockTitle: record.blockTitle,
        date: dateStr,
        focusedMinutes: focusedMins,
        completedAt: record.completedAt,
        preset: record.sessionType,
        categoryColor: record.categoryColor,
        sessionType: record.sessionType,
        plannedDurationMinutes: record.plannedDurationMinutes,
        actualDurationSeconds: record.actualDurationSeconds,
        startedAt: record.startedAt,
        completed: record.completed,
      });
    });

    return unsubscribe;
  }, [addFocusSession]);

  // Hydrate store history from MySQL-backed focusSessions if present
  useEffect(() => {
    if (focusSessions && focusSessions.length > 0) {
      const currentHistory = usePomodoroStore.getState().history;
      const historyMap = new Map(currentHistory.map((h) => [h.id, h]));
      let added = false;

      for (const fs of focusSessions) {
        if (!historyMap.has(fs.id) && (!fs.sessionId || !currentHistory.some((h) => h.sessionId === fs.sessionId))) {
          const rec: FocusSessionRecord = {
            id: fs.id,
            sessionId: fs.sessionId || fs.id,
            blockId: fs.blockId || null,
            blockTitle: fs.blockTitle,
            categoryColor: fs.categoryColor,
            sessionType: (fs.sessionType as PomodoroSessionType) || "focus",
            plannedDurationMinutes: fs.plannedDurationMinutes || fs.focusedMinutes,
            actualDurationSeconds: fs.actualDurationSeconds || fs.focusedMinutes * 60,
            startedAt: fs.startedAt || `${fs.date}T09:00:00.000Z`,
            completedAt: fs.completedAt || `${fs.date}T09:25:00.000Z`,
            completed: fs.completed !== undefined ? fs.completed : true,
          };
          historyMap.set(fs.id, rec);
          added = true;
        }
      }

      if (added) {
        const merged = Array.from(historyMap.values()).sort(
          (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
        usePomodoroStore.setState({ history: merged });
      }
    }
  }, [focusSessions]);

  // Adapt store state into PomodoroState interface
  const state: PomodoroState = useMemo(() => {
    const isFocus = store.sessionType === "focus";
    const isRunning =
      store.state === "focusing" ||
      store.state === "short_break" ||
      store.state === "long_break";

    const mappedStatus: PomodoroState["status"] = isRunning
      ? "running"
      : store.state === "paused"
      ? "paused"
      : store.state === "completed"
      ? "completed"
      : "idle";

    const mappedPreset: PomodoroPreset =
      store.preset === "25_5" ? "25-5" : store.preset === "50_10" ? "50-10" : "custom";

    const totalFocusedSeconds = store.history
      .filter((h) => h.sessionType === "focus")
      .reduce((acc, curr) => acc + curr.actualDurationSeconds, 0);

    return {
      blockId: store.currentBlock?.id,
      blockTitle: store.currentBlock?.title || (isFocus ? "Quick Focus" : "Rest & Recharge"),
      categoryColor: store.currentBlock?.color || (isFocus ? "#4f46e5" : "#10b981"),
      phase: isFocus ? "focus" : "break",
      status: mappedStatus,
      preset: mappedPreset,
      focusMinutes: store.settings.focusDurationMinutes,
      breakMinutes: store.settings.shortBreakDurationMinutes,
      targetEndTimeMs: store.targetEndTimestamp ?? undefined,
      remainingSeconds: store.remainingSeconds,
      sessionCount: store.completedSessionsCount,
      totalFocusedSeconds,
      soundEnabled: store.settings.soundEnabled,
    };
  }, [store]);

  const startPomodoro = useCallback(
    (block?: ScheduledTaskBlock) => {
      if (block) {
        const ref: TimeBlockRef = {
          id: block.id,
          title: block.title,
          color: block.color,
          plannedDurationMinutes: block.durationMinutes,
          taskId: block.taskId,
          date: block.date,
        };
        store.selectTimeBlock(ref);
        store.start(ref);
      } else {
        store.start();
      }
    },
    [store]
  );

  const pausePomodoro = useCallback(() => {
    store.pause();
  }, [store]);

  const resumePomodoro = useCallback(() => {
    store.resume();
  }, [store]);

  const resetPomodoro = useCallback(() => {
    store.reset();
  }, [store]);

  const skipPhase = useCallback(() => {
    if (store.sessionType === "focus") {
      store.completeSession();
    } else {
      store.skipBreak();
    }
  }, [store]);

  const setPreset = useCallback(
    (preset: PomodoroPreset, customFocus?: number, customBreak?: number) => {
      if (preset === "25-5" || (preset as string) === "25_5") {
        store.setPreset("25_5");
      } else if (preset === "50-10" || (preset as string) === "50_10") {
        store.setPreset("50_10");
      } else {
        store.setPreset("custom", {
          focusDurationMinutes: customFocus && customFocus > 0 ? customFocus : 30,
          shortBreakDurationMinutes: customBreak && customBreak > 0 ? customBreak : 5,
        });
      }
    },
    [store]
  );

  const toggleSound = useCallback(() => {
    store.updateSettings({ soundEnabled: !store.settings.soundEnabled });
  }, [store]);

  const openFocusModal = useCallback(() => {
    store.setFocusModeOpen(true);
  }, [store]);

  const closeFocusModal = useCallback(() => {
    store.setFocusModeOpen(false);
  }, [store]);

  return (
    <PomodoroContext.Provider
      value={{
        state,
        isFocusModalOpen: store.isFocusModeOpen,
        startPomodoro,
        pausePomodoro,
        resumePomodoro,
        resetPomodoro,
        skipPhase,
        setPreset,
        toggleSound,
        openFocusModal,
        closeFocusModal,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextType {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return ctx;
}
