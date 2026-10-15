"use client";

import { useEffect, useState, useMemo } from "react";
import { usePomodoroStore, initializePomodoroSubsystem } from "./pomodoro-engine";
import { getBlockFocusSummary } from "../services/pomodoro-storage";

export function formatTime(seconds: number): string {
  const safeSecs = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function usePomodoro() {
  const store = usePomodoroStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const cleanup = initializePomodoroSubsystem();
    return cleanup;
  }, []);

  const progressPercent = useMemo(() => {
    if (store.targetSeconds <= 0) return 0;
    const elapsed = store.targetSeconds - store.remainingSeconds;
    return Math.min(100, Math.max(0, (elapsed / store.targetSeconds) * 100));
  }, [store.targetSeconds, store.remainingSeconds]);

  const formattedRemaining = useMemo(() => {
    return formatTime(store.remainingSeconds);
  }, [store.remainingSeconds]);

  const statusLabel = useMemo(() => {
    switch (store.state) {
      case "focusing":
        return "Focusing";
      case "paused":
        return "Paused";
      case "short_break":
        return "Short Break";
      case "long_break":
        return "Long Break";
      case "completed":
        return "Completed";
      case "idle":
      default:
        return store.sessionType === "focus"
          ? "Ready to Focus"
          : store.sessionType === "short_break"
          ? "Ready for Break"
          : "Ready for Long Break";
    }
  }, [store.state, store.sessionType]);

  const isBreak = store.sessionType === "short_break" || store.sessionType === "long_break";
  const isRunning = store.state === "focusing" || store.state === "short_break" || store.state === "long_break";

  // Current block metrics
  const currentBlockSummary = useMemo(() => {
    if (!store.currentBlock?.id) return null;
    return getBlockFocusSummary(store.currentBlock.id, store.history);
  }, [store.currentBlock?.id, store.history]);

  // Total focused today
  const totalFocusedTodayMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecords = store.history.filter(
      (r) => r.sessionType === "focus" && r.startedAt.slice(0, 10) === todayStr
    );
    const totalSecs = todayRecords.reduce((acc, curr) => acc + curr.actualDurationSeconds, 0);
    return Math.round(totalSecs / 60);
  }, [store.history]);

  return {
    ...store,
    isMounted,
    isRunning,
    isBreak,
    progressPercent,
    formattedRemaining,
    statusLabel,
    currentBlockSummary,
    totalFocusedTodayMinutes,
  };
}
