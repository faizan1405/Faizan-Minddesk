import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { NotificationProvider } from "@/features/notifications/context/notification-context";
import { HabitsWorkspace } from "@/features/habits/components/habits-workspace";

vi.mock("next/navigation", () => ({
  usePathname: () => "/habits",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import {
  getSampleTestHabits,
  getSampleTestCompletions,
  getSampleTestRoutines,
} from "@/features/habits/services/habit-defaults";
import type { Habit, HabitCompletion, Routine } from "@/features/habits/types";

function renderHabitsWorkspace(options?: {
  initialHabits?: Habit[];
  initialCompletions?: HabitCompletion[];
  initialRoutines?: Routine[];
}) {
  const habits = options?.initialHabits ?? getSampleTestHabits();
  const completions = options?.initialCompletions ?? getSampleTestCompletions();
  const routines = options?.initialRoutines ?? getSampleTestRoutines();

  return render(
    <MindDeskProvider>
      <CalendarProvider>
        <HabitsProvider
          initialHabits={habits}
          initialCompletions={completions}
          initialRoutines={routines}
        >
          <NotificationProvider>
            <HabitsWorkspace />
          </NotificationProvider>
        </HabitsProvider>
      </CalendarProvider>
    </MindDeskProvider>
  );
}

describe("Habit & Routine Tracker Experience (Phase 1-8 UX & Reliability)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders HabitsWorkspace with contextual headers and primary tabs", () => {
    renderHabitsWorkspace();

    // Verify view navigation tabs
    expect(screen.getByRole("button", { name: /Today's Habits/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All Habits/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Routines/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Heatmap & Trends/i })).toBeInTheDocument();

    // Verify contextual Today's Habits heading & buttons (oversized duplicate header removed)
    expect(screen.getByRole("heading", { name: "Today's Habits" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Habit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Daily Review$/i })).toBeInTheDocument();

    // Verify top metrics shelf
    expect(screen.getByText(/Active Streaks In Play/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress today:/i)).toBeInTheDocument();
  });

  it("displays seeded habits with correct tracking types and streaks", () => {
    renderHabitsWorkspace();

    // Verify seed habits appear
    expect(screen.getByText("Drink 8 Glasses of Water")).toBeInTheDocument();
    expect(screen.getByText("Read 20 Minutes")).toBeInTheDocument();
    expect(screen.getByText("Exercise & Movement")).toBeInTheDocument();

    // Verify quantity increment/decrement controls exist for quantity habit
    expect(screen.getByTitle("Increase by 1")).toBeInTheDocument();
    expect(screen.getByTitle("Decrease by 1")).toBeInTheDocument();
  });

  it("creates a new habit via HabitModal and verifies it renders in workspace", async () => {
    renderHabitsWorkspace();

    // Click New Habit button
    const newHabitBtn = screen.getByRole("button", { name: /New Habit/i });
    fireEvent.click(newHabitBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText("Create New Habit")).toBeInTheDocument();
    });

    // Fill habit name in streamlined modal
    const nameInput = screen.getByLabelText(/Habit Name/i);
    fireEvent.change(nameInput, { target: { value: "Practice Sales Pitch" } });

    // Submit form via sticky action footer
    const createBtn = screen.getByRole("button", { name: /Create Habit/i });
    fireEvent.click(createBtn);

    // Verify the newly created habit appears in the workspace
    await waitFor(() => {
      expect(screen.getByText("Practice Sales Pitch")).toBeInTheDocument();
    });
  });

  it("toggles completion and undo on a habit card", async () => {
    renderHabitsWorkspace();

    // Find the Exercise & Movement habit toggle button
    const toggleBtn = screen.getByRole("button", { name: /Mark Exercise & Movement complete/i });

    // Click to complete
    fireEvent.click(toggleBtn);

    // Toggle button should update to "Mark Exercise & Movement incomplete"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mark Exercise & Movement incomplete/i })).toBeInTheDocument();
    });

    // Click again to undo
    const undoBtn = screen.getByRole("button", { name: /Mark Exercise & Movement incomplete/i });
    fireEvent.click(undoBtn);

    // Reverts back to "Mark Exercise & Movement complete"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mark Exercise & Movement complete/i })).toBeInTheDocument();
    });
  });

  it("switches to Routines tab and verifies personal routines library", async () => {
    renderHabitsWorkspace();

    // Click Routines tab
    const routinesTab = screen.getByRole("button", { name: /Routines/i });
    fireEvent.click(routinesTab);

    // Verify contextual heading and seed routines appear
    await waitFor(() => {
      expect(screen.getByText("My Routines")).toBeInTheDocument();
      expect(screen.getByText("Morning Focus Kickstart")).toBeInTheDocument();
    });
    expect(screen.getByText("Evening Wind-Down & Closure")).toBeInTheDocument();

    // Verify routine start buttons exist
    const startBtns = screen.getAllByRole("button", { name: /Start Routine/i });
    expect(startBtns.length).toBeGreaterThanOrEqual(2);
  });

  it("starts routine execution mode, navigates steps, and pauses session", async () => {
    renderHabitsWorkspace();

    // Switch to Routines tab
    const routinesTab = screen.getByRole("button", { name: /Routines/i });
    fireEvent.click(routinesTab);

    // Start Morning Focus Kickstart routine
    await waitFor(() => {
      expect(screen.getByText("Morning Focus Kickstart")).toBeInTheDocument();
    });
    const startBtns = screen.getAllByRole("button", { name: /Start Routine/i });
    fireEvent.click(startBtns[0]);

    // Execution modal opens
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(within(modal).getByText("Drink 500ml Water & Hydrate")).toBeInTheDocument();

    // Complete current step
    const completeStepBtn = within(modal).getByRole("button", { name: /Complete Step/i });
    fireEvent.click(completeStepBtn);

    // Next step displays
    await waitFor(() => {
      expect(within(modal).getByText(/Step 2 of 4/i)).toBeInTheDocument();
      expect(within(modal).getByText("10-Minute Morning Stretch & Mobility")).toBeInTheDocument();
    });

    // Skip step
    const skipStepBtn = within(modal).getByRole("button", { name: /Skip Step/i });
    fireEvent.click(skipStepBtn);

    // Moves to step 3
    await waitFor(() => {
      expect(within(modal).getByText(/Step 3 of 4/i)).toBeInTheDocument();
      expect(within(modal).getByText("3-Minute Box Breathing Focus")).toBeInTheDocument();
    });

    // Pause & Save for later
    const saveBtn = within(modal).getByRole("button", { name: /Save & Exit/i });
    fireEvent.click(saveBtn);

    // Routine modal closes and banner shows resume option
    await waitFor(() => {
      expect(screen.getByText(/Session paused at Step 3 of 4/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resume Session/i })).toBeInTheDocument();
    });
  });

  it("idempotently marks linked habit as complete when completing a routine step without reversing", async () => {
    renderHabitsWorkspace();

    // 1. Manually complete Exercise & Movement first on Today's Habits
    const toggleBtn = screen.getByRole("button", { name: /Mark Exercise & Movement complete/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mark Exercise & Movement incomplete/i })).toBeInTheDocument();
    });

    // 2. Switch to Routines tab
    const routinesTab = screen.getByRole("button", { name: /Routines/i });
    fireEvent.click(routinesTab);

    await waitFor(() => {
      expect(screen.getByText("Morning Focus Kickstart")).toBeInTheDocument();
    });

    // Start routine
    const startBtns = screen.getAllByRole("button", { name: /Start Routine/i });
    fireEvent.click(startBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    const modal = screen.getByRole("dialog");

    // Advance through Step 1 to reach Step 2 (which is linked to habit-workout)
    const completeStep1 = within(modal).getByRole("button", { name: /Complete Step/i });
    fireEvent.click(completeStep1);

    await waitFor(() => {
      expect(within(modal).getByText("10-Minute Morning Stretch & Mobility")).toBeInTheDocument();
    });

    // Complete Step 2 (linked to Exercise & Movement)
    const completeStep2 = within(modal).getByRole("button", { name: /Complete Step/i });
    fireEvent.click(completeStep2);

    // Close / Save routine
    const saveBtn = within(modal).getByRole("button", { name: /Save & Exit/i });
    fireEvent.click(saveBtn);

    // 3. Switch back to Today's Habits
    const todayTab = screen.getByRole("button", { name: /Today's Habits/i });
    fireEvent.click(todayTab);

    // Exercise & Movement MUST STILL BE COMPLETED (never reversed to incomplete!)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mark Exercise & Movement incomplete/i })).toBeInTheDocument();
    });
  });

  it("opens Daily Habit Summary modal for end-of-day reflection", async () => {
    renderHabitsWorkspace();

    // Click Daily Review button
    const reviewBtn = screen.getByRole("button", { name: /^Daily Review$/i });
    fireEvent.click(reviewBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText("Daily Habit Review")).toBeInTheDocument();
    });

    expect(screen.getByText(/End-of-day reflection on today's consistency/i)).toBeInTheDocument();
    expect(screen.getByText("Habits Completed")).toBeInTheDocument();
    expect(screen.getByText("Routines Done")).toBeInTheDocument();

    // Close review dialog
    const closeBtn = screen.getByRole("button", { name: /Done Review/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Daily Habit Review")).not.toBeInTheDocument();
    });
  });

  it("switches to Heatmap & Trends tab and renders GitHub-style contribution calendar", async () => {
    renderHabitsWorkspace();

    // Click Heatmap tab
    const heatmapTab = screen.getByRole("button", { name: /Heatmap & Trends/i });
    fireEvent.click(heatmapTab);

    // Verify heatmap elements and tab actions
    await waitFor(() => {
      expect(screen.getByText(/Habit Activity Heatmap/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Export Data/i })).toBeInTheDocument();
    expect(screen.getByText(/90-Day Consistency/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekly Momentum/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Check-ins/i)).toBeInTheDocument();
    expect(screen.getByText(/Most Consistent/i)).toBeInTheDocument();
  });
});
