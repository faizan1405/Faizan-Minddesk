import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider, useCalendar } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";
import { VisualDayMap } from "@/features/planner/components/visual-day-map";
import { SmartZoomTimeline } from "@/features/planner/components/smart-zoom-timeline";
import { PlannerRoutinesModal } from "@/features/planner/components/planner-routines-modal";
import { PomodoroProvider } from "@/features/planner/pomodoro-context";
import { PomodoroFocusView } from "@/features/planner/components/pomodoro-focus-view";
import { calculateDayMapCubes } from "@/features/planner/services/smart-scheduler";
import {
  usePomodoroStore,
  appendFocusSessionRecord,
  getBlockFocusSummary,
  TimeBlockFocusBadge,
} from "@/features/pomodoro";
import type { ScheduledTaskBlock } from "@/features/calendar/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/plan-your-day",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("MINDDESK — Planner & Pomodoro Integration Verification Suite", () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePomodoroStore.getState().reset();
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

  function renderWorkspace() {
    return render(
      <MindDeskProvider>
        <CalendarProvider>
          <HabitsProvider>
            <DailyPlannerWorkspace />
          </HabitsProvider>
        </CalendarProvider>
      </MindDeskProvider>
    );
  }

  describe("1. 6-Hour Block & 48-Cube Day Map", () => {
    it("creates a 6-hour block and confirms exactly 12 cubes are colored", () => {
      const sixHourBlock: ScheduledTaskBlock = {
        id: "block-6hr",
        title: "Deep System Architecture",
        date: "2026-10-15",
        startTime: "09:00",
        endTime: "15:00", // 6 hours = 360 minutes = 12 cubes of 30 mins
        durationMinutes: 360,
        category: "cat-work-focus",
        color: "#4f46e5",
        completed: false,
      };

      const cubes = calculateDayMapCubes("2026-10-15", [sixHourBlock]);
      expect(cubes).toHaveLength(48);

      const coloredCubes = cubes.filter((c) => c.fillPercent > 0 && c.color);
      expect(coloredCubes).toHaveLength(12);

      // Verify each of the 12 cubes covers 9:00 AM through 3:00 PM
      coloredCubes.forEach((cube) => {
        expect(cube.color).toBe("#4f46e5");
        expect(cube.fillPercent).toBe(100);
      });

      // Render VisualDayMap UI component and check occupancy text
      render(
        <CalendarProvider>
          <VisualDayMap
            currentDateStr="2026-10-15"
            allBlocks={[sixHourBlock]}
            onSelectTimeSlot={vi.fn()}
          />
        </CalendarProvider>
      );

      expect(screen.getByText(/6h 0m/i)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^Time slot/i })).toHaveLength(48);
    });
  });

  describe("2. Block Lifecycle: Move, Resize, Edit, and Delete with Undo", () => {
    it("handles block creation, duration nudging, and deletion with undo restoration", async () => {
      render(
        <CalendarProvider>
          <PomodoroProvider>
            <SmartZoomTimeline currentDateStr="2026-10-15" />
          </PomodoroProvider>
        </CalendarProvider>
      );

      // Quick Create a new block on the timeline
      const addBlockBtn = screen.getByRole("button", { name: "Add Block" });
      fireEvent.click(addBlockBtn);

      const titleInput = screen.getByPlaceholderText(/Code Review, Client Proposal/i);
      fireEvent.change(titleInput, { target: { value: "Database Query Tuning" } });

      const createBtn = screen.getByRole("button", { name: "Create Block" });
      fireEvent.click(createBtn);

      // Block is rendered
      await waitFor(() => {
        expect(screen.getByText("Database Query Tuning")).toBeInTheDocument();
      });

      // Duration nudge: +15m using title "Extend by 15 mins"
      const nudgePlusBtn = screen.getByTitle("Extend by 15 mins");
      fireEvent.click(nudgePlusBtn);

      // Delete block
      const deleteBtn = screen.getByTitle("Delete block (with Undo)");
      fireEvent.click(deleteBtn);

      // Verify undo toast appears and click Undo
      await waitFor(() => {
        expect(screen.getByText(/Deleted block “Database Query Tuning”/i)).toBeInTheDocument();
      });

      const undoBtn = screen.getByRole("button", { name: "Undo" });
      fireEvent.click(undoBtn);

      // Block is restored
      await waitFor(() => {
        expect(screen.getByText("Database Query Tuning")).toBeInTheDocument();
      });
    });
  });

  describe("3. Recurring Routines Management & Skip Suggestions", () => {
    it("allows creating recurring routine, confirming suggestions, and applying skip exception", async () => {
      function RoutineSuggestionTestHarness() {
        const [isOpen, setIsOpen] = useState(false);
        return (
          <CalendarProvider>
            <PomodoroProvider>
              <button onClick={() => setIsOpen(true)}>Open Routines</button>
              <SmartZoomTimeline currentDateStr="2026-10-15" />
              <PlannerRoutinesModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                currentDateStr="2026-10-15"
              />
            </PomodoroProvider>
          </CalendarProvider>
        );
      }

      render(<RoutineSuggestionTestHarness />);

      // Open routines modal
      fireEvent.click(screen.getByRole("button", { name: "Open Routines" }));
      expect(screen.getByText("Recurring Routines")).toBeInTheDocument();

      // Switch to Add Routine tab
      const addTab = screen.getByRole("button", { name: "+ Add Routine" });
      fireEvent.click(addTab);

      // Select flexible routine
      const flexibleBtn = screen.getByRole("button", { name: /Flexible Routine/i });
      fireEvent.click(flexibleBtn);

      const routineTitleInput = screen.getByPlaceholderText(/Daily Standup, Deep Work/i);
      fireEvent.change(routineTitleInput, { target: { value: "Sprint Review" } });

      const saveRoutineBtn = screen.getByRole("button", { name: "Save Routine" });
      fireEvent.click(saveRoutineBtn);

      await waitFor(() => {
        expect(screen.getAllByText("Sprint Review").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Flexible").length).toBeGreaterThanOrEqual(1);
      });

      // Close modal
      const closeBtn = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeBtn);

      // Verify flexible routine suggestion appears on the timeline
      await waitFor(() => {
        expect(screen.getByText(/Flexible Routine Suggestions/i)).toBeInTheDocument();
        expect(screen.getByText("Sprint Review")).toBeInTheDocument();
      });

      // Skip this suggestion for today
      const skipTodayBtn = screen.getByTitle("Skip today");
      fireEvent.click(skipTodayBtn);

      // Suggestion should now be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Flexible Routine Suggestions/i)).not.toBeInTheDocument();
      });

      // Re-open routines modal and verify routine shows skipped today
      fireEvent.click(screen.getByRole("button", { name: "Open Routines" }));
      await waitFor(() => {
        expect(screen.getByText("Skipped today")).toBeInTheDocument();
      });
    });
  });

  describe("4. Unified Pomodoro Timer & Time Block Synchronization", () => {
    it("launches Pomodoro with category color, pause, resume, reset, and complete", async () => {
      render(
        <CalendarProvider>
          <PomodoroProvider>
            <SmartZoomTimeline currentDateStr="2026-10-15" />
            <PomodoroFocusView />
          </PomodoroProvider>
        </CalendarProvider>
      );

      // Quick create a block
      fireEvent.click(screen.getByRole("button", { name: "Add Block" }));
      fireEvent.change(screen.getByPlaceholderText(/Code Review, Client Proposal/i), {
        target: { value: "Algorithm Review" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create Block" }));

      await waitFor(() => {
        expect(screen.getByText("Algorithm Review")).toBeInTheDocument();
      });

      // Launch Pomodoro directly from the block
      const startPomodoroBtn = screen.getByTitle("Start Pomodoro on this block");
      fireEvent.click(startPomodoroBtn);

      // Focus mode view is opened
      await waitFor(() => {
        expect(screen.getByText("MindDesk Focus Engine")).toBeInTheDocument();
        expect(screen.getAllByText("Algorithm Review").length).toBeGreaterThanOrEqual(1);
      });

      const store = usePomodoroStore.getState();
      expect(store.state).toBe("focusing");
      expect(store.currentBlock?.title).toBe("Algorithm Review");

      // Pause timer
      const pauseBtn = screen.getByRole("button", { name: /Pause/i });
      fireEvent.click(pauseBtn);
      expect(usePomodoroStore.getState().state).toBe("paused");

      // Resume timer
      const resumeBtn = screen.getByRole("button", { name: /Resume/i });
      fireEvent.click(resumeBtn);
      expect(usePomodoroStore.getState().state).toBe("focusing");

      // Complete session
      const completeBtn = screen.getByTitle("Complete session now");
      fireEvent.click(completeBtn);

      // After completing focus, engine transitions to short break
      await waitFor(() => {
        const nextState = usePomodoroStore.getState();
        expect(nextState.sessionType).toBe("short_break");
        expect(nextState.history.length).toBeGreaterThanOrEqual(1);
        expect(nextState.history[0].completed).toBe(true);
      });
    });

    it("confirms actual focused time is saved without modifying planned block duration", () => {
      const block: ScheduledTaskBlock = {
        id: "block-test-planned",
        title: "Security Penetration Audit",
        date: "2026-10-15",
        startTime: "10:00",
        endTime: "12:00",
        durationMinutes: 120, // Planned 120m
        completed: false,
      };

      // Simulate completed 25m Pomodoro session for this block
      const history = appendFocusSessionRecord({
        id: "sess-123",
        sessionId: "cycle-123",
        blockId: block.id,
        blockTitle: block.title,
        sessionType: "focus",
        plannedDurationMinutes: 25,
        actualDurationSeconds: 25 * 60,
        startedAt: "2026-10-15T10:00:00.000Z",
        completedAt: "2026-10-15T10:25:00.000Z",
        completed: true,
      });

      usePomodoroStore.setState({ history });

      const summary = getBlockFocusSummary(block.id, history);
      expect(summary.totalFocusedMinutes).toBe(25);
      expect(block.durationMinutes).toBe(120); // Planned duration remains completely unchanged!

      // Render TimeBlockFocusBadge
      render(
        <TimeBlockFocusBadge
          blockId={block.id}
          plannedDurationMinutes={block.durationMinutes}
        />
      );

      // Verify badge renders "25m / 120m"
      expect(screen.getByText("25m / 120m")).toBeInTheDocument();
    });
  });

  describe("5. Refresh Recovery & Drift-Proof Timestamp Calculations", () => {
    it("recalculates remaining time accurately after refresh or backgrounding using targetEndTimestamp", () => {
      const futureEnd = Date.now() + 15 * 60 * 1000; // 15 mins remaining
      usePomodoroStore.setState({
        state: "focusing",
        sessionType: "focus",
        targetSeconds: 25 * 60,
        remainingSeconds: 25 * 60,
        targetEndTimestamp: futureEnd,
      });

      // Trigger sleep/wake recheck
      usePomodoroStore.getState().recheckTimingAfterSleep();

      const state = usePomodoroStore.getState();
      expect(state.remainingSeconds).toBe(15 * 60);
    });

    it("auto-completes session if timer expired while tab was closed or machine was asleep", () => {
      const pastEnd = Date.now() - 5000; // Expired 5 seconds ago
      usePomodoroStore.setState({
        state: "focusing",
        sessionType: "focus",
        targetSeconds: 25 * 60,
        remainingSeconds: 5,
        targetEndTimestamp: pastEnd,
      });

      usePomodoroStore.getState().recheckTimingAfterSleep();

      const state = usePomodoroStore.getState();
      expect(state.sessionType).toBe("short_break");
      expect(state.history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Cross-Tab Synchronization & Deduplication", () => {
    it("prevents duplicate session history when two tabs process the same session cycle", () => {
      const sharedSessionId = "tab-sync-cycle-999";
      const record1 = {
        id: "rec-tab1",
        sessionId: sharedSessionId,
        blockTitle: "Deep Coding",
        sessionType: "focus" as const,
        plannedDurationMinutes: 25,
        actualDurationSeconds: 25 * 60,
        startedAt: "2026-10-15T11:00:00.000Z",
        completedAt: "2026-10-15T11:25:00.000Z",
        completed: true,
      };

      const record2 = {
        id: "rec-tab2", // Tab 2 generated distinct record ID
        sessionId: sharedSessionId, // But same active cycle sessionId
        blockTitle: "Deep Coding",
        sessionType: "focus" as const,
        plannedDurationMinutes: 25,
        actualDurationSeconds: 25 * 60,
        startedAt: "2026-10-15T11:00:00.000Z",
        completedAt: "2026-10-15T11:25:01.000Z",
        completed: true,
      };

      // Tab 1 records session
      const historyAfterTab1 = appendFocusSessionRecord(record1);
      expect(historyAfterTab1).toHaveLength(1);

      // Tab 2 attempts to record session with same sessionId
      const historyAfterTab2 = appendFocusSessionRecord(record2);
      expect(historyAfterTab2).toHaveLength(1); // Rejected as duplicate!
      expect(historyAfterTab2[0].id).toBe("rec-tab1");
    });
  });

  describe("7. Responsive Desktop & Mobile Viewports", () => {
    it("renders Day Map centerpiece with direct cube interactivity and confirms timeline is removed", () => {
      renderWorkspace();

      // Ensure 24-Hour Day Map is directly present as centerpiece
      expect(screen.getByText("24-Hour Day Map")).toBeInTheDocument();

      // Ensure Smart Zoom Timeline Editor is completely removed
      expect(screen.queryByLabelText("Smart Zoom Timeline Editor")).not.toBeInTheDocument();

      // Ensure old tab switcher is removed
      expect(screen.queryByRole("button", { name: "Task Library" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Timeline Schedule" })).not.toBeInTheDocument();

      // Tapping an empty time slot cube opens the Add Block popup directly
      const tenAmCube = screen.getByRole("button", { name: /Time slot 10:00 AM/i });
      fireEvent.click(tenAmCube);
      expect(screen.getByText("Add Time Block")).toBeInTheDocument();
    });
  });

  describe("8. Authenticated MySQL Sync Bridge", () => {
    it("ensures addFocusSession preserves ID and prevents double entry in calendar context", () => {
      function TestSyncHarness() {
        const { focusSessions, addFocusSession } = useCalendar();
        return (
          <div>
            <span data-testid="session-count">{focusSessions?.length || 0}</span>
            <button
              type="button"
              onClick={() => {
                addFocusSession({
                  id: "sess-mysql-1",
                  sessionId: "cycle-mysql-1",
                  blockTitle: "API Documentation",
                  date: "2026-10-15",
                  focusedMinutes: 25,
                  completedAt: new Date().toISOString(),
                  preset: "25_5",
                });
              }}
            >
              Add Session 1
            </button>
            <button
              type="button"
              onClick={() => {
                // Duplicate add attempt
                addFocusSession({
                  id: "sess-mysql-1",
                  sessionId: "cycle-mysql-1",
                  blockTitle: "API Documentation",
                  date: "2026-10-15",
                  focusedMinutes: 25,
                  completedAt: new Date().toISOString(),
                  preset: "25_5",
                });
              }}
            >
              Add Duplicate Session
            </button>
          </div>
        );
      }

      render(
        <CalendarProvider>
          <TestSyncHarness />
        </CalendarProvider>
      );

      const countEl = screen.getByTestId("session-count");
      expect(countEl.textContent).toBe("0");

      // Add session
      fireEvent.click(screen.getByRole("button", { name: "Add Session 1" }));
      expect(countEl.textContent).toBe("1");

      // Add duplicate session
      fireEvent.click(screen.getByRole("button", { name: "Add Duplicate Session" }));
      expect(countEl.textContent).toBe("1"); // Preserved deduplication!
    });
  });
});
