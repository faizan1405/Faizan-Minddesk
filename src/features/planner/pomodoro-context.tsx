"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { format } from "date-fns";
import type { ScheduledTaskBlock } from "@/features/calendar/types";
import { useCalendar } from "@/features/calendar/calendar-context";
import type { PomodoroPreset, PomodoroState } from "./types";
import { playChimeSound, playTickSound } from "./utils/sound-effects";

const POMODORO_STORAGE_KEY = "minddesk_pomodoro_state";

const DEFAULT_POMODORO_STATE: PomodoroState = {
  blockId: undefined,
  blockTitle: "Quick Focus",
  categoryColor: "#4f46e5",
  phase: "focus",
  status: "idle",
  preset: "25-5",
  focusMinutes: 25,
  breakMinutes: 5,
  targetEndTimeMs: undefined,
  remainingSeconds: 25 * 60,
  sessionCount: 0,
  totalFocusedSeconds: 0,
  soundEnabled: true,
};

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
  const { addFocusSession } = useCalendar();

  const [state, setState] = useState<PomodoroState>(() => {
    if (typeof window === "undefined") return DEFAULT_POMODORO_STATE;
    try {
      const stored = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (stored) {
        const parsed: PomodoroState = JSON.parse(stored);
        // Refresh recovery: if it was running, recalculate remainingSeconds from targetEndTimeMs
        if (parsed.status === "running" && parsed.targetEndTimeMs) {
          const now = Date.now();
          const diff = Math.round((parsed.targetEndTimeMs - now) / 1000);
          if (diff > 0) {
            return {
              ...parsed,
              remainingSeconds: diff,
            };
          } else {
            // Timer expired while user was away / page was closed
            return {
              ...parsed,
              status: "completed",
              remainingSeconds: 0,
            };
          }
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_POMODORO_STATE;
  });

  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize state changes to localStorage for refresh recovery
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  // Drift-proof timer loop based on epoch timestamp (targetEndTimeMs)
  useEffect(() => {
    if (state.status !== "running" || !state.targetEndTimeMs) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const left = Math.round((state.targetEndTimeMs! - now) / 1000);

      if (left <= 0) {
        // Interval completed!
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (state.soundEnabled) {
          playChimeSound();
        }

        if (state.phase === "focus") {
          // Record actual focused session
          const todayStr = format(new Date(), "yyyy-MM-dd");
          addFocusSession({
            blockId: state.blockId,
            blockTitle: state.blockTitle,
            date: todayStr,
            focusedMinutes: state.focusMinutes,
            completedAt: new Date().toISOString(),
            preset: state.preset,
          });

          // Transition to Break
          const breakSecs = state.breakMinutes * 60;
          setState((prev) => ({
            ...prev,
            phase: "break",
            status: "paused", // user can manually start break or resume
            targetEndTimeMs: undefined,
            remainingSeconds: breakSecs,
            sessionCount: prev.sessionCount + 1,
            totalFocusedSeconds: prev.totalFocusedSeconds + prev.focusMinutes * 60,
          }));
        } else {
          // Transition back to Focus
          const focusSecs = state.focusMinutes * 60;
          setState((prev) => ({
            ...prev,
            phase: "focus",
            status: "paused",
            targetEndTimeMs: undefined,
            remainingSeconds: focusSecs,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          remainingSeconds: left,
        }));
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.status, state.targetEndTimeMs, state.phase, state.focusMinutes, state.breakMinutes, state.soundEnabled, state.blockId, state.blockTitle, state.preset, addFocusSession]);

  const startPomodoro = useCallback(
    (block?: ScheduledTaskBlock) => {
      if (state.soundEnabled) playTickSound();

      setState((prev) => {
        const title = block?.title || prev.blockTitle;
        const color = block?.color || prev.categoryColor;
        const blockId = block?.id || prev.blockId;
        const durationSecs = prev.phase === "focus" ? prev.focusMinutes * 60 : prev.breakMinutes * 60;
        const targetMs = Date.now() + durationSecs * 1000;

        return {
          ...prev,
          blockId,
          blockTitle: title,
          categoryColor: color,
          status: "running",
          targetEndTimeMs: targetMs,
          remainingSeconds: durationSecs,
        };
      });
    },
    [state.soundEnabled]
  );

  const pausePomodoro = useCallback(() => {
    setState((prev) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return {
        ...prev,
        status: "paused",
        targetEndTimeMs: undefined,
      };
    });
  }, []);

  const resumePomodoro = useCallback(() => {
    if (state.soundEnabled) playTickSound();

    setState((prev) => {
      const targetMs = Date.now() + prev.remainingSeconds * 1000;
      return {
        ...prev,
        status: "running",
        targetEndTimeMs: targetMs,
      };
    });
  }, [state.soundEnabled]);

  const resetPomodoro = useCallback(() => {
    setState((prev) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const initialSecs = prev.phase === "focus" ? prev.focusMinutes * 60 : prev.breakMinutes * 60;
      return {
        ...prev,
        status: "idle",
        targetEndTimeMs: undefined,
        remainingSeconds: initialSecs,
      };
    });
  }, []);

  const skipPhase = useCallback(() => {
    setState((prev) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (prev.phase === "focus") {
        const breakSecs = prev.breakMinutes * 60;
        return {
          ...prev,
          phase: "break",
          status: "idle",
          targetEndTimeMs: undefined,
          remainingSeconds: breakSecs,
        };
      } else {
        const focusSecs = prev.focusMinutes * 60;
        return {
          ...prev,
          phase: "focus",
          status: "idle",
          targetEndTimeMs: undefined,
          remainingSeconds: focusSecs,
        };
      }
    });
  }, []);

  const setPreset = useCallback(
    (preset: PomodoroPreset, customFocus?: number, customBreak?: number) => {
      let fMins = 25;
      let bMins = 5;

      if (preset === "25-5") {
        fMins = 25;
        bMins = 5;
      } else if (preset === "50-10") {
        fMins = 50;
        bMins = 10;
      } else if (preset === "custom") {
        fMins = customFocus && customFocus > 0 ? customFocus : 30;
        bMins = customBreak && customBreak > 0 ? customBreak : 5;
      }

      setState((prev) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const secs = prev.phase === "focus" ? fMins * 60 : bMins * 60;
        return {
          ...prev,
          preset,
          focusMinutes: fMins,
          breakMinutes: bMins,
          status: "idle",
          targetEndTimeMs: undefined,
          remainingSeconds: secs,
        };
      });
    },
    []
  );

  const toggleSound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  }, []);

  const openFocusModal = useCallback(() => {
    setIsFocusModalOpen(true);
  }, []);

  const closeFocusModal = useCallback(() => {
    setIsFocusModalOpen(false);
  }, []);

  return (
    <PomodoroContext.Provider
      value={{
        state,
        isFocusModalOpen,
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
