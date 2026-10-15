import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { usePomodoroStore } from "../engine/pomodoro-engine";
import { clearActiveTimerSnapshot, DEFAULT_POMODORO_SETTINGS } from "../services/pomodoro-storage";

describe("Pomodoro Engine Core Logic & State Machine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePomodoroStore.getState().reset();
    window.localStorage.clear();
    clearActiveTimerSnapshot();

    // Reset store to known baseline
    usePomodoroStore.setState({
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
      history: [],
      isFocusModeOpen: false,
      isSettingsOpen: false,
      isHistoryOpen: false,
      settings: { ...DEFAULT_POMODORO_SETTINGS },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles 25/5 and 50/10 presets correctly", () => {
    const store = usePomodoroStore.getState();

    // Switch to 50/10
    store.setPreset("50_10");
    let state = usePomodoroStore.getState();
    expect(state.preset).toBe("50_10");
    expect(state.targetSeconds).toBe(50 * 60);
    expect(state.remainingSeconds).toBe(50 * 60);
    expect(state.settings.focusDurationMinutes).toBe(50);
    expect(state.settings.shortBreakDurationMinutes).toBe(10);

    // Switch to 25/5
    store.setPreset("25_5");
    state = usePomodoroStore.getState();
    expect(state.preset).toBe("25_5");
    expect(state.targetSeconds).toBe(25 * 60);
    expect(state.remainingSeconds).toBe(25 * 60);
    expect(state.settings.focusDurationMinutes).toBe(25);
    expect(state.settings.shortBreakDurationMinutes).toBe(5);
  });

  it("supports custom intervals and durations", () => {
    const store = usePomodoroStore.getState();
    store.setPreset("custom", {
      focusDurationMinutes: 40,
      shortBreakDurationMinutes: 8,
      longBreakDurationMinutes: 20,
      longBreakInterval: 3,
    });

    const state = usePomodoroStore.getState();
    expect(state.preset).toBe("custom");
    expect(state.targetSeconds).toBe(40 * 60);
    expect(state.remainingSeconds).toBe(40 * 60);
    expect(state.settings.focusDurationMinutes).toBe(40);
    expect(state.settings.longBreakInterval).toBe(3);
  });

  it("starts, pauses, and resumes with drift-free timestamps", () => {
    const baseTime = 1000000000000;
    vi.setSystemTime(baseTime);

    const store = usePomodoroStore.getState();
    store.start();

    let state = usePomodoroStore.getState();
    expect(state.state).toBe("focusing");
    expect(state.startTimestamp).toBe(baseTime);
    expect(state.targetEndTimestamp).toBe(baseTime + 25 * 60 * 1000);
    expect(state.sessionId).toBeTruthy();

    // Advance 5 minutes (300 seconds)
    vi.advanceTimersByTime(300 * 1000);
    vi.setSystemTime(baseTime + 300 * 1000);

    // Pause timer
    store.pause();
    state = usePomodoroStore.getState();
    expect(state.state).toBe("paused");
    expect(state.remainingSeconds).toBe(20 * 60);
    expect(state.elapsedBeforePauseSeconds).toBe(300);
    expect(state.targetEndTimestamp).toBeNull();

    // While paused, advance time by 10 minutes (wall clock ticks, but timer is paused)
    vi.advanceTimersByTime(600 * 1000);
    vi.setSystemTime(baseTime + 900 * 1000);

    // Remaining seconds must still be 20 minutes!
    expect(usePomodoroStore.getState().remainingSeconds).toBe(20 * 60);

    // Resume timer
    store.resume();
    state = usePomodoroStore.getState();
    expect(state.state).toBe("focusing");
    expect(state.remainingSeconds).toBe(20 * 60);
    expect(state.targetEndTimestamp).toBe(baseTime + 900 * 1000 + 20 * 60 * 1000);
  });

  it("resets to initial state without losing configuration", () => {
    const store = usePomodoroStore.getState();
    store.start();
    vi.advanceTimersByTime(120 * 1000);

    store.reset();
    const state = usePomodoroStore.getState();
    expect(state.state).toBe("idle");
    expect(state.remainingSeconds).toBe(25 * 60);
    expect(state.targetEndTimestamp).toBeNull();
  });

  it("transitions smoothly from focus to short break upon completion", () => {
    const baseTime = 1000000000000;
    vi.setSystemTime(baseTime);

    const store = usePomodoroStore.getState();
    store.start();

    // Advance to end of session (the interval ticker automatically completes session)
    vi.advanceTimersByTime(25 * 60 * 1000);
    vi.setSystemTime(baseTime + 25 * 60 * 1000);

    const state = usePomodoroStore.getState();
    expect(state.sessionType).toBe("short_break");
    expect(state.targetSeconds).toBe(5 * 60);
    expect(state.remainingSeconds).toBe(5 * 60);
    expect(state.completedSessionsCount).toBe(1);
    expect(state.history.length).toBe(1);
    expect(state.history[0].sessionType).toBe("focus");
    expect(state.history[0].completed).toBe(true);
  });

  it("transitions to long break after configured number of sessions (e.g. 4)", () => {
    const store = usePomodoroStore.getState();
    // Simulate 3 already completed sessions
    usePomodoroStore.setState({ completedSessionsCount: 3 });

    store.completeSession(); // 4th session completed!

    const state = usePomodoroStore.getState();
    expect(state.sessionType).toBe("long_break");
    expect(state.targetSeconds).toBe(15 * 60); // default long break is 15 mins
    expect(state.completedSessionsCount).toBe(4);
  });

  it("skips break and returns to focus immediately", () => {
    usePomodoroStore.setState({
      state: "short_break",
      sessionType: "short_break",
      targetSeconds: 5 * 60,
      remainingSeconds: 4 * 60,
    });

    const store = usePomodoroStore.getState();
    store.skipBreak();

    const state = usePomodoroStore.getState();
    expect(state.state).toBe("idle");
    expect(state.sessionType).toBe("focus");
    expect(state.targetSeconds).toBe(25 * 60);
    expect(state.remainingSeconds).toBe(25 * 60);
  });

  it("ends session early and logs partial focused minutes accurately", () => {
    const baseTime = 1000000000000;
    vi.setSystemTime(baseTime);

    const block: TimeBlockRef = {
      id: "block-writer",
      title: "Write Documentation",
      plannedDurationMinutes: 90,
    };

    const store = usePomodoroStore.getState();
    store.selectTimeBlock(block);
    store.start();

    // 12 minutes elapsed (720 seconds)
    vi.advanceTimersByTime(720 * 1000);
    vi.setSystemTime(baseTime + 720 * 1000);

    store.endSession(false); // ended early

    const state = usePomodoroStore.getState();
    expect(state.state).toBe("idle");
    expect(state.history.length).toBe(1);
    expect(state.history[0].actualDurationSeconds).toBe(720);
    expect(state.history[0].completed).toBe(false);
    expect(state.history[0].blockId).toBe("block-writer");
  });

  it("handles sleep, device suspension, and background tabs without losing time", () => {
    const baseTime = 1000000000000;
    vi.setSystemTime(baseTime);

    const store = usePomodoroStore.getState();
    store.start();

    // Device suspended / slept for 30 minutes (exceeding the 25-minute timer)
    vi.setSystemTime(baseTime + 30 * 60 * 1000);

    // Tab woke up and triggers visibility check
    store.recheckTimingAfterSleep();

    const state = usePomodoroStore.getState();
    // Must have automatically completed session and transitioned to break!
    expect(state.completedSessionsCount).toBe(1);
    expect(state.sessionType).toBe("short_break");
    expect(state.history.length).toBe(1);
  });

  it("synchronizes state from remote tabs without conflicts", () => {
    const store = usePomodoroStore.getState();

    const remoteSnapshot: ActiveTimerSnapshot = {
      state: "focusing",
      sessionType: "focus",
      preset: "50_10",
      targetSeconds: 50 * 60,
      remainingSeconds: 42 * 60,
      startTimestamp: Date.now(),
      targetEndTimestamp: Date.now() + 42 * 60 * 1000,
      pausedAtTimestamp: null,
      elapsedBeforePauseSeconds: 8 * 60,
      completedSessionsCount: 2,
      currentBlock: { id: "remote-b", title: "Remote Task", plannedDurationMinutes: 60 },
      sessionId: "remote-sess",
      lastTickTimestamp: Date.now(),
    };

    store.syncFromRemote(remoteSnapshot);

    const state = usePomodoroStore.getState();
    expect(state.state).toBe("focusing");
    expect(state.remainingSeconds).toBe(42 * 60);
    expect(state.preset).toBe("50_10");
    expect(state.currentBlock?.id).toBe("remote-b");
  });
});
