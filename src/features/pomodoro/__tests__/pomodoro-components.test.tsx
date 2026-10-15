import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePomodoroStore } from "../engine/pomodoro-engine";
import { PomodoroTimer } from "../components/pomodoro-timer";
import { MiniTimer } from "../components/mini-timer";
import { FocusModeView } from "../components/focus-mode-view";
import { TimeBlockRef } from "../types";

describe("Pomodoro UI Components", () => {
  beforeEach(() => {
    usePomodoroStore.getState().reset();
    window.localStorage.clear();
    usePomodoroStore.setState({
      state: "idle",
      sessionType: "focus",
      preset: "25_5",
      targetSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      startTimestamp: null,
      targetEndTimestamp: null,
      pausedAtTimestamp: null,
      currentBlock: null,
      history: [],
      isFocusModeOpen: false,
      isSettingsOpen: false,
      isHistoryOpen: false,
    });
  });

  afterEach(() => {
    usePomodoroStore.getState().reset();
  });

  it("renders PomodoroTimer with presets, countdown, and controls", () => {
    render(<PomodoroTimer />);

    expect(screen.getByText("Ready to Focus")).toBeDefined();
    expect(screen.getByText("25:00")).toBeDefined();
    expect(screen.getByText("25 / 5m")).toBeDefined();
    expect(screen.getByText("50 / 10m")).toBeDefined();
    expect(screen.getByText("Custom")).toBeDefined();

    const startBtn = screen.getByText("Start Focus");
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    expect(usePomodoroStore.getState().state).toBe("focusing");
  });

  it("renders MiniTimer and toggles play/pause accurately", () => {
    const block: TimeBlockRef = {
      id: "b-1",
      title: "Client Pitch Deck",
      plannedDurationMinutes: 45,
    };

    const remaining = 22 * 60;
    usePomodoroStore.setState({
      state: "focusing",
      currentBlock: block,
      targetSeconds: 25 * 60,
      remainingSeconds: remaining,
      targetEndTimestamp: Date.now() + remaining * 1000,
    });

    render(<MiniTimer />);

    expect(screen.getByText("22:00")).toBeDefined();
    expect(screen.getByText("Client Pitch Deck")).toBeDefined();

    const pauseBtn = screen.getByTitle("Pause");
    fireEvent.click(pauseBtn);

    expect(usePomodoroStore.getState().state).toBe("paused");
  });

  it("renders FocusModeView without resetting the active session on open or close", () => {
    const block: TimeBlockRef = {
      id: "b-focus",
      title: "Flow State Coding",
      plannedDurationMinutes: 60,
    };

    const remaining = 18 * 60;
    // Active session with 18 minutes remaining
    usePomodoroStore.setState({
      state: "focusing",
      currentBlock: block,
      targetSeconds: 25 * 60,
      remainingSeconds: remaining,
      targetEndTimestamp: Date.now() + remaining * 1000,
      isFocusModeOpen: true,
    });

    const { rerender } = render(<FocusModeView />);

    expect(screen.getByText("Flow State Coding")).toBeDefined();
    expect(screen.getByText("18:00")).toBeDefined();
    expect(screen.getByText("Focusing")).toBeDefined();

    // Close focus mode
    const closeBtn = screen.getByTitle("Exit Focus Mode (Esc)");
    fireEvent.click(closeBtn);

    // Verify session state was preserved
    const state = usePomodoroStore.getState();
    expect(state.state).toBe("focusing");
    expect(state.remainingSeconds).toBe(18 * 60);
    expect(state.currentBlock?.title).toBe("Flow State Coding");
    expect(state.isFocusModeOpen).toBe(false);

    rerender(<FocusModeView />);
    // When isFocusModeOpen is false, modal is not visible
    expect(screen.queryByText("Flow State Coding")).toBeNull();
  });
});
