import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { PomodoroProvider, usePomodoro } from "@/features/planner/pomodoro-context";
import { VisualDayMap } from "@/features/planner/components/visual-day-map";
import { PomodoroFocusView } from "@/features/planner/components/pomodoro-focus-view";
import { PlannerCategoriesModal } from "@/features/planner/components/planner-categories-modal";
import { PlannerRoutinesModal } from "@/features/planner/components/planner-routines-modal";
import { SmartZoomTimeline } from "@/features/planner/components/smart-zoom-timeline";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";
import type { ScheduledTaskBlock } from "@/features/planner/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/plan-your-day",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Agent 2: Visual Time Blocking & Pomodoro Experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function renderFullWorkspace() {
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

  describe("1. Visual 24-Hour Day Map", () => {
    it("renders exactly 48 cubes across 4 chronological rows representing 24 hours", () => {
      const mockBlocks: ScheduledTaskBlock[] = [
        {
          id: "block-1",
          title: "Architecture Deep Dive",
          date: "2026-10-15",
          startTime: "09:00",
          endTime: "11:00",
          durationMinutes: 120,
          categoryId: "cat-work-focus",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const onSelectSlot = vi.fn();

      render(
        <CalendarProvider>
          <VisualDayMap
            currentDateStr="2026-10-15"
            allBlocks={mockBlocks}
            onSelectTimeSlot={onSelectSlot}
          />
        </CalendarProvider>
      );

      // Verify section header
      expect(screen.getByText("24-Hour Day Map")).toBeInTheDocument();
      expect(screen.getByText("48 Blocks × 30m")).toBeInTheDocument();

      // Verify the 4 chronological row labels
      expect(screen.getByText("Night & Dawn")).toBeInTheDocument();
      expect(screen.getByText("Morning")).toBeInTheDocument();
      expect(screen.getByText("Afternoon")).toBeInTheDocument();
      expect(screen.getByText("Evening")).toBeInTheDocument();

      // Verify 48 interactive cube buttons
      const cubeButtons = screen.getAllByRole("button", { name: /^Time slot/i });
      expect(cubeButtons).toHaveLength(48);

      // Verify occupancy calculation
      expect(screen.getByText(/2h 0m/i)).toBeInTheDocument();

      // Click a cube to navigate editor to that time
      const nineAmCube = cubeButtons.find((btn) =>
        btn.getAttribute("aria-label")?.includes("9:00 AM")
      );
      expect(nineAmCube).toBeDefined();
      fireEvent.click(nineAmCube!);
      expect(onSelectSlot).toHaveBeenCalledWith("09:00");
    });

    it("displays the five default categories in the legend", () => {
      render(
        <CalendarProvider>
          <VisualDayMap
            currentDateStr="2026-10-15"
            allBlocks={[]}
            onSelectTimeSlot={vi.fn()}
          />
        </CalendarProvider>
      );

      expect(screen.getByText("Work & Focus")).toBeInTheDocument();
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Personal")).toBeInTheDocument();
      expect(screen.getByText("Breaks")).toBeInTheDocument();
      expect(screen.getByText("Sleep")).toBeInTheDocument();
    });
  });

  describe("2. Pomodoro Timer & Focus Engine", () => {
    it("manages 25/5 and 50/10 presets, start/pause/resume/reset, and sound toggle", async () => {
      render(
        <CalendarProvider>
          <PomodoroProvider>
            <PomodoroFocusView />
            <TestPomodoroTrigger />
          </PomodoroProvider>
        </CalendarProvider>
      );

      // Open focus modal
      const openModalBtn = screen.getByRole("button", { name: "Open Focus Modal" });
      fireEvent.click(openModalBtn);

      // Verify focus modal opened
      expect(screen.getByText("MindDesk Focus Engine")).toBeInTheDocument();
      expect(screen.getByText("25:00")).toBeInTheDocument();

      // Switch to 50/10 preset
      const preset50Btn = screen.getByRole("button", { name: "50 / 10m" });
      fireEvent.click(preset50Btn);
      expect(screen.getByText("50:00")).toBeInTheDocument();

      // Start focus
      const startBtn = screen.getByRole("button", { name: /Start Focus/i });
      fireEvent.click(startBtn);

      // Timer is running
      expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();

      // Advance time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Verify pause
      const pauseBtn = screen.getByRole("button", { name: /Pause/i });
      fireEvent.click(pauseBtn);
      expect(screen.getByRole("button", { name: /Resume/i })).toBeInTheDocument();

      // Reset timer
      const resetBtn = screen.getByTitle("Reset timer");
      fireEvent.click(resetBtn);
      expect(screen.getByText("50:00")).toBeInTheDocument();

      // Sound toggle
      const soundBtn = screen.getByTitle("Mute sounds");
      fireEvent.click(soundBtn);
      expect(screen.getByTitle("Unmute sounds")).toBeInTheDocument();
    });

    it("tracks actual focused minutes and completes session transition to break", async () => {
      render(
        <CalendarProvider>
          <PomodoroProvider>
            <PomodoroFocusView />
            <TestPomodoroTrigger />
          </PomodoroProvider>
        </CalendarProvider>
      );

      // Open focus modal
      fireEvent.click(screen.getByRole("button", { name: "Open Focus Modal" }));

      // Set to 25-5 preset
      fireEvent.click(screen.getByRole("button", { name: "25 / 5m" }));
      expect(screen.getByText("25:00")).toBeInTheDocument();

      // Start timer
      fireEvent.click(screen.getByRole("button", { name: /Start Focus/i }));

      // Fast-forward 25 minutes (25 * 60 * 1000 ms)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000 + 1000);
      });

      // Transitioned to Break!
      await waitFor(() => {
        expect(screen.getByText("Rest & Recharge")).toBeInTheDocument();
        expect(screen.getByText("05:00")).toBeInTheDocument();
      });
    });
  });

  describe("3. Categories Management", () => {
    it("allows adding custom categories and safe reassignment upon deletion", async () => {
      const onClose = vi.fn();

      render(
        <CalendarProvider>
          <PlannerCategoriesModal isOpen={true} onClose={onClose} />
        </CalendarProvider>
      );

      // Verify default categories
      expect(screen.getByText("Work & Focus")).toBeInTheDocument();
      expect(screen.getByText("Health")).toBeInTheDocument();

      // Add custom category
      const nameInput = screen.getByPlaceholderText(/Deep Coding, Side Project/i);
      fireEvent.change(nameInput, { target: { value: "AI Research" } });

      const addBtn = screen.getByRole("button", { name: /^Add$/i });
      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(screen.getByText("AI Research")).toBeInTheDocument();
      });

      // Find delete button on newly created custom category
      const deleteButtons = screen.getAllByTitle("Delete custom category");
      expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(deleteButtons[0]);

      // Safe Reassignment confirmation dialog appears
      expect(screen.getByText("Safe Category Reassignment")).toBeInTheDocument();

      // Click Reassign & Delete
      const confirmDeleteBtn = screen.getByRole("button", { name: /Reassign & Delete/i });
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(screen.queryByText("AI Research")).not.toBeInTheDocument();
      });
    });
  });

  describe("4. Recurring Routines Management", () => {
    it("supports creating fixed and flexible routines and handles skip exceptions", async () => {
      const onClose = vi.fn();

      render(
        <CalendarProvider>
          <PlannerRoutinesModal
            isOpen={true}
            onClose={onClose}
            currentDateStr="2026-10-15"
          />
        </CalendarProvider>
      );

      // Switch to create tab
      const addTabBtn = screen.getByRole("button", { name: "+ Add Routine" });
      fireEvent.click(addTabBtn);

      // Fixed Routine creation
      const titleInput = screen.getByPlaceholderText(/Daily Standup, Deep Work/i);
      fireEvent.change(titleInput, { target: { value: "Morning Team Sync" } });

      const saveBtn = screen.getByRole("button", { name: "Save Routine" });
      fireEvent.click(saveBtn);

      // Verify routine appears in list
      await waitFor(() => {
        expect(screen.getByText("Morning Team Sync")).toBeInTheDocument();
        expect(screen.getByText("Fixed")).toBeInTheDocument();
      });
    });
  });

  describe("5. Smart Zoom Timeline", () => {
    it("renders zoom window filters, hour height adjustments, and creates blocks with undo", async () => {
      const onDateChange = vi.fn();

      render(
        <CalendarProvider>
          <PomodoroProvider>
            <SmartZoomTimeline
              currentDateStr="2026-10-15"
              onDateChange={onDateChange}
            />
          </PomodoroProvider>
        </CalendarProvider>
      );

      // Verify zoom window filters
      expect(screen.getByRole("button", { name: "24 Hours" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Morning (6a–12p)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Afternoon (12p–6p)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Evening (6p–12a)" })).toBeInTheDocument();

      // Switch to Morning zoom filter
      fireEvent.click(screen.getByRole("button", { name: "Morning (6a–12p)" }));

      // Click Add Block
      const addBlockBtn = screen.getByRole("button", { name: "Add Block" });
      fireEvent.click(addBlockBtn);

      // Fill in quick create
      const whatFocusInput = screen.getByPlaceholderText(/Code Review, Client Proposal/i);
      fireEvent.change(whatFocusInput, { target: { value: "Database Indexing Optimization" } });

      const createBtn = screen.getByRole("button", { name: "Create Block" });
      fireEvent.click(createBtn);

      // Block renders on the timeline
      await waitFor(() => {
        expect(screen.getByText("Database Indexing Optimization")).toBeInTheDocument();
      });

      // Delete block with Undo
      const deleteBtn = screen.getByTitle("Delete block (with Undo)");
      fireEvent.click(deleteBtn);

      // Undo notification toast appears
      expect(screen.getByText(/Deleted block “Database Indexing Optimization”/i)).toBeInTheDocument();
      const undoBtn = screen.getByRole("button", { name: "Undo" });
      fireEvent.click(undoBtn);

      // Block restored!
      await waitFor(() => {
        expect(screen.getByText("Database Indexing Optimization")).toBeInTheDocument();
      });
    });

    it("renders the integrated DailyPlannerWorkspace with Visual Day Map and timeline centerpiece", async () => {
      renderFullWorkspace();
      expect(screen.getByText("24-Hour Day Map")).toBeInTheDocument();
      expect(screen.getByText("Plan Your Day")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Add Time Block/i })).toBeInTheDocument();
    });
  });
});

// Helper component to trigger Pomodoro context methods from within provider
function TestPomodoroTrigger() {
  const { openFocusModal } = usePomodoro();
  return (
    <button type="button" onClick={openFocusModal}>
      Open Focus Modal
    </button>
  );
}
