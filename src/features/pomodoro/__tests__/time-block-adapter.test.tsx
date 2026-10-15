import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { usePomodoroStore } from "../engine/pomodoro-engine";
import {
  TimeBlockFocusButton,
  TimeBlockFocusBadge,
  useTimeBlockFocus,
} from "../components/time-block-focus-adapter";
import { TimeBlockRef, FocusSessionRecord } from "../types";

describe("Time Block Integration Adapter", () => {
  const sampleBlock: TimeBlockRef = {
    id: "block-6hr-sprint",
    title: "Quarterly Roadmap Deep Dive",
    color: "#6366f1",
    plannedDurationMinutes: 360, // 6 hours
  };

  beforeEach(() => {
    window.localStorage.clear();
    usePomodoroStore.setState({
      state: "idle",
      sessionType: "focus",
      targetSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      currentBlock: null,
      history: [],
      isFocusModeOpen: false,
    });
  });

  it("maintains planned duration integrity (6-hour block remains 6 hours after 50 minutes focus)", () => {
    // Simulate 2 completed 25-minute Pomodoros for this block
    const history: FocusSessionRecord[] = [
      {
        id: "rec-1",
        sessionId: "sess-1",
        blockId: sampleBlock.id,
        blockTitle: sampleBlock.title,
        sessionType: "focus",
        plannedDurationMinutes: 360,
        actualDurationSeconds: 1500, // 25 mins
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
      {
        id: "rec-2",
        sessionId: "sess-2",
        blockId: sampleBlock.id,
        blockTitle: sampleBlock.title,
        sessionType: "focus",
        plannedDurationMinutes: 360,
        actualDurationSeconds: 1500, // another 25 mins
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
    ];

    usePomodoroStore.setState({ history });

    function TestComponent() {
      const hookResult = useTimeBlockFocus(sampleBlock);
      return (
        <div>
          <span data-testid="planned">{hookResult.plannedDurationMinutes}</span>
          <span data-testid="actual">{hookResult.actualFocusedMinutes}</span>
        </div>
      );
    }

    render(<TestComponent />);

    // Planned duration must remain exactly 360 minutes!
    expect(screen.getByTestId("planned").textContent).toBe("360");
    // Actual focused minutes must accurately report 50 minutes!
    expect(screen.getByTestId("actual").textContent).toBe("50");
  });

  it("renders TimeBlockFocusButton and initiates focus without mutating block", () => {
    render(<TimeBlockFocusButton block={sampleBlock} />);

    const button = screen.getByTitle("Start Pomodoro Focus");
    expect(button).toBeDefined();
    expect(screen.getByText("Start Focus")).toBeDefined();

    // Click Start Focus
    fireEvent.click(button);

    // Engine must now be focusing with this block selected
    const state = usePomodoroStore.getState();
    expect(state.state).toBe("focusing");
    expect(state.currentBlock?.id).toBe(sampleBlock.id);
    expect(state.currentBlock?.plannedDurationMinutes).toBe(360);
  });

  it("switches TimeBlockFocusButton to Focusing... when active and handles pause/resume", () => {
    usePomodoroStore.setState({
      state: "focusing",
      currentBlock: sampleBlock,
      remainingSeconds: 1200,
      targetEndTimestamp: Date.now() + 1200000,
    });

    const { rerender } = render(<TimeBlockFocusButton block={sampleBlock} />);
    expect(screen.getByText("Focusing...")).toBeDefined();

    // Click pause
    const pauseBtn = screen.getByTitle("Pause Focus Session");
    fireEvent.click(pauseBtn);

    expect(usePomodoroStore.getState().state).toBe("paused");

    rerender(<TimeBlockFocusButton block={sampleBlock} />);
    expect(screen.getByText("Resume")).toBeDefined();
  });

  it("renders TimeBlockFocusBadge showing actual focused vs planned duration", () => {
    const history: FocusSessionRecord[] = [
      {
        id: "rec-1",
        sessionId: "sess-1",
        blockId: sampleBlock.id,
        blockTitle: sampleBlock.title,
        sessionType: "focus",
        plannedDurationMinutes: 360,
        actualDurationSeconds: 1800, // 30 mins
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completed: true,
      },
    ];

    usePomodoroStore.setState({ history });

    render(
      <TimeBlockFocusBadge
        blockId={sampleBlock.id}
        plannedDurationMinutes={sampleBlock.plannedDurationMinutes}
      />
    );

    expect(screen.getByText("30m / 360m")).toBeDefined();
  });
});
