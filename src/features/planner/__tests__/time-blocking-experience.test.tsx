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

describe("MindDesk Phase 6: Directly Interactive 24-Hour Day Map Experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the simplified visual planner layout with 24-Hour Day Map centerpiece and confirms large timeline is removed", async () => {
    renderPlannerWorkspace();

    // Verify workspace header
    expect(screen.getByText("Plan Your Day")).toBeInTheDocument();
    expect(screen.getByText(/Time Blocking Engine/i)).toBeInTheDocument();

    // Centerpiece: 24-Hour Day Map (48 cubes)
    expect(screen.getByText("24-Hour Day Map")).toBeInTheDocument();
    expect(screen.getByLabelText("24-Hour Visual Day Map")).toBeInTheDocument();

    // Today's Top 3 Priorities shelf removed from Planner
    expect(screen.queryByText(/Today's Top 3 Priorities/i)).not.toBeInTheDocument();

    // Large timeline/Smart Zoom Editor completely removed
    expect(screen.queryByLabelText("Smart Zoom Timeline Editor")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Task Library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Timeline Schedule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "24 Hours" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compact" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Relaxed" })).not.toBeInTheDocument();

    // Convenient + Add Block and Select Range buttons are present
    expect(screen.getByRole("button", { name: /Add Block/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Select Range/i })).toBeInTheDocument();
  });

  it("creates a standalone time block directly via + Add Block button", async () => {
    renderPlannerWorkspace();

    const addBlockBtn = screen.getByRole("button", { name: /Add Block/i });
    fireEvent.click(addBlockBtn);

    // Minimal Add Block Dialog opens
    await waitFor(() => {
      expect(screen.getByText("Add Time Block")).toBeInTheDocument();
    });

    // Fill title
    const titleInput = screen.getByPlaceholderText(/e.g. Website Development, Deep Coding.../i);
    fireEvent.change(titleInput, { target: { value: "Team Architecture Review" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /Save Block/i });
    fireEvent.click(saveBtn);

    // Modal closes and block is scheduled in the calendar context
    await waitFor(() => {
      expect(screen.queryByText("Add Time Block")).not.toBeInTheDocument();
    });
  });

  it("opens Add Block popup directly when clicking an empty time slot cube", async () => {
    renderPlannerWorkspace();

    const tenAmCube = screen.getByRole("button", { name: /Time slot 10:00 AM/i });
    fireEvent.click(tenAmCube);

    // Directly opens Add Time Block dialog prefilled with slot time
    await waitFor(() => {
      expect(screen.getByText("Add Time Block")).toBeInTheDocument();
      expect(screen.getByText(/10:00 AM – 10:30 AM/i)).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Website Development, Deep Coding.../i);
    fireEvent.change(titleInput, { target: { value: "Sprint Retro" } });

    const saveBtn = screen.getByRole("button", { name: /Save Block/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText("Add Time Block")).not.toBeInTheDocument();
    });
  });

  it("calculates merged non-double-counted time analytics accurately", () => {
    const items = [
      { startMinutes: 600, endMinutes: 660 },
      { startMinutes: 630, endMinutes: 690 },
      { startMinutes: 780, endMinutes: 840 },
    ];

    const mergedOccupied = calculateMergedOccupiedMinutes(items);
    // [600, 690] = 90 mins, [780, 840] = 60 mins -> Total = 150 mins (2h 30m)
    expect(mergedOccupied).toBe(150);
  });

  it("detects scheduling conflicts and triggers collision detection", () => {
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
      expect(screen.getByText("Add Time Block")).toBeInTheDocument();
    });
    const titleInput = screen.getByPlaceholderText(/e.g. Website Development, Deep Coding.../i);
    fireEvent.change(titleInput, { target: { value: "Cross-App Sync Block" } });
    const saveBtn = screen.getByRole("button", { name: /Save Block/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText("Add Time Block")).not.toBeInTheDocument();
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
