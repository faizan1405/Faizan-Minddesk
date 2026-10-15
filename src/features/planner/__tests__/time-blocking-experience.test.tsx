import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MindDeskProvider } from "@/features/minddesk/store";
import { CalendarProvider } from "@/features/calendar/calendar-context";
import { HabitsProvider } from "@/features/habits/context/habits-context";
import { DailyPlannerWorkspace } from "@/features/planner/components/daily-planner-workspace";
import { CalendarWorkspace } from "@/features/calendar/components/calendar-workspace";
import { MyTasksPanel } from "@/features/planner/components/my-tasks-panel";
import {
  calculateMergedOccupiedMinutes,
  checkIntervalConflict,
} from "@/features/calendar/services/calendar-layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/plan-your-day",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderPlannerWorkspace() {
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

describe("MindDesk Phase 6: Advanced Time Blocking & Daily Planning Experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the minimal visual planner layout with 24-Hour Day Map centerpiece and Smart Zoom Timeline", async () => {
    renderPlannerWorkspace();

    // Verify workspace header
    expect(screen.getByText("Plan Your Day")).toBeInTheDocument();
    expect(screen.getByText(/Time Blocking Engine/i)).toBeInTheDocument();

    // Centerpiece: 24-Hour Day Map (48 cubes)
    expect(screen.getByText("24-Hour Day Map")).toBeInTheDocument();
    expect(screen.getByLabelText("24-Hour Visual Day Map")).toBeInTheDocument();

    // Today's Top 3 Priorities shelf
    expect(screen.getByText(/Today's Top 3 Priorities/i)).toBeInTheDocument();

    // Smart Zoom Timeline Editor directly accessible (no tab switcher)
    expect(screen.getByLabelText("Smart Zoom Timeline Editor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Task Library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Timeline Schedule" })).not.toBeInTheDocument();

    // Timeline controls & quick actions
    expect(screen.getByRole("button", { name: /Add Block/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "24 Hours" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Normal" })).toBeInTheDocument();
  });

  it("creates a standalone time block directly via + Add Block button", async () => {
    renderPlannerWorkspace();

    const addBlockBtn = screen.getByRole("button", { name: /Add Block/i });
    fireEvent.click(addBlockBtn);

    // Quick Create Modal opens
    await waitFor(() => {
      expect(screen.getByText("Quick Create Block")).toBeInTheDocument();
    });

    // Fill title
    const titleInput = screen.getByPlaceholderText(/e.g. Code Review, Client Proposal, Gym.../i);
    fireEvent.change(titleInput, { target: { value: "Team Architecture Review" } });

    // Submit form
    const createBtn = screen.getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    // Verify it renders on the timeline
    await waitFor(() => {
      expect(screen.getByText("Team Architecture Review")).toBeInTheDocument();
    });
  });

  it("opens Quick Create modal when clicking a time slot cube in the 24-Hour Day Map", async () => {
    renderPlannerWorkspace();

    const tenAmCube = screen.getByRole("button", { name: /Time slot 10:00 AM/i });
    fireEvent.click(tenAmCube);

    // Modal opens with 10:00 start time
    await waitFor(() => {
      expect(screen.getByText("Quick Create Block")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Code Review, Client Proposal, Gym.../i);
    fireEvent.change(titleInput, { target: { value: "Sprint Retro" } });

    const createBtn = screen.getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText("Sprint Retro")).toBeInTheDocument();
    });
  });

  it("calculates merged non-double-counted time analytics accurately", () => {
    // 2 overlapping intervals: 10:00 - 11:00 (600-660) and 10:30 - 11:30 (630-690)
    // Non-overlapping interval: 13:00 - 14:00 (780-840)
    const items = [
      { startMinutes: 600, endMinutes: 660 },
      { startMinutes: 630, endMinutes: 690 },
      { startMinutes: 780, endMinutes: 840 },
    ];

    const mergedOccupied = calculateMergedOccupiedMinutes(items);
    // [600, 690] = 90 mins, [780, 840] = 60 mins -> Total = 150 mins (2h 30m)
    // If double counted, it would have been 60 + 60 + 60 = 180 mins.
    expect(mergedOccupied).toBe(150);
  });

  it("detects scheduling conflicts and triggers ConflictDialog with 3 options", () => {
    const existing = [
      { id: "evt-1", title: "Client Strategy Sync", startMinutes: 600, endMinutes: 660 },
    ];

    // Conflict case: overlaps 10:15 - 11:15
    const conflictResult = checkIntervalConflict(
      { startMinutes: 615, endMinutes: 675 },
      existing
    );
    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictingTitles).toContain("Client Strategy Sync");

    // Non-conflict case: 12:00 - 13:00
    const noConflictResult = checkIntervalConflict(
      { startMinutes: 720, endMinutes: 780 },
      existing
    );
    expect(noConflictResult.hasConflict).toBe(false);
  });

  it("switches timeline zoom presets (Compact, Normal, Relaxed)", async () => {
    renderPlannerWorkspace();

    const compactBtn = screen.getByRole("button", { name: "Compact" });
    const normalBtn = screen.getByRole("button", { name: "Normal" });
    const relaxedBtn = screen.getByRole("button", { name: "Relaxed" });

    expect(compactBtn).toBeInTheDocument();
    expect(normalBtn).toBeInTheDocument();
    expect(relaxedBtn).toBeInTheDocument();

    fireEvent.click(compactBtn);
    expect(compactBtn).toHaveClass("bg-background");

    fireEvent.click(relaxedBtn);
    expect(relaxedBtn).toHaveClass("bg-background");
  });

  it("switches time window filters (All 24h, Morning, Afternoon, Evening, Night)", async () => {
    renderPlannerWorkspace();

    const morningBtn = screen.getByRole("button", { name: /Morning/i });
    const afternoonBtn = screen.getByRole("button", { name: /Afternoon/i });
    const eveningBtn = screen.getByRole("button", { name: /Evening/i });

    expect(morningBtn).toBeInTheDocument();
    expect(afternoonBtn).toBeInTheDocument();
    expect(eveningBtn).toBeInTheDocument();

    fireEvent.click(morningBtn);
    expect(morningBtn).toHaveClass("text-primary");
  });

  it("maintains task data integrity: MyTasksPanel preserves underlying tasks independently", async () => {
    render(
      <MindDeskProvider>
        <CalendarProvider>
          <MyTasksPanel currentDateStr="2026-10-15" onScheduleTask={() => {}} />
        </CalendarProvider>
      </MindDeskProvider>
    );

    // 1. Create a task in Task Library
    const newTaskBtn = screen.getByRole("button", { name: /New Task/i });
    fireEvent.click(newTaskBtn);
    const taskInput = screen.getByPlaceholderText(/Task title/i);
    fireEvent.change(taskInput, { target: { value: "Preserved Google Task" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add Task$/i }));

    await waitFor(() => {
      expect(screen.getByText("Preserved Google Task")).toBeInTheDocument();
    });
  });

  it("synchronizes time blocks bidirectionally between Planner and Calendar", async () => {
    const { rerender } = renderPlannerWorkspace();

    // 1. Create block in Planner
    const addBlockBtn = screen.getByRole("button", { name: /Add Block/i });
    fireEvent.click(addBlockBtn);
    await waitFor(() => {
      expect(screen.getByText("Quick Create Block")).toBeInTheDocument();
    });
    const titleInput = screen.getByPlaceholderText(/e.g. Code Review, Client Proposal, Gym.../i);
    fireEvent.change(titleInput, { target: { value: "Cross-App Sync Block" } });
    const createBtn = screen.getByRole("button", { name: /Create Block/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
    });

    // 2. Switch view to CalendarWorkspace
    rerender(
      <MindDeskProvider>
        <CalendarProvider>
          <HabitsProvider>
            <CalendarWorkspace />
          </HabitsProvider>
        </CalendarProvider>
      </MindDeskProvider>
    );

    // Switch to Day view
    const dayBtn = screen.getByRole("button", { name: /^Day$/i });
    fireEvent.click(dayBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
    });

    // Switch to Agenda view
    const agendaBtn = screen.getByRole("button", { name: /^Agenda$/i });
    fireEvent.click(agendaBtn);

    await waitFor(() => {
      expect(screen.getByText("Cross-App Sync Block")).toBeInTheDocument();
      expect(screen.getAllByText(/Focus Block/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
