import { describe, it, expect, beforeEach } from "vitest";
import {
  loadPomodoroSettings,
  savePomodoroSettings,
  loadActiveTimerSnapshot,
  saveActiveTimerSnapshot,
  clearActiveTimerSnapshot,
  loadFocusHistory,
  appendFocusSessionRecord,
  getBlockFocusSummary,
  enrichBlockWithActualFocus,
  DEFAULT_POMODORO_SETTINGS,
  DEFAULT_ACTIVE_TIMER,
} from "../services/pomodoro-storage";
import { FocusSessionRecord, TimeBlockRef } from "../types";

describe("Pomodoro Persistence & Storage Layer", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads default settings when storage is empty", () => {
    const settings = loadPomodoroSettings();
    expect(settings).toEqual(DEFAULT_POMODORO_SETTINGS);
  });

  it("persists and restores custom settings non-destructively", () => {
    savePomodoroSettings({
      ...DEFAULT_POMODORO_SETTINGS,
      focusDurationMinutes: 45,
      shortBreakDurationMinutes: 8,
      longBreakInterval: 3,
      soundVolume: 0.9,
    });

    const loaded = loadPomodoroSettings();
    expect(loaded.focusDurationMinutes).toBe(45);
    expect(loaded.shortBreakDurationMinutes).toBe(8);
    expect(loaded.longBreakInterval).toBe(3);
    expect(loaded.soundVolume).toBe(0.9);
  });

  it("loads default active timer snapshot when storage is empty", () => {
    const snapshot = loadActiveTimerSnapshot();
    expect(snapshot.state).toBe("idle");
    expect(snapshot.targetSeconds).toBe(25 * 60);
  });

  it("persists, reloads, and clears active timer snapshot", () => {
    const customSnapshot = {
      ...DEFAULT_ACTIVE_TIMER,
      state: "focusing" as const,
      remainingSeconds: 1200,
      targetEndTimestamp: Date.now() + 1200000,
      sessionId: "test-sess-1",
    };

    saveActiveTimerSnapshot(customSnapshot);
    const loaded = loadActiveTimerSnapshot();
    expect(loaded.state).toBe("focusing");
    expect(loaded.remainingSeconds).toBe(1200);
    expect(loaded.sessionId).toBe("test-sess-1");

    clearActiveTimerSnapshot();
    const afterClear = loadActiveTimerSnapshot();
    expect(afterClear.state).toBe("idle");
  });

  it("appends focus session records and prevents duplicate entries", () => {
    const record1: FocusSessionRecord = {
      id: "rec-1",
      sessionId: "sess-1",
      blockId: "block-alpha",
      blockTitle: "Architecture Planning",
      sessionType: "focus",
      plannedDurationMinutes: 60,
      actualDurationSeconds: 1500, // 25 mins
      startedAt: new Date(Date.now() - 1500000).toISOString(),
      completedAt: new Date().toISOString(),
      completed: true,
    };

    appendFocusSessionRecord(record1);
    let history = loadFocusHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe("rec-1");

    // Attempt appending duplicate record
    appendFocusSessionRecord(record1);
    history = loadFocusHistory();
    expect(history.length).toBe(1);

    // Append distinct record
    const record2: FocusSessionRecord = {
      ...record1,
      id: "rec-2",
      sessionId: "sess-2",
      actualDurationSeconds: 1800,
      completedAt: new Date(Date.now() + 1000).toISOString(),
    };
    appendFocusSessionRecord(record2);
    history = loadFocusHistory();
    expect(history.length).toBe(2);
  });

  it("calculates block focus summary correctly and keeps planned duration separate from actual focused time", () => {
    const blockId = "block-deep-work";
    const history: FocusSessionRecord[] = [
      {
        id: "rec-1",
        sessionId: "sess-1",
        blockId,
        blockTitle: "Deep Work Sprint",
        sessionType: "focus",
        plannedDurationMinutes: 120, // 2-hour planned block
        actualDurationSeconds: 1500, // 25 mins
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
      {
        id: "rec-2",
        sessionId: "sess-2",
        blockId,
        blockTitle: "Deep Work Sprint",
        sessionType: "focus",
        plannedDurationMinutes: 120,
        actualDurationSeconds: 1500, // another 25 mins
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
      {
        id: "rec-3",
        sessionId: "sess-3",
        blockId: "unrelated-block",
        blockTitle: "Other Task",
        sessionType: "focus",
        plannedDurationMinutes: 30,
        actualDurationSeconds: 1200,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
    ];

    const summary = getBlockFocusSummary(blockId, history);
    expect(summary.totalFocusedSeconds).toBe(3000); // 50 mins
    expect(summary.totalFocusedMinutes).toBe(50);
    expect(summary.completedSessions).toBe(2);

    // Planned duration is completely untouched
    const blockRef: TimeBlockRef = {
      id: blockId,
      title: "Deep Work Sprint",
      plannedDurationMinutes: 120,
    };
    const enriched = enrichBlockWithActualFocus(blockRef, history);
    expect(enriched.plannedDurationMinutes).toBe(120);
    expect(enriched.actualFocusedMinutes).toBe(50);
  });
});
